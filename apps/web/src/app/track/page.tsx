'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { useOrderSocket } from '@/lib/socket';
import { ordersApi, rescueApi, simApi } from '@/lib/api-client';
import { formatRupees, formatEta, formatPriceDiff } from '@/lib/format';
import type { ServerEvent, HealthState, RescueOption } from '@swiggy/types';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import Link from 'next/link';

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
  { kind: 'rider_stuck', label: '🛵 Rider stuck (>6 min)', desc: 'Simulates rider stopped at traffic/breakdown' },
  { kind: 'restaurant_slow', label: '🍳 Kitchen slow (>8 min)', desc: 'Simulates prep overrun at restaurant' },
  { kind: 'eta_slip', label: '⏱ ETA slip (+22 min)', desc: 'Simulates severe traffic delay recalculation' },
  { kind: 'delivered_unconfirmed', label: '📦 Delivered unconfirmed', desc: 'Simulates drop-off without customer pin' },
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
    refetchInterval: 15000,
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
        setNotification('Your rescue option choice has been recorded and processed.');
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
        ? `Full refund of ${formatRupees(option.refundAmount ?? 0)} initiated to original source.`
        : 'Replacement restaurant order placed and priority-routed!',
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

  // Determine active stepper step index
  const statusSteps = [
    { key: 'placed', label: 'Order Placed', time: '12:40 PM', done: true },
    { key: 'confirmed', label: 'Kitchen Preparing', time: '12:42 PM', done: true },
    { key: 'picked_up', label: 'Rider Picked Up', time: '12:55 PM', done: order?.status !== 'placed' },
    { key: 'on_the_way', label: 'Out for Delivery', time: '01:02 PM', done: currentHealth !== 'failing' },
    { key: 'delivered', label: 'Delivered', time: 'Expected ~1:15 PM', done: false },
  ];

  return (
    <AppShell
      breadcrumbs={[
        { label: 'Customer' },
        { label: 'Track Live Order' },
      ]}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Banner Alert if any */}
        {notification && (
          <div className="p-4 rounded-xl flex items-center justify-between step-enter shadow-sm border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <div className="flex items-center gap-3">
              <span className="text-xl">✨</span>
              <span className="font-semibold text-sm">{notification}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-white/60 hover:text-white text-lg px-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Top Header Card */}
        <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase tracking-wider">
                Live Tracking
              </span>
              <span className="text-xs text-white/40">ID: {order?.id || 'order-demo-live'}</span>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              Your order
              <span className={`text-xs uppercase tracking-wider px-3 py-1 rounded-full font-semibold ${HEALTH_PILL_CLASS[currentHealth]}`}>
                {HEALTH_LABELS[currentHealth]}
              </span>
            </h1>
            <p className="text-sm text-white/60 mt-1">
              From <strong className="text-white">{order?.restaurant?.name || 'Meghana Foods (Indiranagar)'}</strong> · Contact: +91 98450 11223
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              id="resolve-nav-btn"
              onClick={() => router.push('/resolve')}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-white/10 bg-white/5 hover:bg-white/10 text-white transition flex items-center gap-2"
            >
              <span>🚨</span> Report issue
            </button>
            <Link
              href="/rescue"
              className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/30 transition flex items-center gap-2"
            >
              <span>🛡️</span> Rescue Center
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-[#18181b] border border-white/10 rounded-2xl p-12 text-center text-white/50 animate-pulse">
            Loading live order telemetry & rider route…
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Stepper, Map & Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stepper Card */}
              <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                  <div>
                    <span className="text-xs text-white/40 uppercase tracking-wider">Estimated Delivery</span>
                    <p className="text-2xl font-bold text-white tracking-tight">
                      {currentEta ? formatEta(currentEta) : 'Approx 22 mins'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-white/40 uppercase tracking-wider">Telemetry State</span>
                    <p className={`text-sm font-semibold capitalize ${currentHealth === 'on_track' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {currentHealth.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                {/* Horizontal Stepper */}
                <div className="grid grid-cols-5 gap-2 relative">
                  {statusSteps.map((step, idx) => (
                    <div key={step.key} className="flex flex-col items-center text-center">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                          step.done
                            ? 'bg-orange-600 text-white ring-4 ring-orange-500/20'
                            : 'bg-white/5 text-white/40 border border-white/10'
                        }`}
                      >
                        {step.done ? '✓' : idx + 1}
                      </div>
                      <span className={`text-xs font-medium mt-2 leading-tight ${step.done ? 'text-white' : 'text-white/40'}`}>
                        {step.label}
                      </span>
                      <span className="text-[10px] text-white/30 mt-0.5">{step.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Simulated Map Visualizer */}
              <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-white/80">Live Delivery Radar</span>
                  </div>
                  <span className="text-xs font-mono text-white/40">GPS: 12.9716° N, 77.5946° E</span>
                </div>

                {/* Map Visual Canvas Mockup */}
                <div className="h-64 rounded-xl bg-gradient-to-br from-[#121214] via-[#1a1a1e] to-[#121214] border border-white/5 p-4 relative flex flex-col justify-between">
                  {/* Grid Lines Overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

                  {/* Route Polyline Simulation */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M 60 180 Q 200 90 400 130 T 650 80"
                      fill="none"
                      stroke="rgba(249, 115, 22, 0.4)"
                      strokeWidth="4"
                      strokeDasharray="6 6"
                      className="animate-pulse"
                    />
                  </svg>

                  {/* Top Restaurant Pin */}
                  <div className="relative z-10 self-start bg-black/80 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 flex items-center gap-2 shadow-lg">
                    <span className="text-base">🍳</span>
                    <div>
                      <p className="text-xs font-bold text-white">{order?.restaurant?.name || 'Meghana Foods'}</p>
                      <p className="text-[10px] text-emerald-400">Order Dispatched</p>
                    </div>
                  </div>

                  {/* Center Rider Pin */}
                  <div className="relative z-10 self-center bg-orange-600/90 text-white backdrop-blur-md px-3.5 py-2 rounded-xl border border-orange-400/30 flex items-center gap-2 shadow-xl animate-bounce">
                    <span className="text-lg">🛵</span>
                    <div>
                      <p className="text-xs font-bold leading-none">Ramesh Kumar</p>
                      <p className="text-[10px] text-orange-200 mt-0.5">2.1 km away · 32 km/h</p>
                    </div>
                  </div>

                  {/* Destination Pin */}
                  <div className="relative z-10 self-end bg-black/80 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 flex items-center gap-2 shadow-lg">
                    <span className="text-base">📍</span>
                    <div>
                      <p className="text-xs font-bold text-white">Your Delivery Address</p>
                      <p className="text-[10px] text-white/50">Flat 402, Green Glen Layout</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                    <span className="text-[11px] text-white/40 uppercase">Distance Left</span>
                    <p className="text-sm font-semibold text-white mt-0.5">2.1 km</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                    <span className="text-[11px] text-white/40 uppercase">Rider Contact</span>
                    <p className="text-sm font-semibold text-orange-400 mt-0.5">+91 91234 56789</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                    <span className="text-[11px] text-white/40 uppercase">Signal Health</span>
                    <p className="text-sm font-semibold text-emerald-400 mt-0.5">Online (99.8%)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Order Items & Proactive Rescue / Sim */}
            <div className="space-y-6">
              {/* Order Items Card */}
              <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70">Order Summary</h3>
                  <span className="text-xs text-white/40">{order?.items?.length || 2} items</span>
                </div>

                <div className="space-y-3">
                  {order?.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center py-1">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center text-[8px] font-bold ${
                          item.isVeg ? 'border-emerald-500 text-emerald-500' : 'border-rose-500 text-rose-500'
                        }`}>
                          ●
                        </span>
                        <div>
                          <p className="text-sm font-medium text-white">{item.name}</p>
                          <p className="text-xs text-white/40">Qty: {item.qty}</p>
                        </div>
                      </div>
                      <span className="text-sm font-mono text-white/90">
                        {formatRupees(item.pricePaise * item.qty)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                  <div className="flex justify-between text-xs text-white/60">
                    <span>Item Total</span>
                    <span className="font-mono">{formatRupees((order?.totalPaise || 48000) - 4900)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-white/60">
                    <span>Delivery & Packaging</span>
                    <span className="font-mono">{formatRupees(4900)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-white/10">
                    <span>Paid via UPI</span>
                    <span className="font-mono text-emerald-400">{formatRupees(order?.totalPaise || 48000)}</span>
                  </div>
                </div>
              </div>

              {/* Rescue Offered Card (If triggered) */}
              {rescueCase && !choiceMade && (
                <div className="bg-gradient-to-b from-orange-950/40 via-[#1e1411] to-[#18181b] border-2 border-orange-500/50 rounded-2xl p-6 shadow-2xl step-enter">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h3 className="text-base font-bold text-white">Swiggy Rescue Active</h3>
                      <p className="text-xs text-orange-200/80">Automated SLA compensation options</p>
                    </div>
                  </div>

                  <p className="text-xs text-white/70 mb-4 leading-relaxed">
                    Our sensors detected an abnormal delay exceeding our delivery guarantee. Choose your preferred recovery:
                  </p>

                  <div className="space-y-3">
                    {rescueCase.options.map((option) => (
                      <button
                        key={option.kind}
                        id={`rescue-choice-${option.kind}`}
                        onClick={() => handleChoice(option)}
                        className="w-full text-left p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-orange-500/10 hover:border-orange-500/50 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-white group-hover:text-orange-400 transition">
                              {option.kind === 'wait' && '⏳ Wait with Compensation Credit'}
                              {option.kind === 'replace' && '🔄 Replace with Nearby Kitchen'}
                              {option.kind === 'cancel' && '✕ Cancel Order & Full Source Refund'}
                            </p>
                            {option.creditAmount && (
                              <p className="text-xs font-semibold text-emerald-400 mt-1">
                                +{formatRupees(option.creditAmount)} credited instantly to Swiggy Wallet
                              </p>
                            )}
                            {option.refundAmount && (
                              <p className="text-xs font-semibold text-rose-400 mt-1">
                                {formatRupees(option.refundAmount)} back to original payment method
                              </p>
                            )}
                            {option.newEta && (
                              <p className="text-xs text-white/50 mt-1">New estimated arrival: {formatEta(option.newEta)}</p>
                            )}
                            {option.priceDiffPaise !== undefined && (
                              <p className="text-xs text-white/50 mt-1">{formatPriceDiff(option.priceDiffPaise)}</p>
                            )}
                          </div>
                          <span className="text-white/40 group-hover:text-orange-400 text-lg transition">→</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* In-page Simulator Quick Controls (preserves test selectors #sim-fault-rider_stuck, etc.) */}
              <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎮</span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white/80">Fault Simulator</h3>
                  </div>
                  <span className="text-[10px] text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">Demo Harness</span>
                </div>
                <p className="text-xs text-white/50 mb-3">
                  Inject telemetry faults into backend to trigger Swiggy Rescue SLA algorithms:
                </p>

                <div className="grid grid-cols-1 gap-2">
                  {FAULT_OPTIONS.map((f) => (
                    <button
                      key={f.kind}
                      id={`sim-fault-${f.kind}`}
                      onClick={() => injectFault(f.kind)}
                      disabled={!!simLoading}
                      className="text-left px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-orange-500/40 text-xs font-medium text-white transition disabled:opacity-50"
                    >
                      <div className="font-semibold">{f.label}</div>
                      <div className="text-[10px] text-white/40">{f.desc}</div>
                    </button>
                  ))}

                  <button
                    id="sim-reset-btn"
                    onClick={resetSim}
                    disabled={!!simLoading}
                    className="mt-2 w-full py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/70 hover:text-white transition"
                  >
                    {simLoading === 'reset' ? 'Resetting…' : '↺ Reset Demo Scenario'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
