'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { K, get, set, uid } from '@/lib/storage';
import type { User } from '@/lib/types';

export default function AuthPage() {
  const { signIn, toast } = useApp();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const submit = () => {
    const normEmail = email.trim().toLowerCase();
    if (!normEmail || !password) { toast('Enter email & password'); return; }
    const users = get<User[]>(K.USERS, []);
    if (mode === 'login') {
      const u = users.find(x => x.email === normEmail && x.password === password);
      if (!u) { toast('Invalid credentials'); return; }
      signIn(u);
      toast('Welcome back, ' + u.name);
      router.push(u.role === 'ADMIN' ? '/admin' : '/');
    } else {
      if (!name.trim()) { toast('Enter your name'); return; }
      if (users.some(x => x.email === normEmail)) { toast('Email already registered'); return; }
      const u: User = {
        id: uid(), email: normEmail, password,
        name: name.trim(), phone: '', role: 'USER'
      };
      users.push(u);
      set(K.USERS, users);
      signIn(u);
      toast('Account created');
      router.push('/');
    }
  };

  return (
    <div className="form">
      <div className="tabs">
        <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign In</button>
        <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Sign Up</button>
      </div>
      <label>Email</label>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      {mode === 'signup' && (
        <>
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </>
      )}
      <label>Password</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <div className="form-actions">
        <button className="btn" onClick={submit}>
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </div>
      <p style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
        {mode === 'login'
          ? 'Demo admin: admin@shop.com / admin123'
          : 'Passwords are stored locally in your browser only.'}
      </p>
    </div>
  );
}
