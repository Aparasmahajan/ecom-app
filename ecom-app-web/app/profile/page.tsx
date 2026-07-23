'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { api, ApiError, Address } from '@/lib/api';

export default function ProfilePage() {
  const { user, ready, refresh, signOut, toast } = useApp();
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addrs, setAddrs] = useState<Address[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [wishCount, setWishCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingAddr, setEditingAddr] = useState<Address | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, orders, wish] = await Promise.all([
        api.me.addresses.list(),
        api.orders.list(),
        api.wishlist.list()
      ]);
      setAddrs(a);
      setOrderCount(orders.length);
      setWishCount(wish.length);
    } catch (e) {
      toast('Failed to load profile: ' + (e instanceof ApiError ? e.message : (e as Error).message));
    }
  }, [toast]);

  useEffect(() => {
    if (!ready) return;
    if (!user) { router.push('/auth'); return; }
    setName(user.name);
    setPhone(user.phone || '');
    load();
  }, [ready, user, router, load]);

  if (!user) return null;

  const saveProfile = async () => {
    setBusy(true);
    try {
      await api.me.update({ name, phone });
      await refresh();
      setEditingProfile(false);
      toast('Profile saved');
    } catch (e) {
      toast('Save failed: ' + (e instanceof ApiError ? e.message : (e as Error).message));
    } finally { setBusy(false); }
  };

  const doSignOut = async () => {
    await signOut();
    toast('Signed out');
    router.push('/');
  };

  const setDefault = async (id: string) => {
    try { await api.me.addresses.makeDefault(id); await load(); }
    catch { toast('Failed'); }
  };
  const deleteAddr = async (id: string) => {
    try { await api.me.addresses.remove(id); await load(); toast('Address deleted'); }
    catch { toast('Delete failed'); }
  };
  const addAddress = async (data: Omit<Address, 'id'>) => {
    try {
      await api.me.addresses.create(data);
      await load();
      setShowModal(false);
      toast('Address added');
    } catch (e) {
      toast('Failed to add: ' + (e instanceof ApiError ? e.message : (e as Error).message));
    }
  };
  const saveEditAddr = async (data: Omit<Address, 'id'>) => {
    if (!editingAddr) return;
    try {
      await api.me.addresses.update(editingAddr.id, data);
      await load();
      setEditingAddr(null);
      toast('Address updated');
    } catch (e) {
      toast('Failed to update: ' + (e instanceof ApiError ? e.message : (e as Error).message));
    }
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
                <button className="btn small secondary" onClick={() => setEditingAddr(a)}>Edit</button>
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
              <button className="btn" onClick={saveProfile} disabled={busy}>Save</button>
              <button className="btn secondary" onClick={() => setEditingProfile(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <AddressModal title="Add Address" onCancel={() => setShowModal(false)} onSave={addAddress} toast={toast} />
      )}

      {editingAddr && (
        <AddressModal title="Edit Address" initial={editingAddr} onCancel={() => setEditingAddr(null)} onSave={saveEditAddr} toast={toast} />
      )}
    </>
  );
}

function AddressModal({
  title, initial, onCancel, onSave, toast
}: {
  title: string;
  initial?: Address;
  onCancel: () => void;
  onSave: (a: Omit<Address, 'id'>) => Promise<void>;
  toast: (m: string) => void;
}) {
  const [fullName, setFullName] = useState(initial?.fullName || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [line1, setLine1] = useState(initial?.line1 || '');
  const [line2, setLine2] = useState(initial?.line2 || '');
  const [city, setCity] = useState(initial?.city || '');
  const [state, setState] = useState(initial?.state || '');
  const [pincode, setPincode] = useState(initial?.pincode || '');
  const [isDefault, setIsDefault] = useState(initial?.isDefault || false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!fullName || !/^\d{10}$/.test(phone) || !/^\d{6}$/.test(pincode) || !line1 || !city || !state) {
      toast('Fill all fields correctly (10-digit phone, 6-digit pin)');
      return;
    }
    setBusy(true);
    try {
      await onSave({ fullName, phone, line1, line2, city, state, pincode, isDefault });
    } finally { setBusy(false); }
  };

  const input = (v: string, on: (s: string) => void) => (
    <input value={v} onChange={(e) => on(e.target.value)}
      style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', marginBottom: 4 }} />
  );

  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
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
          <button className="btn" onClick={submit} disabled={busy}>Save</button>
          <button className="btn secondary" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
