import { useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import Button from '../components/Button';
import { api, ApiError, Address } from '../lib/api';
import { colors, radii } from '../theme';
import { useApp } from '../state/store';

type Form = {
  fullName: string; phone: string; line1: string; line2: string;
  city: string; state: string; pincode: string; isDefault: boolean;
};

const EMPTY: Form = { fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', isDefault: false };

export default function AddressesScreen() {
  const user = useApp(s => s.user);
  const [list, setList] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setList([]); setLoading(false); return; }
    setLoading(true);
    try { setList(await api.me.addresses.list()); }
    catch { setList([]); }
    finally { setLoading(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const set = (k: keyof Form, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => { setForm(EMPTY); setEditing(null); setShowForm(true); };
  const openEdit = (a: Address) => {
    setForm({
      fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 || '',
      city: a.city, state: a.state, pincode: a.pincode, isDefault: a.isDefault
    });
    setEditing(a.id);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.fullName.trim()) return Alert.alert('Missing', 'Enter the full name');
    if (!/^\d{10}$/.test(form.phone)) return Alert.alert('Invalid phone', 'Phone must be 10 digits');
    if (!form.line1.trim()) return Alert.alert('Missing', 'Enter address line 1');
    if (!form.city.trim() || !form.state.trim()) return Alert.alert('Missing', 'Enter city and state');
    if (!/^\d{6}$/.test(form.pincode)) return Alert.alert('Invalid pincode', 'Pincode must be 6 digits');
    setBusy(true);
    try {
      const body = {
        fullName: form.fullName.trim(), phone: form.phone.trim(), line1: form.line1.trim(),
        line2: form.line2.trim() || undefined, city: form.city.trim(), state: form.state.trim(),
        pincode: form.pincode.trim(), isDefault: form.isDefault
      };
      if (editing) await api.me.addresses.update(editing, body);
      else await api.me.addresses.create(body);
      setShowForm(false);
      await load();
    } catch (e) {
      Alert.alert('Failed', e instanceof ApiError ? e.message : 'Could not save address');
    } finally { setBusy(false); }
  };

  const remove = (id: string) => {
    Alert.alert('Delete address?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.me.addresses.remove(id); await load(); }
        catch { Alert.alert('Failed'); }
      } }
    ]);
  };

  const makeDefault = async (id: string) => {
    try { await api.me.addresses.makeDefault(id); await load(); }
    catch { Alert.alert('Failed'); }
  };

  if (!user) {
    return <Screen><Text style={styles.h1}>ADDRESSES</Text><Text style={styles.empty}>Sign in to manage your addresses.</Text></Screen>;
  }

  return (
    <Screen>
      <Text style={styles.h1}>ADDRESS BOOK</Text>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <>
          {list.length === 0 && !showForm && (
            <Text style={styles.empty}>No saved addresses yet.</Text>
          )}

          {list.map(a => (
            <View key={a.id} style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.name}>{a.fullName}</Text>
                {a.isDefault && <View style={styles.defBadge}><Text style={styles.defText}>DEFAULT</Text></View>}
              </View>
              <Text style={styles.addr}>{a.line1}{a.line2 ? `, ${a.line2}` : ''}</Text>
              <Text style={styles.addr}>{a.city}, {a.state} — {a.pincode}</Text>
              <Text style={styles.addr}>📞 {a.phone}</Text>
              <View style={styles.cardActions}>
                {!a.isDefault && (
                  <Pressable onPress={() => makeDefault(a.id)}><Text style={styles.link}>Set default</Text></Pressable>
                )}
                <Pressable onPress={() => openEdit(a)}><Text style={styles.link}>Edit</Text></Pressable>
                <Pressable onPress={() => remove(a.id)}><Text style={[styles.link, { color: colors.danger }]}>Delete</Text></Pressable>
              </View>
            </View>
          ))}

          {showForm ? (
            <View style={styles.form}>
              <Text style={styles.formTitle}>{editing ? 'EDIT ADDRESS' : 'NEW ADDRESS'}</Text>
              <Field label="FULL NAME" value={form.fullName} onChange={(v) => set('fullName', v)} />
              <Field label="PHONE (10 DIGITS)" value={form.phone} onChange={(v) => set('phone', v)} keyboardType="phone-pad" />
              <Field label="ADDRESS LINE 1" value={form.line1} onChange={(v) => set('line1', v)} />
              <Field label="ADDRESS LINE 2 (OPTIONAL)" value={form.line2} onChange={(v) => set('line2', v)} />
              <Field label="CITY" value={form.city} onChange={(v) => set('city', v)} />
              <Field label="STATE" value={form.state} onChange={(v) => set('state', v)} />
              <Field label="PINCODE (6 DIGITS)" value={form.pincode} onChange={(v) => set('pincode', v)} keyboardType="number-pad" />
              <Pressable style={styles.checkRow} onPress={() => set('isDefault', !form.isDefault)}>
                <View style={[styles.check, form.isDefault && styles.checkOn]}>
                  {form.isDefault && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={styles.checkLabel}>Set as default address</Text>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <Button title="CANCEL" variant="dark" style={{ flex: 1 }} onPress={() => setShowForm(false)} />
                <Button title="SAVE" style={{ flex: 1 }} loading={busy} onPress={save} />
              </View>
            </View>
          ) : (
            <Button title="+ ADD NEW ADDRESS" variant="secondary" style={{ marginTop: 8 }} onPress={openAdd} />
          )}
        </>
      )}
    </Screen>
  );
}

function Field({ label, value, onChange, keyboardType }: {
  label: string; value: string; onChange: (v: string) => void; keyboardType?: any;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        placeholderTextColor={colors.muted2}
        style={styles.input}
      />
    </>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: 1, marginBottom: 16 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40, marginBottom: 20 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: 16, marginBottom: 12 },
  name: { color: colors.text, fontWeight: '700', fontSize: 15 },
  defBadge: { backgroundColor: 'rgba(245,200,66,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill },
  defText: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  addr: { color: colors.muted, fontSize: 13, marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 18, marginTop: 12 },
  link: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  form: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: 16, marginTop: 8 },
  formTitle: { color: colors.accent, fontSize: 15, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  label: { color: colors.muted, fontSize: 12, letterSpacing: 0.5, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.text, fontSize: 14 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkMark: { color: colors.black, fontWeight: '900', fontSize: 14 },
  checkLabel: { color: colors.text, fontSize: 14 }
});
