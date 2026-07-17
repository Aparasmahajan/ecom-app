'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/lib/context';
import { api, ApiError, AdminUser } from '@/lib/api';

/**
 * Super-admin-only screen for creating and managing other admin accounts.
 * Backing endpoints (all @PreAuthorize("@sec.isSuperAdmin")):
 *   GET    /admin/admins
 *   POST   /admin/admins
 *   PUT    /admin/admins/{id}/password
 *   PUT    /admin/admins/{id}/enabled
 *   DELETE /admin/admins/{id}
 */
export default function AdminAdmins() {
  const { toast, user } = useApp();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [pwFor, setPwFor] = useState<AdminUser | null>(null);

  const load = async () => {
    setLoading(true);
    try { setAdmins(await api.admin.admins.list()); }
    catch (e) { toast('Failed to load: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast(msg); await load(); }
    catch (e) { toast('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
  };

  const toggleEnabled = (a: AdminUser) =>
    run(() => api.admin.admins.setEnabled(a.id, !a.enabled),
        a.enabled ? 'Admin disabled' : 'Admin enabled');
  const remove = (a: AdminUser) => {
    if (!confirm(`Delete admin ${a.email}?`)) return;
    run(() => api.admin.admins.remove(a.id), 'Admin removed');
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Total admins</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{admins.length}</div>
        </div>
        <button className="btn" onClick={() => setShowAdd(true)}>+ Add Admin</button>
      </div>

      {loading ? <p className="empty">Loading admins…</p> : (
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map(a => {
              const isMe = a.id === user?.id;
              const isSuper = a.role === 'SUPER_ADMIN';
              return (
                <tr key={a.id}>
                  <td>{a.name}{isMe && <span className="tag" style={{ marginLeft: 8 }}>you</span>}</td>
                  <td>{a.email}</td>
                  <td>
                    <span className="tag" style={{
                      background: isSuper ? 'rgba(245,200,66,.2)' : 'rgba(255,255,255,.05)',
                      color: isSuper ? 'var(--accent)' : 'var(--muted)'
                    }}>
                      {a.role}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${a.enabled ? 'status-DELIVERED' : 'status-CANCELLED'}`}>
                      {a.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="btn small secondary" onClick={() => setPwFor(a)}>Reset PW</button>{' '}
                    {!isSuper && !isMe && (
                      <>
                        <button className="btn small secondary" onClick={() => toggleEnabled(a)}>
                          {a.enabled ? 'Disable' : 'Enable'}
                        </button>{' '}
                        <button className="btn small danger" onClick={() => remove(a)}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showAdd && (
        <AddAdminModal onCancel={() => setShowAdd(false)} onDone={() => { setShowAdd(false); load(); }} toast={toast} />
      )}
      {pwFor && (
        <ResetPasswordModal admin={pwFor} onCancel={() => setPwFor(null)} toast={toast} />
      )}
    </>
  );
}

function AddAdminModal({ onCancel, onDone, toast }: {
  onCancel: () => void; onDone: () => void; toast: (m: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !name.trim() || password.length < 8) {
      toast('Fill email, name, and a password of at least 8 chars');
      return;
    }
    setBusy(true);
    try {
      await api.admin.admins.create({ email: email.trim().toLowerCase(), name: name.trim(), password, phone: phone.trim() || undefined });
      toast('Admin created');
      onDone();
    } catch (e) {
      toast('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message));
    } finally { setBusy(false); }
  };

  const field = (label: string, v: string, on: (s: string) => void, type = 'text') => (
    <>
      <label style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</label>
      <input type={type} value={v} onChange={(e) => on(e.target.value)}
        style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', marginBottom: 8 }} />
    </>
  );

  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Add Admin</h3>
        {field('Email', email, setEmail, 'email')}
        {field('Name', name, setName)}
        {field('Phone (optional)', phone, setPhone)}
        {field('Password (min 8 chars)', password, setPassword, 'password')}
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
          The new admin can then log in at /admin/login with these credentials.
        </p>
        <div className="form-actions">
          <button className="btn" onClick={submit} disabled={busy}>{busy ? 'Creating…' : 'Create'}</button>
          <button className="btn secondary" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordModal({ admin, onCancel, toast }: {
  admin: AdminUser; onCancel: () => void; toast: (m: string) => void;
}) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (password.length < 8) { toast('At least 8 characters'); return; }
    setBusy(true);
    try {
      await api.admin.admins.resetPassword(admin.id, password);
      toast('Password reset');
      onCancel();
    } catch (e) {
      toast('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message));
    } finally { setBusy(false); }
  };

  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Reset password</h3>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 10 }}>
          for <strong style={{ color: 'var(--text)' }}>{admin.email}</strong>
        </p>
        <label style={{ fontSize: 12, color: 'var(--muted)' }}>New password (min 8 chars)</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)' }} />
        <div className="form-actions">
          <button className="btn" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Reset'}</button>
          <button className="btn secondary" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
