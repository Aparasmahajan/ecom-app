'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { api, ApiError } from '@/lib/api';

export default function AuthPage() {
  const { signIn, toast } = useApp();
  const router = useRouter();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    try { await fn(); }
    catch (e) {
      toast(e instanceof ApiError ? e.message : (e as Error).message);
    }
    finally { setLoading(false); }
  };

  const sendOtp = () => run(async () => {
    const norm = email.trim().toLowerCase();
    if (!norm) throw new ApiError(0, 'validation', 'Enter your email');
    await api.auth.requestOtp(norm);
    setStep('code');
    toast('Code sent — check your email (or backend logs in dev)');
  });

  const verifyOtp = () => run(async () => {
    if (!/^\d{6}$/.test(otp)) throw new ApiError(0, 'validation', 'Enter the 6-digit code');
    const { token, user } = await api.auth.verifyOtp(email.trim().toLowerCase(), otp);
    await signIn(token, user);
    toast('Welcome, ' + user.name);
    router.push('/');
  });

  return (
    <div className="form">
      <h2>Sign In</h2>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>
        Enter your email — we&apos;ll send a 6-digit code. No password needed.
      </p>

      {step === 'email' && (
        <>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
          />
          <div className="form-actions">
            <button className="btn" onClick={sendOtp} disabled={loading}>
              {loading ? 'Sending…' : 'SEND CODE'}
            </button>
          </div>
        </>
      )}

      {step === 'code' && (
        <>
          <label>6-Digit Code</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            style={{ textAlign: 'center', letterSpacing: 8, fontSize: 22, fontWeight: 700 }}
          />
          <p style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
            Sent to <strong style={{ color: 'var(--text)' }}>{email}</strong>
          </p>
          <div className="form-actions">
            <button className="btn" onClick={verifyOtp} disabled={loading}>
              {loading ? 'Verifying…' : 'VERIFY & SIGN IN'}
            </button>
            <button
              className="btn secondary"
              onClick={() => { setStep('email'); setOtp(''); }}
              disabled={loading}
            >
              ← Back
            </button>
          </div>
        </>
      )}

      <p style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)' }}>
        Admin? Long-press the version number in the footer to reach the admin login.
      </p>
    </div>
  );
}
