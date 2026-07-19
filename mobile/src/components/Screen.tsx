import { View, ScrollView, StyleSheet, StatusBar, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  padding?: boolean;
  style?: ViewStyle;
}

export default function Screen({ children, scroll = true, padding = true, style }: Props) {
  const Body = scroll ? ScrollView : View;
  const bodyProps: any = scroll
    ? { contentContainerStyle: [padding && styles.padded, style], showsVerticalScrollIndicator: false }
    : { style: [styles.full, padding && styles.padded, style] };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <Body {...bodyProps}>{children}</Body>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  full: { flex: 1 },
  padded: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }
});
