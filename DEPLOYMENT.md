# Deployment Guide — URBAN Clothing Co (100% free, no domain needed)

This project is **three separate deliverables**. You do **not** need a domain, a
credit card, or the Play/App Store to ship a working demo — every free host below
gives you a public `*.something.com` subdomain, and the Android app can be handed
out as a downloadable file.

| Piece | What it is | Where it goes | Needs backend? |
|---|---|---|---|
| `ecom-app-web/` | Next.js storefront **+ admin** | Vercel / Netlify (free) | ❌ No — 100% localStorage |
| `backend/` | Spring Boot API + PostgreSQL | Render / Railway (free) | — (it *is* the backend) |
| `mobile/` | Expo React Native app | Built to an **APK** you share | ✅ Yes — talks to the backend |

> **Fastest possible demo:** deploy only `ecom-app-web` to Vercel (5 minutes, no
> backend, no config). That alone is a complete, clickable customer + admin site.
> The mobile app is the only piece that needs the backend online.

---

## Part A — Static website (`ecom-app-web`) → Vercel (free, ~5 min)

This app stores everything in the browser (localStorage), so there is **nothing to
configure** and **no backend to run**. You get a free `your-app.vercel.app` URL.

1. Push this repo to GitHub (if it isn't already).
2. Go to <https://vercel.com> → sign in with GitHub → **Add New → Project**.
3. Import the repo. In project settings set:
   - **Root Directory:** `ecom-app-web`
   - Framework preset: **Next.js** (auto-detected). Build command / output: leave defaults.
4. Click **Deploy**. Done — you get a live URL like `https://urban-clothing.vercel.app`.

**No env vars are required** for this app. (`NEXT_PUBLIC_API_BASE_URL` exists in the
code but the static site never calls a backend.)

Admin access on the live site: triple-click the logo, or long-press the footer
version number for 1.5s → `/admin/login`. Seeded super-admin:
`eparasmahajan@gmail.com` / `Paras@2002`.

**Netlify alternative:** New site from Git → base directory `ecom-app-web` →
build `npm run build` → publish `.next` (or use the Netlify Next.js plugin).

---

## Part B — Backend API (`backend/`) → Render (free)

The mobile app needs this reachable on the public internet. Render deploys the
existing `backend/Dockerfile` directly and gives you a free `*.onrender.com` URL.

### B1. Create a free PostgreSQL database

Pick one (all have a free tier that needs no card):

- **Neon** — <https://neon.tech> (recommended; free DB doesn't expire). Create a
  project, copy the connection string.
- **Supabase** — <https://supabase.com> → Project → Settings → Database → connection string.
- **Render PostgreSQL** — simplest if you're already on Render (note: Render's free
  DB is time-limited; Neon/Supabase last longer).

You need three values from the connection string:
`DB_URL` (JDBC form: `jdbc:postgresql://HOST:5432/DBNAME?sslmode=require`),
`DB_USER`, `DB_PASSWORD`.

> Tip: a typical Neon string is `postgresql://user:pass@host/dbname`. Convert to
> `DB_URL=jdbc:postgresql://host/dbname?sslmode=require` and put `user`/`pass` in
> `DB_USER`/`DB_PASSWORD`.

### B2. Deploy the backend

1. Go to <https://render.com> → **New → Web Service** → connect your GitHub repo.
2. Settings:
   - **Root Directory:** `backend`
   - **Runtime / Environment:** **Docker** (Render auto-detects the `Dockerfile`).
   - **Instance type:** Free.
3. Add **Environment Variables** (Settings → Environment):

   ```
   DB_URL=jdbc:postgresql://<host>/<db>?sslmode=require
   DB_USER=<db user>
   DB_PASSWORD=<db password>
   JWT_SECRET=<paste a long random string, 32+ chars>
   JWT_EXPIRY_MINUTES=1440
   SUPER_ADMIN_USERNAME=you@example.com
   SUPER_ADMIN_PASSWORD=<a strong password>
   ADMIN_MAX_COUNT=100
   CORS_ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:8081,http://localhost:19006
   ```
   Leave `BREVO_API_KEY`, `CLOUDINARY_*`, `RAZORPAY_*` **empty** — the app has safe
   dev fallbacks (OTP is logged instead of emailed, images use a placeholder,
   payment is mocked). It works end-to-end with zero third-party accounts.
4. Deploy. On first boot Flyway runs migrations V1–V5, seeds 15 products + 3 combos,
   and creates your `SUPER_ADMIN`. Verify: open `https://<your-service>.onrender.com/health`
   → should return `{"status":"ok"}`.

> **Generate a JWT secret** (any of these): `openssl rand -base64 48` — or just mash
> 40+ random characters. It must be **≥ 32 bytes** or the app won't start.

**Free-tier gotcha:** Render free web services **sleep after ~15 min idle** and take
~30–60s to cold-start on the next request. The mobile app's first call after idle
will be slow — that's the free tier, not a bug. (Railway / Fly.io free tiers behave
similarly.)

**Where's the OTP in production?** With `BREVO_API_KEY` empty, the 6-digit login code
is printed to the server log, not emailed. Read it in Render → your service → **Logs**
(look for `DEV OTP for ...`). To email real OTPs, create a free Brevo account and set
`BREVO_API_KEY` + `MAIL_FROM`.

**Railway alternative:** New Project → Deploy from Repo → set Root to `backend`,
add the same env vars, add a Railway PostgreSQL plugin (it injects DB vars).

---

## Part C — Mobile app (`mobile/`) → free Android APK

A mobile app isn't "hosted" like a website — you **compile it into an installable
file** that runs on the phone and calls your Part-B backend over the internet. Below
is the free path (no Play Store, no domain).

### C1. Point the app at your deployed backend

The app auto-detects the backend on your LAN during local dev, but a shipped build
must be told the public URL. Two ways — pick one:

- **Env var at build time** (simplest):
  set `EXPO_PUBLIC_API_BASE_URL=https://<your-service>.onrender.com`
- **Hard-code in `mobile/app.json`** under `expo.extra`:
  ```json
  "extra": { "apiBaseUrl": "https://<your-service>.onrender.com" }
  ```

Make sure your Render `CORS_ALLOWED_ORIGINS` doesn't block the app — native apps
don't send an Origin header, so CORS won't affect the built APK (it only matters for
the web/Expo-web).

### C2. Build a free APK with EAS (Expo's cloud builder)

No Android Studio or Mac required — Expo builds it in the cloud on the free tier.

```bash
npm install -g eas-cli
cd mobile
eas login                       # create a free Expo account if needed
eas build:configure             # creates eas.json (one time)
# build an installable APK (the "preview" profile = APK, not a store .aab):
EXPO_PUBLIC_API_BASE_URL=https://<your-service>.onrender.com \
  eas build -p android --profile preview
```

If `eas build:configure` didn't create a `preview` profile, add this to
`mobile/eas.json`:
```json
{
  "build": {
    "preview": { "android": { "buildType": "apk" } },
    "production": {}
  }
}
```

When the build finishes, EAS prints a URL. Open it → **Download** the `.apk`.

### C3. Hand out the APK (free, no store)

- **Direct share:** upload the `.apk` to **GitHub Releases**, Google Drive, or send
  the EAS build link. On the phone: enable **Settings → Apps → Install unknown apps**
  for the browser, open the link, install.
- **QR:** the EAS build page shows a QR that installs the APK directly.

That's a fully working, installable Android app talking to your live backend — at
zero cost.

### C4. Testing without building anything (instant, free)

While developing, you don't need a build at all:
```bash
cd mobile
npx expo start          # scan the QR with the Expo Go app on your phone
```
Your phone and PC must be on the same Wi-Fi; the app auto-finds the backend on your
LAN. (Only works while your PC is running — good for demos, not distribution.)

### C5. If you want the official stores later (not free)

- **Google Play:** one-time **$25** developer fee. Build a store bundle with
  `eas build -p android --profile production` (AAB) and `eas submit -p android`.
- **Apple App Store:** **$99/year** + a Mac/Xcode (or EAS). `eas build -p ios` and
  `eas submit -p ios`. There is **no free way** to put an app on the iOS App Store;
  for free iOS testing use Expo Go (C4) or TestFlight (needs the paid account).

---

## One-glance recap

| Task | Free host | You get | Notes |
|---|---|---|---|
| Static site + admin | Vercel | `*.vercel.app` | No backend, no config |
| Backend API | Render (Docker) | `*.onrender.com` | Sleeps when idle; cold start ~1 min |
| Database | Neon / Supabase | connection string | Free, no card |
| Android app | EAS Build → APK | downloadable `.apk` | Sideload / GitHub Releases |
| iOS app | — | — | Not free ($99/yr); use Expo Go to demo |

## Pre-flight checklist before you deliver

- [ ] `GET https://<backend>/health` returns `{"status":"ok"}`.
- [ ] `JWT_SECRET` is a real 32+ char secret (not the default), and
      `SUPER_ADMIN_PASSWORD` is changed from `Paras@2002`.
- [ ] `CORS_ALLOWED_ORIGINS` includes your Vercel URL (for Expo-web) — harmless to
      leave the localhost entries too.
- [ ] Mobile build has `EXPO_PUBLIC_API_BASE_URL` (or `app.json` → `extra.apiBaseUrl`)
      pointing at the Render URL — **not** localhost.
- [ ] Open the APK on a real phone, sign in via OTP (grab the code from Render logs),
      add to cart, checkout — confirm the order shows in the app's **Orders** screen.
      (The Vercel site is a separate localStorage world and won't show these orders.)
- [ ] (Optional) Add real Brevo / Cloudinary / Razorpay keys only if you want real
      email, image uploads, and payments; otherwise the dev fallbacks are fine.
