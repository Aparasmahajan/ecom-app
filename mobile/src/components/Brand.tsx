import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function Brand({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const main = size === 'lg' ? 32 : 20;
  const sub = size === 'lg' ? 12 : 10;
  const trackMain = size === 'lg' ? 6 : 2;
  const trackSub = size === 'lg' ? 4 : 3;
  return (
    <View>
      <Text style={{ color: colors.text, fontSize: main, fontWeight: '900', letterSpacing: trackMain }}>URBAN</Text>
      <Text style={{ color: colors.accent, fontSize: sub, letterSpacing: trackSub, marginTop: 2 }}>CLOTHING CO</Text>
    </View>
  );
}
