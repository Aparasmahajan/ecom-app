import { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, Modal, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { Card, Chip, Field, Pill, notify, confirmAsync } from './ui';
import { api, ApiError, Banner, BannerTemplate } from '../../lib/api';
import { colors, radii } from '../../theme';

const TEMPLATES: BannerTemplate[] = ['hero', 'sale', 'split', 'minimal'];

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [count, setCount] = useState('3');
  const [savedCount, setSavedCount] = useState(3);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Banner | null | undefined>(undefined);

  const reload = async () => {
    setLoading(true);
    try {
      const [bs, s] = await Promise.all([api.admin.banners.list(), api.catalog.settings()]);
      setBanners(bs); setCount(String(s.homeBannerCount)); setSavedCount(s.homeBannerCount);
    } catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, []);

  const saveCount = async () => {
    const n = Math.floor(Number(count));
    if (!Number.isFinite(n) || n < 0) return notify('Enter a number ≥ 0');
    try { await api.admin.settings.update({ homeBannerCount: n }); setSavedCount(n); notify('Banner count saved'); }
    catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
  };
  const toggle = async (b: Banner) => {
    try { await api.admin.banners.update(b.id, { active: !b.active }); reload(); }
    catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
  };
  const del = async (b: Banner) => {
    if (!(await confirmAsync(`Delete "${b.title}"?`, 'Delete'))) return;
    try { await api.admin.banners.remove(b.id); notify('Deleted'); reload(); }
    catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
  };
  const move = async (b: Banner, dir: -1 | 1) => {
    const sorted = [...banners].sort((a, c) => a.position - c.position);
    const idx = sorted.findIndex(x => x.id === b.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    try {
      await api.admin.banners.update(b.id, { position: swap.position });
      await api.admin.banners.update(swap.id, { position: b.position });
      reload();
    } catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
  };

  return (
    <Screen>
      <Text style={styles.h1}>Banners</Text>
      <View style={styles.countRow}>
        <Text style={styles.lbl}>Show on Home</Text>
        <Field value={count} onChangeText={setCount} keyboardType="number-pad" style={{ width: 70, textAlign: 'center' }} />
        <Button title="Save" size="sm" disabled={Number(count) === savedCount} onPress={saveCount} />
        <Button title="+ Add" size="sm" variant="secondary" onPress={() => setEditing(null)} style={{ marginLeft: 'auto' }} />
      </View>
      <Text style={styles.note}>Home shows up to {savedCount} active banner(s), in the order below.</Text>

      {loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} /> :
        [...banners].sort((a, b) => a.position - b.position).map(b => (
          <Card key={b.id}>
            <View style={styles.row}>
              {b.template !== 'minimal' && b.imageUrl ? <Image source={{ uri: b.imageUrl }} style={styles.img} /> : <View style={[styles.img, { backgroundColor: colors.card2 }]} />}
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{b.title}</Text>
                <Text style={styles.sub} numberOfLines={1}>{b.subtitle}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                  <Pill text={b.template} tone="muted" />
                  <Pill text={b.active ? 'Live' : 'Hidden'} tone={b.active ? 'ok' : 'bad'} />
                  {!!b.price && <Pill text={b.price} tone="warn" />}
                </View>
              </View>
            </View>
            <View style={styles.actions}>
              <Button title="↑" size="sm" variant="dark" onPress={() => move(b, -1)} />
              <Button title="↓" size="sm" variant="dark" onPress={() => move(b, 1)} />
              <Button title={b.active ? 'Hide' : 'Show'} size="sm" variant="dark" onPress={() => toggle(b)} />
              <Button title="Edit" size="sm" variant="secondary" onPress={() => setEditing(b)} />
              <Button title="Delete" size="sm" variant="danger" onPress={() => del(b)} />
            </View>
          </Card>
        ))}

      {editing !== undefined && (
        <BannerModal initial={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); reload(); }} />
      )}
    </Screen>
  );
}

function BannerModal({ initial, onClose, onSaved }: {
  initial: Banner | null; onClose: () => void; onSaved: () => void;
}) {
  const isNew = initial === null;
  const [template, setTemplate] = useState<BannerTemplate>(initial?.template || 'hero');
  const [title, setTitle] = useState(initial?.title || '');
  const [subtitle, setSubtitle] = useState(initial?.subtitle || '');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80');
  const [price, setPrice] = useState(initial?.price || '');
  const [ctaText, setCtaText] = useState(initial?.ctaText || 'Shop Now');
  const [ctaHref, setCtaHref] = useState(initial?.ctaHref || '/products');
  const [active, setActive] = useState(initial?.active ?? true);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) return notify('Title required');
    setBusy(true);
    const body = { template, title: title.trim(), subtitle: subtitle.trim(), imageUrl: imageUrl.trim(), price: price.trim(), ctaText: ctaText.trim(), ctaHref: ctaHref.trim(), active };
    try {
      if (isNew) await api.admin.banners.create(body);
      else await api.admin.banners.update(initial!.id, body);
      notify('Saved'); onSaved();
    } catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
    finally { setBusy(false); }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.modal}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>{isNew ? 'Add' : 'Edit'} Banner</Text>
            <Pressable onPress={onClose}><Text style={styles.close}>×</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={styles.lbl}>Template</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {TEMPLATES.map(t => <Chip key={t} label={t} active={template === t} onPress={() => setTemplate(t)} />)}
            </ScrollView>
            <Field label="Title" value={title} onChangeText={setTitle} />
            <Field label="Subtitle" value={subtitle} onChangeText={setSubtitle} />
            {template !== 'minimal' && <Field label="Image URL" value={imageUrl} onChangeText={setImageUrl} />}
            <Field label="Featured price (optional)" value={price} onChangeText={setPrice} placeholder="e.g. ₹999" />
            <Field label="Button text" value={ctaText} onChangeText={setCtaText} />
            <Field label="Button link" value={ctaHref} onChangeText={setCtaHref} placeholder="/products?categoryId=shoes" />
            <Pressable style={styles.checkRow} onPress={() => setActive(v => !v)}>
              <View style={[styles.checkbox, active && styles.checkboxOn]}>{active && <Text style={styles.checkMark}>✓</Text>}</View>
              <Text style={styles.checkLabel}>Active (show on storefront)</Text>
            </Pressable>
            <Button title={busy ? 'Saving…' : 'Save'} onPress={submit} loading={busy} style={{ marginTop: 16 }} />
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: 12 },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lbl: { fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  note: { color: colors.muted, fontSize: 12, marginTop: 8, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  img: { width: 64, height: 40, borderRadius: 6 },
  name: { color: colors.text, fontWeight: '700', fontSize: 14 },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.card, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, maxHeight: '92%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bg2, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl },
  modalTitle: { color: colors.accent, fontSize: 18, fontWeight: '800' },
  close: { color: colors.muted, fontSize: 28, lineHeight: 30 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkMark: { color: colors.black, fontSize: 14, fontWeight: '900' },
  checkLabel: { color: colors.text, fontSize: 14 }
});
