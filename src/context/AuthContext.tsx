import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '../../shared/types/index.ts';
import { api } from '../services/api.ts';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const data = await api.getMe();
        setUser(data.profile);
      } catch (err) {
        // Fallback default user for instant exploration if desired
        setUser({
          id: 'usr-signal-001',
          email: 'muthyalarishitha2006@gmail.com',
          name: 'Rishitha',
          avatarUrl: '',
          createdAt: Date.now() - 30 * 86400 * 1000,
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    localStorage.setItem('signal_auth_token', res.token);
    setUser(res.profile);
  };

  const register = async (email: string, pass: string, name: string) => {
    const res = await api.register(email, pass, name);
    localStorage.setItem('signal_auth_token', res.token);
    setUser(res.profile);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const res = await api.updateProfile(updates);
    setUser(res.profile);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
