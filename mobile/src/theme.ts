/**
 * Design tokens — mirrors CLAUDE.md §12 Design System.
 * Every screen and component must pull from this file.
 */
export const colors = {
  bg: '#0a0a0a',
  bg2: '#111111',
  card: '#1a1a1a',
  card2: '#262626',
  text: '#ffffff',
  muted: '#9ca3af',
  muted2: '#6b7280',
  border: '#2a2a2a',
  border2: '#3a3a3a',
  accent: '#f5c842',
  accentDark: '#8a6d15',
  danger: '#ef4444',
  ok: '#22c55e',
  black: '#000000'
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 20,
  pill: 999
};

export const spacing = (n: number) => n * 4;

export const font = {
  h1: { fontSize: 26, fontWeight: '800' as const, color: colors.text },
  h2: { fontSize: 18, fontWeight: '800' as const, color: colors.text, letterSpacing: 0.5 },
  h3: { fontSize: 15, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 14, color: colors.text },
  meta: { fontSize: 12, color: colors.muted },
  price: { fontSize: 15, fontWeight: '700' as const, color: colors.accent },
  label: { fontSize: 11, color: colors.muted, letterSpacing: 0.5, textTransform: 'uppercase' as const }
};

export const money = (n: number) => '₹' + Number(n).toLocaleString('en-IN');
