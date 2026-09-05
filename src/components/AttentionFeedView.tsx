import React, { useState } from 'react';
import {
  Flame,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  BrainCircuit,
  Volume2,
  Clock,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext.tsx';
import { SignalClassification } from '../../shared/types/index.ts';

export const AttentionFeedView: React.FC = () => {
  const { attentionEvents, setSelectedStockSymbol } = useMarket();
  const [filter, setFilter] = useState<'ALL' | 'HIGH_ATTENTION' | 'IMPORTANT' | 'WORTH_WATCHING'>('ALL');

  const filteredEvents = attentionEvents.filter((e) => {
    if (filter === 'ALL') return true;
    if (filter === 'HIGH_ATTENTION') return e.classification === 'HIGH_ATTENTION';
    if (filter === 'IMPORTANT') return e.classification === 'IMPORTANT' || e.classification === 'HIGH_ATTENTION';
    if (filter === 'WORTH_WATCHING') return e.classification === 'WORTH_WATCHING';
    return true;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#050505] text-[#E0E0E0]">
      {/* Header & Filter Pills */}
      <div className="border-b border-[#1F1F1F] bg-[#0A0A0A]/40 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Flame className="w-4 h-4 text-[#FFB800]" />
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Deterministic Attention Feed</h2>
          </div>
          <p className="text-[11px] text-[#666] font-mono mt-0.5">
            Every alert passes strict multi-factor mathematical threshold scoring. No noise, no false alarms.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-1 bg-[#050505] p-0.5 rounded-sm border border-[#1F1F1F] text-xs font-mono">
          {(['ALL', 'HIGH_ATTENTION', 'IMPORTANT', 'WORTH_WATCHING'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-sm text-[10px] font-mono font-bold tracking-wider uppercase transition ${
                filter === f
                  ? 'bg-[#141414] text-[#00FF94] border border-[#00FF94]/40 shadow-[0_0_6px_rgba(0,255,148,0.15)]'
                  : 'text-[#666] hover:text-[#E0E0E0]'
              }`}
            >
              {f === 'ALL' ? 'All Signals' : f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Feed Stream */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredEvents.length === 0 ? (
          <div className="border border-dashed border-[#1F1F1F] rounded-sm p-12 text-center max-w-lg mx-auto my-12 bg-[#0A0A0A]">
            <Flame className="w-8 h-8 text-[#555] mx-auto mb-3" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#E0E0E0]">No Attention Signals Matching Filter</h3>
            <p className="text-[11px] text-[#666] mt-1 font-mono">
              Market movements are currently within baseline parameters. Use the Replay Toolbar above to simulate an anomaly if testing!
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-3">
            {filteredEvents.map((evt) => {
              const isPositive = evt.changePercent >= 0;
              return (
                <div
                  key={evt.id}
                  onClick={() => setSelectedStockSymbol(evt.symbol)}
                  className="bg-[#0A0A0A] hover:bg-[#0F0F0F] border border-[#1F1F1F] hover:border-[#2E2E2E] rounded-sm p-4 transition cursor-pointer group"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-sm text-[#E0E0E0] group-hover:text-[#00FF94] transition tracking-wider">
                          {evt.symbol}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-sm bg-[#050505] text-[#888] border border-[#1F1F1F] uppercase">
                          {evt.sector || 'NSE'}
                        </span>
                      </div>
                      <span className="text-xs text-[#888]">{evt.companyName}</span>
                    </div>

                    <div className="flex items-center space-x-3 font-mono">
                      {/* Price Change */}
                      <span
                        className={`inline-flex items-center space-x-0.5 text-xs font-bold font-mono px-1.5 py-0.5 rounded-sm ${
                          isPositive ? 'bg-[#00FF94]/10 text-[#00FF94] border border-[#00FF94]/30' : 'bg-[#FF3131]/10 text-[#FF3131] border border-[#FF3131]/30'
                        }`}
                      >
                        {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        <span>{isPositive ? '+' : ''}{evt.changePercent.toFixed(2)}%</span>
                      </span>

                      {/* Score Badge */}
                      <span
                        className={`inline-flex items-center space-x-1 text-xs font-bold font-mono px-2 py-0.5 rounded-sm ${
                          evt.score >= 81
                            ? 'bg-[#FF3131]/15 text-[#FF3131] border border-[#FF3131]/40 shadow-[0_0_6px_rgba(255,49,49,0.2)]'
                            : evt.score >= 61
                            ? 'bg-[#FFB800]/15 text-[#FFB800] border border-[#FFB800]/40'
                            : 'bg-[#141414] text-[#00FF94] border border-[#00FF94]/30'
                        }`}
                      >
                        {evt.score >= 81 && <Flame className="w-3 h-3 fill-current" />}
                        <span>{evt.score}/100</span>
                      </span>

                      {/* Timestamp */}
                      <span className="text-[11px] text-[#555] font-mono">
                        {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Reasons Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 my-2.5">
                    {evt.reasons.map((r) => (
                      <span
                        key={r}
                        className="px-2 py-0.5 rounded-sm text-[9px] font-mono bg-[#141414] text-[#888] border border-[#1F1F1F] uppercase tracking-wider"
                      >
                        {r.replace(/_/g, ' ')}
                      </span>
                    ))}
                    <span className="text-[10px] font-mono text-[#555] ml-1">
                      • {evt.volumeMultiple}× avg volume
                    </span>
                  </div>

                  {/* AI Contextual Explanation */}
                  <div className="bg-[#050505] border border-[#1F1F1F] rounded-sm p-3 text-xs text-[#CCCCCC] flex items-start space-x-2.5">
                    <BrainCircuit className="w-4 h-4 text-[#00FF94] shrink-0 mt-0.5" />
                    <div className="leading-relaxed flex-1">
                      {evt.aiExplanation || evt.summary}
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#555] group-hover:text-[#00FF94] shrink-0 mt-0.5 transition" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
