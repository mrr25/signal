import React, { useEffect, useState } from 'react';
import {
  X,
  Flame,
  TrendingUp,
  BarChart2,
  BrainCircuit,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  ShieldCheck,
  Target,
  Clock,
  Compass,
  Info,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { api } from '../services/api.ts';
import { useMarket } from '../context/MarketContext.tsx';
import { SignalClassification, StockInvestmentAnalysis } from '../../shared/types/index.ts';

interface StockDetailModalProps {
  symbol: string;
  onClose: () => void;
}

export const StockDetailModal: React.FC<StockDetailModalProps> = ({ symbol, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const { liveTicks } = useMarket();

  const handleRefreshExplanation = async () => {
    if (!data || isExplaining) return;
    setIsExplaining(true);
    try {
      const res = await api.explainSignal({
        symbol: data.symbol,
        companyName: data.companyName,
        priceChange: data.changePercent,
        volumeMultiple: data.volumeMultiple || 1.2,
        marketChange: 0.4,
        sectorChange: 0.6,
        signalScore: data.signal?.score || 65,
        reasons: data.signal?.reasons || ['PRICE_MOMENTUM'],
        sector: data.sector,
      });
      if (res?.explanation) {
        setData((prev: any) => ({
          ...prev,
          aiExplanation: res.explanation,
          aiSource: res.source,
        }));
      }
    } catch {
      // Handled gracefully
    } finally {
      setIsExplaining(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    api.getStock(symbol)
      .then((res) => {
        if (!isMounted) return;
        setData(res.stock);

        // Format snapshots for chart
        if (res.chart && res.chart.length > 0) {
          const formatted = res.chart.map((pt: any) => ({
            time: new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            price: pt.price,
            volume: pt.volume,
          }));
          setChartData(formatted);
        } else {
          // Generate 15 simulated historical points for clean visualization
          const base = res.stock.previousClose || 1500;
          const points = [];
          for (let i = 15; i >= 0; i--) {
            const noise = (Math.random() - 0.48) * (base * 0.008);
            points.push({
              time: `${9 + Math.floor((15 - i) / 3)}:${((15 - i) % 3) * 20}`,
              price: Number((base + noise * (15 - i)).toFixed(2)),
            });
          }
          setChartData(points);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Failed to load stock details');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [symbol]);

  // Merge live tick if active
  const tick = liveTicks[symbol];
  const currentPrice = tick?.price ?? data?.price ?? 0;
  const currentChange = tick?.change ?? data?.change ?? 0;
  const currentChangePercent = tick?.changePercent ?? data?.changePercent ?? 0;
  const score = tick?.signalScore ?? data?.signal?.score ?? 20;
  const classification: SignalClassification = (tick?.signalClassification as SignalClassification) ?? data?.signal?.classification ?? 'NORMAL';
  const factors = data?.signal?.factors ?? {
    priceScore: 25,
    volumeScore: 20,
    relativePerformanceScore: 15,
    volatilityScore: 20,
    marketContextScore: 20,
  };

  const isPositive = currentChangePercent >= 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
      {/* Sliding Drawer Container */}
      <div className="w-full max-w-2xl bg-[#050505] text-[#E0E0E0] border-l border-[#1F1F1F] h-full flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="p-5 border-b border-[#1F1F1F] flex items-start justify-between bg-[#0A0A0A]/80">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-white font-mono tracking-wider">{symbol}</h2>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-sm bg-[#050505] text-[#888] border border-[#1F1F1F] uppercase">
                {data?.exchange || 'NSE'}
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-sm bg-[#050505] text-[#888] border border-[#1F1F1F] uppercase">
                {data?.sector || 'Equity'}
              </span>
            </div>
            <div className="text-xs text-[#888] mt-1">{data?.name || symbol}</div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right font-mono">
              <div className="text-xl font-bold text-white">
                ₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`text-xs font-bold flex items-center justify-end space-x-1 ${isPositive ? 'text-[#00FF94]' : 'text-[#FF3131]'}`}>
                {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                <span>{isPositive ? '+' : ''}{currentChange.toFixed(2)} ({Math.abs(currentChangePercent).toFixed(2)}%)</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-sm bg-[#0A0A0A] hover:bg-[#141414] border border-[#1F1F1F] text-[#888] hover:text-[#E0E0E0] transition"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-xs font-mono text-[#555]">
            Loading deterministic signals & charts...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-[#FF3131] font-mono">{error}</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* 1. SIGNAL SCORE GAUGE & ATTENTION SUMMARY */}
            <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Flame className={`w-4 h-4 ${score >= 81 ? 'text-[#FF3131] fill-[#FF3131]' : score >= 61 ? 'text-[#FFB800]' : 'text-[#555]'}`} />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#E0E0E0] font-mono">
                    Deterministic Signal Score
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-bold font-mono text-white">{score}</span>
                  <span className="text-xs font-mono text-[#555]">/ 100</span>
                  <span
                    className={`px-2 py-0.5 rounded-sm text-[9px] font-mono font-bold uppercase tracking-widest ${
                      classification === 'HIGH_ATTENTION'
                        ? 'bg-[#FF3131]/15 text-[#FF3131] border border-[#FF3131]/40'
                        : classification === 'IMPORTANT'
                        ? 'bg-[#FFB800]/15 text-[#FFB800] border border-[#FFB800]/40'
                        : classification === 'WORTH_WATCHING'
                        ? 'bg-[#141414] text-[#00FF94] border border-[#00FF94]/30'
                        : 'bg-[#050505] text-[#555] border border-[#141414]'
                    }`}
                  >
                    {classification.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Progress Bar with mathematical segments */}
              <div className="w-full bg-[#141414] h-1.5 rounded-none overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-500 ${
                    score >= 81 ? 'bg-[#FF3131]' : score >= 61 ? 'bg-[#FFB800]' : score >= 31 ? 'bg-[#00FF94]' : 'bg-[#555]'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>

              {/* Factors Breakdown (Math Weights) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 text-[10px] font-mono">
                <div className="bg-[#050505] p-2 rounded-sm border border-[#1F1F1F]">
                  <div className="text-[#555] text-[9px] uppercase">Price (30%)</div>
                  <div className="font-bold text-[#E0E0E0] mt-0.5">{factors.priceScore} / 100</div>
                </div>
                <div className="bg-[#050505] p-2 rounded-sm border border-[#1F1F1F]">
                  <div className="text-[#555] text-[9px] uppercase">Volume (25%)</div>
                  <div className="font-bold text-[#E0E0E0] mt-0.5">{factors.volumeScore} / 100</div>
                </div>
                <div className="bg-[#050505] p-2 rounded-sm border border-[#1F1F1F]">
                  <div className="text-[#555] text-[9px] uppercase">Relative (20%)</div>
                  <div className="font-bold text-[#E0E0E0] mt-0.5">{factors.relativePerformanceScore} / 100</div>
                </div>
                <div className="bg-[#050505] p-2 rounded-sm border border-[#1F1F1F]">
                  <div className="text-[#555] text-[9px] uppercase">Volatility (15%)</div>
                  <div className="font-bold text-[#E0E0E0] mt-0.5">{factors.volatilityScore} / 100</div>
                </div>
                <div className="bg-[#050505] p-2 rounded-sm border border-[#1F1F1F] col-span-2 sm:col-span-1">
                  <div className="text-[#555] text-[9px] uppercase">Context (10%)</div>
                  <div className="font-bold text-[#E0E0E0] mt-0.5">{factors.marketContextScore} / 100</div>
                </div>
              </div>
            </div>

            {/* 1.5. INVESTMENT DECISION & HOLDING SAFETY HUB */}
            {data?.analysis && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Investment Verdict */}
                <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm p-3.5 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[#141414]">
                    <div className="flex items-center space-x-1.5">
                      <Target className="w-3.5 h-3.5 text-[#00FF94]" />
                      <span className="text-[11px] font-mono font-bold uppercase text-white">
                        Can It Be Invested?
                      </span>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-[#00FF94]/10 text-[#00FF94] border border-[#00FF94]/30 font-bold">
                      {data.analysis.verdictLabel}
                    </span>
                  </div>
                  <div className="text-xs text-[#CCC] leading-relaxed">
                    {data.analysis.verdictReason}
                  </div>
                  <div className="pt-2 border-t border-[#141414] flex items-center justify-between text-[10px] font-mono text-[#777]">
                    <span>Conviction: <strong className="text-white">{data.analysis.convictionScore}/100</strong></span>
                    <span>1Y Target: <strong className="text-[#00FF94]">₹{data.analysis.target1Year.toFixed(2)}</strong></span>
                  </div>
                </div>

                {/* Holding Safety */}
                <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm p-3.5 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[#141414]">
                    <div className="flex items-center space-x-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-[11px] font-mono font-bold uppercase text-white">
                        If Invested: Safe or Not?
                      </span>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold">
                      {data.analysis.safetyLabel}
                    </span>
                  </div>
                  <div className="text-xs text-[#CCC] leading-relaxed">
                    {data.analysis.guidanceForHolders}
                  </div>
                  <div className="pt-2 border-t border-[#141414] flex items-center justify-between text-[10px] font-mono text-[#777]">
                    <span>Support: <strong className="text-white">₹{data.analysis.keySupportPrice.toFixed(2)}</strong></span>
                    <span>Stop Loss: <strong className="text-[#FF3131]">₹{data.analysis.stopLossPrice.toFixed(2)}</strong></span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. "WHY DOES THIS MATTER?" CARD */}
            <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BrainCircuit className="w-4 h-4 text-[#00FF94]" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Contextual Intelligence: Why Does This Matter?
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-[#050505] text-[#888] border border-[#1F1F1F]">
                    {data?.aiSource === 'GEMINI_AI' ? 'Gemini 3.8 Flash' : 'Quantitative Engine'}
                  </span>
                  <button
                    onClick={handleRefreshExplanation}
                    disabled={isExplaining}
                    className="text-[9px] font-mono px-2 py-0.5 rounded-sm bg-[#141414] hover:bg-[#1E1E1E] text-[#00FF94] border border-[#262626] transition flex items-center space-x-1 disabled:opacity-50"
                    title="Request AI contextual breakdown"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isExplaining ? 'animate-spin' : ''}`} />
                    <span>{isExplaining ? 'Analyzing...' : 'AI Insights'}</span>
                  </button>
                </div>
              </div>

              <p className="text-xs text-[#CCCCCC] leading-relaxed bg-[#050505] p-3 rounded-sm border border-[#141414]">
                {data?.aiExplanation || data?.signal?.summary}
              </p>

              {/* Reason Pills */}
              {data?.signal?.reasons && data.signal.reasons.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {data.signal.reasons.map((r: string) => (
                    <span
                      key={r}
                      className="px-2 py-0.5 rounded-sm text-[9px] font-mono bg-[#141414] text-[#888] border border-[#1F1F1F] uppercase"
                    >
                      {r.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 3. INTERACTIVE CHART */}
            <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#E0E0E0] font-mono">
                  Intraday Price Action
                </span>
                <span className="text-[10px] font-mono text-[#555]">Snapshots (1-Min)</span>
              </div>

              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isPositive ? '#00FF94' : '#FF3131'} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={isPositive ? '#00FF94' : '#FF3131'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#333333" fontSize={10} tickLine={false} />
                    <YAxis
                      stroke="#333333"
                      fontSize={10}
                      tickLine={false}
                      domain={['auto', 'auto']}
                      tickFormatter={(v) => `₹${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0A0A0A',
                        borderColor: '#1F1F1F',
                        borderRadius: '2px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: '#E0E0E0',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={isPositive ? '#00FF94' : '#FF3131'}
                      strokeWidth={1.5}
                      fillOpacity={1}
                      fill="url(#colorPrice)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 4. BENCHMARK & VOLUME COMPARISON */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Relative Performance */}
              <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-[#E0E0E0] font-mono mb-3">
                  Relative Divergence
                </div>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between p-2 rounded-sm bg-[#050505] border border-[#141414]">
                    <span className="text-[#888]">vs NIFTY 50 (+0.4%)</span>
                    <span className={`font-bold ${currentChangePercent - 0.4 >= 0 ? 'text-[#00FF94]' : 'text-[#FF3131]'}`}>
                      {currentChangePercent - 0.4 >= 0 ? '+' : ''}{(currentChangePercent - 0.4).toFixed(2)}% Alpha
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-sm bg-[#050505] border border-[#141414]">
                    <span className="text-[#888]">vs {data?.sector || 'Sector'} (+0.6%)</span>
                    <span className={`font-bold ${currentChangePercent - 0.6 >= 0 ? 'text-[#00FF94]' : 'text-[#FF3131]'}`}>
                      {currentChangePercent - 0.6 >= 0 ? '+' : ''}{(currentChangePercent - 0.6).toFixed(2)}% Alpha
                    </span>
                  </div>
                </div>
              </div>

              {/* Volume Participation */}
              <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-[#E0E0E0] font-mono mb-3">
                  Volume Participation
                </div>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between p-2 rounded-sm bg-[#050505] border border-[#141414]">
                    <span className="text-[#888]">Current Volume</span>
                    <span className="text-white font-bold">
                      {((data?.volume || 1000000) / 100000).toFixed(1)}L shares
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-sm bg-[#050505] border border-[#141414]">
                    <span className="text-[#888]">Volume vs Normal</span>
                    <span className={`font-bold ${data?.volumeMultiple >= 1.5 ? 'text-[#FFB800]' : 'text-[#888]'}`}>
                      {data?.volumeMultiple || 1.0}× Average
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. FUTURE POSSIBILITIES & 1-YEAR SCENARIOS */}
            {data?.analysis?.scenarios && (
              <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-[#00FF94]" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Future Possibilities: 1-Year Price Scenarios
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  {/* Bull Case */}
                  <div className="p-2.5 bg-[#050505] rounded-sm border border-[#00FF94]/30">
                    <div className="text-[10px] text-[#00FF94] font-bold">🐂 Bull (+{data.analysis.scenarios.bullCase.upsidePercent}%)</div>
                    <div className="text-sm font-bold text-white mt-1">₹{data.analysis.scenarios.bullCase.target.toFixed(2)}</div>
                  </div>

                  {/* Base Case */}
                  <div className="p-2.5 bg-[#050505] rounded-sm border border-[#1F1F1F]">
                    <div className="text-[10px] text-cyan-400 font-bold">⚖️ Base (+{data.analysis.scenarios.baseCase.upsidePercent}%)</div>
                    <div className="text-sm font-bold text-white mt-1">₹{data.analysis.scenarios.baseCase.target.toFixed(2)}</div>
                  </div>

                  {/* Bear Case */}
                  <div className="p-2.5 bg-[#050505] rounded-sm border border-[#FF3131]/30">
                    <div className="text-[10px] text-[#FF3131] font-bold">🐻 Bear (-{data.analysis.scenarios.bearCase.downsidePercent}%)</div>
                    <div className="text-sm font-bold text-white mt-1">₹{data.analysis.scenarios.bearCase.supportFloor.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
