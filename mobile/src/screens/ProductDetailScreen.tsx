import { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Screen from '../components/Screen';
import Button from '../components/Button';
import { api, ApiError, Product } from '../lib/api';
import { colors, radii, money } from '../theme';
import { useApp } from '../state/store';

const COLORS = [
  { name: 'Black', hex: '#111' },
  { name: 'White', hex: '#f5f5f5' },
  { name: 'Brown', hex: '#8b5a2b' },
  { name: 'Olive', hex: '#6b7047' }
];

export default function ProductDetailScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const user = useApp(s => s.user);
  const refresh = useApp(s => s.refresh);

  const [product, setProduct] = useState<Product | null>(null);
  const [variantId, setVariantId] = useState('');
  const [color, setColor] = useState('Black');
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const id: string = route.params?.id;

  useEffect(() => {
    (async () => {
      try {
        const p = await api.catalog.product(id);
        setProduct(p);
        if (p.variants[0]) setVariantId(p.variants[0].id);
      } catch { /* empty state */ }
    })();
  }, [id]);

  if (!product) {
    return <Screen><ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} /></Screen>;
  }

  const requireAuth = () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in first.', [{ text: 'OK', onPress: () => nav.navigate('Auth') }]);
      return false;
    }
    return true;
  };

  const addToCart = async (): Promise<boolean> => {
    if (!requireAuth()) return false;
    setBusy(true);
    try {
      await api.cart.add(variantId, qty, `Color: ${color}`);
      await refresh();
      return true;
    } catch (e) {
      Alert.alert('Failed', e instanceof ApiError ? e.message : 'Could not add to cart');
      return false;
    } finally { setBusy(false); }
  };

  const currentSize = product.variants.find(v => v.id === variantId)?.size;

  return (
    <Screen>
      <Image source={{ uri: product.images[imgIdx] }} style={styles.mainImg} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
        <View style={styles.thumbRow}>
          {product.images.map((im, i) => (
            <Pressable key={i} onPress={() => setImgIdx(i)}>
              <Image source={{ uri: im }} style={[styles.thumb, i === imgIdx && { borderColor: colors.accent }]} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {product.hotSeller && (
        <View style={styles.tag}><Text style={styles.tagText}>HOT SELLER</Text></View>
      )}
      <Text style={styles.title}>{product.name}</Text>
      {product.effectiveRating > 0 && (
        <Text style={{ color: colors.accent, fontSize: 13, marginTop: 2 }}>
          ★ {product.effectiveRating}
        </Text>
      )}
      <Text style={styles.price}>{money(product.basePrice)}</Text>

      <Text style={styles.label}>Color: <Text style={styles.labelStrong}>{color}</Text></Text>
      <View style={styles.row}>
        {COLORS.map(c => (
          <Pressable key={c.name} onPress={() => setColor(c.name)}
            style={[styles.swatch, { backgroundColor: c.hex }, color === c.name && styles.swatchActive]}
          />
        ))}
      </View>

      <Text style={styles.label}>Size: <Text style={styles.labelStrong}>{currentSize || 'Select'}</Text></Text>
      <View style={styles.row}>
        {product.variants.map(v => (
          <Pressable key={v.id}
            onPress={() => setVariantId(v.id)}
            disabled={v.stock === 0}
            style={[styles.sizeBtn, variantId === v.id && styles.sizeBtnActive, v.stock === 0 && { opacity: 0.35 }]}
          >
            <Text style={[styles.sizeText, variantId === v.id && { color: colors.black }]}>{v.size}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Quantity</Text>
      <View style={styles.qtyRow}>
        <Pressable style={styles.qtyBtn} onPress={() => setQty(Math.max(1, qty - 1))}><Text style={styles.qtyBtnText}>−</Text></Pressable>
        <Text style={styles.qtyVal}>{qty}</Text>
        <Pressable style={styles.qtyBtn} onPress={() => setQty(qty + 1)}><Text style={styles.qtyBtnText}>+</Text></Pressable>
      </View>

      <View style={styles.actions}>
        <Button title="ADD TO CART" variant="dark" style={{ flex: 1 }} loading={busy}
          onPress={async () => { if (await addToCart()) Alert.alert('Added', 'Item added to cart'); }} />
        <Button title="BUY NOW" style={{ flex: 1 }} loading={busy}
          onPress={async () => { if (await addToCart()) nav.navigate('Root', { screen: 'Cart' }); }} />
      </View>

      <Text style={styles.detailsTitle}>Product Details</Text>
      <Text style={styles.desc}>{product.description}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mainImg: { width: '100%', height: 400, borderRadius: radii.lg, backgroundColor: colors.card },
  thumbRow: { flexDirection: 'row', gap: 8 },
  thumb: { width: 64, height: 64, borderRadius: 8, borderWidth: 2, borderColor: 'transparent' },
  tag: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(245,200,66,0.15)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill, marginTop: 12
  },
  tagText: { color: colors.accent, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 8 },
  price: { color: colors.accent, fontSize: 24, fontWeight: '800', marginTop: 4, marginBottom: 8 },
  label: { color: colors.muted, fontSize: 13, marginTop: 16, marginBottom: 6 },
  labelStrong: { color: colors.text, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: colors.border },
  swatchActive: { borderColor: colors.accent },
  sizeBtn: {
    minWidth: 48, paddingVertical: 10, paddingHorizontal: 14,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card, borderRadius: radii.sm,
    alignItems: 'center'
  },
  sizeBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  sizeText: { color: colors.text, fontWeight: '600', fontSize: 14 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: {
    width: 36, height: 36, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center'
  },
  qtyBtnText: { color: colors.text, fontSize: 18 },
  qtyVal: { color: colors.text, fontWeight: '600', minWidth: 24, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  detailsTitle: { color: colors.text, fontWeight: '700', marginTop: 24, marginBottom: 8 },
  desc: { color: colors.muted, fontSize: 14, lineHeight: 20 }
});
