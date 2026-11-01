'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { resolveApi, ordersApi } from '@/lib/api-client';
import { formatRupees } from '@/lib/format';
import type { IssueKind, FairnessDecision } from '@swiggy/types';
import { AppShell } from '@/components/AppShell';
import {
  ArrowLeft,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Scale,
  ShieldCheck,
  Camera,
  FileCheck,
  ChevronRight,
  Headphones,
} from 'lucide-react';

const ISSUE_OPTIONS: { kind: IssueKind; label: string; emoji: string; desc: string; requiresPhoto: boolean }[] = [
  { kind: 'wrong_item', label: 'Wrong item delivered', emoji: '🔄', desc: 'Received a different dish or incorrect variant', requiresPhoto: true },
  { kind: 'missing_item', label: 'Item missing from order', emoji: '📦', desc: 'One or more items was absent from package', requiresPhoto: false },
  { kind: 'quality', label: 'Food quality or spoilage', emoji: '⚠️', desc: 'Cold food, spilling, stale, or contaminated', requiresPhoto: true },
  { kind: 'late_delivery', label: 'Severe delivery delay', emoji: '⏱', desc: 'Arrived significantly past the promised delivery window', requiresPhoto: false },
];

type Step = 'select-issue' | 'select-items' | 'evidence' | 'preview' | 'accepted';

export default function ResolvePage() {
  const router = useRouter();
  const { token } = useAuthStore();

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
        <div className="bg-white border border-[#E9E9EB] rounded-lg p-6 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              id="resolve-back-btn"
              onClick={() => {
                if (step === 'select-issue') router.push('/track');
                else setStep('select-issue');
              }}
              className="p-2 rounded-lg border border-[#E9E9EB] hover:bg-[#F7F7F9] text-[#282C3F] transition-colors text-sm"
              aria-label="Back"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-[#282C3F]">Report an issue</h1>
              <p className="text-xs text-[#686B78]">
                Swiggy Resolve · FairnessEngine automated compensation &amp; instant ledger credit
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded bg-[#EAF7F1] text-[#1BA672] border border-[#1BA672]/20 font-bold">
              FairnessEngine v1.4
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg border border-[#D7263D]/30 bg-[#FDECEF] text-[#D7263D] text-xs font-semibold flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-[#D7263D] hover:opacity-80">✕</button>
          </div>
        )}

        {/* Step 1: Select Issue */}
        {step === 'select-issue' && (
          <div className="bg-white border border-[#E9E9EB] rounded-lg p-6 shadow-sm space-y-6 step-enter">
            <div>
              <h2 className="text-base font-bold text-[#282C3F]">1. Select Problem Category</h2>
              <p className="text-xs text-[#686B78] mt-0.5">
                Our algorithmic engine evaluates your complaint against restaurant logs, rider GPS, and evidence.
              </p>
            </div>

            {/* Order Selector */}
            <div className="p-4 rounded-lg border border-[#E9E9EB] bg-[#F7F7F9]">
              <label className="text-[11px] font-bold text-[#686B78] uppercase tracking-wider block mb-1.5">
                Order Being Disputed
              </label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full bg-white border border-[#E9E9EB] rounded-lg px-3.5 py-2 text-xs text-[#282C3F] focus:outline-none focus:border-[#FC8019]"
              >
                <option value="order-demo-completed">#order-demo-completed · Spice Garden (Indiranagar) · Delivered (₹480)</option>
                <option value="order-demo-live">#order-demo-live · Spice Garden (Indiranagar) · Live In-Flight (₹585)</option>
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
                  className={`p-4 rounded-lg text-left border transition-colors cursor-pointer flex items-start gap-3.5 ${
                    selectedIssue === opt.kind
                      ? 'border-[#FC8019] bg-[#FFF3E8]'
                      : 'border-[#E9E9EB] bg-white hover:border-[#FC8019]/40 hover:bg-[#F7F7F9]'
                  }`}
                >
                  <span className="text-2xl mt-0.5">{opt.emoji}</span>
                  <div>
                    <p className="text-xs font-bold text-[#282C3F]">{opt.label}</p>
                    <p className="text-[11px] text-[#686B78] mt-1 leading-relaxed">{opt.desc}</p>
                    {opt.requiresPhoto && (
                      <span className="inline-block mt-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#F7F7F9] text-[#686B78] border border-[#E9E9EB]">
                        Photo Required
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-[#E9E9EB] flex justify-end">
              <button
                id="issue-continue-btn"
                disabled={!selectedIssue || createCaseMutation.isPending}
                onClick={() => {
                  if (selectedIssue) createCaseMutation.mutate({ issue: selectedIssue });
                }}
                className="btn-primary text-xs font-bold"
              >
                {createCaseMutation.isPending ? 'Initiating Dispute Session…' : 'Continue to Evidence →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Items (For Wrong or Missing item) */}
        {step === 'select-items' && (
          <div className="bg-white border border-[#E9E9EB] rounded-lg p-6 shadow-sm space-y-6 step-enter">
            <div>
              <h2 className="text-base font-bold text-[#282C3F]">2. Select Affected Items</h2>
              <p className="text-xs text-[#686B78] mt-0.5">
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
                    className={`p-3.5 rounded-lg border transition-colors cursor-pointer flex items-center justify-between ${
                      isChecked
                        ? 'border-[#FC8019] bg-[#FFF3E8]'
                        : 'border-[#E9E9EB] bg-white hover:bg-[#F7F7F9]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] font-bold ${
                        isChecked ? 'bg-[#FC8019] border-[#FC8019] text-white' : 'border-[#E9E9EB] text-transparent'
                      }`}>
                        ✓
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#282C3F]">{item.name}</p>
                        <p className="text-[10px] text-[#686B78]">{item.isVeg ? 'Veg' : 'Non-Veg'}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#282C3F]">{formatRupees(item.pricePaise)}</span>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-[#E9E9EB] flex items-center justify-between">
              <button
                onClick={() => setStep('select-issue')}
                className="btn-ghost text-xs"
              >
                ← Change Issue
              </button>
              <button
                onClick={() => setStep('evidence')}
                disabled={selectedItemIds.length === 0}
                className="btn-primary text-xs font-bold"
              >
                Continue to Photo Proof ({selectedItemIds.length} selected) →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Evidence (Photo Upload) */}
        {step === 'evidence' && (
          <div className="bg-white border border-[#E9E9EB] rounded-lg p-6 shadow-sm space-y-6 step-enter">
            <div>
              <h2 className="text-base font-bold text-[#282C3F]">3. Provide Evidence Proof</h2>
              <p className="text-xs text-[#686B78] mt-0.5">
                Provide clear picture of food packaging label to trigger instant algorithmic approval.
              </p>
            </div>

            {/* Upload Zone */}
            <div className="space-y-4">
              <label
                id="photo-upload-label"
                htmlFor="photo-upload"
                className={`flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                  photoPreview
                    ? 'border-[#1BA672] bg-[#EAF7F1]'
                    : 'border-[#E9E9EB] bg-[#F7F7F9] hover:bg-[#FFF3E8] hover:border-[#FC8019]'
                }`}
              >
                {photoPreview ? (
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={photoPreview}
                      alt="Uploaded dispute proof"
                      className="w-48 h-36 object-cover rounded-lg border border-[#E9E9EB] shadow-sm"
                    />
                    <p className="text-xs text-[#1BA672] font-bold flex items-center gap-1.5">
                      <span>✓</span> {photoFile?.name} ({(photoFile?.size ? photoFile.size / 1024 : 0).toFixed(0)} KB)
                    </p>
                    <span className="text-[11px] text-[#686B78] underline">Click to change photo</span>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-white border border-[#E9E9EB] flex items-center justify-center mx-auto text-[#FC8019]">
                      <Camera size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#282C3F]">Upload photo</p>
                      <p className="text-[11px] text-[#686B78] mt-0.5">Drag and drop or browse files</p>
                    </div>
                    <span className="inline-block text-[10px] text-[#686B78] px-2 py-0.5 rounded bg-white border border-[#E9E9EB]">
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

            <div className="pt-4 border-t border-[#E9E9EB] flex items-center justify-between">
              <button
                onClick={() => setStep(selectedIssue === 'quality' ? 'select-issue' : 'select-items')}
                className="btn-ghost text-xs"
              >
                ← Back
              </button>
              <button
                id="submit-evidence-btn"
                onClick={handleEvidenceSubmit}
                disabled={submitMutation.isPending}
                className="btn-primary text-xs font-bold"
              >
                {submitMutation.isPending ? 'Evaluating via FairnessEngine…' : 'Check my entitlement →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Preview Decision */}
        {step === 'preview' && decision && (
          <div className="bg-white border border-[#E9E9EB] rounded-lg p-6 shadow-sm space-y-6 step-enter">
            <div className="flex items-center justify-between pb-4 border-b border-[#E9E9EB]">
              <div>
                <span className="text-[11px] text-[#686B78] uppercase tracking-wider font-bold">Compensation Preview</span>
                <h2 className="text-xl font-bold text-[#282C3F] mt-0.5">Here&apos;s what you&apos;re owed</h2>
              </div>
              <span className="text-xs uppercase tracking-wider px-3 py-1 rounded font-bold bg-[#EAF7F1] text-[#1BA672] border border-[#1BA672]/20">
                {CONFIDENCE_LABELS[decision.confidence] ?? 'Automated Resolution'}
              </span>
            </div>

            {/* Line items breakdown */}
            <div className="space-y-3 bg-[#F7F7F9] border border-[#E9E9EB] rounded-lg p-4">
              <span className="text-[11px] text-[#686B78] uppercase tracking-wider block font-bold">Entitlement Line Items</span>
              {decision.lineItems.map((item, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-[#E9E9EB] last:border-0">
                  <div>
                    <span className="text-xs font-bold text-[#282C3F]">{item.label}</span>
                    <p className="text-[11px] text-[#686B78]">
                      Destination: {item.destination === 'wallet' ? 'Instant Swiggy Wallet' : 'Original Payment Source'}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[#1BA672]">
                    +{formatRupees(item.amount)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total Highlight */}
            <div className="bg-[#EAF7F1] border border-[#1BA672]/30 rounded-lg p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-[#1BA672] font-bold uppercase tracking-wider">Total Approved Recovery</p>
                <p className="text-xs text-[#282C3F] mt-0.5">
                  Credited to: <strong className="text-[#282C3F]">{decision.destination === 'wallet' ? 'Swiggy Wallet' : 'Source UPI/Card'}</strong>
                </p>
              </div>
              <span className="text-2xl font-bold text-[#1BA672]">
                +{formatRupees(decision.total)}
              </span>
            </div>

            {/* Reason Trace Card */}
            <div className="bg-[#F7F7F9] border border-[#E9E9EB] rounded-lg p-4">
              <span className="text-[11px] text-[#686B78] uppercase tracking-wider block font-bold mb-1">Audit Policy Evaluation</span>
              <p className="text-xs text-[#282C3F] leading-relaxed font-mono">
                {decision.reason}
              </p>
            </div>

            {/* Action Buttons */}
            {decision.outcome === 'human_review' ? (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-[#C77400] bg-[#FFF6E5] border border-[#C77400]/20 p-3 rounded-lg text-center font-medium">
                  ⚠️ This case triggered priority human review (order value or conflicting telemetry). An agent is reviewing the evidence.
                </p>
                <button
                  id="escalate-btn"
                  onClick={() => escalateMutation.mutate()}
                  disabled={escalateMutation.isPending}
                  className="btn-primary w-full text-xs font-bold"
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
                  className="btn-primary w-full text-xs font-bold !bg-[#1BA672] hover:!bg-[#158057]"
                >
                  {acceptMutation.isPending ? 'Confirming Ledger Credit…' : `Accept & Credit +${formatRupees(decision.total)}`}
                </button>
                <button
                  id="escalate-to-human-btn"
                  onClick={() => escalateMutation.mutate()}
                  disabled={escalateMutation.isPending}
                  className="btn-secondary w-full text-xs font-semibold"
                >
                  I want a support specialist to review this manually instead
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Accepted State */}
        {step === 'accepted' && (
          <div className="bg-white border border-[#E9E9EB] rounded-lg p-8 text-center space-y-6 step-enter shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#EAF7F1] text-[#1BA672] flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#282C3F]">
                {decision?.outcome === 'human_review' ? 'Dispute Escalated to Support Queue' : 'Dispute Resolved & Recorded'}
              </h2>
              <p className="text-xs text-[#686B78] max-w-md mx-auto mt-2 leading-relaxed">
                {decision?.outcome === 'human_review'
                  ? 'Case ID #' + (caseId || 'CASE-9021') + ' has been routed to our L2 Operations specialist. Target resolution within 15 mins.'
                  : `${formatRupees(decision?.total ?? 0)} has been posted to the append-only Recovery Ledger and credited to your ${decision?.destination === 'wallet' ? 'Swiggy wallet' : 'source account'}.`}
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                id="back-to-track-btn"
                onClick={() => router.push('/track')}
                className="btn-secondary text-xs font-bold w-full sm:w-auto"
              >
                Track Live Order
              </button>
              <button
                onClick={() => router.push('/recovery-history')}
                className="btn-primary text-xs font-bold w-full sm:w-auto"
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
