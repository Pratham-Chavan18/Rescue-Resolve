'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag,
  MapPin,
  Search,
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
    <AppShell
      breadcrumbs={[
        { label: 'Customer' },
        { label: 'My Orders' },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#282C3F]">My Orders</h1>
            <p className="text-xs text-[#686B78] mt-0.5">
              Track live food deliveries, view itemized receipts, and file instant dispute claims.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#686B78]" />
            <input
              type="text"
              placeholder="Search dishes, restaurants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs border border-[#E9E9EB] rounded-lg pl-9 pr-3 py-2 bg-white text-[#282C3F] focus:outline-none focus:border-[#FC8019]"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-[#E9E9EB] gap-6 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'all'
                ? 'border-[#FC8019] text-[#FC8019] font-bold'
                : 'border-transparent text-[#686B78] hover:text-[#282C3F]'
            }`}
          >
            All Orders ({allOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'active'
                ? 'border-[#FC8019] text-[#FC8019] font-bold'
                : 'border-transparent text-[#686B78] hover:text-[#282C3F]'
            }`}
          >
            In-Flight Active ({allOrders.filter((o: any) => ['placed', 'accepted', 'packed', 'rider_assigned', 'picked_up', 'near_you'].includes(o.status)).length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'completed'
                ? 'border-[#FC8019] text-[#FC8019] font-bold'
                : 'border-transparent text-[#686B78] hover:text-[#282C3F]'
            }`}
          >
            Completed ({allOrders.filter((o: any) => o.status === 'delivered').length})
          </button>
          <button
            onClick={() => setActiveTab('cancelled')}
            className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'cancelled'
                ? 'border-[#FC8019] text-[#FC8019] font-bold'
                : 'border-transparent text-[#686B78] hover:text-[#282C3F]'
            }`}
          >
            Cancelled &amp; Refunded ({allOrders.filter((o: any) => ['cancelled', 'failed'].includes(o.status)).length})
          </button>
        </div>

        {/* Order List */}
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#686B78]">Loading orders…</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 rounded-lg bg-white border border-[#E9E9EB] text-center text-xs space-y-2">
            <ShoppingBag size={32} className="mx-auto text-[#686B78] opacity-50" />
            <p className="font-bold text-[#282C3F]">No orders match this filter</p>
            <p className="text-[#686B78]">Check another tab or use the simulator to trigger demo events.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order: any) => {
              const isActive = ['placed', 'accepted', 'packed', 'rider_assigned', 'picked_up', 'near_you'].includes(order.status);
              const isDelivered = order.status === 'delivered';

              return (
                <div
                  key={order.id}
                  className="p-5 rounded-lg bg-white border border-[#E9E9EB] shadow-sm hover:border-[#FC8019]/40 transition-colors space-y-4"
                >
                  {/* Order Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E9E9EB] text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#FFF3E8] text-[#FC8019] font-bold flex items-center justify-center text-xs">
                        🍳
                      </div>
                      <div>
                        <h2 className="font-bold text-sm text-[#282C3F]">{order.restaurant?.name ?? 'Restaurant'}</h2>
                        <p className="text-[11px] text-[#686B78]">
                          Order ID: <span className="font-mono">{order.id}</span> · {new Date(order.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isActive
                            ? 'bg-[#FFF3E8] text-[#FC8019] border border-[#FC8019]/20'
                            : isDelivered
                            ? 'bg-[#EAF7F1] text-[#1BA672] border border-[#1BA672]/20'
                            : 'bg-[#F7F7F9] text-[#686B78] border border-[#E9E9EB]'
                        }`}
                      >
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="text-xs space-y-1.5">
                    {order.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center text-[#686B78]">
                        <span className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-sm border flex items-center justify-center text-[7px] font-bold ${
                            item.isVeg ? 'border-[#1BA672] text-[#1BA672]' : 'border-[#D7263D] text-[#D7263D]'
                          }`}>
                            ●
                          </span>
                          <span className="text-[#282C3F] font-semibold">{item.name}</span>
                          <span className="text-[11px]">× {item.qty}</span>
                        </span>
                        <span className="font-bold text-[#282C3F]">{formatRupees(item.pricePaise * item.qty)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Pricing and Action Footer */}
                  <div className="pt-3 border-t border-[#E9E9EB] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 text-[#686B78]">
                      <span>Total: <strong className="text-sm font-bold text-[#282C3F]">{formatRupees(order.totalPaise)}</strong></span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <MapPin size={12} className="text-[#FC8019]" />
                        {order.address}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isActive && (
                        <Link
                          href="/track"
                          className="btn-primary !py-2 !px-3.5 text-xs font-bold flex items-center gap-1.5"
                        >
                          <MapPin size={14} />
                          <span>Track Live Order</span>
                        </Link>
                      )}

                      {isDelivered && (
                        <Link
                          href={`/resolve?orderId=${order.id}`}
                          className="btn-secondary !py-2 !px-3.5 text-xs font-bold text-[#FC8019] border-[#FC8019]/40 hover:bg-[#FFF3E8]"
                        >
                          Report Issue / Claim
                        </Link>
                      )}

                      <Link
                        href={`/track?orderId=${order.id}`}
                        className="btn-ghost !py-2 !px-3 text-xs"
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
