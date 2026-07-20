import { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Screen from '../components/Screen';
import { api, Order } from '../lib/api';
import { colors, radii, money } from '../theme';
import { useApp } from '../state/store';
import { statusStyle } from '../lib/status';

export default function OrdersScreen() {
  const user = useApp(s => s.user);
  const nav = useNavigation<any>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setOrders([]); setLoading(false); return; }
    setLoading(true);
    try { setOrders(await api.orders.list()); }
    catch { setOrders([]); }
    finally { setLoading(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!user) {
    return <Screen><Text style={styles.h1}>MY ORDERS</Text><Text style={styles.empty}>Sign in to see your orders.</Text></Screen>;
  }

  return (
    <Screen>
      <Text style={styles.h1}>MY ORDERS</Text>
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : orders.length === 0 ? (
        <Text style={styles.empty}>You haven&apos;t placed any orders yet.</Text>
      ) : (
        orders.map(o => {
          const st = statusStyle(o.status);
          const count = o.items.reduce((a, i) => a + i.quantity, 0);
          return (
            <Pressable key={o.id} style={styles.card} onPress={() => nav.navigate('OrderDetail', { id: o.id })}>
              <View style={styles.rowTop}>
                <Text style={styles.oid}>#{o.id.slice(-6).toUpperCase()}</Text>
                <View style={[styles.pill, { backgroundColor: st.bg }]}>
                  <Text style={[styles.pillText, { color: st.fg }]}>{o.status}</Text>
                </View>
              </View>
              <Text style={styles.meta}>{new Date(o.createdAt).toLocaleDateString()} · {count} item{count === 1 ? '' : 's'}</Text>
              <View style={styles.rowBottom}>
                <Text style={styles.total}>{money(o.total)}</Text>
                <Text style={styles.chev}>View details ›</Text>
              </View>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: 1, marginBottom: 16 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: 16, marginBottom: 12 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  oid: { color: colors.text, fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radii.pill },
  pillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 6 },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  total: { color: colors.accent, fontWeight: '800', fontSize: 16 },
  chev: { color: colors.muted, fontSize: 13 }
});
