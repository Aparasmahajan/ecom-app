# CLAUDE.md

Project context for AI assistants and developers working on this codebase.

---

## 1. Project Overview

A cross-platform mobile e-commerce app for a **custom clothing retail shop**. Customers browse products, select from admin-defined sizes, add an optional order note, pay online, and track orders. An admin manages the catalog, "hot seller" listings, sizes/stock, and product ratings.

**Platforms:** Android + iOS (single React Native codebase).

**"Custom order" scope (confirmed):** the shop takes custom clothing orders, but customization on the app is limited to **choosing an admin-listed size + quantity + an optional free-text note**. There are **no** customer body-measurement forms and **no** customer image/reference uploads. (This keeps the data model simple and means Cloudinary is used for admin product images only.)

---

## 2. Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Mobile frontend | React Native via **Expo (dev build / prebuild)** | Same native runtime as bare RN; supports Razorpay's native module through a dev build; faster to develop and ship |
| Backend | Spring Boot (Java 17+) | REST API |
| Database | **PostgreSQL** | Chosen for search (native full-text + `pg_trgm` fuzzy matching). Free tier: Supabase / Neon / Railway |
| Auth | JWT (access token) | Email OTP for users; password login for admin |
| Email/OTP | **Brevo** (Sendinblue) | 300 emails/day free, purpose-built for transactional email. See §7 for why over Gmail SMTP |
| Image hosting | **Cloudinary** | Admin product images only (NOT email — see §7) |
| Payments | Razorpay | `react-native-razorpay` (client) + Razorpay Java SDK (server) |
| Backend hosting | Render / Railway (free tier) | |

---

## 3. Frontend (React Native / Expo)

**Performance is the priority: smooth, no jitter.** Runtime speed is identical between Expo and bare RN (both compile to native), so smoothness comes from practices, not framework:
- Enable the **Hermes** engine (default in modern Expo).
- Use **FlatList / FlashList** with `keyExtractor`, `getItemLayout`, and windowing for all product lists — never `.map()` long lists inside a ScrollView.
- Memoize list items (`React.memo`) and callbacks (`useCallback`); keep component state minimal.
- Cache server data + images with React Query + Cloudinary transformations (request right-sized images, not full-res).
- Avoid unnecessary re-renders; keep navigation transitions on the native thread.

**Recommended libraries**
- Navigation: `@react-navigation/native` (native-stack + bottom-tabs)
- Server state / caching: `@tanstack/react-query`
- Client state: **Zustand** (lightweight)
- HTTP: `axios` with an interceptor that attaches the JWT
- Secure token storage: `expo-secure-store`
- Payments: `react-native-razorpay`
- Forms: `react-hook-form`
- Lists: `@shopify/flash-list` (recommended for large product grids)

**Mobile-specific UI rules**
- **Home "Shop by Category" section must scroll horizontally on mobile** (single row, swipe left/right). On desktop/tablet it stays as a wrapping grid. Use `overflow-x: auto` with hidden scrollbar and `scroll-snap-type: x mandatory` for a native-feel snap. Category cards keep a fixed width so multiple peek into the viewport, signalling scrollability.

**Screen map**
- Splash / Onboarding
- **Home / Landing** — admin-configured hot sellers + category entry (Men / Women / Age group)
- Category / Product listing (filter by gender + age group; search)
- **Product detail** — image gallery, size selector (admin-defined), quantity, optional note, add-to-cart / buy-now, ratings display
- Cart
- Wishlist
- **Checkout** — address selection -> order summary -> Razorpay payment (**login required**, see §6)
- Order history + order detail
- Profile — user info, **address book (multiple addresses)**
- Auth — email entry -> OTP verify
- **Admin panel** — hidden entry (see §6)

---

## 4. Backend (Spring Boot)

**Package layout**
```
com.shop.app
|-- config        (security, CORS, cloudinary, razorpay, brevo beans)
|-- auth          (OTP, JWT, admin login)
|-- user
|-- address
|-- catalog       (category, product, variant, search)
|-- cart
|-- wishlist
|-- order
|-- review
|-- payment       (razorpay order + signature verification)
`-- common        (exceptions, DTOs, utils)
```

### Core entities

**User** — `id, email (unique), name, phone, role [USER|ADMIN], enabled, createdAt`

**Address** — `id, userId(FK), fullName, phone, line1, line2, city, state, pincode, isDefault`
> A user can have multiple addresses; exactly one `isDefault`.

**Category** — `id, name, gender [MEN|WOMEN|UNISEX], ageGroup [KIDS|TEEN|ADULT], imageUrl`

**Product** — `id, name, description, categoryId(FK), gender, ageGroup, basePrice, images [Cloudinary URLs], isHotSeller (bool), avgUserRating (computed), adminRatingOverride (nullable), effectiveRating (computed), searchVector (tsvector, for full-text search)`

**ProductVariant** — `id, productId(FK), size, color, stock, priceModifier`
> Sizes are **defined by the admin** per product. Customers pick from these; they do not enter custom sizes/measurements.

**Wishlist** — `id, userId(FK), productId(FK)` (unique pair)

**CartItem** — `id, userId(FK), variantId(FK), quantity, note (optional)`

**Order** — `id, userId(FK), addressId(FK), status [CREATED|PAID|PROCESSING|SHIPPED|DELIVERED|CANCELLED], subtotal, total, paymentStatus, razorpayOrderId, razorpayPaymentId, createdAt`

**OrderItem** — `id, orderId(FK), variantId(FK), productNameSnapshot, size, quantity, unitPrice, note (optional)`

**Review** — `id, userId(FK), productId(FK), stars (1-5), comment, adminOverrideStars (nullable), createdAt` (unique userId+productId)

**OtpToken** — `id, email, otpHash, expiresAt, attempts, verified`

### Ratings rule
- Users submit 1-5 stars.
- `avgUserRating` = average of user `stars`.
- If `adminRatingOverride` is set on the product, `effectiveRating = adminRatingOverride`; otherwise `effectiveRating = avgUserRating`.
- Only the effective rating is shown on the storefront.

### Search (PostgreSQL)
- Add a `tsvector` column on `Product` (name + description) with a GIN index for full-text search.
- Enable the `pg_trgm` extension for fuzzy / typo-tolerant matching and search-as-you-type on product names.
- No external search engine (Elasticsearch etc.) needed at this scale.

---

## 5. API Sketch (REST)

```
# Auth
POST /auth/otp/request      { email }             -> sends OTP via Brevo
POST /auth/otp/verify       { email, otp }         -> { jwt, user }
POST /auth/admin/login      { username, password } -> { jwt } (ADMIN, no OTP)

# User / Address
GET    /me
GET    /me/addresses
POST   /me/addresses
PUT    /me/addresses/{id}
DELETE /me/addresses/{id}
PUT    /me/addresses/{id}/default

# Catalog
GET  /categories
GET  /products?gender=&ageGroup=&categoryId=&hotSeller=&q=   (q = search term)
GET  /products/{id}

# Wishlist
GET    /wishlist
POST   /wishlist/{productId}
DELETE /wishlist/{productId}

# Cart
GET    /cart
POST   /cart            { variantId, quantity, note }
PUT    /cart/{itemId}
DELETE /cart/{itemId}

# Orders + Payment  (auth required)
POST /orders                 { addressId, items[] | fromCart } -> creates order + razorpay order
POST /payment/verify         { razorpayOrderId, paymentId, signature }
GET  /orders
GET  /orders/{id}

# Reviews
POST /products/{id}/reviews  { stars, comment }
GET  /products/{id}/reviews

# ---- ADMIN (role=ADMIN) ----
POST /admin/products                        (create, upload images to Cloudinary)
PUT  /admin/products/{id}
POST /admin/products/{id}/variants          (define sizes/colors/stock)
PUT  /admin/variants/{id}
PUT  /admin/products/{id}/hot-seller        { isHotSeller }
PUT  /admin/products/{id}/rating-override   { stars | null }
GET  /admin/orders
PUT  /admin/orders/{id}/status
```

---

## 6. Auth Rules

### Users
- **Login required to place an order** (no guest checkout). Browsing, search, and viewing products are open; cart -> checkout requires a logged-in user.
- Login/signup via **email OTP** (Brevo). Store only an OTP hash + expiry (5-10 min). Rate-limit OTP requests per email to protect the free quota.

### Admin access ("unlock trick") — confirmed approach
- Admin logs in with **username + password (no OTP)** via a seeded `ADMIN` account, so admin activity never consumes the limited free email quota.
- The real protection is the **`ADMIN` role check on every `/admin/**` endpoint**, server-side.
- The "hidden entry" is UX only (not security): reveal the admin login screen via a discreet gesture, e.g. **long-press the version number** on the Profile screen, or a **secret tap sequence on the logo**.

> WARNING: Do NOT gate admin power on the hidden gesture alone. Security-through-obscurity is unsafe for endpoints that edit the catalog and override ratings. The backend role check is what actually protects it.

Seed via env vars: `ADMIN_USERNAME`, `ADMIN_PASSWORD` (BCrypt-hashed on startup).

---

## 7. Third-Party Integrations

**Email OTP: Brevo (chosen over Gmail SMTP)**
- Brevo free tier: 300 emails/day, purpose-built for transactional email, provides an API + delivery logs, and does not risk your personal inbox.
- Gmail SMTP free tier: only ~100 automated emails/day via SMTP, plus invisible behavioral throttling that can block sends far below the cap, and repeated automated OTP sending can get a personal Gmail suspended. Acceptable for local dev only.
- Implementation: send a 6-digit OTP on `/auth/otp/request`; store hash + expiry; verify on `/auth/otp/verify`. Set up SPF/DKIM in Brevo for deliverability.

**Cloudinary (images only)**
- Admin product images. Backend uploads via Cloudinary Java SDK; store the returned secure URL on the `Product`.
- Use Cloudinary transformation URLs to serve right-sized images to the app (helps performance).
- Generous free tier. **It cannot send email/OTP.**

**Razorpay (payments)**
- Server creates a Razorpay order (amount in paise) -> returns `razorpayOrderId` to the client.
- Client opens Razorpay checkout via `react-native-razorpay`.
- On success, client sends `paymentId` + `signature` to `/payment/verify`.
- **Server verifies the signature** (HMAC-SHA256 with the key secret) before marking the order `PAID`. Never trust client-reported success alone.
- Use Razorpay **test mode** during development.

---

## 8. Environment Variables

**Backend**
```
DB_URL, DB_USER, DB_PASSWORD
JWT_SECRET, JWT_EXPIRY
BREVO_API_KEY, MAIL_FROM
CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
ADMIN_USERNAME, ADMIN_PASSWORD
```

**Frontend**
```
API_BASE_URL
RAZORPAY_KEY_ID   (public key id only — never the secret)
```

---

## 9. Conventions

- REST + JSON. DTOs for all request/response bodies — never expose entities directly.
- Bean Validation (`@Valid`) on all inputs; validate `pincode` (6 digits) and `phone` (10 digits, India).
- Prices stored as integer paise or `BigDecimal` — never `double`.
- Global exception handler returns a consistent error shape `{ code, message }`.
- All money/payment mutations verified server-side.
- Snapshot product name + price into `OrderItem` at purchase time (so later catalog edits don't change past orders).
- Rate-limit OTP endpoints to protect the free email quota.

---

## 10. Resolved Decisions

1. Custom order scope: admin-listed sizes + quantity + optional note. No measurements, no user image uploads.
2. Email/OTP provider: **Brevo** (over Gmail SMTP — higher effective automated limit, transactional-grade, safer).
3. Admin auth: **username + password + hidden gesture**, protected by server-side role check. No OTP.
4. Database: **PostgreSQL** (best for search — full-text + `pg_trgm` fuzzy matching).
5. Checkout: **login required** (no guest checkout).
6. Framework: **Expo dev build**; performance/smoothness handled via Hermes, FlashList/FlatList virtualization, and memoization (§3).

## 11. Open / Future Considerations
- Order notifications (email via Brevo, or push via Expo Notifications) — confirm if needed for MVP.
- Refund / cancellation flow via Razorpay — out of scope for MVP unless required.

---

## 12. Design System (LOCKED — must match on every screen)

The whole app follows one visual language. Any new screen, component, or admin surface must match this — do not introduce a second theme, second accent, or lighter/pastel variant.

### 12.1 Brand
- Two-line wordmark: **URBAN** (bold, white) over **CLOTHING CO** (small, gold, tracked). Keep the split — never combine into one line.
- Use the wordmark in the top-left header and repeated as a big gold mark in the footer.

### 12.2 Palette
| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#0a0a0a` | Page background |
| `--bg-2` | `#111111` | Bottom nav, footer strip |
| `--card` | `#1a1a1a` | Cards, list items, forms, modal |
| `--card-2` | `#262626` | Card hover / secondary elevated |
| `--text` | `#ffffff` | Primary text |
| `--muted` | `#9ca3af` | Secondary text, meta, placeholders |
| `--border` | `#2a2a2a` | All 1px separators |
| `--accent` | `#f5c842` | Gold — CTAs, prices, active tabs, badges, ratings, brand accent |
| `--danger` | `#ef4444` | Destructive actions, wishlist heart when active |

Never use pure black (`#000`) — use `--bg`. Never use a second accent color; anything that used to be red/blue for emphasis becomes gold.

### 12.3 Typography
- System sans (`-apple-system, "Segoe UI", Roboto`).
- **Section headings** and category names: uppercase, `letter-spacing: 0.5px–2px`, weight `700–900`.
- Body: 14px, `line-height: 1.5`, color `--text`.
- Meta / labels: 11–13px, `--muted`, often uppercase with tracking.
- Prices: `--accent`, weight 700+.

### 12.4 Shape
- Corner radii: `8px` (small controls), `10–12px` (inputs), `14px` (cards, list items), `16–20px` (hero, modal, big cards). Never sharp corners.
- Chips (circular category avatars, pill filter tabs): fully rounded (`50%` or `999px`).

### 12.5 Components
- **Buttons**
  - Primary `.btn`: solid gold background, black text, bold, uppercase, `border-radius: 8px`.
  - Secondary `.btn.secondary`: transparent bg, gold border + gold text.
  - Dark `.btn.dark`: `--card` bg, white text, `--border` outline.
  - Small `.btn.small` for inline actions.
- **Product card**: `--card` bg + `--border`, image on top with **heart button top-right** (`rgba(0,0,0,0.55)` + blur), title, price in gold, optional `HOT` tag.
- **Hero**: dark gradient panel, large uppercase title stacked on 3 lines, one-line tagline, gold `SHOP NOW` button. Right side has a masked hero image fading into the panel.
- **Category chips (home)**: circular 68px image, name below, horizontally scrolling row with hidden scrollbar. Bordered with `--accent` on hover.
- **Big category cards (Categories page)**: 130px tall dark card, image on right fading left-to-right into black, gold uppercase name + muted "Explore Now →".
- **Filter tabs (product listing)**: pill chips in a horizontal scroll strip. Active chip = solid gold + black text.
- **Bottom nav**: fixed, `--bg-2`, 5 tabs (Home / Categories / Wishlist / Cart / Profile). Active tab uses gold color + a 2px gold indicator line at the top. Badges are gold pills with black text.
- **Feature strip**: horizontal scroll strip above the footer with 5 items — Premium Quality / Trendy Designs / Easy Returns / Secure Payment / Fast Delivery. Each has a circular gold-tinted icon plus title + subtitle.
- **Toast**: gold pill, black text, floats above the bottom nav.
- **Status pills**: rounded, translucent color-tinted background matching the status semantics (see `.status-*` classes).

### 12.6 Layout
- Mobile-first, `max-width: 1200px` container.
- Sticky top header, fixed bottom nav — reserve `padding-bottom: 80px` on `<body>` so content isn't hidden.
- Home screen sections in this fixed order: **Hero → Category chip strip → Trending Now → New Arrivals**.
- Categories screen: vertical stack of big banner cards.
- Product detail: two-column on desktop (gallery + info), stacked on mobile. Order: title → rating → price → **color swatches** → **size buttons** → quantity → note → `ADD TO CART` + `BUY NOW` side-by-side → wishlist toggle → Product Details.
- Profile: circular gold avatar with initials + 3-column stat grid (Orders / Wishlist / Addresses) + menu list with gold `pm-icon` on the left and chevron on the right.

### 12.7 Imagery
- All product / category / hero photos are real clothing photos served from `images.unsplash.com` (see `lib/images.ts`). Never use random placeholder services (picsum, placeholder.com) for user-visible art.
- Images are always requested with `?auto=format&fit=crop&w=<width>&q=80` so the CDN returns a right-sized WebP.
- Image IDs are grouped per category in `lib/images.ts`; new categories must add a matching photo pool there. Products get rotating triples from their category's pool via `productImages(categoryId, index)`.

### 12.8 Motion
- Cards lift 2px on hover (`transform: translateY(-2px)`), 150ms.
- Buttons scale to `0.98` on active press.
- Toast fades in from 8px below.
- Keep motion subtle and short — no bouncing, no long transitions.
