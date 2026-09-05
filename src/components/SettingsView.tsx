import React, { useState, useEffect } from 'react';
import {
  User,
  Moon,
  Sun,
  Bell,
  Radio,
  Shield,
  Save,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useMarket } from '../context/MarketContext.tsx';
import { api } from '../services/api.ts';

export const SettingsView: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { dataMode, setMode, providerName } = useMarket();

  const [name, setName] = useState(user?.name || 'Rishitha');
  const [email, setEmail] = useState(user?.email || 'muthyalarishitha2006@gmail.com');
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  const [notifImportant, setNotifImportant] = useState(true);
  const [notifHighAttention, setNotifHighAttention] = useState(true);
  const [notifWhileAway, setNotifWhileAway] = useState(true);
  const [notifSound, setNotifSound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    api.getPreferences().then((res) => {
      if (res.preferences) {
        setTheme(res.preferences.theme || 'dark');
        if (res.preferences.notifications) {
          setNotifImportant(res.preferences.notifications.importantSignals);
          setNotifHighAttention(res.preferences.notifications.highAttentionOnly);
          setNotifWhileAway(res.preferences.notifications.whileAwaySummary);
          setNotifSound(res.preferences.notifications.soundEnabled);
        }
      }
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateProfile({ name });
      await api.updatePreferences({
        theme,
        dataMode,
        notifications: {
          importantSignals: notifImportant,
          highAttentionOnly: notifHighAttention,
          dailySummary: true,
          whileAwaySummary: notifWhileAway,
          soundEnabled: notifSound,
        },
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#050505] text-[#E0E0E0] p-6 space-y-6 font-sans max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Settings & Account Preferences</h2>
        <p className="text-[11px] text-[#666] font-mono mt-0.5">
          Manage your profile, real-time alert thresholds, and market data mode.
        </p>
      </div>

      {/* 1. Profile Information */}
      <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm p-5 space-y-4">
        <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-[#E0E0E0] font-mono">
          <User className="w-4 h-4 text-[#FFB800]" />
          <span>Profile Information</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <label className="block text-[#666] text-[10px] uppercase tracking-wider mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#050505] border border-[#1F1F1F] focus:border-[#00FF94] rounded-sm p-2.5 text-[#E0E0E0] outline-none font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-[#666] text-[10px] uppercase tracking-wider mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full bg-[#080808] border border-[#141414] rounded-sm p-2.5 text-[#555] outline-none cursor-not-allowed font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* 2. Data Mode & Market Defaults */}
      <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm p-5 space-y-4">
        <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-[#E0E0E0] font-mono">
          <Radio className="w-4 h-4 text-[#00FF94]" />
          <span>Market Data & Feed Mode</span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-sm bg-[#050505] border border-[#141414]">
            <div>
              <div className="font-bold text-[#E0E0E0] font-mono">Market Data Pipeline</div>
              <div className="text-[#666] text-[11px] mt-0.5">
                Switch between real-time Yahoo Finance (NSE) market feed and high-fidelity deterministic replay engine.
              </div>
            </div>

            <div className="flex items-center space-x-2 font-mono">
              <button
                onClick={() => setMode('REPLAY')}
                className={`px-3 py-1.5 rounded-sm font-bold text-xs tracking-wider transition uppercase ${
                  dataMode === 'REPLAY'
                    ? 'bg-[#141414] text-[#FFB800] border border-[#FFB800]/40 shadow-[0_0_6px_rgba(255,184,0,0.15)]'
                    : 'bg-[#050505] text-[#666] hover:text-[#E0E0E0] border border-[#1F1F1F]'
                }`}
              >
                REPLAY
              </button>
              <button
                onClick={() => setMode('LIVE')}
                className={`px-3 py-1.5 rounded-sm font-bold text-xs tracking-wider transition uppercase ${
                  dataMode === 'LIVE'
                    ? 'bg-[#00FF94] text-[#050505] shadow-[0_0_8px_rgba(0,255,148,0.2)]'
                    : 'bg-[#050505] text-[#666] hover:text-[#E0E0E0] border border-[#1F1F1F]'
                }`}
              >
                LIVE
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 rounded-sm bg-[#050505] border border-[#141414]">
              <div className="text-[9px] text-[#555] uppercase tracking-wider">Primary Exchange</div>
              <div className="font-bold text-[#E0E0E0] mt-1">National Stock Exchange (NSE)</div>
            </div>
            <div className="p-3 rounded-sm bg-[#050505] border border-[#141414]">
              <div className="text-[9px] text-[#555] uppercase tracking-wider">Base Currency</div>
              <div className="font-bold text-[#E0E0E0] mt-1">Indian Rupee (INR ₹)</div>
            </div>
            <div className="p-3 rounded-sm bg-[#050505] border border-[#141414]">
              <div className="text-[9px] text-[#555] uppercase tracking-wider">Active Live Feed</div>
              <div className="font-bold text-[#00FF94] mt-1 truncate">{providerName}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Notification Rules */}
      <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm p-5 space-y-4">
        <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-[#E0E0E0] font-mono">
          <Bell className="w-4 h-4 text-[#00FF94]" />
          <span>Notification & Attention Rules</span>
        </div>

        <div className="space-y-2.5 text-xs">
          <label className="flex items-center justify-between p-3 rounded-sm bg-[#050505] border border-[#141414] cursor-pointer hover:border-[#1F1F1F] transition">
            <div>
              <div className="font-semibold text-[#E0E0E0] font-mono">Important Signals (Score 61-80)</div>
              <div className="text-[#666] text-[11px]">Notify when stocks register notable outperformance or volume anomaly.</div>
            </div>
            <input
              type="checkbox"
              checked={notifImportant}
              onChange={(e) => setNotifImportant(e.target.checked)}
              className="accent-[#00FF94] w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-sm bg-[#050505] border border-[#141414] cursor-pointer hover:border-[#1F1F1F] transition">
            <div>
              <div className="font-semibold text-[#E0E0E0] font-mono">High Attention Signals (Score 81-100)</div>
              <div className="text-[#666] text-[11px]">Alert on extreme institutional volume or severe sector divergence.</div>
            </div>
            <input
              type="checkbox"
              checked={notifHighAttention}
              onChange={(e) => setNotifHighAttention(e.target.checked)}
              className="accent-[#00FF94] w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-sm bg-[#050505] border border-[#141414] cursor-pointer hover:border-[#1F1F1F] transition">
            <div>
              <div className="font-semibold text-[#E0E0E0] font-mono">While You Were Away Briefing</div>
              <div className="text-[#666] text-[11px]">Automatically summarize market movements that occurred during your absence.</div>
            </div>
            <input
              type="checkbox"
              checked={notifWhileAway}
              onChange={(e) => setNotifWhileAway(e.target.checked)}
              className="accent-[#00FF94] w-4 h-4 cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-[11px] font-mono text-[#555]">
          User Watchlists & Settings are securely isolated.
        </span>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 rounded-sm bg-[#00FF94] hover:bg-[#00FF94]/90 text-[#050505] font-bold text-xs font-mono uppercase tracking-wider transition flex items-center space-x-2 shadow-[0_0_8px_rgba(0,255,148,0.2)]"
        >
          {saveSuccess ? <Check className="w-4 h-4 text-[#050505]" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Saving...' : saveSuccess ? 'Preferences Saved!' : 'Save Preferences'}</span>
        </button>
      </div>
    </div>
  );
};
