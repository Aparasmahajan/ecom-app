import { Pressable, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { colors, radii } from '../theme';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'dark' | 'danger';
  size?: 'md' | 'sm';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export default function Button({ title, onPress, variant = 'primary', size = 'md', disabled, loading, style }: Props) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isDark = variant === 'dark';
  const isDanger = variant === 'danger';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        isPrimary && styles.primary,
        isSecondary && styles.secondary,
        isDark && styles.dark,
        isDanger && styles.danger,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { transform: [{ scale: 0.98 }] },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.black : colors.accent} />
      ) : (
        <Text style={[
          styles.text,
          size === 'sm' && styles.textSm,
          isPrimary && { color: colors.black },
          isSecondary && { color: colors.accent },
          isDark && { color: colors.text },
          isDanger && { color: '#fff' }
        ]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center'
  },
  md: { paddingVertical: 12, paddingHorizontal: 20 },
  sm: { paddingVertical: 6, paddingHorizontal: 12 },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.accent },
  dark:      { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  danger:    { backgroundColor: colors.danger },
  text: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  textSm: { fontSize: 12 }
});
