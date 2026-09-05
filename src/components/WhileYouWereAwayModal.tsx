import React from 'react';
import {
  Clock,
  Flame,
  CheckCircle2,
  X,
  ArrowUpRight,
  ArrowDownRight,
  BrainCircuit,
  Eye,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext.tsx';

export const WhileYouWereAwayModal: React.FC = () => {
  const { awaySummary, showAwayModal, setShowAwayModal, markAwaySeen, setSelectedStockSymbol } = useMarket();

  if (!showAwayModal || !awaySummary) return null;

  const changes = awaySummary.changes || [];
  const highAttnCount = awaySummary.highAttentionCount || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm max-w-2xl w-full shadow-2xl overflow-hidden font-sans flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#1F1F1F] bg-[#050505] flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-[#FFB800]" />
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">While You Were Away</h2>
            </div>
            <p className="text-[11px] text-[#666] font-mono">
              You were away for <span className="text-[#FFB800] font-bold font-mono">{awaySummary.awayDurationFormatted}</span>
              {awaySummary.lastSeenTimestamp && (
                <span className="text-[#555] ml-1.5">
                  (since {new Date(awaySummary.lastSeenTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
                </span>
              )}. Here is what meaningfully shifted in your monitored universe.
            </p>
          </div>

          <button
            onClick={() => setShowAwayModal(false)}
            className="p-1 rounded-sm bg-[#0A0A0A] hover:bg-[#141414] border border-[#1F1F1F] text-[#888] hover:text-[#E0E0E0] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Pill Row */}
        <div className="grid grid-cols-2 gap-3 p-5 pb-2 font-mono text-xs">
          <div className="bg-[#050505] p-3 rounded-sm border border-[#1F1F1F]">
            <div className="text-[#555] text-[9px] uppercase tracking-wider">Meaningful Events</div>
            <div className="text-lg font-bold text-white mt-0.5">
              {awaySummary.meaningfulChangesCount}
            </div>
          </div>

          <div className="bg-[#050505] p-3 rounded-sm border border-[#1F1F1F]">
            <div className="text-[#555] text-[9px] uppercase tracking-wider">High Attention Signals</div>
            <div className="text-lg font-bold text-[#FF3131] mt-0.5 flex items-center space-x-1.5">
              <Flame className="w-4 h-4 fill-current" />
              <span>{highAttnCount}</span>
            </div>
          </div>
        </div>

        {/* Changes List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
          {changes.length === 0 ? (
            <div className="text-center py-8 text-[#555] text-xs font-mono">
              No significant anomalies exceeded mathematical thresholds during your absence.
            </div>
          ) : (
            changes.map((evt) => {
              const isPos = evt.changePercent >= 0;
              return (
                <div
                  key={evt.id}
                  onClick={() => {
                    setSelectedStockSymbol(evt.symbol);
                    setShowAwayModal(false);
                  }}
                  className="p-3 rounded-sm bg-[#050505] border border-[#141414] hover:border-[#2E2E2E] cursor-pointer transition flex items-start justify-between gap-4 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-[#E0E0E0] group-hover:text-[#00FF94] tracking-wider">
                        {evt.symbol}
                      </span>
                      <span className="text-[9px] font-mono text-[#555] uppercase">
                        {evt.sector || 'NSE'}
                      </span>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-sm ${
                          evt.score >= 81
                            ? 'bg-[#FF3131]/15 text-[#FF3131] border border-[#FF3131]/40'
                            : 'bg-[#FFB800]/15 text-[#FFB800] border border-[#FFB800]/40'
                        }`}
                      >
                        {evt.score}/100
                      </span>
                    </div>
                    <div className="text-xs text-[#888] line-clamp-2 font-sans">
                      {evt.aiExplanation || evt.summary}
                    </div>
                  </div>

                  <div className="text-right font-mono shrink-0">
                    <div className={`font-bold text-xs ${isPos ? 'text-[#00FF94]' : 'text-[#FF3131]'}`}>
                      {isPos ? '+' : ''}{evt.changePercent.toFixed(2)}%
                    </div>
                    <div className="text-[10px] text-[#555]">{evt.volumeMultiple}× Vol</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Action Footer: Mark All As Seen */}
        <div className="p-4 border-t border-[#1F1F1F] bg-[#050505] flex items-center justify-between">
          <span className="text-[11px] text-[#555] font-mono">
            Last seen: {new Date(awaySummary.lastSeenTimestamp).toLocaleTimeString()}
          </span>
          <button
            onClick={() => markAwaySeen()}
            className="px-4 py-1.5 rounded-sm bg-[#00FF94] hover:bg-[#00FF94]/90 text-[#050505] font-bold text-xs font-mono uppercase tracking-wider transition flex items-center space-x-1.5 shadow-[0_0_8px_rgba(0,255,148,0.2)]"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Mark All as Seen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
