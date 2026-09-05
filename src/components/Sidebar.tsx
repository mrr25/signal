import React from 'react';
import {
  Layers,
  Flame,
  BarChart3,
  Settings,
  Plus,
  Radio,
  Wifi,
  WifiOff,
  Compass,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext.tsx';

export type TabType = 'watchlists' | 'attention' | 'overview' | 'analysis' | 'settings';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenNewWatchlistModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenNewWatchlistModal,
}) => {
  const { watchlists, activeWatchlistId, setActiveWatchlistId, attentionEvents, isWsConnected, dataStatus } = useMarket();

  const highAttentionCount = attentionEvents.filter((e) => e.classification === 'HIGH_ATTENTION').length;

  return (
    <aside className="w-64 border-r border-[#1F1F1F] bg-[#050505] flex flex-col justify-between select-none h-[calc(100vh-3.5rem)] text-[#E0E0E0]">
      {/* Top Section: Nav items */}
      <div className="p-3 space-y-6 overflow-y-auto">
        {/* Main Navigation */}
        <div className="space-y-1">
          <div className="px-2 pb-1.5 text-[9px] font-mono font-bold text-[#666] uppercase tracking-[0.3em]">
            Workspace
          </div>

          <button
            onClick={() => onSelectTab('watchlists')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-sm text-xs font-medium transition ${
              currentTab === 'watchlists'
                ? 'bg-[#141414] text-[#E0E0E0] border border-[#1F1F1F] font-semibold shadow-inner'
                : 'text-[#888] hover:text-[#E0E0E0] hover:bg-[#0F0F0F]'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Layers className="w-4 h-4 text-[#888]" />
              <span>Watchlists</span>
            </div>
            <span className="text-[10px] font-mono text-[#666] bg-[#0A0A0A] border border-[#1F1F1F] px-1.5 py-0.5 rounded-sm">
              {watchlists.length}
            </span>
          </button>

          <button
            onClick={() => onSelectTab('attention')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-sm text-xs font-medium transition ${
              currentTab === 'attention'
                ? 'bg-[#141414] text-[#E0E0E0] border border-[#1F1F1F] font-semibold shadow-inner'
                : 'text-[#888] hover:text-[#E0E0E0] hover:bg-[#0F0F0F]'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Flame className="w-4 h-4 text-[#FFB800]" />
              <span>Attention Feed</span>
            </div>
            {highAttentionCount > 0 && (
              <span className="text-[9px] font-mono font-bold text-white bg-[#FF3131] px-1.5 py-0.2 rounded-full shadow-[0_0_6px_#FF3131] animate-pulse">
                {highAttentionCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('analysis')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-sm text-xs font-medium transition ${
              currentTab === 'analysis'
                ? 'bg-[#141414] text-[#E0E0E0] border border-[#1F1F1F] font-semibold shadow-inner'
                : 'text-[#888] hover:text-[#E0E0E0] hover:bg-[#0F0F0F]'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Compass className="w-4 h-4 text-[#00FF94]" />
              <span>Stock Analysis</span>
            </div>
            <span className="text-[9px] font-mono font-bold text-[#00FF94] bg-[#00FF94]/10 border border-[#00FF94]/30 px-1.5 py-0.5 rounded-sm">
              NEW
            </span>
          </button>

          <button
            onClick={() => onSelectTab('overview')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-sm text-xs font-medium transition ${
              currentTab === 'overview'
                ? 'bg-[#141414] text-[#E0E0E0] border border-[#1F1F1F] font-semibold shadow-inner'
                : 'text-[#888] hover:text-[#E0E0E0] hover:bg-[#0F0F0F]'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span>Market Overview</span>
            </div>
            <span className="text-[10px] font-mono text-[#555]">NSE</span>
          </button>
        </div>

        {/* Watchlists List */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 pb-1.5">
            <span className="text-[9px] font-mono font-bold text-[#666] uppercase tracking-[0.3em]">
              My Watchlists
            </span>
            <button
              onClick={onOpenNewWatchlistModal}
              className="p-1 rounded-sm hover:bg-[#141414] text-[#666] hover:text-[#00FF94] transition"
              title="Create new watchlist"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            {watchlists.map((wl) => {
              const isActive = currentTab === 'watchlists' && activeWatchlistId === wl.id;
              return (
                <button
                  key={wl.id}
                  onClick={() => {
                    setActiveWatchlistId(wl.id);
                    onSelectTab('watchlists');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-sm text-xs transition flex items-center justify-between group ${
                    isActive
                      ? 'bg-[#141414] text-[#00FF94] font-semibold border-l-2 border-[#00FF94]'
                      : 'text-[#888] hover:text-[#E0E0E0] hover:bg-[#0F0F0F]'
                  }`}
                >
                  <span className="truncate pr-2">{wl.name}</span>
                  <span className="text-[10px] font-mono text-[#555] group-hover:text-[#888]">
                    {wl.stocks.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Section: Connection & Quick Settings */}
      <div className="p-3 border-t border-[#1F1F1F] space-y-2">
        <button
          onClick={() => onSelectTab('settings')}
          className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-sm text-xs transition ${
            currentTab === 'settings'
              ? 'bg-[#141414] text-[#E0E0E0] border border-[#1F1F1F] font-semibold'
              : 'text-[#888] hover:text-[#E0E0E0] hover:bg-[#0F0F0F]'
          }`}
        >
          <Settings className="w-4 h-4 text-[#666]" />
          <span>Settings</span>
        </button>

        {/* Live System State Footer */}
        <div className="px-3 py-2 bg-[#0A0A0A] rounded-sm border border-[#1F1F1F] flex items-center justify-between text-[11px] font-mono text-[#666]">
          <div className="flex items-center space-x-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isWsConnected ? 'bg-[#00FF94] shadow-[0_0_8px_#00FF94]' : 'bg-[#FF3131]'}`} />
            <span className={`text-[10px] ${isWsConnected ? 'text-[#00FF94]' : 'text-[#FF3131]'}`}>
              {isWsConnected ? 'ENGINE LIVE' : 'RECONNECTING'}
            </span>
          </div>
          <span className="text-[10px] text-[#444]">v4.2.0</span>
        </div>
      </div>
    </aside>
  );
};
