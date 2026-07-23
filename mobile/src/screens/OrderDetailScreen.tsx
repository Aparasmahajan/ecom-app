import { useState, useCallback, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import Screen from '../components/Screen';
import { api, Order } from '../lib/api';
import { colors, radii, money } from '../theme';
import { statusStyle } from '../lib/status';

export default function OrderDetailScreen() {
  const route = useRoute<any>();
  const id: string = route.params?.id;
  /** True when we arrived here right after a successful checkout. */
  const justPaid: boolean = !!route.params?.justPaid;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(justPaid);

  const load = useCallback(async () => {
    setLoading(true);
    try { setOrder(await api.orders.get(id)); }
    catch { setOrder(null); }
    finally { setLoading(false); }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Auto-hide the "payment successful" confirmation after a few seconds so
  // it doesn't stick around forever if the user lingers on the order.
  useEffect(() => {
    if (!showSuccess) return;
    const t = setTimeout(() => setShowSuccess(false), 4500);
    return () => clearTimeout(t);
  }, [showSuccess]);

  if (loading) return <Screen><ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} /></Screen>;
  if (!order) return <Screen><Text style={styles.empty}>Order not found.</Text></Screen>;

  const st = statusStyle(order.status);
  const s = order.shipping;

  return (
    <Screen>
      {showSuccess && (
        <View style={styles.successBanner}>
          <Text style={styles.successIcon}>✓</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.successTitle}>Payment successful!</Text>
            <Text style={styles.successSub}>Your order has been placed. We'll ship it shortly.</Text>
          </View>
        </View>
      )}
      <View style={styles.headerRow}>
        <Text style={styles.h1}>#{order.id.slice(-6).toUpperCase()}</Text>
        <View style={[styles.pill, { backgroundColor: st.bg }]}>
          <Text style={[styles.pillText, { color: st.fg }]}>{order.status}</Text>
        </View>
      </View>
      <Text style={styles.meta}>Placed {new Date(order.createdAt).toLocaleString()}</Text>
      <Text style={styles.meta}>Payment: {order.paymentStatus}</Text>

      <Text style={styles.section}>ITEMS</Text>
      {order.items.map((it, i) => (
        <View key={i} style={styles.itemRow}>
          {it.image ? <Image source={{ uri: it.image }} style={styles.img} /> : <View style={styles.img} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{it.productNameSnapshot}</Text>
            <Text style={styles.itemMeta}>Size: {it.size} · Qty: {it.quantity}</Text>
            {!!it.note && <Text style={styles.itemMeta}>{it.note}</Text>}
          </View>
          <Text style={styles.itemPrice}>{money(it.unitPrice * it.quantity)}</Text>
        </View>
      ))}

      <Text style={styles.section}>DELIVERY ADDRESS</Text>
      <View style={styles.card}>
        <Text style={styles.name}>{s.fullName}</Text>
        <Text style={styles.addr}>{s.line1}{s.line2 ? `, ${s.line2}` : ''}</Text>
        <Text style={styles.addr}>{s.city}, {s.state} — {s.pincode}</Text>
        <Text style={styles.addr}>📞 {s.phone}</Text>
      </View>

      <Text style={styles.section}>PAYMENT</Text>
      <View style={styles.card}>
        <Row label="Subtotal" val={money(order.subtotal)} />
        <Row label="Shipping" val="Free" />
        <View style={styles.divider} />
        <Row label="Total" val={money(order.total)} strong />
      </View>
    </Screen>
  );
}

function Row({ label, val, strong }: { label: string; val: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rLabel, strong && { color: colors.text, fontWeight: '800', fontSize: 16 }]}>{label}</Text>
      <Text style={[styles.rVal, strong && { color: colors.accent, fontWeight: '800', fontSize: 16 }]}>{val}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  h1: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radii.pill },
  pillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 6 },
  section: { color: colors.muted, fontSize: 12, letterSpacing: 1, marginTop: 22, marginBottom: 10, fontWeight: '700' },
  itemRow: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: 12, marginBottom: 10 },
  img: { width: 56, height: 56, borderRadius: 8, backgroundColor: colors.card2 },
  itemName: { color: colors.text, fontWeight: '600', fontSize: 14 },
  itemMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  itemPrice: { color: colors.accent, fontWeight: '700', fontSize: 14 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: 16 },
  name: { color: colors.text, fontWeight: '700', fontSize: 14 },
  addr: { color: colors.muted, fontSize: 13, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  rLabel: { color: colors.muted, fontSize: 13 },
  rVal: { color: colors.text, fontSize: 13 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.4)',
    borderRadius: radii.lg, padding: 14, marginBottom: 14
  },
  successIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#22c55e', color: colors.black,
    fontSize: 18, fontWeight: '900',
    textAlign: 'center', lineHeight: 32
  },
  successTitle: { color: '#22c55e', fontWeight: '800', fontSize: 14 },
  successSub:   { color: colors.muted, fontSize: 12, marginTop: 2 }
});
