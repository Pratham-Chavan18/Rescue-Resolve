'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { resolveApi, ordersApi } from '@/lib/api-client';
import { formatRupees } from '@/lib/format';
import type { IssueKind, FairnessDecision } from '@swiggy/types';
import { AppShell } from '@/components/AppShell';

const ISSUE_OPTIONS: { kind: IssueKind; label: string; emoji: string; desc: string; requiresPhoto: boolean }[] = [
  { kind: 'wrong_item', label: 'Wrong item delivered', emoji: '🔄', desc: 'Received a different dish or incorrect variant', requiresPhoto: true },
  { kind: 'missing_item', label: 'Item missing from order', emoji: '📦', desc: 'One or more items was absent from package', requiresPhoto: false },
  { kind: 'quality', label: 'Food quality or spoilage', emoji: '⚠️', desc: 'Cold food, spilling, stale, or contaminated', requiresPhoto: true },
  { kind: 'late_delivery', label: 'Severe delivery delay', emoji: '⏱', desc: 'Arrived significantly past the promised delivery window', requiresPhoto: false },
];

type Step = 'select-issue' | 'select-items' | 'evidence' | 'preview' | 'accepted';

export default function ResolvePage() {
  const router = useRouter();
  const { token, user } = useAuthStore();

  const [step, setStep] = useState<Step>('select-issue');
  const [selectedIssue, setSelectedIssue] = useState<IssueKind | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState('order-demo-completed');
  const [caseId, setCaseId] = useState<string | null>(null);
  const [decision, setDecision] = useState<FairnessDecision | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  // Fetch customer orders for selection
  const { data: allOrders } = useQuery({
    queryKey: ['all-my-orders'],
    queryFn: () => ordersApi.getMyOrder(token!),
    enabled: !!token,
  });

  const activeOrder = allOrders;

  const createCaseMutation = useMutation({
    mutationFn: ({ issue }: { issue: IssueKind }) =>
      resolveApi.createCase(selectedOrderId, issue, token!),
    onSuccess: (data: any) => {
      setCaseId(data.id);
      if (selectedIssue === 'wrong_item' || selectedIssue === 'quality') {
        setStep('evidence');
      } else if (selectedIssue === 'missing_item') {
        setStep('select-items');
      } else {
        // late_delivery needs no extra info, can check entitlement directly
        submitMutation.mutate();
      }
    },
    onError: (e: any) => setError(e.message || 'Failed to start dispute case'),
  });

  const submitMutation = useMutation({
    mutationFn: () => resolveApi.submitCase(caseId!, token!),
    onSuccess: (data: any) => {
      setDecision(data as FairnessDecision);
      setStep('preview');
    },
    onError: (e: any) => setError(e.message || 'Failed to calculate fairness entitlement'),
  });

  const acceptMutation = useMutation({
    mutationFn: () => resolveApi.acceptCase(caseId!, token!),
    onSuccess: () => setStep('accepted'),
    onError: (e: any) => setError(e.message || 'Failed to accept resolution'),
  });

  const escalateMutation = useMutation({
    mutationFn: () => resolveApi.escalateCase(caseId!, token!),
    onSuccess: () => setStep('accepted'),
    onError: (e: any) => setError(e.message || 'Failed to escalate to agent queue'),
  });

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Photo exceeds strict 2 MB specification limit. Please choose a smaller image.');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setError('');
    }
  }

  function toggleItemSelection(itemId: string) {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  }

  async function handleEvidenceSubmit() {
    if (!caseId || !token) return;
    setError('');

    try {
      if (photoFile) {
        const fd = new FormData();
        fd.append('photo', photoFile);
        await resolveApi.addEvidence(caseId, fd, token);
      }

      if (selectedItemIds.length > 0) {
        const fd = new FormData();
        fd.append('itemIds', JSON.stringify(selectedItemIds));
        await resolveApi.addEvidence(caseId, fd, token);
      }

      submitMutation.mutate();
    } catch (err: any) {
      setError(err.message || 'Failed to upload dispute evidence');
    }
  }

  useEffect(() => {
    if (!token) {
      router.push('/');
    }
  }, [token, router]);

  if (!token) return null;

  const CONFIDENCE_LABELS: Record<string, string> = {
    high: 'Algorithmic Guarantee',
    medium: 'Verified by Telemetry',
    low: 'Flagged for Specialist Audit',
  };

  const CONFIDENCE_COLORS: Record<string, string> = {
    high: 'var(--ok)',
    medium: 'var(--warn)',
    low: 'var(--bad)',
  };

  const demoItems = [
    { id: 'item-demo-biryani', name: 'Special Chicken Biryani (Family Pack)', pricePaise: 38000, isVeg: false },
    { id: 'item-demo-raita', name: 'Cucumber Onion Raita (Special)', pricePaise: 6000, isVeg: true },
    { id: 'item-demo-salan', name: 'Mirchi Ka Salan (Extra Spicy)', pricePaise: 4000, isVeg: true },
  ];

  return (
    <AppShell
      breadcrumbs={[
        { label: 'Customer' },
        { label: 'Swiggy Resolve' },
      ]}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              id="resolve-back-btn"
              onClick={() => {
                if (step === 'select-issue') router.push('/track');
                else setStep('select-issue');
              }}
              className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition text-sm"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Report an issue</h1>
              <p className="text-xs text-white/50">
                Swiggy Resolve · FairnessEngine automated compensation & instant ledger credit
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              Pure TS Engine v1.4
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-rose-300 hover:text-white">✕</button>
          </div>
        )}

        {/* Step 1: Select Issue */}
        {step === 'select-issue' && (
          <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6 step-enter">
            <div>
              <h2 className="text-base font-bold text-white">1. Select Problem Category</h2>
              <p className="text-xs text-white/50 mt-0.5">
                Our algorithmic engine evaluates your complaint against restaurant logs, rider GPS, and evidence.
              </p>
            </div>

            {/* Order Selector */}
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <label className="text-xs font-semibold text-white/60 uppercase tracking-wider block mb-2">
                Order Being Disputed
              </label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
              >
                <option value="order-demo-completed">#order-demo-completed · Meghana Foods (Indiranagar) · Delivered (₹480)</option>
                <option value="order-demo-live">#order-demo-live · Meghana Foods (Indiranagar) · Live In-Flight (₹480)</option>
              </select>
            </div>

            {/* Issue Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ISSUE_OPTIONS.map((opt) => (
                <button
                  key={opt.kind}
                  id={`issue-option-${opt.kind}`}
                  data-testid={`issue-${opt.kind}`}
                  onClick={() => setSelectedIssue(opt.kind)}
                  className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex items-start gap-3.5 ${
                    selectedIssue === opt.kind
                      ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <span className="text-2xl mt-0.5">{opt.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{opt.label}</p>
                    <p className="text-xs text-white/50 mt-1 leading-relaxed">{opt.desc}</p>
                    {opt.requiresPhoto && (
                      <span className="inline-block mt-2 text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 text-white/60 border border-white/10">
                        Photo Required
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end">
              <button
                id="issue-continue-btn"
                disabled={!selectedIssue || createCaseMutation.isPending}
                onClick={() => {
                  if (selectedIssue) createCaseMutation.mutate({ issue: selectedIssue });
                }}
                className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-orange-600/30 transition flex items-center gap-2"
              >
                {createCaseMutation.isPending ? 'Initiating Dispute Session…' : 'Continue to Evidence →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Items (For Wrong or Missing item) */}
        {step === 'select-items' && (
          <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6 step-enter">
            <div>
              <h2 className="text-base font-bold text-white">2. Select Affected Items</h2>
              <p className="text-xs text-white/50 mt-0.5">
                Check each item from your bill that was missing or incorrectly fulfilled.
              </p>
            </div>

            <div className="space-y-2">
              {demoItems.map((item) => {
                const isChecked = selectedItemIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItemSelection(item.id)}
                    className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                      isChecked
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs font-bold ${
                        isChecked ? 'bg-orange-600 border-orange-500 text-white' : 'border-white/30 text-transparent'
                      }`}>
                        ✓
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{item.name}</p>
                        <p className="text-xs text-white/40">{item.isVeg ? 'Veg' : 'Non-Veg'}</p>
                      </div>
                    </div>
                    <span className="text-sm font-mono text-white/90">{formatRupees(item.pricePaise)}</span>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={() => setStep('select-issue')}
                className="px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white"
              >
                ← Change Issue
              </button>
              <button
                onClick={() => setStep('evidence')}
                disabled={selectedItemIds.length === 0}
                className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold text-sm transition"
              >
                Continue to Photo Proof ({selectedItemIds.length} selected) →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Evidence (Photo Upload) */}
        {step === 'evidence' && (
          <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6 step-enter">
            <div>
              <h2 className="text-base font-bold text-white">3. Provide Evidence Proof</h2>
              <p className="text-xs text-white/50 mt-0.5">
                Provide clear picture or food packaging label to trigger instant algorithmic approval.
              </p>
            </div>

            {/* Upload Zone */}
            <div className="space-y-4">
              <label
                id="photo-upload-label"
                htmlFor="photo-upload"
                className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                  photoPreview
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-white/15 bg-white/[0.02] hover:bg-white/5 hover:border-orange-500/40'
                }`}
              >
                {photoPreview ? (
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={photoPreview}
                      alt="Uploaded dispute proof"
                      className="w-48 h-36 object-cover rounded-xl border border-white/20 shadow-md"
                    />
                    <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                      <span>✓</span> {photoFile?.name} ({(photoFile?.size ? photoFile.size / 1024 : 0).toFixed(0)} KB)
                    </p>
                    <span className="text-[11px] text-white/40 underline">Click to change photo</span>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-xl">
                      📷
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Upload photo</p>
                      <p className="text-xs text-white/50 mt-0.5">Drag and drop or browse files</p>
                    </div>
                    <span className="inline-block text-[10px] text-white/40 font-mono px-2 py-0.5 rounded bg-white/5">
                      Max 2 MB · JPEG / PNG / WebP
                    </span>
                  </div>
                )}

                <input
                  id="photo-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={() => setStep(selectedIssue === 'quality' ? 'select-issue' : 'select-items')}
                className="px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white"
              >
                ← Back
              </button>
              <button
                id="submit-evidence-btn"
                onClick={handleEvidenceSubmit}
                disabled={submitMutation.isPending}
                className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-orange-600/30 transition flex items-center gap-2"
              >
                {submitMutation.isPending ? 'Evaluating via FairnessEngine…' : 'Check my entitlement →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Preview Decision */}
        {step === 'preview' && decision && (
          <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6 step-enter">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <span className="text-xs text-white/40 uppercase tracking-wider font-semibold">Compensation Preview</span>
                <h2 className="text-xl font-bold text-white mt-0.5">Here&apos;s what you&apos;re owed</h2>
              </div>
              <span
                className="text-xs uppercase tracking-wider px-3 py-1 rounded-full font-semibold border"
                style={{
                  background: `${CONFIDENCE_COLORS[decision.confidence]}18`,
                  color: CONFIDENCE_COLORS[decision.confidence],
                  borderColor: `${CONFIDENCE_COLORS[decision.confidence]}40`,
                }}
              >
                {CONFIDENCE_LABELS[decision.confidence]}
              </span>
            </div>

            {/* Line items breakdown */}
            <div className="space-y-3 bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <span className="text-xs text-white/40 uppercase tracking-wider block mb-1">Entitlement Line Items</span>
              {decision.lineItems.map((item, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                  <div>
                    <span className="text-sm font-medium text-white">{item.label}</span>
                    <p className="text-[11px] text-white/40">
                      Destination: {item.destination === 'wallet' ? 'Instant Swiggy Wallet' : 'Original Payment Source'}
                    </p>
                  </div>
                  <span className="text-base font-mono font-bold text-emerald-400">
                    +{formatRupees(item.amount)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total Highlight */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">Total Approved Recovery</p>
                <p className="text-xs text-white/60 mt-0.5">
                  Credited to: <strong className="text-white">{decision.destination === 'wallet' ? 'Swiggy Wallet' : 'Source UPI/Card'}</strong>
                </p>
              </div>
              <span className="text-2xl font-mono font-bold text-emerald-400">
                +{formatRupees(decision.total)}
              </span>
            </div>

            {/* Reason Trace Card */}
            <div className="bg-white/5 border border-white/5 rounded-xl p-4">
              <span className="text-xs text-white/40 uppercase tracking-wider block mb-1">Audit Policy Evaluation</span>
              <p className="text-xs text-white/80 leading-relaxed font-mono">
                {decision.reason}
              </p>
            </div>

            {/* Action Buttons */}
            {decision.outcome === 'human_review' ? (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-center">
                  ⚠️ This case triggered priority human review (order value or conflicting telemetry). An agent is reviewing the evidence.
                </p>
                <button
                  id="escalate-btn"
                  onClick={() => escalateMutation.mutate()}
                  disabled={escalateMutation.isPending}
                  className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm shadow-lg shadow-orange-600/30 transition"
                >
                  {escalateMutation.isPending ? 'Forwarding to Agent Queue…' : 'Send to Support Specialist →'}
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <button
                  id="accept-resolution-btn"
                  onClick={() => acceptMutation.mutate()}
                  disabled={acceptMutation.isPending}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition"
                >
                  {acceptMutation.isPending ? 'Confirming Ledger Credit…' : `Accept & Credit +${formatRupees(decision.total)}`}
                </button>
                <button
                  id="escalate-to-human-btn"
                  onClick={() => escalateMutation.mutate()}
                  disabled={escalateMutation.isPending}
                  className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/70 hover:text-white transition"
                >
                  I want a support specialist to review this manually instead
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Accepted State */}
        {step === 'accepted' && (
          <div className="bg-[#18181b] border border-white/10 rounded-2xl p-8 text-center space-y-6 step-enter shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-3xl">
              {decision?.outcome === 'human_review' ? '🎧' : '✅'}
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white">
                {decision?.outcome === 'human_review' ? 'Dispute Escalated to Support Queue' : 'Dispute Resolved & Recorded'}
              </h2>
              <p className="text-sm text-white/60 max-w-md mx-auto mt-2 leading-relaxed">
                {decision?.outcome === 'human_review'
                  ? 'Case ID #' + (caseId || 'CASE-9021') + ' has been routed to our L2 Operations specialist. Target resolution within 15 mins.'
                  : `${formatRupees(decision?.total ?? 0)} has been posted to the append-only Recovery Ledger and credited to your ${decision?.destination === 'wallet' ? 'Swiggy wallet' : 'source account'}.`}
              </p>
            </div>

            <div className="pt-4 flex items-center justify-center gap-3">
              <button
                id="back-to-track-btn"
                onClick={() => router.push('/track')}
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition"
              >
                Track Live Order
              </button>
              <button
                onClick={() => router.push('/recovery-history')}
                className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm transition"
              >
                View Recovery History →
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
