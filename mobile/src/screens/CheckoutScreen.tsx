import { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Screen from '../components/Screen';
import Button from '../components/Button';
import { api, ApiError, Address, CartItem } from '../lib/api';
import { colors, radii, money } from '../theme';
import { useApp } from '../state/store';

/**
 * Checkout — pick a saved address, review the order, place it, then run the
 * mock Razorpay payment (dev fallback: signature "dev"). Login required.
 */
export default function CheckoutScreen() {
  const user = useApp(s => s.user);
  const refresh = useApp(s => s.refresh);
  const nav = useNavigation<any>();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [addrs, setAddrs] = useState<Address[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const [c, a] = await Promise.all([api.cart.list(), api.me.addresses.list()]);
      setCart(c);
      setAddrs(a);
      const def = a.find(x => x.isDefault) || a[0];
      setSelected(prev => prev || (def ? def.id : ''));
    } catch { /* empty */ }
    finally { setLoading(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const subtotal = cart.reduce((a, i) => a + i.unitPrice * i.quantity, 0);

  const placeOrder = async () => {
    if (!selected) { Alert.alert('Pick an address', 'Select a delivery address first.'); return; }
    if (cart.length === 0) { Alert.alert('Empty cart', 'Add items before checking out.'); return; }
    setPlacing(true);
    try {
      const order = await api.orders.create({ addressId: selected, fromCart: true });
      const razorpayOrderId = order.razorpayOrderId;
      if (!razorpayOrderId) throw new ApiError(500, 'no_payment_id', 'Payment id missing from order');
      await api.payment.verify({
        razorpayOrderId,
        razorpayPaymentId: 'pay_mobile_' + Date.now(),
        signature: 'dev'
      });
      await refresh();
      // Clear local cart state so a re-render of this screen doesn't briefly
      // show the pre-payment items before navigation completes.
      setCart([]);
      // Navigate directly — Alert.alert's onPress button callback does not
      // reliably fire on Expo Web (it becomes a plain window.alert), which
      // would strand the user on the checkout screen with an empty cart.
      // `replace` (not `navigate`) so back-button doesn't return to checkout.
      nav.replace('OrderDetail', { id: order.id, justPaid: true });
    } catch (e) {
      Alert.alert('Checkout failed', e instanceof ApiError ? e.message : (e as Error).message);
    } finally { setPlacing(false); }
  };

  if (!user) {
    return <Screen><Text style={styles.h1}>CHECKOUT</Text><Text style={styles.empty}>Sign in to check out.</Text></Screen>;
  }

  return (
    <Screen>
      <Text style={styles.h1}>CHECKOUT</Text>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <>
          <Text style={styles.section}>DELIVERY ADDRESS</Text>
          {addrs.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.empty}>No saved addresses.</Text>
              <Button title="+ ADD ADDRESS" variant="secondary" onPress={() => nav.navigate('Addresses')} />
            </View>
          ) : (
            <>
              {addrs.map(a => (
                <Pressable key={a.id} style={[styles.addrCard, selected === a.id && styles.addrCardActive]} onPress={() => setSelected(a.id)}>
                  <View style={styles.radio}>{selected === a.id && <View style={styles.radioDot} />}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{a.fullName} {a.isDefault ? '· Default' : ''}</Text>
                    <Text style={styles.addr}>{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} — {a.pincode}</Text>
                    <Text style={styles.addr}>📞 {a.phone}</Text>
                  </View>
                </Pressable>
              ))}
              <Pressable onPress={() => nav.navigate('Addresses')}><Text style={styles.link}>+ Add / manage addresses</Text></Pressable>
            </>
          )}

          <Text style={styles.section}>ORDER SUMMARY</Text>
          <View style={styles.card}>
            {cart.length === 0 ? (
              <Text style={styles.empty}>Your cart is empty.</Text>
            ) : cart.map(i => (
              <View key={i.id} style={styles.lineRow}>
                <Text style={styles.lineName} numberOfLines={1}>{i.productName} × {i.quantity}</Text>
                <Text style={styles.lineVal}>{money(i.unitPrice * i.quantity)}</Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.lineRow}><Text style={styles.sLabel}>Subtotal</Text><Text style={styles.sVal}>{money(subtotal)}</Text></View>
            <View style={styles.lineRow}><Text style={styles.sLabel}>Shipping</Text><Text style={styles.sVal}>Free</Text></View>
            <View style={[styles.lineRow, { marginTop: 6 }]}>
              <Text style={styles.total}>Total</Text><Text style={[styles.total, { color: colors.accent }]}>{money(subtotal)}</Text>
            </View>
          </View>

          <Button
            title={placing ? 'PLACING…' : `PAY ${money(subtotal)}`}
            onPress={placeOrder}
            loading={placing}
            disabled={cart.length === 0 || !selected}
            style={{ marginTop: 16 }}
          />
          <Text style={styles.devNote}>Dev mode — payment is mocked (Razorpay signature “dev”).</Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  section: { color: colors.muted, fontSize: 12, letterSpacing: 1, marginTop: 20, marginBottom: 10, fontWeight: '700' },
  empty: { color: colors.muted, textAlign: 'center', marginVertical: 12 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: 16 },
  addrCard: { flexDirection: 'row', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: 14, marginBottom: 10 },
  addrCardActive: { borderColor: colors.accent },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  name: { color: colors.text, fontWeight: '700', fontSize: 14 },
  addr: { color: colors.muted, fontSize: 13, marginTop: 3 },
  link: { color: colors.accent, fontSize: 13, fontWeight: '600', marginTop: 4 },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  lineName: { color: colors.text, fontSize: 13, flex: 1, marginRight: 10 },
  lineVal: { color: colors.text, fontSize: 13 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  sLabel: { color: colors.muted, fontSize: 13 },
  sVal: { color: colors.text, fontSize: 13 },
  total: { color: colors.text, fontWeight: '800', fontSize: 16 },
  devNote: { color: colors.muted2, fontSize: 11, textAlign: 'center', marginTop: 10 }
});
