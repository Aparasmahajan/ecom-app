import { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api, Product } from '../lib/api';
import { colors, radii, money } from '../theme';
import { useApp } from '../state/store';

export default function ProductCard({
  product,
  initialInWishlist
}: {
  product: Product;
  initialInWishlist?: boolean;
}) {
  const navigation = useNavigation<any>();
  const user = useApp(s => s.user);
  const refresh = useApp(s => s.refresh);
  const [inWish, setInWish] = useState(!!initialInWishlist);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (initialInWishlist !== undefined) setInWish(initialInWishlist); }, [initialInWishlist]);

  const toggleWish = async () => {
    if (!user) { navigation.navigate('Auth'); return; }
    if (busy) return;
    setBusy(true);
    const next = !inWish;
    setInWish(next);
    try {
      if (next) await api.wishlist.add(product.id);
      else      await api.wishlist.remove(product.id);
      await refresh();
    } catch {
      setInWish(!next);
    } finally { setBusy(false); }
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { transform: [{ translateY: -2 }] }]}
      onPress={() => navigation.navigate('ProductDetail', { id: product.id })}
    >
      <View>
        <Image source={{ uri: product.images[0] }} style={styles.img} />
        <Pressable style={styles.heart} onPress={toggleWish}>
          <Text style={[styles.heartText, inWish && { color: colors.danger }]}>
            {inWish ? '♥' : '♡'}
          </Text>
        </Pressable>
        {product.hotSeller && (
          <View style={styles.hotTag}><Text style={styles.hotText}>HOT</Text></View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.price}>{money(product.basePrice)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
    flex: 1
  },
  img: { width: '100%', height: 200, backgroundColor: colors.card2 },
  heart: {
    position: 'absolute', top: 8, right: 8,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center'
  },
  heartText: { color: '#fff', fontSize: 18 },
  hotTag: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(245,200,66,0.9)',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: radii.pill
  },
  hotText: { color: colors.black, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  body: { padding: 12 },
  title: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 4 },
  price: { fontSize: 15, fontWeight: '700', color: colors.accent }
});
