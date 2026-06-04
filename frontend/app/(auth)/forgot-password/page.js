'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Alert, Field, PasswordInput } from '@/components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function requestOtp(e) {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await api.post('/auth/forgot-password', { email });
      // The OTP is intentionally never sent to the browser. It is delivered
      // out-of-band (server logs in this demo / email in production).
      setMsg('A one-time passcode was sent. Enter it below to set a new password.');
    } catch (err) { setError(err.message); }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword });
      setMsg('Password reset! You can now sign in.');
    } catch (err) { setError(err.message); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <h1 className="mb-1 text-xl font-bold text-brand-700">Reset password</h1>
        <p className="mb-6 text-sm text-slate-500">Request a one-time passcode, then set a new password.</p>
        <div className="space-y-6">
          <Alert>{error}</Alert>
          <Alert kind="success">{msg}</Alert>

          <form onSubmit={requestOtp} className="space-y-3">
            <Field label="Email"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
            <button className="btn-secondary w-full">Send passcode</button>
          </form>

          <form onSubmit={resetPassword} className="space-y-3 border-t border-slate-200 pt-6">
            <Field label="One-time passcode">
              <input className="input tracking-[0.4em]" value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric" autoComplete="one-time-code" placeholder="123456" maxLength={6} required />
            </Field>
            <Field label="New password"><PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoComplete="new-password" /></Field>
            <button className="btn-primary w-full">Set new password</button>
          </form>
        </div>
        <div className="mt-4 text-center text-sm">
          <Link className="text-brand-600 hover:underline" href="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
