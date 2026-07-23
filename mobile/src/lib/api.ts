/**
 * REST client for the Spring Boot backend. Same shape as static/lib/api.ts —
 * only difference is the token is persisted in AsyncStorage instead of
 * localStorage.
 *
 * BASE_URL resolution priority (highest → lowest):
 *   1. app.json → extra.apiBaseUrl              (explicit override)
 *   2. EXPO_PUBLIC_API_BASE_URL env variable    (build-time override)
 *   3. Metro bundler host IP + :8080            (dev fallback — matches your PC)
 *   4. http://localhost:8080                    (last resort — only works in web/simulator)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

function resolveBaseUrl(): string {
  // 1. Explicit override in app.json → { "expo": { "extra": { "apiBaseUrl": "..." }}}
  const extra = (Constants.expoConfig?.extra ?? {}) as { apiBaseUrl?: string };
  if (extra.apiBaseUrl) return extra.apiBaseUrl;

  // 2. EXPO_PUBLIC_* env vars are exposed to the client at build time
  //    (see https://docs.expo.dev/guides/environment-variables/)
  const fromEnv = (process.env as any).EXPO_PUBLIC_API_BASE_URL as string | undefined;
  if (fromEnv) return fromEnv;

  // 3. In dev, extract the LAN IP that Metro is running on — that's the same
  //    machine as the backend (assuming both run on your PC). We swap Metro's
  //    port (usually 8081) for the backend port (8080).
  const hostUri = Constants.expoConfig?.hostUri
    ?? (Constants as any).manifest2?.extra?.expoGo?.debuggerHost
    ?? (Constants as any).manifest?.debuggerHost;
  if (hostUri) {
    const host = String(hostUri).split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:8080`;
    }
  }

  // 4. Fallback — only works on iOS simulator / Android emulator loopback.
  return 'http://localhost:8080';
}

export const BASE_URL = resolveBaseUrl();

const TOKEN_KEY = 'cw_token';

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const auth = {
  token: async (): Promise<string | null> => AsyncStorage.getItem(TOKEN_KEY),
  setToken: (t: string) => AsyncStorage.setItem(TOKEN_KEY, t),
  clear: () => AsyncStorage.removeItem(TOKEN_KEY)
};

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = await auth.token();
  if (t) headers.Authorization = `Bearer ${t}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch (netErr) {
    throw new ApiError(0, 'network_error',
      `Cannot reach backend at ${BASE_URL}. Is it running? Are your phone and PC on the same Wi-Fi?`);
  }

  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const code = (data && typeof data === 'object' && 'code' in data) ? (data as any).code : 'error';
    const msg  = (data && typeof data === 'object' && 'message' in data) ? (data as any).message : String(data);
    throw new ApiError(res.status, code, msg);
  }
  return data as T;
}

/* Types intentionally match static/lib/api.ts. */
export interface User { id: string; email: string; name: string; phone?: string; role: 'USER' | 'ADMIN' | 'SUPER_ADMIN'; }
export interface Category { id: string; name: string; gender: string; ageGroup: string; emoji: string; imageUrl?: string; }
export interface Variant { id: string; size: string; color: string; stock: number; priceModifier: number; }
export interface Product {
  id: string; name: string; description: string; categoryId: string;
  gender: string; ageGroup: string; basePrice: number;
  images: string[]; hotSeller: boolean;
  listed?: boolean; listQuantity?: number;
  adminRatingOverride: number | null; effectiveRating: number;
  variants: Variant[];
}
export interface Address {
  id: string; fullName: string; phone: string; line1: string; line2?: string;
  city: string; state: string; pincode: string; isDefault: boolean;
}
export interface CartItem {
  id: string; variantId: string; productId: string;
  productName: string; size: string; color: string;
  productImages: string[]; quantity: number; note: string; unitPrice: number;
}
export interface Order {
  id: string; status: string; paymentStatus: string;
  subtotal: number; total: number;
  razorpayOrderId: string | null; razorpayPaymentId: string | null;
  createdAt: string;
  shipping: { fullName: string; phone: string; line1: string; line2?: string; city: string; state: string; pincode: string };
  items: Array<{ productId: string; variantId: string; productNameSnapshot: string; size: string; quantity: number; unitPrice: number; note: string; image: string | null }>;
}
export interface Combo {
  id: string; name: string; description: string; image: string;
  productIds: string[]; comboPrice: number; isActive: boolean;
  createdAt: string;
}
export interface Review {
  id: string; userName: string; stars: number; comment: string; createdAt: string;
}
export type BannerTemplate = 'hero' | 'sale' | 'split' | 'minimal';
export interface Banner {
  id: string; template: BannerTemplate; title: string; subtitle: string;
  imageUrl: string; price: string; ctaText: string; ctaHref: string;
  active: boolean; position: number; createdAt: string;
}
export interface Settings { homeBannerCount: number; }
export interface AdminOrder extends Order {
  updatedAt: string;
  trackingNumber: string | null;
  adminNotes: string;
  cancelReason: string | null;
  customer: { id: string; name: string; email: string; phone: string | null } | null;
}
export interface AdminUser {
  id: string; email: string; name: string; phone?: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN'; enabled: boolean; createdAt: string;
}

export const api = {
  auth: {
    requestOtp: (email: string) => request<{ status: string }>('POST', '/auth/otp/request', { email }),
    verifyOtp:  (email: string, otp: string) =>
      request<{ token: string; user: User }>('POST', '/auth/otp/verify', { email, otp }),
    register: (body: { email: string; password: string; name: string; phone?: string }) =>
      request<{ token: string; user: User }>('POST', '/auth/register', body),
    login: (email: string, password: string) =>
      request<{ token: string; user: User }>('POST', '/auth/login', { email, password }),
    forgotPassword: (email: string) =>
      request<{ status: string }>('POST', '/auth/password/forgot', { email }),
    resetPassword: (email: string, otp: string, newPassword: string) =>
      request<{ status: string }>('POST', '/auth/password/reset', { email, otp, newPassword }),
    adminLogin: (username: string, password: string) =>
      request<{ token: string; user: User }>('POST', '/auth/admin/login', { username, password })
  },
  me: {
    get:    () => request<User>('GET', '/me'),
    update: (body: { name?: string; phone?: string }) => request<User>('PUT', '/me', body),
    addresses: {
      list:       () => request<Address[]>('GET', '/me/addresses'),
      create:     (body: any) => request<Address>('POST', '/me/addresses', body),
      update:     (id: string, body: any) => request<Address>('PUT', `/me/addresses/${id}`, body),
      makeDefault:(id: string) => request<Address>('PUT', `/me/addresses/${id}/default`),
      remove:     (id: string) => request<void>('DELETE', `/me/addresses/${id}`)
    }
  },
  catalog: {
    categories: () => request<Category[]>('GET', '/categories'),
    products:   (params: any = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') qs.set(k, String(v)); });
      const s = qs.toString();
      return request<Product[]>('GET', `/products${s ? `?${s}` : ''}`);
    },
    product:    (id: string) => request<Product>('GET', `/products/${id}`),
    combos:     () => request<Combo[]>('GET', '/combos'),
    combo:      (id: string) => request<Combo>('GET', `/combos/${id}`),
    banners:    () => request<Banner[]>('GET', '/banners'),
    settings:   () => request<Settings>('GET', '/settings')
  },
  cart: {
    list:   () => request<CartItem[]>('GET', '/cart'),
    add:    (variantId: string, quantity: number, note = '') => request<CartItem>('POST', '/cart', { variantId, quantity, note }),
    update: (itemId: string, quantity: number, note?: string) => request<CartItem>('PUT', `/cart/${itemId}`, { quantity, note }),
    remove: (itemId: string) => request<void>('DELETE', `/cart/${itemId}`)
  },
  wishlist: {
    list:   () => request<Product[]>('GET', '/wishlist'),
    add:    (productId: string) => request<void>('POST', `/wishlist/${productId}`),
    remove: (productId: string) => request<void>('DELETE', `/wishlist/${productId}`)
  },
  orders: {
    create: (body: any) => request<Order>('POST', '/orders', body),
    list:   () => request<Order[]>('GET', '/orders'),
    get:    (id: string) => request<Order>('GET', `/orders/${id}`)
  },
  payment: {
    verify: (body: any) => request<Order>('POST', '/payment/verify', body)
  },
  reviews: {
    list:   (productId: string) => request<Review[]>('GET', `/products/${productId}/reviews`),
    create: (productId: string, stars: number, comment: string) =>
      request<Review>('POST', `/products/${productId}/reviews`, { stars, comment })
  },

  /* -------- Admin (ADMIN / SUPER_ADMIN) -------- */
  admin: {
    products: {
      list:    () => request<Product[]>('GET', '/admin/products'),
      create:  (body: Partial<Product>) => request<Product>('POST', '/admin/products', body),
      update:  (id: string, body: Partial<Product>) => request<Product>('PUT', `/admin/products/${id}`, body),
      remove:  (id: string) => request<void>('DELETE', `/admin/products/${id}`),
      setHotSeller:     (id: string, isHotSeller: boolean) =>
        request<Product>('PUT', `/admin/products/${id}/hot-seller`, { isHotSeller }),
      setRatingOverride:(id: string, stars: number | null) =>
        request<Product>('PUT', `/admin/products/${id}/rating-override`, { stars }),
      setListing:       (id: string, body: { listed?: boolean; listQuantity?: number }) =>
        request<Product>('PUT', `/admin/products/${id}/listing`, body)
    },
    variants: {
      add:    (productId: string, body: { size: string; color?: string; stock: number; priceModifier?: number }) =>
        request<Variant>('POST', `/admin/products/${productId}/variants`, body),
      update: (id: string, body: { size: string; color?: string; stock: number; priceModifier?: number }) =>
        request<Variant>('PUT', `/admin/variants/${id}`, body),
      remove: (id: string) => request<void>('DELETE', `/admin/variants/${id}`)
    },
    orders: {
      list:       () => request<AdminOrder[]>('GET', '/admin/orders'),
      get:        (id: string) => request<AdminOrder>('GET', `/admin/orders/${id}`),
      setStatus:  (id: string, status: string) => request<AdminOrder>('PUT', `/admin/orders/${id}/status`, { status }),
      setTracking:(id: string, trackingNumber: string) => request<AdminOrder>('PUT', `/admin/orders/${id}/tracking`, { trackingNumber }),
      setNotes:   (id: string, notes: string) => request<AdminOrder>('PUT', `/admin/orders/${id}/notes`, { notes }),
      cancel:     (id: string, reason: string) => request<AdminOrder>('PUT', `/admin/orders/${id}/cancel`, { reason }),
      refund:     (id: string, reason: string) => request<AdminOrder>('PUT', `/admin/orders/${id}/refund`, { reason })
    },
    combos: {
      list:   () => request<Combo[]>('GET', '/admin/combos'),
      create: (body: any) => request<Combo>('POST', '/admin/combos', body),
      update: (id: string, body: any) => request<Combo>('PUT', `/admin/combos/${id}`, body),
      remove: (id: string) => request<void>('DELETE', `/admin/combos/${id}`)
    },
    banners: {
      list:   () => request<Banner[]>('GET', '/admin/banners'),
      create: (body: Partial<Banner>) => request<Banner>('POST', '/admin/banners', body),
      update: (id: string, body: Partial<Banner>) => request<Banner>('PUT', `/admin/banners/${id}`, body),
      remove: (id: string) => request<void>('DELETE', `/admin/banners/${id}`)
    },
    settings: {
      update: (body: Partial<Settings>) => request<Settings>('PUT', '/admin/settings', body)
    },
    admins: {
      list:          () => request<AdminUser[]>('GET', '/admin/admins'),
      create:        (body: { email: string; name: string; password: string; phone?: string }) =>
        request<AdminUser>('POST', '/admin/admins', body),
      resetPassword: (id: string, password: string) => request<AdminUser>('PUT', `/admin/admins/${id}/password`, { password }),
      setEnabled:    (id: string, enabled: boolean) => request<AdminUser>('PUT', `/admin/admins/${id}/enabled`, { enabled }),
      remove:        (id: string) => request<void>('DELETE', `/admin/admins/${id}`)
    }
  }
};
