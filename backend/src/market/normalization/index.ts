import { MarketTick } from '../../../../shared/types/index.ts';
import { MarketTickSchema } from '../../../../shared/schemas/index.ts';

export class TickNormalizer {
  private lastProcessedTicks = new Map<string, { price: number; timestamp: number }>();

  /**
   * Validates and normalizes raw market ticks into strict MarketTick format.
   * Returns null if tick is invalid or duplicate.
   */
  normalize(raw: any, fallbackPreviousClose?: number): MarketTick | null {
    if (!raw || typeof raw !== 'object') return null;

    // 1. Symbol check
    const rawSymbol = raw.symbol || raw.tradingSymbol || raw.SECURITY_ID;
    if (!rawSymbol || typeof rawSymbol !== 'string') return null;
    const symbol = rawSymbol.trim().toUpperCase();

    // 2. Price extraction and sanity checks
    const rawPrice = raw.price ?? raw.LTP ?? raw.ltp ?? raw.lastPrice;
    const price = Number(rawPrice);
    if (isNaN(price) || !isFinite(price) || price <= 0) {
      return null;
    }

    // 3. Timestamp check
    const rawTs = raw.timestamp ?? raw.LTT ?? raw.time ?? Date.now();
    let timestamp = Number(rawTs);
    if (isNaN(timestamp) || timestamp <= 0) {
      timestamp = Date.now();
    }
    // Handle timestamps in seconds instead of milliseconds
    if (timestamp < 10000000000) {
      timestamp = timestamp * 1000;
    }

    // 4. Volume check
    let volume = raw.volume !== undefined ? Number(raw.volume) : undefined;
    if (volume !== undefined && (isNaN(volume) || !isFinite(volume) || volume < 0)) {
      volume = 0;
    }

    // 5. Deduplication check (skip identical price with same or older timestamp)
    const prev = this.lastProcessedTicks.get(symbol);
    if (prev && prev.price === price && timestamp <= prev.timestamp) {
      return null;
    }

    // 6. Previous close and change calculations
    const prevClose =
      Number(raw.previousClose ?? raw.close ?? raw.prevClose ?? fallbackPreviousClose) || undefined;
    let change = raw.change !== undefined ? Number(raw.change) : undefined;
    let changePercent = raw.changePercent !== undefined ? Number(raw.changePercent) : undefined;

    if (prevClose && prevClose > 0) {
      if (change === undefined) {
        change = Number((price - prevClose).toFixed(2));
      }
      if (changePercent === undefined) {
        changePercent = Number((((price - prevClose) / prevClose) * 100).toFixed(2));
      }
    }

    const normalized: MarketTick = {
      symbol,
      exchange: raw.exchange ? String(raw.exchange).toUpperCase() : 'NSE',
      price: Number(price.toFixed(2)),
      previousClose: prevClose ? Number(prevClose.toFixed(2)) : undefined,
      change: change !== undefined ? Number(change.toFixed(2)) : undefined,
      changePercent: changePercent !== undefined ? Number(changePercent.toFixed(2)) : undefined,
      volume,
      timestamp,
      source: raw.source || 'market_feed',
      dayHigh: raw.dayHigh ? Number(Number(raw.dayHigh).toFixed(2)) : undefined,
      dayLow: raw.dayLow ? Number(Number(raw.dayLow).toFixed(2)) : undefined,
      open: raw.open ? Number(Number(raw.open).toFixed(2)) : undefined,
    };

    // Validate with Zod
    const parsed = MarketTickSchema.safeParse(normalized);
    if (!parsed.success) {
      return null;
    }

    // Store for dedup
    this.lastProcessedTicks.set(symbol, { price: normalized.price, timestamp: normalized.timestamp });

    return normalized;
  }
}

export const normalizer = new TickNormalizer();
