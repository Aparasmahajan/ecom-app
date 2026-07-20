import { useEffect, useState, useCallback } from 'react';
import { View, Text, Image, ScrollView, Pressable, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Screen from '../components/Screen';
import Button from '../components/Button';
import { api, ApiError, Product, Review } from '../lib/api';
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
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [inWish, setInWish] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [myStars, setMyStars] = useState(5);
  const [myComment, setMyComment] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);

  const id: string = route.params?.id;

  const loadReviews = useCallback(async () => {
    try { setReviews(await api.reviews.list(id)); } catch { /* keep */ }
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const p = await api.catalog.product(id);
        setProduct(p);
        if (p.variants[0]) setVariantId(p.variants[0].id);
      } catch { /* empty state */ }
    })();
    loadReviews();
  }, [id, loadReviews]);

  useEffect(() => {
    (async () => {
      if (!user) { setInWish(false); return; }
      try {
        const wish = await api.wishlist.list();
        setInWish(wish.some(p => p.id === id));
      } catch { /* keep */ }
    })();
  }, [user, id]);

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
      const fullNote = `Color: ${color}${note.trim() ? ` · ${note.trim()}` : ''}`;
      await api.cart.add(variantId, qty, fullNote);
      await refresh();
      return true;
    } catch (e) {
      Alert.alert('Failed', e instanceof ApiError ? e.message : 'Could not add to cart');
      return false;
    } finally { setBusy(false); }
  };

  const toggleWish = async () => {
    if (!requireAuth()) return;
    const next = !inWish;
    setInWish(next);
    try {
      if (next) await api.wishlist.add(product.id);
      else      await api.wishlist.remove(product.id);
      await refresh();
    } catch {
      setInWish(!next);
    }
  };

  const submitReview = async () => {
    if (!requireAuth()) return;
    if (!myComment.trim()) { Alert.alert('Add a comment', 'Please write a short review.'); return; }
    setReviewBusy(true);
    try {
      await api.reviews.create(product.id, myStars, myComment.trim());
      setMyComment('');
      await loadReviews();
      // Refresh the product so the effective rating updates.
      try { setProduct(await api.catalog.product(id)); } catch { /* keep */ }
      Alert.alert('Thanks!', 'Your review was posted.');
    } catch (e) {
      Alert.alert('Failed', e instanceof ApiError ? e.message : 'Could not post review');
    } finally { setReviewBusy(false); }
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
          ★ {product.effectiveRating} · {reviews.length} review{reviews.length === 1 ? '' : 's'}
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

      <Text style={styles.label}>Note (optional)</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="e.g. gift wrap, specific shade…"
        placeholderTextColor={colors.muted2}
        style={styles.noteInput}
        multiline
      />

      <View style={styles.actions}>
        <Button title="ADD TO CART" variant="dark" style={{ flex: 1 }} loading={busy}
          onPress={async () => { if (await addToCart()) Alert.alert('Added', 'Item added to cart'); }} />
        <Button title="BUY NOW" style={{ flex: 1 }} loading={busy}
          onPress={async () => { if (await addToCart()) nav.navigate('Root', { screen: 'Cart' }); }} />
      </View>

      <Pressable style={styles.wishRow} onPress={toggleWish}>
        <Text style={[styles.wishHeart, inWish && { color: colors.danger }]}>{inWish ? '♥' : '♡'}</Text>
        <Text style={styles.wishText}>{inWish ? 'Saved to Wishlist' : 'Add to Wishlist'}</Text>
      </Pressable>

      <Text style={styles.detailsTitle}>Product Details</Text>
      <Text style={styles.desc}>{product.description}</Text>

      {/* -------- Ratings & Reviews -------- */}
      <Text style={styles.detailsTitle}>Ratings & Reviews</Text>
      {reviews.length === 0 ? (
        <Text style={styles.desc}>No reviews yet. Be the first to review this product.</Text>
      ) : (
        reviews.map(r => (
          <View key={r.id} style={styles.reviewCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.reviewName}>{r.userName}</Text>
              <Text style={styles.reviewStars}>{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</Text>
            </View>
            <Text style={styles.reviewComment}>{r.comment}</Text>
          </View>
        ))
      )}

      <View style={styles.reviewForm}>
        <Text style={styles.label}>Write a review</Text>
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map(s => (
            <Pressable key={s} onPress={() => setMyStars(s)}>
              <Text style={[styles.starPick, s <= myStars && { color: colors.accent }]}>★</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={myComment}
          onChangeText={setMyComment}
          placeholder="Share your thoughts…"
          placeholderTextColor={colors.muted2}
          style={styles.noteInput}
          multiline
        />
        <Button title="POST REVIEW" onPress={submitReview} loading={reviewBusy} style={{ marginTop: 12 }} />
      </View>
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
  noteInput: {
    backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 12, color: colors.text, fontSize: 14, minHeight: 44
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  wishRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  wishHeart: { color: colors.text, fontSize: 22 },
  wishText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  detailsTitle: { color: colors.text, fontWeight: '700', marginTop: 24, marginBottom: 8, fontSize: 15 },
  desc: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  reviewCard: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, padding: 12, marginBottom: 10
  },
  reviewName: { color: colors.text, fontWeight: '600', fontSize: 13 },
  reviewStars: { color: colors.accent, fontSize: 13 },
  reviewComment: { color: colors.muted, fontSize: 13, marginTop: 4, lineHeight: 18 },
  reviewForm: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, padding: 16, marginTop: 12
  },
  starRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  starPick: { color: colors.border2, fontSize: 30 }
});
