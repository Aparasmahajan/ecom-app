# CLAUDE.md

Project context for AI assistants and developers working on this codebase.

---

## 1. Project Overview

A cross-platform e-commerce shop for **URBAN CLOTHING CO** — a generic clothing brand covering Shirts, T-Shirts, Jeans, Hoodies, and Co-ord Sets. Customers browse products, select from admin-defined sizes, add an optional order note, pay online, and track orders. An **ADMIN** manages the catalog, "hot seller" listings, sizes/stock, product ratings and orders. A single **SUPER_ADMIN** additionally manages other admin accounts.

**Platforms:** Android + iOS (React Native / Expo) **and** the web storefront (Next.js). Both talk to the same Spring Boot REST API.

**Repository layout**
```
ecom-app/
├── docker-compose.yml     boots db + backend + web
├── .env.example
├── backend/               Spring Boot 3 REST API (Java 17)
├── static/                Next.js 14 web storefront + admin
└── mobile/                Expo React Native app
```
Run the entire stack with `docker compose up --build`. See top-level [README.md](README.md) for details.

**"Custom order" scope (confirmed):** the shop takes custom clothing orders, but customization on the app is limited to **choosing an admin-listed size + quantity + an optional free-text note**. There are **no** customer body-measurement forms and **no** customer image/reference uploads. (This keeps the data model simple and means Cloudinary is used for admin product images only.)

---

## 2. Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Mobile app | React Native via **Expo (dev build / prebuild)** | Customer-facing only — no admin surface exposed on the store-facing Android build |
| Web app | **Next.js 14** (App Router, TypeScript) | Serves the storefront **and** the admin panel; talks to the same REST API |
| Backend | Spring Boot 3 (Java 17) | REST API. Package layout in §4 |
| Database | **PostgreSQL 16** | Chosen for search (`tsvector` + `pg_trgm`). Managed via **Flyway** migrations |
| Auth | JWT (access token) + optional email OTP | Users: email OTP. Admin / super admin: email + password (bcrypt). See §6 |
| Email/OTP | **Brevo** (Sendinblue) | Optional — dev fallback logs OTP to backend console. See §7 |
| Image hosting | **Cloudinary** | Optional — dev fallback returns an Unsplash placeholder URL. See §7 |
| Payments | Razorpay | Optional — dev fallback mocks the order id and skips signature verification. See §7 |
| Local orchestration | **Docker Compose** | Three services (`db`, `backend`, `web`) — one command boots everything. See §13 |
| Backend hosting | Render / Railway (free tier) | Same Dockerfile works there |

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

**Screen map (mobile — customer only)**
- Splash / Onboarding
- **Home / Landing** — hero + horizontal category chip strip (Shirts / T-Shirts / Jeans / Hoodies / Co-ord Sets) + Trending Now + New Arrivals
- **Categories** — full-width dark banner cards, one per category
- Product listing (filter by category via pill chips + search)
- **Product detail** — image gallery, color swatches, size selector (admin-defined variants), quantity, optional note, `ADD TO CART` + `BUY NOW`, ratings + reviews
- Cart · Wishlist
- **Checkout** — pick default address → server creates order → mock/real Razorpay payment (**login required**)
- Order history + order detail
- Profile — user info, **address book (multiple addresses)**, stats (Orders / Wishlist / Addresses)
- Auth — email → 6-digit OTP → JWT
- **No admin panel** — admin is web-only. The mobile app never exposes an admin login.

**Screen map (web — customer + admin)**
- All customer screens above (as pages under `/`, `/products`, `/cart`, `/orders`, etc.)
- **Hidden admin entry**: long-press the version number in the footer for 1.5s, or triple-click the logo → `/admin/login`
- **Admin panel** at `/admin` — three tabs:
  - **Orders** — search / filter by status / sort / open detail drawer / change status / add tracking / add admin notes / cancel / refund
  - **Products** — CRUD, toggle hot seller, override rating
  - **Admins** — SUPER_ADMIN only: create / list / enable-disable / reset-password / delete admin accounts

---

## 4. Backend (Spring Boot)

**Package layout**
```
com.shop.app
|-- ShopAppApplication.java       seeds SUPER_ADMIN on boot
|-- config/SecurityConfig.java    JWT filter chain, CORS, URL role rules
|-- common/                       ApiError, GlobalExceptionHandler, SecurityService (DB-fresh role check), HealthController
|-- auth/                         OTP + JWT + admin login + JwtAuthFilter + UserPrincipal
|-- user/                         User + /me + AdminUserController (super-admin-only admin CRUD)
|-- address/                      multiple addresses per user
|-- catalog/                      Category + Product + ProductVariant + CatalogController + AdminCatalogController
|-- cart/                         CartController + entity
|-- wishlist/
|-- order/                        Order + OrderItem + OrderService + OrderController + AdminOrderController
|-- payment/                      RazorpayService (HMAC-SHA256 verify) + PaymentController
|-- review/
|-- integrations/                 BrevoEmailService + CloudinaryService  (dev fallbacks when creds missing)
```

### Core entities

Full schema in [`backend/src/main/resources/db/migration/V1__init_schema.sql`](backend/src/main/resources/db/migration/V1__init_schema.sql) + later versioned migrations.

**User** — `id, email (unique), passwordHash (bcrypt, nullable for USER), name, phone, role, enabled, createdAt`
> `role ∈ { USER, ADMIN, SUPER_ADMIN }` — enforced at the DB level by a `CHECK` constraint (V3). At most **one** `SUPER_ADMIN` — enforced by a partial unique index in V3.

**Address** — `id, userId(FK), fullName, phone, line1, line2, city, state, pincode, isDefault, createdAt`
> A user can have multiple addresses; exactly one `isDefault` — enforced by a partial unique index on `(userId) WHERE isDefault`.

**Category** — `id, name, gender, ageGroup, emoji, imageUrl`

**Product** — `id, name, description, categoryId(FK), gender, ageGroup, basePrice, images text[], isHotSeller, adminRatingOverride (nullable), searchVector (tsvector, auto-maintained by trigger), createdAt, updatedAt`
> `effectiveRating` is computed at read-time in the API layer (admin override wins; else avg of user reviews rounded to 1 decimal).

**ProductVariant** — `id, productId(FK), size, color, stock, priceModifier, createdAt`
> Sizes are **defined by the admin** per product. Customers pick from these; they do not enter custom sizes/measurements. UNIQUE `(productId, size, color)`.

**WishlistItem** — `id, userId(FK), productId(FK)` (unique pair)

**CartItem** — `id, userId(FK), variantId(FK), quantity, note, createdAt, updatedAt`

**Order** — `id, userId(FK), addressId(FK), status, paymentStatus, subtotal, total, razorpayOrderId, razorpayPaymentId, razorpaySignature, trackingNumber (nullable), adminNotes (private), cancelReason (nullable), shipping snapshot columns (shipFullName / shipPhone / shipLine1 / shipLine2 / shipCity / shipState / shipPincode), createdAt, updatedAt (auto-bumped by trigger — V4)`
> `status ∈ { CREATED, PAID, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED }` — REFUNDED added in the admin flow.

**OrderItem** — `id, orderId(FK), productId(FK), variantId(FK), productNameSnapshot, size, quantity, unitPrice, note, image`

**Review** — `id, userId(FK), productId(FK), stars (1-5), comment, adminOverrideStars (nullable), createdAt` (unique `userId+productId`)

**OtpToken** — `id, email, otpHash (bcrypt), expiresAt, attempts, verified, createdAt`

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

Auth model: everything under `/admin/**` requires role `ADMIN` **or** `SUPER_ADMIN`, plus a fresh DB role re-check via `@PreAuthorize("@sec.isAdmin(authentication)")`. Endpoints under `/admin/admins/**` require `SUPER_ADMIN` (URL rule **plus** `@PreAuthorize("@sec.isSuperAdmin(...)")`). See §6 and §14.

```
# Auth (public)
POST /auth/otp/request      { email }                              -> sends OTP via Brevo (dev: logs to backend console)
POST /auth/otp/verify       { email, otp }                         -> { token, user }  (auto-creates USER on first verify)
POST /auth/register         { email, password(>=8), name, phone? } -> { token, user }  (creates USER; 400 if email already registered; auto-login)
POST /auth/login            { email, password }                    -> { token, user }  (password login; email must be registered + have a password)
POST /auth/password/forgot  { email }                              -> sends reset OTP — 400 if email not registered
POST /auth/password/reset   { email, otp, newPassword(>=8) }       -> { status: "reset" }  (verifies OTP, sets new password)
POST /auth/admin/login      { username, password }                 -> { token, user }  (ADMIN or SUPER_ADMIN, no OTP)

# Health (public)
GET  /health                                                       -> { status: "ok" }

# User (auth required)
GET  /me
PUT  /me                    { name?, phone? }

# Address book (auth required)
GET    /me/addresses
POST   /me/addresses        { fullName, phone(10-digit), line1, line2?, city, state, pincode(6-digit), isDefault? }
PUT    /me/addresses/{id}   (same shape)
DELETE /me/addresses/{id}
PUT    /me/addresses/{id}/default

# Catalog (public)
GET  /categories
GET  /products?gender=&ageGroup=&categoryId=&hotSeller=&q=          # q -> tsvector + trigram fuzzy match
GET  /products/{id}

# Wishlist (auth required)
GET    /wishlist                                                   -> list of Product with effectiveRating
POST   /wishlist/{productId}
DELETE /wishlist/{productId}

# Cart (auth required) — items are returned denormalized with product name / image / unit price
GET    /cart
POST   /cart                { variantId, quantity(>=1), note }
PUT    /cart/{itemId}       { quantity, note? }
DELETE /cart/{itemId}

# Orders + Payment (auth required)
POST /orders                 { addressId, fromCart?: true } | { addressId, items: [{ variantId, quantity, note? }, ...] }
                             -> creates Order + Razorpay order id + snapshots address; reserves stock; clears cart if fromCart
POST /payment/verify         { razorpayOrderId, razorpayPaymentId, signature }
                             -> HMAC-SHA256 verify against RAZORPAY_KEY_SECRET; on success sets status/paymentStatus = PAID
GET  /orders                 -> current user's orders, newest first
GET  /orders/{id}            -> single order (ownership-checked)

# Reviews
GET  /products/{id}/reviews  (public)
POST /products/{id}/reviews  { stars(1-5), comment }  (auth required — one review per user per product; a second POST edits)

# ---- ADMIN — role: ADMIN or SUPER_ADMIN ----
# Products
POST   /admin/products                        { name, description?, categoryId, basePrice, images?, hotSeller?, gender?, ageGroup? }
PUT    /admin/products/{id}                   (partial updates allowed)
DELETE /admin/products/{id}
PUT    /admin/products/{id}/hot-seller        { isHotSeller: bool }
PUT    /admin/products/{id}/rating-override   { stars: 0..5 | null }

# Variants
POST   /admin/products/{productId}/variants   { size, color?, stock, priceModifier? }
PUT    /admin/variants/{id}                   (same shape)
DELETE /admin/variants/{id}

# Image uploads (Cloudinary — dev fallback returns a placeholder URL)
POST   /admin/uploads                         (multipart/form-data, field "files")

# Orders
GET    /admin/orders                          -> every order, newest first, joined with customer name/email
GET    /admin/orders/{id}
PUT    /admin/orders/{id}/status              { status: CREATED|PAID|PROCESSING|SHIPPED|DELIVERED|CANCELLED|REFUNDED }
PUT    /admin/orders/{id}/tracking            { trackingNumber }   # auto-advances status to SHIPPED if currently CREATED/PAID/PROCESSING
PUT    /admin/orders/{id}/notes               { notes }            # private admin notes; never surfaced to customer
PUT    /admin/orders/{id}/cancel              { reason }           # sets status=CANCELLED + cancelReason (blocks if already DELIVERED)
PUT    /admin/orders/{id}/refund              { reason }           # sets status=REFUNDED + paymentStatus=REFUNDED (only if PAID)

# ---- SUPER_ADMIN-only ----
GET    /admin/admins                          -> all ADMIN + SUPER_ADMIN accounts
POST   /admin/admins                          { email, name, password(>=8), phone? }
                                              # 400 if current ADMIN count >= ADMIN_MAX_COUNT
PUT    /admin/admins/{id}/password            { password(>=8) }
PUT    /admin/admins/{id}/enabled             { enabled: bool }
                                              # blocks disabling SUPER_ADMIN or self
DELETE /admin/admins/{id}
                                              # blocks deleting SUPER_ADMIN or self
```

All errors return `{ code, message }` (HTTP 4xx/5xx). See `GlobalExceptionHandler`.

---

## 6. Auth Rules

### Users
- **Login required to place an order** (no guest checkout). Browsing, search, and viewing products are open; cart → checkout requires a logged-in user.
- Two login methods for `USER`:
  1. **Email OTP** (`/auth/otp/request` → `/auth/otp/verify`) — passwordless. First successful verify auto-creates a `USER` row (name defaults to the email local-part) — no separate signup step.
  2. **Email + password** (`/auth/register` then `/auth/login`) — `register` creates a `USER` with a bcrypt password and rejects an already-registered email (each address is registered exactly once); `login` requires the email to be registered **and** to have a password set. OTP-only accounts have no password until they set one via the reset flow.
- **Forgot / reset password via OTP**: `/auth/password/forgot` sends a reset OTP but **only to a registered email** (400 otherwise); `/auth/password/reset` verifies the OTP and sets the new password. Reuses the same OTP-token table + limits as OTP login.
- OTP storage: only an OTP hash + expiry (10 min, configurable via `app.otp.ttl-minutes`). Max 5 attempts per OTP. Rate-limit OTP requests per email to protect the free quota.
- Password rules: minimum 8 chars, stored as bcrypt (same encoder as admin passwords). Generic "invalid credentials" on login failure — no user enumeration.
- JWT lifetime is 24 h by default (`JWT_EXPIRY_MINUTES=1440`).

### Role hierarchy — `USER` < `ADMIN` < `SUPER_ADMIN`

| Role | How they log in | What they can do |
|---|---|---|
| `USER` | Email OTP (`/auth/otp/verify`) **or** email + password (`/auth/register` → `/auth/login`); reset via OTP (`/auth/password/forgot` → `/auth/password/reset`) | Browse, buy, review, manage own cart / wishlist / addresses / orders |
| `ADMIN` | Email + password (`/auth/admin/login`) | Everything under `/admin/**` except `/admin/admins/**` — catalog CRUD, hot seller, rating override, orders (status, tracking, notes, cancel, refund), image uploads |
| `SUPER_ADMIN` | Same as ADMIN | Everything ADMIN can do **plus** `/admin/admins/**` — create / disable / delete / password-reset other admins |

Rules:
- **At most one `SUPER_ADMIN`** — seeded on first boot from `SUPER_ADMIN_USERNAME` / `SUPER_ADMIN_PASSWORD`. Enforced by the seeder (idempotent), by app logic (there is no endpoint that creates a SUPER_ADMIN), and by a partial unique DB index (V3 migration).
- **Up to `ADMIN_MAX_COUNT` admins** (default 100, was 3 originally). Enforced in `AdminUserController.create`.
- The SUPER_ADMIN cannot be deleted or disabled through any API. No one can delete or disable themselves.

### Admin access UX — hidden entry
- Admin is **web-only**. The mobile app does not expose an admin login (no long-press toggle, no admin route).
- On the web, reveal the admin login by **long-pressing the version number in the footer for 1.5s**, or triple-clicking the logo — both route to `/admin/login`.

> WARNING: Never gate admin power on the hidden gesture alone. Security-through-obscurity is unsafe. The real protection is the two-layer server-side check described in §14.

### Where auth is enforced
1. **`JwtAuthFilter`** parses `Authorization: Bearer …` and puts a `UserPrincipal { id, email, role }` into the SecurityContext. Invalid / expired tokens produce no principal (anonymous).
2. **URL rules** in `SecurityConfig`:
   - `/admin/admins/**` → `hasRole("SUPER_ADMIN")`
   - `/admin/**`        → `hasAnyRole("ADMIN", "SUPER_ADMIN")`
   - `/me/**`, `/cart/**`, `/wishlist/**`, `/orders/**`, `/payment/**`, `/products/*/reviews` (POST) → `authenticated()`
   - `/auth/**`, `/categories`, `/products`, `/products/*`, `/products/*/reviews` (GET), `/health` → public
3. **Method-level `@PreAuthorize`** on every admin controller class re-checks the role from a **fresh DB read** via `SecurityService`. A JWT issued while the user had ADMIN role stops working the instant the SUPER_ADMIN demotes / disables them — no waiting for token expiry.

---

## 7. Third-Party Integrations

All three integrations are **optional** — if the corresponding env vars are empty, the backend falls back to a safe dev behavior so the whole flow still works end-to-end. See §17 for the full dev-mode matrix.

**Email OTP: Brevo (chosen over Gmail SMTP)**
- Brevo free tier: 300 emails/day, purpose-built for transactional email, provides an API + delivery logs, and does not risk your personal inbox.
- Gmail SMTP free tier: only ~100 automated emails/day via SMTP, plus invisible behavioral throttling that can block sends far below the cap, and repeated automated OTP sending can get a personal Gmail suspended. Acceptable for local dev only.
- Implementation: send a 6-digit OTP on `/auth/otp/request`; store hash + expiry; verify on `/auth/otp/verify`. Set up SPF/DKIM in Brevo for deliverability.
- **Dev fallback**: when `BREVO_API_KEY` is empty, `BrevoEmailService.sendOtp` logs the OTP to the backend console: `>>> DEV OTP for you@example.com = 483726`. Copy it from `docker logs urban-backend`.

**Cloudinary (images only)**
- Admin product images. Backend uploads via Cloudinary Java SDK; store the returned secure URL on the `Product`.
- Use Cloudinary transformation URLs to serve right-sized images to the app (helps performance).
- Generous free tier. **It cannot send email/OTP.**
- **Dev fallback**: when Cloudinary env vars are empty, `CloudinaryService.upload` returns a placeholder Unsplash URL so the API contract still works.

**Razorpay (payments)**
- Server creates a Razorpay order (amount in paise) → returns `razorpayOrderId` to the client.
- Client opens Razorpay checkout via `react-native-razorpay` (mobile) or Razorpay Web Checkout (web).
- On success, client sends `paymentId` + `signature` to `/payment/verify`.
- **Server verifies the signature** (HMAC-SHA256 with the key secret) before marking the order `PAID`. Never trust client-reported success alone.
- Use Razorpay **test mode** during development.
- **Dev fallback**: when `RAZORPAY_KEY_ID` is empty, `RazorpayService.createOrder` returns a mock `order_dev_…` id and `verifySignature` is skipped. The mobile app + web checkout post `signature: "dev"` and get back a PAID order — end-to-end works without a Razorpay account.

**Seed data (Unsplash product photos)**
- The V2 Flyway migration seeds 5 categories + 15 products with **real clothing photos** from `images.unsplash.com`. Same photo pool is mirrored in `static/lib/images.ts` and `mobile/src/lib/images.ts` so the same product looks identical across all three surfaces. Never use random placeholder services (picsum, placeholder.com) for user-visible art.

---

## 8. Environment Variables

Copy `.env.example` to `.env` at the repo root — `docker compose` picks it up automatically.

**Database (used by db + backend containers)**
```
POSTGRES_DB=urban
POSTGRES_USER=urban
POSTGRES_PASSWORD=urban_dev_pw
POSTGRES_PORT=5432
```

**Backend**
```
BACKEND_PORT=8080
JWT_SECRET=…strong random ≥32 bytes…
JWT_EXPIRY_MINUTES=1440

# Seeded on first boot. Idempotent — won't overwrite an existing SUPER_ADMIN.
SUPER_ADMIN_USERNAME=eparasmahajan@gmail.com
SUPER_ADMIN_PASSWORD=Paras@2002

# Max number of ADMIN accounts the SUPER_ADMIN can create (SUPER_ADMIN not counted).
ADMIN_MAX_COUNT=100

# Comma-separated origins allowed to hit the API.
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:19006

# All three optional — see §7 dev fallbacks.
BREVO_API_KEY=
MAIL_FROM=no-reply@urban.local
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

**Frontend (web — Next.js)**
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_RAZORPAY_KEY_ID=      # public key id only — never the secret
WEB_PORT=3000
```

**Frontend (mobile — Expo)**
- No `.env` required in dev — the API URL is auto-detected from Metro's LAN host (`Constants.expoConfig.hostUri`), so Expo Go on a phone can reach the backend on your PC as `http://<pc-lan-ip>:8080` without config.
- Optional overrides:
  - `EXPO_PUBLIC_API_BASE_URL` env var at build time
  - `app.json → expo.extra.apiBaseUrl` for a hard-coded value

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
3. Admin auth: **email + password + hidden gesture (web only)**, protected by URL rule *and* DB-fresh `@PreAuthorize`. No OTP.
4. Database: **PostgreSQL** with Flyway migrations (best for search — full-text + `pg_trgm` fuzzy matching).
5. Checkout: **login required** (no guest checkout).
6. Framework: **Expo dev build** (mobile) + **Next.js 14 App Router** (web). Same REST API backs both.
7. Roles: `USER` < `ADMIN` (many, capped) < `SUPER_ADMIN` (exactly one). Mobile is customer-only.
8. Admin management: only SUPER_ADMIN can create / disable / delete other admins. SUPER_ADMIN cannot be demoted or deleted through the API.
9. Order lifecycle includes `REFUNDED` distinct from `CANCELLED`. Orders carry a `trackingNumber`, `adminNotes` (private), and `cancelReason` (customer-visible).
10. All three third-party integrations (Brevo / Cloudinary / Razorpay) are **optional** — dev-mode fallbacks let the whole flow run without any external accounts.

## 11. Open / Future Considerations
- Order notifications (email via Brevo, or push via Expo Notifications) — confirm if needed for MVP.
- Wiring the real Razorpay SDK on the server (`com.razorpay:razorpay-java`) and using the native module on mobile — currently mocked in dev.
- Server-side pagination for `/admin/orders` and `/products` once the catalog / order log grows past a few thousand rows.

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

### 12.9 Admin panel — responsive orders
The admin orders page (`static/app/admin/AdminOrders.tsx`) must be responsive:
- **Desktop / tablet (>768px)**: proper 7-column `<table>` — Order (+ tracking sub-line), Customer (name + email), Items, Total, Status, Payment, Placed.
- **Mobile (≤768px)**: table hides; a stack of `.ao-card` cards renders instead. Each card shows order id + total on top row, customer + status pill middle, items + timestamp bottom.
- Both variants open the same **detail drawer** (`.ao-modal`) with: status pipeline buttons (Mark next / Cancel / Refund), status dropdown, customer info, shipping snapshot, tracking input, cancel/refund reason input, item list, payment ids, admin notes textarea.
- Above the list: search input (order id / customer / tracking), sort dropdown (Newest / Oldest / Highest / Lowest total), horizontally-scrolling status chip strip with per-status counts.
- Status pill for `REFUNDED` uses purple (`rgba(168,85,247,0.15)` / `#c084fc`).

---

## 13. Full-Stack Architecture

Three Docker services in [`docker-compose.yml`](docker-compose.yml):

```
┌────────────────┐   ┌────────────────────┐   ┌────────────────┐
│  db (postgres) │◀──│ backend (spring)   │◀──│ web (next.js)  │
│  :5432         │   │ :8080              │   │ :3000          │
└────────────────┘   └────────────────────┘   └────────────────┘
                              ▲
                              │  (LAN)
                     ┌────────────────┐
                     │ mobile (Expo)  │
                     │ on device      │
                     └────────────────┘
```

- **db** — `postgres:16-alpine` with a healthcheck; `pg_trgm` + `uuid-ossp` extensions enabled by Flyway V1. Data persists in the `db_data` volume.
- **backend** — multi-stage Dockerfile (Maven builder → JRE runtime), waits for db healthcheck. Runs Flyway migrations V1..V4 on startup, then seeds SUPER_ADMIN if absent. Exposes `/health`.
- **web** — multi-stage Node build → `npm start`. Reads `NEXT_PUBLIC_API_BASE_URL` at build time.
- **mobile** — not containerized. `cd mobile && npx expo start` on the dev machine; the phone (Expo Go) reaches the backend on the LAN.

Bring the whole stack up with:
```bash
cp .env.example .env      # first time only
docker compose up --build
```

**Flyway migration order**:
- V1 — full schema (users, addresses, categories, products, product_variants, cart_items, wishlist_items, orders, order_items, reviews, otp_tokens) + tsvector trigger + trigram indexes.
- V2 — seed 5 categories + 15 products with Unsplash image URLs; auto-derive variants per category.
- V3 — role check constraint `CHECK (role IN ('USER','ADMIN','SUPER_ADMIN'))` + partial unique index enforcing at most one SUPER_ADMIN.
- V4 — order fields: `tracking_number`, `admin_notes NOT NULL DEFAULT ''`, `cancel_reason`; `trg_orders_updated_at` trigger to auto-bump `updated_at`.

---

## 14. Security Model (defense in depth)

Admin endpoints are gated at **three** layers:

1. **JWT signature + expiry** (`JwtAuthFilter`) — an unauthenticated or tampered request has no principal and is rejected by (2).
2. **URL role rule** (`SecurityConfig`) — Spring Security matches the request URL against `hasRole` / `hasAnyRole`. Fast, per-request. Runs before the controller is dispatched.
3. **DB-fresh `@PreAuthorize`** on every admin controller class — calls `SecurityService.isAdmin(auth)` or `.isSuperAdmin(auth)`, which fetches the current `User` row and checks `role` + `enabled`. This is the layer that revokes a demoted admin's stale JWT immediately.

Layout in code:
```
config/SecurityConfig.java
    /admin/admins/**  →  hasRole("SUPER_ADMIN")
    /admin/**         →  hasAnyRole("ADMIN", "SUPER_ADMIN")

common/SecurityService.java  (@Component("sec"))
    boolean isAdmin(Authentication)       -> DB re-check role ∈ {ADMIN, SUPER_ADMIN} && enabled
    boolean isSuperAdmin(Authentication)  -> DB re-check role == SUPER_ADMIN && enabled

catalog/AdminCatalogController          @PreAuthorize("@sec.isAdmin(authentication)")
order/AdminOrderController              @PreAuthorize("@sec.isAdmin(authentication)")
user/AdminUserController                @PreAuthorize("@sec.isSuperAdmin(authentication)")
```

Additional guarantees:
- `AdminUserController.create` enforces `count(ADMIN) < ADMIN_MAX_COUNT`.
- `AdminUserController.delete` / `.setEnabled` reject the SUPER_ADMIN and reject the caller acting on themselves.
- Ownership checks in every user-scoped controller (`CartController`, `AddressController`, `OrderController`, `WishlistController`) — resources fetched from the repo are rejected if `resource.userId != principal.id`.
- Order snapshots — every `OrderItem` snapshots product name + unit price at purchase time; every `Order` snapshots the shipping address inline (`ship_*` columns) so historical orders never change if the catalog / address book is edited later.

---

## 15. Frontend API Clients

The web and mobile apps talk to the backend through a **thin, typed `fetch` wrapper** — same shape on both surfaces:

| File | Notes |
|---|---|
| [`static/lib/api.ts`](static/lib/api.ts)   | JWT persisted in `localStorage` (key `cw_token`). Reads `NEXT_PUBLIC_API_BASE_URL`, defaults to `http://localhost:8080`. |
| [`mobile/src/lib/api.ts`](mobile/src/lib/api.ts) | JWT persisted in `AsyncStorage`. **Auto-detects** the dev host from Metro's `Constants.expoConfig.hostUri` so Expo Go on a physical phone reaches the backend on the PC over LAN without config. |

Both expose exactly one shape:
```ts
api.auth.{ requestOtp, verifyOtp, adminLogin }
api.me.{ get, update, addresses.{ list, create, update, makeDefault, remove } }
api.catalog.{ categories, products, product }
api.cart.{ list, add, update, remove }
api.wishlist.{ list, add, remove }
api.orders.{ create, list, get }
api.payment.{ verify }
api.reviews.{ list, create }
api.admin.products.{ create, update, remove, setHotSeller, setRatingOverride }
api.admin.variants.{ add, update, remove }
api.admin.orders.{ list, get, setStatus, setTracking, setNotes, cancel, refund }
api.admin.admins.{ list, create, resetPassword, setEnabled, remove }   // web only, SUPER_ADMIN
```

Errors are thrown as `ApiError { status, code, message }` so any UI can render `err.message` directly.

State layer:
- **Web**: `static/lib/context.tsx` — a React context provider that hydrates `user` via `GET /me` and `{cartCount, wishCount}` via `GET /cart` + `GET /wishlist` on mount and after any mutation.
- **Mobile**: `mobile/src/state/store.ts` — Zustand store with the same `{user, cartCount, wishCount, refresh, signIn, signOut}` surface.

Nothing else in the frontends touches persistence directly. All the old localStorage / AsyncStorage helpers were deleted when the migration completed.

---

## 16. Order Lifecycle

```
             ┌── CANCELLED (reason) ──┐
             │                        │
CREATED ──→ PAID ──→ PROCESSING ──→ SHIPPED ──→ DELIVERED
             │                                     │
             └────────────→ REFUNDED (reason) ◀────┘
```

- `CREATED` — order row exists; Razorpay order id issued; stock reserved (variants decremented in the same transaction). Never marked PAID until `/payment/verify` succeeds.
- `PAID` — signature verified. `paymentStatus = PAID`.
- `PROCESSING` — admin marks it in the panel.
- `SHIPPED` — admin marks it, **or** admin sets a `trackingNumber` while status is CREATED/PAID/PROCESSING (auto-advance).
- `DELIVERED` — admin marks it. Cannot be cancelled after this — must refund.
- `CANCELLED` — admin cancels with `reason`. Blocked once DELIVERED.
- `REFUNDED` — admin refunds with `reason`. Requires `paymentStatus == PAID`. Sets `paymentStatus = REFUNDED` too.

---

## 17. Dev Mode Fallbacks

The whole stack must run **without any third-party accounts**. Each optional integration has a well-defined dev fallback:

| Env vars empty | Behavior | Where to look |
|---|---|---|
| `BREVO_API_KEY` | `BrevoEmailService.sendOtp` logs `>>> DEV OTP for {email} = {code}` and returns. Nothing is emailed. | `docker logs urban-backend` |
| `CLOUDINARY_*` | `CloudinaryService.upload` returns a placeholder Unsplash URL, does not touch Cloudinary. | Response of `POST /admin/uploads` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | `RazorpayService.createOrder` returns `order_dev_{uuid}`; `verifySignature` no-ops. `/payment/verify` accepts any signature and marks the order PAID. | `RazorpayService.java` |

Frontends are aware of this — the web checkout and mobile cart send `signature: "dev"` so the flow completes end-to-end. When real Razorpay creds are supplied, the same code path performs real HMAC-SHA256 verification.

**Reset the database** (e.g. after changing seeded creds or bumping a migration): `docker compose down -v` deletes the `db_data` volume; the next `docker compose up --build` reruns V1..V4 and reseeds SUPER_ADMIN + catalog fresh.
