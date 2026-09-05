import React, { useState } from 'react';
import { X, Layers } from 'lucide-react';
import { useMarket } from '../context/MarketContext.tsx';

interface NewWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewWatchlistModal: React.FC<NewWatchlistModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createWatchlist } = useMarket();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      await createWatchlist(name.trim(), isDefault);
      setName('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create watchlist');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm max-w-md w-full shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-[#1F1F1F] flex items-center justify-between bg-[#050505]">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[#00FF94]" />
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Create New Watchlist</h3>
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] font-mono text-[#666] uppercase tracking-wider mb-1">Watchlist Name</label>
            <input
              type="text"
              placeholder="e.g. High Alpha Breakouts, Blue Chips, Banking..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#050505] border border-[#1F1F1F] focus:border-[#00FF94] rounded-sm p-2 text-xs text-[#E0E0E0] outline-none transition font-mono"
              autoFocus
              required
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="isDefaultWl"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="accent-[#00FF94] w-4 h-4 cursor-pointer"
            />
            <label htmlFor="isDefaultWl" className="text-xs text-[#888] font-mono">
              Set as my default primary watchlist
            </label>
          </div>

          <div className="pt-3 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-sm bg-[#141414] hover:bg-[#1F1F1F] border border-[#1F1F1F] text-[#888] hover:text-[#E0E0E0] text-xs font-mono uppercase tracking-wider transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-4 py-1.5 rounded-sm bg-[#00FF94] hover:bg-[#00FF94]/90 text-[#050505] font-bold text-xs font-mono uppercase tracking-wider transition shadow-[0_0_8px_rgba(0,255,148,0.2)] disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Watchlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
