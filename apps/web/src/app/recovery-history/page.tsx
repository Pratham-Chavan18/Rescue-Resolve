'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { ordersApi } from '@/lib/api-client';
import { formatRupees } from '@/lib/format';
import { AppShell } from '@/components/AppShell';
import Link from 'next/link';

export default function RecoveryHistoryPage() {
  const { token } = useAuthStore();

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['recovery-history'],
    queryFn: () => ordersApi.getCustomerRecoveryHistory(token!),
    enabled: !!token,
  });

  const recoveries = Array.isArray(historyData) && historyData.length > 0 ? historyData : [
    {
      id: 'led-rec-001',
      date: 'Today, 01:14 PM',
      caseId: 'CASE-RESCUE-4901',
      orderId: 'order-demo-live',
      type: 'Rescue Compensation',
      rule: 'W-1: 6-min rider delay SLA compensation',
      amountPaise: 5000,
      destination: 'wallet',
      status: 'Credited',
    },
    {
      id: 'led-rec-002',
      date: '28 Oct 2026, 08:30 PM',
      caseId: 'CASE-RES-8812',
      orderId: 'order-demo-completed',
      type: 'Resolve Item Refund',
      rule: 'W-1: Wrong item delivered with packaging proof',
      amountPaise: 38000,
      destination: 'source',
      status: 'Refund Settled',
    },
    {
      id: 'led-rec-003',
      date: '15 Oct 2026, 02:10 PM',
      caseId: 'CASE-RES-7719',
      orderId: 'order-past-099',
      type: 'Late Delivery Compensation',
      rule: 'L-1: ETA overrun >25m tier 2 compensation',
      amountPaise: 7500,
      destination: 'wallet',
      status: 'Credited',
    },
  ];

  const totalPaiseRecovered = recoveries.reduce((acc: number, r: any) => acc + (r.amountPaise || 0), 0);
  const totalWalletCreditPaise = recoveries
    .filter((r: any) => r.destination === 'wallet')
    .reduce((acc: number, r: any) => acc + (r.amountPaise || 0), 0);

  return (
    <AppShell
      breadcrumbs={[
        { label: 'Customer' },
        { label: 'Recovery History' },
      ]}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Recovery Ledger & Refunds</h1>
            <p className="text-xs text-white/50 mt-1">
              Append-only audit trail of all Swiggy Rescue compensations and Resolve claim settlements.
            </p>
          </div>
          <Link
            href="/resolve"
            className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs transition shadow-lg shadow-orange-600/30 flex items-center gap-2 self-start sm:self-auto"
          >
            <span>🚨</span> Report New Issue
          </Link>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#18181b] border border-white/10 rounded-2xl p-5 shadow-lg">
            <span className="text-xs text-white/40 uppercase tracking-wider font-semibold">Total Recovered</span>
            <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {formatRupees(totalPaiseRecovered)}
            </p>
            <span className="text-[11px] text-white/40 mt-1 block">Across 3 verified recovery events</span>
          </div>

          <div className="bg-[#18181b] border border-white/10 rounded-2xl p-5 shadow-lg">
            <span className="text-xs text-white/40 uppercase tracking-wider font-semibold">Credited to Swiggy Wallet</span>
            <p className="text-2xl font-bold font-mono text-white mt-1">
              {formatRupees(totalWalletCreditPaise)}
            </p>
            <span className="text-[11px] text-emerald-400 mt-1 block">Available for immediate food orders</span>
          </div>

          <div className="bg-[#18181b] border border-white/10 rounded-2xl p-5 shadow-lg">
            <span className="text-xs text-white/40 uppercase tracking-wider font-semibold">Rolling 30-Day Limit</span>
            <div className="flex items-center justify-between mt-1">
              <p className="text-2xl font-bold font-mono text-white/80">₹505 / ₹3,000</p>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                17% Utilized
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '17%' }} />
            </div>
          </div>
        </div>

        {/* Ledger Table Card */}
        <div className="bg-[#18181b] border border-white/10 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Itemized Recovery Entries</h2>
            <span className="text-xs text-white/40 font-mono">Immutable cryptographic records</span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-white/40">Loading recovery ledger entries…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-xs uppercase tracking-wider text-white/40">
                    <th className="py-3 px-6">Timestamp / ID</th>
                    <th className="py-3 px-6">Category</th>
                    <th className="py-3 px-6">Rule Evaluation</th>
                    <th className="py-3 px-6">Destination</th>
                    <th className="py-3 px-6 text-right">Amount</th>
                    <th className="py-3 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recoveries.map((rec: any) => (
                    <tr key={rec.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-4 px-6">
                        <p className="font-semibold text-white">{rec.date}</p>
                        <p className="text-xs text-white/40 font-mono">{rec.caseId}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/80">
                          {rec.type}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-xs text-white/80 max-w-xs">{rec.rule}</p>
                        <p className="text-[10px] text-white/40 mt-0.5">Order Ref: {rec.orderId}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`text-xs font-semibold ${rec.destination === 'wallet' ? 'text-orange-400' : 'text-sky-400'}`}>
                          {rec.destination === 'wallet' ? 'Swiggy Wallet' : 'Original UPI/Card'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-emerald-400">
                        +{formatRupees(rec.amountPaise)}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
