'use client';

import { useState, useEffect, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { partnersApi } from '@/lib/api-client';
import { formatRupees } from '@/lib/format';
import { AppShell } from '@/components/AppShell';
import {
  Bike,
  Package,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Phone,
} from 'lucide-react';

function RiderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useAuthStore();
  const qc = useQueryClient();

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'active' | 'assigned' | 'history' | 'issue'>('active');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [issueNote, setIssueNote] = useState('');

  useEffect(() => {
    if (tabParam && ['active', 'assigned', 'history', 'issue'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [tabParam]);

  useEffect(() => {
    if (!token || user?.role !== 'rider') {
      router.push('/');
    }
  }, [token, user, router]);

  const { data: tasks = [] } = useQuery({
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
    restaurant: { name: 'Spice Garden (Indiranagar)', address: '100ft Road, Indiranagar' },
    address: '14, Indiranagar, Bengaluru',
    status: 'picked_up',
    totalPaise: 58500,
    items: [{ id: '1', name: 'Dal Makhani', qty: 1 }, { id: '2', name: 'Chicken Biryani', qty: 1 }],
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
          <div className="p-4 rounded-lg flex items-center justify-between border border-[#1BA672]/30 bg-[#EAF7F1] text-[#1BA672] text-xs font-bold shadow-sm">
            <span>✨ {actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} className="text-[#1BA672] hover:opacity-80">✕</button>
          </div>
        )}

        {/* Rider Top Status */}
        <div className="bg-white border border-[#E9E9EB] rounded-lg p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#FFF3E8] text-[#FC8019] flex items-center justify-center text-2xl font-bold">
              🛵
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#282C3F]">{user?.name || 'Ramesh Kumar'}</h1>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#EAF7F1] text-[#1BA672] border border-[#1BA672]/20 font-bold">
                  Duty ON · GPS Active
                </span>
              </div>
              <p className="text-xs text-[#686B78] mt-0.5">Rider ID: RIDER-KA03-8819 · Hero Splendor (KA-03-HA-4910)</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#F7F7F9] border border-[#E9E9EB] px-4 py-2 rounded-lg text-center">
              <span className="text-[10px] text-[#686B78] uppercase font-bold block">Today&apos;s Payout</span>
              <span className="text-sm font-bold text-[#1BA672]">₹820.00</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#E9E9EB] gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'active'
                ? 'bg-[#FC8019] text-white shadow-sm'
                : 'text-[#686B78] hover:text-[#282C3F] hover:bg-[#F7F7F9]'
            }`}
          >
            <span>📍</span> Active Delivery
          </button>
          <button
            onClick={() => setActiveTab('assigned')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'assigned'
                ? 'bg-[#FC8019] text-white shadow-sm'
                : 'text-[#686B78] hover:text-[#282C3F] hover:bg-[#F7F7F9]'
            }`}
          >
            <span>📋</span> Assigned ({taskList.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-[#FC8019] text-white shadow-sm'
                : 'text-[#686B78] hover:text-[#282C3F] hover:bg-[#F7F7F9]'
            }`}
          >
            <span>🏁</span> Completed Today (8)
          </button>
          <button
            onClick={() => setActiveTab('issue')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'issue'
                ? 'bg-[#FC8019] text-white shadow-sm'
                : 'text-[#686B78] hover:text-[#282C3F] hover:bg-[#F7F7F9]'
            }`}
          >
            <span>⚠️</span> Report Impediment
          </button>
        </div>

        {/* Tab 1: Active Delivery */}
        {activeTab === 'active' && (
          <div className="bg-white border border-[#E9E9EB] rounded-lg p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E9E9EB]">
              <div>
                <span className="text-[10px] text-[#FC8019] font-bold uppercase tracking-wider">Current Delivery Task</span>
                <h2 className="text-base font-bold text-[#282C3F] mt-0.5">Order #{activeTask.id.slice(0, 8)}</h2>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#EAF7F1] text-[#1BA672] uppercase tracking-wider self-start sm:self-auto">
                {activeTask.status.replace('_', ' ')}
              </span>
            </div>

            {/* Waypoints */}
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3.5 rounded-lg bg-[#F7F7F9] border border-[#E9E9EB]">
                <div className="w-7 h-7 rounded-lg bg-[#FFF6E5] text-[#C77400] flex items-center justify-center text-xs font-bold shrink-0">
                  A
                </div>
                <div>
                  <span className="text-[10px] text-[#686B78] uppercase font-bold">Pickup Restaurant</span>
                  <p className="text-xs font-bold text-[#282C3F]">{activeTask.restaurant?.name}</p>
                  <p className="text-[11px] text-[#686B78]">{activeTask.restaurant?.address ?? '100ft Road, Indiranagar'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-lg bg-[#F7F7F9] border border-[#E9E9EB]">
                <div className="w-7 h-7 rounded-lg bg-[#FFF3E8] text-[#FC8019] flex items-center justify-center text-xs font-bold shrink-0">
                  B
                </div>
                <div>
                  <span className="text-[10px] text-[#686B78] uppercase font-bold">Delivery Drop</span>
                  <p className="text-xs font-bold text-[#282C3F]">Customer Dropoff Point</p>
                  <p className="text-[11px] text-[#686B78]">{activeTask.address}</p>
                </div>
              </div>
            </div>

            {/* Rider Handshake Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => pickupMutation.mutate(activeTask.id)}
                disabled={pickupMutation.isPending}
                className="btn-primary w-full sm:w-auto text-xs font-bold"
              >
                {pickupMutation.isPending ? 'Confirming…' : '✓ Confirm Restaurant Pickup'}
              </button>
              <button
                onClick={() => deliverMutation.mutate(activeTask.id)}
                disabled={deliverMutation.isPending}
                className="btn-primary !bg-[#1BA672] hover:!bg-[#158057] w-full sm:w-auto text-xs font-bold"
              >
                {deliverMutation.isPending ? 'Completing…' : '🏁 Complete Delivery Handover'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Assigned Deliveries */}
        {activeTab === 'assigned' && (
          <div className="bg-white border border-[#E9E9EB] rounded-lg p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#282C3F]">Assigned Queue</h2>
            <div className="p-4 rounded-lg bg-[#F7F7F9] border border-[#E9E9EB] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#282C3F]">Order #{activeTask.id.slice(0, 8)}</p>
                <p className="text-[11px] text-[#686B78]">{activeTask.restaurant?.name} → {activeTask.address}</p>
              </div>
              <span className="text-xs font-bold text-[#1BA672]">{formatRupees(activeTask.totalPaise)}</span>
            </div>
          </div>
        )}

        {/* Tab 3: Completed Today */}
        {activeTab === 'history' && (
          <div className="bg-white border border-[#E9E9EB] rounded-lg p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#282C3F]">Today&apos;s Completed Runs</h2>
            <div className="divide-y divide-[#E9E9EB] text-xs">
              <div className="py-2.5 flex justify-between items-center">
                <div>
                  <p className="font-bold text-[#282C3F]">Order #ORD-7741 · Meghana Foods</p>
                  <p className="text-[11px] text-[#686B78]">Delivered in 21 mins · Payout ₹65.00</p>
                </div>
                <span className="text-[#1BA672] font-bold">✓ Success</span>
              </div>
              <div className="py-2.5 flex justify-between items-center">
                <div>
                  <p className="font-bold text-[#282C3F]">Order #ORD-7729 · Truffles</p>
                  <p className="text-[11px] text-[#686B78]">Delivered in 18 mins · Payout ₹58.00</p>
                </div>
                <span className="text-[#1BA672] font-bold">✓ Success</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Report Impediment */}
        {activeTab === 'issue' && (
          <div className="bg-white border border-[#E9E9EB] rounded-lg p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#282C3F]">Report Road Impediment</h2>
              <p className="text-xs text-[#686B78] mt-0.5">
                Reporting delay triggers proactive Swiggy Rescue customer alerts and protects your delivery partner rating.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Bike puncture / mechanical failure', reason: 'bike_breakdown' },
                { label: 'Heavy rain / waterlogged route', reason: 'bad_weather' },
                { label: 'Unforeseen traffic jam (>15 mins)', reason: 'traffic_congestion' },
                { label: 'Customer address unreachable', reason: 'address_unreachable' },
              ].map((item) => (
                <button
                  key={item.reason}
                  onClick={() => reportIssueMutation.mutate({ orderId: activeTask.id, reason: item.reason })}
                  disabled={reportIssueMutation.isPending}
                  className="p-3.5 text-left rounded-lg border border-[#E9E9EB] hover:border-[#FC8019] hover:bg-[#FFF3E8] transition-colors"
                >
                  <p className="text-xs font-bold text-[#282C3F]">{item.label}</p>
                  <p className="text-[10px] text-[#686B78] mt-0.5">Alerts Rescue dispatch</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function RiderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[#686B78]">Loading rider console…</div>}>
      <RiderContent />
    </Suspense>
  );
}
