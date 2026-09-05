import {
  MarketTick,
  SignalScoreResult,
  SignalClassification,
  SignalFactors,
  MeaningfulChangeEvent,
  Instrument,
} from '../../../shared/types/index.ts';
import { INSTRUMENT_MAP, getInstrument } from '../../../shared/constants/instruments.ts';

export interface SignalEngineConfig {
  priceThresholdModerate: number; // e.g. 1.5%
  priceThresholdHigh: number;     // e.g. 3.5%
  priceThresholdExtreme: number;  // e.g. 5.0%
  volumeAnomalyThreshold: number; // e.g. 1.5x
  volumeHighThreshold: number;    // e.g. 2.2x
}

const DEFAULT_CONFIG: SignalEngineConfig = {
  priceThresholdModerate: 1.5,
  priceThresholdHigh: 3.5,
  priceThresholdExtreme: 5.0,
  volumeAnomalyThreshold: 1.5,
  volumeHighThreshold: 2.2,
};

export class SignalEngine {
  private config: SignalEngineConfig;
  private recentChangeEvents = new Map<string, MeaningfulChangeEvent>();
  private lastAlertTimestamp = new Map<string, number>();

  constructor(config: Partial<SignalEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Evaluates a market tick against current sector and market context.
   * Returns deterministic 0-100 score, factors breakdown, classification, and structured reasons.
   */
  evaluate(
    tick: MarketTick,
    marketIndexChange = 0.3,
    sectorIndexChange = 0.5
  ): SignalScoreResult {
    const inst = getInstrument(tick.symbol);
    const reasons: string[] = [];

    // 1. Price Movement Score (Weight: 30%)
    const absChange = Math.abs(tick.changePercent || 0);
    let priceScore = 0;
    if (absChange >= this.config.priceThresholdExtreme) {
      priceScore = 100;
      reasons.push(tick.changePercent! > 0 ? 'extreme_price_gain' : 'extreme_price_drop');
    } else if (absChange >= this.config.priceThresholdHigh) {
      priceScore = 75 + ((absChange - this.config.priceThresholdHigh) / (this.config.priceThresholdExtreme - this.config.priceThresholdHigh)) * 25;
      reasons.push(tick.changePercent! > 0 ? 'high_price_momentum' : 'heavy_selling_pressure');
    } else if (absChange >= this.config.priceThresholdModerate) {
      priceScore = 40 + ((absChange - this.config.priceThresholdModerate) / (this.config.priceThresholdHigh - this.config.priceThresholdModerate)) * 35;
      reasons.push('notable_price_movement');
    } else {
      priceScore = (absChange / this.config.priceThresholdModerate) * 40;
    }

    // 2. Volume Anomaly Score (Weight: 25%)
    let volumeScore = 0;
    let volumeMultiple = 1.0;
    const avgVolume = inst?.averageDailyVolume || 5000000;
    if (tick.volume && avgVolume > 0) {
      volumeMultiple = tick.volume / (avgVolume * 0.5); // Intraday volume scaled
      volumeMultiple = Math.max(0.1, Number(volumeMultiple.toFixed(2)));

      if (volumeMultiple >= 2.5) {
        volumeScore = 100;
        reasons.push('massive_institutional_volume');
      } else if (volumeMultiple >= this.config.volumeHighThreshold) {
        volumeScore = 80 + ((volumeMultiple - this.config.volumeHighThreshold) / (2.5 - this.config.volumeHighThreshold)) * 20;
        reasons.push('volume_anomaly');
      } else if (volumeMultiple >= this.config.volumeAnomalyThreshold) {
        volumeScore = 50 + ((volumeMultiple - this.config.volumeAnomalyThreshold) / (this.config.volumeHighThreshold - this.config.volumeAnomalyThreshold)) * 30;
        reasons.push('above_average_volume');
      } else {
        volumeScore = (volumeMultiple / this.config.volumeAnomalyThreshold) * 50;
      }
    } else {
      volumeScore = 20;
    }

    // 3. Relative Performance Score (Weight: 20%)
    // Compare stock % vs market index % and sector benchmark %
    const stockChange = tick.changePercent || 0;
    const alphaVsMarket = stockChange - marketIndexChange;
    const alphaVsSector = stockChange - sectorIndexChange;
    const maxAlpha = Math.max(Math.abs(alphaVsMarket), Math.abs(alphaVsSector));

    let relativePerformanceScore = 0;
    if (maxAlpha >= 4.0) {
      relativePerformanceScore = 100;
      reasons.push(alphaVsMarket > 0 ? 'strong_market_outperformance' : 'severe_market_underperformance');
      if (Math.abs(alphaVsSector) >= 3.0) {
        reasons.push(alphaVsSector > 0 ? 'sector_outperformance' : 'sector_divergence');
      }
    } else if (maxAlpha >= 2.0) {
      relativePerformanceScore = 65 + ((maxAlpha - 2.0) / 2.0) * 35;
      if (alphaVsSector > 1.5) reasons.push('sector_outperformance');
      else if (alphaVsSector < -1.5) reasons.push('sector_divergence');
    } else if (maxAlpha >= 1.0) {
      relativePerformanceScore = 35 + ((maxAlpha - 1.0) / 1.0) * 30;
    } else {
      relativePerformanceScore = maxAlpha * 35;
    }

    // 4. Volatility Score (Weight: 15%)
    let volatilityScore = 0;
    if (tick.dayHigh && tick.dayLow && tick.price > 0) {
      const intradayRange = (tick.dayHigh - tick.dayLow) / tick.price;
      const baselineVol = inst?.baselineVolatility || 0.015;
      const volRatio = intradayRange / baselineVol;

      if (volRatio >= 2.0) {
        volatilityScore = 100;
        reasons.push('volatility_spike');
      } else if (volRatio >= 1.4) {
        volatilityScore = 60 + ((volRatio - 1.4) / 0.6) * 40;
        reasons.push('elevated_volatility');
      } else {
        volatilityScore = (volRatio / 1.4) * 60;
      }
    } else {
      volatilityScore = 25;
    }

    // 5. Market Context Score (Weight: 10%)
    // Moving significantly against the broad market is contrarian and notable!
    let marketContextScore = 0;
    const isContrarian = (stockChange > 2.0 && marketIndexChange < -0.5) || (stockChange < -2.0 && marketIndexChange > 0.5);
    if (isContrarian) {
      marketContextScore = 100;
      reasons.push('contrarian_divergence');
    } else if (Math.sign(stockChange) === Math.sign(marketIndexChange) && Math.abs(stockChange) > Math.abs(marketIndexChange) * 2) {
      marketContextScore = 70;
      reasons.push('market_tailwind_leader');
    } else {
      marketContextScore = 30;
    }

    // Calculate final weighted score:
    // Price movement: 30%
    // Volume anomaly: 25%
    // Relative performance: 20%
    // Volatility change: 15%
    // Market context: 10%
    const totalWeightedScore =
      priceScore * 0.30 +
      volumeScore * 0.25 +
      relativePerformanceScore * 0.20 +
      volatilityScore * 0.15 +
      marketContextScore * 0.10;

    const finalScore = Math.min(100, Math.max(0, Math.round(totalWeightedScore)));

    // Classifications
    let classification: SignalClassification = 'NORMAL';
    if (finalScore >= 81) {
      classification = 'HIGH_ATTENTION';
    } else if (finalScore >= 61) {
      classification = 'IMPORTANT';
    } else if (finalScore >= 31) {
      classification = 'WORTH_WATCHING';
    } else {
      classification = 'NORMAL';
    }

    // Deterministic summary text
    let summary = '';
    const company = inst?.name || tick.symbol;
    const formattedChange = (stockChange >= 0 ? '+' : '') + stockChange.toFixed(1) + '%';

    if (classification === 'HIGH_ATTENTION') {
      summary = `${company} moved ${formattedChange} with ${volumeMultiple.toFixed(1)}× volume, heavily diverging from market (${marketIndexChange >= 0 ? '+' : ''}${marketIndexChange.toFixed(1)}%).`;
    } else if (classification === 'IMPORTANT') {
      summary = `${company} registered notable movement of ${formattedChange} with ${volumeMultiple.toFixed(1)}× normal volume.`;
    } else if (classification === 'WORTH_WATCHING') {
      summary = `${company} is showing active interest at ${formattedChange} with expanding range.`;
    } else {
      summary = `${company} trading within normal daily volatility parameters.`;
    }

    const factors: SignalFactors = {
      priceScore: Math.round(priceScore),
      volumeScore: Math.round(volumeScore),
      relativePerformanceScore: Math.round(relativePerformanceScore),
      volatilityScore: Math.round(volatilityScore),
      marketContextScore: Math.round(marketContextScore),
    };

    return {
      score: finalScore,
      classification,
      factors,
      reasons,
      summary,
    };
  }

  /**
   * Determines if a tick should produce a persistent MeaningfulChangeEvent.
   * Throttles duplicate alerts for the same symbol within 10 minutes unless score escalates significantly.
   */
  shouldGenerateEvent(
    tick: MarketTick,
    evalResult: SignalScoreResult
  ): boolean {
    if (evalResult.classification === 'NORMAL') {
      return false;
    }

    const lastAlert = this.lastAlertTimestamp.get(tick.symbol);
    const existing = this.recentChangeEvents.get(tick.symbol);
    const now = Date.now();

    // If never alerted, or score jumped into HIGH_ATTENTION, or 10 minutes elapsed
    if (!lastAlert || now - lastAlert > 10 * 60 * 1000) {
      return true;
    }

    if (existing && evalResult.score > existing.score + 15) {
      return true;
    }

    return false;
  }

  createMeaningfulChangeEvent(
    tick: MarketTick,
    evalResult: SignalScoreResult,
    marketIndexChange: number,
    sectorIndexChange: number
  ): MeaningfulChangeEvent {
    const inst = getInstrument(tick.symbol);
    const avgVolume = inst?.averageDailyVolume || 5000000;
    const volMultiple = tick.volume && avgVolume > 0
      ? Number((tick.volume / (avgVolume * 0.5)).toFixed(1))
      : 1.0;

    const event: MeaningfulChangeEvent = {
      id: `mc-${tick.symbol.toLowerCase()}-${Date.now()}`,
      symbol: tick.symbol,
      companyName: inst?.name || tick.symbol,
      score: evalResult.score,
      classification: evalResult.classification,
      reasons: evalResult.reasons,
      summary: evalResult.summary,
      timestamp: tick.timestamp || Date.now(),
      price: tick.price,
      changePercent: tick.changePercent || 0,
      volumeMultiple: volMultiple,
      marketChangePercent: marketIndexChange,
      sectorChangePercent: sectorIndexChange,
      sector: inst?.sector || 'General Market',
      isRead: false,
    };

    this.recentChangeEvents.set(tick.symbol, event);
    this.lastAlertTimestamp.set(tick.symbol, Date.now());

    return event;
  }
}

export const signalEngine = new SignalEngine();
