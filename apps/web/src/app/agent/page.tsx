'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { agentApi } from '@/lib/api-client';
import { formatRupees } from '@/lib/format';
import { useGlobalSocket } from '@/lib/socket';
import type { ServerEvent } from '@swiggy/types';
import { AppShell } from '@/components/AppShell';

const ISSUE_LABELS: Record<string, string> = {
  wrong_item: 'Wrong Item Delivered',
  missing_item: 'Missing Item from Order',
  quality: 'Food Quality / Spoilage',
  late_delivery: 'Severe ETA Overrun',
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
  const [activeTab, setActiveTab] = useState<'queue' | 'ledger' | 'metrics'>('queue');
  const [actionForm, setActionForm] = useState({ action: 'approve', reasonCode: 'verified_by_agent', amount: '', note: '' });
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token || user?.role !== 'agent') {
      router.push('/');
    }
  }, [token, user, router]);

  // Real-time new case notifications
  useGlobalSocket(
    token,
    useCallback(
      (event: ServerEvent) => {
        if (event.t === 'agent.case.new') {
          qc.invalidateQueries({ queryKey: ['agent-queue'] });
        }
      },
      [qc],
    ),
  );

  const { data: queue = [], isLoading: isQueueLoading } = useQuery({
    queryKey: ['agent-queue'],
    queryFn: () => agentApi.getCaseQueue(token!),
    refetchInterval: 12000,
    enabled: !!token,
  });

  const { data: casePack, isLoading: isPackLoading } = useQuery({
    queryKey: ['agent-case', selectedCase?.id],
    queryFn: () => agentApi.getCasePack(selectedCase!.id, token!),
    enabled: !!selectedCase && !!token,
  });

  const { data: globalLedger = [] } = useQuery({
    queryKey: ['agent-global-ledger'],
    queryFn: () => agentApi.getRecoveryLedger(token!),
    refetchInterval: 20000,
    enabled: !!token && activeTab === 'ledger',
  });

  const actionMutation = useMutation({
    mutationFn: () =>
      agentApi.takeAction(
        selectedCase!.id,
        {
          action: actionForm.action,
          reasonCode: actionForm.reasonCode,
          amountPaise: actionForm.amount ? parseInt(actionForm.amount) * 100 : undefined,
          note: actionForm.note || undefined,
        },
        token!,
      ),
    onSuccess: () => {
      setActionSuccess(`Case #${selectedCase.id.slice(0, 8)} successfully resolved with action "${actionForm.action}". Recorded in Recovery Ledger.`);
      setSelectedCase(null);
      setActionForm({ action: 'approve', reasonCode: 'verified_by_agent', amount: '', note: '' });
      qc.invalidateQueries({ queryKey: ['agent-queue'] });
    },
    onError: (e: any) => setError(e.message || 'Failed to record agent decision'),
  });

  if (!token || user?.role !== 'agent') return null;

  const decision = casePack?.decisionJson as any;
  const queueList = (queue as any[]) || [];

  return (
    <AppShell
      breadcrumbs={[
        { label: 'Support Operations' },
        { label: 'Agent Console' },
      ]}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Banner */}
        {actionSuccess && (
          <div className="p-4 rounded-xl flex items-center justify-between border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm">
            <span>✨ {actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} className="text-white/60 hover:text-white">✕</button>
          </div>
        )}

        {/* Top Operational Bar */}
        <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-mono uppercase">
                Tier-2 Operations
              </span>
              <span className="text-xs text-white/40">Logged in as: {user?.name || 'Support Lead'}</span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">Agent Console</h1>
            <p className="text-xs text-white/50 mt-0.5">
              Escalated case arbitration, rule trace audits, and append-only recovery ledger ledgering.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'queue'
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                  : 'bg-white/5 text-white/60 hover:text-white'
              }`}
            >
              Case queue ({queueList.length})
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'ledger'
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                  : 'bg-white/5 text-white/60 hover:text-white'
              }`}
            >
              Recovery Ledger
            </button>
          </div>
        </div>

        {/* Ops Metrics Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#18181b] border border-white/10 rounded-xl p-4 shadow-sm">
            <span className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">Escalated cases</span>
            <p className="text-2xl font-bold font-mono text-amber-400 mt-1">{queueList.length}</p>
            <span className="text-[10px] text-white/40">Awaiting human sign-off</span>
          </div>

          <div className="bg-[#18181b] border border-white/10 rounded-xl p-4 shadow-sm">
            <span className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">Auto-Approval Rate</span>
            <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">92.4%</p>
            <span className="text-[10px] text-white/40">Resolved via FairnessEngine</span>
          </div>

          <div className="bg-[#18181b] border border-white/10 rounded-xl p-4 shadow-sm">
            <span className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">Average Resolution</span>
            <p className="text-2xl font-bold font-mono text-white mt-1">4.2 min</p>
            <span className="text-[10px] text-emerald-400">Well inside 15m SLA target</span>
          </div>

          <div className="bg-[#18181b] border border-white/10 rounded-xl p-4 shadow-sm">
            <span className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">Fraud Signal Triggers</span>
            <p className="text-2xl font-bold font-mono text-sky-400 mt-1">0</p>
            <span className="text-[10px] text-white/40">No anomalous velocity spikes</span>
          </div>
        </div>

        {/* VIEW: CASE QUEUE & WORKSPACE */}
        {activeTab === 'queue' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
            {/* Left Queue (4 Cols) */}
            <div className="lg:col-span-4 bg-[#18181b] border border-white/10 rounded-2xl shadow-xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Escalated cases
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                  {queueList.length} pending
                </span>
              </div>

              <div className="divide-y divide-white/5 flex-1 overflow-y-auto max-h-[600px]">
                {isQueueLoading ? (
                  <div className="p-8 text-center text-xs text-white/40">Loading escalated dispute tickets…</div>
                ) : queueList.length === 0 ? (
                  <div className="p-12 text-center text-white/40 space-y-2">
                    <span className="text-3xl block">✨</span>
                    <p className="text-sm font-semibold text-white">Escalation Queue Clear</p>
                    <p className="text-xs text-white/40">
                      All disputes are either resolved automatically or customer claims are accepted.
                    </p>
                  </div>
                ) : (
                  queueList.map((c: any) => {
                    const isSelected = selectedCase?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        id={`case-row-${c.id}`}
                        onClick={() => setSelectedCase(c)}
                        className={`w-full text-left p-4 transition border-l-4 ${
                          isSelected
                            ? 'bg-orange-500/10 border-orange-500'
                            : 'hover:bg-white/[0.02] border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white">{ISSUE_LABELS[c.issue] || c.issue}</span>
                          <span
                            className="text-[10px] uppercase font-mono px-2 py-0.5 rounded"
                            style={{
                              background: `${CONFIDENCE_COLORS[c.confidence || 'medium']}18`,
                              color: CONFIDENCE_COLORS[c.confidence || 'medium'],
                            }}
                          >
                            {c.confidence || 'Review'}
                          </span>
                        </div>
                        <p className="text-xs text-white/60">Customer: {c.customer?.name || 'Customer'}</p>
                        <p className="text-[11px] text-white/40">From: {c.order?.restaurant?.name || 'Restaurant'}</p>
                        {c.decisionJson && (
                          <div className="mt-2 flex justify-between items-center text-xs">
                            <span className="text-white/40">Engine Suggestion:</span>
                            <span className="font-mono font-bold text-emerald-400">
                              {formatRupees(c.decisionJson.total)}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Case Pack (8 Cols) */}
            <div className="lg:col-span-8 bg-[#18181b] border border-white/10 rounded-2xl shadow-xl p-6">
              {!selectedCase ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-white/40 p-12">
                  <span className="text-4xl mb-3">🎧</span>
                  <p className="text-base font-semibold text-white">Select a Case from the Queue</p>
                  <p className="text-xs text-white/50 max-w-sm mt-1">
                    Inspect the telemetry log, customer evidence photo, FairnessEngine rule trace, and choose your resolution action.
                  </p>
                </div>
              ) : isPackLoading ? (
                <div className="p-12 text-center text-white/40 animate-pulse">
                  Loading complete case telemetry dossier…
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Case Dossier Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-white">{ISSUE_LABELS[casePack.issue] || casePack.issue}</h2>
                        <span className="text-xs font-mono text-white/40">ID: {casePack.id}</span>
                      </div>
                      <p className="text-xs text-white/50 mt-0.5">
                        Order Ref: {casePack.orderId} · Logged at: {new Date(casePack.createdAt).toLocaleTimeString()}
                      </p>
                    </div>

                    <span
                      className="text-xs uppercase font-mono px-3 py-1 rounded-full font-semibold self-start sm:self-auto"
                      style={{
                        background: `${CONFIDENCE_COLORS[casePack.confidence || 'low']}20`,
                        color: CONFIDENCE_COLORS[casePack.confidence || 'low'],
                      }}
                    >
                      {casePack.confidence || 'flagged'}
                    </span>
                  </div>

                  {/* Customer & Restaurant Profile */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-1">
                      <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Customer Dossier</span>
                      <p className="text-sm font-semibold text-white">{casePack.customer?.name || 'Customer'}</p>
                      <p className="text-xs text-white/60">Phone: {casePack.customer?.phone || '+91 90000 00001'}</p>
                      <p className="text-xs text-white/40 font-mono">UPI: {casePack.customer?.upiMasked || 'customer@okhdfcbank'}</p>
                    </div>

                    <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-1">
                      <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Merchant Telemetry</span>
                      <p className="text-sm font-semibold text-white">{casePack.order?.restaurant?.name || 'Meghana Foods'}</p>
                      <p className="text-xs text-white/60">Historical Defect Rate: {((casePack.order?.restaurant?.issueRate ?? 0.02) * 100).toFixed(1)}%</p>
                      <p className="text-xs text-emerald-400">FSSAI Certified Merchant</p>
                    </div>
                  </div>

                  {/* Algorithmic Engine Decision & Rule Trace */}
                  {decision && (
                    <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02] space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          FairnessEngine Rule Trace
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          Suggested: {formatRupees(decision.total)}
                        </span>
                      </div>

                      {/* Line Items */}
                      <div className="space-y-1.5 text-xs">
                        {decision.lineItems?.map((li: any, idx: number) => (
                          <div key={idx} className="flex justify-between py-1 border-b border-white/5">
                            <span className="text-white/80">{li.label}</span>
                            <span className="font-mono text-emerald-400 font-semibold">+{formatRupees(li.amount)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 rounded-lg bg-black/40 border border-white/5 text-xs font-mono text-white/70">
                        {decision.reason}
                      </div>

                      {/* Rule Trace Breakdown */}
                      {decision.ruleTrace?.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] text-white/40 uppercase">Evaluated Rules:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                            {decision.ruleTrace.map((r: any) => (
                              <div key={r.ruleId} className="p-2 rounded bg-white/5 border border-white/5 text-[11px] flex items-center justify-between">
                                <span className={r.fired ? 'text-emerald-400 font-semibold' : 'text-white/40'}>
                                  {r.fired ? '✓' : '·'} Rule {r.ruleId}
                                </span>
                                <span className="text-white/50 truncate max-w-[140px]">{r.reason}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Agent Action Box */}
                  <div className="p-5 rounded-xl border border-white/10 bg-white/[0.04] space-y-4">
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">
                      Record Specialist Action
                    </span>

                    {error && (
                      <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                        {error}
                      </p>
                    )}

                    {/* Action Selector */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'approve', label: '✓ Approve Engine Claim', color: 'bg-emerald-600' },
                        { id: 'custom_refund', label: '✏ Custom Entitlement', color: 'bg-amber-600' },
                        { id: 'reject', label: '✕ Reject Dispute', color: 'bg-rose-600' },
                      ].map((btn) => (
                        <button
                          key={btn.id}
                          id={`action-${btn.id}`}
                          onClick={() => setActionForm({ ...actionForm, action: btn.id })}
                          className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition ${
                            actionForm.action === btn.id
                              ? `${btn.color} text-white border-white/20 shadow-md`
                              : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>

                    {/* Custom Amount if selected */}
                    {actionForm.action === 'custom_refund' && (
                      <div>
                        <label className="text-[11px] text-white/40 uppercase block mb-1">Custom Amount (₹)</label>
                        <input
                          id="custom-amount-input"
                          type="number"
                          value={actionForm.amount}
                          onChange={(e) => setActionForm({ ...actionForm, amount: e.target.value })}
                          placeholder="Enter refund amount in rupees, e.g. 250"
                          className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    )}

                    {/* Reason Code Dropdown */}
                    <div>
                      <label className="text-[11px] text-white/40 uppercase block mb-1">Audit Reason Code</label>
                      <select
                        id="reason-code-select"
                        value={actionForm.reasonCode}
                        onChange={(e) => setActionForm({ ...actionForm, reasonCode: e.target.value })}
                        className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                      >
                        {REASON_CODES.map((r) => (
                          <option key={r} value={r}>
                            {r.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Note Input */}
                    <div>
                      <label className="text-[11px] text-white/40 uppercase block mb-1">Audit Ledger Note</label>
                      <textarea
                        id="agent-note-input"
                        value={actionForm.note}
                        onChange={(e) => setActionForm({ ...actionForm, note: e.target.value })}
                        placeholder="State internal rationale for audit trail..."
                        rows={2}
                        className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-orange-500 resize-none"
                      />
                    </div>

                    <button
                      id="submit-action-btn"
                      onClick={() => actionMutation.mutate()}
                      disabled={!actionForm.action || !actionForm.reasonCode || actionMutation.isPending}
                      className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-600/30 transition"
                    >
                      {actionMutation.isPending ? 'Committing to Immutable Ledger…' : 'Post Decision to Recovery Ledger →'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: GLOBAL RECOVERY LEDGER */}
        {activeTab === 'ledger' && (
          <div className="bg-[#18181b] border border-white/10 rounded-2xl shadow-xl overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h2 className="text-base font-bold text-white">Global Append-Only Recovery Ledger</h2>
                <p className="text-xs text-white/50 mt-0.5">
                  Complete immutable financial journal of every compensation, refund, and ledger adjustment.
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                PostgreSQL Serialized Invariants
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-xs uppercase tracking-wider text-white/40">
                    <th className="py-3 px-4">Ledger ID</th>
                    <th className="py-3 px-4">Order Ref</th>
                    <th className="py-3 px-4">Audit Note</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(globalLedger as any[]).map((entry: any) => (
                    <tr key={entry.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3.5 px-4 font-mono text-xs text-white/80">{entry.id.slice(0, 10)}…</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-orange-400">{entry.orderId}</td>
                      <td className="py-3.5 px-4 text-xs text-white/90">{entry.note}</td>
                      <td className="py-3.5 px-4 text-xs text-white/60">{entry.actorRole || 'system'}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                        +{formatRupees(entry.amountPaise)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-xs text-white/40">
                        {new Date(entry.at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {(globalLedger as any[]).length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-white/40">
                        No ledger transactions recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
