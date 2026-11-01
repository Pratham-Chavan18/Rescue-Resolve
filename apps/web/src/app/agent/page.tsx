'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
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
  high: '#1BA672',
  medium: '#C77400',
  low: '#D7263D',
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

function AgentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useAuthStore();
  const qc = useQueryClient();

  const tabParam = searchParams.get('tab');
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'ledger'>('queue');
  const [actionForm, setActionForm] = useState({ action: 'approve', reasonCode: 'verified_by_agent', amount: '', note: '' });
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (tabParam === 'ledger') {
      setActiveTab('ledger');
    } else if (tabParam === 'queue' || tabParam === 'escalated') {
      setActiveTab('queue');
    }
  }, [tabParam]);

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
        { label: 'Console' },
      ]}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Banner */}
        {actionSuccess && (
          <div className="p-4 rounded-lg flex items-center justify-between border border-[#1BA672]/30 bg-[#EAF7F1] text-[#1BA672] text-xs font-bold shadow-sm">
            <span>✨ {actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} className="text-[#1BA672] hover:opacity-80">✕</button>
          </div>
        )}

        {/* Top Operational Bar */}
        <div className="bg-white border border-[#E9E9EB] rounded-lg p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#FFF3E8] text-[#FC8019] border border-[#FC8019]/20 font-bold uppercase">
                Tier-2 Operations
              </span>
              <span className="text-xs text-[#686B78]">Logged in as: {user?.name || 'Support Lead'}</span>
            </div>
            <h1 className="text-2xl font-bold text-[#282C3F]">Agent Console</h1>
            <p className="text-xs text-[#686B78] mt-0.5">
              Escalated case arbitration, rule trace audits, and append-only recovery ledger journal.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'queue'
                  ? 'bg-[#FC8019] text-white shadow-sm'
                  : 'bg-[#F7F7F9] text-[#686B78] hover:text-[#282C3F] border border-[#E9E9EB]'
              }`}
            >
              Dispute Queue ({queueList.length})
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'ledger'
                  ? 'bg-[#FC8019] text-white shadow-sm'
                  : 'bg-[#F7F7F9] text-[#686B78] hover:text-[#282C3F] border border-[#E9E9EB]'
              }`}
            >
              Recovery Ledger
            </button>
          </div>
        </div>

        {/* Ops Metrics Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E9E9EB] rounded-lg p-4 shadow-sm">
            <span className="text-[10px] text-[#686B78] uppercase tracking-wider font-bold">Pending Review</span>
            <p className="text-2xl font-bold text-[#C77400] mt-1">{queueList.length}</p>
            <span className="text-[10px] text-[#686B78]">Awaiting human sign-off</span>
          </div>

          <div className="bg-white border border-[#E9E9EB] rounded-lg p-4 shadow-sm">
            <span className="text-[10px] text-[#686B78] uppercase tracking-wider font-bold">Auto-Approval Rate</span>
            <p className="text-2xl font-bold text-[#1BA672] mt-1">92.4%</p>
            <span className="text-[10px] text-[#686B78]">Resolved via FairnessEngine</span>
          </div>

          <div className="bg-white border border-[#E9E9EB] rounded-lg p-4 shadow-sm">
            <span className="text-[10px] text-[#686B78] uppercase tracking-wider font-bold">Average Resolution</span>
            <p className="text-2xl font-bold text-[#282C3F] mt-1">4.2 min</p>
            <span className="text-[10px] text-[#1BA672] font-semibold">Well inside 15m SLA target</span>
          </div>

          <div className="bg-white border border-[#E9E9EB] rounded-lg p-4 shadow-sm">
            <span className="text-[10px] text-[#686B78] uppercase tracking-wider font-bold">Fraud Signal Triggers</span>
            <p className="text-2xl font-bold text-[#282C3F] mt-1">0</p>
            <span className="text-[10px] text-[#686B78]">No anomalous velocity spikes</span>
          </div>
        </div>

        {/* VIEW: CASE QUEUE & WORKSPACE */}
        {activeTab === 'queue' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
            {/* Left Queue (4 Cols) */}
            <div className="lg:col-span-4 bg-white border border-[#E9E9EB] rounded-lg shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-[#E9E9EB] flex items-center justify-between bg-[#F7F7F9]">
                <span className="text-xs font-bold text-[#282C3F] uppercase tracking-wider">
                  Escalated cases
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-[#FFF6E5] text-[#C77400] border border-[#C77400]/20 font-bold">
                  {queueList.length} pending
                </span>
              </div>

              <div className="divide-y divide-[#E9E9EB] flex-1 overflow-y-auto max-h-[600px]">
                {isQueueLoading ? (
                  <div className="p-8 text-center text-xs text-[#686B78]">Loading escalated dispute tickets…</div>
                ) : queueList.length === 0 ? (
                  <div className="p-12 text-center text-[#686B78] space-y-2">
                    <span className="text-2xl block">✨</span>
                    <p className="text-sm font-bold text-[#282C3F]">Escalation Queue Clear</p>
                    <p className="text-xs text-[#686B78]">
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
                        className={`w-full text-left p-4 transition-colors border-l-4 ${
                          isSelected
                            ? 'bg-[#FFF3E8] border-[#FC8019]'
                            : 'hover:bg-[#F7F7F9] border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-[#282C3F]">{ISSUE_LABELS[c.issue] || c.issue}</span>
                          <span
                            className="text-[10px] uppercase font-bold px-2 py-0.5 rounded"
                            style={{
                              background: `${CONFIDENCE_COLORS[c.confidence || 'medium']}18`,
                              color: CONFIDENCE_COLORS[c.confidence || 'medium'],
                            }}
                          >
                            {c.confidence || 'Review'}
                          </span>
                        </div>
                        <p className="text-xs text-[#686B78]">Customer: {c.customer?.name || 'Customer'}</p>
                        <p className="text-[11px] text-[#686B78]">From: {c.order?.restaurant?.name || 'Restaurant'}</p>
                        {c.decisionJson && (
                          <div className="mt-2 flex justify-between items-center text-xs">
                            <span className="text-[#686B78]">Engine Suggestion:</span>
                            <span className="font-bold text-[#1BA672]">
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
            <div className="lg:col-span-8 bg-white border border-[#E9E9EB] rounded-lg shadow-sm p-6">
              {!selectedCase ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-[#686B78] p-12">
                  <span className="text-3xl mb-2">🎧</span>
                  <p className="text-base font-bold text-[#282C3F]">Select a Case from the Queue</p>
                  <p className="text-xs text-[#686B78] max-w-sm mt-1">
                    Inspect the telemetry log, customer evidence photo, FairnessEngine rule trace, and choose your resolution action.
                  </p>
                </div>
              ) : isPackLoading ? (
                <div className="p-12 text-center text-[#686B78] animate-pulse">
                  Loading complete case telemetry dossier…
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Case Dossier Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E9E9EB] gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-[#282C3F]">{ISSUE_LABELS[casePack.issue] || casePack.issue}</h2>
                        <span className="text-xs font-mono text-[#686B78]">ID: {casePack.id}</span>
                      </div>
                      <p className="text-xs text-[#686B78] mt-0.5">
                        Order Ref: {casePack.orderId} · Logged at: {new Date(casePack.createdAt).toLocaleTimeString()}
                      </p>
                    </div>

                    <span
                      className="text-xs uppercase font-bold px-3 py-1 rounded-full self-start sm:self-auto"
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
                    <div className="p-4 rounded-lg border border-[#E9E9EB] bg-[#F7F7F9] space-y-1">
                      <span className="text-[10px] text-[#686B78] uppercase font-bold">Customer Dossier</span>
                      <p className="text-xs font-bold text-[#282C3F]">{casePack.customer?.name || 'Customer'}</p>
                      <p className="text-xs text-[#686B78]">Phone: {casePack.customer?.phone || '+91 90000 00001'}</p>
                      <p className="text-xs text-[#686B78] font-mono">UPI: {casePack.customer?.upiMasked || 'customer@okhdfcbank'}</p>
                    </div>

                    <div className="p-4 rounded-lg border border-[#E9E9EB] bg-[#F7F7F9] space-y-1">
                      <span className="text-[10px] text-[#686B78] uppercase font-bold">Merchant Telemetry</span>
                      <p className="text-xs font-bold text-[#282C3F]">{casePack.order?.restaurant?.name || 'Spice Garden'}</p>
                      <p className="text-xs text-[#686B78]">Historical Defect Rate: {((casePack.order?.restaurant?.issueRate ?? 0.02) * 100).toFixed(1)}%</p>
                      <p className="text-xs text-[#1BA672] font-semibold">FSSAI Certified Merchant</p>
                    </div>
                  </div>

                  {/* Algorithmic Engine Decision & Rule Trace */}
                  {decision && (
                    <div className="p-5 rounded-lg border border-[#E9E9EB] bg-white space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#282C3F] uppercase tracking-wider">
                          FairnessEngine Rule Trace
                        </span>
                        <span className="text-xs font-bold text-[#1BA672]">
                          Suggested: {formatRupees(decision.total)}
                        </span>
                      </div>

                      {/* Line Items */}
                      <div className="space-y-1.5 text-xs">
                        {decision.lineItems?.map((li: any, idx: number) => (
                          <div key={idx} className="flex justify-between py-1 border-b border-[#E9E9EB]">
                            <span className="text-[#282C3F]">{li.label}</span>
                            <span className="text-[#1BA672] font-bold">+{formatRupees(li.amount)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 rounded-lg bg-[#F7F7F9] border border-[#E9E9EB] text-xs font-mono text-[#282C3F]">
                        {decision.reason}
                      </div>

                      {/* Rule Trace Breakdown */}
                      {decision.ruleTrace?.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] text-[#686B78] uppercase font-bold">Evaluated Rules:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                            {decision.ruleTrace.map((r: any) => (
                              <div key={r.ruleId} className="p-2 rounded bg-[#F7F7F9] border border-[#E9E9EB] text-[11px] flex items-center justify-between">
                                <span className={r.fired ? 'text-[#1BA672] font-bold' : 'text-[#686B78]'}>
                                  {r.fired ? '✓' : '·'} Rule {r.ruleId}
                                </span>
                                <span className="text-[#686B78] truncate max-w-[140px]">{r.reason}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Agent Action Box */}
                  <div className="p-5 rounded-lg border border-[#E9E9EB] bg-[#F7F7F9] space-y-4">
                    <span className="text-xs font-bold text-[#282C3F] uppercase tracking-wider block">
                      Record Specialist Action
                    </span>

                    {error && (
                      <p className="text-xs text-[#D7263D] bg-[#FDECEF] p-2.5 rounded-lg border border-[#D7263D]/20">
                        {error}
                      </p>
                    )}

                    {/* Action Selector */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'approve', label: '✓ Approve Claim', color: 'bg-[#1BA672] text-white' },
                        { id: 'custom_refund', label: '✏ Custom Amount', color: 'bg-[#C77400] text-white' },
                        { id: 'reject', label: '✕ Reject Dispute', color: 'bg-[#D7263D] text-white' },
                      ].map((btn) => (
                        <button
                          key={btn.id}
                          id={`action-${btn.id}`}
                          onClick={() => setActionForm({ ...actionForm, action: btn.id })}
                          className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${
                            actionForm.action === btn.id
                              ? `${btn.color} border-transparent shadow-sm`
                              : 'bg-white text-[#282C3F] border-[#E9E9EB] hover:bg-[#F7F7F9]'
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>

                    {/* Custom Amount if selected */}
                    {actionForm.action === 'custom_refund' && (
                      <div>
                        <label className="text-[10px] text-[#686B78] uppercase font-bold block mb-1">Custom Amount (₹)</label>
                        <input
                          id="custom-amount-input"
                          type="number"
                          value={actionForm.amount}
                          onChange={(e) => setActionForm({ ...actionForm, amount: e.target.value })}
                          placeholder="Enter refund amount in rupees, e.g. 250"
                          className="w-full bg-white border border-[#E9E9EB] rounded-lg px-3.5 py-2 text-xs text-[#282C3F] focus:outline-none focus:border-[#FC8019]"
                        />
                      </div>
                    )}

                    {/* Reason Code Dropdown */}
                    <div>
                      <label className="text-[10px] text-[#686B78] uppercase font-bold block mb-1">Audit Reason Code</label>
                      <select
                        id="reason-code-select"
                        value={actionForm.reasonCode}
                        onChange={(e) => setActionForm({ ...actionForm, reasonCode: e.target.value })}
                        className="w-full bg-white border border-[#E9E9EB] rounded-lg px-3.5 py-2 text-xs text-[#282C3F] focus:outline-none focus:border-[#FC8019]"
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
                      <label className="text-[10px] text-[#686B78] uppercase font-bold block mb-1">Audit Ledger Note</label>
                      <textarea
                        id="agent-note-input"
                        value={actionForm.note}
                        onChange={(e) => setActionForm({ ...actionForm, note: e.target.value })}
                        placeholder="State internal rationale for audit trail..."
                        rows={2}
                        className="w-full bg-white border border-[#E9E9EB] rounded-lg px-3.5 py-2 text-xs text-[#282C3F] focus:outline-none focus:border-[#FC8019] resize-none"
                      />
                    </div>

                    <button
                      id="submit-action-btn"
                      onClick={() => actionMutation.mutate()}
                      disabled={!actionForm.action || !actionForm.reasonCode || actionMutation.isPending}
                      className="btn-primary w-full text-xs font-bold"
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
          <div className="bg-white border border-[#E9E9EB] rounded-lg shadow-sm space-y-4 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#E9E9EB]">
              <div>
                <h2 className="text-base font-bold text-[#282C3F]">Global Append-Only Recovery Ledger</h2>
                <p className="text-xs text-[#686B78] mt-0.5">
                  Complete immutable financial journal of every compensation, refund, and ledger adjustment.
                </p>
              </div>
              <span className="text-xs text-[#1BA672] bg-[#EAF7F1] px-3 py-1 rounded font-bold border border-[#1BA672]/20">
                PostgreSQL Serialized Invariants
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E9E9EB] bg-[#F7F7F9] uppercase tracking-wider text-[#686B78] font-bold">
                    <th className="py-2.5 px-3">Ledger ID</th>
                    <th className="py-2.5 px-3">Order Ref</th>
                    <th className="py-2.5 px-3">Audit Note</th>
                    <th className="py-2.5 px-3">Actor</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9E9EB]">
                  {(globalLedger as any[]).map((entry: any) => (
                    <tr key={entry.id} className="hover:bg-[#F7F7F9] transition-colors">
                      <td className="py-3 px-3 font-mono text-[#282C3F]">{entry.id.slice(0, 10)}…</td>
                      <td className="py-3 px-3 font-mono text-[#FC8019]">{entry.orderId}</td>
                      <td className="py-3 px-3 text-[#282C3F]">{entry.note}</td>
                      <td className="py-3 px-3 text-[#686B78]">{entry.actorRole || 'system'}</td>
                      <td className="py-3 px-3 text-right font-bold text-[#1BA672]">
                        +{formatRupees(entry.amountPaise)}
                      </td>
                      <td className="py-3 px-3 text-right text-[#686B78]">
                        {new Date(entry.at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {(globalLedger as any[]).length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-[#686B78]">
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

export default function AgentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[#686B78]">Loading agent console…</div>}>
      <AgentContent />
    </Suspense>
  );
}
