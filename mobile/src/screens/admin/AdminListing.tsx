import { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { Card, Chip, Field, Pill, notify } from './ui';
import { api, ApiError, Product } from '../../lib/api';
import { colors, money } from '../../theme';

/**
 * Listing tab — the storefront-visibility side of management (separate from
 * the Inventory tab's real stock). Toggle a product on/off the storefront and
 * set an advertised "list quantity" independent of actual stock.
 */
export default function AdminListing() {
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'LISTED' | 'HIDDEN'>('ALL');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try { setRows(await api.admin.products.list()); }
    catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    all: rows.length,
    listed: rows.filter(r => r.listed !== false).length,
    hidden: rows.filter(r => r.listed === false).length
  }), [rows]);

  const filtered = rows.filter(r => {
    if (filter === 'LISTED' && r.listed === false) return false;
    if (filter === 'HIDDEN' && r.listed !== false) return false;
    const t = q.trim().toLowerCase();
    return !t || r.name.toLowerCase().includes(t) || r.categoryId.toLowerCase().includes(t);
  });

  const totalStock = (p: Product) => p.variants.reduce((a, v) => a + v.stock, 0);

  const toggle = async (p: Product) => {
    try {
      const u = await api.admin.products.setListing(p.id, { listed: !(p.listed !== false) });
      setRows(prev => prev.map(x => x.id === p.id ? u : x));
      notify(u.listed !== false ? 'Now listed' : 'Hidden from site');
    } catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
  };

  const saveQty = async (p: Product) => {
    const raw = drafts[p.id];
    if (raw === undefined) return;
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n) || n < 0) return notify('List quantity must be ≥ 0');
    try {
      const u = await api.admin.products.setListing(p.id, { listQuantity: n });
      setRows(prev => prev.map(x => x.id === p.id ? u : x));
      setDrafts(d => { const cp = { ...d }; delete cp[p.id]; return cp; });
      notify('List quantity saved');
    } catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
  };

  return (
    <Screen>
      <Text style={styles.h1}>Listing</Text>
      <Text style={styles.note}>Controls what shoppers see. Real stock lives in Inventory — list quantity is what you advertise.</Text>
      <Field placeholder="Search product / category…" value={q} onChangeText={setQ} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <Chip label={`All ${counts.all}`} active={filter === 'ALL'} onPress={() => setFilter('ALL')} />
        <Chip label={`Listed ${counts.listed}`} active={filter === 'LISTED'} onPress={() => setFilter('LISTED')} />
        <Chip label={`Hidden ${counts.hidden}`} active={filter === 'HIDDEN'} onPress={() => setFilter('HIDDEN')} />
      </ScrollView>

      {loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} /> :
        filtered.length === 0 ? <Text style={styles.empty}>Nothing matches.</Text> :
        filtered.map(p => {
          const draft = drafts[p.id];
          const listed = p.listed !== false;
          const dirty = draft !== undefined && Number(draft) !== (p.listQuantity ?? 0);
          return (
            <Card key={p.id}>
              <View style={styles.row}>
                {p.images[0] && <Image source={{ uri: p.images[0] }} style={styles.img} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{p.name}</Text>
                  <Text style={styles.sub}>{p.categoryId} · {money(p.basePrice)}</Text>
                </View>
                <Pill text={`${totalStock(p)} stock`} tone={totalStock(p) === 0 ? 'bad' : 'ok'} />
              </View>
              <View style={styles.editRow}>
                <Button title={listed ? 'Listed' : 'Hidden'} size="sm" variant={listed ? 'primary' : 'secondary'} onPress={() => toggle(p)} />
                <Text style={styles.lbl}>List qty</Text>
                <Field value={draft ?? String(p.listQuantity ?? 0)} onChangeText={(t) => setDrafts(d => ({ ...d, [p.id]: t }))} keyboardType="number-pad" style={{ width: 70, textAlign: 'center' }} />
                <Button title="Save" size="sm" disabled={!dirty} onPress={() => saveQty(p)} style={{ marginLeft: 'auto' }} />
              </View>
            </Card>
          );
        })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: 6 },
  note: { color: colors.muted, fontSize: 12, marginBottom: 12, lineHeight: 17 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  img: { width: 40, height: 40, borderRadius: 6 },
  name: { color: colors.text, fontWeight: '700', fontSize: 14 },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  lbl: { color: colors.muted, fontSize: 12 }
});
