'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp, scoped } from '@/lib/context';
import { K, get, set, uid } from '@/lib/storage';
import type { Address, Order, User } from '@/lib/types';

export default function ProfilePage() {
  const { user, ready, refresh, signOut, toast } = useApp();
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addrs, setAddrs] = useState<Address[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [wishCount, setWishCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) { router.push('/auth'); return; }
    setName(user.name);
    setPhone(user.phone || '');
    setAddrs(get<Address[]>(scoped(K.ADDRS, user.id), []));
    setOrderCount(get<Order[]>(scoped(K.ORDERS, user.id), []).length);
    setWishCount(get<string[]>(scoped(K.WISH, user.id), []).length);
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
    setEditingProfile(false);
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

  const initial = (user.name || user.email)[0]?.toUpperCase() || 'U';

  return (
    <>
      <div className="profile-header">
        <div className="profile-avatar">{initial}</div>
        <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: 1 }}>{user.name.toUpperCase()}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{user.email}</div>
        <div className="profile-stats">
          <div className="stat">
            <div className="stat-num">{orderCount}</div>
            <div className="stat-label">Orders</div>
          </div>
          <div className="stat">
            <div className="stat-num">{wishCount}</div>
            <div className="stat-label">Wishlist</div>
          </div>
          <div className="stat">
            <div className="stat-num">{addrs.length}</div>
            <div className="stat-label">Addresses</div>
          </div>
        </div>
      </div>

      <div className="profile-menu">
        <Link href="/orders"><span className="pm-icon">📋</span>My Orders<span className="pm-chevron">›</span></Link>
        <Link href="/wishlist"><span className="pm-icon">♡</span>My Wishlist<span className="pm-chevron">›</span></Link>
        <button onClick={() => setEditingProfile(true)}><span className="pm-icon">👤</span>Account Settings<span className="pm-chevron">›</span></button>
        <button onClick={() => setShowModal(true)}><span className="pm-icon">📍</span>Manage Addresses<span className="pm-chevron">›</span></button>
        <Link href="/offers"><span className="pm-icon">🎁</span>Offers<span className="pm-chevron">›</span></Link>
        <button onClick={doSignOut} style={{ color: 'var(--danger)' }}>
          <span className="pm-icon" style={{ color: 'var(--danger)' }}>⎋</span>Logout<span className="pm-chevron">›</span>
        </button>
      </div>

      {addrs.length > 0 && (
        <>
          <div className="section-title"><h2>Saved Addresses</h2></div>
          {addrs.map(a => (
            <div className="list-item" key={a.id}>
              <div className="info">
                <div className="name">
                  {a.fullName} {a.isDefault && <span className="tag">DEFAULT</span>}
                </div>
                <div className="meta">
                  {a.phone} · {a.line1}{a.line2 ? ', ' + a.line2 : ''}, {a.city}, {a.state} - {a.pincode}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexDirection: 'column' }}>
                {!a.isDefault && (
                  <button className="btn small secondary" onClick={() => setDefault(a.id)}>Default</button>
                )}
                <button className="btn small danger" onClick={() => deleteAddr(a.id)}>Delete</button>
              </div>
            </div>
          ))}
        </>
      )}

      {editingProfile && (
        <div className="modal-bg" onClick={() => setEditingProfile(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Account Settings</h3>
            <label style={{ display: 'block', margin: '12px 0 6px', fontSize: 12, color: 'var(--muted)' }}>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)' }}
            />
            <label style={{ display: 'block', margin: '12px 0 6px', fontSize: 12, color: 'var(--muted)' }}>Email</label>
            <input
              value={user.email}
              disabled
              style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--muted)' }}
            />
            <label style={{ display: 'block', margin: '12px 0 6px', fontSize: 12, color: 'var(--muted)' }}>Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)' }}
            />
            <div className="form-actions">
              <button className="btn" onClick={saveProfile}>Save</button>
              <button className="btn secondary" onClick={() => setEditingProfile(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <AddressModal onCancel={() => setShowModal(false)} onSave={addAddress} toast={toast} />
      )}
    </>
  );
}

function AddressModal({
  onCancel, onSave, toast
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

  const input = (v: string, on: (s: string) => void) => (
    <input value={v} onChange={(e) => on(e.target.value)}
      style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', marginBottom: 4 }} />
  );

  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Add Address</h3>
        <label style={{ fontSize: 12, color: 'var(--muted)' }}>Full Name</label>{input(fullName, setFullName)}
        <label style={{ fontSize: 12, color: 'var(--muted)' }}>Phone (10-digit)</label>{input(phone, setPhone)}
        <label style={{ fontSize: 12, color: 'var(--muted)' }}>Address Line 1</label>{input(line1, setLine1)}
        <label style={{ fontSize: 12, color: 'var(--muted)' }}>Address Line 2</label>{input(line2, setLine2)}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>City</label>{input(city, setCity)}
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>State</label>{input(state, setState)}
          </div>
        </div>
        <label style={{ fontSize: 12, color: 'var(--muted)' }}>Pincode (6-digit)</label>{input(pincode, setPincode)}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 13 }}>
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} style={{ width: 'auto' }} />
          Set as default
        </label>
        <div className="form-actions">
          <button className="btn" onClick={submit}>Save</button>
          <button className="btn secondary" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
