import { View, Text, Pressable, StyleSheet, ImageBackground } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { Combo } from '../lib/api';
import { colors, radii, money } from '../theme';

/**
 * Mobile combo card — matches the visual language of the web ComboCard
 * (backdrop image + gradient overlay + gold combo-count pill + price).
 * Tapping it opens the products list filtered to this combo's items.
 */
export default function ComboCard({ combo }: { combo: Combo }) {
  const nav = useNavigation<any>();
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { transform: [{ translateY: -2 }] }]}
      onPress={() => nav.navigate('Products', { comboId: combo.id })}
    >
      <ImageBackground source={{ uri: combo.image }} imageStyle={styles.img} style={styles.imgWrap}>
        <View style={styles.overlay} />
        <View style={styles.body}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{combo.productIds.length}-PIECE COMBO</Text>
          </View>
          <Text style={styles.title}>{combo.name}</Text>
          <Text style={styles.desc} numberOfLines={2}>{combo.description}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{money(combo.comboPrice)}</Text>
            <Text style={styles.cta}>Shop combo →</Text>
          </View>
        </View>
      </ImageBackground>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    overflow: 'hidden',
    marginBottom: 12
  },
  imgWrap: { minHeight: 220, justifyContent: 'flex-end' },
  img:     { opacity: 0.55 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,10,0.65)'
  },
  body: { padding: 16 },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245,200,66,0.15)',
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 6
  },
  pillText: { color: colors.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  title:    { color: '#fff', fontSize: 20, fontWeight: '800' },
  desc:     { color: colors.muted, fontSize: 12, marginTop: 4 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10 },
  price:    { color: colors.accent, fontSize: 18, fontWeight: '800' },
  cta:      { color: '#fff', fontSize: 12, fontWeight: '600' }
});
