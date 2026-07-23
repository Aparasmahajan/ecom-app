import { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, Modal, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { Card, Field, Pill, notify, confirmAsync } from './ui';
import { api, ApiError, Combo, Product } from '../../lib/api';
import { colors, radii, money } from '../../theme';

export default function AdminCombos() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Combo | null | undefined>(undefined);

  const reload = async () => {
    setLoading(true);
    try {
      const [cs, ps] = await Promise.all([api.admin.combos.list(), api.admin.products.list()]);
      setCombos(cs); setProducts(ps);
    } catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, []);

  const toggle = async (c: Combo) => {
    try { await api.admin.combos.update(c.id, { isActive: !c.isActive }); reload(); }
    catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
  };
  const del = async (c: Combo) => {
    if (!(await confirmAsync(`Delete "${c.name}"?`, 'Delete'))) return;
    try { await api.admin.combos.remove(c.id); notify('Deleted'); reload(); }
    catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Text style={styles.h1}>Combos</Text>
        <Button title="+ Add" size="sm" onPress={() => setEditing(null)} />
      </View>

      {loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} /> :
        combos.map(c => {
          const items = c.productIds.map(id => products.find(p => p.id === id)).filter(Boolean) as Product[];
          const listPrice = items.reduce((a, p) => a + p.basePrice, 0);
          const saves = Math.max(0, listPrice - c.comboPrice);
          return (
            <Card key={c.id}>
              <View style={styles.rowBetween}>
                <Text style={styles.name}>{c.name}</Text>
                <Pill text={c.isActive ? 'Live' : 'Hidden'} tone={c.isActive ? 'ok' : 'bad'} />
              </View>
              <Text style={styles.sub} numberOfLines={2}>{c.description}</Text>
              <Text style={styles.meta}>{items.length} items · {money(c.comboPrice)}{saves > 0 ? ` · save ${money(saves)}` : ''}</Text>
              <View style={styles.actions}>
                <Button title={c.isActive ? 'Hide' : 'Show'} size="sm" variant="dark" onPress={() => toggle(c)} />
                <Button title="Edit" size="sm" variant="secondary" onPress={() => setEditing(c)} />
                <Button title="Delete" size="sm" variant="danger" onPress={() => del(c)} />
              </View>
            </Card>
          );
        })}

      {editing !== undefined && (
        <ComboModal initial={editing} products={products} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); reload(); }} />
      )}
    </Screen>
  );
}

function ComboModal({ initial, products, onClose, onSaved }: {
  initial: Combo | null; products: Product[]; onClose: () => void; onSaved: () => void;
}) {
  const isNew = initial === null;
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [image, setImage] = useState(initial?.image || '');
  const [comboPrice, setComboPrice] = useState(String(initial?.comboPrice ?? 1999));
  const [ids, setIds] = useState<string[]>(initial?.productIds || []);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [busy, setBusy] = useState(false);

  const listPrice = ids.reduce((a, id) => a + (products.find(p => p.id === id)?.basePrice || 0), 0);
  const saves = Math.max(0, listPrice - (Number(comboPrice) || 0));
  const toggleId = (id: string) => setIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const submit = async () => {
    if (!name.trim()) return notify('Name required');
    if (ids.length < 2) return notify('Pick at least 2 products');
    if (!image.trim()) return notify('Image URL required');
    setBusy(true);
    const body = { name: name.trim(), description: description.trim(), image: image.trim(), productIds: ids, comboPrice: Number(comboPrice) || 0, isActive };
    try {
      if (isNew) await api.admin.combos.create(body);
      else await api.admin.combos.update(initial!.id, body);
      notify('Saved'); onSaved();
    } catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
    finally { setBusy(false); }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.modal}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>{isNew ? 'Add' : 'Edit'} Combo</Text>
            <Pressable onPress={onClose}><Text style={styles.close}>×</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Field label="Name" value={name} onChangeText={setName} />
            <Field label="Description" value={description} onChangeText={setDescription} multiline />
            <Field label="Cover image URL" value={image} onChangeText={setImage} />
            <Field label="Combo price (₹)" value={comboPrice} onChangeText={setComboPrice} keyboardType="number-pad" />
            <Text style={styles.meta}>List total {money(listPrice)}{saves > 0 ? ` · save ${money(saves)}` : ''}</Text>

            <Pressable style={styles.checkRow} onPress={() => setIsActive(v => !v)}>
              <View style={[styles.checkbox, isActive && styles.checkboxOn]}>{isActive && <Text style={styles.checkMark}>✓</Text>}</View>
              <Text style={styles.checkLabel}>Show on storefront</Text>
            </Pressable>

            <Text style={[styles.lbl, { marginTop: 14 }]}>Products in combo ({ids.length})</Text>
            {products.map(p => {
              const on = ids.includes(p.id);
              return (
                <Pressable key={p.id} style={[styles.pick, on && styles.pickOn]} onPress={() => toggleId(p.id)}>
                  <View style={[styles.checkbox, on && styles.checkboxOn]}>{on && <Text style={styles.checkMark}>✓</Text>}</View>
                  {p.images[0] && <Image source={{ uri: p.images[0] }} style={styles.pickImg} />}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickName}>{p.name}</Text>
                    <Text style={styles.sub}>{money(p.basePrice)}</Text>
                  </View>
                </Pressable>
              );
            })}
            <Button title={busy ? 'Saving…' : 'Save'} onPress={submit} loading={busy} style={{ marginTop: 16 }} />
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  h1: { color: colors.text, fontSize: 24, fontWeight: '800' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: colors.text, fontWeight: '700', fontSize: 15 },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.card, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, maxHeight: '92%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bg2, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl },
  modalTitle: { color: colors.accent, fontSize: 18, fontWeight: '800' },
  close: { color: colors.muted, fontSize: 28, lineHeight: 30 },
  lbl: { fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkMark: { color: colors.black, fontSize: 14, fontWeight: '900' },
  checkLabel: { color: colors.text, fontSize: 14 },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickOn: { backgroundColor: 'rgba(245,200,66,0.06)' },
  pickImg: { width: 36, height: 36, borderRadius: 6 },
  pickName: { color: colors.text, fontSize: 13 }
});
