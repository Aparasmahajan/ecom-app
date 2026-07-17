import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Screen from '../components/Screen';
import Button from '../components/Button';
import { api, ApiError, BASE_URL } from '../lib/api';
import { colors, radii } from '../theme';
import { useApp } from '../state/store';

type Step = 'email' | 'code';

/**
 * Customer-only sign in. Admin management happens on the web app — never
 * expose an admin login on the store-facing Android build.
 */
export default function AuthScreen() {
  const nav = useNavigation<any>();
  const signIn = useApp(s => s.signIn);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    try { await fn(); }
    catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      Alert.alert('Sign in failed', msg);
    }
    finally { setLoading(false); }
  };

  const sendOtp = () => run(async () => {
    if (!email.trim()) throw new ApiError(0, 'validation', 'Enter your email');
    await api.auth.requestOtp(email.trim());
    setStep('code');
    Alert.alert(
      'Code sent',
      `We sent a 6-digit code to ${email}.\n\nIn dev (no Brevo key), read it from the backend logs.`
    );
  });

  const verifyOtp = () => run(async () => {
    if (!/^\d{6}$/.test(otp)) throw new ApiError(0, 'validation', 'Enter the 6-digit code');
    const { token, user } = await api.auth.verifyOtp(email.trim(), otp);
    await signIn(token, user);
    nav.goBack();
  });

  return (
    <Screen>
      <View style={styles.form}>
        <Text style={styles.title}>SIGN IN</Text>
        <Text style={styles.subtitle}>Enter your email — we'll send you a code</Text>

        {step === 'email' && (
          <>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={colors.muted2}
              style={styles.input}
            />
            <Button title="SEND CODE" onPress={sendOtp} loading={loading} style={{ marginTop: 20 }} />
          </>
        )}

        {step === 'code' && (
          <>
            <Text style={styles.label}>6-DIGIT CODE</Text>
            <TextInput
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="123456"
              placeholderTextColor={colors.muted2}
              style={[styles.input, styles.otpInput]}
            />
            <Text style={styles.helper}>
              Sent to <Text style={{ color: colors.text }}>{email}</Text>
            </Text>
            <Button title="VERIFY & SIGN IN" onPress={verifyOtp} loading={loading} style={{ marginTop: 20 }} />
            <Pressable onPress={() => { setStep('email'); setOtp(''); }} style={{ marginTop: 12 }}>
              <Text style={styles.link}>← use a different email</Text>
            </Pressable>
          </>
        )}

        <Text style={styles.footer}>API: {BASE_URL}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24
  },
  title:    { color: colors.accent, fontSize: 20, fontWeight: '900', letterSpacing: 1.5 },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 4, marginBottom: 12 },
  label:    { color: colors.muted, fontSize: 12, letterSpacing: 0.5, marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 12, color: colors.text, fontSize: 14
  },
  otpInput: { textAlign: 'center', fontSize: 22, letterSpacing: 8, fontWeight: '700' },
  helper:   { color: colors.muted, fontSize: 12, marginTop: 8 },
  link:     { color: colors.accent, fontSize: 13 },
  footer:   { color: colors.muted2, fontSize: 11, marginTop: 20, textAlign: 'center' }
});
