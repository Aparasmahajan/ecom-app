'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { api, ApiError } from '@/lib/api';

export default function AdminLoginPage() {
  const { signIn, toast } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) { toast('Enter email + password'); return; }
    setBusy(true);
    try {
      const { token, user } = await api.auth.adminLogin(email.trim().toLowerCase(), password);
      await signIn(token, user);
      toast('Welcome, ' + user.name);
      router.push('/admin');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Login failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="form">
      <h2>Admin Login</h2>
      <label>Email</label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
      <label>Password</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
      />
      <div className="form-actions">
        <button className="btn" onClick={submit} disabled={busy}>
          {busy ? 'Signing in…' : 'Sign In'}
        </button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
        Accepts both ADMIN and SUPER_ADMIN accounts. The super admin can then
        create/manage other admins from the panel.
      </p>
    </div>
  );
}
