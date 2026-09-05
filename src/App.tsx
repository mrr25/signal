import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext.tsx';
import { MarketProvider, useMarket } from './context/MarketContext.tsx';
import { Header } from './components/Header.tsx';
import { ReplayToolbar } from './components/ReplayToolbar.tsx';
import { Sidebar, TabType } from './components/Sidebar.tsx';
import { WatchlistView } from './components/WatchlistView.tsx';
import { AttentionFeedView } from './components/AttentionFeedView.tsx';
import { MarketOverviewView } from './components/MarketOverviewView.tsx';
import { StockAnalysisView } from './components/StockAnalysisView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { StockDetailModal } from './components/StockDetailModal.tsx';
import { WhileYouWereAwayModal } from './components/WhileYouWereAwayModal.tsx';
import { CommandPalette } from './components/CommandPalette.tsx';
import { AddStockModal } from './components/AddStockModal.tsx';
import { NewWatchlistModal } from './components/NewWatchlistModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';

function MainApp() {
  const [currentTab, setCurrentTab] = useState<TabType>('watchlists');
  const [isReplayBarOpen, setIsReplayBarOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isNewWatchlistOpen, setIsNewWatchlistOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const { selectedStockSymbol, setSelectedStockSymbol } = useMarket();

  return (
    <div className="min-h-screen bg-[#050505] text-[#E0E0E0] flex flex-col antialiased selection:bg-[#00FF94]/20 selection:text-[#00FF94]">
      {/* 1. Top Header */}
      <Header
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSettings={() => setCurrentTab('settings')}
        onOpenAuth={() => setIsAuthOpen(true)}
        onToggleReplayBar={() => setIsReplayBarOpen(!isReplayBarOpen)}
        isReplayBarOpen={isReplayBarOpen}
      />

      {/* 2. Interactive Market Replay / Simulation Toolbar */}
      {isReplayBarOpen && <ReplayToolbar />}

      {/* 3. Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          onOpenNewWatchlistModal={() => setIsNewWatchlistOpen(true)}
        />

        {/* Dynamic View Tab */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#050505]">
          {currentTab === 'watchlists' && (
            <WatchlistView
              onOpenAddStock={() => setIsAddStockOpen(true)}
              onOpenNewWatchlist={() => setIsNewWatchlistOpen(true)}
            />
          )}

          {currentTab === 'attention' && <AttentionFeedView />}

          {currentTab === 'analysis' && <StockAnalysisView />}

          {currentTab === 'overview' && <MarketOverviewView />}

          {currentTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* 4. Modals & Drawers */}
      {/* Stock Detail Modal / Drawer */}
      {selectedStockSymbol && (
        <StockDetailModal
          symbol={selectedStockSymbol}
          onClose={() => setSelectedStockSymbol(null)}
        />
      )}

      {/* While You Were Away Overlay */}
      <WhileYouWereAwayModal />

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectTab={(tab) => setCurrentTab(tab)}
      />

      {/* Add Stock Modal */}
      <AddStockModal
        isOpen={isAddStockOpen}
        onClose={() => setIsAddStockOpen(false)}
      />

      {/* New Watchlist Modal */}
      <NewWatchlistModal
        isOpen={isNewWatchlistOpen}
        onClose={() => setIsNewWatchlistOpen(false)}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MarketProvider>
        <MainApp />
      </MarketProvider>
    </AuthProvider>
  );
}
