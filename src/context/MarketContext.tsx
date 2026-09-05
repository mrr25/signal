import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  Watchlist,
  MarketTick,
  IndexQuote,
  MarketDataStatus,
  MarketDataMode,
  ReplayState,
  MeaningfulChangeEvent,
  WhileYouWereAwaySummary,
  NotificationItem,
  MarketOverviewData,
} from '../../shared/types/index.ts';
import { api } from '../services/api.ts';
import { wsClient } from '../services/websocket.ts';

interface MarketContextType {
  watchlists: Watchlist[];
  activeWatchlistId: string;
  activeWatchlist: Watchlist | undefined;
  setActiveWatchlistId: (id: string) => void;
  marketOverview: MarketOverviewData | null;
  attentionEvents: MeaningfulChangeEvent[];
  awaySummary: WhileYouWereAwaySummary | null;
  showAwayModal: boolean;
  setShowAwayModal: (show: boolean) => void;
  markAwaySeen: () => Promise<void>;
  liveTicks: Record<string, MarketTick & { flash?: 'up' | 'down'; signalScore?: number; signalClassification?: string }>;
  indices: Record<string, IndexQuote>;
  dataStatus: MarketDataStatus;
  dataMode: MarketDataMode;
  providerName: string;
  replayState: ReplayState | null;
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  isWsConnected: boolean;
  selectedStockSymbol: string | null;
  setSelectedStockSymbol: (sym: string | null) => void;
  triggerAwayBriefing: () => Promise<void>;

  refreshWatchlists: () => Promise<void>;
  createWatchlist: (name: string, isDefault?: boolean) => Promise<Watchlist>;
  updateWatchlist: (id: string, updates: { name?: string; isDefault?: boolean }) => Promise<void>;
  deleteWatchlist: (id: string) => Promise<void>;
  addStockToActiveWatchlist: (symbol: string, notes?: string) => Promise<void>;
  removeStockFromActiveWatchlist: (symbol: string) => Promise<void>;
  controlReplay: (action: 'play' | 'pause' | 'speed' | 'seek' | 'reset' | 'trigger_anomaly', payload?: any) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  setMode: (mode: MarketDataMode) => Promise<void>;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export const MarketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<string>('');
  const [marketOverview, setMarketOverview] = useState<MarketOverviewData | null>(null);
  const [attentionEvents, setAttentionEvents] = useState<MeaningfulChangeEvent[]>([]);
  const [awaySummary, setAwaySummary] = useState<WhileYouWereAwaySummary | null>(null);
  const [showAwayModal, setShowAwayModal] = useState<boolean>(false);
  const [liveTicks, setLiveTicks] = useState<Record<string, MarketTick & { flash?: 'up' | 'down'; signalScore?: number; signalClassification?: string }>>({});
  const [indices, setIndices] = useState<Record<string, IndexQuote>>({});
  const [dataStatus, setDataStatus] = useState<MarketDataStatus>('LIVE');
  const [dataMode, setDataMode] = useState<MarketDataMode>('LIVE');
  const [providerName, setProviderName] = useState<string>('Live NSE Market Feed');
  const [replayState, setReplayState] = useState<ReplayState | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string | null>(null);

  // Active Watchlist
  const activeWatchlist = watchlists.find((w) => w.id === activeWatchlistId) || watchlists[0];

  // Refresh watchlists
  const refreshWatchlists = useCallback(async () => {
    try {
      const data = await api.getWatchlists();
      setWatchlists(data.watchlists);
      if (data.watchlists.length > 0 && !activeWatchlistId) {
        const def = data.watchlists.find((w: any) => w.isDefault) || data.watchlists[0];
        setActiveWatchlistId(def.id);
      }
    } catch (err) {
      console.warn('[MarketContext] Error fetching watchlists:', err);
    }
  }, [activeWatchlistId]);

  // Load initial data
  useEffect(() => {
    refreshWatchlists();

    // Sync initial status & mode
    api.getDataStatus()
      .then((res) => {
        if (res?.status) setDataStatus(res.status);
        if (res?.mode) setDataMode(res.mode);
        if (res?.provider?.name) setProviderName(res.provider.name);
      })
      .catch(() => {});

    // Sync initial market ticks
    api.getTicks()
      .then((res) => {
        if (res?.ticks) {
          setLiveTicks((prev) => ({ ...res.ticks, ...prev }));
        }
      })
      .catch(() => {});

    api.getMarketOverview()
      .then((ov) => {
        setMarketOverview(ov);
        const idxMap: Record<string, IndexQuote> = {};
        ov.indices.forEach((idx) => {
          idxMap[idx.symbol] = idx;
        });
        setIndices(idxMap);
      })
      .catch(() => {});

    api.getAttentionFeed('ALL')
      .then((res) => setAttentionEvents(res.events))
      .catch(() => {});

    api.getNotifications()
      .then((res) => setNotifications(res.notifications))
      .catch(() => {});

    // Check While You Were Away
    api.getAwaySummary()
      .then((away) => {
        setAwaySummary(away);
        // If user was away (even for a few minutes) and there are meaningful changes, trigger the away card
        if (away.awayDurationMs > 30 * 1000 && away.meaningfulChangesCount > 0) {
          setShowAwayModal(true);
        }
      })
      .catch(() => {});

    // Polling fallback every 4s to ensure data freshness regardless of iframe WebSocket state
    const pollingInterval = setInterval(() => {
      api.getTicks()
        .then((res) => {
          if (res?.ticks) {
            setLiveTicks((prev) => ({ ...prev, ...res.ticks }));
          }
        })
        .catch(() => {});

      api.getMarketOverview()
        .then((ov) => {
          if (ov?.indices) {
            const idxMap: Record<string, IndexQuote> = {};
            ov.indices.forEach((idx) => {
              idxMap[idx.symbol] = idx;
            });
            setIndices(idxMap);
          }
        })
        .catch(() => {});
    }, 4000);

    // Connect WebSocket
    wsClient.connect();

    const unsubConn = wsClient.on('connection_status', ({ connected }) => {
      setIsWsConnected(connected);
    });

    const unsubPrice = wsClient.on('PRICE_UPDATE', (tick: any) => {
      setLiveTicks((prev) => {
        const old = prev[tick.symbol];
        let flash: 'up' | 'down' | undefined = undefined;
        if (old) {
          if (tick.price > old.price) flash = 'up';
          else if (tick.price < old.price) flash = 'down';
        }

        return {
          ...prev,
          [tick.symbol]: {
            ...tick,
            flash,
          },
        };
      });

      // Clear flash after 800ms
      setTimeout(() => {
        setLiveTicks((prev) => {
          if (!prev[tick.symbol] || !prev[tick.symbol].flash) return prev;
          return {
            ...prev,
            [tick.symbol]: {
              ...prev[tick.symbol],
              flash: undefined,
            },
          };
        });
      }, 800);
    });

    const unsubIndex = wsClient.on('INDEX_UPDATE', (idx: IndexQuote) => {
      setIndices((prev) => ({
        ...prev,
        [idx.symbol]: idx,
      }));
    });

    const unsubStatus = wsClient.on('DATA_STATUS', (statusObj: any) => {
      if (statusObj?.status) setDataStatus(statusObj.status);
      if (statusObj?.mode) setDataMode(statusObj.mode);
      if (statusObj?.provider?.name) setProviderName(statusObj.provider.name);
    });

    const unsubReplay = wsClient.on('REPLAY_STATUS', (state: ReplayState) => {
      setReplayState(state);
    });

    const unsubChange = wsClient.on('MEANINGFUL_CHANGE', (event: MeaningfulChangeEvent) => {
      setAttentionEvents((prev) => [event, ...prev.filter((e) => e.id !== event.id)].slice(0, 50));
    });

    const unsubNotif = wsClient.on('NOTIFICATION', (notif: any) => {
      const item: NotificationItem = {
        id: `notif-${Date.now()}`,
        userId: 'current',
        title: notif.title,
        message: `${notif.classification?.replace('_', ' ')} detected with score ${notif.score}/100`,
        type: 'SIGNAL',
        classification: notif.classification,
        symbol: notif.symbol,
        timestamp: notif.timestamp || Date.now(),
        isRead: false,
      };
      setNotifications((prev) => [item, ...prev]);
    });

    return () => {
      unsubConn();
      unsubPrice();
      unsubIndex();
      unsubStatus();
      unsubReplay();
      unsubChange();
      unsubNotif();
      clearInterval(pollingInterval);
      wsClient.disconnect();
    };
  }, [refreshWatchlists]);

  // Watchlist Actions
  const createWatchlist = async (name: string, isDefault = false) => {
    const res = await api.createWatchlist(name, isDefault);
    await refreshWatchlists();
    setActiveWatchlistId(res.watchlist.id);
    return res.watchlist;
  };

  const updateWatchlist = async (id: string, updates: { name?: string; isDefault?: boolean }) => {
    await api.updateWatchlist(id, updates);
    await refreshWatchlists();
  };

  const deleteWatchlist = async (id: string) => {
    await api.deleteWatchlist(id);
    await refreshWatchlists();
    const remaining = watchlists.filter((w) => w.id !== id);
    if (remaining.length > 0) {
      setActiveWatchlistId(remaining[0].id);
    }
  };

  const addStockToActiveWatchlist = async (symbol: string, notes?: string) => {
    if (!activeWatchlistId) return;
    await api.addStock(activeWatchlistId, symbol, notes);
    await refreshWatchlists();
    wsClient.subscribe([symbol]);
  };

  const removeStockFromActiveWatchlist = async (symbol: string) => {
    if (!activeWatchlistId) return;
    await api.removeStock(activeWatchlistId, symbol);
    await refreshWatchlists();
  };

  const controlReplay = async (action: 'play' | 'pause' | 'speed' | 'seek' | 'reset' | 'trigger_anomaly', payload?: any) => {
    const res = await api.controlReplay({ action, ...payload });
    setReplayState(res.replayState);
  };

  const markAwaySeen = async () => {
    await api.markSeen();
    setShowAwayModal(false);
  };

  const triggerAwayBriefing = async () => {
    try {
      const away = await api.getAwaySummary();
      setAwaySummary(away);
      setShowAwayModal(true);
    } catch {
      setShowAwayModal(true);
    }
  };

  const markNotificationRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const markAllNotificationsRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const setMode = async (mode: MarketDataMode) => {
    try {
      await api.setMarketMode(mode);
      setDataMode(mode);
    } catch {
      setDataMode(mode);
    }
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

  return (
    <MarketContext.Provider
      value={{
        watchlists,
        activeWatchlistId,
        activeWatchlist,
        setActiveWatchlistId,
        marketOverview,
        attentionEvents,
        awaySummary,
        showAwayModal,
        setShowAwayModal,
        markAwaySeen,
        triggerAwayBriefing,
        liveTicks,
        indices,
        dataStatus,
        dataMode,
        providerName,
        replayState,
        notifications,
        unreadNotificationsCount,
        isWsConnected,
        selectedStockSymbol,
        setSelectedStockSymbol,
        refreshWatchlists,
        createWatchlist,
        updateWatchlist,
        deleteWatchlist,
        addStockToActiveWatchlist,
        removeStockFromActiveWatchlist,
        controlReplay,
        markNotificationRead,
        markAllNotificationsRead,
        setMode,
      }}
    >
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = (): MarketContextType => {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('useMarket must be used within a MarketProvider');
  }
  return context;
};
