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
  Bike,
  ChefHat,
  Timer,
  Package,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { useAuthStore } from '@/store/auth';
import { ordersApi, rescueApi } from '@/lib/api-client';
import { formatRupees } from '@/lib/format';
import type { RescueOption } from '@swiggy/types';

export default function RescuePage() {
  const { token } = useAuthStore();
  const qc = useQueryClient();
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Get active order
  const { data: order } = useQuery({
    queryKey: ['my-order'],
    queryFn: () => ordersApi.getMyOrder(token!),
    enabled: !!token,
    refetchInterval: 10000,
  });

  // Get active rescue case for this order if any
  const { data: rescueCase } = useQuery({
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

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="p-6 rounded-lg bg-white border border-[#E9E9EB] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-[#FFF3E8] text-[#FC8019]"><ShieldAlert size={20} /></span>
              <h1 className="text-xl font-bold text-[#282C3F]">Swiggy Rescue Hub</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#FFF3E8] text-[#FC8019] border border-[#FC8019]/20">
                Proactive In-Flight Shield
              </span>
            </div>
            <p className="text-xs text-[#686B78] max-w-2xl">
              We monitor kitchen preparation and rider telemetry 24/7. When disruptions occur, you get explicit options—never automatic cancellations or silent delays.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/track"
              className="btn-secondary !py-2.5 !px-4 text-xs font-semibold"
            >
              Live Order Map →
            </Link>
          </div>
        </div>

        {/* Feedback message */}
        {actionSuccess && (
          <div className="p-4 rounded-lg bg-[#EAF7F1] border border-[#1BA672]/30 text-xs text-[#1BA672] font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-xs">✕</button>
          </div>
        )}

        {/* Active Rescue Decision Area */}
        {order && rescueCase && rescueCase.status === 'offered' ? (
          <div className="p-6 rounded-lg bg-white border-2 border-[#FC8019] shadow-md space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#FFF6E5] text-[#C77400] border border-[#C77400]/20 uppercase tracking-wider inline-flex items-center gap-1.5 mb-2">
                  <AlertTriangle size={14} /> Delay Intervention Required
                </span>
                <h2 className="text-lg font-bold text-[#282C3F]">
                  Your order from {order.restaurant?.name} has encountered a delay
                </h2>
                <p className="text-xs text-[#686B78] mt-1">
                  Trigger: <strong className="text-[#282C3F] font-mono">{rescueCase.trigger}</strong> · Please choose your preferred recovery path below. Nothing executes without your explicit consent.
                </p>
              </div>
            </div>

            {/* 3 Explicit Choices */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Option 1: Wait with Credit */}
              {options.find((o) => o.kind === 'wait') && (
                <div
                  onClick={() => setSelectedChoice('wait')}
                  className={`p-5 rounded-lg border-2 cursor-pointer transition-colors flex flex-col justify-between ${
                    selectedChoice === 'wait'
                      ? 'border-[#FC8019] bg-[#FFF3E8]'
                      : 'border-[#E9E9EB] hover:border-[#FC8019] bg-white'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-lg bg-[#FFF3E8] text-[#FC8019] flex items-center justify-center font-bold">
                      <Clock size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#282C3F]">Wait with Wallet Credit</h3>
                      <p className="text-xs text-[#686B78] mt-1">
                        Keep the delivery coming and receive instant compensation in your Swiggy wallet.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-white border border-[#E9E9EB] text-xs">
                      <span className="text-[#686B78] block">Compensation:</span>
                      <span className="text-base font-bold text-[#1BA672]">
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
                    className="btn-primary w-full mt-4 text-xs font-bold"
                  >
                    Accept Credit &amp; Wait
                  </button>
                </div>
              )}

              {/* Option 2: Replace with Nearby Alternative */}
              {options.find((o) => o.kind === 'replace') && (
                <div
                  onClick={() => setSelectedChoice('replace')}
                  className={`p-5 rounded-lg border-2 cursor-pointer transition-colors flex flex-col justify-between ${
                    selectedChoice === 'replace'
                      ? 'border-[#FC8019] bg-[#FFF3E8]'
                      : 'border-[#E9E9EB] hover:border-[#FC8019] bg-white'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-lg bg-[#EAF7F1] text-[#1BA672] flex items-center justify-center font-bold">
                      <RefreshCw size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#282C3F]">Replace from Nearby Kitchen</h3>
                      <p className="text-xs text-[#686B78] mt-1">
                        Re-route to an equivalent nearby restaurant with faster preparation speed.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-white border border-[#E9E9EB] text-xs">
                      <span className="text-[#686B78] block">Matched Restaurant:</span>
                      <span className="font-bold text-[#282C3F] block">
                        {(options.find((o) => o.kind === 'replace') as any)?.replacementRestaurantName ?? 'Curry House (Nearby)'}
                      </span>
                      <span className="text-[11px] text-[#1BA672] font-semibold">Zero price difference</span>
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
                    className="btn-primary w-full mt-4 text-xs font-bold"
                  >
                    Confirm Replacement
                  </button>
                </div>
              )}

              {/* Option 3: Cancel and Full Refund */}
              {options.find((o) => o.kind === 'cancel') && (
                <div
                  onClick={() => setSelectedChoice('cancel')}
                  className={`p-5 rounded-lg border-2 cursor-pointer transition-colors flex flex-col justify-between ${
                    selectedChoice === 'cancel'
                      ? 'border-[#D7263D] bg-[#FDECEF]'
                      : 'border-[#E9E9EB] hover:border-[#D7263D] bg-white'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-lg bg-[#FDECEF] text-[#D7263D] flex items-center justify-center font-bold">
                      <XCircle size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#282C3F]">Cancel Order &amp; Full Refund</h3>
                      <p className="text-xs text-[#686B78] mt-1">
                        Cancel immediately and receive a 100% refund returned to your original payment method.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-white border border-[#E9E9EB] text-xs">
                      <span className="text-[#686B78] block">Refund to Source (UPI):</span>
                      <span className="text-base font-bold text-[#D7263D]">
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
                    className="btn-secondary w-full mt-4 text-xs font-bold !text-[#D7263D] !border-[#D7263D]"
                  >
                    Cancel &amp; Refund 100%
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Proactive Signal Monitoring Matrix */}
        <div className="p-6 rounded-lg bg-white border border-[#E9E9EB] shadow-sm space-y-4">
          <h3 className="text-base font-bold text-[#282C3F]">Configured Recovery Signal Guardrails</h3>
          <p className="text-xs text-[#686B78]">
            Our autonomous triggers monitor order events continuously. When any of these signals fire, Rescue instantly prepares a personalized recovery package.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-[#F7F7F9] border border-[#E9E9EB] space-y-2">
              <div className="flex items-center gap-2 text-[#FC8019] font-bold text-xs">
                <Bike size={16} />
                <span>Rider Stationary (S-1)</span>
              </div>
              <p className="text-xs text-[#686B78]">Fires if delivery partner remains stationary for &gt;6 minutes mid-transit.</p>
              <div className="text-[11px] font-bold text-[#282C3F]">Status: Monitored 24/7</div>
            </div>

            <div className="p-4 rounded-lg bg-[#F7F7F9] border border-[#E9E9EB] space-y-2">
              <div className="flex items-center gap-2 text-[#C77400] font-bold text-xs">
                <ChefHat size={16} />
                <span>Kitchen Pack Delay (S-2)</span>
              </div>
              <p className="text-xs text-[#686B78]">Fires if kitchen packing exceeds promised prep window by &gt;8 minutes.</p>
              <div className="text-[11px] font-bold text-[#282C3F]">Status: Monitored 24/7</div>
            </div>

            <div className="p-4 rounded-lg bg-[#F7F7F9] border border-[#E9E9EB] space-y-2">
              <div className="flex items-center gap-2 text-[#D7263D] font-bold text-xs">
                <Timer size={16} />
                <span>ETA Slip (S-3)</span>
              </div>
              <p className="text-xs text-[#686B78]">Fires if total estimated delivery time slips by &gt;15 minutes past promised SLA.</p>
              <div className="text-[11px] font-bold text-[#282C3F]">Status: Monitored 24/7</div>
            </div>

            <div className="p-4 rounded-lg bg-[#F7F7F9] border border-[#E9E9EB] space-y-2">
              <div className="flex items-center gap-2 text-[#1BA672] font-bold text-xs">
                <Package size={16} />
                <span>Unconfirmed Delivery (S-4)</span>
              </div>
              <p className="text-xs text-[#686B78]">Fires if rider marks delivered but customer has not verified within 5 minutes.</p>
              <div className="text-[11px] font-bold text-[#282C3F]">Status: Monitored 24/7</div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
