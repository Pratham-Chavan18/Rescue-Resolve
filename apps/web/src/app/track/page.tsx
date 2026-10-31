'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { useOrderSocket } from '@/lib/socket';
import { ordersApi, rescueApi, simApi } from '@/lib/api-client';
import { formatRupees, formatEta, formatPriceDiff } from '@/lib/format';
import type { ServerEvent, HealthState, RescueOption } from '@swiggy/types';
import { useRouter } from 'next/navigation';

const HEALTH_LABELS: Record<HealthState, string> = {
  on_track: 'On track',
  at_risk: 'Running late',
  failing: 'Major delay',
  recovered: 'Recovered',
  failed: 'Failed',
};

const HEALTH_PILL_CLASS: Record<HealthState, string> = {
  on_track: 'pill-on-track',
  at_risk: 'pill-at-risk',
  failing: 'pill-failing',
  recovered: 'pill-recovered',
  failed: 'pill-failed',
};

const FAULT_OPTIONS = [
  { kind: 'rider_stuck', label: '🛵 Rider stuck (6 min)' },
  { kind: 'restaurant_slow', label: '🍳 Restaurant slow (pack delay)' },
  { kind: 'eta_slip', label: '⏱ ETA slip (22 min)' },
  { kind: 'delivered_unconfirmed', label: '📦 Delivered unconfirmed' },
];

export default function TrackPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const qc = useQueryClient();

  const [healthState, setHealthState] = useState<HealthState | null>(null);
  const [etaAt, setEtaAt] = useState<string | null>(null);
  const [rescueCase, setRescueCase] = useState<{ caseId: string; options: RescueOption[] } | null>(null);
  const [choiceMade, setChoiceMade] = useState(false);
  const [simLoading, setSimLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const { data: order, isLoading } = useQuery<any>({
    queryKey: ['my-order'],
    queryFn: () => ordersApi.getMyOrder(token!),
    enabled: !!token,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (order?.health?.state && !healthState) setHealthState(order.health.state);
    if (order?.health?.etaAt && !etaAt) setEtaAt(order.health.etaAt);
  }, [order, healthState, etaAt]);

  // Socket subscription
  useOrderSocket(
    order?.id ?? null,
    token,
    useCallback((event: ServerEvent) => {
      if (event.t === 'health.changed') {
        setHealthState(event.state);
        setEtaAt(event.etaAt);
        qc.invalidateQueries({ queryKey: ['my-order'] });
      }
      if (event.t === 'rescue.offered') {
        setRescueCase({ caseId: event.caseId, options: event.options });
        setChoiceMade(false);
      }
      if (event.t === 'rescue.updated') {
        setNotification('Your choice has been recorded.');
        setChoiceMade(true);
      }
      if (event.t === 'case.updated') {
        setNotification(`Your complaint has been ${event.status}.`);
      }
    }, [qc]),
  );

  async function handleChoice(option: RescueOption) {
    if (!rescueCase || !token) return;
    await rescueApi.recordChoice(
      rescueCase.caseId,
      option.kind,
      option.replacementRestaurantId,
      token,
    );
    setChoiceMade(true);
    setNotification(
      option.kind === 'wait'
        ? `${formatRupees(option.creditAmount ?? 0)} wallet credit on its way!`
        : option.kind === 'cancel'
        ? `Full refund of ${formatRupees(option.refundAmount ?? 0)} initiated.`
        : 'Replacement restaurant confirmed!',
    );
  }

  async function injectFault(kind: string) {
    if (!order?.id || !token) return;
    setSimLoading(kind);
    try {
      await simApi.injectFault(order.id, kind, token);
    } finally {
      setSimLoading(null);
    }
  }

  async function resetSim() {
    if (!token) return;
    setSimLoading('reset');
    try {
      await simApi.reset(token);
      setRescueCase(null);
      setChoiceMade(false);
      setHealthState(null);
      setNotification(null);
      qc.invalidateQueries({ queryKey: ['my-order'] });
    } finally {
      setSimLoading(null);
    }
  }

  useEffect(() => {
    if (!token) {
      router.push('/');
    }
  }, [token, router]);

  if (!token) {
    return null;
  }

  const currentHealth = healthState ?? (order?.health?.state as HealthState) ?? 'on_track';
  const currentEta = etaAt ?? order?.health?.etaAt;

  return (
    <div className="min-h-screen pb-8" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="card rounded-none px-4 py-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--line)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <div>
            <p className="text-body font-semibold" style={{ color: 'var(--ink)' }}>Your order</p>
            {user && <p className="text-meta">Logged in as {user.name}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button id="resolve-nav-btn" onClick={() => router.push('/resolve')} className="btn-ghost" style={{ width: 'auto', fontSize: '13px' }}>
            Report issue
          </button>
          <button id="logout-btn" onClick={() => { useAuthStore.getState().clearAuth(); router.push('/'); }} className="btn-ghost" style={{ width: 'auto' }}>
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Notification banner */}
        {notification && (
          <div className="card p-4 flex items-center justify-between step-enter" style={{ background: 'var(--ok-soft)', border: '1px solid var(--ok)' }}>
            <span style={{ color: 'var(--ok)', fontWeight: 600 }}>{notification}</span>
            <button onClick={() => setNotification(null)} style={{ color: 'var(--ink-2)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
          </div>
        )}

        {isLoading ? (
          <div className="card p-8 text-center">
            <div className="text-display mb-2" style={{ color: 'var(--ink-2)' }}>Loading…</div>
          </div>
        ) : !order ? (
          <div className="card p-8 text-center">
            <p className="text-title mb-1">No active order</p>
            <p className="text-body" style={{ color: 'var(--ink-2)' }}>Use the simulator to start the demo.</p>
          </div>
        ) : (
          <>
            {/* Order health card */}
            <div className="card p-5 step-enter">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-meta uppercase tracking-widest mb-1">From {order.restaurant?.name}</p>
                  <p className="text-title">{order.items?.length ?? 0} items · {formatRupees(order.totalPaise)}</p>
                </div>
                <span className={`text-meta uppercase tracking-widest px-3 py-1 rounded-pill font-semibold ${HEALTH_PILL_CLASS[currentHealth]}`}>
                  {HEALTH_LABELS[currentHealth]}
                </span>
              </div>

              {/* ETA */}
              <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: 'var(--surface-sunk)' }}>
                <span className="text-body" style={{ color: 'var(--ink-2)' }}>Arriving by</span>
                <span className="amount text-title" style={{ color: 'var(--ink)' }}>
                  {currentEta ? formatEta(currentEta) : '—'}
                </span>
              </div>
            </div>

            {/* Order items */}
            <div className="card p-4">
              <p className="text-meta uppercase tracking-widest mb-3">Your order</p>
              <div className="space-y-2">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <span className="text-body flex gap-2 items-center">
                      {item.isVeg && <span className="text-xs border rounded px-1" style={{ color: 'var(--ok)', borderColor: 'var(--ok)' }}>VEG</span>}
                      {item.name} × {item.qty}
                    </span>
                    <span className="amount text-body">{formatRupees(item.pricePaise * item.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 flex justify-between" style={{ borderTop: '1px solid var(--line)' }}>
                <span className="text-body font-semibold">Total</span>
                <span className="amount text-body font-semibold">{formatRupees(order.totalPaise)}</span>
              </div>
            </div>
          </>
        )}

        {/* Rescue bottom sheet */}
        {rescueCase && !choiceMade && (
          <div className="sheet p-5 step-enter" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, maxWidth: '448px', margin: '0 auto' }}>
            <div className="w-10 h-1 rounded-pill mx-auto mb-4" style={{ background: 'var(--line)' }} />
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="text-title">Your order has a delay</p>
                <p className="text-body" style={{ color: 'var(--ink-2)' }}>Here&apos;s what we can do</p>
              </div>
            </div>
            <div className="space-y-3">
              {rescueCase.options.map((option) => (
                <button
                  key={option.kind}
                  id={`rescue-choice-${option.kind}`}
                  onClick={() => handleChoice(option)}
                  className="card p-4 w-full text-left border transition-all duration-150 hover:border-[var(--accent)] hover:shadow-md"
                  style={{ border: '1.5px solid var(--line)', cursor: 'pointer' }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-body font-semibold" style={{ color: 'var(--ink)' }}>
                        {option.kind === 'wait' && '⏳ Wait & get credit'}
                        {option.kind === 'replace' && '🔄 Replace with similar'}
                        {option.kind === 'cancel' && '✕ Cancel & refund'}
                      </p>
                      {option.creditAmount && (
                        <p className="text-body" style={{ color: 'var(--ok)' }}>
                          +{formatRupees(option.creditAmount)} to wallet
                        </p>
                      )}
                      {option.refundAmount && (
                        <p className="text-body" style={{ color: 'var(--bad)' }}>
                          {formatRupees(option.refundAmount)} refund
                        </p>
                      )}
                      {option.newEta && (
                        <p className="text-meta">Arrives by {formatEta(option.newEta)}</p>
                      )}
                      {option.priceDiffPaise !== undefined && (
                        <p className="text-meta">{formatPriceDiff(option.priceDiffPaise)}</p>
                      )}
                    </div>
                    <span style={{ color: 'var(--ink-2)' }}>→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Simulator panel */}
        <div className="card p-4 mt-2" style={{ border: '1.5px dashed var(--line)' }}>
          <p className="text-meta uppercase tracking-widest mb-3">🎮 Simulator</p>
          <div className="space-y-2">
            {FAULT_OPTIONS.map((f) => (
              <button
                key={f.kind}
                id={`sim-fault-${f.kind}`}
                onClick={() => injectFault(f.kind)}
                disabled={!!simLoading}
                className="btn-secondary"
                style={{ fontSize: '14px', padding: '10px 16px' }}
              >
                {simLoading === f.kind ? '…' : f.label}
              </button>
            ))}
            <button
              id="sim-reset-btn"
              onClick={resetSim}
              disabled={!!simLoading}
              className="btn-ghost w-full"
            >
              {simLoading === 'reset' ? 'Resetting…' : '↺ Reset demo order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
