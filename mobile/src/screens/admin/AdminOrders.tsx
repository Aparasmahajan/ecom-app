import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { Card, Chip, Field, Pill, statusTone, notify, confirmAsync } from './ui';
import { api, AdminOrder, ApiError } from '../../lib/api';
import { colors, radii, money } from '../../theme';

const STATUS_TABS = ['ALL', 'CREATED', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
const ADVANCE_TO: Record<string, string> = { CREATED: 'PAID', PAID: 'PROCESSING', PROCESSING: 'SHIPPED', SHIPPED: 'DELIVERED' };
const BOARD_COLUMNS = [
  { key: 'new', title: 'New / To-do', statuses: ['CREATED', 'PAID'] },
  { key: 'processing', title: 'In Progress', statuses: ['PROCESSING'] },
  { key: 'shipped', title: 'Shipped', statuses: ['SHIPPED'] },
  { key: 'delivered', title: 'Delivered', statuses: ['DELIVERED'] },
  { key: 'closed', title: 'Closed', statuses: ['CANCELLED', 'REFUNDED'] }
];

export default function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'board'>('list');
  const [status, setStatus] = useState('ALL');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<AdminOrder | null>(null);

  const reload = async () => {
    setLoading(true);
    try { setOrders(await api.admin.orders.list()); }
    catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: orders.length };
    orders.forEach(o => { c[o.status] = (c[o.status] || 0) + 1; });
    return c;
  }, [orders]);

  const match = (o: AdminOrder) => {
    const t = q.trim().toLowerCase();
    return !t || o.id.toLowerCase().includes(t)
      || (o.customer?.name || '').toLowerCase().includes(t)
      || (o.customer?.email || '').toLowerCase().includes(t)
      || (o.trackingNumber || '').toLowerCase().includes(t);
  };
  const listItems = orders.filter(o => (status === 'ALL' || o.status === status) && match(o));
  const boardItems = orders.filter(match);

  const patch = (u: AdminOrder) => {
    setOrders(prev => prev.map(o => o.id === u.id ? u : o));
    setSelected(prev => prev && prev.id === u.id ? u : prev);
  };

  const advance = async (o: AdminOrder) => {
    const next = ADVANCE_TO[o.status];
    if (!next) return;
    try { patch(await api.admin.orders.setStatus(o.id, next)); notify(`#${o.id.slice(-6).toUpperCase()} → ${next}`); }
    catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
  };

  return (
    <Screen>
      <Text style={styles.h1}>Orders</Text>

      <View style={styles.toggle}>
        <Chip label="List" active={view === 'list'} onPress={() => setView('list')} />
        <Chip label="Board" active={view === 'board'} onPress={() => setView('board')} />
      </View>

      <Field placeholder="Search id / customer / tracking…" value={q} onChangeText={setQ} />

      {loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} /> : view === 'board' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
          {BOARD_COLUMNS.map(col => {
            const items = boardItems.filter(o => col.statuses.includes(o.status));
            return (
              <View key={col.key} style={styles.col}>
                <View style={styles.colHead}>
                  <Text style={styles.colTitle}>{col.title}</Text>
                  <Pill text={String(items.length)} tone="warn" />
                </View>
                {items.length === 0 ? <Text style={styles.empty}>No orders</Text> : items.map(o => (
                  <Pressable key={o.id} style={styles.kcard} onPress={() => setSelected(o)}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.oid}>#{o.id.slice(-6).toUpperCase()}</Text>
                      <Text style={styles.total}>{money(o.total)}</Text>
                    </View>
                    <Text style={styles.cust}>{o.customer?.name || '—'}</Text>
                    {ADVANCE_TO[o.status] && (
                      <Pressable style={styles.advance} onPress={() => advance(o)}>
                        <Text style={styles.advanceText}>Move to {ADVANCE_TO[o.status]} →</Text>
                      </Pressable>
                    )}
                  </Pressable>
                ))}
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {STATUS_TABS.map(s => (
              <Chip key={s} label={`${s === 'ALL' ? 'All' : s} ${counts[s] || 0}`} active={status === s} onPress={() => setStatus(s)} />
            ))}
          </ScrollView>
          {listItems.length === 0 ? <Text style={styles.empty}>No orders match.</Text> : listItems.map(o => (
            <Pressable key={o.id} onPress={() => setSelected(o)}>
              <Card>
                <View style={styles.rowBetween}>
                  <Text style={styles.oid}>#{o.id.slice(-6).toUpperCase()}</Text>
                  <Text style={styles.total}>{money(o.total)}</Text>
                </View>
                <View style={[styles.rowBetween, { marginTop: 6 }]}>
                  <Text style={styles.cust}>{o.customer?.name || '—'}</Text>
                  <Pill text={o.status} tone={statusTone(o.status)} />
                </View>
                <Text style={styles.meta}>{o.items.length} item{o.items.length === 1 ? '' : 's'} · {new Date(o.createdAt).toLocaleDateString()}</Text>
              </Card>
            </Pressable>
          ))}
        </>
      )}

      <OrderModal order={selected} onClose={() => setSelected(null)} onUpdated={patch} />
    </Screen>
  );
}

function OrderModal({ order, onClose, onUpdated }: {
  order: AdminOrder | null; onClose: () => void; onUpdated: (o: AdminOrder) => void;
}) {
  const [tracking, setTracking] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTracking(order?.trackingNumber || '');
    setNotes(order?.adminNotes || '');
    setReason('');
  }, [order?.id]);

  if (!order) return null;

  const run = async (fn: () => Promise<AdminOrder>, msg: string) => {
    setBusy(true);
    try { onUpdated(await fn()); notify(msg); }
    catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
    finally { setBusy(false); }
  };
  const next = ADVANCE_TO[order.status];
  const cancel = async () => {
    if (!reason.trim()) return notify('Enter a cancel reason first');
    if (await confirmAsync('Cancel this order?', 'Cancel order')) run(() => api.admin.orders.cancel(order.id, reason.trim()), 'Order cancelled');
  };
  const refund = async () => {
    if (!reason.trim()) return notify('Enter a refund reason first');
    if (await confirmAsync('Refund this order?', 'Refund')) run(() => api.admin.orders.refund(order.id, reason.trim()), 'Order refunded');
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.modal}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>Order #{order.id.slice(-6).toUpperCase()}</Text>
            <Pressable onPress={onClose}><Text style={styles.close}>×</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View style={styles.rowWrap}>
              <Pill text={order.status} tone={statusTone(order.status)} />
              <Pill text={'Payment: ' + order.paymentStatus} tone="muted" />
            </View>

            <View style={[styles.rowWrap, { marginTop: 12 }]}>
              {next && <Button title={`Mark ${next}`} size="sm" onPress={() => run(() => api.admin.orders.setStatus(order.id, next), `→ ${next}`)} />}
              {order.status !== 'CANCELLED' && order.status !== 'REFUNDED' && order.status !== 'DELIVERED' && (
                <Button title="Cancel" size="sm" variant="danger" onPress={cancel} />
              )}
              {order.paymentStatus === 'PAID' && order.status !== 'REFUNDED' && (
                <Button title="Refund" size="sm" variant="secondary" onPress={refund} />
              )}
            </View>

            <Text style={styles.section}>Customer</Text>
            <Text style={styles.kv}>{order.customer?.name || '—'} · {order.customer?.email || ''}</Text>
            <Text style={styles.kv}>{order.customer?.phone || 'no phone'}</Text>

            <Text style={styles.section}>Ship to</Text>
            <Text style={styles.kv}>{order.shipping.fullName}, {order.shipping.phone}</Text>
            <Text style={styles.kv}>
              {order.shipping.line1}{order.shipping.line2 ? ', ' + order.shipping.line2 : ''}, {order.shipping.city}, {order.shipping.state} - {order.shipping.pincode}
            </Text>

            <Text style={styles.section}>Tracking</Text>
            <Field placeholder="e.g. IN0092312312" value={tracking} onChangeText={setTracking} />
            <Button title="Save tracking" size="sm" variant="dark" onPress={() => run(() => api.admin.orders.setTracking(order.id, tracking.trim()), 'Tracking saved')} />

            <Text style={styles.section}>Cancel / refund reason</Text>
            <Field placeholder="Used when you cancel/refund above" value={reason} onChangeText={setReason} />

            <Text style={styles.section}>Items ({order.items.length})</Text>
            {order.items.map((it, i) => (
              <Text key={i} style={styles.kv}>• {it.productNameSnapshot} — {it.size} × {it.quantity} · {money(it.unitPrice)}</Text>
            ))}
            <Text style={[styles.kv, { color: colors.accent, fontWeight: '800', marginTop: 6 }]}>Total {money(order.total)}</Text>

            <Text style={styles.section}>Admin notes (private)</Text>
            <Field placeholder="Internal notes…" value={notes} onChangeText={setNotes} multiline />
            <Button title="Save notes" size="sm" variant="dark" onPress={() => run(() => api.admin.orders.setNotes(order.id, notes), 'Notes saved')} />

            <View style={{ height: 20 }} />
            {busy && <ActivityIndicator color={colors.accent} />}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: 12 },
  toggle: { flexDirection: 'row', marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  oid: { color: colors.text, fontWeight: '800', fontSize: 15 },
  total: { color: colors.accent, fontWeight: '800', fontSize: 15 },
  cust: { color: colors.muted, fontSize: 13 },
  meta: { color: colors.muted2, fontSize: 12, marginTop: 6 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 24 },

  col: { width: 240, backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: 10, marginRight: 12 },
  colHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  colTitle: { color: colors.text, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  kcard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 12, marginBottom: 10 },
  advance: { marginTop: 10, borderWidth: 1, borderColor: colors.accent, borderRadius: radii.sm, paddingVertical: 6, alignItems: 'center' },
  advanceText: { color: colors.accent, fontSize: 11, fontWeight: '700' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.card, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, maxHeight: '92%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bg2, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl },
  modalTitle: { color: colors.accent, fontSize: 18, fontWeight: '800' },
  close: { color: colors.muted, fontSize: 28, lineHeight: 30 },
  section: { color: colors.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 18, marginBottom: 8 },
  kv: { color: colors.text, fontSize: 13, marginBottom: 2 }
});
