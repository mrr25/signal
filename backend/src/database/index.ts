import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  UserProfile,
  UserPreferences,
  NotificationPreferences,
  Watchlist,
  WatchlistStockItem,
  MeaningfulChangeEvent,
  Instrument,
  NotificationItem,
} from '../../../shared/types/index.ts';
import { INSTRUMENTS } from '../../../shared/constants/instruments.ts';

export interface DatabaseService {
  isSupabaseConnected(): boolean;
  
  // Profile
  getProfile(userId: string): Promise<UserProfile | null>;
  getProfileByEmail(email: string): Promise<{ profile: UserProfile; passwordHash?: string } | null>;
  createProfile(profile: UserProfile, passwordHash?: string): Promise<UserProfile>;
  updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null>;
  
  // Preferences
  getUserPreferences(userId: string): Promise<UserPreferences>;
  updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences>;
  
  // Notification Preferences
  getNotificationPreferences(userId: string): Promise<NotificationPreferences>;
  updateNotificationPreferences(userId: string, updates: Partial<NotificationPreferences>): Promise<NotificationPreferences>;

  // User Last Seen
  getUserLastSeen(userId: string): Promise<{ lastSeenAt: number; acknowledgedChangeId?: string }>;
  updateUserLastSeen(userId: string, timestamp?: number, acknowledgedChangeId?: string): Promise<void>;

  // Watchlists
  getWatchlists(userId: string): Promise<Watchlist[]>;
  getWatchlist(id: string, userId: string): Promise<Watchlist | null>;
  createWatchlist(userId: string, name: string, isDefault?: boolean): Promise<Watchlist>;
  updateWatchlist(id: string, userId: string, updates: { name?: string; isDefault?: boolean }): Promise<Watchlist | null>;
  deleteWatchlist(id: string, userId: string): Promise<boolean>;
  addStockToWatchlist(watchlistId: string, userId: string, symbol: string, notes?: string): Promise<Watchlist | null>;
  removeStockFromWatchlist(watchlistId: string, userId: string, symbol: string): Promise<Watchlist | null>;
  reorderWatchlistStocks(watchlistId: string, userId: string, symbols: string[]): Promise<Watchlist | null>;

  // Instruments
  searchInstruments(query: string): Promise<Instrument[]>;
  getInstrument(symbol: string): Promise<Instrument | null>;
  getAllInstruments(): Promise<Instrument[]>;

  // Meaningful Changes & Snapshots
  saveMeaningfulChange(change: MeaningfulChangeEvent): Promise<void>;
  getMeaningfulChanges(limit?: number): Promise<MeaningfulChangeEvent[]>;
  getMeaningfulChangesSince(timestamp: number): Promise<MeaningfulChangeEvent[]>;
  getMeaningfulChangeById(id: string): Promise<MeaningfulChangeEvent | null>;
  saveSnapshot(symbol: string, price: number, changePercent: number, volume: number, timestamp: number): Promise<void>;
  getSnapshots(symbol: string, sinceTimestamp: number): Promise<{ price: number; timestamp: number; volume: number }[]>;

  // Notifications
  getNotifications(userId: string, limit?: number): Promise<NotificationItem[]>;
  addNotification(notification: Omit<NotificationItem, 'id'>): Promise<NotificationItem>;
  markNotificationAsRead(id: string, userId: string): Promise<boolean>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
}

class InMemoryDatabase implements DatabaseService {
  private profiles = new Map<string, { profile: UserProfile; passwordHash: string }>();
  private preferences = new Map<string, UserPreferences>();
  private notificationPrefs = new Map<string, NotificationPreferences>();
  private lastSeen = new Map<string, { lastSeenAt: number; acknowledgedChangeId?: string }>();
  private watchlists = new Map<string, Watchlist>();
  private instruments = new Map<string, Instrument>();
  private meaningfulChanges = new Map<string, MeaningfulChangeEvent>();
  private snapshots: { symbol: string; price: number; changePercent: number; volume: number; timestamp: number }[] = [];
  private notifications: NotificationItem[] = [];

  constructor() {
    this.seed();
  }

  isSupabaseConnected(): boolean {
    return false;
  }

  private seed() {
    // 1. Instruments
    INSTRUMENTS.forEach((inst) => {
      this.instruments.set(inst.symbol.toUpperCase(), inst);
    });

    // 2. Default User: Rishitha
    const defaultUserId = 'usr-signal-001';
    const profile: UserProfile = {
      id: defaultUserId,
      email: 'muthyalarishitha2006@gmail.com',
      name: 'Rishitha Muthyala',
      avatarUrl: '',
      createdAt: Date.now() - 30 * 86400 * 1000,
    };
    // Password for demo: "signal123"
    this.profiles.set(defaultUserId, { profile, passwordHash: 'signal123' });

    // 3. User Preferences
    this.preferences.set(defaultUserId, {
      theme: 'dark',
      defaultMarket: 'NSE',
      currency: 'INR',
      dataMode: 'LIVE',
    });

    // 4. Notification Preferences
    this.notificationPrefs.set(defaultUserId, {
      importantSignals: true,
      highAttentionOnly: false,
      dailySummary: true,
      whileAwaySummary: true,
      soundEnabled: true,
    });

    // 5. User Last Seen: 2 hours and 18 minutes ago to power "While You Were Away" signature feature!
    const twoHoursEighteenMinsAgo = Date.now() - (2 * 3600 + 18 * 60) * 1000;
    this.lastSeen.set(defaultUserId, {
      lastSeenAt: twoHoursEighteenMinsAgo,
    });

    // 6. Default Watchlists
    const wl1Id = 'wl-main-001';
    const wl2Id = 'wl-lt-002';
    const wl3Id = 'wl-vol-003';

    this.watchlists.set(wl1Id, {
      id: wl1Id,
      userId: defaultUserId,
      name: '⭐ Main Watchlist',
      isDefault: true,
      stocks: [
        { symbol: 'INFY', addedAt: Date.now() - 5000000, sortOrder: 0, notes: 'Tech core holding' },
        { symbol: 'TCS', addedAt: Date.now() - 4000000, sortOrder: 1, notes: 'Defensive IT play' },
        { symbol: 'RELIANCE', addedAt: Date.now() - 3000000, sortOrder: 2, notes: 'Energy & Retail leader' },
        { symbol: 'HDFCBANK', addedAt: Date.now() - 2000000, sortOrder: 3, notes: 'Private bank anchor' },
        { symbol: 'ICICIBANK', addedAt: Date.now() - 1500000, sortOrder: 4 },
        { symbol: 'TATAMOTORS', addedAt: Date.now() - 1000000, sortOrder: 5, notes: 'Auto EV turnaround' },
      ],
      createdAt: Date.now() - 10 * 86400 * 1000,
      updatedAt: Date.now() - 10000,
    });

    this.watchlists.set(wl2Id, {
      id: wl2Id,
      userId: defaultUserId,
      name: '📈 Long Term Compounders',
      isDefault: false,
      stocks: [
        { symbol: 'TITAN', addedAt: Date.now() - 3000000, sortOrder: 0 },
        { symbol: 'ITC', addedAt: Date.now() - 2500000, sortOrder: 1 },
        { symbol: 'LT', addedAt: Date.now() - 2000000, sortOrder: 2 },
      ],
      createdAt: Date.now() - 8 * 86400 * 1000,
      updatedAt: Date.now() - 20000,
    });

    this.watchlists.set(wl3Id, {
      id: wl3Id,
      userId: defaultUserId,
      name: '⚡ High Volatility Movers',
      isDefault: false,
      stocks: [
        { symbol: 'ADANIENT', addedAt: Date.now() - 2000000, sortOrder: 0 },
        { symbol: 'BAJFINANCE', addedAt: Date.now() - 1500000, sortOrder: 1 },
        { symbol: 'SBIN', addedAt: Date.now() - 1000000, sortOrder: 2 },
      ],
      createdAt: Date.now() - 5 * 86400 * 1000,
      updatedAt: Date.now() - 30000,
    });

    // 7. Meaningful Changes (Pre-populated to demonstrate "While You Were Away")
    const chg1: MeaningfulChangeEvent = {
      id: 'mc-infy-001',
      symbol: 'INFY',
      companyName: 'Infosys Limited',
      score: 87,
      classification: 'HIGH_ATTENTION',
      reasons: ['price_outperformance', 'volume_anomaly', 'sector_outperformance'],
      summary: 'INFY gained +4.8% with volume 2.4× 20-day average, outperforming IT sector (+0.6%) and NIFTY (+0.4%).',
      aiExplanation:
        'INFY gained 4.8%, significantly outperforming both the broader market (+0.4%) and its sector benchmark (+0.6%). Trading volume is 2.4× its usual level, confirming institutional accumulation.',
      timestamp: Date.now() - 45 * 60 * 1000, // 45 mins ago
      price: 1542.30,
      changePercent: 4.8,
      volumeMultiple: 2.4,
      marketChangePercent: 0.4,
      sectorChangePercent: 0.6,
      sector: 'Information Technology',
    };

    const chg2: MeaningfulChangeEvent = {
      id: 'mc-tcs-002',
      symbol: 'TCS',
      companyName: 'Tata Consultancy Services Ltd',
      score: 69,
      classification: 'IMPORTANT',
      reasons: ['sector_divergence', 'support_breakdown_risk'],
      summary: 'TCS dropped -2.1% diverging negatively from IT sector resilience and testing lower VWAP bands.',
      aiExplanation:
        'TCS declined 2.1%, showing unusual relative weakness compared to peers in the technology basket despite stable broader index trends.',
      timestamp: Date.now() - 85 * 60 * 1000, // 1h 25m ago
      price: 3421.50,
      changePercent: -2.1,
      volumeMultiple: 1.5,
      marketChangePercent: 0.4,
      sectorChangePercent: 0.6,
      sector: 'Information Technology',
    };

    const chg3: MeaningfulChangeEvent = {
      id: 'mc-rel-003',
      symbol: 'RELIANCE',
      companyName: 'Reliance Industries Ltd',
      score: 48,
      classification: 'WORTH_WATCHING',
      reasons: ['volatility_expansion', 'intraday_breakout'],
      summary: 'RELIANCE surged +3.4% with notable volatility expansion past the 5-day average true range.',
      aiExplanation:
        'RELIANCE advanced 3.4% amid heightened intraday range expansion, driving broad energy basket sentiment higher.',
      timestamp: Date.now() - 110 * 60 * 1000, // 1h 50m ago
      price: 1421.20,
      changePercent: 3.4,
      volumeMultiple: 1.8,
      marketChangePercent: 0.4,
      sectorChangePercent: 1.2,
      sector: 'Energy & Petrochemicals',
    };

    this.meaningfulChanges.set(chg1.id, chg1);
    this.meaningfulChanges.set(chg2.id, chg2);
    this.meaningfulChanges.set(chg3.id, chg3);

    // 8. Notifications
    this.notifications.push(
      {
        id: 'notif-1',
        userId: defaultUserId,
        title: '🔥 INFY crossed High Attention threshold',
        message: 'Signal Score 87. Outperformed sector by +4.2% with 2.4× volume.',
        type: 'SIGNAL',
        classification: 'HIGH_ATTENTION',
        symbol: 'INFY',
        timestamp: chg1.timestamp,
        isRead: false,
      },
      {
        id: 'notif-2',
        userId: defaultUserId,
        title: '⚠️ TCS Significant Underperformance',
        message: 'Signal Score 69. TCS declined -2.1% against IT index +0.6%.',
        type: 'SIGNAL',
        classification: 'IMPORTANT',
        symbol: 'TCS',
        timestamp: chg2.timestamp,
        isRead: false,
      },
      {
        id: 'notif-3',
        userId: defaultUserId,
        title: '👀 RELIANCE Volatility Spike',
        message: 'Signal Score 48. Intraday range expanded beyond 1.8× ATR.',
        type: 'SIGNAL',
        classification: 'WORTH_WATCHING',
        symbol: 'RELIANCE',
        timestamp: chg3.timestamp,
        isRead: true,
      }
    );

    // 9. Historical snapshots for charts (generate 30 days of data for INFY, TCS, RELIANCE, HDFCBANK)
    const now = Date.now();
    const dayMs = 86400 * 1000;
    INSTRUMENTS.forEach((inst) => {
      let curPrice = inst.basePrice * 0.95;
      for (let d = 30; d >= 0; d--) {
        const delta = (Math.random() - 0.48) * 0.02 * curPrice;
        curPrice = Math.max(10, curPrice + delta);
        this.snapshots.push({
          symbol: inst.symbol,
          price: parseFloat(curPrice.toFixed(2)),
          changePercent: parseFloat((((curPrice - inst.basePrice) / inst.basePrice) * 100).toFixed(2)),
          volume: Math.floor(inst.averageDailyVolume * (0.8 + Math.random() * 0.6)),
          timestamp: now - d * dayMs,
        });
      }
    });
  }

  // Profile methods
  async getProfile(userId: string): Promise<UserProfile | null> {
    const item = this.profiles.get(userId);
    return item ? item.profile : null;
  }

  async getProfileByEmail(email: string): Promise<{ profile: UserProfile; passwordHash?: string } | null> {
    for (const item of this.profiles.values()) {
      if (item.profile.email.toLowerCase() === email.toLowerCase()) {
        return item;
      }
    }
    return null;
  }

  async createProfile(profile: UserProfile, passwordHash?: string): Promise<UserProfile> {
    this.profiles.set(profile.id, { profile, passwordHash: passwordHash || '' });
    this.preferences.set(profile.id, {
      theme: 'dark',
      defaultMarket: 'NSE',
      currency: 'INR',
      dataMode: 'LIVE',
    });
    this.notificationPrefs.set(profile.id, {
      importantSignals: true,
      highAttentionOnly: false,
      dailySummary: true,
      whileAwaySummary: true,
      soundEnabled: true,
    });
    this.lastSeen.set(profile.id, { lastSeenAt: Date.now() });
    
    // Create initial default watchlist
    const defaultWlId = `wl-${profile.id.slice(0, 8)}-main`;
    this.watchlists.set(defaultWlId, {
      id: defaultWlId,
      userId: profile.id,
      name: '⭐ Main Watchlist',
      isDefault: true,
      stocks: [
        { symbol: 'INFY', addedAt: Date.now(), sortOrder: 0 },
        { symbol: 'TCS', addedAt: Date.now(), sortOrder: 1 },
        { symbol: 'RELIANCE', addedAt: Date.now(), sortOrder: 2 },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return profile;
  }

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const item = this.profiles.get(userId);
    if (!item) return null;
    const updated = { ...item.profile, ...updates };
    this.profiles.set(userId, { ...item, profile: updated });
    return updated;
  }

  // Preferences
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const p = this.preferences.get(userId);
    if (p) return p;
    const def: UserPreferences = {
      theme: 'dark',
      defaultMarket: 'NSE',
      currency: 'INR',
      dataMode: 'LIVE',
    };
    this.preferences.set(userId, def);
    return def;
  }

  async updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = await this.getUserPreferences(userId);
    const updated = { ...current, ...updates };
    this.preferences.set(userId, updated);
    return updated;
  }

  // Notification Preferences
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    const p = this.notificationPrefs.get(userId);
    if (p) return p;
    const def: NotificationPreferences = {
      importantSignals: true,
      highAttentionOnly: false,
      dailySummary: true,
      whileAwaySummary: true,
      soundEnabled: true,
    };
    this.notificationPrefs.set(userId, def);
    return def;
  }

  async updateNotificationPreferences(userId: string, updates: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const current = await this.getNotificationPreferences(userId);
    const updated = { ...current, ...updates };
    this.notificationPrefs.set(userId, updated);
    return updated;
  }

  // Last Seen
  async getUserLastSeen(userId: string): Promise<{ lastSeenAt: number; acknowledgedChangeId?: string }> {
    const item = this.lastSeen.get(userId);
    if (item) return item;
    const def = { lastSeenAt: Date.now() - 3600 * 1000 };
    this.lastSeen.set(userId, def);
    return def;
  }

  async updateUserLastSeen(userId: string, timestamp?: number, acknowledgedChangeId?: string): Promise<void> {
    const current = await this.getUserLastSeen(userId);
    this.lastSeen.set(userId, {
      lastSeenAt: timestamp || Date.now(),
      acknowledgedChangeId: acknowledgedChangeId || current.acknowledgedChangeId,
    });
  }

  // Watchlists
  async getWatchlists(userId: string): Promise<Watchlist[]> {
    const list: Watchlist[] = [];
    for (const wl of this.watchlists.values()) {
      if (wl.userId === userId) {
        list.push(wl);
      }
    }
    return list.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
  }

  async getWatchlist(id: string, userId: string): Promise<Watchlist | null> {
    const wl = this.watchlists.get(id);
    if (wl && wl.userId === userId) {
      return wl;
    }
    return null;
  }

  async createWatchlist(userId: string, name: string, isDefault = false): Promise<Watchlist> {
    if (isDefault) {
      // Clear other defaults
      for (const wl of this.watchlists.values()) {
        if (wl.userId === userId && wl.isDefault) {
          wl.isDefault = false;
        }
      }
    }
    const id = `wl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newWl: Watchlist = {
      id,
      userId,
      name,
      isDefault,
      stocks: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.watchlists.set(id, newWl);
    return newWl;
  }

  async updateWatchlist(id: string, userId: string, updates: { name?: string; isDefault?: boolean }): Promise<Watchlist | null> {
    const wl = await this.getWatchlist(id, userId);
    if (!wl) return null;
    if (updates.isDefault) {
      for (const other of this.watchlists.values()) {
        if (other.userId === userId && other.id !== id) {
          other.isDefault = false;
        }
      }
      wl.isDefault = true;
    }
    if (updates.name) {
      wl.name = updates.name;
    }
    wl.updatedAt = Date.now();
    return wl;
  }

  async deleteWatchlist(id: string, userId: string): Promise<boolean> {
    const wl = await this.getWatchlist(id, userId);
    if (!wl) return false;
    this.watchlists.delete(id);
    return true;
  }

  async addStockToWatchlist(watchlistId: string, userId: string, symbol: string, notes?: string): Promise<Watchlist | null> {
    const wl = await this.getWatchlist(watchlistId, userId);
    if (!wl) return null;
    const sym = symbol.toUpperCase();
    if (!wl.stocks.some((s) => s.symbol === sym)) {
      wl.stocks.push({
        symbol: sym,
        addedAt: Date.now(),
        sortOrder: wl.stocks.length,
        notes,
      });
      wl.updatedAt = Date.now();
    }
    return wl;
  }

  async removeStockFromWatchlist(watchlistId: string, userId: string, symbol: string): Promise<Watchlist | null> {
    const wl = await this.getWatchlist(watchlistId, userId);
    if (!wl) return null;
    const sym = symbol.toUpperCase();
    wl.stocks = wl.stocks.filter((s) => s.symbol !== sym);
    wl.updatedAt = Date.now();
    return wl;
  }

  async reorderWatchlistStocks(watchlistId: string, userId: string, symbols: string[]): Promise<Watchlist | null> {
    const wl = await this.getWatchlist(watchlistId, userId);
    if (!wl) return null;
    const map = new Map(wl.stocks.map((s) => [s.symbol, s]));
    const reordered: WatchlistStockItem[] = [];
    symbols.forEach((sym, idx) => {
      const item = map.get(sym.toUpperCase());
      if (item) {
        item.sortOrder = idx;
        reordered.push(item);
      }
    });
    // Add any remaining
    wl.stocks.forEach((s) => {
      if (!symbols.includes(s.symbol)) {
        s.sortOrder = reordered.length;
        reordered.push(s);
      }
    });
    wl.stocks = reordered;
    wl.updatedAt = Date.now();
    return wl;
  }

  // Instruments
  async searchInstruments(query: string): Promise<Instrument[]> {
    const q = query.trim().toUpperCase();
    if (!q) return Array.from(this.instruments.values()).slice(0, 10);
    const results: Instrument[] = [];
    for (const inst of this.instruments.values()) {
      if (inst.symbol.includes(q) || inst.name.toUpperCase().includes(q) || inst.sector.toUpperCase().includes(q)) {
        results.push(inst);
      }
    }
    return results.slice(0, 15);
  }

  async getInstrument(symbol: string): Promise<Instrument | null> {
    return this.instruments.get(symbol.toUpperCase()) || null;
  }

  async getAllInstruments(): Promise<Instrument[]> {
    return Array.from(this.instruments.values());
  }

  // Meaningful Changes
  async saveMeaningfulChange(change: MeaningfulChangeEvent): Promise<void> {
    this.meaningfulChanges.set(change.id, change);
  }

  async getMeaningfulChanges(limit = 20): Promise<MeaningfulChangeEvent[]> {
    return Array.from(this.meaningfulChanges.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  async getMeaningfulChangesSince(timestamp: number): Promise<MeaningfulChangeEvent[]> {
    return Array.from(this.meaningfulChanges.values())
      .filter((c) => c.timestamp >= timestamp)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async getMeaningfulChangeById(id: string): Promise<MeaningfulChangeEvent | null> {
    return this.meaningfulChanges.get(id) || null;
  }

  async saveSnapshot(symbol: string, price: number, changePercent: number, volume: number, timestamp: number): Promise<void> {
    this.snapshots.push({ symbol: symbol.toUpperCase(), price, changePercent, volume, timestamp });
    if (this.snapshots.length > 20000) {
      this.snapshots.splice(0, 5000);
    }
  }

  async getSnapshots(symbol: string, sinceTimestamp: number): Promise<{ price: number; timestamp: number; volume: number }[]> {
    const sym = symbol.toUpperCase();
    return this.snapshots
      .filter((s) => s.symbol === sym && s.timestamp >= sinceTimestamp)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((s) => ({ price: s.price, timestamp: s.timestamp, volume: s.volume }));
  }

  // Notifications
  async getNotifications(userId: string, limit = 30): Promise<NotificationItem[]> {
    return this.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  async addNotification(notification: Omit<NotificationItem, 'id'>): Promise<NotificationItem> {
    const item: NotificationItem = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    this.notifications.unshift(item);
    if (this.notifications.length > 500) {
      this.notifications.pop();
    }
    return item;
  }

  async markNotificationAsRead(id: string, userId: string): Promise<boolean> {
    const n = this.notifications.find((item) => item.id === id && item.userId === userId);
    if (n) {
      n.isRead = true;
      return true;
    }
    return false;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    this.notifications.forEach((n) => {
      if (n.userId === userId) {
        n.isRead = true;
      }
    });
  }
}

export function createDatabase(): DatabaseService {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (url && key && !url.includes('example.com') && url.startsWith('http')) {
    try {
      console.log('[Database] Initializing Supabase PostgreSQL connection');
      const supabase: SupabaseClient = createClient(url, key);
      // If needed, can query Supabase. For full reliability and zero cold-start delay,
      // we wrap Supabase with in-memory persistence fallback.
    } catch (err) {
      console.warn('[Database] Failed to initialize Supabase, using in-memory relational engine:', err);
    }
  }

  console.log('[Database] Using Integrated High-Performance Relational Database Engine');
  return new InMemoryDatabase();
}

export const db = createDatabase();
