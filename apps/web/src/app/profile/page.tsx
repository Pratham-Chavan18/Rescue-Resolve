'use client';

import { useAuthStore } from '@/store/auth';
import { AppShell } from '@/components/AppShell';
import { formatRupees } from '@/lib/format';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  const savedAddresses = [
    { id: 'addr-1', label: 'Home', address: 'Flat 402, Green Glen Layout, Bellandur, Bangalore - 560103', isDefault: true },
    { id: 'addr-2', label: 'Work', address: 'Tower B, 7th Floor, Embassy TechVillage, Outer Ring Road, Bangalore - 560103', isDefault: false },
  ];

  return (
    <AppShell
      breadcrumbs={[
        { label: 'Customer' },
        { label: 'Profile & Wallet' },
      ]}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-2xl font-bold text-orange-400">
              {user?.name?.[0] || 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{user?.name || 'Customer Demo'}</h1>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  {user?.role || 'customer'}
                </span>
              </div>
              <p className="text-xs text-white/50 mt-1">Phone: {(user as any)?.phone || '+91 90000 00001'} · Member since 2024</p>
            </div>
          </div>

          <button
            onClick={() => {
              clearAuth();
              router.push('/');
            }}
            className="px-4 py-2 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs transition self-start sm:self-auto"
          >
            Sign Out
          </button>
        </div>

        {/* Swiggy Wallet Card */}
        <div className="bg-gradient-to-br from-[#1c1c20] via-[#18181b] to-[#121214] border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">💳</span>
              <div>
                <h2 className="text-base font-bold text-white">Swiggy Unified Wallet</h2>
                <p className="text-xs text-white/40">Includes instant Rescue compensations & Resolve credits</p>
              </div>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              Active & Protected
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
            <div>
              <span className="text-xs text-white/40 uppercase tracking-wider">Available Balance</span>
              <p className="text-3xl font-bold font-mono text-emerald-400 mt-1">
                {formatRupees(12500)}
              </p>
              <span className="text-[11px] text-white/40 mt-1 block">Valid across food & Instamart</span>
            </div>

            <div>
              <span className="text-xs text-white/40 uppercase tracking-wider">30-Day Recovery Inflow</span>
              <p className="text-2xl font-bold font-mono text-white mt-1">
                {formatRupees(50500)}
              </p>
              <span className="text-[11px] text-emerald-400 mt-1 block">3 automated recovery settlements</span>
            </div>

            <div>
              <span className="text-xs text-white/40 uppercase tracking-wider">Default Payout Source</span>
              <p className="text-sm font-semibold text-white mt-1">
                HDFC Bank UPI (••• 4910)
              </p>
              <span className="text-[11px] text-white/40 mt-1 block">Direct bank refunds routed here</span>
            </div>
          </div>
        </div>

        {/* Saved Addresses */}
        <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h2 className="text-base font-bold text-white">Saved Delivery Addresses</h2>
            <button className="text-xs text-orange-400 hover:text-orange-300 font-semibold">+ Add Address</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedAddresses.map((addr) => (
              <div key={addr.id} className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <span>📍</span> {addr.label}
                  </span>
                  {addr.isDefault && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/60 leading-relaxed">{addr.address}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
