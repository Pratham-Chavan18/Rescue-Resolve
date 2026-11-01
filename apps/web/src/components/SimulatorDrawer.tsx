'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X,
  RotateCcw,
  AlertTriangle,
  Bike,
  ChefHat,
  Zap,
  Clock,
  Package,
} from 'lucide-react';
import { simApi, ordersApi } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';

interface SimulatorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SimEventLog {
  id: string;
  kind: string;
  label: string;
  time: string;
  orderId: string;
}

export function SimulatorDrawer({ isOpen, onClose }: SimulatorDrawerProps) {
  const { token } = useAuthStore();
  const qc = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState('order-demo-live');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'warn' } | null>(null);
  const [eventLogs, setEventLogs] = useState<SimEventLog[]>([]);

  // Fetch current live order status
  const { data: order } = useQuery({
    queryKey: ['sim-order', selectedOrderId],
    queryFn: () => ordersApi.getOrder(selectedOrderId, token!),
    enabled: !!token && isOpen,
    refetchInterval: 5000,
  });

  const { data: allOrders } = useQuery({
    queryKey: ['sim-all-orders'],
    queryFn: () => ordersApi.getAllOrders(token!),
    enabled: !!token && isOpen,
  });

  async function handleInjectFault(kind: string, label: string) {
    if (!token) return;
    setLoadingAction(kind);
    setFeedback(null);
    try {
      await simApi.injectFault(selectedOrderId, kind, token);
      const newLog: SimEventLog = {
        id: Math.random().toString(),
        kind,
        label,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        orderId: selectedOrderId,
      };
      setEventLogs((prev) => [newLog, ...prev.slice(0, 9)]);
      setFeedback({ message: `Triggered: ${label}`, type: 'success' });
      qc.invalidateQueries({ queryKey: ['my-order'] });
      qc.invalidateQueries({ queryKey: ['sim-order'] });
      qc.invalidateQueries({ queryKey: ['agent-queue'] });
      qc.invalidateQueries({ queryKey: ['restaurant-orders'] });
      qc.invalidateQueries({ queryKey: ['rider-tasks'] });
    } catch (err: any) {
      setFeedback({ message: err.message ?? 'Fault injection failed', type: 'warn' });
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleReset() {
    if (!token) return;
    setLoadingAction('reset');
    setFeedback(null);
    try {
      await simApi.reset(token);
      setEventLogs([]);
      setFeedback({ message: 'Demo scenario reset to clean initial state', type: 'success' });
      qc.invalidateQueries();
    } catch (err: any) {
      setFeedback({ message: err.message ?? 'Reset failed', type: 'warn' });
    } finally {
      setLoadingAction(null);
    }
  }

  async function runPreset(presetName: string, faultKind: string, label: string) {
    await handleInjectFault(faultKind, `Preset [${presetName}]: ${label}`);
  }

  if (!isOpen) return null;

  const currentHealth = order?.health?.state ?? 'on_track';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel (Right sheet on desktop, full/bottom responsive on mobile) */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] max-w-full flex flex-col bg-white shadow-2xl z-50 border-l border-[#E9E9EB]">
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#E9E9EB] flex items-center justify-between bg-[#F7F7F9]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FC8019] flex items-center justify-center text-white font-bold">
              <Zap size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#282C3F]">Demo Simulator</h2>
              <p className="text-[11px] text-[#686B78]">Inject real telemetry faults & test recovery</p>
            </div>
          </div>
          <button
            id="close-sim-drawer"
            onClick={onClose}
            className="p-2 text-[#686B78] hover:text-[#282C3F] rounded-lg hover:bg-white transition-colors"
            aria-label="Close Simulator"
          >
            <X size={18} />
          </button>
        </div>

        {/* Feedback message banner */}
        {feedback && (
          <div
            className={`px-4 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
              feedback.type === 'success'
                ? 'bg-[#EAF7F1] text-[#1BA672] border-[#1BA672]/30'
                : 'bg-[#FFF6E5] text-[#C77400] border-[#C77400]/30'
            }`}
          >
            <span>{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs opacity-70 hover:opacity-100 ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {/* Target Order Selection */}
          <div>
            <label className="text-[11px] font-bold text-[#686B78] uppercase tracking-wider block mb-1.5">
              Target Order for Injection
            </label>
            <select
              id="sim-order-select"
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full text-xs border border-[#E9E9EB] rounded-lg px-3 py-2.5 bg-white text-[#282C3F] focus:outline-none focus:border-[#FC8019]"
            >
              <option value="order-demo-live">order-demo-live (In-Flight Spice Garden)</option>
              {allOrders?.map((o: any) => (
                <option key={o.id} value={o.id}>
                  {o.id} · {o.restaurant?.name ?? 'Restaurant'} ({o.status})
                </option>
              ))}
            </select>

            {/* Order Live State Snapshot */}
            <div className="mt-2.5 p-3 rounded-lg bg-[#F7F7F9] border border-[#E9E9EB] text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[#686B78]">Order Status:</span>
                <span className="font-bold text-[#282C3F] uppercase tracking-wider">
                  {order?.status ?? 'loading...'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#686B78]">Health State:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                    currentHealth === 'on_track'
                      ? 'bg-[#EAF7F1] text-[#1BA672]'
                      : currentHealth === 'at_risk'
                      ? 'bg-[#FFF6E5] text-[#C77400]'
                      : 'bg-[#FDECEF] text-[#D7263D]'
                  }`}
                >
                  {currentHealth}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#686B78]">Estimated ETA:</span>
                <span className="font-bold text-[#282C3F]">
                  {order?.health?.etaAt
                    ? new Date(order.health.etaAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '30 mins'}
                </span>
              </div>
            </div>
          </div>

          {/* 1-Click Demo Scenarios */}
          <div>
            <label className="text-[11px] font-bold text-[#686B78] uppercase tracking-wider block mb-2">
              1-Click Demo Scenarios
            </label>
            <div className="space-y-2">
              <button
                id="preset-rider-stuck"
                disabled={!!loadingAction}
                onClick={() => runPreset('Rider Breakdown', 'rider_stuck', 'Rider stationary for 8 mins')}
                className="w-full text-left p-3 rounded-lg border border-[#E9E9EB] hover:border-[#FC8019] hover:bg-[#FFF3E8] transition-colors flex items-start gap-3 disabled:opacity-50"
              >
                <div className="p-2 rounded bg-[#FFF3E8] text-[#FC8019] shrink-0">
                  <Bike size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#282C3F]">Preset: Rider Breakdown</p>
                  <p className="text-[11px] text-[#686B78] mt-0.5 leading-snug">
                    Simulates stationary telemetry (8m delay) → Triggers customer Rescue voucher options
                  </p>
                </div>
              </button>

              <button
                id="preset-kitchen-delay"
                disabled={!!loadingAction}
                onClick={() => runPreset('Kitchen Overload', 'restaurant_slow', 'Pack delay 10 mins')}
                className="w-full text-left p-3 rounded-lg border border-[#E9E9EB] hover:border-[#C77400] hover:bg-[#FFF6E5] transition-colors flex items-start gap-3 disabled:opacity-50"
              >
                <div className="p-2 rounded bg-[#FFF6E5] text-[#C77400] shrink-0">
                  <ChefHat size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#282C3F]">Preset: Kitchen Overload</p>
                  <p className="text-[11px] text-[#686B78] mt-0.5 leading-snug">
                    Simulates food prep delay → Generates replacement alternative or ₹50 wait credit
                  </p>
                </div>
              </button>

              <button
                id="preset-dispute-escalate"
                disabled={!!loadingAction}
                onClick={() => runPreset('High-Value Dispute', 'wrong_item', 'Wrong item reported with photo')}
                className="w-full text-left p-3 rounded-lg border border-[#E9E9EB] hover:border-[#D7263D] hover:bg-[#FDECEF] transition-colors flex items-start gap-3 disabled:opacity-50"
              >
                <div className="p-2 rounded bg-[#FDECEF] text-[#D7263D] shrink-0">
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#282C3F]">Preset: Dispute Escalation (Agent)</p>
                  <p className="text-[11px] text-[#686B78] mt-0.5 leading-snug">
                    Files dispute exceeding auto-payout threshold → Routes to Agent Console queue
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Granular Telemetry Signal Controls */}
          <div>
            <label className="text-[11px] font-bold text-[#686B78] uppercase tracking-wider block mb-2">
              Granular Signal Controls
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="sim-fault-rider_stuck"
                disabled={!!loadingAction}
                onClick={() => handleInjectFault('rider_stuck', 'Rider stuck (8m)')}
                className="p-3 text-left rounded-lg border border-[#E9E9EB] hover:bg-[#F7F7F9] transition-colors disabled:opacity-50"
              >
                <span className="text-xs font-bold text-[#282C3F] block">Rider Stuck</span>
                <span className="text-[10px] text-[#686B78]">8 min stationary</span>
              </button>

              <button
                id="sim-fault-restaurant_slow"
                disabled={!!loadingAction}
                onClick={() => handleInjectFault('restaurant_slow', 'Pack delay (10m)')}
                className="p-3 text-left rounded-lg border border-[#E9E9EB] hover:bg-[#F7F7F9] transition-colors disabled:opacity-50"
              >
                <span className="text-xs font-bold text-[#282C3F] block">Kitchen Delay</span>
                <span className="text-[10px] text-[#686B78]">10 min pack delay</span>
              </button>

              <button
                id="sim-fault-eta_slip"
                disabled={!!loadingAction}
                onClick={() => handleInjectFault('eta_slip', 'ETA slip (+22m)')}
                className="p-3 text-left rounded-lg border border-[#E9E9EB] hover:bg-[#F7F7F9] transition-colors disabled:opacity-50"
              >
                <span className="text-xs font-bold text-[#282C3F] block">ETA Slip</span>
                <span className="text-[10px] text-[#686B78]">+22 min overrun</span>
              </button>

              <button
                id="sim-fault-delivered_unconfirmed"
                disabled={!!loadingAction}
                onClick={() => handleInjectFault('delivered_unconfirmed', 'Unconfirmed (6m)')}
                className="p-3 text-left rounded-lg border border-[#E9E9EB] hover:bg-[#F7F7F9] transition-colors disabled:opacity-50"
              >
                <span className="text-xs font-bold text-[#282C3F] block">Unconfirmed</span>
                <span className="text-[10px] text-[#686B78]">6 min unverified</span>
              </button>
            </div>
          </div>

          {/* Real Injected Events History */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[11px] font-bold text-[#686B78] uppercase tracking-wider">
                Injected Event Logs
              </label>
              {eventLogs.length > 0 && (
                <span className="text-[10px] text-[#686B78] font-mono">{eventLogs.length} events</span>
              )}
            </div>

            {eventLogs.length === 0 ? (
              <div className="p-3.5 rounded-lg border border-dashed border-[#E9E9EB] text-center text-xs text-[#686B78]">
                No simulator signals fired yet in this session.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {eventLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2 rounded border border-[#E9E9EB] bg-[#F7F7F9] flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-[#282C3F] text-[11px]">{log.label}</span>
                    <span className="text-[10px] text-[#686B78] font-mono">{log.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer with Reset Button (respects mobile safe areas) */}
        <div className="p-4 border-t border-[#E9E9EB] bg-[#F7F7F9] pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            id="sim-reset-btn"
            disabled={!!loadingAction}
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-xs border border-[#E9E9EB] bg-white text-[#282C3F] hover:bg-[#FFF3E8] hover:border-[#FC8019] hover:text-[#FC8019] transition-colors shadow-sm disabled:opacity-50"
          >
            <RotateCcw size={14} className={loadingAction === 'reset' ? 'animate-spin' : ''} />
            <span>{loadingAction === 'reset' ? 'Resetting Database…' : 'Reset Demo to Initial Seed'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
