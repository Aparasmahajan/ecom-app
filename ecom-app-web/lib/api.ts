/**
 * LOCAL-ONLY API for the static website (ecom-app-web).
 *
 * This module has the SAME surface as the backend REST client the mobile app
 * uses (auth / me / catalog / cart / wishlist / orders / payment / reviews /
 * admin), but every method reads/writes localStorage instead of hitting a
 * server. Nothing in this folder talks to the Spring Boot backend — that's
 * why ecom-app-web can be deployed to Vercel / Netlify / GitHub Pages as a
 * plain static site with zero backend infra.
 *
 * If you ever want the web to talk to the real backend, replace this file
 * with mobile/src/lib/api.ts (the fetch-based version) — every page in this
 * folder was written against the same surface, so it's a drop-in swap.
 */

/* ---------------------------------------------------------------- Types */
export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  phone?: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  enabled: boolean;
  createdAt: string;
}
export type AdminUser = User;

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

/** A curated bundle of products sold at a discount. */
export interface Combo {
  id: string;
  name: string;
  description: string;
  image: string;
  productIds: string[];
  comboPrice: number;
  isActive: boolean;
  createdAt: string;
}

/** Variant row surfaced on the admin Inventory tab. */
export interface InventoryRow {
  variantId: string;
  productId: string;
  productName: string;
  productImage: string | null;
  categoryId: string;
  size: string;
  color: string;
  stock: number;
  basePrice: number;
}

/* ---------------------------------------------------------------- Errors */
export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/* ---------------------------------------------------------------- Storage */
const K = {
  USERS:      'cw_users',
  SESSION:    'cw_session_uid',
  PRODUCTS:   'cw_products',
  CATEGORIES: 'cw_categories',
  COMBOS:     'cw_combos',
  REVIEWS:    'cw_reviews',
  SEEDED:     'cw_seeded_static_v1',
  CART:       'cw_cart',
  WISH:       'cw_wish',
  ORDERS:     'cw_orders',
  ADDRS:      'cw_addrs'
};

const isBrowser = () => typeof window !== 'undefined';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const scoped = (base: string, userId?: string) => `${base}_${userId || 'guest'}`;

function readList<T>(key: string): T[] {
  if (!isBrowser()) return [];
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function readOne<T>(key: string): T | null {
  if (!isBrowser()) return null;
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch { return null; }
}
function write<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}
function del(key: string): void {
  if (!isBrowser()) return;
  localStorage.removeItem(key);
}

/* ---------------------------------------------------------------- Session token */
const TOKEN_KEY = 'cw_token';
export const auth = {
  token: (): string | null => isBrowser() ? localStorage.getItem(TOKEN_KEY) : null,
  setToken: (t: string) => { if (isBrowser()) localStorage.setItem(TOKEN_KEY, t); },
  clear: () => { if (isBrowser()) localStorage.removeItem(TOKEN_KEY); }
};

function issueSession(user: User): string {
  const token = 'local.' + user.id + '.' + uid();
  auth.setToken(token);
  write(K.SESSION, user.id);
  return token;
}
function currentUser(): User | null {
  const uidStr = readOne<string>(K.SESSION);
  if (!uidStr) return null;
  return readList<User>(K.USERS).find(u => u.id === uidStr) || null;
}
function requireUser(): User {
  const u = currentUser();
  if (!u) throw new ApiError(401, 'unauthorized', 'Please sign in');
  return u;
}
function requireAdmin(): User {
  const u = requireUser();
  if (u.role !== 'ADMIN' && u.role !== 'SUPER_ADMIN') {
    throw new ApiError(403, 'forbidden', 'Admin only');
  }
  return u;
}
function requireSuperAdmin(): User {
  const u = requireUser();
  if (u.role !== 'SUPER_ADMIN') throw new ApiError(403, 'forbidden', 'Super admin only');
  return u;
}

/* ---------------------------------------------------------------- Seed */
const IMG = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const CATEGORY_IMAGES: Record<string, string[]> = {
  shirts:  ['1602810318383-e386cc2a3ccf', '1596755094514-f87e34085b2c', '1622519407650-3df9883f76a5'],
  tshirts: ['1521572163474-6864f9cf17ab', '1503341504253-dff4815485f1', '1583743814966-8936f5b7be1a', '1618354691373-d851c5c3a990'],
  jeans:   ['1542272604-787c3835535d', '1541099649105-f69ad21f3246', '1582418702059-97ebafb35d09'],
  hoodies: ['1556821840-3a63f95609a7', '1620799140408-edc6dcb6d633', '1552374196-c4e7ffc6e126'],
  coords:  ['1617137968427-85924c800a22', '1594938298603-c8148c4dae35', '1490481651871-ab68de25d43d']
};

function productImageTrio(categoryId: string, index: number): string[] {
  const pool = CATEGORY_IMAGES[categoryId] || CATEGORY_IMAGES.tshirts;
  const start = index % pool.length;
  return [0, 1, 2].map(i => IMG(pool[(start + i) % pool.length]));
}
function makeVariants(sizes: string[]): Variant[] {
  return sizes.map(s => ({
    id: uid(), size: s, color: 'Black', stock: 20, priceModifier: 0
  }));
}

let seeded = false;
function ensureSeeded() {
  if (seeded || !isBrowser()) return;
  if (localStorage.getItem(K.SEEDED)) { seeded = true; return; }

  const now = () => new Date().toISOString();

  const superAdmin: User = {
    id: uid(), email: 'eparasmahajan@gmail.com', password: 'Paras@2002',
    name: 'Super Admin', role: 'SUPER_ADMIN', enabled: true, createdAt: now()
  };
  write(K.USERS, [superAdmin]);

  const categories: Category[] = [
    { id: 'shirts',  name: 'Shirts',      gender: 'UNISEX', ageGroup: 'ADULT', emoji: '👔' },
    { id: 'tshirts', name: 'T-Shirts',    gender: 'UNISEX', ageGroup: 'ADULT', emoji: '👕' },
    { id: 'jeans',   name: 'Jeans',       gender: 'UNISEX', ageGroup: 'ADULT', emoji: '👖' },
    { id: 'hoodies', name: 'Hoodies',     gender: 'UNISEX', ageGroup: 'ADULT', emoji: '🧥' },
    { id: 'coords',  name: 'Co-ord Sets', gender: 'UNISEX', ageGroup: 'ADULT', emoji: '🕴️' }
  ];
  write(K.CATEGORIES, categories);

  const productSpecs: Array<[string, number, string, string, number, boolean, string[]]> = [
    ['shirts',  0, 'Oversized Shirt',      'Premium oversized shirt with a relaxed fit and tailored finish.', 999,  true,  ['S','M','L','XL']],
    ['shirts',  1, 'Denim Overshirt',      'Rugged denim overshirt — layer over anything.',                   1199, true,  ['M','L','XL','XXL']],
    ['shirts',  2, 'Linen Casual Shirt',   'Breathable linen shirt in a modern relaxed cut.',                 1099, false, ['S','M','L','XL']],
    ['tshirts', 0, 'Classic White Tee',    'Everyday essential — soft cotton white tee.',                     599,  true,  ['S','M','L','XL','XXL']],
    ['tshirts', 1, 'Minimal Printed Tee',  'Minimal printed t-shirt in super-soft cotton.',                   749,  true,  ['S','M','L','XL']],
    ['tshirts', 2, 'Dark Graphic Tee',     'Premium graphic tee, back-print statement piece.',                799,  true,  ['S','M','L','XL','XXL']],
    ['tshirts', 3, 'Washed Oversized Tee', 'Washed finish, oversized silhouette, ultra-comfort.',             849,  true,  ['S','M','L','XL','XXL']],
    ['jeans',   0, 'Baggy Jeans',          'Trending baggy fit denim with a clean wash.',                     1299, true,  ['30','32','34','36']],
    ['jeans',   1, 'Slim Fit Jeans',       'Classic slim-fit jeans in stretch denim.',                        1099, false, ['30','32','34','36']],
    ['jeans',   2, 'Distressed Denim',     'Rugged distressed denim, statement piece.',                       1499, false, ['30','32','34','36']],
    ['hoodies', 0, 'Classic Grey Hoodie',  'Heavy-weight hoodie with brushed fleece lining.',                 1599, true,  ['S','M','L','XL','XXL']],
    ['hoodies', 1, 'Streetwear Hoodie',    'Oversized streetwear hoodie with statement print.',               1699, true,  ['S','M','L','XL','XXL']],
    ['hoodies', 2, 'Zip-up Hoodie',        'Everyday zip-up hoodie in ultra-soft cotton.',                    1799, false, ['S','M','L','XL']],
    ['coords',  0, 'Beige Co-ord Set',     'Premium coordinated set — shirt + trousers in beige.',            2499, true,  ['S','M','L','XL']],
    ['coords',  1, 'Neutral Co-ord Set',   'Neutral-tone co-ord set with tailored finish.',                   2699, false, ['S','M','L','XL']]
  ];

  const products: Product[] = productSpecs.map(([categoryId, idx, name, desc, price, hot, sizes]) => ({
    id: uid(),
    name: name as string,
    description: desc as string,
    categoryId: categoryId as string,
    gender: 'UNISEX', ageGroup: 'ADULT',
    basePrice: price as number,
    images: productImageTrio(categoryId as string, idx as number),
    hotSeller: hot as boolean,
    adminRatingOverride: null,
    effectiveRating: 0,
    variants: makeVariants(sizes as string[])
  }));
  write(K.PRODUCTS, products);

  const byName = (n: string) => products.find(p => p.name === n)!;
  const combos: Combo[] = [
    {
      id: uid(),
      name: 'Streetwear Starter',
      description: 'Oversized tee + baggy jeans + streetwear hoodie — the essentials.',
      image: IMG('1620799140408-edc6dcb6d633', 900),
      productIds: [byName('Washed Oversized Tee').id, byName('Baggy Jeans').id, byName('Streetwear Hoodie').id],
      comboPrice: 3499,
      isActive: true,
      createdAt: now()
    },
    {
      id: uid(),
      name: 'Formal Complete',
      description: 'Oversized shirt + slim-fit jeans — a smart-casual set.',
      image: IMG('1602810318383-e386cc2a3ccf', 900),
      productIds: [byName('Oversized Shirt').id, byName('Slim Fit Jeans').id],
      comboPrice: 1899,
      isActive: true,
      createdAt: now()
    },
    {
      id: uid(),
      name: 'Weekend Chill',
      description: 'Classic white tee + grey hoodie — the go-to weekend combo.',
      image: IMG('1556821840-3a63f95609a7', 900),
      productIds: [byName('Classic White Tee').id, byName('Classic Grey Hoodie').id],
      comboPrice: 1899,
      isActive: true,
      createdAt: now()
    }
  ];
  write(K.COMBOS, combos);

  localStorage.setItem(K.SEEDED, '1');
  seeded = true;
}

/* ---------------------------------------------------------------- Helpers */
function effectiveRating(product: Product): number {
  if (product.adminRatingOverride != null) return product.adminRatingOverride;
  const reviews = readList<Review & { productId: string }>(K.REVIEWS).filter(r => (r as any).productId === product.id);
  if (!reviews.length) return 0;
  return +(reviews.reduce((a, r) => a + r.stars, 0) / reviews.length).toFixed(1);
}
function hydrate(product: Product): Product {
  return { ...product, effectiveRating: effectiveRating(product) };
}

/** Shared helper that finds an admin order across all users' scoped stores. */
function patchAdminOrder(id: string, mutate: (o: Order) => void): AdminOrder {
  requireAdmin();
  const users = readList<User>(K.USERS);
  for (const u of users) {
    const key = scoped(K.ORDERS, u.id);
    const orders = readList<Order>(key);
    const o = orders.find(x => x.id === id);
    if (o) {
      mutate(o);
      write(key, orders);
      return {
        ...o,
        updatedAt: new Date().toISOString(),
        trackingNumber: (o as any).trackingNumber || null,
        adminNotes: (o as any).adminNotes || '',
        cancelReason: (o as any).cancelReason || null,
        customer: { id: u.id, name: u.name, email: u.email, phone: u.phone || null }
      };
    }
  }
  throw new ApiError(404, 'not_found', 'Order not found');
}

/* ---------------------------------------------------------------- API surface */
export const api = {

  /* -------- Auth -------- */
  auth: {
    requestOtp: async (email: string) => {
      ensureSeeded();
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      write('cw_last_otp_' + email.trim().toLowerCase(), { otp, at: Date.now() });
      // eslint-disable-next-line no-console
      console.info(`[static-web] OTP for ${email} = ${otp}`);
      return { status: 'sent', devOtp: otp };
    },
    verifyOtp: async (email: string, otp: string) => {
      ensureSeeded();
      const norm = email.trim().toLowerCase();
      const stored = readOne<{ otp: string; at: number }>('cw_last_otp_' + norm);
      if (!stored) throw new ApiError(400, 'bad_request', 'No OTP requested');
      if (Date.now() - stored.at > 10 * 60_000) throw new ApiError(400, 'expired', 'OTP expired');
      if (stored.otp !== otp) throw new ApiError(400, 'invalid', 'Invalid OTP');
      del('cw_last_otp_' + norm);
      const users = readList<User>(K.USERS);
      let user = users.find(u => u.email === norm);
      if (!user) {
        user = {
          id: uid(), email: norm, name: norm.split('@')[0], role: 'USER',
          enabled: true, createdAt: new Date().toISOString()
        };
        users.push(user);
        write(K.USERS, users);
      }
      const token = issueSession(user);
      return { token, user };
    },
    register: async (body: { email: string; password: string; name: string; phone?: string }) => {
      ensureSeeded();
      const norm = body.email.trim().toLowerCase();
      const users = readList<User>(K.USERS);
      if (users.some(u => u.email === norm)) throw new ApiError(400, 'bad_request', 'Email already registered');
      const user: User = {
        id: uid(), email: norm, password: body.password, name: body.name.trim(),
        phone: body.phone?.trim(), role: 'USER', enabled: true, createdAt: new Date().toISOString()
      };
      users.push(user);
      write(K.USERS, users);
      return { token: issueSession(user), user };
    },
    login: async (email: string, password: string) => {
      ensureSeeded();
      const norm = email.trim().toLowerCase();
      const user = readList<User>(K.USERS).find(u => u.email === norm);
      if (!user || !user.enabled) throw new ApiError(401, 'unauthorized', 'Invalid credentials');
      if (!user.password || user.password !== password) throw new ApiError(401, 'unauthorized', 'Invalid credentials');
      return { token: issueSession(user), user };
    },
    forgotPassword: async (email: string) => api.auth.requestOtp(email),
    resetPassword: async (email: string, otp: string, newPassword: string) => {
      const { user } = await api.auth.verifyOtp(email, otp);
      const users = readList<User>(K.USERS);
      const u = users.find(x => x.id === user.id)!;
      u.password = newPassword;
      write(K.USERS, users);
      return { status: 'reset' };
    },
    adminLogin: async (username: string, password: string) => {
      ensureSeeded();
      const norm = username.trim().toLowerCase();
      const user = readList<User>(K.USERS).find(u => u.email === norm);
      if (!user || !user.enabled) throw new ApiError(401, 'unauthorized', 'Invalid credentials');
      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') throw new ApiError(401, 'unauthorized', 'Not an admin');
      if (!user.password || user.password !== password) throw new ApiError(401, 'unauthorized', 'Invalid credentials');
      return { token: issueSession(user), user };
    }
  },

  /* -------- Me + Addresses -------- */
  me: {
    get: async (): Promise<User> => { ensureSeeded(); return requireUser(); },
    update: async (body: { name?: string; phone?: string }): Promise<User> => {
      const me = requireUser();
      const users = readList<User>(K.USERS);
      const u = users.find(x => x.id === me.id)!;
      if (body.name != null) u.name = body.name;
      if (body.phone != null) u.phone = body.phone;
      write(K.USERS, users);
      return u;
    },
    addresses: {
      list: async (): Promise<Address[]> => {
        const me = requireUser();
        return readList<Address>(scoped(K.ADDRS, me.id));
      },
      create: async (body: Omit<Address, 'id' | 'isDefault'> & { isDefault?: boolean }): Promise<Address> => {
        const me = requireUser();
        const list = readList<Address>(scoped(K.ADDRS, me.id));
        const wantsDefault = body.isDefault || list.length === 0;
        if (wantsDefault) list.forEach(a => (a.isDefault = false));
        const addr: Address = { ...body, id: uid(), isDefault: !!wantsDefault };
        list.push(addr);
        write(scoped(K.ADDRS, me.id), list);
        return addr;
      },
      update: async (id: string, body: Partial<Address>): Promise<Address> => {
        const me = requireUser();
        const list = readList<Address>(scoped(K.ADDRS, me.id));
        const a = list.find(x => x.id === id);
        if (!a) throw new ApiError(404, 'not_found', 'Address not found');
        Object.assign(a, body);
        if (body.isDefault) list.forEach(x => { if (x.id !== id) x.isDefault = false; });
        write(scoped(K.ADDRS, me.id), list);
        return a;
      },
      makeDefault: async (id: string): Promise<Address> => {
        const me = requireUser();
        const list = readList<Address>(scoped(K.ADDRS, me.id));
        list.forEach(a => (a.isDefault = a.id === id));
        write(scoped(K.ADDRS, me.id), list);
        return list.find(a => a.id === id)!;
      },
      remove: async (id: string) => {
        const me = requireUser();
        const list = readList<Address>(scoped(K.ADDRS, me.id)).filter(a => a.id !== id);
        write(scoped(K.ADDRS, me.id), list);
      }
    }
  },

  /* -------- Catalog -------- */
  catalog: {
    categories: async (): Promise<Category[]> => {
      ensureSeeded();
      return readList<Category>(K.CATEGORIES);
    },
    products: async (params: { categoryId?: string; hotSeller?: boolean; q?: string } = {}): Promise<Product[]> => {
      ensureSeeded();
      const q = (params.q || '').toLowerCase();
      return readList<Product>(K.PRODUCTS)
        .filter(p =>
          (!params.categoryId || p.categoryId === params.categoryId) &&
          (params.hotSeller === undefined || p.hotSeller === params.hotSeller) &&
          (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
        )
        .map(hydrate);
    },
    product: async (id: string): Promise<Product> => {
      ensureSeeded();
      const p = readList<Product>(K.PRODUCTS).find(x => x.id === id);
      if (!p) throw new ApiError(404, 'not_found', 'Product not found');
      return hydrate(p);
    },

    combos: async (): Promise<Combo[]> => {
      ensureSeeded();
      return readList<Combo>(K.COMBOS).filter(c => c.isActive);
    },
    combo: async (id: string): Promise<Combo> => {
      ensureSeeded();
      const c = readList<Combo>(K.COMBOS).find(x => x.id === id);
      if (!c) throw new ApiError(404, 'not_found', 'Combo not found');
      return c;
    }
  },

  /* -------- Cart -------- */
  cart: {
    list: async (): Promise<CartItem[]> => {
      const me = requireUser();
      return readList<CartItem>(scoped(K.CART, me.id));
    },
    add: async (variantId: string, quantity: number, note = ''): Promise<CartItem> => {
      const me = requireUser();
      const products = readList<Product>(K.PRODUCTS);
      const product = products.find(p => p.variants.some(v => v.id === variantId));
      if (!product) throw new ApiError(404, 'not_found', 'Variant not found');
      const variant = product.variants.find(v => v.id === variantId)!;
      if (variant.stock < quantity) throw new ApiError(400, 'bad_request', 'Not enough stock');
      const item: CartItem = {
        id: uid(), variantId, productId: product.id,
        productName: product.name, size: variant.size, color: variant.color,
        productImages: product.images, quantity, note,
        unitPrice: product.basePrice + variant.priceModifier
      };
      const cart = readList<CartItem>(scoped(K.CART, me.id));
      cart.push(item);
      write(scoped(K.CART, me.id), cart);
      return item;
    },
    update: async (itemId: string, quantity: number, note?: string): Promise<CartItem> => {
      const me = requireUser();
      const cart = readList<CartItem>(scoped(K.CART, me.id));
      const i = cart.find(x => x.id === itemId);
      if (!i) throw new ApiError(404, 'not_found', 'Cart item not found');
      i.quantity = quantity;
      if (note != null) i.note = note;
      write(scoped(K.CART, me.id), cart);
      return i;
    },
    remove: async (itemId: string) => {
      const me = requireUser();
      const cart = readList<CartItem>(scoped(K.CART, me.id)).filter(x => x.id !== itemId);
      write(scoped(K.CART, me.id), cart);
    }
  },

  /* -------- Wishlist -------- */
  wishlist: {
    list: async (): Promise<Product[]> => {
      const me = requireUser();
      const ids = readList<string>(scoped(K.WISH, me.id));
      return readList<Product>(K.PRODUCTS).filter(p => ids.includes(p.id)).map(hydrate);
    },
    add: async (productId: string) => {
      const me = requireUser();
      const list = readList<string>(scoped(K.WISH, me.id));
      if (!list.includes(productId)) list.push(productId);
      write(scoped(K.WISH, me.id), list);
    },
    remove: async (productId: string) => {
      const me = requireUser();
      const list = readList<string>(scoped(K.WISH, me.id)).filter(id => id !== productId);
      write(scoped(K.WISH, me.id), list);
    }
  },

  /* -------- Orders + Payment -------- */
  orders: {
    create: async (body: { addressId: string; fromCart?: boolean; items?: Array<{ variantId: string; quantity: number; note?: string }> }): Promise<Order> => {
      const me = requireUser();
      const addr = readList<Address>(scoped(K.ADDRS, me.id)).find(a => a.id === body.addressId);
      if (!addr) throw new ApiError(400, 'bad_request', 'Address not found');
      let sourceItems: Array<{ variantId: string; quantity: number; note: string }>;
      if (body.fromCart) {
        sourceItems = readList<CartItem>(scoped(K.CART, me.id)).map(c => ({
          variantId: c.variantId, quantity: c.quantity, note: c.note
        }));
        if (!sourceItems.length) throw new ApiError(400, 'bad_request', 'Cart is empty');
      } else {
        sourceItems = (body.items || []).map(i => ({ variantId: i.variantId, quantity: i.quantity, note: i.note || '' }));
        if (!sourceItems.length) throw new ApiError(400, 'bad_request', 'No items');
      }
      const products = readList<Product>(K.PRODUCTS);
      let subtotal = 0;
      const orderItems: OrderItem[] = sourceItems.map(src => {
        const product = products.find(p => p.variants.some(v => v.id === src.variantId));
        if (!product) throw new ApiError(404, 'not_found', 'Variant not found');
        const variant = product.variants.find(v => v.id === src.variantId)!;
        if (variant.stock < src.quantity) throw new ApiError(400, 'bad_request', `Not enough stock for ${product.name}`);
        variant.stock -= src.quantity;
        const unit = product.basePrice + variant.priceModifier;
        subtotal += unit * src.quantity;
        return {
          productId: product.id, variantId: variant.id,
          productNameSnapshot: product.name, size: variant.size,
          quantity: src.quantity, unitPrice: unit, note: src.note,
          image: product.images[0] || null
        };
      });
      write(K.PRODUCTS, products);

      const order: Order = {
        id: uid(),
        status: 'CREATED',
        paymentStatus: 'PENDING',
        subtotal, total: subtotal,
        razorpayOrderId: 'order_dev_' + uid(),
        razorpayPaymentId: null,
        createdAt: new Date().toISOString(),
        shipping: {
          fullName: addr.fullName, phone: addr.phone, line1: addr.line1, line2: addr.line2,
          city: addr.city, state: addr.state, pincode: addr.pincode
        },
        items: orderItems
      };
      const orders = readList<Order>(scoped(K.ORDERS, me.id));
      orders.unshift(order);
      write(scoped(K.ORDERS, me.id), orders);
      if (body.fromCart) write(scoped(K.CART, me.id), []);
      return order;
    },
    list: async (): Promise<Order[]> => {
      const me = requireUser();
      return readList<Order>(scoped(K.ORDERS, me.id));
    },
    get: async (id: string): Promise<Order> => {
      const me = requireUser();
      const o = readList<Order>(scoped(K.ORDERS, me.id)).find(x => x.id === id);
      if (!o) throw new ApiError(404, 'not_found', 'Order not found');
      return o;
    }
  },
  payment: {
    verify: async (body: { razorpayOrderId: string; razorpayPaymentId: string; signature: string }): Promise<Order> => {
      const me = requireUser();
      const orders = readList<Order>(scoped(K.ORDERS, me.id));
      const o = orders.find(x => x.razorpayOrderId === body.razorpayOrderId);
      if (!o) throw new ApiError(404, 'not_found', 'Order not found');
      o.razorpayPaymentId = body.razorpayPaymentId;
      o.paymentStatus = 'PAID';
      o.status = 'PAID';
      write(scoped(K.ORDERS, me.id), orders);
      return o;
    }
  },

  /* -------- Reviews -------- */
  reviews: {
    list: async (productId: string): Promise<Review[]> => {
      ensureSeeded();
      return readList<Review & { productId: string }>(K.REVIEWS)
        .filter(r => (r as any).productId === productId);
    },
    create: async (productId: string, stars: number, comment: string): Promise<Review> => {
      const me = requireUser();
      const list = readList<Review & { productId: string; userId: string }>(K.REVIEWS);
      const existing = list.find(r => (r as any).userId === me.id && (r as any).productId === productId);
      if (existing) {
        existing.stars = stars;
        existing.comment = comment;
        write(K.REVIEWS, list);
        return existing;
      }
      const r = {
        id: uid(), userId: me.id, userName: me.name, productId,
        stars, comment, createdAt: new Date().toISOString()
      };
      list.push(r as any);
      write(K.REVIEWS, list);
      return r as any;
    }
  },

  /* -------- Admin -------- */
  admin: {
    products: {
      create: async (body: Partial<Product>): Promise<Product> => {
        requireAdmin();
        const list = readList<Product>(K.PRODUCTS);
        const product: Product = {
          id: uid(),
          name: body.name || 'Untitled',
          description: body.description || '',
          categoryId: body.categoryId || 'tshirts',
          gender: 'UNISEX', ageGroup: 'ADULT',
          basePrice: body.basePrice ?? 999,
          images: body.images && body.images.length ? body.images : productImageTrio(body.categoryId || 'tshirts', 0),
          hotSeller: !!body.hotSeller,
          adminRatingOverride: body.adminRatingOverride ?? null,
          effectiveRating: 0,
          variants: makeVariants(['S','M','L','XL'])
        };
        list.push(product);
        write(K.PRODUCTS, list);
        return hydrate(product);
      },
      update: async (id: string, body: Partial<Product>): Promise<Product> => {
        requireAdmin();
        const list = readList<Product>(K.PRODUCTS);
        const p = list.find(x => x.id === id);
        if (!p) throw new ApiError(404, 'not_found', 'Product not found');
        Object.assign(p, body);
        write(K.PRODUCTS, list);
        return hydrate(p);
      },
      remove: async (id: string) => {
        requireAdmin();
        write(K.PRODUCTS, readList<Product>(K.PRODUCTS).filter(p => p.id !== id));
      },
      setHotSeller: async (id: string, isHotSeller: boolean) =>
        api.admin.products.update(id, { hotSeller: isHotSeller }),
      setRatingOverride: async (id: string, stars: number | null) =>
        api.admin.products.update(id, { adminRatingOverride: stars })
    },
    variants: {
      add: async (productId: string, body: { size: string; color?: string; stock: number; priceModifier?: number }): Promise<Variant> => {
        requireAdmin();
        const list = readList<Product>(K.PRODUCTS);
        const p = list.find(x => x.id === productId);
        if (!p) throw new ApiError(404, 'not_found', 'Product not found');
        const v: Variant = { id: uid(), size: body.size, color: body.color || 'Default', stock: body.stock, priceModifier: body.priceModifier ?? 0 };
        p.variants.push(v);
        write(K.PRODUCTS, list);
        return v;
      },
      update: async (id: string, body: { size: string; color?: string; stock: number; priceModifier?: number }): Promise<Variant> => {
        requireAdmin();
        const list = readList<Product>(K.PRODUCTS);
        for (const p of list) {
          const v = p.variants.find(x => x.id === id);
          if (v) {
            v.size = body.size;
            if (body.color != null) v.color = body.color;
            v.stock = body.stock;
            if (body.priceModifier != null) v.priceModifier = body.priceModifier;
            write(K.PRODUCTS, list);
            return v;
          }
        }
        throw new ApiError(404, 'not_found', 'Variant not found');
      },
      remove: async (id: string) => {
        requireAdmin();
        const list = readList<Product>(K.PRODUCTS);
        for (const p of list) {
          const idx = p.variants.findIndex(v => v.id === id);
          if (idx >= 0) { p.variants.splice(idx, 1); write(K.PRODUCTS, list); return; }
        }
      }
    },
    orders: {
      list: async (): Promise<AdminOrder[]> => {
        requireAdmin();
        const users = readList<User>(K.USERS);
        const rows: AdminOrder[] = [];
        for (const u of users) {
          const uOrders = readList<Order>(scoped(K.ORDERS, u.id));
          for (const o of uOrders) {
            rows.push({
              ...o,
              updatedAt: o.createdAt,
              trackingNumber: (o as any).trackingNumber || null,
              adminNotes: (o as any).adminNotes || '',
              cancelReason: (o as any).cancelReason || null,
              customer: { id: u.id, name: u.name, email: u.email, phone: u.phone || null }
            });
          }
        }
        rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return rows;
      },
      get: async (id: string): Promise<AdminOrder> => {
        const all = await api.admin.orders.list();
        const o = all.find(x => x.id === id);
        if (!o) throw new ApiError(404, 'not_found', 'Order not found');
        return o;
      },
      setStatus: async (id: string, status: string): Promise<AdminOrder> => patchAdminOrder(id, o => {
        o.status = status;
        if (status === 'REFUNDED') o.paymentStatus = 'REFUNDED';
      }),
      setTracking: async (id: string, trackingNumber: string): Promise<AdminOrder> => patchAdminOrder(id, o => {
        (o as any).trackingNumber = trackingNumber || null;
        if (trackingNumber && ['CREATED', 'PAID', 'PROCESSING'].includes(o.status)) o.status = 'SHIPPED';
      }),
      setNotes: async (id: string, notes: string): Promise<AdminOrder> => patchAdminOrder(id, o => {
        (o as any).adminNotes = notes;
      }),
      cancel: async (id: string, reason: string): Promise<AdminOrder> => patchAdminOrder(id, o => {
        if (o.status === 'DELIVERED') throw new ApiError(400, 'bad_request', 'Delivered orders cannot be cancelled — refund instead');
        o.status = 'CANCELLED';
        (o as any).cancelReason = reason;
      }),
      refund: async (id: string, reason: string): Promise<AdminOrder> => patchAdminOrder(id, o => {
        if (o.paymentStatus !== 'PAID') throw new ApiError(400, 'bad_request', 'Only PAID orders can be refunded');
        o.status = 'REFUNDED';
        o.paymentStatus = 'REFUNDED';
        (o as any).cancelReason = reason;
      })
    },
    admins: {
      list: async (): Promise<AdminUser[]> => {
        requireSuperAdmin();
        return readList<User>(K.USERS).filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN');
      },
      create: async (body: { email: string; name: string; password: string; phone?: string }): Promise<AdminUser> => {
        requireSuperAdmin();
        const users = readList<User>(K.USERS);
        const norm = body.email.trim().toLowerCase();
        if (users.some(u => u.email === norm)) throw new ApiError(400, 'bad_request', 'Email already in use');
        const admin: User = {
          id: uid(), email: norm, name: body.name.trim(), phone: body.phone?.trim(),
          password: body.password, role: 'ADMIN', enabled: true,
          createdAt: new Date().toISOString()
        };
        users.push(admin);
        write(K.USERS, users);
        return admin;
      },
      resetPassword: async (id: string, password: string): Promise<AdminUser> => {
        requireSuperAdmin();
        const users = readList<User>(K.USERS);
        const u = users.find(x => x.id === id);
        if (!u) throw new ApiError(404, 'not_found', 'Admin not found');
        u.password = password;
        write(K.USERS, users);
        return u;
      },
      setEnabled: async (id: string, enabled: boolean): Promise<AdminUser> => {
        const me = requireSuperAdmin();
        const users = readList<User>(K.USERS);
        const u = users.find(x => x.id === id);
        if (!u) throw new ApiError(404, 'not_found', 'Admin not found');
        if (u.role === 'SUPER_ADMIN') throw new ApiError(400, 'bad_request', 'Cannot disable the SUPER_ADMIN');
        if (u.id === me.id) throw new ApiError(400, 'bad_request', 'Cannot disable your own account');
        u.enabled = enabled;
        write(K.USERS, users);
        return u;
      },
      remove: async (id: string) => {
        const me = requireSuperAdmin();
        const users = readList<User>(K.USERS);
        const u = users.find(x => x.id === id);
        if (!u) throw new ApiError(404, 'not_found', 'Admin not found');
        if (u.role === 'SUPER_ADMIN') throw new ApiError(400, 'bad_request', 'Cannot delete the SUPER_ADMIN');
        if (u.id === me.id) throw new ApiError(400, 'bad_request', 'Cannot delete your own account');
        write(K.USERS, users.filter(x => x.id !== id));
      }
    },

    /* -------- NEW: Combos -------- */
    combos: {
      list: async (): Promise<Combo[]> => {
        requireAdmin();
        ensureSeeded();
        return readList<Combo>(K.COMBOS);
      },
      create: async (body: Omit<Combo, 'id' | 'createdAt'>): Promise<Combo> => {
        requireAdmin();
        const list = readList<Combo>(K.COMBOS);
        const combo: Combo = { ...body, id: uid(), createdAt: new Date().toISOString() };
        list.push(combo);
        write(K.COMBOS, list);
        return combo;
      },
      update: async (id: string, body: Partial<Combo>): Promise<Combo> => {
        requireAdmin();
        const list = readList<Combo>(K.COMBOS);
        const c = list.find(x => x.id === id);
        if (!c) throw new ApiError(404, 'not_found', 'Combo not found');
        Object.assign(c, body);
        write(K.COMBOS, list);
        return c;
      },
      remove: async (id: string) => {
        requireAdmin();
        write(K.COMBOS, readList<Combo>(K.COMBOS).filter(c => c.id !== id));
      }
    },

    /* -------- NEW: Inventory -------- */
    inventory: {
      list: async (): Promise<InventoryRow[]> => {
        requireAdmin();
        ensureSeeded();
        const rows: InventoryRow[] = [];
        for (const p of readList<Product>(K.PRODUCTS)) {
          for (const v of p.variants) {
            rows.push({
              variantId: v.id, productId: p.id, productName: p.name,
              productImage: p.images[0] || null, categoryId: p.categoryId,
              size: v.size, color: v.color, stock: v.stock, basePrice: p.basePrice
            });
          }
        }
        return rows;
      },
      updateStock: async (variantId: string, stock: number): Promise<InventoryRow> => {
        requireAdmin();
        if (stock < 0) throw new ApiError(400, 'bad_request', 'Stock cannot be negative');
        const list = readList<Product>(K.PRODUCTS);
        for (const p of list) {
          const v = p.variants.find(x => x.id === variantId);
          if (v) {
            v.stock = stock;
            write(K.PRODUCTS, list);
            return {
              variantId: v.id, productId: p.id, productName: p.name,
              productImage: p.images[0] || null, categoryId: p.categoryId,
              size: v.size, color: v.color, stock: v.stock, basePrice: p.basePrice
            };
          }
        }
        throw new ApiError(404, 'not_found', 'Variant not found');
      }
    }
  }
};
