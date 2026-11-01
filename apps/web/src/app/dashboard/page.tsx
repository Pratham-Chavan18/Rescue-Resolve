'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  Clock,
  ArrowRight,
  ShieldAlert,
  Scale,
  ShoppingBag,
  Wallet,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { useAuthStore } from '@/store/auth';
import { ordersApi } from '@/lib/api-client';
import { formatRupees, formatEta } from '@/lib/format';

export default function CustomerDashboardPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  useEffect(() => {
    if (!token) {
      router.push('/');
    } else if (user?.role && user.role !== 'customer') {
      if (user.role === 'restaurant') router.push('/partner/restaurant');
      else if (user.role === 'rider') router.push('/partner/rider');
      else if (user.role === 'agent') router.push('/agent');
    }
  }, [token, user, router]);

  // Fetch active order
  const { data: activeOrder } = useQuery({
    queryKey: ['my-order'],
    queryFn: () => ordersApi.getMyOrder(token!),
    enabled: !!token,
    refetchInterval: 10000,
  });

  // Fetch recent completed orders
  const { data: completedOrders = [] } = useQuery({
    queryKey: ['completed-orders'],
    queryFn: () => ordersApi.getCompletedOrders(token!),
    enabled: !!token,
  });

  // Fetch customer recovery history
  const { data: recoveryHistory = [] } = useQuery({
    queryKey: ['recovery-history'],
    queryFn: () => ordersApi.getCustomerRecoveryHistory(token!),
    enabled: !!token,
  });

  if (!token || user?.role !== 'customer') {
    return null;
  }

  const currentHealth = activeOrder?.health?.state ?? 'on_track';
  const totalRecoveryPaise = recoveryHistory.reduce((sum: number, entry: any) => sum + (entry.amountPaise ?? 0), 0);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* ── Greeting & Swiggy Wallet Hero ──────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-lg bg-white border border-[#E9E9EB] shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-[#282C3F]">Hi, {user.name} 👋</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#FFF3E8] text-[#FC8019] border border-[#FC8019]/20">
                Protected by Unified Recovery
              </span>
            </div>
            <p className="text-xs text-[#686B78]">
              Real-time monitoring active. Proactive delay rescue + instant mathematical dispute settlements.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-3 rounded-lg bg-[#F7F7F9] border border-[#E9E9EB] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#EAF7F1] text-[#1BA672] flex items-center justify-center">
                <Wallet size={18} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-[#686B78] tracking-wider">Swiggy Wallet</p>
                <p className="text-base font-bold text-[#282C3F]">
                  {formatRupees(totalRecoveryPaise > 0 ? totalRecoveryPaise : 200500)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Active Order Card ───────────────────────────────────────────── */}
        {activeOrder ? (
          <div className="p-6 rounded-lg bg-white border-2 border-[#FC8019]/40 shadow-sm relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-[#FFF3E8] text-[#FC8019] border border-[#FC8019]/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FC8019] animate-ping" />
                    Live Active Order
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                      currentHealth === 'on_track'
                        ? 'bg-[#EAF7F1] text-[#1BA672] border border-[#1BA672]/30'
                        : currentHealth === 'at_risk'
                        ? 'bg-[#FFF6E5] text-[#C77400] border border-[#C77400]/30'
                        : 'bg-[#FDECEF] text-[#D7263D] border border-[#D7263D]/30'
                    }`}
                  >
                    {currentHealth === 'on_track' ? '✓ On Track' : currentHealth === 'at_risk' ? '⚠️ Running Late' : '🚨 Major Delay'}
                  </span>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-[#282C3F]">
                    {activeOrder.restaurant?.name ?? 'Spice Garden'} · {activeOrder.items?.length ?? 4} items
                  </h2>
                  <p className="text-xs text-[#686B78] mt-0.5">
                    {activeOrder.items?.map((i: any) => `${i.name} (x${i.qty})`).join(', ')}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-[#686B78] pt-1">
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-[#FC8019]" />
                    <span>Estimated Arrival: <strong className="text-[#282C3F]">{activeOrder.health?.etaAt ? formatEta(activeOrder.health.etaAt) : 'In 25-30 min'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-[#686B78]" />
                    <span>Delivering to: <strong className="text-[#282C3F]">{activeOrder.address}</strong></span>
                  </div>
                  <div>
                    <span>Total: <strong className="text-[#282C3F]">{formatRupees(activeOrder.totalPaise)}</strong></span>
                  </div>
                </div>

                {/* Proactive Rescue Notice if delayed */}
                {currentHealth !== 'on_track' && (
                  <div className="p-3 rounded-lg bg-[#FFF3E8] border border-[#FC8019]/30 text-xs text-[#282C3F] flex items-center justify-between">
                    <span className="font-semibold text-[#FC8019]">⚠️ Proactive Delay Detected: Eligible for instant compensation voucher or alternative kitchen.</span>
                    <Link
                      href="/track"
                      className="px-3 py-1 bg-[#FC8019] text-white font-bold rounded text-xs hover:bg-[#E06000] transition-colors whitespace-nowrap ml-3"
                    >
                      Choose Action
                    </Link>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex lg:flex-col gap-2 flex-shrink-0">
                <Link
                  id="dashboard-track-btn"
                  href="/track"
                  className="btn-primary !py-2.5 !px-5 text-xs font-bold flex items-center justify-center gap-2"
                >
                  <MapPin size={16} />
                  <span>Track Live Order</span>
                </Link>
                <Link
                  href="/orders"
                  className="btn-secondary !py-2.5 !px-5 text-xs font-bold flex items-center justify-center gap-2"
                >
                  <span>Order Details</span>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-lg bg-white border border-[#E9E9EB] flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#F7F7F9] flex items-center justify-center text-xl">🛵</div>
              <div>
                <p className="font-bold text-[#282C3F] text-sm">No Active In-Flight Order</p>
                <p className="text-[#686B78]">You can use the Demo Simulator in the top navigation to trigger simulated recovery signals.</p>
              </div>
            </div>
            <Link href="/orders" className="text-xs font-bold text-[#FC8019] hover:underline">
              View Order History →
            </Link>
          </div>
        )}

        {/* ── Two Feature Hub Cards ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Swiggy Rescue Hub Card */}
          <div className="p-6 rounded-lg bg-white border border-[#E9E9EB] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#FFF3E8] text-[#FC8019] flex items-center justify-center">
                  <ShieldAlert size={22} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FFF3E8] text-[#FC8019] border border-[#FC8019]/20">
                  Pre-Delivery In-Flight
                </span>
              </div>
              <h3 className="text-base font-bold text-[#282C3F] mb-1">Swiggy Rescue</h3>
              <p className="text-xs text-[#686B78] mb-4 leading-relaxed">
                Proactive order recovery system. If your delivery partner is stationary for &gt;6 mins, kitchen is delayed &gt;8 mins, or ETA slips &gt;15 mins, Rescue steps in with 3 explicit choices:
              </p>
              <ul className="text-xs space-y-2 text-[#282C3F] mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-[#FC8019] font-bold">1.</span>
                  <span><strong>Wait with Credit:</strong> Immediate ₹50–₹100 wallet credit added instantly.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#FC8019] font-bold">2.</span>
                  <span><strong>Replace Order:</strong> Instant re-order from equivalent nearby kitchen.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#FC8019] font-bold">3.</span>
                  <span><strong>Cancel &amp; Refund:</strong> 100% full source refund without questions.</span>
                </li>
              </ul>
            </div>
            <Link
              id="dashboard-rescue-hub-btn"
              href="/rescue"
              className="btn-secondary !py-2.5 w-full text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <span>Explore Swiggy Rescue Hub</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Swiggy Resolve Hub Card */}
          <div className="p-6 rounded-lg bg-white border border-[#E9E9EB] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#EAF7F1] text-[#1BA672] flex items-center justify-center">
                  <Scale size={22} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EAF7F1] text-[#1BA672] border border-[#1BA672]/20">
                  Post-Delivery Settlement
                </span>
              </div>
              <h3 className="text-base font-bold text-[#282C3F] mb-1">Swiggy Resolve</h3>
              <p className="text-xs text-[#686B78] mb-4 leading-relaxed">
                Transparent issue resolution backed by the automated Fairness Engine. File complaints with photo evidence and receive instant entitlement previews:
              </p>
              <ul className="text-xs space-y-2 text-[#282C3F] mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-[#1BA672] font-bold">✓</span>
                  <span><strong>Wrong Item:</strong> Full item refund + proportional delivery fee credit.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#1BA672] font-bold">✓</span>
                  <span><strong>Missing Item:</strong> Immediate item refund + 50% delivery fee credit.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#1BA672] font-bold">✓</span>
                  <span><strong>Late Delivery:</strong> Transparent tiered ₹50/₹75/₹100 credit.</span>
                </li>
              </ul>
            </div>
            <Link
              id="dashboard-resolve-hub-btn"
              href="/resolve"
              className="btn-secondary !py-2.5 w-full text-xs font-bold text-[#1BA672] hover:text-[#1BA672] flex items-center justify-center gap-1.5"
            >
              <span>File Dispute in Swiggy Resolve</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* ── Recent Completed Orders ─────────────────────────────────────── */}
        <div className="p-6 rounded-lg bg-white border border-[#E9E9EB] shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-[#282C3F]">Recent Orders</h3>
              <p className="text-xs text-[#686B78]">Eligible for Resolve post-delivery claims up to 24 hours after delivery</p>
            </div>
            <Link href="/orders" className="text-xs font-bold text-[#FC8019] hover:underline flex items-center gap-1">
              <span>View All ({completedOrders.length})</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          {completedOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#686B78]">
              No previous orders found.
            </div>
          ) : (
            <div className="divide-y divide-[#E9E9EB]">
              {completedOrders.slice(0, 3).map((order: any) => (
                <div key={order.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#282C3F]">{order.restaurant?.name ?? 'Restaurant'}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#EAF7F1] text-[#1BA672]">
                        {order.status}
                      </span>
                    </div>
                    <p className="text-[#686B78]">
                      {order.items?.map((i: any) => `${i.name} (x${i.qty})`).join(', ')} · <strong className="text-[#282C3F]">{formatRupees(order.totalPaise)}</strong>
                    </p>
                    <p className="text-[11px] text-[#686B78]">
                      Delivered {order.deliveredAt ? new Date(order.deliveredAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'recently'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/resolve?orderId=${order.id}`}
                      className="px-3.5 py-1.5 rounded-lg border border-[#E9E9EB] hover:border-[#FC8019] font-semibold text-xs text-[#282C3F] hover:text-[#FC8019] transition-colors"
                    >
                      Report Issue
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
