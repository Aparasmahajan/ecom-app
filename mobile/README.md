# URBAN Clothing Co — Mobile

React Native (Expo) app that mirrors the web version. All data lives on-device
via AsyncStorage (same shape as the web app's localStorage), so no backend is
needed to run it.

## Quick start

```bash
cd mobile
npm install
npx expo start
```

Then either:

- **Expo Go** (fastest): scan the QR code with the Expo Go app on your
  Android/iOS device. Works for everything in this scaffold.
- **Dev build**: required later when we add native modules
  (`react-native-razorpay`, etc.). See CLAUDE.md §3.

## Project layout

```
App.tsx                Root stack + Nav container
src/
  theme.ts             Design tokens (colors, radii, font, money)
  lib/
    types.ts           Domain types (same as web)
    storage.ts         AsyncStorage helpers (K, get, set, scoped, uid)
    seed.ts            Seeds admin + categories + products on first run
    images.ts          Curated Unsplash clothing photos
  state/store.ts       Zustand — session, cart/wish counts
  components/
    Screen.tsx         SafeAreaView + StatusBar wrapper
    Button.tsx         Primary / secondary / dark / danger
    ProductCard.tsx    With heart overlay + HOT tag
    Brand.tsx          URBAN wordmark
  navigation/Tabs.tsx  Bottom tabs: Home / Categories / Wishlist / Cart / Profile
  screens/             HomeScreen, ProductsScreen, ProductDetailScreen,
                       CategoriesScreen, WishlistScreen, CartScreen,
                       ProfileScreen, AuthScreen
```

Design system is locked in `CLAUDE.md §12`.
