'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { partnersApi } from '@/lib/api-client';
import { formatRupees } from '@/lib/format';
import { AppShell } from '@/components/AppShell';

export default function RiderPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'active' | 'assigned' | 'history' | 'issue'>('active');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [issueNote, setIssueNote] = useState('');

  useEffect(() => {
    if (!token || user?.role !== 'rider') {
      router.push('/');
    }
  }, [token, user, router]);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['rider-tasks'],
    queryFn: () => partnersApi.getRiderTasks(token!),
    refetchInterval: 15000,
    enabled: !!token,
  });

  const acceptMutation = useMutation({
    mutationFn: (orderId: string) => partnersApi.acceptReassignment(orderId, token!),
    onSuccess: (_, orderId) => {
      setActionSuccess(`Accepted delivery for order #${orderId.slice(0, 8)}`);
      qc.invalidateQueries({ queryKey: ['rider-tasks'] });
    },
  });

  const pickupMutation = useMutation({
    mutationFn: (orderId: string) => partnersApi.pickupOrder(orderId, token!),
    onSuccess: (_, orderId) => {
      setActionSuccess(`Marked order #${orderId.slice(0, 8)} as Picked Up. Heading to customer!`);
      qc.invalidateQueries({ queryKey: ['rider-tasks'] });
    },
  });

  const deliverMutation = useMutation({
    mutationFn: (orderId: string) => partnersApi.deliverOrder(orderId, token!),
    onSuccess: (_, orderId) => {
      setActionSuccess(`Order #${orderId.slice(0, 8)} successfully delivered!`);
      qc.invalidateQueries({ queryKey: ['rider-tasks'] });
    },
  });

  const reportIssueMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      partnersApi.reportRiderIssue(orderId, reason, token!),
    onSuccess: () => {
      setActionSuccess('Telemetry incident reported to Swiggy Rescue operations dispatch.');
      setIssueNote('');
      setActiveTab('active');
    },
  });

  if (!token || user?.role !== 'rider') return null;

  const taskList = (tasks as any[]) || [];
  const activeTask = taskList[0] || {
    id: 'order-demo-live',
    restaurant: { name: 'Meghana Foods (Indiranagar)', address: '100ft Road, Indiranagar' },
    address: 'Flat 402, Green Glen Layout, Bellandur, Bangalore',
    status: 'picked_up',
    totalPaise: 48000,
    items: [{ id: '1', name: 'Special Chicken Biryani', qty: 1 }],
  };

  return (
    <AppShell
      breadcrumbs={[
        { label: 'Delivery Partner' },
        { label: 'Rider Operations' },
      ]}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Banner Alert */}
        {actionSuccess && (
          <div className="p-4 rounded-xl flex items-center justify-between border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm">
            <span>✨ {actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} className="text-white/60 hover:text-white">✕</button>
          </div>
        )}

        {/* Rider Top Status */}
        <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-3xl">
              🛵
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{user?.name || 'Ramesh Kumar'}</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  Duty ON · GPS Active
                </span>
              </div>
              <p className="text-xs text-white/50 mt-1">Rider ID: RIDER-KA03-8819 · Hero Splendor (KA-03-HA-4910)</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-center">
              <span className="text-[10px] text-white/40 uppercase block">Today&apos;s Payout</span>
              <span className="text-sm font-bold font-mono text-emerald-400">₹820.00</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'active'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>📍</span> Active Delivery
          </button>
          <button
            onClick={() => setActiveTab('assigned')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'assigned'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>📋</span> Assigned ({taskList.length})
          </button>
          <button
            onClick={() => setActiveTab('issue')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'issue'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>⚠️</span> Report Delay / Issue
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>📜</span> Delivery History
          </button>
        </div>

        {/* ACTIVE DELIVERY TAB */}
        {activeTab === 'active' && activeTask && (
          <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <span className="text-xs text-orange-400 font-semibold uppercase tracking-wider">In-Flight Delivery</span>
                <h2 className="text-lg font-bold text-white mt-0.5">Order #{activeTask.id.slice(0, 8)}</h2>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold uppercase">
                {activeTask.status.replace('_', ' ')}
              </span>
            </div>

            {/* Route Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pickup Point */}
              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
                <span className="text-xs text-white/40 uppercase tracking-wider flex items-center gap-1.5 font-semibold">
                  <span>🍳</span> 1. Pickup Restaurant
                </span>
                <p className="text-sm font-bold text-white">{activeTask.restaurant?.name || 'Meghana Foods (Indiranagar)'}</p>
                <p className="text-xs text-white/60">{activeTask.restaurant?.address || '100ft Road, Indiranagar, Bangalore'}</p>
                <div className="pt-2">
                  <button
                    onClick={() => pickupMutation.mutate(activeTask.id)}
                    disabled={pickupMutation.isPending || activeTask.status === 'picked_up'}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      activeTask.status === 'picked_up'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    {activeTask.status === 'picked_up' ? '✓ Picked Up from Kitchen' : 'Confirm Order Pickup'}
                  </button>
                </div>
              </div>

              {/* Dropoff Point */}
              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
                <span className="text-xs text-white/40 uppercase tracking-wider flex items-center gap-1.5 font-semibold">
                  <span>📍</span> 2. Dropoff Destination
                </span>
                <p className="text-sm font-bold text-white">Customer: Demo User</p>
                <p className="text-xs text-white/60">{activeTask.address || 'Flat 402, Green Glen Layout, Bellandur, Bangalore'}</p>
                <div className="pt-2">
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Payment: Prepaid UPI ({formatRupees(activeTask.totalPaise || 48000)})
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Action Buttons */}
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                onClick={() => setActiveTab('issue')}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition flex items-center justify-center gap-2"
              >
                <span>⚠️</span> Report Traffic / Bike Breakdown
              </button>

              <button
                onClick={() => deliverMutation.mutate(activeTask.id)}
                disabled={deliverMutation.isPending}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
              >
                {deliverMutation.isPending ? 'Completing Handover…' : '✓ Mark Order Delivered to Customer'}
              </button>
            </div>
          </div>
        )}

        {/* REPORT ISSUE TAB */}
        {activeTab === 'issue' && (
          <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
            <div>
              <h2 className="text-base font-bold text-white">Report Delivery Impediment</h2>
              <p className="text-xs text-white/50 mt-0.5">
                Reporting an incident notifies the Swiggy Rescue telemetry engine immediately and protects your rider rating.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Heavy Traffic Jam (>10 min)', reason: 'severe_traffic' },
                { label: 'Bike Breakdown / Flat Tyre', reason: 'breakdown' },
                { label: 'Customer Phone Unreachable', reason: 'customer_unreachable' },
                { label: 'Accident or Extreme Weather', reason: 'weather_emergency' },
              ].map((item) => (
                <button
                  key={item.reason}
                  onClick={() => reportIssueMutation.mutate({ orderId: activeTask.id, reason: item.reason })}
                  disabled={reportIssueMutation.isPending}
                  className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-orange-500/10 hover:border-orange-500/40 text-left transition"
                >
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <p className="text-xs text-white/40 mt-1">Triggers automated rescue signal</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-white">Completed Trips Today</h2>
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Order #order-past-099 · Meghana Foods</p>
                  <p className="text-xs text-white/40">Delivered at 12:15 PM · 3.4 km</p>
                </div>
                <span className="text-sm font-mono font-bold text-emerald-400">+₹65.00</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
