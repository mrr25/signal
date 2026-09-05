import React, { useState } from 'react';
import { Search, X, Plus, Check } from 'lucide-react';
import { useMarket } from '../context/MarketContext.tsx';
import { INSTRUMENTS } from '../../shared/constants/instruments.ts';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddStockModal: React.FC<AddStockModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { activeWatchlist, addStockToActiveWatchlist } = useMarket();

  if (!isOpen) return null;

  const currentSymbols = new Set(activeWatchlist?.stocks.map((s) => s.symbol) || []);

  const filtered = INSTRUMENTS.filter(
    (i) =>
      i.symbol.toLowerCase().includes(query.toLowerCase()) ||
      i.name.toLowerCase().includes(query.toLowerCase()) ||
      i.sector.toLowerCase().includes(query.toLowerCase())
  );

  const handleAdd = async (sym: string) => {
    try {
      setSubmitting(true);
      setError(null);
      await addStockToActiveWatchlist(sym, notes.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add stock');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm max-w-lg w-full shadow-2xl overflow-hidden font-sans">
        <div className="p-4 border-b border-[#1F1F1F] flex items-center justify-between bg-[#050505]">
          <div>
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Add Stock to {activeWatchlist?.name}</h3>
            <p className="text-[10px] text-[#555] font-mono mt-0.5">Search NSE equity instruments</p>
          </div>
          <button onClick={onClose} className="text-[#666] hover:text-[#E0E0E0] p-1 rounded-sm">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-[#FF3131]/15 border-b border-[#FF3131]/40 text-[#FF3131] text-xs font-mono">
            {error}
          </div>
        )}

        <div className="p-3 border-b border-[#1F1F1F] bg-[#050505]/60 flex items-center space-x-2">
          <Search className="w-4 h-4 text-[#888]" />
          <input
            type="text"
            placeholder="Search by symbol, company name, or sector..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-[#E0E0E0] placeholder-[#555] outline-none font-mono"
            autoFocus
          />
        </div>

        <div className="max-h-64 overflow-y-auto divide-y divide-[#141414] p-2">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#555] font-mono">
              No matching instruments found
            </div>
          ) : (
            filtered.map((inst) => {
              const isAlreadyAdded = currentSymbols.has(inst.symbol);
              return (
                <div
                  key={inst.symbol}
                  className="p-2.5 flex items-center justify-between hover:bg-[#141414] rounded-sm transition border border-transparent hover:border-[#1F1F1F]"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-white text-xs tracking-wider">{inst.symbol}</span>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded-sm bg-[#050505] text-[#888] border border-[#1F1F1F]">
                        {inst.sector}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#777] font-sans">{inst.name}</div>
                  </div>

                  {isAlreadyAdded ? (
                    <span className="text-[10px] font-mono text-[#555] flex items-center space-x-1">
                      <Check className="w-3.5 h-3.5 text-[#00FF94]" />
                      <span>Added</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAdd(inst.symbol)}
                      disabled={submitting}
                      className="px-3 py-1 rounded-sm bg-[#00FF94] hover:bg-[#00FF94]/90 text-[#050505] font-bold text-xs font-mono uppercase tracking-wider transition flex items-center space-x-1 shadow-[0_0_6px_rgba(0,255,148,0.2)]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 border-t border-[#1F1F1F] bg-[#050505] text-right">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-sm bg-[#141414] hover:bg-[#1F1F1F] border border-[#1F1F1F] text-[#888] hover:text-[#E0E0E0] text-xs font-mono uppercase tracking-wider transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
