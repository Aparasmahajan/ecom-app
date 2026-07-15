'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { K, get } from '@/lib/storage';
import type { User } from '@/lib/types';

export default function AdminLoginPage() {
  const { signIn, toast } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState('admin@shop.com');
  const [password, setPassword] = useState('admin123');

  const submit = () => {
    const norm = email.trim().toLowerCase();
    const u = get<User[]>(K.USERS, []).find(
      x => x.email === norm && x.password === password && x.role === 'ADMIN'
    );
    if (!u) { toast('Invalid admin credentials'); return; }
    signIn(u);
    router.push('/admin');
  };

  return (
    <div className="form">
      <h2>Admin Login</h2>
      <label>Email</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <label>Password</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <div className="form-actions">
        <button className="btn" onClick={submit}>Sign In</button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
        This admin area is protected by server-side role check in the real app.
      </p>
    </div>
  );
}
