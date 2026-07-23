import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Screen from '../components/Screen';
import Button from '../components/Button';
import { api, ApiError, BASE_URL } from '../lib/api';
import { colors, radii } from '../theme';
import { useApp } from '../state/store';

type Mode = 'otp' | 'password' | 'register' | 'forgot';

/**
 * Customer-only sign in. Supports passwordless OTP, email + password login,
 * registration, and OTP-based password reset. Admin management happens on the
 * web app — never expose an admin login on the store-facing Android build.
 */
export default function AuthScreen() {
  const nav = useNavigation<any>();
  const signIn = useApp(s => s.signIn);

  const [mode, setMode] = useState<Mode>('otp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otpStep, setOtpStep] = useState<'email' | 'code'>('email');
  const [forgotStep, setForgotStep] = useState<'email' | 'reset'>('email');
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

  const norm = () => email.trim().toLowerCase();

  const finish = async (token: string, user: Parameters<typeof signIn>[1]) => {
    await signIn(token, user);
    nav.goBack();
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setOtp(''); setPassword(''); setNewPassword('');
    setOtpStep('email'); setForgotStep('email');
  };

  /* ---- OTP (passwordless) ---- */
  const sendOtp = () => run(async () => {
    if (!norm()) throw new ApiError(0, 'validation', 'Enter your email');
    await api.auth.requestOtp(norm());
    setOtpStep('code');
    Alert.alert('Code sent', `We sent a 6-digit code to ${email}.\n\nIn dev (no Brevo key), read it from the backend logs.`);
  });
  const verifyOtp = () => run(async () => {
    if (!/^\d{6}$/.test(otp)) throw new ApiError(0, 'validation', 'Enter the 6-digit code');
    const { token, user } = await api.auth.verifyOtp(norm(), otp);
    await finish(token, user);
  });

  /* ---- Password login ---- */
  const login = () => run(async () => {
    if (!norm()) throw new ApiError(0, 'validation', 'Enter your email');
    if (!password) throw new ApiError(0, 'validation', 'Enter your password');
    const { token, user } = await api.auth.login(norm(), password);
    await finish(token, user);
  });

  /* ---- Register ---- */
  const register = () => run(async () => {
    if (!norm()) throw new ApiError(0, 'validation', 'Enter your email');
    if (!name.trim()) throw new ApiError(0, 'validation', 'Enter your name');
    if (password.length < 8) throw new ApiError(0, 'validation', 'Password must be at least 8 characters');
    const { token, user } = await api.auth.register({
      email: norm(), password, name: name.trim(), phone: phone.trim() || undefined
    });
    await finish(token, user);
  });

  /* ---- Forgot / reset password ---- */
  const sendReset = () => run(async () => {
    if (!norm()) throw new ApiError(0, 'validation', 'Enter your email');
    await api.auth.forgotPassword(norm());
    setForgotStep('reset');
    Alert.alert('Reset code sent', `We sent a code to ${email}.\n\nIn dev (no Brevo key), read it from the backend logs.`);
  });
  const resetPassword = () => run(async () => {
    if (!/^\d{6}$/.test(otp)) throw new ApiError(0, 'validation', 'Enter the 6-digit code');
    if (newPassword.length < 8) throw new ApiError(0, 'validation', 'Password must be at least 8 characters');
    await api.auth.resetPassword(norm(), otp, newPassword);
    Alert.alert('Password updated', 'Sign in with your new password.');
    switchMode('password');
  });

  const title = mode === 'register' ? 'CREATE ACCOUNT' : mode === 'forgot' ? 'RESET PASSWORD' : 'SIGN IN';

  return (
    <Screen>
      <View style={styles.form}>
        <Text style={styles.title}>{title}</Text>

        {/* Mode tabs (hidden during forgot-password) */}
        {mode !== 'forgot' && (
          <View style={styles.tabs}>
            {(['otp', 'password', 'register'] as Mode[]).map((m) => (
              <Button
                key={m}
                title={m === 'otp' ? 'OTP' : m === 'password' ? 'Password' : 'Register'}
                size="sm"
                variant={mode === m ? 'primary' : 'secondary'}
                onPress={() => switchMode(m)}
                disabled={loading}
                style={{ flex: 1 }}
              />
            ))}
          </View>
        )}

        {/* ---------- OTP ---------- */}
        {mode === 'otp' && otpStep === 'email' && (
          <>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false}
              keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={colors.muted2} style={styles.input} />
            <Button title="SEND CODE" onPress={sendOtp} loading={loading} style={{ marginTop: 20 }} />
          </>
        )}
        {mode === 'otp' && otpStep === 'code' && (
          <>
            <Text style={styles.label}>6-DIGIT CODE</Text>
            <TextInput value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6}
              placeholder="123456" placeholderTextColor={colors.muted2} style={[styles.input, styles.otpInput]} />
            <Text style={styles.helper}>Sent to <Text style={{ color: colors.text }}>{email}</Text></Text>
            <Button title="VERIFY & SIGN IN" onPress={verifyOtp} loading={loading} style={{ marginTop: 20 }} />
            <Pressable onPress={() => { setOtpStep('email'); setOtp(''); }} style={{ marginTop: 12 }}>
              <Text style={styles.link}>← use a different email</Text>
            </Pressable>
          </>
        )}

        {/* ---------- Password login ---------- */}
        {mode === 'password' && (
          <>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false}
              keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={colors.muted2} style={styles.input} />
            <Text style={styles.label}>PASSWORD</Text>
            <TextInput value={password} onChangeText={setPassword} secureTextEntry
              placeholder="Your password" placeholderTextColor={colors.muted2} style={styles.input} />
            <Button title="SIGN IN" onPress={login} loading={loading} style={{ marginTop: 20 }} />
            <Pressable onPress={() => switchMode('forgot')} style={{ marginTop: 12 }}>
              <Text style={styles.link}>Forgot password?</Text>
            </Pressable>
          </>
        )}

        {/* ---------- Register ---------- */}
        {mode === 'register' && (
          <>
            <Text style={styles.label}>NAME</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Your name"
              placeholderTextColor={colors.muted2} style={styles.input} />
            <Text style={styles.label}>EMAIL</Text>
            <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false}
              keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={colors.muted2} style={styles.input} />
            <Text style={styles.label}>PHONE (OPTIONAL)</Text>
            <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="9876543210"
              placeholderTextColor={colors.muted2} style={styles.input} />
            <Text style={styles.label}>PASSWORD</Text>
            <TextInput value={password} onChangeText={setPassword} secureTextEntry
              placeholder="At least 8 characters" placeholderTextColor={colors.muted2} style={styles.input} />
            <Button title="CREATE ACCOUNT" onPress={register} loading={loading} style={{ marginTop: 20 }} />
          </>
        )}

        {/* ---------- Forgot / reset ---------- */}
        {mode === 'forgot' && forgotStep === 'email' && (
          <>
            <Text style={styles.subtitle}>Enter your registered email — we'll send a code to reset your password.</Text>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false}
              keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={colors.muted2} style={styles.input} />
            <Button title="SEND RESET CODE" onPress={sendReset} loading={loading} style={{ marginTop: 20 }} />
            <Pressable onPress={() => switchMode('password')} style={{ marginTop: 12 }}>
              <Text style={styles.link}>← back to sign in</Text>
            </Pressable>
          </>
        )}
        {mode === 'forgot' && forgotStep === 'reset' && (
          <>
            <Text style={styles.label}>6-DIGIT CODE</Text>
            <TextInput value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6}
              placeholder="123456" placeholderTextColor={colors.muted2} style={[styles.input, styles.otpInput]} />
            <Text style={styles.label}>NEW PASSWORD</Text>
            <TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry
              placeholder="At least 8 characters" placeholderTextColor={colors.muted2} style={styles.input} />
            <Text style={styles.helper}>Code sent to <Text style={{ color: colors.text }}>{email}</Text></Text>
            <Button title="UPDATE PASSWORD" onPress={resetPassword} loading={loading} style={{ marginTop: 20 }} />
            <Pressable onPress={() => { setForgotStep('email'); setOtp(''); setNewPassword(''); }} style={{ marginTop: 12 }}>
              <Text style={styles.link}>← back</Text>
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
  tabs:     { flexDirection: 'row', gap: 8, marginTop: 14 },
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
