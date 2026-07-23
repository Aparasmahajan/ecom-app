import { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, Modal, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { Card, Chip, Field, Pill, notify, confirmAsync } from './ui';
import { api, ApiError, Category, Product } from '../../lib/api';
import { colors, radii, money } from '../../theme';

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null | undefined>(undefined); // undefined=closed, null=new

  const reload = async () => {
    setLoading(true);
    try {
      const [ps, cs] = await Promise.all([api.admin.products.list(), api.catalog.categories()]);
      setProducts(ps); setCats(cs);
    } catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, []);

  const toggleHot = async (p: Product) => {
    try { await api.admin.products.setHotSeller(p.id, !p.hotSeller); reload(); }
    catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
  };
  const del = async (p: Product) => {
    if (!(await confirmAsync(`Delete "${p.name}"?`, 'Delete'))) return;
    try { await api.admin.products.remove(p.id); notify('Deleted'); reload(); }
    catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Text style={styles.h1}>Products</Text>
        <Button title="+ Add" size="sm" onPress={() => setEditing(null)} />
      </View>

      {loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} /> :
        products.map(p => (
          <Card key={p.id}>
            <View style={styles.row}>
              {p.images[0] && <Image source={{ uri: p.images[0] }} style={styles.img} />}
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{p.name}</Text>
                <Text style={styles.sub}>{cats.find(c => c.id === p.categoryId)?.name || p.categoryId} · {money(p.basePrice)} · {p.variants.length} variants</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                  {p.hotSeller && <Pill text="HOT" tone="warn" />}
                  {p.listed === false && <Pill text="HIDDEN" tone="bad" />}
                </View>
              </View>
            </View>
            <View style={styles.actions}>
              <Button title={p.hotSeller ? 'Unmark Hot' : 'Mark Hot'} size="sm" variant="dark" onPress={() => toggleHot(p)} />
              <Button title="Edit" size="sm" variant="secondary" onPress={() => setEditing(p)} />
              <Button title="Delete" size="sm" variant="danger" onPress={() => del(p)} />
            </View>
          </Card>
        ))}

      {editing !== undefined && (
        <ProductModal initial={editing} cats={cats} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); reload(); }} />
      )}
    </Screen>
  );
}

function ProductModal({ initial, cats, onClose, onSaved }: {
  initial: Product | null; cats: Category[]; onClose: () => void; onSaved: () => void;
}) {
  const isNew = initial === null;
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId || cats[0]?.id || 'tshirts');
  const [basePrice, setBasePrice] = useState(String(initial?.basePrice ?? 999));
  const [images, setImages] = useState((initial?.images || []).join(', '));
  const [hotSeller, setHotSeller] = useState(initial?.hotSeller || false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return notify('Name required');
    setBusy(true);
    const body: any = {
      name: name.trim(), description: description.trim(), categoryId,
      basePrice: Number(basePrice) || 0, hotSeller,
      images: images.trim() ? images.split(',').map(s => s.trim()).filter(Boolean) : undefined
    };
    try {
      if (isNew) await api.admin.products.create(body);
      else await api.admin.products.update(initial!.id, body);
      notify('Saved'); onSaved();
    } catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
    finally { setBusy(false); }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.modal}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>{isNew ? 'Add' : 'Edit'} Product</Text>
            <Pressable onPress={onClose}><Text style={styles.close}>×</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Field label="Name" value={name} onChangeText={setName} />
            <Field label="Description" value={description} onChangeText={setDescription} multiline />
            <Text style={styles.lbl}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {cats.map(c => <Chip key={c.id} label={c.name} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />)}
            </ScrollView>
            <Field label="Price (₹)" value={basePrice} onChangeText={setBasePrice} keyboardType="number-pad" />
            <Field label="Image URLs (comma-separated, blank = auto)" value={images} onChangeText={setImages} multiline />
            <Pressable style={styles.checkRow} onPress={() => setHotSeller(v => !v)}>
              <View style={[styles.checkbox, hotSeller && styles.checkboxOn]}>{hotSeller && <Text style={styles.checkMark}>✓</Text>}</View>
              <Text style={styles.checkLabel}>Hot Seller</Text>
            </Pressable>
            {isNew && <Text style={styles.hint}>A default S/M/L/XL variant set is created. Adjust stock in Inventory.</Text>}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  img: { width: 44, height: 44, borderRadius: 8 },
  name: { color: colors.text, fontWeight: '700', fontSize: 14 },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.card, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, maxHeight: '92%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bg2, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl },
  modalTitle: { color: colors.accent, fontSize: 18, fontWeight: '800' },
  close: { color: colors.muted, fontSize: 28, lineHeight: 30 },
  lbl: { fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkMark: { color: colors.black, fontSize: 14, fontWeight: '900' },
  checkLabel: { color: colors.text, fontSize: 14 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 10, lineHeight: 17 }
});
