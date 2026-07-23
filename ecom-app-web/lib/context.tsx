'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { api, auth, ApiError, User } from './api';

interface AppContextValue {
  user: User | null;
  cartCount: number;
  wishCount: number;
  ready: boolean;
  /** Re-hydrate user from stored JWT + refresh cart/wish counts. */
  refresh: () => Promise<void>;
  /** Persist JWT (from OTP/admin login) then hydrate. */
  signIn: (token: string, user?: User) => Promise<void>;
  signOut: () => Promise<void>;
  toast: (msg: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [wishCount, setWishCount] = useState(0);
  const [ready, setReady] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (!auth.token()) {
      setUser(null);
      setCartCount(0);
      setWishCount(0);
      return;
    }
    try {
      const me = await api.me.get();
      setUser(me);
      try {
        const [cart, wish] = await Promise.all([api.cart.list(), api.wishlist.list()]);
        setCartCount(cart.reduce((a, i) => a + i.quantity, 0));
        setWishCount(wish.length);
      } catch { /* non-fatal */ }
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        auth.clear();
      }
      setUser(null);
      setCartCount(0);
      setWishCount(0);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setReady(true);
    })();
  }, [refresh]);

  const signIn = useCallback(async (token: string, u?: User) => {
    auth.setToken(token);
    if (u) setUser(u);
    await refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    auth.clear();
    setUser(null);
    setCartCount(0);
    setWishCount(0);
  }, []);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2400);
  }, []);

  return (
    <AppContext.Provider value={{ user, cartCount, wishCount, ready, refresh, signIn, signOut, toast }}>
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
