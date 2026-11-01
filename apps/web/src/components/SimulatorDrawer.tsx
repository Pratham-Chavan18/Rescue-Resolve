'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Play, RotateCcw, AlertTriangle, Clock, Bike, ChefHat, CheckCircle2, PackageCheck, Zap } from 'lucide-react';
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

  // Pre-configured Scenarios
  async function runPreset(presetName: string, faultKind: string, label: string) {
    await handleInjectFault(faultKind, `Preset [${presetName}]: ${label}`);
  }

  if (!isOpen) return null;

  const currentHealth = order?.health?.state ?? 'on_track';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-[var(--line)]">
          {/* Header */}
          <div className="p-4 border-b border-[var(--line)] flex items-center justify-between bg-[var(--surface-sunk)]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-bold">
                <Zap size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--ink)]">Demo Event Simulator</h2>
                <p className="text-xs text-[var(--ink-2)]">Secondary utility for live testing & recovery demos</p>
              </div>
            </div>
            <button
              id="close-sim-drawer"
              onClick={onClose}
              className="p-2 text-[var(--ink-2)] hover:text-[var(--ink)] rounded-lg hover:bg-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`p-3 text-xs font-semibold flex items-center justify-between ${
                feedback.type === 'success'
                  ? 'bg-[var(--ok-soft)] text-[var(--ok)] border-b border-[var(--ok)]'
                  : 'bg-[var(--warn-soft)] text-[var(--warn)] border-b border-[var(--warn)]'
              }`}
            >
              <span>{feedback.message}</span>
              <button onClick={() => setFeedback(null)} className="text-xs opacity-70 hover:opacity-100">✕</button>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Target Order Selection */}
            <div>
              <label className="text-xs font-bold text-[var(--ink-2)] uppercase tracking-wider block mb-2">
                Target Order
              </label>
              <select
                id="sim-order-select"
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full text-sm border border-[var(--line)] rounded-xl px-3 py-2.5 bg-white text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                <option value="order-demo-live">order-demo-live (In-Flight Demo Order)</option>
                {allOrders?.map((o: any) => (
                  <option key={o.id} value={o.id}>
                    {o.id} · {o.restaurant?.name ?? 'Restaurant'} ({o.status})
                  </option>
                ))}
              </select>

              {/* Order State Snapshot */}
              <div className="mt-3 p-3 rounded-xl bg-[var(--surface-sunk)] border border-[var(--line)] text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--ink-2)]">Order Status:</span>
                  <span className="font-semibold uppercase tracking-wider text-[var(--ink)]">{order?.status ?? 'loading...'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--ink-2)]">Health State:</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      currentHealth === 'on_track'
                        ? 'bg-[var(--ok-soft)] text-[var(--ok)]'
                        : currentHealth === 'at_risk'
                        ? 'bg-[var(--warn-soft)] text-[var(--warn)]'
                        : 'bg-[var(--bad-soft)] text-[var(--bad)]'
                    }`}
                  >
                    {currentHealth}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--ink-2)]">Promised / ETA:</span>
                  <span className="font-semibold text-[var(--ink)]">
                    {order?.health?.etaAt ? new Date(order.health.etaAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '30 mins'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Demo Scenario Presets */}
            <div>
              <label className="text-xs font-bold text-[var(--ink-2)] uppercase tracking-wider block mb-2">
                1-Click Demo Scenarios
              </label>
              <div className="space-y-2">
                <button
                  id="preset-rider-stuck"
                  disabled={!!loadingAction}
                  onClick={() => runPreset('Rider Breakdown', 'rider_stuck', 'Rider stationary for 8 mins')}
                  className="w-full text-left p-3 rounded-xl border border-[var(--line)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all flex items-start gap-3"
                >
                  <span className="p-2 rounded-lg bg-orange-100 text-orange-600 mt-0.5"><Bike size={16} /></span>
                  <div>
                    <p className="text-xs font-bold text-[var(--ink)]">Preset: Rider Breakdown</p>
                    <p className="text-[11px] text-[var(--ink-2)]">Injects stationary signal S-1 (8 min delay) → Triggers customer Rescue consent sheet</p>
                  </div>
                </button>

                <button
                  id="preset-kitchen-delay"
                  disabled={!!loadingAction}
                  onClick={() => runPreset('Kitchen Overload', 'restaurant_slow', 'Pack delay 10 mins')}
                  className="w-full text-left p-3 rounded-xl border border-[var(--line)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all flex items-start gap-3"
                >
                  <span className="p-2 rounded-lg bg-amber-100 text-amber-600 mt-0.5"><ChefHat size={16} /></span>
                  <div>
                    <p className="text-xs font-bold text-[var(--ink)]">Preset: Kitchen Overload</p>
                    <p className="text-[11px] text-[var(--ink-2)]">Injects pack delay signal S-2 (10 min) → Generates replacement alternative match</p>
                  </div>
                </button>

                <button
                  id="preset-dispute-escalate"
                  disabled={!!loadingAction}
                  onClick={() => runPreset('High-Value Dispute', 'wrong_item', 'Wrong item reported with photo')}
                  className="w-full text-left p-3 rounded-xl border border-[var(--line)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all flex items-start gap-3"
                >
                  <span className="p-2 rounded-lg bg-rose-100 text-rose-600 mt-0.5"><AlertTriangle size={16} /></span>
                  <div>
                    <p className="text-xs font-bold text-[var(--ink)]">Preset: Dispute Escalation (Agent)</p>
                    <p className="text-[11px] text-[var(--ink-2)]">Files wrong item claim that exceeds auto-limit → Routes directly to Agent Console queue</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Individual Fault Injection Controls */}
            <div>
              <label className="text-xs font-bold text-[var(--ink-2)] uppercase tracking-wider block mb-2">
                Granular Signal Controls
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="sim-fault-rider_stuck"
                  disabled={!!loadingAction}
                  onClick={() => handleInjectFault('rider_stuck', 'Rider stuck (8m)')}
                  className="p-3 text-left rounded-xl border border-[var(--line)] hover:bg-[var(--surface-sunk)] transition-all"
                >
                  <span className="text-base block mb-1">🛵</span>
                  <span className="text-xs font-bold text-[var(--ink)] block">Rider Stuck</span>
                  <span className="text-[10px] text-[var(--ink-2)]">8 min stationary</span>
                </button>

                <button
                  id="sim-fault-restaurant_slow"
                  disabled={!!loadingAction}
                  onClick={() => handleInjectFault('restaurant_slow', 'Pack delay (10m)')}
                  className="p-3 text-left rounded-xl border border-[var(--line)] hover:bg-[var(--surface-sunk)] transition-all"
                >
                  <span className="text-base block mb-1">🍳</span>
                  <span className="text-xs font-bold text-[var(--ink)] block">Kitchen Delay</span>
                  <span className="text-[10px] text-[var(--ink-2)]">10 min pack delay</span>
                </button>

                <button
                  id="sim-fault-eta_slip"
                  disabled={!!loadingAction}
                  onClick={() => handleInjectFault('eta_slip', 'ETA slip (+22m)')}
                  className="p-3 text-left rounded-xl border border-[var(--line)] hover:bg-[var(--surface-sunk)] transition-all"
                >
                  <span className="text-base block mb-1">⏱️</span>
                  <span className="text-xs font-bold text-[var(--ink)] block">ETA Slip</span>
                  <span className="text-[10px] text-[var(--ink-2)]">+22 min critical</span>
                </button>

                <button
                  id="sim-fault-delivered_unconfirmed"
                  disabled={!!loadingAction}
                  onClick={() => handleInjectFault('delivered_unconfirmed', 'Unconfirmed (6m)')}
                  className="p-3 text-left rounded-xl border border-[var(--line)] hover:bg-[var(--surface-sunk)] transition-all"
                >
                  <span className="text-base block mb-1">📦</span>
                  <span className="text-xs font-bold text-[var(--ink)] block">Unconfirmed</span>
                  <span className="text-[10px] text-[var(--ink-2)]">6 min unverified</span>
                </button>
              </div>
            </div>

            {/* Event History Log */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-[var(--ink-2)] uppercase tracking-wider">
                  Recent Injected Events
                </label>
                {eventLogs.length > 0 && (
                  <span className="text-[11px] text-[var(--ink-2)]">{eventLogs.length} events</span>
                )}
              </div>
              {eventLogs.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-[var(--line)] text-center text-xs text-[var(--ink-2)]">
                  No simulated events triggered in this session.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {eventLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2 rounded-lg bg-[var(--surface-sunk)] border border-[var(--line)] flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-[var(--ink)]">{log.label}</span>
                      <span className="text-[10px] text-[var(--ink-2)]">{log.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer with Reset Button */}
          <div className="p-4 border-t border-[var(--line)] bg-[var(--surface-sunk)] flex items-center gap-3">
            <button
              id="sim-reset-btn"
              disabled={!!loadingAction}
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs border border-[var(--line)] bg-white text-[var(--ink)] hover:bg-neutral-50 transition-all shadow-sm"
            >
              <RotateCcw size={14} className={loadingAction === 'reset' ? 'animate-spin' : ''} />
              {loadingAction === 'reset' ? 'Resetting Scenario…' : 'Reset Demo to Initial State'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
