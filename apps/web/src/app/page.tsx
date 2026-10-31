'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/lib/api-client';

const DEMO_USERS = [
  { phone: '9000000001', label: 'Customer', emoji: '🛍️', role: 'customer' },
  { phone: '9000000002', label: 'Restaurant', emoji: '🍳', role: 'restaurant' },
  { phone: '9000000003', label: 'Rider', emoji: '🛵', role: 'rider' },
  { phone: '9000000004', label: 'Agent', emoji: '🎧', role: 'agent' },
];

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.match(/^[6-9]\d{9}$/)) {
      setError('Enter a valid 10-digit phone number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.requestOtp(phone);
      setStep('otp');
    } catch {
      setError('Failed to send OTP. Check that the API is running.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 4) {
      setError('Enter the 4-digit OTP');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { accessToken, user } = await authApi.verifyOtp(phone, otp);
      setAuth(accessToken, user);

      // Route by role
      if (user.role === 'customer') router.push('/track');
      else if (user.role === 'restaurant') router.push('/partner/restaurant');
      else if (user.role === 'rider') router.push('/partner/rider');
      else if (user.role === 'agent') router.push('/agent');
    } catch (err: any) {
      setError(err.message ?? 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(demoPhone: string) {
    setPhone(demoPhone);
    setStep('phone');
    setOtp('');
    setError('');
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'var(--accent)' }}
          >
            <span className="text-white text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>S</span>
          </div>
          <h1 className="text-display" style={{ color: 'var(--ink)' }}>Swiggy Recovery</h1>
          <p className="text-body mt-1" style={{ color: 'var(--ink-2)' }}>Rescue + Resolve prototype</p>
        </div>

        {/* Demo user quick-fill */}
        <div className="mb-6">
          <p className="text-meta mb-3 text-center uppercase tracking-widest" style={{ color: 'var(--ink-2)' }}>
            Demo users
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_USERS.map((u) => (
              <button
                key={u.phone}
                id={`demo-btn-${u.role}`}
                onClick={() => fillDemo(u.phone)}
                className={`card p-3 text-left transition-all duration-150 hover:shadow-md border ${
                  phone === u.phone ? 'border-[var(--accent)]' : 'border-[var(--line)]'
                }`}
                style={{ cursor: 'pointer' }}
              >
                <span className="text-xl block mb-1">{u.emoji}</span>
                <span className="text-body font-semibold block" style={{ color: 'var(--ink)', fontSize: '14px' }}>
                  {u.label}
                </span>
                <span className="text-meta" style={{ letterSpacing: '0' }}>{u.phone}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form card */}
        <div className="card p-6">
          {step === 'phone' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label htmlFor="phone-input" className="text-meta uppercase tracking-widest block mb-2">
                  Mobile number
                </label>
                <input
                  id="phone-input"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setError(''); }}
                  placeholder="10-digit number"
                  maxLength={10}
                  className="w-full border rounded-xl px-4 py-3 text-body focus:outline-none focus:ring-2"
                  style={{
                    borderColor: error ? 'var(--bad)' : 'var(--line)',
                    background: 'var(--surface-sunk)',
                    color: 'var(--ink)',
                    fontFamily: 'var(--font-body)',
                  }}
                />
              </div>
              {error && <p className="text-body" style={{ color: 'var(--bad)', fontSize: '14px' }}>{error}</p>}
              <button id="send-otp-btn" type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Sending…' : 'Get OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button type="button" onClick={() => { setStep('phone'); setError(''); }} className="btn-ghost" style={{ width: 'auto', padding: '6px' }}>
                  ←
                </button>
                <div>
                  <p className="text-body font-semibold">{phone}</p>
                  <p className="text-meta">Demo OTP is always <strong>1234</strong></p>
                </div>
              </div>
              <div>
                <label htmlFor="otp-input" className="text-meta uppercase tracking-widest block mb-2">
                  OTP
                </label>
                <input
                  id="otp-input"
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value); setError(''); }}
                  placeholder="4-digit code"
                  maxLength={4}
                  autoFocus
                  className="w-full border rounded-xl px-4 py-3 text-body focus:outline-none focus:ring-2"
                  style={{
                    borderColor: error ? 'var(--bad)' : 'var(--line)',
                    background: 'var(--surface-sunk)',
                    color: 'var(--ink)',
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '0.2em',
                    fontSize: '24px',
                  }}
                />
              </div>
              {error && <p style={{ color: 'var(--bad)', fontSize: '14px' }}>{error}</p>}
              <button id="verify-otp-btn" type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Verifying…' : 'Continue'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
