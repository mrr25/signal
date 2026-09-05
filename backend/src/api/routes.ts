import { Router, Request, Response } from 'express';
import { db } from '../database/index.ts';
import { cache } from '../cache/index.ts';
import { marketManager } from '../market/manager.ts';
import { signalEngine } from '../signals/engine.ts';
import { stockAnalysisService } from '../signals/analysis.service.ts';
import { geminiService } from '../ai/gemini.ts';
import { authService, requireAuth, AuthenticatedRequest } from '../auth/service.ts';
import {
  CreateWatchlistSchema,
  UpdateWatchlistSchema,
  AddStockToWatchlistSchema,
  ReorderStocksSchema,
  UpdateProfileSchema,
  UpdatePreferencesSchema,
  ReplayControlSchema,
  AuthRegisterSchema,
  AuthLoginSchema,
  ExplainSignalSchema,
} from '../../../shared/schemas/index.ts';
import { getInstrument, INSTRUMENTS } from '../../../shared/constants/instruments.ts';

export const apiRouter = Router();

// -------------------------------------------------------------
// 1. Health Check (Section 45)
// -------------------------------------------------------------
apiRouter.get('/health', async (req: Request, res: Response) => {
  const dataStatus = marketManager.getDataStatus();
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    services: {
      backend: 'healthy',
      database: db.isSupabaseConnected() ? 'supabase_connected' : 'in_memory_healthy',
      redis: cache.getType(),
      marketData: dataStatus.provider.connected ? 'connected' : 'idle',
      mode: dataStatus.mode,
    },
  });
});

// -------------------------------------------------------------
// 2. Authentication (Section 5)
// -------------------------------------------------------------
apiRouter.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const validated = AuthRegisterSchema.parse(req.body);
    const result = await authService.register(validated.email, validated.password, validated.name);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: { code: 'REGISTRATION_FAILED', message: err.message } });
  }
});

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const validated = AuthLoginSchema.parse(req.body);
    const result = await authService.login(validated.email, validated.password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: { code: 'LOGIN_FAILED', message: err.message } });
  }
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    authService.destroySession(token);
  }
  res.json({ success: true });
});

apiRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ profile: req.user });
});

// -------------------------------------------------------------
// 3. Watchlists (Section 7)
// -------------------------------------------------------------
apiRouter.get('/watchlists', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const watchlists = await db.getWatchlists(userId);

    // Enrich with latest ticks and signal scores
    const enriched = await Promise.all(
      watchlists.map(async (wl) => {
        const symbols = wl.stocks.map((s) => s.symbol);
        const ticks = await cache.getAllLatestTicks(symbols);

        const enrichedStocks = wl.stocks.map((stock) => {
          const tick = ticks[stock.symbol];
          const inst = getInstrument(stock.symbol);
          const evalResult = tick ? signalEngine.evaluate(tick) : null;

          return {
            symbol: stock.symbol,
            name: inst?.name || stock.symbol,
            exchange: inst?.exchange || 'NSE',
            sector: inst?.sector || 'General',
            price: tick?.price || inst?.basePrice || 0,
            previousClose: tick?.previousClose || inst?.basePrice,
            change: tick?.change || 0,
            changePercent: tick?.changePercent || 0,
            volume: tick?.volume || 0,
            signalScore: evalResult?.score || 15,
            signalClassification: evalResult?.classification || 'NORMAL',
            addedAt: stock.addedAt,
            notes: stock.notes,
          };
        });

        return {
          ...wl,
          stocks: enrichedStocks,
        };
      })
    );

    res.json({ watchlists: enriched });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'FETCH_WATCHLISTS_FAILED', message: err.message } });
  }
});

apiRouter.post('/watchlists', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = CreateWatchlistSchema.parse(req.body);
    const watchlist = await db.createWatchlist(req.user!.id, validated.name, validated.isDefault);
    res.status(201).json({ watchlist });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'CREATE_WATCHLIST_FAILED', message: err.message } });
  }
});

apiRouter.patch('/watchlists/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = UpdateWatchlistSchema.parse(req.body);
    const updated = await db.updateWatchlist(req.params.id, req.user!.id, validated);
    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Watchlist not found' } });
    }
    res.json({ watchlist: updated });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'UPDATE_WATCHLIST_FAILED', message: err.message } });
  }
});

apiRouter.delete('/watchlists/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await db.deleteWatchlist(req.params.id, req.user!.id);
    if (!success) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Watchlist not found' } });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'DELETE_WATCHLIST_FAILED', message: err.message } });
  }
});

apiRouter.post('/watchlists/:id/stocks', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = AddStockToWatchlistSchema.parse(req.body);
    const inst = await db.getInstrument(validated.symbol);
    if (!inst) {
      return res.status(400).json({ error: { code: 'INVALID_INSTRUMENT', message: `Symbol '${validated.symbol}' is not a recognized instrument.` } });
    }
    const updated = await db.addStockToWatchlist(req.params.id, req.user!.id, validated.symbol, validated.notes);
    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Watchlist not found' } });
    }
    // Auto subscribe provider to this stock
    marketManager.subscribe([validated.symbol]);
    res.status(201).json({ watchlist: updated });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'ADD_STOCK_FAILED', message: err.message } });
  }
});

apiRouter.delete('/watchlists/:id/stocks/:symbol', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await db.removeStockFromWatchlist(req.params.id, req.user!.id, req.params.symbol);
    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Watchlist not found' } });
    }
    res.json({ watchlist: updated });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'REMOVE_STOCK_FAILED', message: err.message } });
  }
});

apiRouter.patch('/watchlists/:id/reorder', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = ReorderStocksSchema.parse(req.body);
    const updated = await db.reorderWatchlistStocks(req.params.id, req.user!.id, validated.symbols);
    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Watchlist not found' } });
    }
    res.json({ watchlist: updated });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'REORDER_FAILED', message: err.message } });
  }
});

// -------------------------------------------------------------
// 4. Stock Details & Timeline (Section 25)
// -------------------------------------------------------------
apiRouter.get('/stocks/:symbol', async (req: Request, res: Response) => {
  try {
    const sym = req.params.symbol.toUpperCase();
    const inst = await db.getInstrument(sym);
    if (!inst) {
      return res.status(404).json({ error: { code: 'INSTRUMENT_NOT_FOUND', message: `Symbol ${sym} not found.` } });
    }

    const latestTick = await cache.getLatestTick(sym);
    const price = latestTick?.price || inst.basePrice;
    const change = latestTick?.change || 0;
    const changePercent = latestTick?.changePercent || 0;
    const volume = latestTick?.volume || Math.floor(inst.averageDailyVolume * 0.45);

    // Context & Signal Evaluation
    const evalResult = signalEngine.evaluate(
      latestTick || {
        symbol: sym,
        exchange: inst.exchange,
        price,
        previousClose: inst.basePrice,
        change,
        changePercent,
        volume,
        timestamp: Date.now(),
        source: 'snapshot',
      }
    );

    // Historical snapshots for chart
    const snapshots = await db.getSnapshots(sym, Date.now() - 30 * 86400 * 1000);

    const volumeMultiple = Number((volume / (inst.averageDailyVolume * 0.5)).toFixed(1));

    // Deep Investment & Holding Safety Analysis
    const analysis = stockAnalysisService.generateAnalysis(
      inst,
      price,
      changePercent,
      volumeMultiple,
      evalResult.score
    );

    // AI explanation
    const aiRes = await geminiService.explain({
      symbol: sym,
      companyName: inst.name,
      priceChange: changePercent,
      volumeMultiple,
      marketChange: 0.4,
      sectorChange: 0.6,
      signalScore: evalResult.score,
      reasons: evalResult.reasons,
      sector: inst.sector,
    });

    res.json({
      stock: {
        symbol: inst.symbol,
        name: inst.name,
        exchange: inst.exchange,
        sector: inst.sector,
        industry: inst.industry,
        lotSize: inst.lotSize,
        price,
        previousClose: inst.basePrice,
        change,
        changePercent,
        volume,
        averageDailyVolume: inst.averageDailyVolume,
        volumeMultiple,
        dayHigh: latestTick?.dayHigh || price * 1.015,
        dayLow: latestTick?.dayLow || price * 0.985,
        lastUpdated: latestTick?.timestamp || Date.now(),
        signal: evalResult,
        aiExplanation: aiRes.explanation,
        aiSource: aiRes.source,
        benchmarks: {
          market: { name: 'NIFTY 50', changePercent: 0.4 },
          sector: { name: inst.sector, changePercent: 0.6 },
        },
        analysis,
      },
      chart: snapshots,
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'STOCK_FETCH_ERROR', message: err.message } });
  }
});

// -------------------------------------------------------------
// 5. Stock Search (Section 8)
// -------------------------------------------------------------
apiRouter.get('/instruments/search', async (req: Request, res: Response) => {
  const q = String(req.query.q || '');
  const results = await db.searchInstruments(q);
  res.json({ results });
});

// -------------------------------------------------------------
// 6. Market Overview (Section 26)
// -------------------------------------------------------------
apiRouter.get('/market/overview', async (req: Request, res: Response) => {
  try {
    const overview = await marketManager.getMarketOverview();
    res.json(overview);
  } catch (err: any) {
    res.status(500).json({ error: { code: 'MARKET_OVERVIEW_ERROR', message: err.message } });
  }
});

// -------------------------------------------------------------
// 7. Attention Feed & "While You Were Away" (Sections 23 & 24)
// -------------------------------------------------------------
apiRouter.get('/user/attention', async (req: Request, res: Response) => {
  const filter = String(req.query.filter || 'ALL').toUpperCase();
  const changes = await db.getMeaningfulChanges(30);

  let filtered = changes;
  if (filter === 'HIGH_ATTENTION') {
    filtered = changes.filter((c) => c.classification === 'HIGH_ATTENTION');
  } else if (filter === 'IMPORTANT') {
    filtered = changes.filter((c) => c.classification === 'IMPORTANT' || c.classification === 'HIGH_ATTENTION');
  } else if (filter === 'WORTH_WATCHING') {
    filtered = changes.filter((c) => c.classification === 'WORTH_WATCHING');
  }

  res.json({ events: filtered });
});

apiRouter.get('/user/away', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const lastSeen = await db.getUserLastSeen(userId);
    const now = Date.now();
    const awayDurationMs = Math.max(0, now - lastSeen.lastSeenAt);

    // Format away duration with exact precision (seconds, minutes, hours)
    const totalSeconds = Math.floor(awayDurationMs / 1000);
    const totalMins = Math.floor(totalSeconds / 60);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const secs = totalSeconds % 60;

    let awayFormatted = '';
    if (hours > 0) {
      awayFormatted = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    } else if (mins > 0) {
      awayFormatted = secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    } else {
      awayFormatted = `${Math.max(1, secs)}s`;
    }

    const changes = await db.getMeaningfulChangesSince(lastSeen.lastSeenAt);
    const highAttentionCount = changes.filter((c) => c.classification === 'HIGH_ATTENTION').length;

    res.json({
      awayDurationMs,
      awayDurationFormatted: awayFormatted,
      lastSeenTimestamp: lastSeen.lastSeenAt,
      returnedAtTimestamp: now,
      meaningfulChangesCount: changes.length,
      highAttentionCount,
      changes,
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'AWAY_FETCH_ERROR', message: err.message } });
  }
});

apiRouter.post('/user/seen', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await db.updateUserLastSeen(req.user!.id, Date.now());
    res.json({ success: true, timestamp: Date.now() });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'UPDATE_SEEN_ERROR', message: err.message } });
  }
});

// -------------------------------------------------------------
// 8. Notifications (Section 29)
// -------------------------------------------------------------
apiRouter.get('/notifications', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const notifs = await db.getNotifications(req.user!.id);
  res.json({ notifications: notifs });
});

apiRouter.post('/notifications/:id/read', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const success = await db.markNotificationAsRead(req.params.id, req.user!.id);
  res.json({ success });
});

apiRouter.post('/notifications/read-all', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  await db.markAllNotificationsAsRead(req.user!.id);
  res.json({ success: true });
});

// -------------------------------------------------------------
// 9. Profile & Settings (Section 6)
// -------------------------------------------------------------
apiRouter.get('/user/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  res.json({ profile: req.user });
});

apiRouter.patch('/user/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = UpdateProfileSchema.parse(req.body);
    const updated = await db.updateProfile(req.user!.id, validated);
    res.json({ profile: updated });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'PROFILE_UPDATE_FAILED', message: err.message } });
  }
});

apiRouter.get('/user/preferences', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const prefs = await db.getUserPreferences(req.user!.id);
  res.json({ preferences: prefs });
});

apiRouter.patch('/user/preferences', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = UpdatePreferencesSchema.parse(req.body);
    const updated = await db.updateUserPreferences(req.user!.id, validated);
    // If dataMode changed, propagate to marketManager
    if (validated.dataMode) {
      await marketManager.setMode(validated.dataMode);
    }
    res.json({ preferences: updated });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'PREFERENCES_UPDATE_FAILED', message: err.message } });
  }
});

// -------------------------------------------------------------
// 10. Data Status & Replay Control (Sections 12 & 32)
// -------------------------------------------------------------
apiRouter.get('/data/status', (req: Request, res: Response) => {
  res.json(marketManager.getDataStatus());
});

apiRouter.get('/market/ticks', async (req: Request, res: Response) => {
  try {
    const allSymbols = INSTRUMENTS.map((i) => i.symbol);
    const ticks = await cache.getAllLatestTicks(allSymbols);
    res.json({ ticks, timestamp: Date.now() });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'TICKS_FETCH_FAILED', message: err.message } });
  }
});

apiRouter.post('/market/mode', async (req: Request, res: Response) => {
  try {
    const { mode } = req.body;
    if (mode === 'LIVE' || mode === 'REPLAY') {
      await marketManager.setMode(mode);
      res.json({ success: true, mode });
    } else {
      res.status(400).json({ error: { code: 'INVALID_MODE', message: 'Mode must be LIVE or REPLAY' } });
    }
  } catch (err: any) {
    res.status(500).json({ error: { code: 'MODE_SWITCH_FAILED', message: err.message } });
  }
});

apiRouter.post('/replay/control', (req: Request, res: Response) => {
  try {
    const validated = ReplayControlSchema.parse(req.body);
    const replay = marketManager.getReplayProvider();

    switch (validated.action) {
      case 'play':
        replay.play();
        break;
      case 'pause':
        replay.pause();
        break;
      case 'speed':
        const spd = Number(validated.speed) as 1 | 2 | 5;
        if ([1, 2, 5].includes(spd)) {
          replay.setSpeed(spd);
        }
        break;
      case 'seek':
        if (validated.seekRatio !== undefined) {
          replay.seek(validated.seekRatio);
        }
        break;
      case 'reset':
        replay.reset();
        break;
      case 'trigger_anomaly':
        replay.triggerAnomaly(validated.anomalyType || 'volume_spike', validated.symbol || 'INFY');
        break;
    }

    res.json({
      success: true,
      replayState: replay.getReplayState(),
    });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'REPLAY_CONTROL_FAILED', message: err.message } });
  }
});

// -------------------------------------------------------------
// 11. AI Explanation Endpoint (Section 30)
// -------------------------------------------------------------
apiRouter.post('/ai/explain', async (req: Request, res: Response) => {
  try {
    const validated = ExplainSignalSchema.parse(req.body);
    const result = await geminiService.explain(validated);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: { code: 'AI_EXPLAIN_FAILED', message: err.message } });
  }
});
