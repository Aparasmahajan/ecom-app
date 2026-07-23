import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { Field, notify } from './ui';
import { api, ApiError } from '../../lib/api';
import { useApp } from '../../state/store';
import { colors, radii } from '../../theme';

/**
 * The Admin tab. Customer-facing app normally has no admin — this surfaces it
 * for ADMIN / SUPER_ADMIN users only (RBAC). Not logged in as an admin →
 * login form. Logged in → a menu of the admin sections.
 */
export default function AdminScreen() {
  const user = useApp(s => s.user);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  return isAdmin ? <AdminHome /> : <AdminLogin />;
}

function AdminLogin() {
  const signIn = useApp(s => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) return notify('Enter email + password');
    setBusy(true);
    try {
      const { token, user } = await api.auth.adminLogin(email.trim().toLowerCase(), password);
      await signIn(token, user);
      notify('Welcome, ' + user.name);
    } catch (e) {
      notify(e instanceof ApiError ? e.message : 'Login failed');
    } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Text style={styles.h1}>Admin Login</Text>
      <Text style={styles.subtle}>
        Sign in with an ADMIN or SUPER_ADMIN account. Customers use the normal Sign In on Profile.
      </Text>
      <View style={{ height: 16 }} />
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title={busy ? 'Signing in…' : 'Sign In'} onPress={submit} loading={busy} style={{ marginTop: 8 }} />
    </Screen>
  );
}

function AdminHome() {
  const nav = useNavigation<any>();
  const user = useApp(s => s.user);
  const signOut = useApp(s => s.signOut);
  const isSuper = user?.role === 'SUPER_ADMIN';

  const sections: { key: string; label: string; icon: string; screen: string; super?: boolean }[] = [
    { key: 'orders',    label: 'Orders',    icon: '🧾', screen: 'AdminOrders' },
    { key: 'products',  label: 'Products',  icon: '👕', screen: 'AdminProducts' },
    { key: 'inventory', label: 'Inventory', icon: '📦', screen: 'AdminInventory' },
    { key: 'listing',   label: 'Listing',   icon: '🏷️', screen: 'AdminListing' },
    { key: 'combos',    label: 'Combos',    icon: '🎁', screen: 'AdminCombos' },
    { key: 'banners',   label: 'Banners',   icon: '🖼️', screen: 'AdminBanners' },
    { key: 'admins',    label: 'Admins',    icon: '⭐', screen: 'AdminAdmins', super: true }
  ];

  return (
    <Screen>
      <Text style={styles.h1}>Admin Panel</Text>
      <View style={styles.roleTag}>
        <Text style={styles.roleTagText}>{user?.role} · {user?.email}</Text>
      </View>

      <View style={styles.grid}>
        {sections.filter(s => !s.super || isSuper).map(s => (
          <View key={s.key} style={styles.tile}>
            <Pressable style={styles.tileInner} onPress={() => nav.navigate(s.screen)}>
              <Text style={styles.tileIcon}>{s.icon}</Text>
              <Text style={styles.tileLabel}>{s.label}</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <Button title="Sign out" variant="dark" onPress={signOut} style={{ marginTop: 20 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 24, fontWeight: '800' },
  subtle: { color: colors.muted, fontSize: 13, marginTop: 8, lineHeight: 19 },
  roleTag: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(245,200,66,0.15)',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginTop: 10, marginBottom: 8
  },
  roleTagText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, marginTop: 12 },
  tile: { width: '50%', padding: 6 },
  tileInner: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, padding: 18, minHeight: 96, justifyContent: 'center'
  },
  tileIcon: { fontSize: 26 },
  tileLabel: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 8 }
});
