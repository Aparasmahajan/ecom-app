import { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { Card, Field, Pill, notify, confirmAsync } from './ui';
import { api, ApiError, AdminUser } from '../../lib/api';
import { useApp } from '../../state/store';
import { colors, radii } from '../../theme';

/** SUPER_ADMIN-only management of admin accounts (RBAC — the whole screen is
 *  reachable only from the Admins tile, which only shows for SUPER_ADMIN). */
export default function AdminAdmins() {
  const me = useApp(s => s.user);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [pwFor, setPwFor] = useState<AdminUser | null>(null);

  const load = async () => {
    setLoading(true);
    try { setAdmins(await api.admin.admins.list()); }
    catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toggle = async (a: AdminUser) => {
    try { await api.admin.admins.setEnabled(a.id, !a.enabled); notify(a.enabled ? 'Disabled' : 'Enabled'); load(); }
    catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
  };
  const del = async (a: AdminUser) => {
    if (!(await confirmAsync(`Delete admin ${a.email}?`, 'Delete'))) return;
    try { await api.admin.admins.remove(a.id); notify('Removed'); load(); }
    catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Text style={styles.h1}>Admins</Text>
        <Button title="+ Add Admin" size="sm" onPress={() => setShowAdd(true)} />
      </View>

      {loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} /> :
        admins.map(a => {
          const isMe = a.id === me?.id;
          const isSuper = a.role === 'SUPER_ADMIN';
          return (
            <Card key={a.id}>
              <View style={styles.rowBetween}>
                <Text style={styles.name}>{a.name}{isMe ? ' (you)' : ''}</Text>
                <Pill text={a.role} tone={isSuper ? 'warn' : 'muted'} />
              </View>
              <Text style={styles.sub}>{a.email}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                <Pill text={a.enabled ? 'Enabled' : 'Disabled'} tone={a.enabled ? 'ok' : 'bad'} />
              </View>
              <View style={styles.actions}>
                <Button title="Reset PW" size="sm" variant="secondary" onPress={() => setPwFor(a)} />
                {!isSuper && !isMe && (
                  <>
                    <Button title={a.enabled ? 'Disable' : 'Enable'} size="sm" variant="dark" onPress={() => toggle(a)} />
                    <Button title="Delete" size="sm" variant="danger" onPress={() => del(a)} />
                  </>
                )}
              </View>
            </Card>
          );
        })}

      {showAdd && <AddAdminModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      {pwFor && <ResetPwModal admin={pwFor} onClose={() => setPwFor(null)} />}
    </Screen>
  );
}

function AddAdminModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !name.trim() || password.length < 8) return notify('Email, name, and 8+ char password required');
    setBusy(true);
    try {
      await api.admin.admins.create({ email: email.trim().toLowerCase(), name: name.trim(), password, phone: phone.trim() || undefined });
      notify('Admin created'); onSaved();
    } catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
    finally { setBusy(false); }
  };

  return (
    <Sheet title="Add Admin" onClose={onClose}>
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Name" value={name} onChangeText={setName} />
      <Field label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="Password (min 8)" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title={busy ? 'Creating…' : 'Create'} onPress={submit} loading={busy} style={{ marginTop: 8 }} />
    </Sheet>
  );
}

function ResetPwModal({ admin, onClose }: { admin: AdminUser; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (password.length < 8) return notify('At least 8 characters');
    setBusy(true);
    try { await api.admin.admins.resetPassword(admin.id, password); notify('Password reset'); onClose(); }
    catch (e) { notify('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
    finally { setBusy(false); }
  };
  return (
    <Sheet title="Reset password" onClose={onClose}>
      <Text style={styles.sub}>for {admin.email}</Text>
      <View style={{ height: 10 }} />
      <Field label="New password (min 8)" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title={busy ? 'Saving…' : 'Reset'} onPress={submit} loading={busy} style={{ marginTop: 8 }} />
    </Sheet>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.modal}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose}><Text style={styles.close}>×</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>{children}<View style={{ height: 20 }} /></ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  h1: { color: colors.text, fontSize: 24, fontWeight: '800' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: colors.text, fontWeight: '700', fontSize: 15 },
  sub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.card, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, maxHeight: '92%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bg2, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl },
  modalTitle: { color: colors.accent, fontSize: 18, fontWeight: '800' },
  close: { color: colors.muted, fontSize: 28, lineHeight: 30 }
});
