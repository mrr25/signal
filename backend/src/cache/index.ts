import { Redis } from '@upstash/redis';
import { MarketTick } from '../../../shared/types/index.ts';

export interface CacheService {
  isAvailable(): boolean;
  getType(): 'UPSTASH_REDIS' | 'IN_MEMORY_FALLBACK';
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  mget<T>(keys: string[]): Promise<(T | null)[]>;
  saveLatestTick(tick: MarketTick): Promise<void>;
  getLatestTick(symbol: string): Promise<MarketTick | null>;
  getAllLatestTicks(symbols: string[]): Promise<Record<string, MarketTick>>;
  setMarketStatus(status: any): Promise<void>;
  getMarketStatus(): Promise<any | null>;
}

class UpstashRedisCache implements CacheService {
  private client: Redis;

  constructor(url: string, token: string) {
    this.client = new Redis({
      url,
      token,
    });
  }

  isAvailable(): boolean {
    return true;
  }

  getType(): 'UPSTASH_REDIS' {
    return 'UPSTASH_REDIS';
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      return await this.client.get<T>(key);
    } catch (err) {
      console.warn(`[Redis Cache] Get error for ${key}:`, err);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, value, { ex: ttlSeconds });
      } else {
        await this.client.set(key, value);
      }
    } catch (err) {
      console.warn(`[Redis Cache] Set error for ${key}:`, err);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      console.warn(`[Redis Cache] Del error for ${key}:`, err);
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) return [];
    try {
      return await this.client.mget<T[]>(...keys);
    } catch (err) {
      console.warn('[Redis Cache] Mget error:', err);
      return keys.map(() => null);
    }
  }

  async saveLatestTick(tick: MarketTick): Promise<void> {
    const key = `market:latest:${tick.symbol.toUpperCase()}`;
    await this.set(key, tick, 86400); // 24h
  }

  async getLatestTick(symbol: string): Promise<MarketTick | null> {
    const key = `market:latest:${symbol.toUpperCase()}`;
    return await this.get<MarketTick>(key);
  }

  async getAllLatestTicks(symbols: string[]): Promise<Record<string, MarketTick>> {
    if (symbols.length === 0) return {};
    const keys = symbols.map((s) => `market:latest:${s.toUpperCase()}`);
    const results = await this.mget<MarketTick>(keys);
    const map: Record<string, MarketTick> = {};
    symbols.forEach((sym, idx) => {
      const val = results[idx];
      if (val) {
        map[sym.toUpperCase()] = val;
      }
    });
    return map;
  }

  async setMarketStatus(status: any): Promise<void> {
    await this.set('market:status', status, 3600);
  }

  async getMarketStatus(): Promise<any | null> {
    return await this.get('market:status');
  }
}

class InMemoryCache implements CacheService {
  private store = new Map<string, { value: any; expiry: number | null }>();

  isAvailable(): boolean {
    return true;
  }

  getType(): 'IN_MEMORY_FALLBACK' {
    return 'IN_MEMORY_FALLBACK';
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiry && Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiry = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiry });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map((k) => this.get<T>(k)));
  }

  async saveLatestTick(tick: MarketTick): Promise<void> {
    await this.set(`market:latest:${tick.symbol.toUpperCase()}`, tick, 86400);
  }

  async getLatestTick(symbol: string): Promise<MarketTick | null> {
    return await this.get<MarketTick>(`market:latest:${symbol.toUpperCase()}`);
  }

  async getAllLatestTicks(symbols: string[]): Promise<Record<string, MarketTick>> {
    const map: Record<string, MarketTick> = {};
    for (const sym of symbols) {
      const tick = await this.getLatestTick(sym);
      if (tick) {
        map[sym.toUpperCase()] = tick;
      }
    }
    return map;
  }

  async setMarketStatus(status: any): Promise<void> {
    await this.set('market:status', status, 3600);
  }

  async getMarketStatus(): Promise<any | null> {
    return await this.get('market:status');
  }
}

export function createCache(): CacheService {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token && !url.includes('example.com') && url.startsWith('http')) {
    try {
      console.log('[Cache] Initializing Upstash Redis Client');
      return new UpstashRedisCache(url, token);
    } catch (err) {
      console.warn('[Cache] Failed to initialize Upstash Redis, falling back to in-memory:', err);
    }
  }

  console.log('[Cache] Using High-Performance Resilient In-Memory Cache');
  return new InMemoryCache();
}

export const cache = createCache();
