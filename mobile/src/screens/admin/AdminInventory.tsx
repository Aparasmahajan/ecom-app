import { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { Card, Chip, Field, Pill, notify } from './ui';
import { api, ApiError, Product } from '../../lib/api';
import { colors, money } from '../../theme';

const LOW = 5;

interface Row {
  variantId: string; productId: string; productName: string; image: string | null;
  size: string; color: string; stock: number; priceModifier: number; basePrice: number;
}

export default function AdminInventory() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const products = await api.admin.products.list();
      const flat: Row[] = [];
      products.forEach((p: Product) => p.variants.forEach(v => flat.push({
        variantId: v.id, productId: p.id, productName: p.name, image: p.images[0] || null,
        size: v.size, color: v.color, stock: v.stock, priceModifier: v.priceModifier, basePrice: p.basePrice
      })));
      setRows(flat);
    } catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    all: rows.length,
    low: rows.filter(r => r.stock > 0 && r.stock <= LOW).length,
    out: rows.filter(r => r.stock === 0).length
  }), [rows]);

  const filtered = rows.filter(r => {
    if (filter === 'LOW' && !(r.stock > 0 && r.stock <= LOW)) return false;
    if (filter === 'OUT' && r.stock !== 0) return false;
    const t = q.trim().toLowerCase();
    return !t || r.productName.toLowerCase().includes(t) || r.size.toLowerCase().includes(t);
  });

  const save = async (r: Row) => {
    const raw = drafts[r.variantId];
    if (raw === undefined) return;
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n) || n < 0) return notify('Stock must be ≥ 0');
    try {
      await api.admin.variants.update(r.variantId, { size: r.size, color: r.color, stock: n, priceModifier: r.priceModifier });
      setRows(prev => prev.map(x => x.variantId === r.variantId ? { ...x, stock: n } : x));
      setDrafts(d => { const cp = { ...d }; delete cp[r.variantId]; return cp; });
      notify('Stock updated');
    } catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
  };

  const tone = (n: number) => n === 0 ? 'bad' : n <= LOW ? 'warn' : 'ok';
  const setDraft = (id: string, v: string) => setDrafts(d => ({ ...d, [id]: v }));

  return (
    <Screen>
      <Text style={styles.h1}>Inventory</Text>
      <Field placeholder="Search product / size…" value={q} onChangeText={setQ} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <Chip label={`All ${counts.all}`} active={filter === 'ALL'} onPress={() => setFilter('ALL')} />
        <Chip label={`Low ${counts.low}`} active={filter === 'LOW'} onPress={() => setFilter('LOW')} />
        <Chip label={`Out ${counts.out}`} active={filter === 'OUT'} onPress={() => setFilter('OUT')} />
      </ScrollView>

      {loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} /> :
        filtered.length === 0 ? <Text style={styles.empty}>Nothing matches.</Text> :
        filtered.map(r => {
          const draft = drafts[r.variantId];
          const val = draft ?? String(r.stock);
          const dirty = draft !== undefined && Number(draft) !== r.stock;
          const cur = Number(val) || 0;
          return (
            <Card key={r.variantId}>
              <View style={styles.row}>
                {r.image && <Image source={{ uri: r.image }} style={styles.img} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{r.productName}</Text>
                  <Text style={styles.sub}>{r.size} · {r.color} · {money(r.basePrice)}</Text>
                </View>
                <Pill text={`${r.stock} in stock`} tone={tone(r.stock)} />
              </View>
              <View style={styles.editRow}>
                <Pressable style={styles.step} onPress={() => setDraft(r.variantId, String(Math.max(0, cur - 1)))}><Text style={styles.stepText}>−</Text></Pressable>
                <Field value={val} onChangeText={(t) => setDraft(r.variantId, t)} keyboardType="number-pad" style={{ width: 70, textAlign: 'center' }} />
                <Pressable style={styles.step} onPress={() => setDraft(r.variantId, String(cur + 1))}><Text style={styles.stepText}>+</Text></Pressable>
                <Button title="Save" size="sm" disabled={!dirty} onPress={() => save(r)} style={{ marginLeft: 'auto' }} />
              </View>
            </Card>
          );
        })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: 12 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  img: { width: 40, height: 40, borderRadius: 6 },
  name: { color: colors.text, fontWeight: '700', fontSize: 14 },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  step: { width: 38, height: 40, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: colors.text, fontSize: 18 }
});
