import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import ProductCard from '../components/ProductCard';
import { api, Product } from '../lib/api';
import { colors } from '../theme';
import { useApp } from '../state/store';

export default function WishlistScreen() {
  const user = useApp(s => s.user);
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    setLoading(true);
    try { setItems(await api.wishlist.list()); }
    catch { setItems([]); }
    finally { setLoading(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen>
      <Text style={styles.h1}>YOUR WISHLIST</Text>
      {!user ? (
        <Text style={styles.empty}>Sign in to see your wishlist.</Text>
      ) : loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>Wishlist is empty. Save items you love.</Text>
      ) : (
        <View style={styles.grid}>
          {items.map(p => (
            <View key={p.id} style={styles.item}>
              <ProductCard product={p} initialInWishlist />
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: 1, marginBottom: 16 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  item: { width: '50%', paddingHorizontal: 6, marginBottom: 12 }
});
