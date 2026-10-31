'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { agentApi } from '@/lib/api-client';
import { formatRupees } from '@/lib/format';
import { useGlobalSocket } from '@/lib/socket';
import type { ServerEvent } from '@swiggy/types';

const ISSUE_LABELS: Record<string, string> = {
  wrong_item: 'Wrong item',
  missing_item: 'Missing item',
  quality: 'Quality issue',
  late_delivery: 'Late delivery',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'var(--ok)',
  medium: 'var(--warn)',
  low: 'var(--bad)',
};

const REASON_CODES = [
  'verified_by_agent',
  'custom_investigation',
  'policy_exception',
  'insufficient_evidence',
  'duplicate_claim',
  'outside_policy',
  'customer_error',
];

export default function AgentPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const qc = useQueryClient();
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [actionForm, setActionForm] = useState({ action: '', reasonCode: '', amount: '', note: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || user?.role !== 'agent') {
      router.push('/');
    }
  }, [token, user, router]);

  // Real-time new case notifications
  useGlobalSocket(token, useCallback((event: ServerEvent) => {
    if (event.t === 'agent.case.new') {
      qc.invalidateQueries({ queryKey: ['agent-queue'] });
    }
  }, [qc]));

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['agent-queue'],
    queryFn: () => agentApi.getCaseQueue(token),
    refetchInterval: 15000,
    enabled: !!token,
  });

  const { data: casePack } = useQuery({
    queryKey: ['agent-case', selectedCase?.id],
    queryFn: () => agentApi.getCasePack(selectedCase.id, token),
    enabled: !!selectedCase && !!token,
  });

  const actionMutation = useMutation({
    mutationFn: () =>
      agentApi.takeAction(
        selectedCase.id,
        {
          action: actionForm.action,
          reasonCode: actionForm.reasonCode,
          amountPaise: actionForm.amount ? parseInt(actionForm.amount) * 100 : undefined,
          note: actionForm.note || undefined,
        },
        token,
      ),
    onSuccess: () => {
      setSelectedCase(null);
      setActionForm({ action: '', reasonCode: '', amount: '', note: '' });
      qc.invalidateQueries({ queryKey: ['agent-queue'] });
    },
    onError: (e: any) => setError(e.message),
  });

  if (!token || user?.role !== 'agent') return null;

  const decision = casePack?.decisionJson as any;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="card rounded-none px-4 py-4 border-b" style={{ borderColor: 'var(--line)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-title">Agent Console</h1>
            <p className="text-meta">Logged in as {user?.name}</p>
          </div>
          <button id="agent-logout-btn" onClick={() => { useAuthStore.getState().clearAuth(); router.push('/'); }} className="btn-ghost" style={{ width: 'auto' }}>
            Sign out
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-64px)]">
        {/* Left: case queue */}
        <div className="w-80 border-r overflow-y-auto" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
          <div className="p-4 border-b" style={{ borderColor: 'var(--line)' }}>
            <div className="flex items-center justify-between">
              <p className="text-meta uppercase tracking-widest">Queue</p>
              <span className="text-meta px-2 py-0.5 rounded-pill" style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}>
                {(queue as any[]).length}
              </span>
            </div>
          </div>
          {isLoading ? (
            <div className="p-8 text-center"><p className="text-body" style={{ color: 'var(--ink-2)' }}>Loading…</p></div>
          ) : (queue as any[]).length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-3xl mb-2">✅</p>
              <p className="text-body font-semibold">Queue clear</p>
              <p className="text-meta">No escalated cases</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
              {(queue as any[]).map((c: any) => (
                <button
                  key={c.id}
                  id={`case-row-${c.id}`}
                  onClick={() => setSelectedCase(c)}
                  className="w-full text-left p-4 transition-colors hover:bg-[var(--surface-sunk)]"
                  style={{ background: selectedCase?.id === c.id ? 'var(--accent-soft)' : undefined }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-body font-semibold" style={{ color: 'var(--ink)' }}>{ISSUE_LABELS[c.issue] ?? c.issue}</span>
                    {c.confidence && (
                      <span className="text-meta" style={{ color: CONFIDENCE_COLORS[c.confidence] }}>
                        {c.confidence}
                      </span>
                    )}
                  </div>
                  <p className="text-meta">{c.customer?.name} · {c.order?.restaurant?.name}</p>
                  {c.decisionJson && (
                    <p className="text-meta" style={{ color: 'var(--ok)' }}>
                      {formatRupees(c.decisionJson.total)} suggested
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: case pack */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedCase ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-display mb-2">🎧</p>
                <p className="text-title">Select a case</p>
                <p className="text-body" style={{ color: 'var(--ink-2)' }}>Pick a case from the queue to review it.</p>
              </div>
            </div>
          ) : !casePack ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-body" style={{ color: 'var(--ink-2)' }}>Loading case…</p>
            </div>
          ) : (
            <div className="max-w-2xl space-y-4">
              {/* Case header */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-title">{ISSUE_LABELS[casePack.issue]}</h2>
                    <p className="text-meta">Case {casePack.id.slice(0, 8)}…</p>
                  </div>
                  {casePack.confidence && (
                    <span className="text-meta uppercase tracking-widest px-3 py-1 rounded-pill" style={{ background: `${CONFIDENCE_COLORS[casePack.confidence]}18`, color: CONFIDENCE_COLORS[casePack.confidence] }}>
                      {casePack.confidence}
                    </span>
                  )}
                </div>

                {/* Customer + order info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-meta uppercase tracking-widest mb-1">Customer</p>
                    <p className="text-body font-semibold">{casePack.customer?.name}</p>
                    <p className="text-meta">{casePack.customer?.upiMasked ?? 'No UPI on file'}</p>
                  </div>
                  <div>
                    <p className="text-meta uppercase tracking-widest mb-1">Restaurant</p>
                    <p className="text-body font-semibold">{casePack.order?.restaurant?.name}</p>
                    <p className="text-meta">Issue rate: {((casePack.order?.restaurant?.issueRate ?? 0) * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              {/* Engine decision */}
              {decision && (
                <div className="card p-5">
                  <p className="text-meta uppercase tracking-widest mb-3">Engine decision</p>
                  <div className="space-y-2 mb-4">
                    {decision.lineItems?.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid var(--line)' }}>
                        <span className="text-body">{item.label}</span>
                        <span className="amount text-body font-semibold" style={{ color: 'var(--ok)' }}>
                          +{formatRupees(item.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-title font-semibold">Total</span>
                    <span className="amount text-title font-semibold" style={{ color: 'var(--ok)' }}>
                      +{formatRupees(decision.total)}
                    </span>
                  </div>
                  <p className="text-meta mt-3">{decision.reason}</p>

                  {/* Rule trace */}
                  <details className="mt-4">
                    <summary className="text-meta cursor-pointer" style={{ color: 'var(--ink-2)' }}>Rule trace ({decision.ruleTrace?.length})</summary>
                    <div className="mt-2 space-y-1">
                      {decision.ruleTrace?.map((r: any) => (
                        <div key={r.ruleId} className="flex items-start gap-2 text-meta">
                          <span style={{ color: r.fired ? 'var(--ok)' : 'var(--ink-2)', flexShrink: 0 }}>{r.fired ? '✓' : '·'} {r.ruleId}</span>
                          <span style={{ color: 'var(--ink-2)' }}>{r.reason}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}

              {/* Ledger history */}
              {casePack.order?.ledgerEntries?.length > 0 && (
                <div className="card p-5">
                  <p className="text-meta uppercase tracking-widest mb-3">Recovery ledger</p>
                  <div className="space-y-2">
                    {casePack.order.ledgerEntries.map((entry: any) => (
                      <div key={entry.id} className="flex justify-between items-start py-2" style={{ borderBottom: '1px solid var(--line)' }}>
                        <div>
                          <span className="text-body">{entry.note}</span>
                          <p className="text-meta">{new Date(entry.at).toLocaleString('en-IN')}</p>
                        </div>
                        {entry.amountPaise > 0 && (
                          <span className="amount text-body" style={{ color: 'var(--ok)' }}>+{formatRupees(entry.amountPaise)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action form */}
              <div className="card p-5">
                <p className="text-meta uppercase tracking-widest mb-4">Take action</p>
                {error && <p style={{ color: 'var(--bad)', marginBottom: '12px' }}>{error}</p>}

                <div className="space-y-3">
                  {/* Action selector */}
                  <div className="grid grid-cols-3 gap-2">
                    {['approve', 'custom_refund', 'reject'].map((a) => (
                      <button
                        key={a}
                        id={`action-${a}`}
                        onClick={() => setActionForm({ ...actionForm, action: a })}
                        className="p-3 rounded-xl text-body font-semibold transition-all border"
                        style={{
                          background: actionForm.action === a
                            ? a === 'reject' ? 'var(--bad-soft)' : a === 'approve' ? 'var(--ok-soft)' : 'var(--warn-soft)'
                            : 'var(--surface-sunk)',
                          borderColor: actionForm.action === a
                            ? a === 'reject' ? 'var(--bad)' : a === 'approve' ? 'var(--ok)' : 'var(--warn)'
                            : 'var(--line)',
                          color: actionForm.action === a
                            ? a === 'reject' ? 'var(--bad)' : a === 'approve' ? 'var(--ok)' : 'var(--warn)'
                            : 'var(--ink-2)',
                          cursor: 'pointer',
                        }}
                      >
                        {a === 'approve' ? '✓ Approve' : a === 'custom_refund' ? '✏ Custom' : '✕ Reject'}
                      </button>
                    ))}
                  </div>

                  {actionForm.action === 'custom_refund' && (
                    <div>
                      <label className="text-meta uppercase tracking-widest block mb-1">Amount (₹)</label>
                      <input
                        id="custom-amount-input"
                        type="number"
                        value={actionForm.amount}
                        onChange={(e) => setActionForm({ ...actionForm, amount: e.target.value })}
                        placeholder="e.g. 150"
                        className="w-full border rounded-xl px-4 py-3 text-body"
                        style={{ borderColor: 'var(--line)', background: 'var(--surface-sunk)', color: 'var(--ink)' }}
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-meta uppercase tracking-widest block mb-1">Reason code</label>
                    <select
                      id="reason-code-select"
                      value={actionForm.reasonCode}
                      onChange={(e) => setActionForm({ ...actionForm, reasonCode: e.target.value })}
                      className="w-full border rounded-xl px-4 py-3 text-body"
                      style={{ borderColor: 'var(--line)', background: 'var(--surface-sunk)', color: 'var(--ink)' }}
                    >
                      <option value="">Select reason</option>
                      {REASON_CODES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-meta uppercase tracking-widest block mb-1">Note (optional)</label>
                    <textarea
                      id="agent-note-input"
                      value={actionForm.note}
                      onChange={(e) => setActionForm({ ...actionForm, note: e.target.value })}
                      placeholder="Internal note or customer message"
                      rows={2}
                      className="w-full border rounded-xl px-4 py-3 text-body resize-none"
                      style={{ borderColor: 'var(--line)', background: 'var(--surface-sunk)', color: 'var(--ink)' }}
                    />
                  </div>

                  <button
                    id="submit-action-btn"
                    onClick={() => actionMutation.mutate()}
                    disabled={!actionForm.action || !actionForm.reasonCode || actionMutation.isPending}
                    className="btn-primary"
                    style={{
                      background: actionForm.action === 'reject' ? 'var(--bad)' : 'var(--accent)',
                    }}
                  >
                    {actionMutation.isPending ? 'Submitting…' : 'Submit action'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
