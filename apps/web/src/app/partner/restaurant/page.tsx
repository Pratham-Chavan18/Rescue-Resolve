'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { partnersApi } from '@/lib/api-client';
import { formatRupees, formatEta } from '@/lib/format';
import { useGlobalSocket } from '@/lib/socket';
import type { ServerEvent } from '@swiggy/types';
import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const HEALTH_PILL: Record<string, string> = {
  on_track: 'pill-on-track',
  at_risk: 'pill-at-risk',
  failing: 'pill-failing',
};

export default function RestaurantPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const qc = useQueryClient();

  useEffect(() => {
    if (!token || user?.role !== 'restaurant') {
      router.push('/');
    }
  }, [token, user, router]);

  useGlobalSocket(token, useCallback((event: ServerEvent) => {
    if (event.t === 'partner.risk') qc.invalidateQueries({ queryKey: ['restaurant-orders'] });
  }, [qc]));

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['restaurant-orders'],
    queryFn: () => partnersApi.getRestaurantOrders(token!),
    refetchInterval: 20000,
    enabled: !!token,
  });

  const confirmMutation = useMutation({
    mutationFn: ({ orderId, minutes }: { orderId: string; minutes: number }) =>
      partnersApi.confirmPacking(orderId, minutes, token!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant-orders'] }),
  });

  if (!token || user?.role !== 'restaurant') return null;

  return (
    <div className="min-h-screen pb-8" style={{ background: 'var(--bg)' }}>
      <div className="card rounded-none px-4 py-4 border-b" style={{ borderColor: 'var(--line)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-title">🍳 Restaurant Dashboard</h1>
            <p className="text-meta">{user?.name}</p>
          </div>
          <button id="restaurant-logout-btn" onClick={() => { useAuthStore.getState().clearAuth(); router.push('/'); }} className="btn-ghost" style={{ width: 'auto' }}>
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <h2 className="text-title">Active orders</h2>
        {isLoading && <p className="text-body" style={{ color: 'var(--ink-2)' }}>Loading…</p>}
        {!isLoading && (orders as any[]).length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-3xl mb-2">✅</p>
            <p className="text-title">All clear</p>
            <p className="text-body" style={{ color: 'var(--ink-2)' }}>No active orders</p>
          </div>
        )}

        {(orders as any[]).map((order: any) => (
          <div key={order.id} className="card p-5 step-enter">
            <div className="flex items-center justify-between mb-3">
              <p className="text-body font-semibold">Order {order.id.slice(0, 8)}…</p>
              {order.health?.state && (
                <span className={`text-meta uppercase tracking-widest px-3 py-1 rounded-pill font-semibold ${HEALTH_PILL[order.health.state] ?? 'pill-on-track'}`}>
                  {order.health.state.replace('_', ' ')}
                </span>
              )}
            </div>

            <div className="space-y-1 mb-4">
              {order.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between text-body">
                  <span>{item.name} × {item.qty}</span>
                  <span className="amount">{formatRupees(item.pricePaise * item.qty)}</span>
                </div>
              ))}
            </div>

            {order.health?.state === 'at_risk' || order.health?.state === 'failing' ? (
              <div className="rounded-xl p-3 mb-3" style={{ background: 'var(--warn-soft)', border: '1px solid var(--warn)' }}>
                <p className="text-body font-semibold" style={{ color: 'var(--warn)' }}>⚠ This order has a delay risk</p>
                <p className="text-meta">Confirm your packing time to update the customer&apos;s ETA</p>
              </div>
            ) : null}

            <div className="flex gap-2">
              {[15, 20, 25].map((min) => (
                <button
                  key={min}
                  id={`confirm-packing-${order.id}-${min}`}
                  onClick={() => confirmMutation.mutate({ orderId: order.id, minutes: min })}
                  disabled={confirmMutation.isPending}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '10px 8px', fontSize: '14px' }}
                >
                  {min} min
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
