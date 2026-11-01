'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { partnersApi } from '@/lib/api-client';
import { formatRupees, formatEta } from '@/lib/format';
import { useGlobalSocket } from '@/lib/socket';
import type { ServerEvent } from '@swiggy/types';
import { AppShell } from '@/components/AppShell';

export default function RestaurantPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'incoming' | 'active' | 'ready' | 'issues' | 'performance'>('incoming');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token || user?.role !== 'restaurant') {
      router.push('/');
    }
  }, [token, user, router]);

  useGlobalSocket(
    token,
    useCallback(
      (event: ServerEvent) => {
        if (event.t === 'partner.risk' || event.t === 'health.changed') {
          qc.invalidateQueries({ queryKey: ['restaurant-orders'] });
        }
      },
      [qc],
    ),
  );

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['restaurant-orders'],
    queryFn: () => partnersApi.getRestaurantOrders(token!),
    refetchInterval: 15000,
    enabled: !!token,
  });

  const confirmPackingMutation = useMutation({
    mutationFn: ({ orderId, minutes }: { orderId: string; minutes: number }) =>
      partnersApi.confirmPacking(orderId, minutes, token!),
    onSuccess: (_, vars) => {
      setActionSuccess(`Updated packing time for order ${vars.orderId.slice(0, 8)} to ${vars.minutes} mins.`);
      qc.invalidateQueries({ queryKey: ['restaurant-orders'] });
    },
  });

  const acceptOrderMutation = useMutation({
    mutationFn: (orderId: string) => partnersApi.acceptOrder(orderId, token!),
    onSuccess: (_, orderId) => {
      setActionSuccess(`Order ${orderId.slice(0, 8)} accepted and sent to kitchen prep!`);
      qc.invalidateQueries({ queryKey: ['restaurant-orders'] });
    },
  });

  const markReadyMutation = useMutation({
    mutationFn: (orderId: string) => partnersApi.markReady(orderId, token!),
    onSuccess: (_, orderId) => {
      setActionSuccess(`Order ${orderId.slice(0, 8)} marked Ready for Rider Pickup!`);
      qc.invalidateQueries({ queryKey: ['restaurant-orders'] });
    },
  });

  if (!token || user?.role !== 'restaurant') return null;

  const orderList = (orders as any[]) || [];
  const incomingOrders = orderList.filter((o) => o.status === 'placed');
  const activeOrders = orderList.filter((o) => o.status === 'confirmed' || o.status === 'preparing');
  const readyOrders = orderList.filter((o) => o.status === 'ready' || o.status === 'picked_up');

  return (
    <AppShell
      breadcrumbs={[
        { label: 'Restaurant Partner' },
        { label: 'Kitchen & Order Console' },
      ]}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Banner Alert */}
        {actionSuccess && (
          <div className="p-4 rounded-xl flex items-center justify-between border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm">
            <span>✨ {actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} className="text-white/60 hover:text-white">✕</button>
          </div>
        )}

        {/* Restaurant Header */}
        <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-3xl">
              🍳
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{user?.name || 'Meghana Foods (Indiranagar)'}</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  Online · Accepting Orders
                </span>
              </div>
              <p className="text-xs text-white/50 mt-1">Outlet ID: REST-BLR-0419 · Average Prep Time: 14 mins</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-center">
              <span className="text-[10px] text-white/40 uppercase block">Kitchen Load</span>
              <span className="text-sm font-bold text-amber-400">Normal (62%)</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'incoming'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🛎️</span> Incoming Orders ({incomingOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'active'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🔥</span> Active Kitchen ({activeOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('ready')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'ready'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>📦</span> Ready for Pickup ({readyOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('issues')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'issues'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🚨</span> Order Issues (0)
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'performance'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>📈</span> Kitchen SLA
          </button>
        </div>

        {/* Content based on Active Tab */}
        {isLoading ? (
          <div className="bg-[#18181b] border border-white/10 rounded-2xl p-12 text-center text-white/40">
            Fetching kitchen tickets and live order feed…
          </div>
        ) : (
          <div className="space-y-4">
            {/* INCOMING TAB */}
            {activeTab === 'incoming' && (
              <div className="space-y-4">
                {incomingOrders.length === 0 ? (
                  <div className="bg-[#18181b] border border-white/10 rounded-2xl p-10 text-center text-white/50">
                    <p className="text-3xl mb-2">✨</p>
                    <p className="text-sm font-semibold text-white">No pending orders to accept</p>
                    <p className="text-xs text-white/40 mt-1">New incoming customer orders will chime here in real-time.</p>
                  </div>
                ) : (
                  incomingOrders.map((order) => (
                    <div key={order.id} className="bg-[#18181b] border border-orange-500/30 rounded-2xl p-6 shadow-xl space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <div>
                          <span className="text-xs text-orange-400 font-semibold uppercase tracking-wider">New Order Received</span>
                          <h3 className="text-lg font-bold text-white mt-0.5">Order #{order.id.slice(0, 8)}</h3>
                        </div>
                        <span className="text-sm font-mono font-bold text-emerald-400">{formatRupees(order.totalPaise)}</span>
                      </div>

                      <div className="space-y-2">
                        {order.items?.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-xs text-white/80">
                            <span>{item.name} × {item.qty}</span>
                            <span className="font-mono">{formatRupees(item.pricePaise * item.qty)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-white/10 flex justify-end gap-3">
                        <button
                          onClick={() => acceptOrderMutation.mutate(order.id)}
                          disabled={acceptOrderMutation.isPending}
                          className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs shadow-lg shadow-orange-600/30 transition"
                        >
                          {acceptOrderMutation.isPending ? 'Accepting…' : 'Accept Order & Start Prep →'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ACTIVE KITCHEN TAB */}
            {activeTab === 'active' && (
              <div className="space-y-4">
                {activeOrders.length === 0 && incomingOrders.length === 0 && (
                  <div className="bg-[#18181b] border border-white/10 rounded-2xl p-10 text-center text-white/50">
                    <p className="text-3xl mb-2">🍽️</p>
                    <p className="text-sm font-semibold text-white">Kitchen queue is clear</p>
                    <p className="text-xs text-white/40 mt-1">All orders are currently dispatched or delivered.</p>
                  </div>
                )}

                {/* Show any orders in kitchen */}
                {(activeOrders.length > 0 ? activeOrders : orderList).map((order) => (
                  <div key={order.id} className="bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white">Ticket #{order.id.slice(0, 8)}</h3>
                          <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full ${
                            order.health?.state === 'failing'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : order.health?.state === 'at_risk'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {order.health?.state ? order.health.state.replace('_', ' ') : 'On Track'}
                          </span>
                        </div>
                        <p className="text-xs text-white/50 mt-0.5">Assigned Rider: Ramesh Kumar · Customer: Demo User</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => markReadyMutation.mutate(order.id)}
                          disabled={markReadyMutation.isPending}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-lg shadow-emerald-600/30"
                        >
                          ✓ Mark Food Ready for Pickup
                        </button>
                      </div>
                    </div>

                    {/* Order items */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                      {order.items?.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between text-xs py-1 px-2">
                          <span className="text-white font-medium">● {item.name} × {item.qty}</span>
                          <span className="text-white/40 font-mono">{formatRupees(item.pricePaise * item.qty)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Risk warning & Packing adjustment */}
                    {(order.health?.state === 'at_risk' || order.health?.state === 'failing') && (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
                        <span>⚠️ Telemetry indicates kitchen prep overrun. Extend packing ETA to notify rider and prevent Rescue cancellation:</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-white/50 mr-2">Packing Time:</span>
                      {[10, 15, 20, 25].map((min) => (
                        <button
                          key={min}
                          id={`confirm-packing-${order.id}-${min}`}
                          onClick={() => confirmPackingMutation.mutate({ orderId: order.id, minutes: min })}
                          disabled={confirmPackingMutation.isPending}
                          className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-orange-500/40 text-xs font-semibold text-white/80 transition"
                        >
                          +{min}m
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* READY FOR PICKUP TAB */}
            {activeTab === 'ready' && (
              <div className="space-y-4">
                <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-sm font-bold text-white mb-2">Rider Dispatch Bay</h3>
                  <p className="text-xs text-white/50 mb-4">
                    Orders bagged and waiting for rider pickup at the counter.
                  </p>
                  <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">Order #order-demo-live (Bag #4)</p>
                      <p className="text-xs text-emerald-400">Rider arrived at outlet · Ready for handoff</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-white">OTP: 4892</span>
                  </div>
                </div>
              </div>
            )}

            {/* PERFORMANCE TAB */}
            {activeTab === 'performance' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#18181b] border border-white/10 rounded-2xl p-5 shadow-lg">
                  <span className="text-xs text-white/40 uppercase tracking-wider">Kitchen SLA Compliance</span>
                  <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">98.4%</p>
                  <span className="text-[11px] text-white/40 mt-1 block">Target threshold &gt;95%</span>
                </div>
                <div className="bg-[#18181b] border border-white/10 rounded-2xl p-5 shadow-lg">
                  <span className="text-xs text-white/40 uppercase tracking-wider">Avg Prep Time</span>
                  <p className="text-2xl font-bold font-mono text-white mt-1">13.8 mins</p>
                  <span className="text-[11px] text-emerald-400 mt-1 block">1.2 mins faster than zone avg</span>
                </div>
                <div className="bg-[#18181b] border border-white/10 rounded-2xl p-5 shadow-lg">
                  <span className="text-xs text-white/40 uppercase tracking-wider">Rescue Trigger Rate</span>
                  <p className="text-2xl font-bold font-mono text-white mt-1">0.8%</p>
                  <span className="text-[11px] text-white/40 mt-1 block">Low kitchen fault attribution</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
