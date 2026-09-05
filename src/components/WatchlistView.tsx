import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Star,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Search,
  MoreVertical,
  Activity,
  Layers,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext.tsx';
import { SignalClassification } from '../../shared/types/index.ts';

interface WatchlistViewProps {
  onOpenAddStock: () => void;
  onOpenNewWatchlist: () => void;
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({
  onOpenAddStock,
  onOpenNewWatchlist,
}) => {
  const {
    watchlists,
    activeWatchlistId,
    activeWatchlist,
    setActiveWatchlistId,
    updateWatchlist,
    deleteWatchlist,
    removeStockFromActiveWatchlist,
    liveTicks,
    setSelectedStockSymbol,
  } = useMarket();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [showOptions, setShowOptions] = useState(false);

  const startRename = () => {
    if (activeWatchlist) {
      setTitleInput(activeWatchlist.name);
      setIsEditingTitle(true);
      setShowOptions(false);
    }
  };

  const saveRename = async () => {
    if (activeWatchlist && titleInput.trim()) {
      await updateWatchlist(activeWatchlist.id, { name: titleInput.trim() });
      setIsEditingTitle(false);
    }
  };

  const toggleDefault = async () => {
    if (activeWatchlist) {
      await updateWatchlist(activeWatchlist.id, { isDefault: !activeWatchlist.isDefault });
      setShowOptions(false);
    }
  };

  const handleDelete = async () => {
    if (activeWatchlist && watchlists.length > 1) {
      if (confirm(`Are you sure you want to delete "${activeWatchlist.name}"?`)) {
        await deleteWatchlist(activeWatchlist.id);
        setShowOptions(false);
      }
    }
  };

  const getScoreBadge = (score: number, classification?: SignalClassification) => {
    if (score >= 81 || classification === 'HIGH_ATTENTION') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold bg-[#FF3131]/15 text-[#FF3131] border border-[#FF3131]/40 shadow-[0_0_6px_rgba(255,49,49,0.2)]">
          <Flame className="w-3 h-3 text-[#FF3131] fill-[#FF3131]" />
          <span>{score}</span>
          <span className="text-[8px] uppercase tracking-widest pl-0.5">HIGH ATTN</span>
        </span>
      );
    }
    if (score >= 61 || classification === 'IMPORTANT') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold bg-[#FFB800]/15 text-[#FFB800] border border-[#FFB800]/40">
          <span>{score}</span>
          <span className="text-[8px] uppercase tracking-widest pl-0.5">IMPORTANT</span>
        </span>
      );
    }
    if (score >= 31 || classification === 'WORTH_WATCHING') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-sm text-[10px] font-mono font-medium bg-[#141414] text-[#00FF94] border border-[#00FF94]/30">
          <span>{score}</span>
          <span className="text-[8px] uppercase tracking-widest pl-0.5">WATCHING</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-sm text-[10px] font-mono text-[#555] bg-[#0A0A0A] border border-[#141414]">
        <span>{score}</span>
        <span className="text-[8px] uppercase tracking-widest pl-0.5">NORMAL</span>
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#050505] text-[#E0E0E0]">
      {/* Top Bar: Watchlist Tabs & Controls */}
      <div className="border-b border-[#1F1F1F] bg-[#0A0A0A]/40 px-6 pt-4 pb-2 flex flex-wrap items-center justify-between gap-4">
        {/* Watchlist Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-2xl">
          {watchlists.map((wl) => {
            const isActive = wl.id === activeWatchlistId;
            return (
              <button
                key={wl.id}
                onClick={() => setActiveWatchlistId(wl.id)}
                className={`px-3 py-1.5 rounded-sm text-xs font-mono tracking-wider uppercase whitespace-nowrap transition flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-[#141414] text-white border border-[#1F1F1F] font-semibold'
                    : 'text-[#888] hover:text-[#E0E0E0] hover:bg-[#0F0F0F]'
                }`}
              >
                {wl.isDefault && <Star className="w-3 h-3 text-[#FFB800] fill-[#FFB800]" />}
                <span>{wl.name}</span>
                <span className="text-[10px] font-mono text-[#555] ml-1">({wl.stocks.length})</span>
              </button>
            );
          })}

          <button
            onClick={onOpenNewWatchlist}
            className="px-2.5 py-1.5 rounded-sm text-xs text-[#666] hover:text-[#00FF94] hover:bg-[#0F0F0F] border border-dashed border-[#1F1F1F] hover:border-[#00FF94]/40 flex items-center space-x-1 transition font-mono"
            title="Create new watchlist"
          >
            <Plus className="w-3 h-3" />
            <span>New</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenAddStock}
            className="px-3 py-1.5 rounded-sm bg-[#00FF94] hover:bg-[#00FF94]/90 text-[#050505] text-xs font-bold font-mono uppercase tracking-wider transition flex items-center space-x-1.5 shadow-[0_0_8px_rgba(0,255,148,0.2)]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Stock</span>
          </button>

          {/* More options menu */}
          <div className="relative">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="p-1.5 rounded-sm bg-[#0A0A0A] hover:bg-[#111111] border border-[#1F1F1F] hover:border-[#2E2E2E] text-[#888] hover:text-[#E0E0E0] transition"
              title="Watchlist options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showOptions && (
              <div className="absolute right-0 mt-2 w-48 bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm shadow-2xl z-40 py-1 font-mono text-xs">
                <button
                  onClick={startRename}
                  className="w-full px-3 py-2 text-left text-[#888] hover:text-[#E0E0E0] hover:bg-[#141414] flex items-center space-x-2"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#666]" />
                  <span>Rename Watchlist</span>
                </button>
                <button
                  onClick={toggleDefault}
                  className="w-full px-3 py-2 text-left text-[#888] hover:text-[#E0E0E0] hover:bg-[#141414] flex items-center space-x-2"
                >
                  <Star className="w-3.5 h-3.5 text-[#FFB800]" />
                  <span>{activeWatchlist?.isDefault ? 'Unset Default' : 'Set as Default'}</span>
                </button>
                {watchlists.length > 1 && (
                  <button
                    onClick={handleDelete}
                    className="w-full px-3 py-2 text-left text-[#FF3131] hover:bg-[#141414] flex items-center space-x-2 border-t border-[#1F1F1F]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Watchlist</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Watchlist Header Info */}
      <div className="px-6 py-2.5 border-b border-[#141414] flex items-center justify-between bg-[#050505]">
        <div className="flex items-center space-x-3">
          {isEditingTitle ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveRename()}
                className="bg-[#0A0A0A] border border-[#1F1F1F] text-[#E0E0E0] text-xs font-mono font-bold px-2.5 py-1 rounded-sm outline-none"
                autoFocus
              />
              <button
                onClick={saveRename}
                className="px-2.5 py-1 rounded-sm bg-[#00FF94] text-[#050505] font-bold text-xs font-mono"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditingTitle(false)}
                className="px-2.5 py-1 rounded-sm bg-[#141414] text-[#888] text-xs font-mono"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-white font-mono tracking-wide uppercase">{activeWatchlist?.name}</h2>
              {activeWatchlist?.isDefault && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-sm bg-[#0F0F0F] text-[#00FF94] border border-[#00FF94]/40 uppercase tracking-widest">
                  DEFAULT
                </span>
              )}
            </div>
          )}
        </div>

        <span className="text-[11px] font-mono text-[#555] tracking-tight">
          {activeWatchlist?.stocks.length || 0} INSTRUMENTS MONITORED
        </span>
      </div>

      {/* Table Section */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {!activeWatchlist || activeWatchlist.stocks.length === 0 ? (
          <div className="border border-dashed border-[#1F1F1F] rounded-sm p-12 text-center max-w-lg mx-auto my-12 bg-[#0A0A0A]">
            <Layers className="w-8 h-8 text-[#555] mx-auto mb-3" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#E0E0E0]">Watchlist is Empty</h3>
            <p className="text-[11px] text-[#666] mt-1 mb-4 font-mono">
              Add key market instruments to enable deterministic signal detection and real-time alerts.
            </p>
            <button
              onClick={onOpenAddStock}
              className="px-3.5 py-1.5 rounded-sm bg-[#00FF94] hover:bg-[#00FF94]/90 text-[#050505] text-xs font-mono font-bold uppercase tracking-wider transition shadow"
            >
              Add First Stock
            </button>
          </div>
        ) : (
          <div className="border border-[#1F1F1F] rounded-sm overflow-hidden bg-[#0A0A0A]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1F1F1F] bg-[#0F0F0F] text-[10px] font-mono text-[#555] uppercase tracking-widest">
                  <th className="py-2.5 px-4 font-semibold">Instrument</th>
                  <th className="py-2.5 px-4 font-semibold text-right">LTP (₹)</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Change</th>
                  <th className="py-2.5 px-4 font-semibold text-right">% Chg</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Signal Score</th>
                  <th className="py-2.5 px-4 font-semibold">Volume Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414] font-mono">
                {activeWatchlist.stocks.map((item: any) => {
                  const tick = liveTicks[item.symbol];
                  const price = tick?.price ?? item.price;
                  const change = tick?.change ?? item.change;
                  const changePercent = tick?.changePercent ?? item.changePercent;
                  const score = tick?.signalScore ?? item.signalScore ?? 15;
                  const classification = (tick?.signalClassification as SignalClassification) ?? item.signalClassification ?? 'NORMAL';
                  const isPositive = changePercent >= 0;

                  // Real-time flash animation classes
                  const flashClass = tick?.flash === 'up'
                    ? 'bg-[#00FF94]/15 transition duration-300'
                    : tick?.flash === 'down'
                    ? 'bg-[#FF3131]/15 transition duration-300'
                    : 'hover:bg-[#111111] transition duration-150';

                  return (
                    <tr
                      key={item.symbol}
                      onClick={() => setSelectedStockSymbol(item.symbol)}
                      className={`cursor-pointer group ${flashClass}`}
                    >
                      {/* Instrument */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="font-bold text-[#E0E0E0] group-hover:text-[#00FF94] transition tracking-wider">
                            {item.symbol}
                          </div>
                          <span className="text-[9px] text-[#666] bg-[#050505] border border-[#1F1F1F] px-1 py-0.2 rounded-sm font-mono uppercase">
                            {item.exchange || 'NSE'}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#666] truncate max-w-[200px]">
                          {item.name}
                        </div>
                      </td>

                      {/* LTP */}
                      <td className="py-2.5 px-4 text-right font-semibold text-[#E0E0E0] text-sm font-mono">
                        ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Change */}
                      <td className={`py-2.5 px-4 text-right font-mono font-medium ${isPositive ? 'text-[#00FF94]' : 'text-[#FF3131]'}`}>
                        {isPositive ? '+' : ''}{change.toFixed(2)}
                      </td>

                      {/* % Change */}
                      <td className="py-2.5 px-4 text-right">
                        <span
                          className={`inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded-sm font-bold text-xs font-mono ${
                            isPositive
                              ? 'bg-[#00FF94]/10 text-[#00FF94] border border-[#00FF94]/30'
                              : 'bg-[#FF3131]/10 text-[#FF3131] border border-[#FF3131]/30'
                          }`}
                        >
                          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          <span>{Math.abs(changePercent).toFixed(2)}%</span>
                        </span>
                      </td>

                      {/* Signal Score */}
                      <td className="py-2.5 px-4 text-center">
                        {getScoreBadge(score, classification)}
                      </td>

                      {/* Volume Status */}
                      <td className="py-2.5 px-4 text-[#888] text-xs font-mono">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[#E0E0E0] font-mono">
                            {((tick?.volume || item.volume || 1000000) / 100000).toFixed(1)}L
                          </span>
                          <span className="text-[10px] text-[#555] font-mono">shares</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => setSelectedStockSymbol(item.symbol)}
                            className="p-1 rounded-sm hover:bg-[#141414] text-[#666] hover:text-[#E0E0E0] transition"
                            title="Inspect deterministic signal and chart"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeStockFromActiveWatchlist(item.symbol)}
                            className="p-1 rounded-sm hover:bg-[#141414] text-[#555] hover:text-[#FF3131] transition"
                            title="Remove from watchlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
