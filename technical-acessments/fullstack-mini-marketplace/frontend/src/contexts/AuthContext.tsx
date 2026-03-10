'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi, User } from '@/lib/api';

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Optimistically restore user from localStorage, then validate the cookie session
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    authApi.me()
      .then((u) => {
        setUser(u);
        localStorage.setItem('user', JSON.stringify(u));
      })
      .catch(() => {
        // Cookie is missing or expired — clear stale local data
        localStorage.removeItem('user');
        setUser(null);
      });
  }, []);

  async function login(email: string, password: string) {
    const { user } = await authApi.login(email, password);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  }

  async function register(email: string, password: string) {
    const { user } = await authApi.register(email, password);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  }

  async function logout() {
    await authApi.logout().catch(() => {}); // best-effort cookie clear
    localStorage.removeItem('user');
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, login, register, logout, isAdmin: user?.role === 'admin' }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
