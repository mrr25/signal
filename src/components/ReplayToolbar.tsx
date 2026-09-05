import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  TrendingUp,
  AlertTriangle,
  Radio,
  Sliders,
  ChevronRight,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext.tsx';

export const ReplayToolbar: React.FC = () => {
  const { replayState, controlReplay, dataMode, setMode } = useMarket();
  const [selectedAnomaly, setSelectedAnomaly] = useState<'volume_spike' | 'sector_divergence' | 'volatility_burst'>('volume_spike');
  const [targetStock, setTargetStock] = useState('INFY');

  const isPlaying = replayState?.isPlaying ?? true;
  const currentSpeed = replayState?.speed ?? 1;
  const progressPercent = replayState?.progressPercent ?? 35;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    controlReplay('seek', { seekRatio: val / 100 });
  };

  const handleTriggerAnomaly = () => {
    controlReplay('trigger_anomaly', {
      anomalyType: selectedAnomaly,
      symbol: targetStock,
    });
  };

  return (
    <div className="bg-[#0A0A0A] border-b border-[#1F1F1F] px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono transition-all">
      {/* Left: Mode Badge & Switcher */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center bg-[#050505] p-0.5 rounded-sm border border-[#1F1F1F]">
          <button
            onClick={() => setMode('REPLAY')}
            className={`px-2.5 py-1 rounded-sm text-[10px] font-bold tracking-wider uppercase transition flex items-center space-x-1.5 ${
              dataMode === 'REPLAY'
                ? 'bg-[#141414] text-[#FFB800] border border-[#FFB800]/40 shadow-[0_0_6px_rgba(255,184,0,0.15)]'
                : 'text-[#666] hover:text-[#E0E0E0]'
            }`}
          >
            <Radio className="w-3 h-3 text-[#FFB800]" />
            <span>DEMO / REPLAY MODE</span>
          </button>
          <button
            onClick={() => setMode('LIVE')}
            className={`px-2.5 py-1 rounded-sm text-[10px] font-bold tracking-wider uppercase transition flex items-center space-x-1.5 ${
              dataMode === 'LIVE'
                ? 'bg-[#141414] text-[#00FF94] border border-[#00FF94]/40 shadow-[0_0_6px_rgba(0,255,148,0.15)]'
                : 'text-[#666] hover:text-[#E0E0E0]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF94] shadow-[0_0_6px_#00FF94]" />
            <span>LIVE (YAHOO NSE)</span>
          </button>
        </div>

        {dataMode === 'REPLAY' && (
          <span className="text-[#555] text-[10px] uppercase tracking-wider hidden xl:inline">
            High-fidelity simulation pipeline passing through full normalization and deterministic signal scoring.
          </span>
        )}
      </div>

      {/* Middle: Playback Controls (Active in Replay Mode) */}
      {dataMode === 'REPLAY' && (
        <div className="flex items-center space-x-3 flex-1 max-w-xl justify-center">
          {/* Play / Pause */}
          <button
            onClick={() => controlReplay(isPlaying ? 'pause' : 'play')}
            className="p-1.5 rounded-sm bg-[#0F0F0F] hover:bg-[#141414] text-[#E0E0E0] border border-[#1F1F1F] hover:border-[#2E2E2E] transition"
            title={isPlaying ? 'Pause simulation' : 'Resume simulation'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 text-[#00FF94]" /> : <Play className="w-3.5 h-3.5 text-[#00FF94] fill-current" />}
          </button>

          {/* Reset */}
          <button
            onClick={() => controlReplay('reset')}
            className="p-1.5 rounded-sm bg-[#0F0F0F] hover:bg-[#141414] text-[#888] hover:text-[#E0E0E0] border border-[#1F1F1F] hover:border-[#2E2E2E] transition"
            title="Reset simulation timeline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Speed Buttons */}
          <div className="flex items-center space-x-1 bg-[#050505] p-0.5 rounded-sm border border-[#1F1F1F]">
            {([1, 2, 5] as const).map((spd) => (
              <button
                key={spd}
                onClick={() => controlReplay('speed', { speed: spd })}
                className={`px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold transition ${
                  currentSpeed === spd
                    ? 'bg-[#141414] text-[#FFB800] border border-[#1F1F1F]'
                    : 'text-[#555] hover:text-[#888]'
                }`}
              >
                {spd}×
              </button>
            ))}
          </div>

          {/* Progress Timeline Slider */}
          <div className="flex items-center space-x-2 flex-1">
            <span className="text-[9px] text-[#555] font-mono">09:15</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={progressPercent}
              onChange={handleSeek}
              className="w-full h-1 bg-[#141414] rounded-none appearance-none cursor-pointer accent-[#00FF94]"
            />
            <span className="text-[9px] text-[#555] font-mono">15:30</span>
          </div>
        </div>
      )}

      {/* Right: Anomaly Injection */}
      {dataMode === 'REPLAY' && (
        <div className="flex items-center space-x-2 bg-[#050505] p-1 rounded-sm border border-[#1F1F1F]">
          <span className="text-[10px] text-[#888] pl-1 font-semibold uppercase tracking-wider flex items-center space-x-1">
            <Zap className="w-3 h-3 text-[#FFB800]" />
            <span className="hidden sm:inline">Inject Anomaly:</span>
          </span>

          <select
            value={selectedAnomaly}
            onChange={(e: any) => setSelectedAnomaly(e.target.value)}
            className="bg-[#0F0F0F] border border-[#1F1F1F] text-[#E0E0E0] text-[10px] rounded-sm px-2 py-1 outline-none font-mono"
          >
            <option value="volume_spike">Volume Spike (2.4×)</option>
            <option value="sector_divergence">Sector Divergence</option>
            <option value="volatility_burst">Volatility Burst</option>
          </select>

          <select
            value={targetStock}
            onChange={(e) => setTargetStock(e.target.value)}
            className="bg-[#0F0F0F] border border-[#1F1F1F] text-[#E0E0E0] text-[10px] rounded-sm px-2 py-1 outline-none font-mono"
          >
            <option value="INFY">INFY</option>
            <option value="TCS">TCS</option>
            <option value="RELIANCE">RELIANCE</option>
            <option value="HDFCBANK">HDFCBANK</option>
            <option value="TATAMOTORS">TATAMOTORS</option>
          </select>

          <button
            onClick={handleTriggerAnomaly}
            className="px-2.5 py-1 rounded-sm bg-[#00FF94] hover:bg-[#00FF94]/90 text-[#050505] font-bold text-[10px] uppercase tracking-wider transition shadow-[0_0_8px_rgba(0,255,148,0.2)]"
            title="Simulate this anomaly right now to observe the Signal Engine trigger"
          >
            Trigger
          </button>
        </div>
      )}
    </div>
  );
};
