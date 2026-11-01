'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Scale,
  Clock,
  CheckCircle2,
  FileCheck,
  ShoppingBag,
  ChefHat,
  Bike,
  Headphones,
  ArrowRight,
  Database,
  Cpu,
  Layers,
  Radio,
  Lock,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/lib/api-client';

const DEMO_ROLES = [
  {
    role: 'customer',
    phone: '9000000001',
    label: 'Customer',
    badge: 'Live Radar & Claims',
    icon: ShoppingBag,
    color: 'text-[#FC8019] bg-[#FFF3E8]',
    border: 'border-[#E9E9EB] hover:border-[#FC8019]',
    desc: 'Track live order radar, choose proactive rescue options, and file instant dispute claims with photo proof.',
  },
  {
    role: 'restaurant',
    phone: '9000000002',
    label: 'Restaurant Partner',
    badge: 'Kitchen KDS',
    icon: ChefHat,
    color: 'text-[#C77400] bg-[#FFF6E5]',
    border: 'border-[#E9E9EB] hover:border-[#C77400]',
    desc: 'Manage incoming kitchen tickets, adjust preparation time extensions (+10m, +15m), and mark ready for pickup.',
  },
  {
    role: 'rider',
    phone: '9000000003',
    label: 'Delivery Partner',
    badge: 'Rider Telemetry',
    icon: Bike,
    color: 'text-[#1BA672] bg-[#EAF7F1]',
    border: 'border-[#E9E9EB] hover:border-[#1BA672]',
    desc: 'Track in-flight pickup and customer handover handshakes, and report telemetry road impediments.',
  },
  {
    role: 'agent',
    phone: '9000000004',
    label: 'Support Agent',
    badge: 'Audit & Escalation',
    icon: Headphones,
    color: 'text-[#282C3F] bg-[#F1F0F4]',
    border: 'border-[#E9E9EB] hover:border-[#282C3F]',
    desc: 'Inspect escalated dispute dossiers, review rule trace evidence, and audit the immutable recovery ledger.',
  },
];

export default function LandingPage() {
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
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.requestOtp(phone);
      setStep('otp');
    } catch {
      setError('Failed to send OTP code. Ensure API service is running on port 4000.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 4) {
      setError('Enter the 4-digit verification code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { accessToken, user } = await authApi.verifyOtp(phone, otp);
      setAuth(accessToken, user);

      if (user.role === 'customer') router.push('/track');
      else if (user.role === 'restaurant') router.push('/partner/restaurant');
      else if (user.role === 'rider') router.push('/partner/rider');
      else if (user.role === 'agent') router.push('/agent');
    } catch (err: any) {
      setError(err.message ?? 'Invalid verification code');
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
      setError(err.message ?? 'Quick role login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#282C3F] flex flex-col justify-between selection:bg-[#FFF3E8] selection:text-[#FC8019]">
      {/* ── 1. Clean Navigation Header ────────────────────────────────────────── */}
      <header className="border-b border-[#E9E9EB] bg-white sticky top-0 z-20 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#FC8019] flex items-center justify-center font-bold text-white text-lg shadow-sm">
            S
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#282C3F] text-sm sm:text-base tracking-tight">
                Swiggy Unified Recovery
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FFF3E8] text-[#FC8019]">
                Rescue + Resolve
              </span>
            </div>
            <p className="text-[11px] text-[#686B78] hidden sm:block">
              Algorithmic order resilience and automated dispute settlement
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF7F1] text-[#1BA672] border border-[#1BA672]/20 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-[#1BA672] animate-pulse" />
            <span className="hidden sm:inline">Engine Online</span>
            <span className="sm:hidden">Online</span>
          </div>
          <a
            href="#roles"
            className="btn-secondary !py-2 !px-3.5 !min-h-[36px] text-xs font-semibold"
          >
            Enter Demo
          </a>
        </div>
      </header>

      {/* ── 2. Hero Section ─────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-8 pt-12 pb-16 max-w-6xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF3E8] text-[#FC8019] text-xs font-bold tracking-tight">
            <span>⚡</span> Unified Proactive & Reactive Resilience
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#282C3F] tracking-tight leading-[1.15]">
            Food delivery recovery, <br />
            <span className="text-[#FC8019]">without the frustration.</span>
          </h1>

          <p className="text-base sm:text-lg text-[#686B78] leading-relaxed max-w-2xl mx-auto">
            One intelligent recovery platform that proactively handles delivery delays and resolves post-delivery issues with transparent, customer-controlled outcomes.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#roles"
              className="btn-primary w-full sm:w-auto px-6 py-3 font-semibold text-sm flex items-center justify-center gap-2 shadow-sm"
            >
              Choose Demo Role
              <ArrowRight size={16} />
            </a>
            <Link
              href="/help"
              className="btn-secondary w-full sm:w-auto px-6 py-3 font-semibold text-sm flex items-center justify-center gap-2"
            >
              View Recovery Policies & SLA
            </Link>
          </div>
        </div>

        {/* ── 3. Rescue & Resolve Feature Comparison ──────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
          {/* Swiggy Rescue Card */}
          <div className="border border-[#E9E9EB] rounded-xl p-6 sm:p-8 bg-[#FFFFFF] hover:border-[#FC8019]/40 transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#FFF3E8] text-[#FC8019] flex items-center justify-center">
                  <ShieldAlert size={22} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#FFF3E8] text-[#FC8019]">
                  Pre-Delivery In-Flight
                </span>
              </div>

              <h2 className="text-xl font-bold text-[#282C3F] tracking-tight mb-2">
                Swiggy Rescue
              </h2>
              <p className="text-sm text-[#686B78] mb-6 leading-relaxed">
                Autonomous delay intervention engine. Detects stationary riders or kitchen prep bottlenecks in real time and offers instant choices before delivery:
              </p>

              <ul className="space-y-3 text-sm text-[#282C3F]">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-[#1BA672] shrink-0 mt-0.5" />
                  <span><strong>Proactive Delay Detection:</strong> Automatically flags ETA slippage &gt;8 min.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-[#1BA672] shrink-0 mt-0.5" />
                  <span><strong>Wait with Eligible Compensation:</strong> Receive instant ₹50–₹100 wallet credit.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-[#1BA672] shrink-0 mt-0.5" />
                  <span><strong>Priority Replacement Order:</strong> Instant re-order from nearby matched kitchen.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-[#1BA672] shrink-0 mt-0.5" />
                  <span><strong>Full Source Refund:</strong> 100% refund without cancellation penalties.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-[#1BA672] shrink-0 mt-0.5" />
                  <span><strong>Zero Auto-Cancellations:</strong> Customer always retains final recovery decision.</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-[#E9E9EB]">
              <button
                onClick={() => quickLogin('9000000001')}
                className="w-full text-left flex items-center justify-between text-xs font-bold text-[#FC8019] hover:underline"
              >
                <span>Simulate Kitchen Delay Recovery</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* Swiggy Resolve Card */}
          <div className="border border-[#E9E9EB] rounded-xl p-6 sm:p-8 bg-[#FFFFFF] hover:border-[#1BA672]/40 transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#EAF7F1] text-[#1BA672] flex items-center justify-center">
                  <Scale size={22} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#EAF7F1] text-[#1BA672]">
                  Post-Delivery Settlement
                </span>
              </div>

              <h2 className="text-xl font-bold text-[#282C3F] tracking-tight mb-2">
                Swiggy Resolve
              </h2>
              <p className="text-sm text-[#686B78] mb-6 leading-relaxed">
                Deterministic mathematical claim resolution engine. Handles missing, wrong, damaged, or poor-quality items with instant audit transparency:
              </p>

              <ul className="space-y-3 text-sm text-[#282C3F]">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-[#1BA672] shrink-0 mt-0.5" />
                  <span><strong>Item-Level Dispute Filing:</strong> Select specific billed items with itemized prices.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-[#1BA672] shrink-0 mt-0.5" />
                  <span><strong>Enforced Evidence Upload:</strong> Client & server verified photo proof (up to 2 MB).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-[#1BA672] shrink-0 mt-0.5" />
                  <span><strong>Transparent Math Calculation:</strong> Proportional delivery & tax refund formulas.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-[#1BA672] shrink-0 mt-0.5" />
                  <span><strong>Automated Ledger Credit:</strong> Instant wallet settlement for high-confidence claims.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-[#1BA672] shrink-0 mt-0.5" />
                  <span><strong>Specialist Review Escalation:</strong> Seamless handoff to human support with rule trace.</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-[#E9E9EB]">
              <button
                onClick={() => quickLogin('9000000001')}
                className="w-full text-left flex items-center justify-between text-xs font-bold text-[#1BA672] hover:underline"
              >
                <span>File a Sample Item Dispute Claim</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 4. Role Entry Section ─────────────────────────────────────────── */}
        <div id="roles" className="mt-20 scroll-mt-24">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#FC8019] block mb-1">
              Role-Based Portals
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#282C3F] tracking-tight">
              Experience the full ecosystem
            </h2>
            <p className="text-sm text-[#686B78] mt-1.5">
              Click any role below for instant one-click authentication:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DEMO_ROLES.map((r) => {
              const Icon = r.icon;
              return (
                <div
                  key={r.role}
                  className={`border ${r.border} rounded-xl p-5 bg-white flex flex-col justify-between transition-all group`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-9 h-9 rounded-lg ${r.color} flex items-center justify-center`}>
                        <Icon size={18} />
                      </div>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#F7F7F9] text-[#686B78]">
                        {r.badge}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-[#282C3F] mb-1.5">
                      {r.label}
                    </h3>
                    <p className="text-xs text-[#686B78] leading-relaxed mb-4">
                      {r.desc}
                    </p>
                  </div>

                  <button
                    id={`quick-login-${r.role}`}
                    data-testid={`demo-btn-${r.role}`}
                    onClick={() => quickLogin(r.phone)}
                    disabled={loading}
                    className="w-full py-2.5 px-3 rounded-lg border border-[#E9E9EB] hover:bg-[#FFF3E8] hover:border-[#FC8019] text-[#282C3F] hover:text-[#FC8019] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Enter as {r.label}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Manual Phone/OTP Login Panel */}
          <div className="mt-8 max-w-md mx-auto p-6 border border-[#E9E9EB] rounded-xl bg-[#F7F7F9]">
            <div className="text-center mb-4">
              <h3 className="text-sm font-bold text-[#282C3F]">Direct OTP Login</h3>
              <p className="text-xs text-[#686B78] mt-0.5">
                Sign in using your 10-digit registered mobile number
              </p>
            </div>

            {step === 'phone' ? (
              <form onSubmit={handleRequestOtp} className="space-y-3">
                <div>
                  <label htmlFor="phone-input" className="text-xs font-semibold text-[#282C3F] block mb-1">
                    Mobile Number
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
                    className="w-full bg-white border border-[#E9E9EB] rounded-lg px-3.5 py-2.5 text-sm text-[#282C3F] focus:outline-none focus:border-[#FC8019] transition"
                  />
                </div>
                {error && <p className="text-xs text-[#D7263D]">{error}</p>}
                <button
                  id="send-otp-btn"
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full text-xs font-bold uppercase tracking-wider"
                >
                  {loading ? 'Sending OTP…' : 'Request OTP Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('phone');
                      setError('');
                    }}
                    className="text-xs text-[#686B78] hover:text-[#282C3F]"
                  >
                    ← Change Phone ({phone})
                  </button>
                  <span className="text-[10px] text-[#1BA672] font-semibold bg-[#EAF7F1] px-2 py-0.5 rounded">
                    Demo Code: 1234
                  </span>
                </div>

                <div>
                  <label htmlFor="otp-input" className="text-xs font-semibold text-[#282C3F] block mb-1">
                    4-Digit Verification Code
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
                    className="w-full bg-white border border-[#E9E9EB] rounded-lg px-3.5 py-2.5 text-center text-lg font-bold tracking-[0.4em] text-[#282C3F] focus:outline-none focus:border-[#FC8019] transition"
                  />
                </div>
                {error && <p className="text-xs text-[#D7263D]">{error}</p>}
                <button
                  id="verify-otp-btn"
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full text-xs font-bold uppercase tracking-wider"
                >
                  {loading ? 'Verifying…' : 'Verify & Continue →'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ── 5. Trust and Architecture Section ──────────────────────────────── */}
        <div className="mt-20 pt-16 border-t border-[#E9E9EB]">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#686B78] block mb-1">
              Architecture & Invariants
            </span>
            <h2 className="text-2xl font-bold text-[#282C3F] tracking-tight">
              Engineered for financial accuracy & scale
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl border border-[#E9E9EB] bg-white">
              <div className="w-8 h-8 rounded-lg bg-[#FFF3E8] text-[#FC8019] flex items-center justify-center mb-3">
                <Cpu size={18} />
              </div>
              <h3 className="font-bold text-sm text-[#282C3F] mb-1">
                Deterministic Fairness Engine
              </h3>
              <p className="text-xs text-[#686B78] leading-relaxed">
                Zero external I/O in decision rules. 98.6% statement test coverage with pure mathematical entitlement resolution.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-[#E9E9EB] bg-white">
              <div className="w-8 h-8 rounded-lg bg-[#EAF7F1] text-[#1BA672] flex items-center justify-center mb-3">
                <Database size={18} />
              </div>
              <h3 className="font-bold text-sm text-[#282C3F] mb-1">
                Append-Only Recovery Ledger
              </h3>
              <p className="text-xs text-[#686B78] leading-relaxed">
                All refunds, credits, and voucher issuances are permanently recorded with cryptographic trace identifiers.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-[#E9E9EB] bg-white">
              <div className="w-8 h-8 rounded-lg bg-[#FFF6E5] text-[#C77400] flex items-center justify-center mb-3">
                <Radio size={18} />
              </div>
              <h3 className="font-bold text-sm text-[#282C3F] mb-1">
                Real-Time Event Mesh
              </h3>
              <p className="text-xs text-[#686B78] leading-relaxed">
                Socket.IO event gateway synchronizing customer radar, kitchen ticket state, and rider telemetry in under 100ms.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-[#E9E9EB] bg-white">
              <div className="w-8 h-8 rounded-lg bg-[#F1F0F4] text-[#282C3F] flex items-center justify-center mb-3">
                <Lock size={18} />
              </div>
              <h3 className="font-bold text-sm text-[#282C3F] mb-1">
                Strict Integer Paise Math
              </h3>
              <p className="text-xs text-[#686B78] leading-relaxed">
                Zero floating-point arithmetic. Every financial calculation is verified to the single paise across all database models.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Clean Swiggy Footer ────────────────────────────────────────── */}
      <footer className="border-t border-[#E9E9EB] bg-[#F7F7F9] px-4 sm:px-8 py-8 text-xs text-[#686B78]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#FC8019] text-white flex items-center justify-center font-bold text-xs">
              S
            </div>
            <span className="font-bold text-[#282C3F]">Swiggy Unified Recovery</span>
            <span className="text-[#686B78]">· Rescue + Resolve</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-[#282C3F] font-medium">
            <Link href="/help" className="hover:text-[#FC8019] transition">
              SLA Policies
            </Link>
            <Link href="/dashboard" className="hover:text-[#FC8019] transition">
              Customer Hub
            </Link>
            <Link href="/partner/restaurant" className="hover:text-[#FC8019] transition">
              Kitchen KDS
            </Link>
            <Link href="/agent" className="hover:text-[#FC8019] transition">
              Agent Console
            </Link>
          </div>

          <div className="text-center sm:text-right text-[11px] text-[#686B78]">
            Next.js 14 · NestJS · PostgreSQL 16 · Redis · Swiggy Design System
          </div>
        </div>
      </footer>
    </div>
  );
}
