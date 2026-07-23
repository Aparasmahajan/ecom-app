import { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Dimensions, StyleSheet, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import BannerCard from './BannerCard';
import type { Banner } from '../lib/api';
import { colors } from '../theme';

/**
 * Auto-rotating banner carousel for the mobile Home screen. One banner per
 * page, advances every few seconds, with dot indicators. Width is measured via
 * onLayout so it fills the padded content column exactly.
 */
export default function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [w, setW] = useState(Dimensions.get('window').width - 32);
  const [index, setIndex] = useState(0);
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => {
      setIndex(prev => {
        const next = (prev + 1) % banners.length;
        ref.current?.scrollTo({ x: next * w, animated: true });
        return next;
      });
    }, 4500);
    return () => clearInterval(t);
  }, [banners.length, w]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (w > 0) setIndex(Math.round(e.nativeEvent.contentOffset.x / w));
  };

  if (!banners.length) return null;

  return (
    <View style={{ marginBottom: 8 }} onLayout={e => setW(e.nativeEvent.layout.width)}>
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
      >
        {banners.map(b => (
          <View key={b.id} style={{ width: w }}><BannerCard banner={b} /></View>
        ))}
      </ScrollView>
      {banners.length > 1 && (
        <View style={styles.dots}>
          {banners.map((b, i) => (
            <View key={b.id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: -2 },
  dot: { width: 7, height: 7, borderRadius: 999, backgroundColor: colors.border2 },
  dotActive: { width: 20, backgroundColor: colors.accent }
});
