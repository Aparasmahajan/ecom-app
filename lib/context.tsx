'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { K, get, set, remove } from './storage';
import { seed } from './seed';
import type { User, CartItem, Session } from './types';

interface AppContextValue {
  user: User | null;
  cartCount: number;
  wishCount: number;
  refresh: () => void;
  signIn: (user: User) => void;
  signOut: () => void;
  toast: (msg: string) => void;
  ready: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [wishCount, setWishCount] = useState(0);
  const [ready, setReady] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadUser = useCallback((): User | null => {
    const s = get<Session | null>(K.SESSION, null);
    if (!s) return null;
    const users = get<User[]>(K.USERS, []);
    return users.find(u => u.id === s.userId) || null;
  }, []);

  const refresh = useCallback(() => {
    const u = loadUser();
    setUser(u);
    const scope = u ? u.id : 'guest';
    const cart = get<CartItem[]>(`${K.CART}_${scope}`, []);
    const wish = get<string[]>(`${K.WISH}_${scope}`, []);
    setCartCount(cart.reduce((a, i) => a + i.quantity, 0));
    setWishCount(wish.length);
  }, [loadUser]);

  useEffect(() => {
    seed();
    refresh();
    setReady(true);
  }, [refresh]);

  const signIn = useCallback((u: User) => {
    set<Session>(K.SESSION, { userId: u.id });
    refresh();
  }, [refresh]);

  const signOut = useCallback(() => {
    remove(K.SESSION);
    refresh();
  }, [refresh]);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  }, []);

  return (
    <AppContext.Provider value={{ user, cartCount, wishCount, refresh, signIn, signOut, toast, ready }}>
      {children}
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}

/* Per-user scoped storage helpers (safe to call outside components) */
export function scoped(base: string, userId: string | undefined): string {
  return `${base}_${userId || 'guest'}`;
}
