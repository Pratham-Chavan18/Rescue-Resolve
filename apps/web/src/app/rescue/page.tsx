'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert,
  Clock,
  RefreshCw,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Bike,
  ChefHat,
  Timer,
  Package,
  Sparkles,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { useAuthStore } from '@/store/auth';
import { ordersApi, rescueApi } from '@/lib/api-client';
import { formatRupees, formatEta } from '@/lib/format';
import type { RescueOption } from '@swiggy/types';

export default function RescuePage() {
  const { token } = useAuthStore();
  const qc = useQueryClient();
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [selectedReplacementId, setSelectedReplacementId] = useState<string | undefined>(undefined);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Get active order
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['my-order'],
    queryFn: () => ordersApi.getMyOrder(token!),
    enabled: !!token,
    refetchInterval: 10000,
  });

  // Get active rescue case for this order if any
  const { data: rescueCase, isLoading: caseLoading } = useQuery({
    queryKey: ['active-rescue-case', order?.id],
    queryFn: () => rescueApi.getCase(order.id, token!),
    enabled: !!token && !!order?.id,
    refetchInterval: 5000,
  });

  const recordChoiceMutation = useMutation({
    mutationFn: ({ choice, replacementId }: { choice: string; replacementId?: string }) =>
      rescueApi.recordChoice(rescueCase.id, choice, replacementId, token!),
    onSuccess: (_, variables) => {
      setActionSuccess(
        variables.choice === 'wait'
          ? 'Wait-with-credit accepted! Wallet credit has been transferred.'
          : variables.choice === 'cancel'
          ? 'Cancellation confirmed. Full source refund has been dispatched.'
          : 'Replacement confirmed! The alternative kitchen is preparing your meal.'
      );
      qc.invalidateQueries({ queryKey: ['my-order'] });
      qc.invalidateQueries({ queryKey: ['active-rescue-case'] });
    },
  });

  const options: RescueOption[] = (rescueCase?.optionsJson as any) ?? [];
  const currentHealth = order?.health?.state ?? 'on_track';

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-orange-50 via-white to-amber-50 border border-orange-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-orange-500 text-white"><ShieldAlert size={20} /></span>
              <h1 className="text-xl font-bold text-[var(--ink)]">Swiggy Rescue Hub</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-orange-100 text-orange-800">
                Proactive In-Flight Shield
              </span>
            </div>
            <p className="text-xs text-[var(--ink-2)] max-w-2xl">
              We monitor kitchen preparation and rider telemetry 24/7. When disruptions occur, you get explicit options—never automatic cancellations or silent delays.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/track"
              className="px-4 py-2.5 rounded-xl bg-white border border-[var(--line)] font-bold text-xs hover:bg-[var(--surface-sunk)] transition-colors"
            >
              Live Order Map →
            </Link>
          </div>
        </div>

        {/* Feedback message */}
        {actionSuccess && (
          <div className="p-4 rounded-xl bg-[var(--ok-soft)] border border-[var(--ok)] text-xs text-[var(--ok)] font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-xs">✕</button>
          </div>
        )}

        {/* Active Rescue Decision Area */}
        {order && rescueCase && rescueCase.status === 'offered' ? (
          <div className="p-6 rounded-2xl bg-white border-2 border-orange-400 shadow-lg space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 uppercase tracking-wider inline-flex items-center gap-1.5 mb-2">
                  <AlertTriangle size={14} /> Delay Intervention Required
                </span>
                <h3 className="text-lg font-bold text-[var(--ink)]">
                  Your order from {order.restaurant?.name} has encountered a delay
                </h3>
                <p className="text-xs text-[var(--ink-2)] mt-1">
                  Trigger: <strong className="text-[var(--ink)] font-mono">{rescueCase.trigger}</strong> · Please choose your preferred recovery path below. Nothing executes without your explicit consent.
                </p>
              </div>
            </div>

            {/* 3 Explicit Choices */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Option 1: Wait with Credit */}
              {options.find((o) => o.kind === 'wait') && (
                <div
                  onClick={() => setSelectedChoice('wait')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    selectedChoice === 'wait'
                      ? 'border-[var(--accent)] bg-orange-50/50 shadow-md ring-2 ring-[var(--accent)]/20'
                      : 'border-[var(--line)] hover:border-neutral-400 bg-white'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                      <Clock size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[var(--ink)]">Wait with Wallet Credit</h4>
                      <p className="text-xs text-[var(--ink-2)] mt-1">
                        Keep the delivery coming and receive instant compensation in your Swiggy wallet.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-[var(--line)] text-xs">
                      <span className="text-[var(--ink-2)] block">Compensation:</span>
                      <span className="text-base font-extrabold text-emerald-600">
                        {formatRupees(options.find((o) => o.kind === 'wait')?.creditAmount ?? 7500)}
                      </span>
                    </div>
                  </div>

                  <button
                    id="rescue-choice-wait"
                    disabled={recordChoiceMutation.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      recordChoiceMutation.mutate({ choice: 'wait' });
                    }}
                    className="w-full mt-5 py-2.5 px-3 rounded-xl font-bold text-xs bg-[var(--accent)] text-white hover:bg-[var(--accent-ink)] transition-colors shadow-sm"
                  >
                    Accept Credit &amp; Wait
                  </button>
                </div>
              )}

              {/* Option 2: Replace with Nearby Alternative */}
              {options.find((o) => o.kind === 'replace') && (
                <div
                  onClick={() => setSelectedChoice('replace')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    selectedChoice === 'replace'
                      ? 'border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                      : 'border-[var(--line)] hover:border-neutral-400 bg-white'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                      <RefreshCw size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[var(--ink)]">Replace from Nearby Kitchen</h4>
                      <p className="text-xs text-[var(--ink-2)] mt-1">
                        Re-route to an equivalent nearby restaurant with faster preparation speed.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-[var(--line)] text-xs">
                      <span className="text-[var(--ink-2)] block">Matched Restaurant:</span>
                      <span className="font-bold text-[var(--ink)] block">
                        {(options.find((o) => o.kind === 'replace') as any)?.replacementRestaurantName ?? 'Curry House (Nearby)'}
                      </span>
                      <span className="text-[11px] text-emerald-600 font-semibold">Zero price difference</span>
                    </div>
                  </div>

                  <button
                    id="rescue-choice-replace"
                    disabled={recordChoiceMutation.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      const repOpt = options.find((o) => o.kind === 'replace');
                      recordChoiceMutation.mutate({ choice: 'replace', replacementId: repOpt?.replacementRestaurantId });
                    }}
                    className="w-full mt-5 py-2.5 px-3 rounded-xl font-bold text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Confirm Replacement
                  </button>
                </div>
              )}

              {/* Option 3: Cancel and Full Refund */}
              {options.find((o) => o.kind === 'cancel') && (
                <div
                  onClick={() => setSelectedChoice('cancel')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    selectedChoice === 'cancel'
                      ? 'border-rose-500 bg-rose-50/50 shadow-md ring-2 ring-rose-500/20'
                      : 'border-[var(--line)] hover:border-neutral-400 bg-white'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                      <XCircle size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[var(--ink)]">Cancel Order &amp; Full Refund</h4>
                      <p className="text-xs text-[var(--ink-2)] mt-1">
                        Cancel immediately and receive a 100% refund returned to your original payment method.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-[var(--line)] text-xs">
                      <span className="text-[var(--ink-2)] block">Refund to Source (UPI):</span>
                      <span className="text-base font-extrabold text-rose-600">
                        {formatRupees(options.find((o) => o.kind === 'cancel')?.refundAmount ?? order.totalPaise)}
                      </span>
                    </div>
                  </div>

                  <button
                    id="rescue-choice-cancel"
                    disabled={recordChoiceMutation.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      recordChoiceMutation.mutate({ choice: 'cancel' });
                    }}
                    className="w-full mt-5 py-2.5 px-3 rounded-xl font-bold text-xs bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm"
                  >
                    Cancel &amp; Refund 100%
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Proactive Signal Monitoring Matrix */}
        <div className="p-6 rounded-2xl bg-white border border-[var(--line)] shadow-sm space-y-4">
          <h3 className="text-base font-bold text-[var(--ink)]">Configured Recovery Signal Guardrails</h3>
          <p className="text-xs text-[var(--ink-2)]">
            Our autonomous triggers monitor order events continuously. When any of these signals fire, Rescue instantly prepares a personalized recovery package.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-[var(--surface-sunk)] border border-[var(--line)] space-y-2">
              <div className="flex items-center gap-2 text-orange-600 font-bold text-xs">
                <Bike size={16} />
                <span>Rider Stationary (S-1)</span>
              </div>
              <p className="text-xs text-[var(--ink-2)]">Fires if delivery partner remains stationary for &gt;6 minutes mid-transit.</p>
              <div className="text-[11px] font-bold text-[var(--ink)]">Status: Monitored 24/7</div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface-sunk)] border border-[var(--line)] space-y-2">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-xs">
                <ChefHat size={16} />
                <span>Kitchen Pack Delay (S-2)</span>
              </div>
              <p className="text-xs text-[var(--ink-2)]">Fires if kitchen packing exceeds promised prep window by &gt;8 minutes.</p>
              <div className="text-[11px] font-bold text-[var(--ink)]">Status: Monitored 24/7</div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface-sunk)] border border-[var(--line)] space-y-2">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-xs">
                <Timer size={16} />
                <span>ETA Slip (S-3)</span>
              </div>
              <p className="text-xs text-[var(--ink-2)]">Fires if total estimated delivery time slips by &gt;15 minutes past promised SLA.</p>
              <div className="text-[11px] font-bold text-[var(--ink)]">Status: Monitored 24/7</div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface-sunk)] border border-[var(--line)] space-y-2">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
                <Package size={16} />
                <span>Unconfirmed Delivery (S-4)</span>
              </div>
              <p className="text-xs text-[var(--ink-2)]">Fires if rider marks delivered but customer has not verified within 5 minutes.</p>
              <div className="text-[11px] font-bold text-[var(--ink)]">Status: Monitored 24/7</div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
