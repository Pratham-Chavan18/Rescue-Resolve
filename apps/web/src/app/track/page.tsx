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
import {
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
  Bike,
  ChefHat,
  Phone,
} from 'lucide-react';

const HEALTH_LABELS: Record<HealthState, string> = {
  on_track: 'On track',
  at_risk: 'Running late',
  failing: 'Major delay',
  recovered: 'Recovered',
  failed: 'Failed',
};

const HEALTH_PILL_CLASS: Record<HealthState, string> = {
  on_track: 'bg-[#EAF7F1] text-[#1BA672] border border-[#1BA672]/30',
  at_risk: 'bg-[#FFF6E5] text-[#C77400] border border-[#C77400]/30',
  failing: 'bg-[#FDECEF] text-[#D7263D] border border-[#D7263D]/30',
  recovered: 'bg-[#EAF7F1] text-[#1BA672] border border-[#1BA672]/30',
  failed: 'bg-[#F7F7F9] text-[#686B78] border border-[#E9E9EB]',
};

const FAULT_OPTIONS = [
  { kind: 'rider_stuck', label: 'Rider stationary (>6 min)', desc: 'Simulates delivery rider stuck in traffic/breakdown' },
  { kind: 'restaurant_slow', label: 'Kitchen delay (>8 min)', desc: 'Simulates prep overrun at restaurant' },
  { kind: 'eta_slip', label: 'ETA overrun (+22 min)', desc: 'Simulates severe recalculated traffic overrun' },
  { kind: 'delivered_unconfirmed', label: 'Delivered unconfirmed', desc: 'Simulates drop-off without delivery handshake' },
];

export default function TrackPage() {
  const router = useRouter();
  const { token } = useAuthStore();
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
    qc.invalidateQueries({ queryKey: ['my-order'] });
  }

  async function injectFault(kind: string) {
    if (!order || !token) return;
    setSimLoading(kind);
    try {
      const res = await simApi.injectFault(order.id, kind, token);
      if (res.rescueOffered && res.rescueOptions && res.rescueCaseId) {
        setRescueCase({ caseId: res.rescueCaseId, options: res.rescueOptions });
        setChoiceMade(false);
      }
      if (res.healthState) {
        setHealthState(res.healthState);
      }
      if (res.etaAt !== undefined) {
        setEtaAt(res.etaAt ?? null);
      }
      qc.invalidateQueries({ queryKey: ['my-order'] });
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
      setHealthState('on_track');
      setNotification('Demo order reset to clean initial state.');
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
          <div className="p-4 rounded-lg flex items-center justify-between step-enter shadow-sm border border-[#1BA672]/30 bg-[#EAF7F1] text-[#1BA672]">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} />
              <span className="font-semibold text-sm">{notification}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-[#1BA672] hover:opacity-75 text-base px-2"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        )}

        {/* Top Header Card */}
        <div className="bg-white border border-[#E9E9EB] rounded-lg p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FFF3E8] text-[#FC8019] border border-[#FC8019]/30 uppercase tracking-wider">
                Live Tracking
              </span>
              <span className="text-xs text-[#686B78] font-mono">ID: {order?.id || 'order-demo-live'}</span>
            </div>
            <h1 className="text-2xl font-bold text-[#282C3F] flex items-center gap-3">
              Your order
              <span className={`text-xs uppercase tracking-wider px-2.5 py-0.5 rounded-full font-bold ${HEALTH_PILL_CLASS[currentHealth]}`}>
                {HEALTH_LABELS[currentHealth]}
              </span>
            </h1>
            <p className="text-xs text-[#686B78] mt-1">
              From <strong className="text-[#282C3F]">{order?.restaurant?.name || 'Spice Garden (Indiranagar)'}</strong> · Contact: +91 98450 11223
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              id="resolve-nav-btn"
              onClick={() => router.push('/resolve')}
              className="btn-secondary !py-2.5 !px-4 text-xs font-semibold flex items-center gap-1.5"
            >
              <span>Report issue</span>
            </button>
            <Link
              href="/rescue"
              className="btn-primary !py-2.5 !px-4 text-xs font-semibold flex items-center gap-1.5"
            >
              <ShieldAlert size={14} />
              <span>Rescue Center</span>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white border border-[#E9E9EB] rounded-lg p-12 text-center text-[#686B78] animate-pulse">
            Loading live order telemetry & rider route…
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Stepper, Map & Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stepper Card */}
              <div className="bg-white border border-[#E9E9EB] rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-[#E9E9EB] mb-6">
                  <div>
                    <span className="text-[11px] text-[#686B78] uppercase tracking-wider block font-semibold">Estimated Delivery</span>
                    <p className="text-2xl font-bold text-[#282C3F] tracking-tight">
                      {currentEta ? formatEta(currentEta) : 'Approx 22 mins'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-[#686B78] uppercase tracking-wider block font-semibold">Telemetry State</span>
                    <p className={`text-sm font-bold capitalize ${currentHealth === 'on_track' ? 'text-[#1BA672]' : 'text-[#C77400]'}`}>
                      {currentHealth.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                {/* Horizontal Stepper */}
                <div className="grid grid-cols-5 gap-2 relative">
                  {statusSteps.map((step, idx) => (
                    <div key={step.key} className="flex flex-col items-center text-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                          step.done
                            ? 'bg-[#FC8019] text-white shadow-sm'
                            : 'bg-[#F7F7F9] text-[#686B78] border border-[#E9E9EB]'
                        }`}
                      >
                        {step.done ? '✓' : idx + 1}
                      </div>
                      <span className={`text-xs font-semibold mt-2 leading-tight ${step.done ? 'text-[#282C3F]' : 'text-[#686B78]'}`}>
                        {step.label}
                      </span>
                      <span className="text-[10px] text-[#686B78] mt-0.5">{step.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Simulated Map Visualizer */}
              <div className="bg-white border border-[#E9E9EB] rounded-lg p-6 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#1BA672] animate-ping" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#282C3F]">Live Delivery Radar</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#686B78]">GPS: 12.9716° N, 77.5946° E</span>
                </div>

                {/* Map Visual Canvas */}
                <div className="h-64 rounded-lg bg-[#F7F7F9] border border-[#E9E9EB] p-4 relative flex flex-col justify-between overflow-hidden">
                  {/* Subtle Grid Lines */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

                  {/* Route Polyline Simulation */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M 60 180 Q 200 90 400 130 T 650 80"
                      fill="none"
                      stroke="#FC8019"
                      strokeWidth="3"
                      strokeDasharray="6 6"
                      className="opacity-70"
                    />
                  </svg>

                  {/* Top Restaurant Pin */}
                  <div className="relative z-10 self-start bg-white px-3 py-2 rounded-lg border border-[#E9E9EB] flex items-center gap-2 shadow-sm">
                    <div className="w-6 h-6 rounded bg-[#FFF6E5] text-[#C77400] flex items-center justify-center text-xs">
                      <ChefHat size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#282C3F]">{order?.restaurant?.name || 'Spice Garden'}</p>
                      <p className="text-[10px] text-[#1BA672] font-semibold">Order Dispatched</p>
                    </div>
                  </div>

                  {/* Center Rider Pin */}
                  <div className="relative z-10 self-center bg-[#FC8019] text-white px-3.5 py-2 rounded-lg flex items-center gap-2 shadow-md">
                    <Bike size={16} />
                    <div>
                      <p className="text-xs font-bold leading-none">Ramesh Kumar</p>
                      <p className="text-[10px] text-white/90 mt-0.5">2.1 km away · 32 km/h</p>
                    </div>
                  </div>

                  {/* Destination Pin */}
                  <div className="relative z-10 self-end bg-white px-3 py-2 rounded-lg border border-[#E9E9EB] flex items-center gap-2 shadow-sm">
                    <MapPin size={16} className="text-[#FC8019]" />
                    <div>
                      <p className="text-xs font-bold text-[#282C3F]">Delivery Address</p>
                      <p className="text-[10px] text-[#686B78]">14, Indiranagar, Bengaluru</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                  <div className="bg-[#F7F7F9] border border-[#E9E9EB] rounded-lg p-3">
                    <span className="text-[10px] text-[#686B78] uppercase font-bold">Distance Left</span>
                    <p className="text-sm font-bold text-[#282C3F] mt-0.5">2.1 km</p>
                  </div>
                  <div className="bg-[#F7F7F9] border border-[#E9E9EB] rounded-lg p-3">
                    <span className="text-[10px] text-[#686B78] uppercase font-bold">Rider Contact</span>
                    <p className="text-sm font-bold text-[#FC8019] mt-0.5">+91 91234 56789</p>
                  </div>
                  <div className="bg-[#F7F7F9] border border-[#E9E9EB] rounded-lg p-3">
                    <span className="text-[10px] text-[#686B78] uppercase font-bold">Signal Health</span>
                    <p className="text-sm font-bold text-[#1BA672] mt-0.5">Online (99.8%)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Order Items & Proactive Rescue / Sim */}
            <div className="space-y-6">
              {/* Order Items Card */}
              <div className="bg-white border border-[#E9E9EB] rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-[#E9E9EB] mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#686B78]">Order Summary</h3>
                  <span className="text-xs text-[#686B78] font-semibold">{order?.items?.length || 4} items</span>
                </div>

                <div className="space-y-3">
                  {order?.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center py-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center text-[8px] font-bold ${
                          item.isVeg ? 'border-[#1BA672] text-[#1BA672]' : 'border-[#D7263D] text-[#D7263D]'
                        }`}>
                          ●
                        </span>
                        <div>
                          <p className="text-xs font-bold text-[#282C3F]">{item.name}</p>
                          <p className="text-[11px] text-[#686B78]">Qty: {item.qty}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#282C3F]">
                        {formatRupees(item.pricePaise * item.qty)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-[#E9E9EB] space-y-2">
                  <div className="flex justify-between text-xs text-[#686B78]">
                    <span>Item Total</span>
                    <span>{formatRupees((order?.totalPaise || 58500) - 4900)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#686B78]">
                    <span>Delivery &amp; Packaging</span>
                    <span>{formatRupees(4900)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-[#282C3F] pt-2 border-t border-[#E9E9EB]">
                    <span>Total Paid</span>
                    <span className="text-[#1BA672]">{formatRupees(order?.totalPaise || 58500)}</span>
                  </div>
                </div>
              </div>

              {/* Rescue Offered Card (If triggered) */}
              {rescueCase && !choiceMade && (
                <div className="bg-[#FFF3E8] border-2 border-[#FC8019] rounded-lg p-5 shadow-md step-enter">
                  <div className="flex items-center gap-2.5 mb-3">
                    <ShieldAlert size={20} className="text-[#FC8019]" />
                    <div>
                      <h3 className="text-sm font-bold text-[#282C3F]">Swiggy Rescue Active</h3>
                      <p className="text-xs text-[#686B78]">Proactive delay compensation ready</p>
                    </div>
                  </div>

                  <p className="text-xs text-[#282C3F] mb-4 leading-relaxed">
                    Our sensors detected an abnormal delay exceeding our delivery guarantee. Choose your preferred recovery:
                  </p>

                  <div className="space-y-2.5">
                    {rescueCase.options.map((option) => (
                      <button
                        key={option.kind}
                        id={`rescue-choice-${option.kind}`}
                        onClick={() => handleChoice(option)}
                        className="w-full text-left p-3.5 rounded-lg border border-[#FC8019]/40 bg-white hover:bg-[#FFF6E5] transition-colors cursor-pointer group shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-[#282C3F] group-hover:text-[#FC8019] transition">
                              {option.kind === 'wait' && '⏳ Wait with Compensation Credit'}
                              {option.kind === 'replace' && '🔄 Replace with Nearby Kitchen'}
                              {option.kind === 'cancel' && '✕ Cancel Order & Full Source Refund'}
                            </p>
                            {option.creditAmount && (
                              <p className="text-[11px] font-bold text-[#1BA672] mt-0.5">
                                +{formatRupees(option.creditAmount)} credited instantly to Swiggy Wallet
                              </p>
                            )}
                            {option.refundAmount && (
                              <p className="text-[11px] font-bold text-[#D7263D] mt-0.5">
                                {formatRupees(option.refundAmount)} back to original payment method
                              </p>
                            )}
                            {option.newEta && (
                              <p className="text-[11px] text-[#686B78] mt-0.5">New ETA: {formatEta(option.newEta)}</p>
                            )}
                            {option.priceDiffPaise !== undefined && (
                              <p className="text-[11px] text-[#686B78] mt-0.5">{formatPriceDiff(option.priceDiffPaise)}</p>
                            )}
                          </div>
                          <span className="text-[#686B78] group-hover:text-[#FC8019] font-bold">→</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* In-page Simulator Quick Controls */}
              <div className="bg-white border border-[#E9E9EB] rounded-lg p-5 shadow-sm">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#E9E9EB] mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#686B78]">Fault Simulator</h3>
                  <span className="text-[10px] text-[#FC8019] bg-[#FFF3E8] px-2 py-0.5 rounded font-bold">Demo Harness</span>
                </div>
                <p className="text-xs text-[#686B78] mb-3">
                  Inject telemetry faults into backend to trigger Swiggy Rescue SLA algorithms:
                </p>

                <div className="grid grid-cols-1 gap-2">
                  {FAULT_OPTIONS.map((f) => (
                    <button
                      key={f.kind}
                      id={`sim-fault-${f.kind}`}
                      onClick={() => injectFault(f.kind)}
                      disabled={!!simLoading}
                      className="text-left px-3.5 py-2 rounded-lg border border-[#E9E9EB] hover:bg-[#F7F7F9] hover:border-[#FC8019] text-xs font-medium text-[#282C3F] transition-colors disabled:opacity-50"
                    >
                      <div className="font-bold text-[#282C3F]">{f.label}</div>
                      <div className="text-[10px] text-[#686B78]">{f.desc}</div>
                    </button>
                  ))}

                  <button
                    id="sim-reset-btn"
                    onClick={resetSim}
                    disabled={!!simLoading}
                    className="mt-2 w-full py-2.5 rounded-lg border border-[#E9E9EB] bg-white hover:bg-[#F7F7F9] text-xs font-bold text-[#282C3F] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw size={14} className={simLoading === 'reset' ? 'animate-spin' : ''} />
                    <span>{simLoading === 'reset' ? 'Resetting…' : 'Reset Demo Scenario'}</span>
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
