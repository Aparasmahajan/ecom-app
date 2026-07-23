import { View, Text, Pressable, StyleSheet, ImageBackground } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { Banner } from '../lib/api';
import { colors, radii } from '../theme';

/**
 * Mobile landing-page banner — mirrors the web PromoBanner templates
 * (hero / sale / split / minimal). Tapping it routes based on ctaHref,
 * which the storefront stores as a web-style path (e.g.
 * "/products?categoryId=shoes"). We parse that into a Products navigation.
 */
export default function BannerCard({ banner }: { banner: Banner }) {
  const nav = useNavigation<any>();

  const go = () => {
    const href = banner.ctaHref || '/products';
    const catMatch = href.match(/categoryId=([^&]+)/);
    if (catMatch) nav.navigate('Products', { categoryId: catMatch[1] });
    else nav.navigate('Products', {});
  };

  const isMinimal = banner.template === 'minimal';
  const overlayColor =
    banner.template === 'sale' ? 'rgba(10,10,10,0.78)' :
    banner.template === 'split' ? 'rgba(10,10,10,0.5)' :
    'rgba(10,10,10,0.55)';
  const titleColor = banner.template === 'sale' || isMinimal ? colors.accent : '#fff';
  const alignRight = banner.template === 'split';

  const content = (
    <View style={[styles.body, alignRight && { alignItems: 'flex-end' }]}>
      <Text style={[styles.title, { color: titleColor }, alignRight && { textAlign: 'right' }]}>
        {banner.title}
      </Text>
      {!!banner.subtitle && <Text style={styles.sub}>{banner.subtitle}</Text>}
      {!!banner.price && (
        <View style={styles.priceChip}><Text style={styles.priceText}>{banner.price}</Text></View>
      )}
      {!!banner.ctaText && (
        <View style={styles.ctaBtn}><Text style={styles.ctaText}>{banner.ctaText}</Text></View>
      )}
    </View>
  );

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { transform: [{ translateY: -2 }] }]}
      onPress={go}
    >
      {isMinimal ? (
        <View style={[styles.imgWrap, styles.minimalBg]}>{content}</View>
      ) : (
        <ImageBackground source={{ uri: banner.imageUrl }} imageStyle={styles.img} style={styles.imgWrap}>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: overlayColor }]} />
          {content}
        </ImageBackground>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.xl, overflow: 'hidden', marginBottom: 12
  },
  imgWrap: { minHeight: 180, justifyContent: 'center' },
  minimalBg: { backgroundColor: colors.card2 },
  img: { opacity: 0.6 },
  body: { padding: 22 },
  title: { fontSize: 26, fontWeight: '900', letterSpacing: 1 },
  sub: { color: colors.muted, fontSize: 13, marginTop: 8, maxWidth: '85%' },
  priceChip: {
    alignSelf: 'flex-start', backgroundColor: colors.accent,
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginTop: 12
  },
  priceText: { color: colors.black, fontWeight: '800', fontSize: 15 },
  ctaBtn: {
    alignSelf: 'flex-start', backgroundColor: colors.accent,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8, marginTop: 14
  },
  ctaText: { color: colors.black, fontWeight: '800', fontSize: 13, letterSpacing: 0.5 }
});
