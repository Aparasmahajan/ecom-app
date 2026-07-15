'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp, scoped } from '@/lib/context';
import { K, get, set, uid } from '@/lib/storage';
import type { Address, User } from '@/lib/types';

export default function ProfilePage() {
  const { user, ready, refresh, signOut, toast } = useApp();
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addrs, setAddrs] = useState<Address[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) { router.push('/auth'); return; }
    setName(user.name);
    setPhone(user.phone || '');
    setAddrs(get<Address[]>(scoped(K.ADDRS, user.id), []));
  }, [ready, user, router]);

  if (!user) return null;

  const saveProfile = () => {
    const users = get<User[]>(K.USERS, []);
    const u = users.find(x => x.id === user.id);
    if (!u) return;
    u.name = name;
    u.phone = phone;
    set(K.USERS, users);
    refresh();
    toast('Profile saved');
  };

  const doSignOut = () => {
    signOut();
    toast('Signed out');
    router.push('/');
  };

  const setDefault = (id: string) => {
    const list = addrs.map(a => ({ ...a, isDefault: a.id === id }));
    set(scoped(K.ADDRS, user.id), list);
    setAddrs(list);
  };

  const deleteAddr = (id: string) => {
    const list = addrs.filter(a => a.id !== id);
    set(scoped(K.ADDRS, user.id), list);
    setAddrs(list);
  };

  const addAddress = (data: Omit<Address, 'id'>) => {
    const list = [...addrs];
    if (data.isDefault) list.forEach(x => (x.isDefault = false));
    const newAddr: Address = { ...data, id: uid() };
    if (!list.length) newAddr.isDefault = true;
    list.push(newAddr);
    set(scoped(K.ADDRS, user.id), list);
    setAddrs(list);
    setShowModal(false);
    toast('Address added');
  };

  return (
    <>
      <h2>Profile</h2>
      <div className="form">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <label>Email</label>
        <input value={user.email} disabled />
        <label>Phone</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        <div className="form-actions">
          <button className="btn" onClick={saveProfile}>Save</button>
          <button className="btn danger" onClick={doSignOut}>Sign out</button>
        </div>
      </div>

      <div className="section-title">
        <h3 style={{ fontSize: 18 }}>Addresses</h3>
        <button className="btn small" onClick={() => setShowModal(true)}>+ Add Address</button>
      </div>
      {addrs.length ? addrs.map(a => (
        <div className="list-item" key={a.id}>
          <div className="info">
            <div className="name">
              {a.fullName} {a.isDefault && <span className="tag">DEFAULT</span>}
            </div>
            <div className="meta">
              {a.phone} · {a.line1}{a.line2 ? ', ' + a.line2 : ''}, {a.city}, {a.state} - {a.pincode}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {!a.isDefault && (
              <button className="btn small secondary" onClick={() => setDefault(a.id)}>Set Default</button>
            )}
            <button className="btn small danger" onClick={() => deleteAddr(a.id)}>Delete</button>
          </div>
        </div>
      )) : <p className="empty">No saved addresses yet.</p>}

      {showModal && (
        <AddressModal onCancel={() => setShowModal(false)} onSave={addAddress} toast={toast} />
      )}
    </>
  );
}

function AddressModal({
  onCancel,
  onSave,
  toast
}: {
  onCancel: () => void;
  onSave: (a: Omit<Address, 'id'>) => void;
  toast: (m: string) => void;
}) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const submit = () => {
    if (!fullName || !/^\d{10}$/.test(phone) || !/^\d{6}$/.test(pincode) || !line1 || !city || !state) {
      toast('Fill all fields correctly (10-digit phone, 6-digit pin)');
      return;
    }
    onSave({ fullName, phone, line1, line2, city, state, pincode, isDefault });
  };

  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Add Address</h3>
        <label>Full Name</label>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <label>Phone (10-digit)</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        <label>Address Line 1</label>
        <input value={line1} onChange={(e) => setLine1(e.target.value)} />
        <label>Address Line 2</label>
        <input value={line2} onChange={(e) => setLine2(e.target.value)} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label>City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>State</label>
            <input value={state} onChange={(e) => setState(e.target.value)} />
          </div>
        </div>
        <label>Pincode (6-digit)</label>
        <input value={pincode} onChange={(e) => setPincode(e.target.value)} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            style={{ width: 'auto' }}
          /> Set as default
        </label>
        <div className="form-actions">
          <button className="btn" onClick={submit}>Save</button>
          <button className="btn secondary" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
