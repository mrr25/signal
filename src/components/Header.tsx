import React, { useState } from 'react';
import {
  Activity,
  Bell,
  Search,
  Sliders,
  Play,
  Pause,
  Zap,
  CheckCircle2,
  Clock,
  ChevronDown,
  User,
  LogOut,
  Settings,
  Flame,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onToggleReplayBar: () => void;
  isReplayBarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenSettings,
  onOpenAuth,
  onToggleReplayBar,
  isReplayBarOpen,
}) => {
  const {
    indices,
    dataStatus,
    dataMode,
    unreadNotificationsCount,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    setSelectedStockSymbol,
    triggerAwayBriefing,
    awaySummary,
  } = useMarket();
  const { user, isAuthenticated, logout } = useAuth();
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Benchmarks
  const nifty = indices['NIFTY50'] || { price: 24350.2, changePercent: 0.38 };
  const sensex = indices['SENSEX'] || { price: 79980.5, changePercent: 0.31 };
  const niftyBank = indices['NIFTYBANK'] || { price: 51240.0, changePercent: 0.22 };

  return (
    <header className="h-14 border-b border-[#1F1F1F] bg-[#050505] px-4 flex items-center justify-between sticky top-0 z-30 select-none text-[#E0E0E0]">
      {/* Left: Brand + Indices Ticker */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-sm bg-[#0A0A0A] border border-[#1F1F1F] flex items-center justify-center shadow-[0_0_10px_rgba(0,255,148,0.15)]">
            <Activity className="w-4 h-4 text-[#00FF94]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm tracking-[0.2em] uppercase text-white font-mono">SIGNAL</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-sm bg-[#0F0F0F] text-[#888] border border-[#1F1F1F] uppercase tracking-widest">
                NSE
              </span>
            </div>
          </div>
        </div>

        {/* Live Index Ticker */}
        <div className="hidden lg:flex items-center space-x-5 text-xs font-mono pl-4 border-l border-[#1F1F1F]">
          <div className="flex items-center space-x-1.5">
            <span className="text-[#666] text-[10px] uppercase tracking-wider font-medium">NIFTY 50</span>
            <span className="text-[#E0E0E0] font-semibold">{nifty.price.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
            <span className={`text-[11px] font-mono ${nifty.changePercent >= 0 ? 'text-[#00FF94]' : 'text-[#FF3131]'}`}>
              {nifty.changePercent >= 0 ? '+' : ''}{nifty.changePercent.toFixed(2)}%
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-[#666] text-[10px] uppercase tracking-wider font-medium">SENSEX</span>
            <span className="text-[#E0E0E0] font-semibold">{sensex.price.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
            <span className={`text-[11px] font-mono ${sensex.changePercent >= 0 ? 'text-[#00FF94]' : 'text-[#FF3131]'}`}>
              {sensex.changePercent >= 0 ? '+' : ''}{sensex.changePercent.toFixed(2)}%
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-[#666] text-[10px] uppercase tracking-wider font-medium">BANK NIFTY</span>
            <span className="text-[#E0E0E0] font-semibold">{niftyBank.price.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
            <span className={`text-[11px] font-mono ${niftyBank.changePercent >= 0 ? 'text-[#00FF94]' : 'text-[#FF3131]'}`}>
              {niftyBank.changePercent >= 0 ? '+' : ''}{niftyBank.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        {/* Market Data Mode & Status Badge */}
        <button
          onClick={onToggleReplayBar}
          className={`flex items-center space-x-2 text-xs font-mono px-2.5 py-1 rounded-sm border transition-all ${
            dataMode === 'REPLAY'
              ? 'bg-[#0F0F0F] border-[#FFB800]/40 text-[#FFB800] hover:border-[#FFB800]'
              : 'bg-[#0F0F0F] border-[#1F1F1F] text-[#00FF94] hover:border-[#00FF94]/50'
          }`}
          title="Click to toggle Market Replay controls"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${dataStatus === 'LIVE' ? 'bg-[#00FF94] shadow-[0_0_8px_#00FF94] animate-pulse' : 'bg-[#FFB800]'}`} />
          <span className="font-semibold tracking-wider text-[11px]">{dataMode === 'REPLAY' ? 'REPLAY MODE' : 'LIVE ENGINE'}</span>
          <span className="text-[10px] text-[#555]">
            {isReplayBarOpen ? '▲' : '▼'}
          </span>
        </button>

        {/* Global Search Shortcut Button (Cmd+K) */}
        <button
          onClick={onOpenSearch}
          className="flex items-center space-x-2 bg-[#0A0A0A] hover:bg-[#111111] border border-[#1F1F1F] hover:border-[#2E2E2E] text-[#888] hover:text-[#E0E0E0] px-3 py-1.5 rounded-sm text-xs transition font-mono"
          title="Search symbols, indices, watchlists (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-[#666]" />
          <span className="hidden sm:inline font-sans text-xs">Search instruments...</span>
          <kbd className="hidden sm:inline-block bg-[#141414] text-[#888] text-[10px] px-1.5 py-0.5 rounded-sm border border-[#1F1F1F] font-mono">
            ⌘K
          </kbd>
        </button>

        {/* While You Were Away Briefing Quick Trigger */}
        <button
          onClick={() => triggerAwayBriefing()}
          className="p-2 rounded-sm bg-[#0A0A0A] hover:bg-[#111111] text-[#888] hover:text-[#FFB800] border border-[#1F1F1F] hover:border-[#FFB800]/40 transition flex items-center space-x-1.5"
          title="Open While You Were Away Briefing"
        >
          <Clock className="w-3.5 h-3.5 text-[#FFB800]" />
          {awaySummary?.awayDurationFormatted && (
            <span className="hidden md:inline font-mono text-[10px] text-[#FFB800] font-semibold">
              {awaySummary.awayDurationFormatted}
            </span>
          )}
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifMenu(!showNotifMenu);
              setShowUserMenu(false);
            }}
            className="p-2 rounded-sm bg-[#0A0A0A] hover:bg-[#111111] text-[#888] hover:text-[#E0E0E0] border border-[#1F1F1F] hover:border-[#2E2E2E] relative transition"
            title="Real-time notifications"
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#FF3131] text-white text-[9px] font-bold font-mono w-4 h-4 rounded-full flex items-center justify-center shadow-[0_0_6px_#FF3131]">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm shadow-2xl z-50 overflow-hidden">
              <div className="p-3 border-b border-[#1F1F1F] flex items-center justify-between bg-[#050505]">
                <div className="flex items-center space-x-2">
                  <Flame className="w-3.5 h-3.5 text-[#FFB800]" />
                  <span className="text-[10px] font-semibold text-[#888] uppercase tracking-[0.2em]">Meaningful Alerts</span>
                </div>
                {unreadNotificationsCount > 0 && (
                  <button
                    onClick={() => markAllNotificationsRead()}
                    className="text-[10px] text-[#00FF94] hover:underline font-mono uppercase tracking-wider"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-[#141414]">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#555] font-mono">
                    No active notifications
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (n.symbol) setSelectedStockSymbol(n.symbol);
                        markNotificationRead(n.id);
                        setShowNotifMenu(false);
                      }}
                      className={`p-3 text-xs hover:bg-[#141414] cursor-pointer transition flex items-start space-x-3 ${
                        !n.isRead ? 'bg-[#0D0D0D]' : 'opacity-60'
                      }`}
                    >
                      <div className="mt-1">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${n.classification === 'HIGH_ATTENTION' ? 'bg-[#FF3131] shadow-[0_0_6px_#FF3131]' : 'bg-[#FFB800]'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-[#E0E0E0]">{n.title}</div>
                        <div className="text-[#888] text-[11px] mt-0.5 line-clamp-2">{n.message}</div>
                        <div className="text-[10px] text-[#555] font-mono mt-1">
                          {new Date(n.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile / Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifMenu(false);
            }}
            className="flex items-center space-x-2 pl-2 pr-2.5 py-1 rounded-sm bg-[#0A0A0A] hover:bg-[#111111] border border-[#1F1F1F] hover:border-[#2E2E2E] transition"
          >
            <div className="w-5 h-5 rounded-sm bg-[#141414] border border-[#1F1F1F] flex items-center justify-center text-[10px] font-mono font-bold text-[#E0E0E0]">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <span className="text-xs font-mono text-[#888] hover:text-[#E0E0E0] hidden md:inline">
              {user?.name || 'TERMINAL'}
            </span>
            <ChevronDown className="w-3 h-3 text-[#555]" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm shadow-2xl z-50 overflow-hidden py-1">
              <div className="px-3 py-2 border-b border-[#1F1F1F] bg-[#050505]">
                <div className="text-xs font-semibold text-[#E0E0E0] font-mono">{user?.name || 'Investor'}</div>
                <div className="text-[10px] text-[#666] truncate font-mono">{user?.email || 'investor@institutional.local'}</div>
              </div>

              <button
                onClick={() => {
                  onOpenSettings();
                  setShowUserMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-xs text-[#888] hover:text-[#E0E0E0] hover:bg-[#141414] flex items-center space-x-2 transition"
              >
                <Settings className="w-3.5 h-3.5 text-[#666]" />
                <span>Settings & Preferences</span>
              </button>

              {isAuthenticated ? (
                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-[#FF3131] hover:bg-[#141414] flex items-center space-x-2 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    onOpenAuth();
                    setShowUserMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-[#00FF94] hover:bg-[#141414] flex items-center space-x-2 transition"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Sign In / Register</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
