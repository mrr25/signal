import React, { useState } from 'react';
import { X, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, register } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      if (isRegister) {
        await register(email, password, name || 'Investor');
      } else {
        await login(email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm max-w-md w-full shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-[#1F1F1F] flex items-center justify-between bg-[#050505]">
          <div>
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              {isRegister ? 'Create SIGNAL Account' : 'Sign in to SIGNAL'}
            </h3>
            <p className="text-[10px] text-[#555] font-mono mt-0.5">
              {isRegister ? 'Personalized watchlists with isolated persistence' : 'Access your customized deterministic alerts'}
            </p>
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-mono">
          {isRegister && (
            <div>
              <label className="block text-[#666] text-[10px] uppercase tracking-wider mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-[#555] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Rishitha"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#050505] border border-[#1F1F1F] focus:border-[#00FF94] rounded-sm pl-9 p-2 text-[#E0E0E0] outline-none font-mono"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[#666] text-[10px] uppercase tracking-wider mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#555] absolute left-3 top-2.5" />
              <input
                type="email"
                placeholder="investor@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#050505] border border-[#1F1F1F] focus:border-[#00FF94] rounded-sm pl-9 p-2 text-[#E0E0E0] outline-none font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[#666] text-[10px] uppercase tracking-wider mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#555] absolute left-3 top-2.5" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#050505] border border-[#1F1F1F] focus:border-[#00FF94] rounded-sm pl-9 p-2 text-[#E0E0E0] outline-none font-mono"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 rounded-sm bg-[#00FF94] hover:bg-[#00FF94]/90 text-[#050505] font-bold text-xs font-mono uppercase tracking-wider transition shadow-[0_0_8px_rgba(0,255,148,0.2)] disabled:opacity-50"
          >
            {submitting ? 'Please wait...' : isRegister ? 'Register Account' : 'Sign In'}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-[10px] font-mono text-[#888] hover:text-[#00FF94] transition"
            >
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
