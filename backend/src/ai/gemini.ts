import { GoogleGenAI } from '@google/genai';
import { cache } from '../cache/index.ts';

export interface SignalExplanationInput {
  eventId?: string;
  symbol: string;
  companyName?: string;
  priceChange: number;
  volumeMultiple: number;
  marketChange: number;
  sectorChange: number;
  signalScore: number;
  reasons: string[];
  sector?: string;
}

export class GeminiExplanationService {
  private ai: GoogleGenAI | null = null;
  private isInitialized = false;
  private circuitBreakerUntil = 0;
  private lastQuotaWarningTime = 0;
  private lastCallTimestamp = 0;
  private readonly minCallInterval = 5000; // max 1 call per 5s

  constructor() {
    this.init();
  }

  private init() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && !apiKey.includes('MY_GEMINI_API_KEY')) {
      try {
        this.ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
        this.isInitialized = true;
        console.log('[Gemini AI] Initialized GoogleGenAI with gemini-3.8-flash');
      } catch (err) {
        console.log('[Gemini AI] Initialization notice:', err);
      }
    } else {
      console.log('[Gemini AI] GEMINI_API_KEY not configured or using placeholder. Deterministic engine active.');
    }
  }

  /**
   * Returns true if Gemini client is active, outside circuit-breaker cooldown, and ready.
   */
  isReady(): boolean {
    return Boolean(this.ai && this.isInitialized && Date.now() > this.circuitBreakerUntil);
  }

  /**
   * Generates a concise, verified contextual explanation for a meaningful change event.
   * Checks cache first to prevent duplicate API invocations.
   */
  async explain(input: SignalExplanationInput): Promise<{ explanation: string; source: 'GEMINI_AI' | 'DETERMINISTIC_FALLBACK' }> {
    const fallbackText = this.generateFallbackExplanation(input);
    const cacheKey = `ai:explain:${input.symbol}:${input.signalScore}:${Math.round(input.priceChange * 10)}`;
    const cached = await cache.get<string>(cacheKey);
    if (cached) {
      return { explanation: cached, source: 'GEMINI_AI' };
    }

    // Circuit breaker check: if rate-limited or quota exceeded, return deterministic explanation directly
    if (!this.isReady()) {
      return { explanation: fallbackText, source: 'DETERMINISTIC_FALLBACK' };
    }

    // Throttling: avoid rapid consecutive calls
    const now = Date.now();
    if (now - this.lastCallTimestamp < this.minCallInterval) {
      return { explanation: fallbackText, source: 'DETERMINISTIC_FALLBACK' };
    }

    // Attempt generation with gemini-3.8-flash
    try {
      this.lastCallTimestamp = Date.now();
      const prompt = `You are the SIGNAL contextual intelligence engine for financial markets.
Explain the following verified market change concisely in 2 sentences.
Rules:
1. Base your statement strictly on the provided verified data.
2. DO NOT give buy/sell recommendations or price predictions.
3. DO NOT invent rumors, fabricated news, or external events.
4. Highlight relative divergence against market/sector and volume participation.

Data:
Symbol: ${input.symbol} (${input.companyName || input.symbol})
Sector: ${input.sector || 'General'}
Price Change: ${input.priceChange >= 0 ? '+' : ''}${input.priceChange.toFixed(2)}%
Volume Multiple: ${input.volumeMultiple.toFixed(1)}x average
Broader Market Index (Nifty): ${input.marketChange >= 0 ? '+' : ''}${input.marketChange.toFixed(2)}%
Sector Benchmark: ${input.sectorChange >= 0 ? '+' : ''}${input.sectorChange.toFixed(2)}%
Signal Score: ${input.signalScore} / 100
Triggered Factors: ${input.reasons.join(', ')}`;

      const genPromise = this.ai!.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are a senior quantitative market analyst. Be concise, objective, factual, and strictly grounded in provided statistics.',
          temperature: 0.2,
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API call timed out after 4000ms')), 4000)
      );

      const response: any = await Promise.race([genPromise, timeoutPromise]);
      const text = response.text?.trim();

      if (text && text.length > 20) {
        // Cache explanation for 2 hours
        await cache.set(cacheKey, text, 7200);
        return { explanation: text, source: 'GEMINI_AI' };
      }
    } catch (err: any) {
      const errMsg = String(err?.message || err);
      const isQuota = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota exceeded');

      if (isQuota) {
        // Check for daily quota ceiling
        const isDaily = errMsg.includes('FreeTier') || errMsg.includes('per day') || errMsg.includes('limit: 20');
        const cooldownMs = isDaily ? 30 * 60 * 1000 : 60 * 1000;
        this.circuitBreakerUntil = Date.now() + cooldownMs;

        // Log notice at most once per 5 minutes without printing raw error stack
        if (Date.now() - this.lastQuotaWarningTime > 5 * 60 * 1000) {
          this.lastQuotaWarningTime = Date.now();
          console.log(`[Gemini AI] Quota rate limit detected. Circuit breaker active for ${Math.round(cooldownMs / 1000)}s; quantitative deterministic engine serving insights.`);
        }
      }
    }

    // Fallback: Deterministic Rule-Based Generator
    return { explanation: fallbackText, source: 'DETERMINISTIC_FALLBACK' };
  }

  generateFallbackExplanation(input: SignalExplanationInput): string {
    const symbol = input.symbol;
    const change = input.priceChange;
    const dir = change >= 0 ? 'gained' : 'declined';
    const sign = change >= 0 ? '+' : '';
    const vol = input.volumeMultiple;
    const market = input.marketChange;
    const sector = input.sectorChange;

    const parts: string[] = [];

    parts.push(
      `${symbol} ${dir} ${sign}${change.toFixed(1)}%, registering a Signal Score of ${input.signalScore}/100.`
    );

    const relativeDiff = change - market;
    if (Math.abs(relativeDiff) > 1.0) {
      const relWord = relativeDiff > 0 ? 'outperforming' : 'underperforming';
      parts.push(
        `It is notably ${relWord} both the broader market (${market >= 0 ? '+' : ''}${market.toFixed(1)}%) and its sector (${sector >= 0 ? '+' : ''}${sector.toFixed(1)}%).`
      );
    }

    if (vol >= 1.8) {
      parts.push(`Trading volume is running elevated at ${vol.toFixed(1)}× normal levels.`);
    } else if (vol < 0.6) {
      parts.push(`Movement occurred on lighter-than-usual volume (${vol.toFixed(1)}× normal).`);
    }

    return parts.join(' ');
  }
}

export const geminiService = new GeminiExplanationService();
