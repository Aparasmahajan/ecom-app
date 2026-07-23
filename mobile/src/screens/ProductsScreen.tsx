import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import Screen from '../components/Screen';
import ProductCard from '../components/ProductCard';
import Button from '../components/Button';
import { api, ApiError, Category, Combo, Product } from '../lib/api';
import { colors, radii, money } from '../theme';
import { useApp } from '../state/store';

export default function ProductsScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const user = useApp(s => s.user);
  const refresh = useApp(s => s.refresh);
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [combo, setCombo] = useState<Combo | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingCombo, setAddingCombo] = useState(false);
  const [query, setQuery] = useState('');
  const categoryId: string = route.params?.categoryId || '';
  const comboId: string = route.params?.comboId || '';

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [ps, cs] = await Promise.all([
          api.catalog.products({ categoryId: categoryId || undefined }),
          api.catalog.categories()
        ]);
        setCats(cs);
        if (comboId) {
          const c = await api.catalog.combo(comboId);
          setCombo(c);
          setProducts(ps.filter(p => c.productIds.includes(p.id)));
        } else {
          setCombo(null);
          setProducts(ps);
        }
      } catch {
        // ignore — empty state
      } finally { setLoading(false); }
    })();
  }, [categoryId, comboId]);

  const addComboToCart = async () => {
    if (!user) { nav.navigate('Auth'); return; }
    if (!combo) return;
    setAddingCombo(true);
    try {
      for (const p of products) {
        const variant = p.variants.find(v => v.stock > 0) || p.variants[0];
        if (variant) await api.cart.add(variant.id, 1, `Combo: ${combo.name}`);
      }
      await refresh();
      Alert.alert('Combo added', 'All combo items are in your cart.', [
        { text: 'Go to cart', onPress: () => nav.navigate('Root', { screen: 'Cart' }) }
      ]);
    } catch (e) {
      Alert.alert('Failed', e instanceof ApiError ? e.message : 'Could not add combo');
    } finally { setAddingCombo(false); }
  };

  const currentCat = useMemo(() => cats.find(c => c.id === categoryId), [cats, categoryId]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p =>
      p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }, [products, query]);

  return (
    <Screen scroll={false}>
      <Text style={styles.title}>{combo ? combo.name.toUpperCase() : currentCat ? currentCat.name.toUpperCase() : 'ALL PRODUCTS'}</Text>

      {combo && (
        <View style={styles.comboBanner}>
          <Text style={styles.comboDesc}>{combo.productIds.length}-PIECE COMBO · {combo.description}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <Text style={styles.comboPrice}>{money(combo.comboPrice)}</Text>
            <Button title={addingCombo ? 'ADDING…' : 'ADD COMBO TO CART'} size="sm" loading={addingCombo} onPress={addComboToCart} />
          </View>
        </View>
      )}

      {!combo && (
        <>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search products…"
            placeholderTextColor={colors.muted2}
            style={styles.search}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={styles.chipRow}>
              <Chip label="All" active={!categoryId} onPress={() => nav.setParams({ categoryId: '' })} />
              {cats.map(c => (
                <Chip key={c.id} label={c.name} active={categoryId === c.id} onPress={() => nav.setParams({ categoryId: c.id })} />
              ))}
            </View>
          </ScrollView>
        </>
      )}

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlashList
          data={shown}
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
  search: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 10,
    color: colors.text, fontSize: 14, marginBottom: 12
  },
  comboBanner: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.accent,
    borderRadius: radii.lg, padding: 14, marginBottom: 14
  },
  comboDesc: { color: colors.muted, fontSize: 13 },
  comboPrice: { color: colors.accent, fontSize: 18, fontWeight: '800' },
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
