import { MarketDataProvider } from './provider.interface.ts';
import { MarketTick, ProviderStatus, ReplayState } from '../../../../shared/types/index.ts';
import { INSTRUMENTS, BENCHMARKS } from '../../../../shared/constants/instruments.ts';
import { normalizer } from '../normalization/index.ts';

export class ReplayProvider implements MarketDataProvider {
  id = 'replay_engine';
  name = 'SIGNAL High-Fidelity Market Replay';

  private isPlaying = true;
  private speed: 1 | 2 | 5 = 1;
  private tickInterval: NodeJS.Timeout | null = null;
  private tickCallbacks: ((tick: MarketTick) => void)[] = [];
  private subscribedSymbols = new Set<string>();

  // State
  private currentPrices = new Map<string, number>();
  private initialBasePrices = new Map<string, number>();
  private volumes = new Map<string, number>();
  private dayHighs = new Map<string, number>();
  private dayLows = new Map<string, number>();
  private tickCount = 0;
  private startTimestamp: number;
  private currentVirtualTime: number;

  constructor() {
    this.startTimestamp = Date.now() - 4 * 3600 * 1000; // Simulated market open 4h ago
    this.currentVirtualTime = this.startTimestamp;
    this.initPrices();
  }

  private initPrices() {
    BENCHMARKS.forEach((b) => {
      this.currentPrices.set(b.symbol, b.basePrice);
      this.initialBasePrices.set(b.symbol, b.basePrice);
      this.volumes.set(b.symbol, 50000000);
      this.dayHighs.set(b.symbol, b.basePrice * 1.005);
      this.dayLows.set(b.symbol, b.basePrice * 0.995);
    });

    INSTRUMENTS.forEach((inst) => {
      this.currentPrices.set(inst.symbol, inst.basePrice);
      this.initialBasePrices.set(inst.symbol, inst.basePrice);
      this.volumes.set(inst.symbol, Math.floor(inst.averageDailyVolume * 0.4));
      this.dayHighs.set(inst.symbol, inst.basePrice * 1.01);
      this.dayLows.set(inst.symbol, inst.basePrice * 0.99);
      this.subscribedSymbols.add(inst.symbol);
    });
  }

  async connect(): Promise<void> {
    this.startLoop();
  }

  async disconnect(): Promise<void> {
    this.stopLoop();
  }

  private startLoop() {
    this.stopLoop();
    const intervalMs = Math.floor(1000 / this.speed);
    this.tickInterval = setInterval(() => {
      if (this.isPlaying) {
        this.step();
      }
    }, intervalMs);
  }

  private stopLoop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  /**
   * One simulated step in the market
   */
  private step() {
    this.tickCount++;
    this.currentVirtualTime += 1000 * this.speed;

    // Pick 2-4 symbols per step to generate real market flow
    const symbols = Array.from(this.subscribedSymbols);
    if (symbols.length === 0) return;

    // Shuffle and pick
    const countToUpdate = Math.min(symbols.length, 3);
    for (let i = 0; i < countToUpdate; i++) {
      const sym = symbols[(this.tickCount * 3 + i) % symbols.length];
      this.generateTickForSymbol(sym);
    }

    // Benchmark updates every 3 ticks
    if (this.tickCount % 3 === 0) {
      this.generateBenchmarkTick('NIFTY50');
      this.generateBenchmarkTick('SENSEX');
    }
  }

  private generateBenchmarkTick(sym: string) {
    const prevClose = this.initialBasePrices.get(sym) || 24000;
    const curPrice = this.currentPrices.get(sym) || prevClose;
    const drift = (Math.random() - 0.48) * 0.0008 * curPrice;
    const newPrice = Math.max(100, curPrice + drift);
    this.currentPrices.set(sym, newPrice);

    const tick: MarketTick = {
      symbol: sym,
      exchange: 'NSE',
      price: Number(newPrice.toFixed(2)),
      previousClose: prevClose,
      change: Number((newPrice - prevClose).toFixed(2)),
      changePercent: Number((((newPrice - prevClose) / prevClose) * 100).toFixed(2)),
      volume: (this.volumes.get(sym) || 1000000) + Math.floor(Math.random() * 50000),
      timestamp: Date.now(),
      source: 'replay_stream',
    };

    const normalized = normalizer.normalize(tick);
    if (normalized) {
      this.emitTick(normalized);
    }
  }

  private generateTickForSymbol(symbol: string, forcedDeltaPercent?: number, forcedVolumeMultiple?: number) {
    const base = this.initialBasePrices.get(symbol) || 1000;
    const cur = this.currentPrices.get(symbol) || base;
    const inst = INSTRUMENTS.find((x) => x.symbol === symbol);

    let priceDelta: number;
    let volInc: number;

    if (forcedDeltaPercent !== undefined) {
      priceDelta = (forcedDeltaPercent / 100) * base;
      volInc = Math.floor((inst?.averageDailyVolume || 1000000) * (forcedVolumeMultiple || 2.0));
    } else {
      // Realistic tick with sector correlation & random noise
      const volatility = inst?.baselineVolatility || 0.015;
      const stepMove = (Math.random() - 0.49) * volatility * 0.15 * cur;
      priceDelta = stepMove;
      volInc = Math.floor(Math.random() * 8000 + 500);
    }

    const newPrice = Math.max(1, cur + priceDelta);
    this.currentPrices.set(symbol, newPrice);

    const curVol = (this.volumes.get(symbol) || 10000) + volInc;
    this.volumes.set(symbol, curVol);

    const prevClose = base;
    const change = Number((newPrice - prevClose).toFixed(2));
    const changePercent = Number((((newPrice - prevClose) / prevClose) * 100).toFixed(2));

    const high = Math.max(this.dayHighs.get(symbol) || newPrice, newPrice);
    const low = Math.min(this.dayLows.get(symbol) || newPrice, newPrice);
    this.dayHighs.set(symbol, high);
    this.dayLows.set(symbol, low);

    const rawTick = {
      symbol,
      exchange: 'NSE',
      price: Number(newPrice.toFixed(2)),
      previousClose: prevClose,
      change,
      changePercent,
      volume: curVol,
      dayHigh: high,
      dayLow: low,
      timestamp: Date.now(),
      source: 'replay_stream',
    };

    const normalized = normalizer.normalize(rawTick, prevClose);
    if (normalized) {
      this.emitTick(normalized);
    }
  }

  private emitTick(tick: MarketTick) {
    for (const cb of this.tickCallbacks) {
      cb(tick);
    }
  }

  async subscribe(symbols: string[]): Promise<void> {
    symbols.forEach((s) => this.subscribedSymbols.add(s.toUpperCase()));
  }

  async unsubscribe(symbols: string[]): Promise<void> {
    symbols.forEach((s) => this.subscribedSymbols.delete(s.toUpperCase()));
  }

  onMarketUpdate(callback: (tick: MarketTick) => void): void {
    this.tickCallbacks.push(callback);
  }

  getStatus(): ProviderStatus {
    return {
      id: this.id,
      name: this.name,
      connected: this.isPlaying,
      dataMode: 'REPLAY',
      lastHeartbeat: Date.now(),
      reconnectAttempts: 0,
      message: `Replay active (${this.speed}× speed, ${this.isPlaying ? 'Playing' : 'Paused'})`,
    };
  }

  // Replay control methods
  play(): void {
    this.isPlaying = true;
    this.startLoop();
  }

  pause(): void {
    this.isPlaying = false;
  }

  setSpeed(speed: 1 | 2 | 5): void {
    this.speed = speed;
    this.startLoop();
  }

  seek(ratio: number): void {
    const bounded = Math.max(0, Math.min(1, ratio));
    const totalDuration = 4 * 3600 * 1000;
    this.currentVirtualTime = this.startTimestamp + totalDuration * bounded;
  }

  reset(): void {
    this.initPrices();
    this.tickCount = 0;
    this.currentVirtualTime = this.startTimestamp;
  }

  triggerAnomaly(type: 'volume_spike' | 'sector_divergence' | 'volatility_burst', targetSymbol = 'INFY'): void {
    const symbol = targetSymbol.toUpperCase();
    if (type === 'volume_spike') {
      // e.g. INFY price +4.8%, volume 2.4x
      this.generateTickForSymbol(symbol, 4.8, 2.4);
    } else if (type === 'sector_divergence') {
      // e.g. TCS drops -2.5% while sector positive
      this.generateTickForSymbol(symbol, -2.5, 1.8);
    } else if (type === 'volatility_burst') {
      // e.g. RELIANCE wild swings
      this.generateTickForSymbol(symbol, 3.4, 2.1);
    }
  }

  getReplayState(): ReplayState {
    const totalSpan = 4 * 3600 * 1000;
    const elapsed = Math.max(0, this.currentVirtualTime - this.startTimestamp);
    const progressPercent = Math.min(100, Number(((elapsed / totalSpan) * 100).toFixed(1)));

    return {
      isPlaying: this.isPlaying,
      speed: this.speed,
      currentTimestamp: this.currentVirtualTime,
      startTimestamp: this.startTimestamp,
      endTimestamp: this.startTimestamp + totalSpan,
      progressPercent,
      totalEvents: 120,
      currentEventIndex: Math.floor((progressPercent / 100) * 120),
    };
  }
}

export const replayProvider = new ReplayProvider();
