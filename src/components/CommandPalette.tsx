import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight, Layers, Flame, BarChart3, Settings, Compass, Clock } from 'lucide-react';
import { useMarket } from '../context/MarketContext.tsx';
import { INSTRUMENTS } from '../../shared/constants/instruments.ts';
import { TabType } from './Sidebar.tsx';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: TabType) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onSelectTab }) => {
  const [query, setQuery] = useState('');
  const { watchlists, setActiveWatchlistId, setSelectedStockSymbol, triggerAwayBriefing } = useMarket();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredInstruments = query
    ? INSTRUMENTS.filter(
        (i) =>
          i.symbol.toLowerCase().includes(query.toLowerCase()) ||
          i.name.toLowerCase().includes(query.toLowerCase()) ||
          i.sector.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 6)
    : INSTRUMENTS.slice(0, 5);

  const filteredWatchlists = query
    ? watchlists.filter((w) => w.name.toLowerCase().includes(query.toLowerCase()))
    : watchlists;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-start justify-center pt-24 p-4">
      <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm max-w-xl w-full shadow-2xl overflow-hidden font-sans">
        {/* Search Input */}
        <div className="p-3.5 border-b border-[#1F1F1F] flex items-center space-x-3 bg-[#050505]">
          <Search className="w-4 h-4 text-[#888]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type symbol, company, watchlist, or action..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-[#E0E0E0] placeholder-[#555] text-xs font-mono outline-none"
          />
          <button
            onClick={onClose}
            className="text-[#666] hover:text-[#E0E0E0] p-1 rounded-sm transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="p-3 max-h-96 overflow-y-auto space-y-4 text-xs font-mono">
          {/* Instruments */}
          <div>
            <div className="text-[9px] font-bold text-[#555] uppercase tracking-wider px-2 mb-1.5 font-mono">
              Stocks & Instruments
            </div>
            <div className="space-y-1">
              {filteredInstruments.map((inst) => (
                <div
                  key={inst.symbol}
                  onClick={() => {
                    setSelectedStockSymbol(inst.symbol);
                    onClose();
                  }}
                  className="px-3 py-2 rounded-sm hover:bg-[#141414] border border-transparent hover:border-[#1F1F1F] flex items-center justify-between cursor-pointer group transition"
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="font-bold text-white group-hover:text-[#00FF94] tracking-wider font-mono">
                      {inst.symbol}
                    </span>
                    <span className="text-[#888] font-sans truncate max-w-[200px]">
                      {inst.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-[#555]">
                    <span className="text-[10px]">{inst.sector}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#00FF94] opacity-0 group-hover:opacity-100 transition" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Watchlists */}
          <div>
            <div className="text-[9px] font-bold text-[#555] uppercase tracking-wider px-2 mb-1.5 font-mono">
              Watchlists
            </div>
            <div className="space-y-1">
              {filteredWatchlists.map((wl) => (
                <div
                  key={wl.id}
                  onClick={() => {
                    setActiveWatchlistId(wl.id);
                    onSelectTab('watchlists');
                    onClose();
                  }}
                  className="px-3 py-2 rounded-sm hover:bg-[#141414] border border-transparent hover:border-[#1F1F1F] flex items-center justify-between cursor-pointer group transition"
                >
                  <div className="flex items-center space-x-2">
                    <Layers className="w-3.5 h-3.5 text-[#888]" />
                    <span className="font-sans text-[#E0E0E0]">{wl.name}</span>
                  </div>
                  <span className="text-[10px] text-[#555] font-mono">{wl.stocks.length} stocks</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Nav Actions */}
          <div>
            <div className="text-[9px] font-bold text-[#555] uppercase tracking-wider px-2 mb-1.5 font-mono">
              Navigation
            </div>
            <div className="space-y-1">
              <div
                onClick={() => {
                  onSelectTab('analysis');
                  onClose();
                }}
                className="px-3 py-2 rounded-sm hover:bg-[#141414] border border-transparent hover:border-[#1F1F1F] flex items-center space-x-2 cursor-pointer transition text-[#CCCCCC]"
              >
                <Compass className="w-3.5 h-3.5 text-[#00FF94]" />
                <span className="font-sans">Stock Intelligence & Analysis Hub</span>
                <span className="text-[9px] font-mono text-[#00FF94] bg-[#00FF94]/10 border border-[#00FF94]/30 px-1 py-0.2 rounded-sm ml-auto">
                  NEW
                </span>
              </div>
              <div
                onClick={() => {
                  onSelectTab('attention');
                  onClose();
                }}
                className="px-3 py-2 rounded-sm hover:bg-[#141414] border border-transparent hover:border-[#1F1F1F] flex items-center space-x-2 cursor-pointer transition text-[#CCCCCC]"
              >
                <Flame className="w-3.5 h-3.5 text-[#00FF94]" />
                <span className="font-sans">Attention Feed</span>
              </div>
              <div
                onClick={() => {
                  triggerAwayBriefing();
                  onClose();
                }}
                className="px-3 py-2 rounded-sm hover:bg-[#141414] border border-transparent hover:border-[#1F1F1F] flex items-center space-x-2 cursor-pointer transition text-[#CCCCCC]"
              >
                <Clock className="w-3.5 h-3.5 text-[#FFB800]" />
                <span className="font-sans">While You Were Away Briefing</span>
                <span className="text-[9px] font-mono text-[#FFB800] bg-[#FFB800]/10 border border-[#FFB800]/30 px-1 py-0.2 rounded-sm ml-auto">
                  CATCH-UP
                </span>
              </div>
              <div
                onClick={() => {
                  onSelectTab('overview');
                  onClose();
                }}
                className="px-3 py-2 rounded-sm hover:bg-[#141414] border border-transparent hover:border-[#1F1F1F] flex items-center space-x-2 cursor-pointer transition text-[#CCCCCC]"
              >
                <BarChart3 className="w-3.5 h-3.5 text-[#00FF94]" />
                <span className="font-sans">Market Overview & Breadth</span>
              </div>
              <div
                onClick={() => {
                  onSelectTab('settings');
                  onClose();
                }}
                className="px-3 py-2 rounded-sm hover:bg-[#141414] border border-transparent hover:border-[#1F1F1F] flex items-center space-x-2 cursor-pointer transition text-[#CCCCCC]"
              >
                <Settings className="w-3.5 h-3.5 text-[#888]" />
                <span className="font-sans">Settings & Preferences</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#1F1F1F] bg-[#050505] text-[10px] font-mono text-[#555] flex items-center justify-between">
          <span>Navigate with mouse or arrows</span>
          <span>ESC to exit</span>
        </div>
      </div>
    </div>
  );
};
