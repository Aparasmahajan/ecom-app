/**
 * REST client for the Spring Boot backend. All methods return typed data or
 * throw ApiError on failure. Auth is stored in localStorage as `cw_token`.
 *
 * Swap out the storage-based flows in existing pages to call these methods
 * once you're ready to point the UI at the backend. See CLAUDE.md §5 for the
 * full endpoint list.
 */

const BASE_URL =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL
    ? process.env.NEXT_PUBLIC_API_BASE_URL
    : 'http://localhost:8080';

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
  token: (): string | null => (typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY)),
  setToken: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY)
};

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = auth.token();
  if (t) headers.Authorization = `Bearer ${t}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include'
  });

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

/* -------- Types (mirror backend DTOs; keep in sync with backend if changed) -------- */
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
}

export interface AdminUser extends User {
  enabled: boolean;
  createdAt: string;
}
export interface Category {
  id: string; name: string; gender: string; ageGroup: string; emoji: string; imageUrl?: string;
}
export interface Variant {
  id: string; size: string; color: string; stock: number; priceModifier: number;
}
export interface Product {
  id: string; name: string; description: string; categoryId: string;
  gender: string; ageGroup: string; basePrice: number;
  images: string[]; hotSeller: boolean;
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
export interface OrderItem {
  productId: string; variantId: string; productNameSnapshot: string; size: string;
  quantity: number; unitPrice: number; note: string; image: string | null;
}
export interface Order {
  id: string; status: string; paymentStatus: string;
  subtotal: number; total: number;
  razorpayOrderId: string | null; razorpayPaymentId: string | null;
  createdAt: string;
  shipping: { fullName: string; phone: string; line1: string; line2?: string; city: string; state: string; pincode: string };
  items: OrderItem[];
}

export interface AdminOrder extends Order {
  updatedAt: string;
  trackingNumber: string | null;
  adminNotes: string;
  cancelReason: string | null;
  customer: { id: string; name: string; email: string; phone: string | null } | null;
}
export interface Review {
  id: string; userName: string; stars: number; comment: string; createdAt: string;
}

/* -------- Endpoints -------- */
export const api = {
  auth: {
    requestOtp: (email: string) => request<{ status: string }>('POST', '/auth/otp/request', { email }),
    verifyOtp:  (email: string, otp: string) =>
      request<{ token: string; user: User }>('POST', '/auth/otp/verify', { email, otp }),
    adminLogin: (username: string, password: string) =>
      request<{ token: string; user: User }>('POST', '/auth/admin/login', { username, password })
  },

  me: {
    get:    () => request<User>('GET', '/me'),
    update: (body: { name?: string; phone?: string }) => request<User>('PUT', '/me', body),
    addresses: {
      list:       () => request<Address[]>('GET', '/me/addresses'),
      create:     (body: Omit<Address, 'id' | 'isDefault'> & { isDefault?: boolean }) =>
                    request<Address>('POST', '/me/addresses', body),
      update:     (id: string, body: Partial<Address>) => request<Address>('PUT', `/me/addresses/${id}`, body),
      makeDefault:(id: string) => request<Address>('PUT', `/me/addresses/${id}/default`),
      remove:     (id: string) => request<void>('DELETE', `/me/addresses/${id}`)
    }
  },

  catalog: {
    categories: () => request<Category[]>('GET', '/categories'),
    products:   (params: { gender?: string; ageGroup?: string; categoryId?: string; hotSeller?: boolean; q?: string } = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') qs.set(k, String(v)); });
      const s = qs.toString();
      return request<Product[]>('GET', `/products${s ? `?${s}` : ''}`);
    },
    product:    (id: string) => request<Product>('GET', `/products/${id}`)
  },

  cart: {
    list:   () => request<CartItem[]>('GET', '/cart'),
    add:    (variantId: string, quantity: number, note = '') =>
              request<CartItem>('POST', '/cart', { variantId, quantity, note }),
    update: (itemId: string, quantity: number, note?: string) =>
              request<CartItem>('PUT', `/cart/${itemId}`, { quantity, note }),
    remove: (itemId: string) => request<void>('DELETE', `/cart/${itemId}`)
  },

  wishlist: {
    list:   () => request<Product[]>('GET', '/wishlist'),
    add:    (productId: string) => request<void>('POST', `/wishlist/${productId}`),
    remove: (productId: string) => request<void>('DELETE', `/wishlist/${productId}`)
  },

  orders: {
    create: (body: { addressId: string; fromCart?: boolean; items?: { variantId: string; quantity: number; note?: string }[] }) =>
              request<Order>('POST', '/orders', body),
    list:   () => request<Order[]>('GET', '/orders'),
    get:    (id: string) => request<Order>('GET', `/orders/${id}`)
  },

  payment: {
    verify: (body: { razorpayOrderId: string; razorpayPaymentId: string; signature: string }) =>
              request<Order>('POST', '/payment/verify', body)
  },

  reviews: {
    list:   (productId: string) => request<Review[]>('GET', `/products/${productId}/reviews`),
    create: (productId: string, stars: number, comment: string) =>
              request<Review>('POST', `/products/${productId}/reviews`, { stars, comment })
  },

  admin: {
    products: {
      create: (body: Partial<Product>) => request<Product>('POST', '/admin/products', body),
      update: (id: string, body: Partial<Product>) => request<Product>('PUT', `/admin/products/${id}`, body),
      remove: (id: string) => request<void>('DELETE', `/admin/products/${id}`),
      setHotSeller: (id: string, isHotSeller: boolean) =>
        request<Product>('PUT', `/admin/products/${id}/hot-seller`, { isHotSeller }),
      setRatingOverride: (id: string, stars: number | null) =>
        request<Product>('PUT', `/admin/products/${id}/rating-override`, { stars })
    },
    variants: {
      add:    (productId: string, body: { size: string; color?: string; stock: number; priceModifier?: number }) =>
                request<Variant>('POST', `/admin/products/${productId}/variants`, body),
      update: (id: string, body: { size: string; color?: string; stock: number; priceModifier?: number }) =>
                request<Variant>('PUT', `/admin/variants/${id}`, body),
      remove: (id: string) => request<void>('DELETE', `/admin/variants/${id}`)
    },
    orders: {
      list:        () => request<AdminOrder[]>('GET', '/admin/orders'),
      get:         (id: string) => request<AdminOrder>('GET', `/admin/orders/${id}`),
      setStatus:   (id: string, status: string) =>
                      request<AdminOrder>('PUT', `/admin/orders/${id}/status`, { status }),
      setTracking: (id: string, trackingNumber: string) =>
                      request<AdminOrder>('PUT', `/admin/orders/${id}/tracking`, { trackingNumber }),
      setNotes:    (id: string, notes: string) =>
                      request<AdminOrder>('PUT', `/admin/orders/${id}/notes`, { notes }),
      cancel:      (id: string, reason: string) =>
                      request<AdminOrder>('PUT', `/admin/orders/${id}/cancel`, { reason }),
      refund:      (id: string, reason: string) =>
                      request<AdminOrder>('PUT', `/admin/orders/${id}/refund`, { reason })
    },
    // SUPER_ADMIN only — create / manage other admin accounts.
    admins: {
      list:          () => request<AdminUser[]>('GET', '/admin/admins'),
      create:        (body: { email: string; name: string; password: string; phone?: string }) =>
                        request<AdminUser>('POST', '/admin/admins', body),
      resetPassword: (id: string, password: string) =>
                        request<AdminUser>('PUT', `/admin/admins/${id}/password`, { password }),
      setEnabled:    (id: string, enabled: boolean) =>
                        request<AdminUser>('PUT', `/admin/admins/${id}/enabled`, { enabled }),
      remove:        (id: string) => request<void>('DELETE', `/admin/admins/${id}`)
    }
  }
};

export { BASE_URL };
