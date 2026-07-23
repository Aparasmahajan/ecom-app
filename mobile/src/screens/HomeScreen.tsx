import { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, StyleSheet, ImageBackground, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Screen from '../components/Screen';
import ProductCard from '../components/ProductCard';
import ComboCard from '../components/ComboCard';
import BannerCarousel from '../components/BannerCarousel';
import Brand from '../components/Brand';
import Button from '../components/Button';
import { api, Banner, Category, Combo, Product } from '../lib/api';
import { HERO_IMAGE, chipImage } from '../lib/images';
import { colors, radii } from '../theme';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [ps, cs, kb, bn] = await Promise.all([
          api.catalog.products({}),
          api.catalog.categories(),
          api.catalog.combos(),
          api.catalog.banners().catch(() => [])
        ]);
        setProducts(ps);
        setCats(cs);
        setCombos(kb);
        setBanners(bn);
      } catch {
        // Backend unreachable — screen shows empty state.
      } finally { setLoading(false); }
    })();
  }, []);

  const hot = products.filter(p => p.hotSeller).slice(0, 6);
  const arrivals = products.slice().reverse().slice(0, 8);

  return (
    <Screen>
      <View style={styles.headerRow}><Brand /></View>

      {/* Admin-managed banners are the landing hero. The static hero below is a
          fallback only when no banners are configured (avoids a duplicate hero). */}
      {banners.length > 0 ? (
        <BannerCarousel banners={banners} />
      ) : (
        <ImageBackground source={{ uri: HERO_IMAGE }} imageStyle={styles.heroImg} style={styles.hero}>
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>NEW{'\n'}SEASON{'\n'}COLLECTION</Text>
            <Text style={styles.heroSub}>Elevate Your Style</Text>
            <Button title="SHOP NOW" onPress={() => navigation.navigate('Products', {})} style={{ alignSelf: 'flex-start', marginTop: 8 }} />
          </View>
        </ImageBackground>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {cats.map(c => (
          <Pressable key={c.id} style={styles.chip} onPress={() => navigation.navigate('Products', { categoryId: c.id })}>
            <View style={styles.chipImgWrap}>
              <Image source={{ uri: chipImage(c.id) }} style={styles.chipImg} />
            </View>
            <Text style={styles.chipName}>{c.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading && <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />}

      <SectionTitle title="Trending Now" onSeeAll={() => navigation.navigate('Products', {})} />
      <View style={styles.grid}>
        {hot.map(p => (
          <View key={p.id} style={styles.gridItem}><ProductCard product={p} /></View>
        ))}
      </View>

      <SectionTitle title="New Arrivals" onSeeAll={() => navigation.navigate('Products', {})} />
      <View style={styles.grid}>
        {arrivals.map(p => (
          <View key={p.id} style={styles.gridItem}><ProductCard product={p} /></View>
        ))}
      </View>

      {combos.length > 0 && (
        <>
          <SectionTitle title="Curated Combos" />
          {combos.map(c => <ComboCard key={c.id} combo={c} />)}
        </>
      )}
    </Screen>
  );
}

function SectionTitle({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll}><Text style={styles.viewAll}>View All</Text></Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { marginBottom: 16, flexDirection: 'row', alignItems: 'center' },

  hero: { borderRadius: radii.xl, overflow: 'hidden', minHeight: 220, justifyContent: 'center', marginBottom: 20 },
  heroImg: { borderRadius: radii.xl },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,10,10,0.55)' },
  heroContent: { padding: 24 },
  heroTitle: { color: '#fff', fontSize: 30, fontWeight: '900', lineHeight: 34, letterSpacing: 1 },
  heroSub: { color: colors.muted, fontSize: 13, marginTop: 8, marginBottom: 8 },

  chipRow: { paddingVertical: 4, paddingRight: 16, gap: 14 },
  chip: { width: 76, alignItems: 'center' },
  chipImgWrap: {
    width: 68, height: 68, borderRadius: 34,
    borderWidth: 2, borderColor: colors.border,
    overflow: 'hidden', marginBottom: 6, backgroundColor: colors.card
  },
  chipImg: { width: '100%', height: '100%' },
  chipName: { fontSize: 12, color: colors.text, fontWeight: '500' },

  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  viewAll: { color: colors.accent, fontSize: 13, fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  gridItem: { width: '50%', paddingHorizontal: 6, marginBottom: 12 }
});
