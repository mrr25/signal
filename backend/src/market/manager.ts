import { MarketDataProvider } from './providers/provider.interface.ts';
import { YahooFinanceProvider } from './providers/yahoo.provider.ts';
import { ReplayProvider, replayProvider } from './providers/replay.provider.ts';
import {
  MarketTick,
  MarketDataStatus,
  MarketDataMode,
  MeaningfulChangeEvent,
  MarketOverviewData,
  IndexQuote,
} from '../../../shared/types/index.ts';
import { cache } from '../cache/index.ts';
import { db } from '../database/index.ts';
import { signalEngine } from '../signals/engine.ts';
import { geminiService } from '../ai/gemini.ts';
import { BENCHMARKS, INSTRUMENTS } from '../../../shared/constants/instruments.ts';

export class MarketManager {
  private yahooProvider: YahooFinanceProvider;
  private replayProvider: ReplayProvider;
  private activeProvider: MarketDataProvider;
  private currentMode: MarketDataMode = 'LIVE';
  private lastTickTimestamp = Date.now();
  private wsBroadcastCallback: ((event: string, data: any) => void) | null = null;
  private subscribedSymbols = new Set<string>();
  private indexQuotes = new Map<string, IndexQuote>();
  private snapshotThrottle = new Map<string, number>();

  constructor() {
    this.yahooProvider = new YahooFinanceProvider();
    this.replayProvider = replayProvider;

    // Check if user explicitly configured REPLAY mode; otherwise default to LIVE (Yahoo Finance NSE)
    const feedEnv = (process.env.MARKET_FEED_SOURCE || 'YAHOO_FINANCE').toUpperCase();
    if (feedEnv === 'REPLAY') {
      this.activeProvider = this.replayProvider;
      this.currentMode = 'REPLAY';
      console.log('[MarketManager] Initialized in High-Fidelity REPLAY mode.');
    } else {
      this.activeProvider = this.yahooProvider;
      this.currentMode = 'LIVE';
      console.log('[MarketManager] Initialized in LIVE mode powered by Yahoo Finance (NSE real-time quotes, zero credentials required).');
    }

    // Initialize indices in memory
    BENCHMARKS.forEach((b) => {
      this.indexQuotes.set(b.symbol, {
        symbol: b.symbol,
        name: b.name,
        price: b.basePrice,
        change: 0.8,
        changePercent: 0.35,
        timestamp: Date.now(),
      });
    });

    // Wire callbacks
    this.yahooProvider.onMarketUpdate((tick) => this.handleIncomingTick(tick));
    this.replayProvider.onMarketUpdate((tick) => this.handleIncomingTick(tick));
  }

  setBroadcastCallback(cb: (event: string, data: any) => void): void {
    this.wsBroadcastCallback = cb;
  }

  async start(): Promise<void> {
    console.log(`[MarketManager] Starting market feed with provider: ${this.activeProvider.name}`);
    await this.activeProvider.connect();
    // Subscribe default instruments
    const initialSymbols = INSTRUMENTS.map((i) => i.symbol);
    await this.activeProvider.subscribe(initialSymbols);
  }

  async stop(): Promise<void> {
    await this.activeProvider.disconnect();
  }

  async setMode(mode: MarketDataMode): Promise<void> {
    if (mode === this.currentMode) return;
    console.log(`[MarketManager] Switching market data mode: ${this.currentMode} -> ${mode}`);
    await this.activeProvider.disconnect();

    if (mode === 'LIVE') {
      this.activeProvider = this.yahooProvider;
      this.currentMode = 'LIVE';
      await this.yahooProvider.connect();
    } else {
      this.activeProvider = this.replayProvider;
      this.currentMode = 'REPLAY';
      await this.replayProvider.connect();
    }

    const symbols = Array.from(this.subscribedSymbols);
    if (symbols.length > 0) {
      await this.activeProvider.subscribe(symbols);
    }

    this.broadcast('DATA_STATUS', this.getDataStatus());
  }

  getMode(): MarketDataMode {
    return this.currentMode;
  }

  getReplayProvider(): ReplayProvider {
    return this.replayProvider;
  }

  async subscribe(symbols: string[]): Promise<void> {
    symbols.forEach((s) => this.subscribedSymbols.add(s.toUpperCase()));
    await this.activeProvider.subscribe(symbols);
  }

  /**
   * Central Pipeline:
   * Ingest -> Cache -> Signal Engine -> Meaningful Change Check -> AI Context -> Broadcast
   */
  private async handleIncomingTick(tick: MarketTick): Promise<void> {
    this.lastTickTimestamp = tick.timestamp || Date.now();

    // 1. Update benchmarks if tick is an index
    if (this.indexQuotes.has(tick.symbol)) {
      const idx = this.indexQuotes.get(tick.symbol)!;
      idx.price = tick.price;
      idx.change = tick.change || 0;
      idx.changePercent = tick.changePercent || 0;
      idx.timestamp = tick.timestamp;
      this.broadcast('INDEX_UPDATE', idx);
      return;
    }

    // 2. Save latest tick in Cache (Upstash Redis / In-memory)
    await cache.saveLatestTick(tick);

    // 3. Periodic Snapshot in Database (throttled to 1 per minute per symbol)
    const lastSnap = this.snapshotThrottle.get(tick.symbol) || 0;
    if (Date.now() - lastSnap > 60000) {
      this.snapshotThrottle.set(tick.symbol, Date.now());
      db.saveSnapshot(
        tick.symbol,
        tick.price,
        tick.changePercent || 0,
        tick.volume || 0,
        tick.timestamp
      ).catch(() => {});
    }

    // 4. Retrieve broader market context
    const nifty = this.indexQuotes.get('NIFTY50');
    const marketChange = nifty?.changePercent ?? 0.4;
    const sectorChange = 0.6; // In a full setup, mapped per sector

    // 5. Evaluate deterministic Signal Score
    const evalResult = signalEngine.evaluate(tick, marketChange, sectorChange);

    // 6. Check if meaningful event deserves attention
    if (signalEngine.shouldGenerateEvent(tick, evalResult)) {
      const changeEvent = signalEngine.createMeaningfulChangeEvent(
        tick,
        evalResult,
        marketChange,
        sectorChange
      );

      // 7. Populate instantaneous verified explanation via quantitative rule engine
      const explanationInput = {
        eventId: changeEvent.id,
        symbol: changeEvent.symbol,
        companyName: changeEvent.companyName,
        priceChange: changeEvent.changePercent,
        volumeMultiple: changeEvent.volumeMultiple,
        marketChange: changeEvent.marketChangePercent,
        sectorChange: changeEvent.sectorChangePercent,
        signalScore: changeEvent.score,
        reasons: changeEvent.reasons,
        sector: changeEvent.sector,
      };

      changeEvent.aiExplanation = geminiService.generateFallbackExplanation(explanationInput);

      // Save and broadcast meaningful change immediately
      db.saveMeaningfulChange(changeEvent).catch(() => {});
      this.broadcast('MEANINGFUL_CHANGE', changeEvent);

      // Add in-app notification for HIGH_ATTENTION or IMPORTANT signals
      if (changeEvent.score >= 60) {
        const icon = changeEvent.score >= 80 ? '🔥' : '⚠️';
        db.addNotification({
          userId: 'usr-signal-001',
          title: `${icon} ${changeEvent.symbol} ${changeEvent.classification.replace('_', ' ')}`,
          message: `Signal ${changeEvent.score}/100. ${changeEvent.summary}`,
          type: 'SIGNAL',
          classification: changeEvent.classification,
          symbol: changeEvent.symbol,
          timestamp: changeEvent.timestamp,
          isRead: false,
        }).catch(() => {});

        this.broadcast('NOTIFICATION', {
          title: `${icon} ${changeEvent.symbol} Attention Signal`,
          classification: changeEvent.classification,
          score: changeEvent.score,
          timestamp: changeEvent.timestamp,
        });
      }

      // Optional async enrichment for critical breakthroughs (score >= 80) when Gemini is ready
      if (changeEvent.score >= 80 && geminiService.isReady()) {
        geminiService
          .explain(explanationInput)
          .then(async (aiRes) => {
            if (aiRes?.explanation && aiRes.source === 'GEMINI_AI') {
              changeEvent.aiExplanation = aiRes.explanation;
              await db.saveMeaningfulChange(changeEvent).catch(() => {});
              this.broadcast('MEANINGFUL_CHANGE', changeEvent);
            }
          })
          .catch(() => {});
      }
    }

    // 8. Broadcast price update via WebSocket to connected frontend clients
    this.broadcast('PRICE_UPDATE', {
      symbol: tick.symbol,
      price: tick.price,
      change: tick.change,
      changePercent: tick.changePercent,
      volume: tick.volume,
      dayHigh: tick.dayHigh,
      dayLow: tick.dayLow,
      timestamp: tick.timestamp,
      signalScore: evalResult.score,
      signalClassification: evalResult.classification,
    });
  }

  private broadcast(event: string, data: any): void {
    if (this.wsBroadcastCallback) {
      this.wsBroadcastCallback(event, data);
    }
  }

  getDataStatus(): {
    status: MarketDataStatus;
    mode: MarketDataMode;
    lastTickTime: number;
    stalenessSeconds: number;
    provider: any;
  } {
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - this.lastTickTimestamp) / 1000));
    let status: MarketDataStatus = 'LIVE';

    if (this.currentMode === 'REPLAY') {
      status = this.replayProvider.getStatus().connected ? 'LIVE' : 'OFFLINE';
    } else {
      if (diffSec <= 5) status = 'LIVE';
      else if (diffSec <= 30) status = 'RECENT';
      else if (diffSec <= 120) status = 'STALE';
      else status = 'OFFLINE';
    }

    return {
      status,
      mode: this.currentMode,
      lastTickTime: this.lastTickTimestamp,
      stalenessSeconds: diffSec,
      provider: this.activeProvider.getStatus(),
    };
  }

  async getMarketOverview(): Promise<MarketOverviewData> {
    const symbols = INSTRUMENTS.map((i) => i.symbol);
    const latestTicks = await cache.getAllLatestTicks(symbols);

    const gainers: { symbol: string; name: string; price: number; changePercent: number; volumeMultiple: number }[] = [];
    const losers: { symbol: string; name: string; price: number; changePercent: number; volumeMultiple: number }[] = [];

    let advances = 0;
    let declines = 0;
    let unchanged = 0;

    INSTRUMENTS.forEach((inst) => {
      const tick = latestTicks[inst.symbol];
      const price = tick?.price || inst.basePrice;
      const changePercent = tick?.changePercent !== undefined ? tick.changePercent : 0.0;
      const volMultiple = tick?.volume ? Number((tick.volume / (inst.averageDailyVolume * 0.5)).toFixed(1)) : 1.0;

      if (changePercent > 0.05) advances++;
      else if (changePercent < -0.05) declines++;
      else unchanged++;

      const item = {
        symbol: inst.symbol,
        name: inst.name,
        price,
        changePercent,
        volumeMultiple: volMultiple,
      };

      if (changePercent >= 0) {
        gainers.push(item);
      } else {
        losers.push(item);
      }
    });

    gainers.sort((a, b) => b.changePercent - a.changePercent);
    losers.sort((a, b) => a.changePercent - b.changePercent);

    // Sector performance
    const sectorMap = new Map<string, { totalChange: number; count: number; leaders: string[]; laggards: string[] }>();
    INSTRUMENTS.forEach((inst) => {
      const tick = latestTicks[inst.symbol];
      const change = tick?.changePercent || 0;
      const entry = sectorMap.get(inst.sector) || { totalChange: 0, count: 0, leaders: [], laggards: [] };
      entry.totalChange += change;
      entry.count++;
      if (change >= 0) entry.leaders.push(inst.symbol);
      else entry.laggards.push(inst.symbol);
      sectorMap.set(inst.sector, entry);
    });

    const sectorPerformance = Array.from(sectorMap.entries()).map(([sector, val]) => ({
      sector,
      changePercent: Number((val.totalChange / Math.max(1, val.count)).toFixed(2)),
      leaders: val.leaders.slice(0, 3),
      laggards: val.laggards.slice(0, 3),
    }));

    const highAttentionSignals = await db.getMeaningfulChanges(10);

    return {
      indices: Array.from(this.indexQuotes.values()),
      sectorPerformance,
      marketBreadth: {
        advances,
        declines,
        unchanged,
        total: INSTRUMENTS.length,
      },
      topGainers: gainers.slice(0, 5),
      topLosers: losers.slice(0, 5),
      highAttentionSignals,
      lastUpdated: Date.now(),
    };
  }
}

export const marketManager = new MarketManager();
