import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext.tsx';
import { api } from '../services/api.ts';
import { MarketOverviewData } from '../../shared/types/index.ts';

export const MarketOverviewView: React.FC = () => {
  const { marketOverview, indices, dataMode, dataStatus, providerName, setSelectedStockSymbol } = useMarket();
  const [overview, setOverview] = useState<MarketOverviewData | null>(marketOverview);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!overview) {
      setLoading(true);
      api.getMarketOverview()
        .then((res) => setOverview(res))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [overview]);

  const breadth = overview?.marketBreadth || { advances: 14, declines: 9, unchanged: 2, total: 25 };
  const advancesPct = Math.round((breadth.advances / Math.max(1, breadth.total)) * 100);
  const declinesPct = Math.round((breadth.declines / Math.max(1, breadth.total)) * 100);

  return (
    <div className="flex-1 overflow-y-auto bg-[#050505] text-[#E0E0E0] p-6 space-y-6 font-sans">
      {/* Top Banner: Market Status */}
      <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF94] shadow-[0_0_8px_#00FF94] animate-pulse" />
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">National Stock Exchange (NSE)</h2>
          </div>
          <p className="text-[11px] text-[#666] font-mono mt-0.5">
            Regular Trading Session • Mode: {dataMode === 'REPLAY' ? 'High-Fidelity Replay Simulation' : `Live Market Feed (${providerName})`}
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="bg-[#050505] px-3 py-1.5 rounded-sm border border-[#1F1F1F] flex items-center space-x-2">
            <span className="text-[#555] text-[10px] uppercase tracking-wider">Status:</span>
            <span className="text-[#00FF94] font-bold text-[11px]">{dataStatus}</span>
          </div>
          <div className="bg-[#050505] px-3 py-1.5 rounded-sm border border-[#1F1F1F] flex items-center space-x-2">
            <span className="text-[#555] text-[10px] uppercase tracking-wider">Currency:</span>
            <span className="text-[#E0E0E0] font-bold text-[11px]">INR (₹)</span>
          </div>
        </div>
      </div>

      {/* 1. Major Benchmark Indices */}
      <div>
        <h3 className="text-[10px] font-mono font-bold text-[#666] uppercase tracking-[0.3em] mb-3">
          Benchmark Indices
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { key: 'NIFTY50', name: 'NIFTY 50', fallbackPrice: 24350.2, fallbackChg: 0.38 },
            { key: 'SENSEX', name: 'BSE SENSEX', fallbackPrice: 79980.5, fallbackChg: 0.31 },
            { key: 'NIFTYBANK', name: 'BANK NIFTY', fallbackPrice: 51240.0, fallbackChg: 0.22 },
            { key: 'NIFTYIT', name: 'NIFTY IT', fallbackPrice: 38450.0, fallbackChg: 1.15 },
          ].map((item) => {
            const idx = indices[item.key] || { price: item.fallbackPrice, changePercent: item.fallbackChg, change: 80 };
            const isPos = (idx.changePercent ?? 0) >= 0;
            return (
              <div
                key={item.key}
                className="bg-[#0F0F0F] border border-[#1F1F1F] rounded-sm p-4 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[10px] uppercase tracking-widest text-[#666]">{item.name}</span>
                  <span className={`text-[11px] font-mono font-bold ${isPos ? 'text-[#00FF94]' : 'text-[#FF3131]'}`}>
                    {isPos ? '+' : ''}{idx.changePercent?.toFixed(2)}%
                  </span>
                </div>
                <div className="text-xl font-light font-mono text-white mt-2">
                  ₹{idx.price.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Market Breadth & Sector Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Breadth */}
        <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#E0E0E0] font-mono">
              Market Breadth (Advances vs Declines)
            </h3>
            <span className="text-[10px] font-mono text-[#555]">25 MONITORED</span>
          </div>

          <div className="space-y-4">
            {/* Visual ratio bar */}
            <div className="w-full bg-[#141414] h-2 rounded-none overflow-hidden flex">
              <div className="bg-[#00FF94] h-full transition-all duration-300 shadow-[0_0_8px_#00FF94]" style={{ width: `${advancesPct}%` }} />
              <div className="bg-[#FF3131] h-full transition-all duration-300" style={{ width: `${declinesPct}%` }} />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
              <div className="bg-[#050505] p-2.5 rounded-sm border border-[#1F1F1F]">
                <div className="text-[9px] text-[#00FF94] font-bold uppercase tracking-wider">Advances</div>
                <div className="text-base font-bold text-white mt-0.5">{breadth.advances}</div>
                <div className="text-[9px] text-[#555]">{advancesPct}%</div>
              </div>

              <div className="bg-[#050505] p-2.5 rounded-sm border border-[#1F1F1F]">
                <div className="text-[9px] text-[#FF3131] font-bold uppercase tracking-wider">Declines</div>
                <div className="text-base font-bold text-white mt-0.5">{breadth.declines}</div>
                <div className="text-[9px] text-[#555]">{declinesPct}%</div>
              </div>

              <div className="bg-[#050505] p-2.5 rounded-sm border border-[#1F1F1F]">
                <div className="text-[9px] text-[#666] font-bold uppercase tracking-wider">Unchanged</div>
                <div className="text-base font-bold text-white mt-0.5">{breadth.unchanged}</div>
                <div className="text-[9px] text-[#555]">8%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sector Performance */}
        <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#E0E0E0] mb-4 font-mono">
            Sector Divergence
          </h3>
          <div className="space-y-2">
            {(overview?.sectorPerformance || [
              { sector: 'Information Technology', changePercent: 1.8, leaders: ['INFY', 'TCS'], laggards: [] },
              { sector: 'Automobile', changePercent: 1.1, leaders: ['TATAMOTORS'], laggards: [] },
              { sector: 'Financial Services', changePercent: 0.4, leaders: ['HDFCBANK'], laggards: ['SBIN'] },
              { sector: 'Energy & Petrochemicals', changePercent: -0.3, leaders: [], laggards: ['RELIANCE'] },
              { sector: 'Pharmaceuticals', changePercent: -0.8, leaders: [], laggards: ['SUNPHARMA'] },
            ]).map((sec) => {
              const isPos = sec.changePercent >= 0;
              return (
                <div
                  key={sec.sector}
                  className="flex items-center justify-between p-2 rounded-sm bg-[#050505] border border-[#141414] text-xs font-mono"
                >
                  <span className="text-[#CCCCCC] font-sans">{sec.sector}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-[#555] font-sans hidden sm:inline">
                      {sec.leaders.slice(0, 2).join(', ')}
                    </span>
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded-sm text-[10px] font-mono ${
                        isPos ? 'bg-[#00FF94]/10 text-[#00FF94] border border-[#00FF94]/30' : 'bg-[#FF3131]/10 text-[#FF3131] border border-[#FF3131]/30'
                      }`}
                    >
                      {isPos ? '+' : ''}{sec.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Top Gainers & Top Losers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Gainers */}
        <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm p-5">
          <div className="flex items-center space-x-2 mb-3">
            <TrendingUp className="w-4 h-4 text-[#00FF94]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#E0E0E0] font-mono">
              Top Momentum Gainers
            </h3>
          </div>
          <div className="divide-y divide-[#141414] font-mono text-xs">
            {(overview?.topGainers || [
              { symbol: 'INFY', name: 'Infosys Ltd', price: 1616.0, changePercent: 4.8, volumeMultiple: 2.4 },
              { symbol: 'TATAMOTORS', name: 'Tata Motors', price: 982.5, changePercent: 2.9, volumeMultiple: 1.8 },
              { symbol: 'TCS', name: 'Tata Consultancy Services', price: 3510.0, changePercent: 2.1, volumeMultiple: 1.4 },
            ]).map((s) => (
              <div
                key={s.symbol}
                onClick={() => setSelectedStockSymbol(s.symbol)}
                className="py-2.5 flex items-center justify-between hover:bg-[#111111] cursor-pointer px-2 rounded-sm transition"
              >
                <div>
                  <div className="font-bold text-[#E0E0E0] tracking-wider">{s.symbol}</div>
                  <div className="text-[10px] font-sans text-[#666]">{s.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#00FF94]">+{s.changePercent.toFixed(2)}%</div>
                  <div className="text-[10px] text-[#555]">{s.volumeMultiple}× Vol</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Losers */}
        <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm p-5">
          <div className="flex items-center space-x-2 mb-3">
            <TrendingDown className="w-4 h-4 text-[#FF3131]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#E0E0E0] font-mono">
              Top Decliners
            </h3>
          </div>
          <div className="divide-y divide-[#141414] font-mono text-xs">
            {(overview?.topLosers || [
              { symbol: 'SUNPHARMA', name: 'Sun Pharma', price: 1680.0, changePercent: -2.3, volumeMultiple: 1.6 },
              { symbol: 'WIPRO', name: 'Wipro Limited', price: 512.0, changePercent: -1.7, volumeMultiple: 1.2 },
              { symbol: 'RELIANCE', name: 'Reliance Industries', price: 2950.0, changePercent: -0.9, volumeMultiple: 0.9 },
            ]).map((s) => (
              <div
                key={s.symbol}
                onClick={() => setSelectedStockSymbol(s.symbol)}
                className="py-2.5 flex items-center justify-between hover:bg-[#111111] cursor-pointer px-2 rounded-sm transition"
              >
                <div>
                  <div className="font-bold text-[#E0E0E0] tracking-wider">{s.symbol}</div>
                  <div className="text-[10px] font-sans text-[#666]">{s.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#FF3131]">{s.changePercent.toFixed(2)}%</div>
                  <div className="text-[10px] text-[#555]">{s.volumeMultiple}× Vol</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
