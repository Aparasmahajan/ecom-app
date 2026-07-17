'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { api, ApiError, type User } from '@/lib/api';

type Mode = 'otp' | 'password' | 'register' | 'forgot';

export default function AuthPage() {
  const { signIn, toast } = useApp();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('otp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  // sub-steps for the two-phase flows (otp login, forgot-password)
  const [otpStep, setOtpStep] = useState<'email' | 'code'>('email');
  const [forgotStep, setForgotStep] = useState<'email' | 'reset'>('email');
  const [loading, setLoading] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    try { await fn(); }
    catch (e) { toast(e instanceof ApiError ? e.message : (e as Error).message); }
    finally { setLoading(false); }
  };

  const norm = () => email.trim().toLowerCase();

  const finish = async (token: string, user: User) => {
    await signIn(token, user);
    toast('Welcome, ' + user.name);
    router.push('/');
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setOtp(''); setPassword(''); setNewPassword('');
    setOtpStep('email'); setForgotStep('email');
  };

  /* ---- OTP (passwordless) ---- */
  const sendOtp = () => run(async () => {
    if (!norm()) throw new ApiError(0, 'validation', 'Enter your email');
    await api.auth.requestOtp(norm());
    setOtpStep('code');
    toast('Code sent — check your email (or backend logs in dev)');
  });
  const verifyOtp = () => run(async () => {
    if (!/^\d{6}$/.test(otp)) throw new ApiError(0, 'validation', 'Enter the 6-digit code');
    const { token, user } = await api.auth.verifyOtp(norm(), otp);
    await finish(token, user);
  });

  /* ---- Password login ---- */
  const login = () => run(async () => {
    if (!norm()) throw new ApiError(0, 'validation', 'Enter your email');
    if (!password) throw new ApiError(0, 'validation', 'Enter your password');
    const { token, user } = await api.auth.login(norm(), password);
    await finish(token, user);
  });

  /* ---- Register ---- */
  const register = () => run(async () => {
    if (!norm()) throw new ApiError(0, 'validation', 'Enter your email');
    if (!name.trim()) throw new ApiError(0, 'validation', 'Enter your name');
    if (password.length < 8) throw new ApiError(0, 'validation', 'Password must be at least 8 characters');
    const { token, user } = await api.auth.register({
      email: norm(), password, name: name.trim(), phone: phone.trim() || undefined
    });
    await finish(token, user);
  });

  /* ---- Forgot / reset password ---- */
  const sendReset = () => run(async () => {
    if (!norm()) throw new ApiError(0, 'validation', 'Enter your email');
    await api.auth.forgotPassword(norm());
    setForgotStep('reset');
    toast('Reset code sent — check your email (or backend logs in dev)');
  });
  const resetPassword = () => run(async () => {
    if (!/^\d{6}$/.test(otp)) throw new ApiError(0, 'validation', 'Enter the 6-digit code');
    if (newPassword.length < 8) throw new ApiError(0, 'validation', 'Password must be at least 8 characters');
    await api.auth.resetPassword(norm(), otp, newPassword);
    toast('Password updated — sign in with your new password');
    switchMode('password');
  });

  const codeInputStyle = { textAlign: 'center' as const, letterSpacing: 8, fontSize: 22, fontWeight: 700 };

  return (
    <div className="form">
      <h2>{mode === 'register' ? 'Create Account' : mode === 'forgot' ? 'Reset Password' : 'Sign In'}</h2>

      {/* Mode tabs (hidden during forgot-password) */}
      {mode !== 'forgot' && (
        <div style={{ display: 'flex', gap: 8, margin: '4px 0 16px' }}>
          {(['otp', 'password', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              className={`btn small ${mode === m ? '' : 'secondary'}`}
              onClick={() => switchMode(m)}
              disabled={loading}
              style={{ flex: 1 }}
            >
              {m === 'otp' ? 'OTP' : m === 'password' ? 'Password' : 'Register'}
            </button>
          ))}
        </div>
      )}

      {/* ---------- OTP ---------- */}
      {mode === 'otp' && otpStep === 'email' && (
        <>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="email" placeholder="you@example.com" />
          <div className="form-actions">
            <button className="btn" onClick={sendOtp} disabled={loading}>{loading ? 'Sending…' : 'SEND CODE'}</button>
          </div>
        </>
      )}
      {mode === 'otp' && otpStep === 'code' && (
        <>
          <label>6-Digit Code</label>
          <input type="text" inputMode="numeric" maxLength={6} value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="123456" style={codeInputStyle} />
          <p style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
            Sent to <strong style={{ color: 'var(--text)' }}>{email}</strong>
          </p>
          <div className="form-actions">
            <button className="btn" onClick={verifyOtp} disabled={loading}>{loading ? 'Verifying…' : 'VERIFY & SIGN IN'}</button>
            <button className="btn secondary" onClick={() => { setOtpStep('email'); setOtp(''); }} disabled={loading}>← Back</button>
          </div>
        </>
      )}

      {/* ---------- Password login ---------- */}
      {mode === 'password' && (
        <>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="email" placeholder="you@example.com" />
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password" placeholder="Your password" />
          <div className="form-actions">
            <button className="btn" onClick={login} disabled={loading}>{loading ? 'Signing in…' : 'SIGN IN'}</button>
          </div>
          <p style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
            <a onClick={() => switchMode('forgot')} style={{ color: 'var(--accent)', cursor: 'pointer' }}>Forgot password?</a>
          </p>
        </>
      )}

      {/* ---------- Register ---------- */}
      {mode === 'register' && (
        <>
          <label>Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            autoComplete="name" placeholder="Your name" />
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="email" placeholder="you@example.com" />
          <label>Phone (optional)</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel" placeholder="9876543210" />
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password" placeholder="At least 8 characters" />
          <div className="form-actions">
            <button className="btn" onClick={register} disabled={loading}>{loading ? 'Creating…' : 'CREATE ACCOUNT'}</button>
          </div>
        </>
      )}

      {/* ---------- Forgot / reset ---------- */}
      {mode === 'forgot' && forgotStep === 'email' && (
        <>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>
            Enter your registered email — we&apos;ll send a code to reset your password.
          </p>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="email" placeholder="you@example.com" />
          <div className="form-actions">
            <button className="btn" onClick={sendReset} disabled={loading}>{loading ? 'Sending…' : 'SEND RESET CODE'}</button>
            <button className="btn secondary" onClick={() => switchMode('password')} disabled={loading}>← Back</button>
          </div>
        </>
      )}
      {mode === 'forgot' && forgotStep === 'reset' && (
        <>
          <label>6-Digit Code</label>
          <input type="text" inputMode="numeric" maxLength={6} value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="123456" style={codeInputStyle} />
          <label>New Password</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password" placeholder="At least 8 characters" />
          <p style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
            Code sent to <strong style={{ color: 'var(--text)' }}>{email}</strong>
          </p>
          <div className="form-actions">
            <button className="btn" onClick={resetPassword} disabled={loading}>{loading ? 'Updating…' : 'UPDATE PASSWORD'}</button>
            <button className="btn secondary" onClick={() => { setForgotStep('email'); setOtp(''); setNewPassword(''); }} disabled={loading}>← Back</button>
          </div>
        </>
      )}

      <p style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)' }}>
        Admin? Long-press the version number in the footer to reach the admin login.
      </p>
    </div>
  );
}
