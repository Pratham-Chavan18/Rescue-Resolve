'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag,
  Clock,
  MapPin,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
  Filter,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { useAuthStore } from '@/store/auth';
import { ordersApi } from '@/lib/api-client';
import { formatRupees } from '@/lib/format';

type Tab = 'all' | 'active' | 'completed' | 'cancelled';

export default function MyOrdersPage() {
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: ['my-all-orders'],
    queryFn: () => ordersApi.getAllOrders(token!),
    enabled: !!token,
  });

  const filteredOrders = allOrders.filter((order: any) => {
    // Tab filter
    const isActive = ['placed', 'accepted', 'packed', 'rider_assigned', 'picked_up', 'near_you'].includes(order.status);
    const isCompleted = order.status === 'delivered';
    const isCancelled = ['cancelled', 'failed'].includes(order.status);

    if (activeTab === 'active' && !isActive) return false;
    if (activeTab === 'completed' && !isCompleted) return false;
    if (activeTab === 'cancelled' && !isCancelled) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = order.restaurant?.name?.toLowerCase().includes(q);
      const matchItem = order.items?.some((i: any) => i.name.toLowerCase().includes(q));
      const matchId = order.id.toLowerCase().includes(q);
      return matchName || matchItem || matchId;
    }
    return true;
  });

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--ink)]">My Orders</h1>
            <p className="text-xs text-[var(--ink-2)] mt-0.5">
              Track live food deliveries, view itemized receipts, and file instant dispute claims.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-2)]" />
            <input
              type="text"
              placeholder="Search dishes, restaurants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs border border-[var(--line)] rounded-xl pl-9 pr-3 py-2 bg-white text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-[var(--line)] gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-[var(--accent)] text-[var(--accent-ink)] font-bold'
                : 'border-transparent text-[var(--ink-2)] hover:text-[var(--ink)]'
            }`}
          >
            All Orders ({allOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'active'
                ? 'border-[var(--accent)] text-[var(--accent-ink)] font-bold'
                : 'border-transparent text-[var(--ink-2)] hover:text-[var(--ink)]'
            }`}
          >
            In-Flight Active ({allOrders.filter((o: any) => ['placed', 'accepted', 'packed', 'rider_assigned', 'picked_up', 'near_you'].includes(o.status)).length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'completed'
                ? 'border-[var(--accent)] text-[var(--accent-ink)] font-bold'
                : 'border-transparent text-[var(--ink-2)] hover:text-[var(--ink)]'
            }`}
          >
            Completed ({allOrders.filter((o: any) => o.status === 'delivered').length})
          </button>
          <button
            onClick={() => setActiveTab('cancelled')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'cancelled'
                ? 'border-[var(--accent)] text-[var(--accent-ink)] font-bold'
                : 'border-transparent text-[var(--ink-2)] hover:text-[var(--ink)]'
            }`}
          >
            Cancelled &amp; Refunded ({allOrders.filter((o: any) => ['cancelled', 'failed'].includes(o.status)).length})
          </button>
        </div>

        {/* Order List */}
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[var(--ink-2)]">Loading orders…</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white border border-[var(--line)] text-center text-xs space-y-2">
            <ShoppingBag size={32} className="mx-auto text-[var(--ink-2)] opacity-50" />
            <p className="font-bold text-[var(--ink)]">No orders match this filter</p>
            <p className="text-[var(--ink-2)]">Check another tab or use the simulator to trigger demo events.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order: any) => {
              const isActive = ['placed', 'accepted', 'packed', 'rider_assigned', 'picked_up', 'near_you'].includes(order.status);
              const isDelivered = order.status === 'delivered';
              const isCancelled = ['cancelled', 'failed'].includes(order.status);

              return (
                <div
                  key={order.id}
                  className="p-5 rounded-2xl bg-white border border-[var(--line)] shadow-sm hover:border-neutral-300 transition-all space-y-4"
                >
                  {/* Order Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--line)] text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 font-bold flex items-center justify-center">
                        🍳
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-[var(--ink)]">{order.restaurant?.name ?? 'Restaurant'}</h3>
                        <p className="text-[11px] text-[var(--ink-2)]">
                          Order ID: <span className="font-mono">{order.id}</span> · {new Date(order.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          isActive
                            ? 'bg-orange-100 text-orange-800 animate-pulse'
                            : isDelivered
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="text-xs space-y-1.5">
                    {order.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center text-[var(--ink-2)]">
                        <span className="flex items-center gap-1.5">
                          <span className={item.isVeg ? 'text-emerald-600' : 'text-rose-600'}>
                            {item.isVeg ? '🟢' : '🔴'}
                          </span>
                          <span className="text-[var(--ink)] font-medium">{item.name}</span>
                          <span className="text-[11px]">× {item.qty}</span>
                        </span>
                        <span className="font-medium text-[var(--ink)]">{formatRupees(item.pricePaise * item.qty)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Pricing and Action Footer */}
                  <div className="pt-3 border-t border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-4 text-[var(--ink-2)]">
                      <span>Total: <strong className="text-sm font-bold text-[var(--ink)]">{formatRupees(order.totalPaise)}</strong></span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <MapPin size={12} />
                        {order.address}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isActive && (
                        <Link
                          href="/track"
                          className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white font-bold text-xs hover:bg-[var(--accent-ink)] transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <MapPin size={14} />
                          <span>Track Live Order</span>
                        </Link>
                      )}

                      {isDelivered && (
                        <Link
                          href={`/resolve?orderId=${order.id}`}
                          className="px-4 py-2 rounded-xl border border-[var(--line)] hover:border-[var(--accent)] font-bold text-xs text-[var(--ink)] hover:text-[var(--accent)] transition-colors"
                        >
                          Report Issue / Claim
                        </Link>
                      )}

                      <Link
                        href={`/track?orderId=${order.id}`}
                        className="px-3 py-2 rounded-xl border border-[var(--line)] hover:bg-[var(--surface-sunk)] text-xs text-[var(--ink-2)] font-medium"
                      >
                        Timeline
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
