export type MarketDataStatus = 'LIVE' | 'RECENT' | 'STALE' | 'OFFLINE';
export type MarketDataMode = 'LIVE' | 'REPLAY';
export type SignalClassification = 'NORMAL' | 'WORTH_WATCHING' | 'IMPORTANT' | 'HIGH_ATTENTION';

export interface MarketTick {
  symbol: string;
  exchange: string;
  price: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  timestamp: number;
  source: string;
  dayHigh?: number;
  dayLow?: number;
  open?: number;
}

export interface Instrument {
  symbol: string;
  name: string;
  exchange: 'NSE' | 'BSE';
  sector: string;
  industry: string;
  lotSize: number;
  basePrice: number;
  averageDailyVolume: number;
  baselineVolatility: number; // annualized or ATR %
  marketCapCategory: 'LARGE_CAP' | 'MID_CAP' | 'SMALL_CAP';
  benchmarkSymbol: string; // e.g. 'NIFTY50', 'NIFTY_IT'
}

export interface SignalFactors {
  priceScore: number;           // 30% weight
  volumeScore: number;          // 25% weight
  relativePerformanceScore: number; // 20% weight
  volatilityScore: number;       // 15% weight
  marketContextScore: number;    // 10% weight
}

export interface SignalScoreResult {
  score: number; // 0 - 100
  classification: SignalClassification;
  factors: SignalFactors;
  reasons: string[];
  summary: string;
}

export interface MeaningfulChangeEvent {
  id: string;
  symbol: string;
  companyName: string;
  score: number;
  classification: SignalClassification;
  reasons: string[];
  summary: string;
  aiExplanation?: string;
  timestamp: number;
  price: number;
  changePercent: number;
  volumeMultiple: number;
  marketChangePercent: number;
  sectorChangePercent: number;
  sector: string;
  isRead?: boolean;
}

export interface WatchlistStockItem {
  symbol: string;
  addedAt: number;
  sortOrder: number;
  notes?: string;
}

export interface Watchlist {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  stocks: WatchlistStockItem[];
  createdAt: number;
  updatedAt: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: number;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultMarket: string;
  defaultWatchlistId?: string;
  currency: 'INR' | 'USD';
  dataMode: MarketDataMode;
  notifications?: NotificationPreferences;
}

export interface NotificationPreferences {
  importantSignals: boolean;
  highAttentionOnly: boolean;
  dailySummary: boolean;
  whileAwaySummary: boolean;
  soundEnabled: boolean;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'SIGNAL' | 'SYSTEM' | 'SUMMARY';
  classification?: SignalClassification;
  symbol?: string;
  timestamp: number;
  isRead: boolean;
  data?: Record<string, any>;
}

export interface IndexQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

export interface MarketOverviewData {
  indices: IndexQuote[];
  sectorPerformance: {
    sector: string;
    changePercent: number;
    leaders: string[];
    laggards: string[];
  }[];
  marketBreadth: {
    advances: number;
    declines: number;
    unchanged: number;
    total: number;
  };
  topGainers: { symbol: string; name: string; price: number; changePercent: number; volumeMultiple: number }[];
  topLosers: { symbol: string; name: string; price: number; changePercent: number; volumeMultiple: number }[];
  highAttentionSignals: MeaningfulChangeEvent[];
  lastUpdated: number;
}

export interface ProviderStatus {
  id: string;
  name: string;
  connected: boolean;
  dataMode: MarketDataMode;
  lastHeartbeat: number;
  reconnectAttempts: number;
  message?: string;
}

export interface ReplayState {
  isPlaying: boolean;
  speed: 1 | 2 | 5;
  currentTimestamp: number;
  startTimestamp: number;
  endTimestamp: number;
  progressPercent: number;
  totalEvents: number;
  currentEventIndex: number;
}

export interface WhileYouWereAwaySummary {
  awayDurationMs: number;
  awayDurationFormatted: string;
  lastSeenTimestamp: number;
  returnedAtTimestamp: number;
  meaningfulChangesCount: number;
  highAttentionCount: number;
  changes: MeaningfulChangeEvent[];
}

export type InvestmentVerdictType = 'STRONG_BUY' | 'ACCUMULATE' | 'HOLD_NEUTRAL' | 'WAIT_PULLBACK' | 'CAUTION_AVOID';
export type HoldingSafetyType = 'VERY_SAFE' | 'SAFE_TO_HOLD' | 'MONITOR_CLOSELY' | 'HIGH_DRAWDOWN_RISK';
export type ValuationRating = 'ATTRACTIVE_VALUE' | 'FAIRLY_VALUED' | 'MOMENTUM_EXPENSIVE' | 'OVERVALUED';

export interface StockInvestmentAnalysis {
  verdict: InvestmentVerdictType;
  verdictLabel: string;
  convictionScore: number; // 0-100
  verdictReason: string;
  valuationRating: ValuationRating;
  valuationLabel: string;
  idealHorizon: string; // e.g. "Long-Term (1-3 Years)"
  
  // Holding Safety ("If already invested, safe or not?")
  holdingSafety: HoldingSafetyType;
  safetyLabel: string;
  safetyScore: number; // 0-100
  guidanceForHolders: string;
  keySupportPrice: number;
  keyResistancePrice: number;
  stopLossPrice: number;
  drawdownRisk: 'LOW' | 'MODERATE' | 'ELEVATED';

  // Future Possibilities & Scenarios
  target1Year: number;
  targetUpsidePercent: number;
  scenarios: {
    bullCase: { target: number; upsidePercent: number; thesis: string };
    baseCase: { target: number; upsidePercent: number; thesis: string };
    bearCase: { supportFloor: number; downsidePercent: number; riskThesis: string };
  };
  catalysts: string[];
  riskFactors: string[];

  // Technical & Fundamental vitals
  fundamentals: {
    peRatio: number;
    sectorPe: number;
    marketCapCr: number;
    roePercent: number;
    dividendYieldPercent: number;
    week52High: number;
    week52Low: number;
    distanceFrom52wHigh: number; // %
  };
  technicals: {
    rsi14: number;
    rsiCondition: 'OVERSOLD' | 'NEUTRAL' | 'BULLISH' | 'OVERBOUGHT';
    dma20: number;
    dma50: number;
    dma200: number;
    trend: 'BULLISH_BREAKOUT' | 'HEALTHY_UPTREND' | 'RANGE_BOUND' | 'UNDER_PRESSURE';
  };
}

export interface DetailedStockQuote {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  industry: string;
  lotSize: number;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  averageDailyVolume: number;
  volumeMultiple: number;
  dayHigh: number;
  dayLow: number;
  lastUpdated: number;
  signal?: SignalScoreResult;
  aiExplanation?: string;
  aiSource?: 'GEMINI_AI' | 'DETERMINISTIC_FALLBACK';
  benchmarks?: {
    market: { name: string; changePercent: number };
    sector: { name: string; changePercent: number };
  };
  analysis: StockInvestmentAnalysis;
}
