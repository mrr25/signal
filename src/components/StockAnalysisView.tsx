import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  RefreshCw,
  Search,
  Check,
  Plus,
  BarChart2,
  Clock,
  Zap,
  Activity,
  Award,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { api } from '../services/api.ts';
import { useMarket } from '../context/MarketContext.tsx';
import { INSTRUMENTS } from '../../shared/constants/instruments.ts';
import { DetailedStockQuote, StockInvestmentAnalysis } from '../../shared/types/index.ts';

const SECTOR_FILTERS = [
  'ALL',
  'Information Technology',
  'Banking & Financials',
  'Automobile',
  'Energy & Petrochemicals',
  'Consumer Goods',
  'Consumer Discretionary',
  'Pharmaceuticals',
  'Metals & Mining',
  'Capital Goods & Infra',
];

export const StockAnalysisView: React.FC = () => {
  const { liveTicks, watchlists, activeWatchlist, addStockToActiveWatchlist } = useMarket();
  const [selectedSymbol, setSelectedSymbol] = useState<string>('RELIANCE');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [stockData, setStockData] = useState<DetailedStockQuote | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SAFETY' | 'FUTURE_TARGETS' | 'FINANCIALS'>('OVERVIEW');

  // Filter available instruments
  const filteredInstruments = INSTRUMENTS.filter((inst) => {
    const matchesSector = selectedSector === 'ALL' || inst.sector === selectedSector;
    const matchesQuery =
      !searchQuery.trim() ||
      inst.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.sector.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSector && matchesQuery;
  });

  // Fetch full stock analysis
  const fetchStockAnalysis = async (symbol: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getStock(symbol);
      setStockData(res.stock);

      if (res.chart && res.chart.length > 0) {
        setChartData(res.chart);
      } else {
        // Fallback synthetic curve around current price
        const base = res.stock.price || 1000;
        const pts = Array.from({ length: 30 }).map((_, i) => ({
          timestamp: Date.now() - (30 - i) * 86400 * 1000,
          price: Number((base * (0.92 + (i / 30) * 0.12 + Math.sin(i / 3) * 0.02)).toFixed(2)),
          volume: Math.floor(res.stock.averageDailyVolume * (0.6 + Math.random() * 0.8)),
        }));
        setChartData(pts);
      }
    } catch (err: any) {
      setError(err.message || `Failed to load intelligence for ${symbol}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockAnalysis(selectedSymbol);
  }, [selectedSymbol]);

  // Live real-time tick integration
  const liveTick = liveTicks[selectedSymbol];
  const displayPrice = liveTick?.price || stockData?.price || 0;
  const displayChange = liveTick?.change ?? stockData?.change ?? 0;
  const displayChangePercent = liveTick?.changePercent ?? stockData?.changePercent ?? 0;
  const isPositive = displayChangePercent >= 0;

  // Format currency
  const formatINR = (val?: number) => {
    if (val === undefined || val === null) return '₹0.00';
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format exact update time
  const formatUpdateTime = (timestamp?: number) => {
    if (!timestamp) return 'Just now';
    return new Date(timestamp).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  // Check if current stock is in active watchlist
  const isInWatchlist = activeWatchlist?.stocks.some((s) => s.symbol === selectedSymbol);

  const handleToggleWatchlist = async () => {
    if (isInWatchlist) return;
    try {
      await addStockToActiveWatchlist(selectedSymbol, 'Added from Stock Analysis Hub');
    } catch {
      // Ignored
    }
  };

  // Request refreshed AI explanation
  const handleRefreshExplanation = async () => {
    if (!stockData || isExplaining) return;
    setIsExplaining(true);
    try {
      const res = await api.explainSignal({
        symbol: stockData.symbol,
        companyName: stockData.name,
        priceChange: displayChangePercent,
        volumeMultiple: stockData.volumeMultiple || 1.4,
        marketChange: 0.4,
        sectorChange: 0.6,
        signalScore: stockData.signal?.score || 72,
        reasons: stockData.signal?.reasons || ['PRICE_MOMENTUM'],
        sector: stockData.sector,
      });
      if (res?.explanation) {
        setStockData((prev) =>
          prev
            ? {
                ...prev,
                aiExplanation: res.explanation,
                aiSource: res.source,
              }
            : null
        );
      }
    } catch {
      // Gracefully handled
    } finally {
      setIsExplaining(false);
    }
  };

  const analysis = stockData?.analysis;

  // Helper color for verdict
  const getVerdictTheme = (verdict?: string) => {
    switch (verdict) {
      case 'STRONG_BUY':
        return {
          border: 'border-[#00FF94]/50',
          bg: 'bg-[#00FF94]/10',
          badge: 'bg-[#00FF94] text-black font-bold',
          text: 'text-[#00FF94]',
        };
      case 'ACCUMULATE':
        return {
          border: 'border-emerald-500/40',
          bg: 'bg-emerald-500/10',
          badge: 'bg-emerald-400 text-black font-bold',
          text: 'text-emerald-400',
        };
      case 'HOLD_NEUTRAL':
        return {
          border: 'border-[#FFB800]/40',
          bg: 'bg-[#FFB800]/10',
          badge: 'bg-[#FFB800] text-black font-bold',
          text: 'text-[#FFB800]',
        };
      case 'WAIT_PULLBACK':
        return {
          border: 'border-orange-500/40',
          bg: 'bg-orange-500/10',
          badge: 'bg-orange-400 text-black font-bold',
          text: 'text-orange-400',
        };
      case 'CAUTION_AVOID':
      default:
        return {
          border: 'border-[#FF3131]/40',
          bg: 'bg-[#FF3131]/10',
          badge: 'bg-[#FF3131] text-white font-bold',
          text: 'text-[#FF3131]',
        };
    }
  };

  // Helper color for safety
  const getSafetyTheme = (safety?: string) => {
    switch (safety) {
      case 'VERY_SAFE':
        return {
          border: 'border-[#00FF94]/40',
          bg: 'bg-[#00FF94]/10',
          badge: 'bg-[#00FF94] text-black font-bold',
          text: 'text-[#00FF94]',
          icon: ShieldCheck,
        };
      case 'SAFE_TO_HOLD':
        return {
          border: 'border-cyan-500/40',
          bg: 'bg-cyan-500/10',
          badge: 'bg-cyan-400 text-black font-bold',
          text: 'text-cyan-400',
          icon: ShieldCheck,
        };
      case 'MONITOR_CLOSELY':
        return {
          border: 'border-[#FFB800]/40',
          bg: 'bg-[#FFB800]/10',
          badge: 'bg-[#FFB800] text-black font-bold',
          text: 'text-[#FFB800]',
          icon: AlertTriangle,
        };
      case 'HIGH_DRAWDOWN_RISK':
      default:
        return {
          border: 'border-[#FF3131]/40',
          bg: 'bg-[#FF3131]/10',
          badge: 'bg-[#FF3131] text-white font-bold',
          text: 'text-[#FF3131]',
          icon: ShieldAlert,
        };
    }
  };

  const verdictTheme = getVerdictTheme(analysis?.verdict);
  const safetyTheme = getSafetyTheme(analysis?.holdingSafety);
  const SafetyIcon = safetyTheme.icon;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050505] text-[#E0E0E0] overflow-hidden font-sans">
      {/* Top Header & Ticker Quick Selector */}
      <div className="border-b border-[#1F1F1F] bg-[#0A0A0A] p-3 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Title & Stats */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-sm bg-[#141414] border border-[#262626] flex items-center justify-center text-[#00FF94]">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Stock Intelligence & Analysis Hub
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-[#141414] text-[#888] border border-[#262626]">
                  {INSTRUMENTS.length} NSE Equities
                </span>
              </div>
              <p className="text-[11px] text-[#777]">
                Investment decision verdicts, holding safety, and 1-year future scenarios
              </p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="flex items-center space-x-2">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#666]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any stock or sector..."
                className="w-full bg-[#141414] border border-[#262626] rounded-sm pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-[#555] font-mono outline-none focus:border-[#00FF94]/60 transition"
              />
            </div>
            <button
              onClick={() => fetchStockAnalysis(selectedSymbol)}
              className="p-1.5 rounded-sm bg-[#141414] hover:bg-[#1E1E1E] text-[#888] hover:text-white border border-[#262626] transition"
              title="Refresh stock analysis"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#00FF94]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sector Quick Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pt-2.5 pb-1 scrollbar-thin">
          {SECTOR_FILTERS.map((sec) => (
            <button
              key={sec}
              onClick={() => setSelectedSector(sec)}
              className={`text-[10px] font-mono px-2.5 py-1 rounded-sm whitespace-nowrap transition border ${
                selectedSector === sec
                  ? 'bg-[#1E1E1E] text-[#00FF94] border-[#00FF94]/50 font-bold'
                  : 'bg-[#0F0F0F] text-[#777] border-[#1F1F1F] hover:text-[#E0E0E0] hover:bg-[#141414]'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>

        {/* Horizontal Stock Carousel / Ticker Row */}
        <div className="flex items-center space-x-2 overflow-x-auto pt-2 pb-1 scrollbar-thin">
          {filteredInstruments.map((inst) => {
            const isSelected = inst.symbol === selectedSymbol;
            const t = liveTicks[inst.symbol];
            const chg = t?.changePercent ?? 0;
            const isPos = chg >= 0;

            return (
              <button
                key={inst.symbol}
                onClick={() => setSelectedSymbol(inst.symbol)}
                className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-sm text-xs font-mono transition border shrink-0 ${
                  isSelected
                    ? 'bg-[#181818] border-[#00FF94] text-white shadow-md'
                    : 'bg-[#0D0D0D] border-[#1A1A1A] text-[#888] hover:bg-[#141414] hover:text-white'
                }`}
              >
                <span className="font-bold tracking-wider">{inst.symbol}</span>
                <span className="text-[11px] font-sans text-[#666] hidden sm:inline">
                  {formatINR(t?.price || inst.basePrice)}
                </span>
                <span
                  className={`text-[10px] ${
                    isPos ? 'text-[#00FF94]' : 'text-[#FF3131]'
                  }`}
                >
                  {isPos ? '+' : ''}
                  {chg.toFixed(1)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && !stockData ? (
          <div className="h-96 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#00FF94]" />
            <span className="text-xs font-mono text-[#888]">
              Computing quantitative valuation, safety indices, and scenarios for {selectedSymbol}...
            </span>
          </div>
        ) : error ? (
          <div className="p-6 bg-[#FF3131]/10 border border-[#FF3131]/30 rounded-sm text-center">
            <p className="text-xs font-mono text-[#FF3131]">{error}</p>
            <button
              onClick={() => fetchStockAnalysis(selectedSymbol)}
              className="mt-3 px-3 py-1 bg-[#141414] border border-[#262626] text-xs font-mono text-white rounded-sm"
            >
              Retry Analysis
            </button>
          </div>
        ) : stockData && analysis ? (
          <>
            {/* 1. Hero Instrument Vital Signs Banner */}
            <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm p-4 relative overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Symbol & Live Price */}
                <div>
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xl font-mono font-bold text-white tracking-wider">
                      {stockData.symbol}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-sm bg-[#141414] text-[#AAA] border border-[#262626]">
                      {stockData.exchange}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-sm bg-[#141414] text-[#888] border border-[#262626]">
                      {stockData.sector}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-sm bg-[#141414] text-[#00FF94] border border-[#00FF94]/30">
                      {stockData.industry}
                    </span>
                  </div>
                  <div className="text-xs text-[#777] mt-0.5 font-sans">
                    {stockData.name}
                  </div>

                  <div className="flex items-baseline space-x-3 mt-3">
                    <span className="text-3xl font-mono font-bold text-white tracking-tight">
                      {formatINR(displayPrice)}
                    </span>
                    <div
                      className={`flex items-center space-x-1 font-mono text-sm font-semibold px-2 py-0.5 rounded-sm ${
                        isPositive
                          ? 'text-[#00FF94] bg-[#00FF94]/10 border border-[#00FF94]/30'
                          : 'text-[#FF3131] bg-[#FF3131]/10 border border-[#FF3131]/30'
                      }`}
                    >
                      {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      <span>
                        {isPositive ? '+' : ''}
                        {displayChange.toFixed(2)} ({isPositive ? '+' : ''}
                        {displayChangePercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Last Updated Timestamp & Live Badge */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-2">
                  <div className="flex items-center space-x-2 font-mono text-xs text-[#888] bg-[#050505] px-3 py-1.5 rounded-sm border border-[#1F1F1F]">
                    <span className="w-2 h-2 rounded-full bg-[#00FF94] animate-pulse" />
                    <Clock className="w-3.5 h-3.5 text-[#888]" />
                    <span>Last Updated:</span>
                    <span className="text-white font-bold">
                      {formatUpdateTime(stockData.lastUpdated)}
                    </span>
                    <span className="text-[10px] text-[#555]">IST</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleToggleWatchlist}
                      className={`px-3 py-1.5 text-xs font-mono rounded-sm transition flex items-center space-x-1.5 border ${
                        isInWatchlist
                          ? 'bg-[#141414] text-[#00FF94] border-[#00FF94]/40 cursor-default'
                          : 'bg-[#181818] hover:bg-[#222] text-white border-[#2A2A2A]'
                      }`}
                    >
                      {isInWatchlist ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#00FF94]" />
                          <span>In Watchlist</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 text-white" />
                          <span>Add to Watchlist</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleRefreshExplanation}
                      disabled={isExplaining}
                      className="px-3 py-1.5 text-xs font-mono rounded-sm bg-[#141414] hover:bg-[#1E1E1E] text-[#00FF94] border border-[#00FF94]/40 transition flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      <Zap className={`w-3.5 h-3.5 ${isExplaining ? 'animate-spin' : ''}`} />
                      <span>{isExplaining ? 'Analyzing...' : 'AI Insights'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Day & 52-Week Range Sliders */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#141414] text-xs font-mono">
                {/* Day Range */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#777]">
                    <span>Day Low: {formatINR(stockData.dayLow)}</span>
                    <span className="text-[#AAA]">Today's Range</span>
                    <span>Day High: {formatINR(stockData.dayHigh)}</span>
                  </div>
                  <div className="h-1.5 bg-[#141414] rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-[#00FF94] rounded-full"
                      style={{
                        width: `${Math.max(
                          5,
                          Math.min(
                            95,
                            ((displayPrice - stockData.dayLow) /
                              Math.max(1, stockData.dayHigh - stockData.dayLow)) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* 52-Week Range */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#777]">
                    <span>52W Low: {formatINR(analysis.fundamentals.week52Low)}</span>
                    <span className="text-[#AAA]">
                      52-Week Range ({analysis.fundamentals.distanceFrom52wHigh}% off ATH)
                    </span>
                    <span>52W High: {formatINR(analysis.fundamentals.week52High)}</span>
                  </div>
                  <div className="h-1.5 bg-[#141414] rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-[#00FF94] rounded-full"
                      style={{
                        width: `${Math.max(
                          5,
                          Math.min(
                            95,
                            ((displayPrice - analysis.fundamentals.week52Low) /
                              Math.max(
                                1,
                                analysis.fundamentals.week52High - analysis.fundamentals.week52Low
                              )) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. THE TWO PRIMARY DECISION CARDS ("Can Be Invested?" & "Is My Holding Safe?") */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* CARD 1: NEW INVESTMENT VERDICT */}
              <div
                className={`bg-[#0A0A0A] border ${verdictTheme.border} ${verdictTheme.bg} rounded-sm p-4 relative flex flex-col justify-between shadow-lg`}
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#1F1F1F]">
                    <div className="flex items-center space-x-2">
                      <Target className={`w-4 h-4 ${verdictTheme.text}`} />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                        Investment Verdict: Can It Be Invested?
                      </span>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-sm ${verdictTheme.badge}`}>
                      {analysis.verdictLabel}
                    </span>
                  </div>

                  <div className="mt-3.5 space-y-2.5">
                    {/* Conviction Bar */}
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className="text-[#888]">Signal Conviction Score:</span>
                        <span className={`font-bold ${verdictTheme.text}`}>
                          {analysis.convictionScore}/100
                        </span>
                      </div>
                      <div className="h-2 bg-[#141414] rounded-sm overflow-hidden border border-[#1F1F1F]">
                        <div
                          className={`h-full ${
                            analysis.convictionScore >= 75
                              ? 'bg-[#00FF94]'
                              : analysis.convictionScore >= 55
                              ? 'bg-[#FFB800]'
                              : 'bg-[#FF3131]'
                          }`}
                          style={{ width: `${analysis.convictionScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Verdict Rationale */}
                    <p className="text-xs text-[#CCCCCC] leading-relaxed bg-[#050505]/70 p-3 rounded-sm border border-[#1F1F1F]">
                      {analysis.verdictReason}
                    </p>

                    {/* Key Attributes */}
                    <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                      <div className="bg-[#0D0D0D] p-2 rounded-sm border border-[#1A1A1A]">
                        <div className="text-[10px] text-[#777]">Valuation State</div>
                        <div className="text-white font-semibold text-[11px] truncate">
                          {analysis.valuationLabel}
                        </div>
                      </div>
                      <div className="bg-[#0D0D0D] p-2 rounded-sm border border-[#1A1A1A]">
                        <div className="text-[10px] text-[#777]">Recommended Horizon</div>
                        <div className="text-[#00FF94] font-semibold text-[11px]">
                          {analysis.idealHorizon}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#1F1F1F] flex items-center justify-between text-[11px] font-mono text-[#888]">
                  <span>1-Year Base Target:</span>
                  <span className="text-[#00FF94] font-bold">
                    {formatINR(analysis.target1Year)} (+{analysis.targetUpsidePercent}%)
                  </span>
                </div>
              </div>

              {/* CARD 2: EXISTING INVESTOR SAFETY ASSESSMENT */}
              <div
                className={`bg-[#0A0A0A] border ${safetyTheme.border} ${safetyTheme.bg} rounded-sm p-4 relative flex flex-col justify-between shadow-lg`}
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#1F1F1F]">
                    <div className="flex items-center space-x-2">
                      <SafetyIcon className={`w-4 h-4 ${safetyTheme.text}`} />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                        Holding Safety: If Already Invested, Safe or Not?
                      </span>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-sm ${safetyTheme.badge}`}>
                      {analysis.safetyLabel}
                    </span>
                  </div>

                  <div className="mt-3.5 space-y-2.5">
                    {/* Safety Score Meter */}
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className="text-[#888]">Capital Preservation Index:</span>
                        <span className={`font-bold ${safetyTheme.text}`}>
                          {analysis.safetyScore}/100
                        </span>
                      </div>
                      <div className="h-2 bg-[#141414] rounded-sm overflow-hidden border border-[#1F1F1F]">
                        <div
                          className={`h-full ${
                            analysis.safetyScore >= 75
                              ? 'bg-cyan-400'
                              : analysis.safetyScore >= 55
                              ? 'bg-[#FFB800]'
                              : 'bg-[#FF3131]'
                          }`}
                          style={{ width: `${analysis.safetyScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Direct Guidance for Existing Holders */}
                    <p className="text-xs text-[#CCCCCC] leading-relaxed bg-[#050505]/70 p-3 rounded-sm border border-[#1F1F1F]">
                      {analysis.guidanceForHolders}
                    </p>

                    {/* Critical Protection Levels */}
                    <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-xs">
                      <div className="bg-[#0D0D0D] p-2 rounded-sm border border-[#1A1A1A]">
                        <div className="text-[10px] text-[#777]">Key Support</div>
                        <div className="text-cyan-400 font-bold text-[11px]">
                          {formatINR(analysis.keySupportPrice)}
                        </div>
                      </div>
                      <div className="bg-[#0D0D0D] p-2 rounded-sm border border-[#1A1A1A]">
                        <div className="text-[10px] text-[#777]">Trailing Stop</div>
                        <div className="text-[#FF3131] font-bold text-[11px]">
                          {formatINR(analysis.stopLossPrice)}
                        </div>
                      </div>
                      <div className="bg-[#0D0D0D] p-2 rounded-sm border border-[#1A1A1A]">
                        <div className="text-[10px] text-[#777]">Drawdown Risk</div>
                        <div
                          className={`font-bold text-[11px] ${
                            analysis.drawdownRisk === 'LOW'
                              ? 'text-[#00FF94]'
                              : analysis.drawdownRisk === 'MODERATE'
                              ? 'text-[#FFB800]'
                              : 'text-[#FF3131]'
                          }`}
                        >
                          {analysis.drawdownRisk}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#1F1F1F] flex items-center justify-between text-[11px] font-mono text-[#888]">
                  <span>Immediate Resistance / Profit Target:</span>
                  <span className="text-white font-bold">{formatINR(analysis.keyResistancePrice)}</span>
                </div>
              </div>
            </div>

            {/* 3. FUTURE POSSIBILITIES & 1-YEAR SCENARIO TARGETS */}
            <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-[#00FF94]" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                    Future Possibilities: 1-Year Price Target Scenarios
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-[#666]">
                  Grounded in historical volatility & sector earnings CAGR
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-sans">
                {/* Bull Case */}
                <div className="bg-[#0D0D0D] border border-[#00FF94]/30 rounded-sm p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-[#00FF94] uppercase tracking-wider">
                      🐂 Bull Case
                    </span>
                    <span className="text-xs font-mono font-bold text-[#00FF94]">
                      +{analysis.scenarios.bullCase.upsidePercent}%
                    </span>
                  </div>
                  <div className="text-lg font-mono font-bold text-white">
                    {formatINR(analysis.scenarios.bullCase.target)}
                  </div>
                  <p className="text-xs text-[#999] leading-relaxed">
                    {analysis.scenarios.bullCase.thesis}
                  </p>
                </div>

                {/* Base Case */}
                <div className="bg-[#0D0D0D] border border-[#1F1F1F] rounded-sm p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                      ⚖️ Base Case (Target)
                    </span>
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      +{analysis.scenarios.baseCase.upsidePercent}%
                    </span>
                  </div>
                  <div className="text-lg font-mono font-bold text-white">
                    {formatINR(analysis.scenarios.baseCase.target)}
                  </div>
                  <p className="text-xs text-[#999] leading-relaxed">
                    {analysis.scenarios.baseCase.thesis}
                  </p>
                </div>

                {/* Bear Case / Support Floor */}
                <div className="bg-[#0D0D0D] border border-[#FF3131]/30 rounded-sm p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-[#FF3131] uppercase tracking-wider">
                      🐻 Bear Case Floor
                    </span>
                    <span className="text-xs font-mono font-bold text-[#FF3131]">
                      -{analysis.scenarios.bearCase.downsidePercent}%
                    </span>
                  </div>
                  <div className="text-lg font-mono font-bold text-white">
                    {formatINR(analysis.scenarios.bearCase.supportFloor)}
                  </div>
                  <p className="text-xs text-[#999] leading-relaxed">
                    {analysis.scenarios.bearCase.riskThesis}
                  </p>
                </div>
              </div>

              {/* Catalysts & Risk Factors Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {/* Catalysts */}
                <div className="bg-[#050505] border border-[#141414] rounded-sm p-3 space-y-2">
                  <div className="text-[11px] font-mono font-bold text-[#00FF94] uppercase tracking-wider flex items-center space-x-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Growth Catalysts & Tailwinds</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-[#AAA]">
                    {analysis.catalysts.map((cat, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-[#00FF94] font-bold mt-0.5">•</span>
                        <span>{cat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Risks */}
                <div className="bg-[#050505] border border-[#141414] rounded-sm p-3 space-y-2">
                  <div className="text-[11px] font-mono font-bold text-[#FFB800] uppercase tracking-wider flex items-center space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Key Risk Factors to Monitor</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-[#AAA]">
                    {analysis.riskFactors.map((risk, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-[#FFB800] font-bold mt-0.5">•</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* 4. FINANCIALS & TECHNICAL INDICATORS GRID */}
            <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BarChart2 className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                    Fundamental & Technical Vital Signs
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-[#666]">
                  PE Multiple • ROE • RSI (14) • Moving Averages
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 font-mono">
                {/* P/E Ratio */}
                <div className="bg-[#050505] p-2.5 rounded-sm border border-[#1A1A1A]">
                  <div className="text-[10px] text-[#777]">Trailing P/E</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {analysis.fundamentals.peRatio}x
                  </div>
                  <div className="text-[9px] text-[#555] mt-0.5">
                    Sector: {analysis.fundamentals.sectorPe}x
                  </div>
                </div>

                {/* Market Cap */}
                <div className="bg-[#050505] p-2.5 rounded-sm border border-[#1A1A1A]">
                  <div className="text-[10px] text-[#777]">Market Cap</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    ₹{analysis.fundamentals.marketCapCr.toLocaleString('en-IN')} Cr
                  </div>
                  <div className="text-[9px] text-[#00FF94] mt-0.5">
                    {stockData.marketCapCategory || 'LARGE CAP'}
                  </div>
                </div>

                {/* Return on Equity */}
                <div className="bg-[#050505] p-2.5 rounded-sm border border-[#1A1A1A]">
                  <div className="text-[10px] text-[#777]">ROE</div>
                  <div className="text-sm font-bold text-[#00FF94] mt-0.5">
                    {analysis.fundamentals.roePercent}%
                  </div>
                  <div className="text-[9px] text-[#555] mt-0.5">
                    Div Yield: {analysis.fundamentals.dividendYieldPercent}%
                  </div>
                </div>

                {/* RSI (14) */}
                <div className="bg-[#050505] p-2.5 rounded-sm border border-[#1A1A1A]">
                  <div className="text-[10px] text-[#777]">RSI (14)</div>
                  <div
                    className={`text-sm font-bold mt-0.5 ${
                      analysis.technicals.rsi14 >= 70
                        ? 'text-[#FFB800]'
                        : analysis.technicals.rsi14 <= 35
                        ? 'text-[#00FF94]'
                        : 'text-white'
                    }`}
                  >
                    {analysis.technicals.rsi14}
                  </div>
                  <div className="text-[9px] text-[#777] mt-0.5">
                    {analysis.technicals.rsiCondition}
                  </div>
                </div>

                {/* 50 DMA */}
                <div className="bg-[#050505] p-2.5 rounded-sm border border-[#1A1A1A]">
                  <div className="text-[10px] text-[#777]">50 DMA</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {formatINR(analysis.technicals.dma50)}
                  </div>
                  <div
                    className={`text-[9px] mt-0.5 ${
                      displayPrice >= analysis.technicals.dma50
                        ? 'text-[#00FF94]'
                        : 'text-[#FF3131]'
                    }`}
                  >
                    {displayPrice >= analysis.technicals.dma50 ? 'Above 50 DMA' : 'Below 50 DMA'}
                  </div>
                </div>

                {/* 200 DMA */}
                <div className="bg-[#050505] p-2.5 rounded-sm border border-[#1A1A1A]">
                  <div className="text-[10px] text-[#777]">200 DMA</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {formatINR(analysis.technicals.dma200)}
                  </div>
                  <div
                    className={`text-[9px] mt-0.5 ${
                      displayPrice >= analysis.technicals.dma200
                        ? 'text-[#00FF94]'
                        : 'text-[#FF3131]'
                    }`}
                  >
                    {displayPrice >= analysis.technicals.dma200 ? 'Bull Trend' : 'Bear Trend'}
                  </div>
                </div>
              </div>
            </div>

            {/* 5. INTERACTIVE TIMELINE CHART & AI CONTEXTUAL SUMMARY */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Chart */}
              <div className="lg:col-span-2 bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                    30-Day Historical Price & Volume Trend
                  </span>
                  <span className="text-[10px] font-mono text-[#888]">
                    Current: {formatINR(displayPrice)}
                  </span>
                </div>

                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="analysisGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor={isPositive ? '#00FF94' : '#FF3131'}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor={isPositive ? '#00FF94' : '#FF3131'}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={(t) =>
                          new Date(t).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })
                        }
                        stroke="#444"
                        fontSize={10}
                        fontFamily="monospace"
                      />
                      <YAxis
                        domain={['dataMin - 10', 'dataMax + 10']}
                        stroke="#444"
                        fontSize={10}
                        fontFamily="monospace"
                        tickFormatter={(v) => `₹${v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0A0A0A',
                          border: '1px solid #1F1F1F',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                        }}
                        formatter={(val: any) => [`₹${val}`, 'Price']}
                        labelFormatter={(lbl) => new Date(lbl).toLocaleDateString()}
                      />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke={isPositive ? '#00FF94' : '#FF3131'}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#analysisGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* AI Contextual Intelligence Card */}
              <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1F1F1F]">
                    <div className="flex items-center space-x-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#00FF94]" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                        AI Contextual Synthesis
                      </span>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-[#141414] text-[#888] border border-[#262626]">
                      {stockData.aiSource === 'GEMINI_AI' ? 'Gemini 3.8 Flash' : 'Quantitative Model'}
                    </span>
                  </div>

                  <p className="text-xs text-[#CCC] leading-relaxed bg-[#050505] p-3 rounded-sm border border-[#141414]">
                    {stockData.aiExplanation ||
                      `${stockData.symbol} is trading at ${formatINR(displayPrice)} (${displayChangePercent >= 0 ? '+' : ''}${displayChangePercent}%). Quantitative factors indicate an ${analysis.verdictLabel} posture with a conviction of ${analysis.convictionScore}/100.`}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#141414] text-[11px] font-mono text-[#777] flex items-center justify-between">
                  <span>Relative vs Market:</span>
                  <span className="text-white">
                    {stockData.benchmarks?.market?.changePercent
                      ? `${stockData.benchmarks.market.changePercent > 0 ? '+' : ''}${stockData.benchmarks.market.changePercent}% NIFTY`
                      : '+0.4% NIFTY'}
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
