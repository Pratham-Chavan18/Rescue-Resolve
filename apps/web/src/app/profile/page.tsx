'use client';

import React from 'react';
import { useAuthStore } from '@/store/auth';
import { AppShell } from '@/components/AppShell';
import { formatRupees } from '@/lib/format';
import { useRouter } from 'next/navigation';
import {
  User,
  Wallet,
  MapPin,
  LogOut,
  ShieldCheck,
  CreditCard,
  Building,
  CheckCircle2,
  Plus,
} from 'lucide-react';

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
        <div className="p-6 rounded-lg bg-white border border-[#E9E9EB] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-[#FFF3E8] border border-[#FC8019]/30 flex items-center justify-center text-xl font-bold text-[#FC8019]">
              {user?.name?.[0] || 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#282C3F]">{user?.name || 'Customer Demo'}</h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FFF3E8] text-[#FC8019] border border-[#FC8019]/20">
                  {user?.role || 'customer'}
                </span>
              </div>
              <p className="text-xs text-[#686B78] mt-1">Phone: {(user as any)?.phone || '+91 90000 00001'} · Protected by Swiggy Unified Recovery</p>
            </div>
          </div>

          <button
            onClick={() => {
              clearAuth();
              router.push('/');
            }}
            className="btn-secondary !text-[#D7263D] !border-[#D7263D]/30 hover:!bg-[#FDECEF] !py-2 !px-3.5 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>

        {/* Swiggy Wallet Card */}
        <div className="p-6 rounded-lg bg-white border border-[#E9E9EB] shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#E9E9EB]">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-[#FFF3E8] text-[#FC8019]">
                <Wallet size={20} />
              </span>
              <div>
                <h2 className="text-base font-bold text-[#282C3F]">Swiggy Unified Recovery Wallet</h2>
                <p className="text-xs text-[#686B78]">Instant deposits from Rescue delay compensations and Resolve settlements</p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#1BA672] bg-[#EAF7F1] px-2.5 py-1 rounded-full border border-[#1BA672]/20 flex items-center gap-1">
              <ShieldCheck size={14} />
              Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-lg bg-[#F7F7F9] border border-[#E9E9EB] space-y-1">
              <span className="text-xs text-[#686B78] uppercase tracking-wider font-semibold">Available Balance</span>
              <p className="text-2xl font-bold font-mono text-[#1BA672]">
                {formatRupees(12500)}
              </p>
              <span className="text-[11px] text-[#686B78] block">Usable immediately on food &amp; Instamart</span>
            </div>

            <div className="p-4 rounded-lg bg-[#F7F7F9] border border-[#E9E9EB] space-y-1">
              <span className="text-xs text-[#686B78] uppercase tracking-wider font-semibold">30-Day Recovery Inflow</span>
              <p className="text-2xl font-bold font-mono text-[#282C3F]">
                {formatRupees(50500)}
              </p>
              <span className="text-[11px] text-[#1BA672] font-semibold block">3 automated recovery settlements</span>
            </div>

            <div className="p-4 rounded-lg bg-[#F7F7F9] border border-[#E9E9EB] space-y-1">
              <span className="text-xs text-[#686B78] uppercase tracking-wider font-semibold">Default Payout Method</span>
              <p className="text-sm font-bold text-[#282C3F] flex items-center gap-1.5 mt-1">
                <CreditCard size={15} className="text-[#686B78]" />
                HDFC UPI (••• 4910)
              </p>
              <span className="text-[11px] text-[#686B78] block">Direct banking reversals routed here</span>
            </div>
          </div>
        </div>

        {/* Saved Addresses */}
        <div className="p-6 rounded-lg bg-white border border-[#E9E9EB] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E9E9EB]">
            <div>
              <h2 className="text-base font-bold text-[#282C3F]">Saved Delivery Locations</h2>
              <p className="text-xs text-[#686B78] mt-0.5">Used for geofenced telemetry and ETA tracking</p>
            </div>
            <button className="text-xs font-bold text-[#FC8019] hover:underline flex items-center gap-1">
              <Plus size={14} /> Add Address
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedAddresses.map((addr) => (
              <div key={addr.id} className="p-4 rounded-lg border border-[#E9E9EB] bg-[#F7F7F9] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#282C3F] flex items-center gap-1.5">
                    <MapPin size={14} className="text-[#FC8019]" />
                    {addr.label}
                  </span>
                  {addr.isDefault && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF3E8] text-[#FC8019] border border-[#FC8019]/20">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#686B78] leading-relaxed">{addr.address}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
