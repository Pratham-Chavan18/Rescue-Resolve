'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { partnersApi } from '@/lib/api-client';
import { formatRupees } from '@/lib/format';
import { useGlobalSocket } from '@/lib/socket';
import type { ServerEvent } from '@swiggy/types';
import { AppShell } from '@/components/AppShell';
import {
  ChefHat,
  Bell,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Clock,
  Package,
} from 'lucide-react';

function RestaurantContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useAuthStore();
  const qc = useQueryClient();

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'incoming' | 'active' | 'ready' | 'issues' | 'performance'>('incoming');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (tabParam && ['incoming', 'active', 'ready', 'issues', 'performance'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [tabParam]);

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
          <div className="p-4 rounded-lg flex items-center justify-between border border-[#1BA672]/30 bg-[#EAF7F1] text-[#1BA672] text-xs font-bold shadow-sm">
            <span>✨ {actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} className="text-[#1BA672] hover:opacity-80">✕</button>
          </div>
        )}

        {/* Restaurant Header */}
        <div className="bg-white border border-[#E9E9EB] rounded-lg p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#FFF6E5] text-[#C77400] flex items-center justify-center text-2xl font-bold">
              🍳
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#282C3F]">{user?.name || 'Spice Garden (Indiranagar)'}</h1>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#EAF7F1] text-[#1BA672] border border-[#1BA672]/20 font-bold">
                  Online · Accepting Orders
                </span>
              </div>
              <p className="text-xs text-[#686B78] mt-0.5">Outlet ID: REST-BLR-0419 · Average Prep Time: 14 mins</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#F7F7F9] border border-[#E9E9EB] px-4 py-2 rounded-lg text-center">
              <span className="text-[10px] text-[#686B78] uppercase font-bold block">Kitchen Load</span>
              <span className="text-sm font-bold text-[#C77400]">Normal (62%)</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#E9E9EB] gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'incoming'
                ? 'bg-[#FC8019] text-white shadow-sm'
                : 'text-[#686B78] hover:text-[#282C3F] hover:bg-[#F7F7F9]'
            }`}
          >
            <span>🛎️</span> Incoming Orders ({incomingOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'active'
                ? 'bg-[#FC8019] text-white shadow-sm'
                : 'text-[#686B78] hover:text-[#282C3F] hover:bg-[#F7F7F9]'
            }`}
          >
            <span>🔥</span> Active Kitchen ({activeOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('ready')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ready'
                ? 'bg-[#FC8019] text-white shadow-sm'
                : 'text-[#686B78] hover:text-[#282C3F] hover:bg-[#F7F7F9]'
            }`}
          >
            <span>📦</span> Ready for Pickup ({readyOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('issues')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'issues'
                ? 'bg-[#FC8019] text-white shadow-sm'
                : 'text-[#686B78] hover:text-[#282C3F] hover:bg-[#F7F7F9]'
            }`}
          >
            <span>🚨</span> Order Issues (0)
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'performance'
                ? 'bg-[#FC8019] text-white shadow-sm'
                : 'text-[#686B78] hover:text-[#282C3F] hover:bg-[#F7F7F9]'
            }`}
          >
            <span>📈</span> Kitchen SLA
          </button>
        </div>

        {/* Content based on Active Tab */}
        {isLoading ? (
          <div className="bg-white border border-[#E9E9EB] rounded-lg p-12 text-center text-[#686B78]">
            Fetching kitchen tickets and live order feed…
          </div>
        ) : (
          <div className="space-y-4">
            {/* INCOMING TAB */}
            {activeTab === 'incoming' && (
              <div className="space-y-4">
                {incomingOrders.length === 0 ? (
                  <div className="bg-white border border-[#E9E9EB] rounded-lg p-10 text-center text-[#686B78]">
                    <p className="text-2xl mb-1">✨</p>
                    <p className="text-sm font-bold text-[#282C3F]">No pending orders to accept</p>
                    <p className="text-xs text-[#686B78] mt-1">New incoming customer orders will chime here in real-time.</p>
                  </div>
                ) : (
                  incomingOrders.map((order) => (
                    <div key={order.id} className="bg-white border border-[#FC8019]/40 rounded-lg p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-[#E9E9EB]">
                        <div>
                          <span className="text-[10px] text-[#FC8019] font-bold uppercase tracking-wider">New Order Received</span>
                          <h2 className="text-base font-bold text-[#282C3F] mt-0.5">Order #{order.id.slice(0, 8)}</h2>
                        </div>
                        <span className="text-sm font-bold text-[#1BA672]">{formatRupees(order.totalPaise)}</span>
                      </div>

                      <div className="space-y-1.5">
                        {order.items?.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-xs text-[#282C3F]">
                            <span>{item.name} × {item.qty}</span>
                            <span className="font-bold">{formatRupees(item.pricePaise * item.qty)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-[#E9E9EB] flex justify-end gap-3">
                        <button
                          onClick={() => acceptOrderMutation.mutate(order.id)}
                          disabled={acceptOrderMutation.isPending}
                          className="btn-primary text-xs font-bold"
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
                  <div className="bg-white border border-[#E9E9EB] rounded-lg p-10 text-center text-[#686B78]">
                    <p className="text-2xl mb-1">🍽️</p>
                    <p className="text-sm font-bold text-[#282C3F]">Kitchen queue is clear</p>
                    <p className="text-xs text-[#686B78] mt-1">All orders are currently dispatched or delivered.</p>
                  </div>
                )}

                {(activeOrders.length > 0 ? activeOrders : orderList).map((order) => (
                  <div key={order.id} className="bg-white border border-[#E9E9EB] rounded-lg p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E9E9EB]">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-[#282C3F]">Ticket #{order.id.slice(0, 8)}</h2>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            order.health?.state === 'failing'
                              ? 'bg-[#FDECEF] text-[#D7263D] border border-[#D7263D]/20'
                              : order.health?.state === 'at_risk'
                              ? 'bg-[#FFF6E5] text-[#C77400] border border-[#C77400]/20'
                              : 'bg-[#EAF7F1] text-[#1BA672] border border-[#1BA672]/20'
                          }`}>
                            {order.health?.state ? order.health.state.replace('_', ' ') : 'On Track'}
                          </span>
                        </div>
                        <p className="text-xs text-[#686B78] mt-0.5">Assigned Rider: Ramesh Kumar · Customer: Arjun Mehta</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => markReadyMutation.mutate(order.id)}
                          disabled={markReadyMutation.isPending}
                          className="btn-primary !bg-[#1BA672] hover:!bg-[#158057] text-xs font-bold"
                        >
                          ✓ Mark Food Ready for Pickup
                        </button>
                      </div>
                    </div>

                    {/* Order items */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#F7F7F9] p-3 rounded-lg border border-[#E9E9EB]">
                      {order.items?.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between text-xs py-1 px-2">
                          <span className="text-[#282C3F] font-medium">● {item.name} × {item.qty}</span>
                          <span className="text-[#686B78] font-bold">{formatRupees(item.pricePaise * item.qty)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Risk warning & Packing adjustment */}
                    {(order.health?.state === 'at_risk' || order.health?.state === 'failing') && (
                      <div className="p-3 rounded-lg bg-[#FFF6E5] border border-[#C77400]/30 text-[#C77400] text-xs flex items-center justify-between font-medium">
                        <span>⚠️ Telemetry indicates prep overrun. Extend packing ETA to notify rider and prevent Rescue cancellation:</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-[#686B78] mr-2 font-medium">Extend Packing Time:</span>
                      {[10, 15, 20, 25].map((min) => (
                        <button
                          key={min}
                          id={`confirm-packing-${order.id}-${min}`}
                          onClick={() => confirmPackingMutation.mutate({ orderId: order.id, minutes: min })}
                          disabled={confirmPackingMutation.isPending}
                          className="px-3 py-1.5 rounded-lg border border-[#E9E9EB] bg-white hover:bg-[#FFF3E8] hover:border-[#FC8019] text-xs font-bold text-[#282C3F] transition-colors"
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
                <div className="bg-white border border-[#E9E9EB] rounded-lg p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-[#282C3F] mb-1">Rider Dispatch Bay</h3>
                  <p className="text-xs text-[#686B78] mb-4">
                    Orders bagged and waiting for rider pickup at the counter.
                  </p>
                  <div className="p-4 rounded-lg border border-[#1BA672]/30 bg-[#EAF7F1] flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#282C3F]">Order #order-demo-live (Bag #4)</p>
                      <p className="text-xs text-[#1BA672] font-semibold">Rider arrived at outlet · Ready for handoff</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#282C3F] bg-white px-2 py-1 rounded border border-[#E9E9EB]">
                      OTP: 4892
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* PERFORMANCE TAB */}
            {activeTab === 'performance' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-[#E9E9EB] rounded-lg p-5 shadow-sm">
                  <span className="text-[11px] text-[#686B78] uppercase tracking-wider font-bold">Kitchen SLA Compliance</span>
                  <p className="text-2xl font-bold text-[#1BA672] mt-1">98.4%</p>
                  <span className="text-[11px] text-[#686B78] mt-1 block">Target threshold &gt;95%</span>
                </div>
                <div className="bg-white border border-[#E9E9EB] rounded-lg p-5 shadow-sm">
                  <span className="text-[11px] text-[#686B78] uppercase tracking-wider font-bold">Avg Prep Time</span>
                  <p className="text-2xl font-bold text-[#282C3F] mt-1">13.8 mins</p>
                  <span className="text-[11px] text-[#1BA672] mt-1 block font-semibold">1.2 mins faster than zone avg</span>
                </div>
                <div className="bg-white border border-[#E9E9EB] rounded-lg p-5 shadow-sm">
                  <span className="text-[11px] text-[#686B78] uppercase tracking-wider font-bold">Rescue Trigger Rate</span>
                  <p className="text-2xl font-bold text-[#282C3F] mt-1">0.8%</p>
                  <span className="text-[11px] text-[#686B78] mt-1 block">Low kitchen fault attribution</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function RestaurantPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[#686B78]">Loading kitchen console…</div>}>
      <RestaurantContent />
    </Suspense>
  );
}
