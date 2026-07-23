/**
 * Small shared building blocks for the mobile admin screens, so each screen
 * stays focused. All styling pulls from the locked design system (theme.ts).
 */
import { Alert, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, radii } from '../../theme';

export function notify(msg: string) {
  Alert.alert('', msg);
}

/** Promise-based confirm dialog. Resolves true if the user confirms. */
export function confirmAsync(message: string, confirmLabel = 'Confirm'): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert('Please confirm', message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) }
    ]);
  });
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Field({ label, ...props }: { label?: string } & TextInputProps) {
  return (
    <View style={{ marginBottom: 10 }}>
      {label ? <Label>{label}</Label> : null}
      <TextInput
        placeholderTextColor={colors.muted2}
        {...props}
        style={[styles.input, props.multiline && { height: 72, textAlignVertical: 'top' }, props.style]}
      />
    </View>
  );
}

export function Pill({ text, tone = 'muted' }: { text: string; tone?: 'ok' | 'warn' | 'bad' | 'muted' | 'accent' | 'purple' }) {
  const map: Record<string, { bg: string; fg: string }> = {
    ok:     { bg: 'rgba(34,197,94,0.18)',  fg: '#4ade80' },
    warn:   { bg: 'rgba(245,200,66,0.15)', fg: colors.accent },
    bad:    { bg: 'rgba(239,68,68,0.15)',  fg: '#f87171' },
    purple: { bg: 'rgba(168,85,247,0.15)', fg: '#c084fc' },
    accent: { bg: colors.accent,           fg: colors.black },
    muted:  { bg: 'rgba(255,255,255,0.06)',fg: colors.muted }
  };
  const c = map[tone] || map.muted;
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.pillText, { color: c.fg }]}>{text}</Text>
    </View>
  );
}

/** Status → pill tone, matching the order lifecycle semantics. */
export function statusTone(status: string): 'ok' | 'warn' | 'bad' | 'muted' | 'purple' {
  switch (status) {
    case 'DELIVERED':
    case 'SHIPPED':   return 'ok';
    case 'PROCESSING':return 'warn';
    case 'CANCELLED': return 'bad';
    case 'REFUNDED':  return 'purple';
    default:          return 'muted'; // CREATED / PAID
  }
}

export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  label: { fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.sm, paddingHorizontal: 12, paddingVertical: 10,
    color: colors.text, fontSize: 14
  },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  card: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, padding: 14, marginBottom: 10
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, marginRight: 8
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.black }
});
