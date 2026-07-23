import { useEffect, useState } from 'react';
import { View, Text, ImageBackground, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Screen from '../components/Screen';
import { api, Category } from '../lib/api';
import { bannerImage } from '../lib/images';
import { colors, radii } from '../theme';

export default function CategoriesScreen() {
  const nav = useNavigation<any>();
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setCats(await api.catalog.categories()); }
      catch { /* empty */ }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <Screen>
      <Text style={styles.h1}>CATEGORIES</Text>
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : cats.map(c => (
        <Pressable
          key={c.id}
          style={styles.card}
          onPress={() => nav.navigate('Products', { categoryId: c.id })}
        >
          <ImageBackground source={{ uri: bannerImage(c.id) }} style={styles.bg} imageStyle={styles.bgImg}>
            <View style={styles.overlay} />
            <View style={styles.content}>
              <Text style={styles.name}>{c.name.toUpperCase()}</Text>
              <Text style={styles.sub}>Explore Now →</Text>
            </View>
          </ImageBackground>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: 1, marginBottom: 16 },
  card: { borderRadius: radii.lg, overflow: 'hidden', marginBottom: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  bg: { height: 130 },
  bgImg: { borderRadius: radii.lg, opacity: 0.55 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,10,10,0.55)' },
  content: { padding: 20, height: '100%', justifyContent: 'center' },
  name: { color: colors.accent, fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 }
});
