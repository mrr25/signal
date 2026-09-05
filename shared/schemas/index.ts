import { z } from 'zod';

export const MarketTickSchema = z.object({
  symbol: z.string().min(1).max(20),
  exchange: z.string().default('NSE'),
  price: z.number().positive(),
  previousClose: z.number().positive().optional(),
  change: z.number().optional(),
  changePercent: z.number().optional(),
  volume: z.number().nonnegative().optional(),
  timestamp: z.number().positive(),
  source: z.string().default('signal_provider'),
  dayHigh: z.number().positive().optional(),
  dayLow: z.number().positive().optional(),
  open: z.number().positive().optional(),
});

export const CreateWatchlistSchema = z.object({
  name: z.string().min(1, 'Watchlist name is required').max(50),
  isDefault: z.boolean().optional(),
});

export const UpdateWatchlistSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  isDefault: z.boolean().optional(),
});

export const AddStockToWatchlistSchema = z.object({
  symbol: z.string().min(1).max(20),
  notes: z.string().max(200).optional(),
});

export const ReorderStocksSchema = z.object({
  symbols: z.array(z.string().min(1)),
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
});

export const UpdatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  defaultMarket: z.string().optional(),
  defaultWatchlistId: z.string().optional(),
  currency: z.enum(['INR', 'USD']).optional(),
  dataMode: z.enum(['LIVE', 'REPLAY']).optional(),
});

export const UpdateNotificationPreferencesSchema = z.object({
  importantSignals: z.boolean().optional(),
  highAttentionOnly: z.boolean().optional(),
  dailySummary: z.boolean().optional(),
  whileAwaySummary: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
});

export const ReplayControlSchema = z.object({
  action: z.enum(['play', 'pause', 'speed', 'seek', 'reset', 'trigger_anomaly']),
  speed: z.enum(['1', '2', '5']).or(z.number()).optional(),
  seekRatio: z.number().min(0).max(1).optional(),
  anomalyType: z.enum(['volume_spike', 'sector_divergence', 'volatility_burst']).optional(),
  symbol: z.string().optional(),
});

export const AuthRegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').max(100),
});

export const AuthLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const ExplainSignalSchema = z.object({
  eventId: z.string().optional(),
  symbol: z.string(),
  priceChange: z.number(),
  volumeMultiple: z.number(),
  marketChange: z.number(),
  sectorChange: z.number(),
  signalScore: z.number(),
  reasons: z.array(z.string()),
  sector: z.string().optional(),
});
