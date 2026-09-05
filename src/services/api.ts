import {
  Watchlist,
  MarketOverviewData,
  MeaningfulChangeEvent,
  WhileYouWereAwaySummary,
  NotificationItem,
  UserProfile,
  UserPreferences,
  Instrument,
  ReplayState,
} from '../../shared/types/index.ts';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('signal_auth_token') || 'sig_sess_default_rishitha_session_token';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export const api = {
  // Health
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  // Auth
  async register(email: string, password: string, name: string) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Registration failed');
    }
    return res.json();
  },

  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Login failed');
    }
    return res.json();
  },

  async logout() {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    localStorage.removeItem('signal_auth_token');
  },

  async getMe(): Promise<{ profile: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Not authenticated');
    return res.json();
  },

  // Watchlists
  async getWatchlists(): Promise<{ watchlists: any[] }> {
    const res = await fetch(`${API_BASE}/watchlists`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch watchlists');
    return res.json();
  },

  async createWatchlist(name: string, isDefault = false): Promise<{ watchlist: Watchlist }> {
    const res = await fetch(`${API_BASE}/watchlists`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, isDefault }),
    });
    if (!res.ok) throw new Error('Failed to create watchlist');
    return res.json();
  },

  async updateWatchlist(id: string, updates: { name?: string; isDefault?: boolean }) {
    const res = await fetch(`${API_BASE}/watchlists/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update watchlist');
    return res.json();
  },

  async deleteWatchlist(id: string) {
    const res = await fetch(`${API_BASE}/watchlists/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete watchlist');
    return res.json();
  },

  async addStock(watchlistId: string, symbol: string, notes?: string) {
    const res = await fetch(`${API_BASE}/watchlists/${watchlistId}/stocks`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ symbol, notes }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Failed to add stock');
    }
    return res.json();
  },

  async removeStock(watchlistId: string, symbol: string) {
    const res = await fetch(`${API_BASE}/watchlists/${watchlistId}/stocks/${symbol}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to remove stock');
    return res.json();
  },

  async reorderStocks(watchlistId: string, symbols: string[]) {
    const res = await fetch(`${API_BASE}/watchlists/${watchlistId}/reorder`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ symbols }),
    });
    if (!res.ok) throw new Error('Failed to reorder stocks');
    return res.json();
  },

  // Stock details
  async getStock(symbol: string) {
    const res = await fetch(`${API_BASE}/stocks/${symbol}`);
    if (!res.ok) throw new Error(`Stock ${symbol} not found`);
    return res.json();
  },

  // Search
  async searchInstruments(query: string): Promise<{ results: Instrument[] }> {
    const res = await fetch(`${API_BASE}/instruments/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return { results: [] };
    return res.json();
  },

  // Market Overview
  async getMarketOverview(): Promise<MarketOverviewData> {
    const res = await fetch(`${API_BASE}/market/overview`);
    if (!res.ok) throw new Error('Failed to fetch market overview');
    return res.json();
  },

  // Attention Feed
  async getAttentionFeed(filter = 'ALL'): Promise<{ events: MeaningfulChangeEvent[] }> {
    const res = await fetch(`${API_BASE}/user/attention?filter=${filter}`);
    if (!res.ok) throw new Error('Failed to fetch attention feed');
    return res.json();
  },

  // While You Were Away
  async getAwaySummary(): Promise<WhileYouWereAwaySummary> {
    const res = await fetch(`${API_BASE}/user/away`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch away summary');
    return res.json();
  },

  async markSeen(): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/user/seen`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to mark seen');
    return res.json();
  },

  // Notifications
  async getNotifications(): Promise<{ notifications: NotificationItem[] }> {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return { notifications: [] };
    return res.json();
  },

  async markNotificationRead(id: string) {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async markAllNotificationsRead() {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // Profile & Preferences
  async getPreferences(): Promise<{ preferences: UserPreferences }> {
    const res = await fetch(`${API_BASE}/user/preferences`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch preferences');
    return res.json();
  },

  async updatePreferences(updates: Partial<UserPreferences>) {
    const res = await fetch(`${API_BASE}/user/preferences`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  async updateProfile(updates: Partial<UserProfile>) {
    const res = await fetch(`${API_BASE}/user/profile`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  // Replay Control
  async controlReplay(payload: {
    action: 'play' | 'pause' | 'speed' | 'seek' | 'reset' | 'trigger_anomaly';
    speed?: 1 | 2 | 5;
    seekRatio?: number;
    anomalyType?: 'volume_spike' | 'sector_divergence' | 'volatility_burst';
    symbol?: string;
  }): Promise<{ success: boolean; replayState: ReplayState }> {
    const res = await fetch(`${API_BASE}/replay/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Replay control error');
    return res.json();
  },

  // Data Status
  async getDataStatus() {
    const res = await fetch(`${API_BASE}/data/status`);
    return res.json();
  },

  // Market Ticks
  async getTicks(): Promise<{ ticks: Record<string, any>; timestamp: number }> {
    const res = await fetch(`${API_BASE}/market/ticks`);
    if (!res.ok) throw new Error('Failed to fetch ticks');
    return res.json();
  },

  // Market Mode Switch
  async setMarketMode(mode: 'LIVE' | 'REPLAY'): Promise<{ success: boolean; mode: string }> {
    const res = await fetch(`${API_BASE}/market/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    if (!res.ok) throw new Error('Failed to switch market mode');
    return res.json();
  },

  // Explain Signal (Gemini AI)
  async explainSignal(payload: any) {
    const res = await fetch(`${API_BASE}/ai/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
};
