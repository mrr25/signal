import { MarketDataProvider } from './provider.interface.ts';
import { MarketTick, ProviderStatus } from '../../../../shared/types/index.ts';
import { BENCHMARKS, INSTRUMENTS } from '../../../../shared/constants/instruments.ts';

export class YahooFinanceProvider implements MarketDataProvider {
  id = 'yahoo_finance';
  name = 'Yahoo Finance (NSE Market Feed)';
  private subscribedSymbols = new Set<string>();
  private tickCallbacks: ((tick: MarketTick) => void)[] = [];
  private pollInterval: NodeJS.Timeout | null = null;
  private isConnected = false;
  private lastHeartbeat = Date.now();
  private pollFrequencyMs = 5000; // Poll fresh market data every 5s
  private isPolling = false;
  private lastKnownPrices = new Map<string, number>();

  constructor() {
    // Pre-populate default instruments and benchmarks
    INSTRUMENTS.forEach((inst) => {
      this.subscribedSymbols.add(inst.symbol.toUpperCase());
      this.lastKnownPrices.set(inst.symbol.toUpperCase(), inst.basePrice);
    });
    BENCHMARKS.forEach((b) => {
      this.subscribedSymbols.add(b.symbol.toUpperCase());
      this.lastKnownPrices.set(b.symbol.toUpperCase(), b.basePrice);
    });
  }

  private mapToYahooTicker(symbol: string): string {
    const s = symbol.trim().toUpperCase();
    if (s === 'NIFTY50' || s === 'NIFTY 50' || s === 'NIFTY') return '^NSEI';
    if (s === 'NIFTYBANK' || s === 'BANKNIFTY') return '^NSEBANK';
    if (s === 'SENSEX') return '^BSESN';
    if (s === 'NIFTYIT') return '^CNXIT';
    if (s === 'NIFTYAUTO') return '^CNXAUTO';
    if (s.startsWith('^')) return s;
    if (s.endsWith('.NS') || s.endsWith('.BO')) return s;
    return `${s}.NS`;
  }

  private mapFromYahooTicker(ticker: string, originalSymbol?: string): string {
    if (originalSymbol) return originalSymbol.toUpperCase();
    if (ticker === '^NSEI') return 'NIFTY50';
    if (ticker === '^NSEBANK') return 'NIFTYBANK';
    if (ticker === '^BSESN') return 'SENSEX';
    if (ticker === '^CNXIT') return 'NIFTYIT';
    if (ticker === '^CNXAUTO') return 'NIFTYAUTO';
    return ticker.replace('.NS', '').replace('.BO', '').toUpperCase();
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;
    this.isConnected = true;
    this.lastHeartbeat = Date.now();
    console.log('[YahooFinanceProvider] Initializing real-time NSE market feed via Yahoo Finance...');

    // Trigger immediate fetch
    this.pollMarketData();

    // Start recurring polling interval
    this.pollInterval = setInterval(() => {
      this.pollMarketData();
    }, this.pollFrequencyMs);
  }

  async disconnect(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isConnected = false;
    console.log('[YahooFinanceProvider] Disconnected.');
  }

  async subscribe(symbols: string[]): Promise<void> {
    symbols.forEach((s) => this.subscribedSymbols.add(s.toUpperCase()));
    // If connected, fetch the newly subscribed symbols immediately
    if (this.isConnected) {
      this.fetchBatch(symbols);
    }
  }

  async unsubscribe(symbols: string[]): Promise<void> {
    symbols.forEach((s) => this.subscribedSymbols.delete(s.toUpperCase()));
  }

  onMarketUpdate(callback: (tick: MarketTick) => void): void {
    this.tickCallbacks.push(callback);
  }

  private emitTick(tick: MarketTick): void {
    this.tickCallbacks.forEach((cb) => {
      try {
        cb(tick);
      } catch (err) {
        console.error('[YahooFinanceProvider] Error in tick callback:', err);
      }
    });
  }

  private async pollMarketData(): Promise<void> {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      // Include benchmarks and subscribed instruments
      const allSymbolsToFetch = Array.from(
        new Set([
          'NIFTY50',
          'SENSEX',
          'NIFTYBANK',
          ...Array.from(this.subscribedSymbols),
        ])
      );

      await this.fetchBatch(allSymbolsToFetch);
      this.lastHeartbeat = Date.now();
    } catch (err) {
      console.warn('[YahooFinanceProvider] Polling cycle error:', err);
    } finally {
      this.isPolling = false;
    }
  }

  private async fetchBatch(symbols: string[]): Promise<void> {
    const tasks = symbols.map(async (sym) => {
      const ticker = this.mapToYahooTicker(sym);
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(6000),
        });

        if (!res.ok) {
          return null;
        }

        const data: any = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta || meta.regularMarketPrice === undefined) {
          return null;
        }

        const price = Number(meta.regularMarketPrice);
        const prevClose = meta.chartPreviousClose ? Number(meta.chartPreviousClose) : price;
        const change = meta.fulldayChange !== undefined ? Number(meta.fulldayChange) : Number((price - prevClose).toFixed(2));
        const changePercent = meta.regularMarketChangePercent !== undefined
          ? Number(meta.regularMarketChangePercent)
          : Number((((price - prevClose) / (prevClose || 1)) * 100).toFixed(2));

        const dayHigh = meta.regularMarketDayHigh ? Number(meta.regularMarketDayHigh) : price;
        const dayLow = meta.regularMarketDayLow ? Number(meta.regularMarketDayLow) : price;
        const volume = meta.regularMarketVolume ? Number(meta.regularMarketVolume) : 0;

        const tick: MarketTick = {
          symbol: sym.toUpperCase(),
          exchange: 'NSE',
          price,
          previousClose: prevClose,
          change,
          changePercent,
          volume,
          dayHigh,
          dayLow,
          open: dayLow,
          timestamp: Date.now(),
          source: 'YAHOO_FINANCE',
        };

        this.lastKnownPrices.set(sym.toUpperCase(), price);
        this.emitTick(tick);
        return tick;
      } catch (err: any) {
        // Silently skip transient per-symbol timeout
        return null;
      }
    });

    await Promise.allSettled(tasks);
  }

  getStatus(): ProviderStatus {
    return {
      id: this.id,
      name: this.name,
      connected: this.isConnected,
      dataMode: 'LIVE',
      lastHeartbeat: this.lastHeartbeat,
      reconnectAttempts: 0,
      message: this.isConnected
        ? 'Connected to Yahoo Finance (NSE real-time market quotes)'
        : 'Idle',
    };
  }
}
