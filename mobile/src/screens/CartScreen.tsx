import { useState, useCallback } from 'react';
import { View, Text, Image, StyleSheet, Alert, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Screen from '../components/Screen';
import Button from '../components/Button';
import { api, ApiError, CartItem, Address } from '../lib/api';
import { colors, radii, money } from '../theme';
import { useApp } from '../state/store';

export default function CartScreen() {
  const user = useApp(s => s.user);
  const refresh = useApp(s => s.refresh);
  const nav = useNavigation<any>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setCart([]); setLoading(false); return; }
    setLoading(true);
    try { setCart(await api.cart.list()); }
    catch { setCart([]); }
    finally { setLoading(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const change = async (id: string, note: string, next: number) => {
    if (next < 1) return;
    try {
      await api.cart.update(id, next, note);
      await load();
      await refresh();
    } catch { Alert.alert('Failed'); }
  };
  const rm = async (id: string) => {
    try {
      await api.cart.remove(id);
      await load();
      await refresh();
    } catch { Alert.alert('Failed'); }
  };

  const subtotal = cart.reduce((a, i) => a + i.unitPrice * i.quantity, 0);

  const checkout = async () => {
    try {
      const addrs = await api.me.addresses.list();
      const def = addrs.find((a: Address) => a.isDefault) || addrs[0];
      if (!def) {
        Alert.alert('No address', 'Add a delivery address in Profile first.');
        return;
      }
      const order = await api.orders.create({ addressId: def.id, fromCart: true });
      await api.payment.verify({
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId: 'pay_mobile_' + Date.now(),
        signature: 'dev'
      });
      await refresh();
      Alert.alert('Payment successful!', 'Your order was placed.', [
        { text: 'OK', onPress: () => nav.navigate('Root', { screen: 'Home' }) }
      ]);
    } catch (e) {
      Alert.alert('Checkout failed', e instanceof ApiError ? e.message : (e as Error).message);
    }
  };

  if (!user) {
    return (
      <Screen>
        <Text style={styles.h1}>MY CART</Text>
        <Text style={styles.empty}>Sign in to see your cart.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.h1}>MY CART</Text>
      <Text style={styles.count}>{cart.length} Items</Text>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : cart.length === 0 ? (
        <Text style={styles.empty}>Your cart is empty.</Text>
      ) : (
        <>
          {cart.map(item => (
            <View key={item.id} style={styles.row}>
              <Image source={{ uri: item.productImages[0] }} style={styles.img} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.productName}</Text>
                <Text style={styles.meta}>Size: {item.size} · {item.note}</Text>
                <Text style={styles.price}>{money(item.unitPrice)}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <Pressable style={styles.qBtn} onPress={() => change(item.id, item.note, item.quantity - 1)}>
                    <Text style={{ color: colors.text }}>−</Text>
                  </Pressable>
                  <Text style={{ color: colors.text, minWidth: 20, textAlign: 'center' }}>{item.quantity}</Text>
                  <Pressable style={styles.qBtn} onPress={() => change(item.id, item.note, item.quantity + 1)}>
                    <Text style={{ color: colors.text }}>+</Text>
                  </Pressable>
                  <Pressable onPress={() => rm(item.id)} style={{ marginLeft: 10 }}>
                    <Text style={{ color: colors.danger, fontSize: 12 }}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}

          <View style={styles.summary}>
            <View style={styles.summaryRow}><Text style={styles.sLabel}>Subtotal</Text><Text style={styles.sVal}>{money(subtotal)}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.sLabel}>Shipping</Text><Text style={styles.sVal}>Free</Text></View>
            <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 6 }]}>
              <Text style={styles.total}>Total</Text><Text style={[styles.total, { color: colors.accent }]}>{money(subtotal)}</Text>
            </View>
            <Button title="PROCEED TO CHECKOUT" onPress={checkout} style={{ marginTop: 14 }} />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  count: { color: colors.muted, fontSize: 12, marginBottom: 16 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
  row: { flexDirection: 'row', gap: 12, padding: 12, backgroundColor: colors.card, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  img: { width: 72, height: 72, borderRadius: 10 },
  name: { color: colors.text, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  price: { color: colors.accent, fontWeight: '700', marginTop: 4 },
  qBtn: { width: 26, height: 26, borderRadius: 6, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  summary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: 16, marginTop: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  sLabel: { color: colors.muted, fontSize: 13 },
  sVal: { color: colors.text, fontSize: 13 },
  total: { color: colors.text, fontWeight: '800', fontSize: 16 }
});
