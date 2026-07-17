import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import Screen from '../components/Screen';
import ProductCard from '../components/ProductCard';
import { api, Category, Product } from '../lib/api';
import { colors, radii } from '../theme';

export default function ProductsScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const categoryId: string = route.params?.categoryId || '';

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [ps, cs] = await Promise.all([
          api.catalog.products({ categoryId: categoryId || undefined }),
          api.catalog.categories()
        ]);
        setProducts(ps);
        setCats(cs);
      } catch {
        // ignore — empty state
      } finally { setLoading(false); }
    })();
  }, [categoryId]);

  const currentCat = useMemo(() => cats.find(c => c.id === categoryId), [cats, categoryId]);

  return (
    <Screen scroll={false}>
      <Text style={styles.title}>{currentCat ? currentCat.name.toUpperCase() : 'ALL PRODUCTS'}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={styles.chipRow}>
          <Chip label="All" active={!categoryId} onPress={() => nav.setParams({ categoryId: '' })} />
          {cats.map(c => (
            <Chip key={c.id} label={c.name} active={categoryId === c.id} onPress={() => nav.setParams({ categoryId: c.id })} />
          ))}
        </View>
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlashList
          data={products}
          keyExtractor={(p) => p.id}
          numColumns={2}
          estimatedItemSize={280}
          renderItem={({ item }) => (
            <View style={{ flex: 1, padding: 6 }}>
              <ProductCard product={item} />
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No products.</Text>}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </Screen>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 18, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: radii.pill,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.muted, fontSize: 13 },
  chipTextActive: { color: colors.black, fontWeight: '700' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 }
});
