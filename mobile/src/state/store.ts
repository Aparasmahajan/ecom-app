/**
 * App-wide reactive state.
 *
 * Session + cart/wish counts all come from the Spring Boot backend now.
 * JWT is persisted via lib/api.ts auth helper (AsyncStorage under the hood).
 */
import { create } from 'zustand';
import { api, auth, ApiError, User } from '../lib/api';

interface AppState {
  ready: boolean;
  user: User | null;
  cartCount: number;
  wishCount: number;

  init: () => Promise<void>;
  /** Re-hydrate user + counts. Call after any mutation that changes cart/wish. */
  refresh: () => Promise<void>;
  /** Persist a JWT (from OTP verify / admin login), then hydrate. */
  signIn: (token: string, user?: User) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useApp = create<AppState>((set, getState) => ({
  ready: false,
  user: null,
  cartCount: 0,
  wishCount: 0,

  init: async () => {
    await getState().refresh();
    set({ ready: true });
  },

  refresh: async () => {
    const token = await auth.token();
    if (!token) {
      set({ user: null, cartCount: 0, wishCount: 0 });
      return;
    }
    try {
      const user = await api.me.get();
      try {
        const [cart, wish] = await Promise.all([api.cart.list(), api.wishlist.list()]);
        set({
          user,
          cartCount: cart.reduce((a, i) => a + i.quantity, 0),
          wishCount: wish.length
        });
      } catch {
        // network hiccup fetching counts — keep user, zero counts
        set({ user, cartCount: 0, wishCount: 0 });
      }
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        await auth.clear();
      }
      set({ user: null, cartCount: 0, wishCount: 0 });
    }
  },

  signIn: async (token, user) => {
    await auth.setToken(token);
    if (user) set({ user });
    await getState().refresh();
  },

  signOut: async () => {
    await auth.clear();
    set({ user: null, cartCount: 0, wishCount: 0 });
  }
}));
