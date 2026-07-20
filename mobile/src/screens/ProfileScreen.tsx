import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Screen from '../components/Screen';
import { api } from '../lib/api';
import { colors, radii } from '../theme';
import { useApp } from '../state/store';

export default function ProfileScreen() {
  const nav = useNavigation<any>();
  const user = useApp(s => s.user);
  const signOut = useApp(s => s.signOut);
  const [orderCount, setOrderCount] = useState(0);
  const [wishCount, setWishCount] = useState(0);
  const [addrCount, setAddrCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [orders, wish, addrs] = await Promise.all([
        api.orders.list(),
        api.wishlist.list(),
        api.me.addresses.list()
      ]);
      setOrderCount(orders.length);
      setWishCount(wish.length);
      setAddrCount(addrs.length);
    } catch { /* keep prior values */ }
    finally { setLoading(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!user) {
    return (
      <Screen>
        <Text style={styles.h1}>MY PROFILE</Text>
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Text style={{ color: colors.muted, marginBottom: 20 }}>You&apos;re not signed in.</Text>
          <Pressable onPress={() => nav.navigate('Auth')} style={styles.signInBtn}>
            <Text style={styles.signInText}>SIGN IN</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const initial = (user.name || user.email)[0]?.toUpperCase() || 'U';
  const menu: Array<{ label: string; icon: string; onPress?: () => void }> = [
    { label: 'My Orders', icon: '📋', onPress: () => nav.navigate('Orders') },
    { label: 'My Wishlist', icon: '♡', onPress: () => nav.navigate('Root', { screen: 'Wishlist' }) },
    { label: 'Addresses', icon: '📍', onPress: () => nav.navigate('Addresses') },
    { label: 'Payment Methods', icon: '💳' },
    { label: 'Account Settings', icon: '⚙' },
    { label: 'Help & Support', icon: '?' },
    { label: 'About Us', icon: 'ℹ' }
  ];

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
        <Text style={styles.name}>{user.name.toUpperCase()}</Text>
        <Text style={styles.email}>{user.email}</Text>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} />
        ) : (
          <View style={styles.stats}>
            <Stat label="Orders" val={orderCount} />
            <Stat label="Wishlist" val={wishCount} />
            <Stat label="Addresses" val={addrCount} />
          </View>
        )}
      </View>

      <View style={styles.menu}>
        {menu.map((m, i) => (
          <Pressable
            key={m.label}
            onPress={m.onPress}
            style={[styles.item, i === menu.length - 1 && { borderBottomWidth: 0 }]}
          >
            <Text style={styles.icon}>{m.icon}</Text>
            <Text style={styles.itemText}>{m.label}</Text>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        ))}
        <Pressable style={[styles.item, { borderBottomWidth: 0 }]} onPress={signOut}>
          <Text style={[styles.icon, { color: colors.danger }]}>⎋</Text>
          <Text style={[styles.itemText, { color: colors.danger }]}>Logout</Text>
          <Text style={styles.chev}>›</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function Stat({ label, val }: { label: string; val: number }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color: colors.accent, fontSize: 22, fontWeight: '800' }}>{val}</Text>
      <Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 0.5 }}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  header: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: 24, alignItems: 'center', marginBottom: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: colors.black, fontSize: 28, fontWeight: '900' },
  name: { color: colors.text, fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  email: { color: colors.muted, fontSize: 13, marginTop: 2 },
  stats: { flexDirection: 'row', width: '100%', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  menu: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  icon: { color: colors.accent, fontSize: 18, width: 24, textAlign: 'center', marginRight: 12 },
  itemText: { color: colors.text, fontSize: 14, flex: 1 },
  chev: { color: colors.muted, fontSize: 20 },
  signInBtn: { backgroundColor: colors.accent, paddingHorizontal: 28, paddingVertical: 12, borderRadius: radii.sm },
  signInText: { color: colors.black, fontWeight: '800', letterSpacing: 0.5 }
});
