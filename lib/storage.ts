export const K = {
  USERS: 'cw_users',
  SESSION: 'cw_session',
  PRODUCTS: 'cw_products',
  CATEGORIES: 'cw_categories',
  CART: 'cw_cart',
  WISH: 'cw_wish',
  ORDERS: 'cw_orders',
  ADDRS: 'cw_addrs',
  REVIEWS: 'cw_reviews',
  SEEDED: 'cw_seeded_v1'
};

export function get<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function set<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function remove(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const money = (n: number) => '₹' + Number(n).toLocaleString('en-IN');
