'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/lib/api-client';

const DEMO_USERS = [
  { phone: '9000000001', label: 'Customer', emoji: '🛍️', role: 'customer', desc: 'Order tracking, Rescue options & Resolve disputes' },
  { phone: '9000000002', label: 'Restaurant Partner', emoji: '🍳', role: 'restaurant', desc: 'Incoming orders, packing ETA & ready dispatch' },
  { phone: '9000000003', label: 'Delivery Partner', emoji: '🛵', role: 'rider', desc: 'Assigned deliveries, telemetry & incident reporting' },
  { phone: '9000000004', label: 'Support Agent', emoji: '🎧', role: 'agent', desc: 'Escalated cases, rule-trace audits & recovery ledger' },
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
      setError('Failed to send OTP. Check that the API server is running on port 3001.');
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
      setError(err.message ?? 'Invalid OTP code');
    } finally {
      setLoading(false);
    }
  }

  async function quickLogin(demoPhone: string) {
    setPhone(demoPhone);
    setLoading(true);
    setError('');
    try {
      const { accessToken, user } = await authApi.verifyOtp(demoPhone, '1234');
      setAuth(accessToken, user);
      if (user.role === 'customer') router.push('/track');
      else if (user.role === 'restaurant') router.push('/partner/restaurant');
      else if (user.role === 'rider') router.push('/partner/rider');
      else if (user.role === 'agent') router.push('/agent');
    } catch (err: any) {
      setError(err.message ?? 'Quick login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between" style={{ background: 'var(--bg)' }}>
      {/* Top Banner */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between bg-[#121214]/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center font-bold text-white text-lg shadow-md shadow-orange-600/30">
            S
          </div>
          <div>
            <span className="font-bold text-white text-sm tracking-tight block">
              SWIGGY UNIFIED RECOVERY
            </span>
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">
              Rescue + Resolve Platform
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            System Online (100% SLA)
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Product Value Proposition */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold">
              <span>🚀</span> Production Quality Release
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Algorithmic Recovery. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500">
                Zero Support Friction.
              </span>
            </h1>

            <p className="text-sm text-white/60 leading-relaxed max-w-lg">
              A unified recovery engine combining proactive delay mitigation (<strong className="text-white">Swiggy Rescue</strong>) with instant mathematical dispute entitlements (<strong className="text-white">Swiggy Resolve</strong>), backed by an append-only PostgreSQL ledger.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02]">
                <span className="text-orange-400 font-bold text-xs uppercase tracking-wider block">🛡️ Swiggy Rescue</span>
                <span className="text-[11px] text-white/50 mt-1 block">Telemetry-triggered recovery before delivery</span>
              </div>
              <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02]">
                <span className="text-amber-400 font-bold text-xs uppercase tracking-wider block">⚖️ Swiggy Resolve</span>
                <span className="text-[11px] text-white/50 mt-1 block">Instant post-delivery claims via FairnessEngine</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Login & Demo Role Switcher */}
          <div className="lg:col-span-6 bg-[#18181b] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Select Demo Role to Enter</h2>
              <p className="text-xs text-white/50 mt-0.5">
                Instant one-click authentication for all 4 project roles:
              </p>
            </div>

            {/* Quick Login Role Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.phone}
                  id={`quick-login-${u.role}`}
                  data-testid={`demo-btn-${u.role}`}
                  onClick={() => quickLogin(u.phone)}
                  disabled={loading}
                  className="p-4 rounded-2xl text-left border border-white/10 bg-white/5 hover:bg-orange-500/10 hover:border-orange-500/40 transition-all cursor-pointer group shadow-sm disabled:opacity-50"
                >
                  <span className="text-2xl block mb-1.5">{u.emoji}</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-orange-400 transition">
                      {u.label}
                    </span>
                    <span className="text-white/30 group-hover:text-orange-400 text-xs">→</span>
                  </div>
                  <span className="text-[10px] text-white/40 block mt-1 leading-snug">
                    {u.desc}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <span className="relative bg-[#18181b] px-3 text-[11px] font-mono text-white/40 uppercase tracking-widest">
                or sign in with OTP
              </span>
            </div>

            {/* Manual Form */}
            {step === 'phone' ? (
              <form onSubmit={handleRequestOtp} className="space-y-3">
                <div>
                  <label htmlFor="phone-input" className="text-[11px] font-semibold text-white/60 uppercase tracking-wider block mb-1">
                    Registered Mobile Number
                  </label>
                  <input
                    id="phone-input"
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setError('');
                    }}
                    placeholder="e.g. 9000000001"
                    maxLength={10}
                    className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition"
                  />
                </div>
                {error && <p className="text-xs text-rose-400">{error}</p>}
                <button
                  id="send-otp-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-wider shadow-lg shadow-orange-600/30 transition"
                >
                  {loading ? 'Sending OTP…' : 'Request OTP Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('phone');
                      setError('');
                    }}
                    className="text-xs text-white/60 hover:text-white"
                  >
                    ← Change Phone ({phone})
                  </button>
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded">
                    Demo OTP: 1234
                  </span>
                </div>

                <div>
                  <label htmlFor="otp-input" className="text-[11px] font-semibold text-white/60 uppercase tracking-wider block mb-1">
                    Enter 4-Digit OTP
                  </label>
                  <input
                    id="otp-input"
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value);
                      setError('');
                    }}
                    placeholder="1234"
                    maxLength={4}
                    autoFocus
                    className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-center text-xl font-mono text-white tracking-[0.5em] focus:outline-none focus:border-orange-500 transition"
                  />
                </div>
                {error && <p className="text-xs text-rose-400">{error}</p>}
                <button
                  id="verify-otp-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-wider shadow-lg shadow-orange-600/30 transition"
                >
                  {loading ? 'Verifying…' : 'Verify & Continue →'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-4 text-center text-xs text-white/30">
        Swiggy Unified Recovery Platform · Next.js 14 · NestJS · PostgreSQL 16 · Redis · Pure TS FairnessEngine
      </footer>
    </div>
  );
}
