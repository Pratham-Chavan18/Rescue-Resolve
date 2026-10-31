'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { resolveApi, ordersApi } from '@/lib/api-client';
import { formatRupees, formatWithDestination } from '@/lib/format';
import type { IssueKind, FairnessDecision } from '@swiggy/types';

const ISSUE_OPTIONS: { kind: IssueKind; label: string; emoji: string; desc: string }[] = [
  { kind: 'wrong_item', label: 'Wrong item delivered', emoji: '🔄', desc: 'I received something I didn\'t order' },
  { kind: 'missing_item', label: 'Item missing', emoji: '📦', desc: 'Something from my order wasn\'t delivered' },
  { kind: 'quality', label: 'Quality issue', emoji: '⚠️', desc: 'Food was poor quality or spoiled' },
  { kind: 'late_delivery', label: 'Late delivery', emoji: '⏱', desc: 'My order arrived very late' },
];

type Step = 'select-issue' | 'select-order' | 'evidence' | 'preview' | 'accepted';

export default function ResolvePage() {
  const router = useRouter();
  const { token } = useAuthStore();

  const [step, setStep] = useState<Step>('select-issue');
  const [selectedIssue, setSelectedIssue] = useState<IssueKind | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [decision, setDecision] = useState<FairnessDecision | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  const { data: completedOrders } = useQuery({
    queryKey: ['completed-orders'],
    queryFn: () => ordersApi.getMyOrder(token!),
    enabled: !!token,
  });

  const completedOrder = completedOrders?.id === 'order-demo-completed' ? completedOrders : null;
  // For demo, use the seeded completed order
  const [selectedOrderId] = useState('order-demo-completed');

  const createCaseMutation = useMutation({
    mutationFn: ({ issue }: { issue: IssueKind }) =>
      resolveApi.createCase(selectedOrderId, issue, token!),
    onSuccess: (data: any) => {
      setCaseId(data.id);
      setStep('evidence');
    },
    onError: (e: any) => setError(e.message),
  });

  const submitMutation = useMutation({
    mutationFn: () => resolveApi.submitCase(caseId!, token!),
    onSuccess: (data: any) => {
      setDecision(data as FairnessDecision);
      setStep('preview');
    },
    onError: (e: any) => setError(e.message),
  });

  const acceptMutation = useMutation({
    mutationFn: () => resolveApi.acceptCase(caseId!, token!),
    onSuccess: () => setStep('accepted'),
  });

  const escalateMutation = useMutation({
    mutationFn: () => resolveApi.escalateCase(caseId!, token!),
    onSuccess: () => setStep('accepted'),
  });

  async function handleEvidenceSubmit() {
    if (!caseId || !token) return;
    setError('');

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
  }

  const CONFIDENCE_LABELS: Record<string, string> = {
    high: 'Verified',
    medium: 'Likely',
    low: 'Needs review',
  };
  const CONFIDENCE_COLORS: Record<string, string> = {
    high: 'var(--ok)',
    medium: 'var(--warn)',
    low: 'var(--bad)',
  };

  useEffect(() => {
    if (!token) {
      router.push('/');
    }
  }, [token, router]);

  if (!token) return null;

  return (
    <div className="min-h-screen pb-8" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="card rounded-none px-4 py-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--line)' }}>
        <button id="resolve-back-btn" onClick={() => router.push('/track')} className="btn-ghost" style={{ width: 'auto', padding: '6px 10px' }}>←</button>
        <div>
          <h1 className="text-title">Report an issue</h1>
          <p className="text-meta">Resolve · Automated refund & credit</p>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4">
        {error && (
          <div className="card p-4 mb-4" style={{ background: 'var(--bad-soft)', border: '1px solid var(--bad)' }}>
            <p style={{ color: 'var(--bad)' }}>{error}</p>
          </div>
        )}

        {/* Step 1: Issue selection */}
        {step === 'select-issue' && (
          <div className="space-y-3 step-enter">
            <h2 className="text-title mb-4">What happened?</h2>
            {ISSUE_OPTIONS.map((opt) => (
              <button
                key={opt.kind}
                id={`issue-${opt.kind}`}
                onClick={() => {
                  setSelectedIssue(opt.kind);
                  createCaseMutation.mutate({ issue: opt.kind });
                }}
                disabled={createCaseMutation.isPending}
                className="card p-4 w-full text-left transition-all duration-150 hover:shadow-md border"
                style={{ border: '1.5px solid var(--line)', cursor: 'pointer' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{opt.emoji}</span>
                  <div>
                    <p className="text-body font-semibold" style={{ color: 'var(--ink)' }}>{opt.label}</p>
                    <p className="text-meta" style={{ letterSpacing: 0 }}>{opt.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Evidence */}
        {step === 'evidence' && (
          <div className="space-y-4 step-enter">
            <h2 className="text-title">Add evidence</h2>
            <p className="text-body" style={{ color: 'var(--ink-2)' }}>
              {selectedIssue === 'wrong_item' || selectedIssue === 'quality'
                ? 'Add a photo for faster resolution. We\'ll verify it automatically.'
                : selectedIssue === 'missing_item'
                ? 'Select the items that were missing from your order.'
                : 'No photo needed — we\'ll check delivery timestamps.'}
            </p>

            {(selectedIssue === 'wrong_item' || selectedIssue === 'quality') && (
              <div className="card p-4">
                <p className="text-meta uppercase tracking-widest mb-3">Photo evidence</p>
                <label
                  id="photo-upload-label"
                  htmlFor="photo-upload"
                  className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors"
                  style={{ borderColor: photoFile ? 'var(--accent)' : 'var(--line)', background: photoFile ? 'var(--accent-soft)' : 'var(--surface-sunk)' }}
                >
                  <span className="text-3xl mb-2">{photoFile ? '✅' : '📷'}</span>
                  <span className="text-body" style={{ color: 'var(--ink-2)' }}>
                    {photoFile ? photoFile.name : 'Tap to upload photo'}
                  </span>
                  <span className="text-meta">Max 2 MB · JPEG / PNG / WebP</span>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            <button
              id="submit-evidence-btn"
              onClick={handleEvidenceSubmit}
              disabled={submitMutation.isPending}
              className="btn-primary"
            >
              {submitMutation.isPending ? 'Evaluating…' : 'Check my entitlement →'}
            </button>
            <p className="text-meta text-center">We&apos;ll show you exactly what you&apos;ll get before you confirm.</p>
          </div>
        )}

        {/* Step 3: Preview decision */}
        {step === 'preview' && decision && (
          <div className="space-y-4 step-enter">
            <h2 className="text-title">Here&apos;s what you&apos;re owed</h2>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-meta uppercase tracking-widest">Confidence</span>
                <span
                  className="text-meta uppercase tracking-widest px-3 py-1 rounded-pill font-semibold"
                  style={{ background: `${CONFIDENCE_COLORS[decision.confidence]}18`, color: CONFIDENCE_COLORS[decision.confidence] }}
                >
                  {CONFIDENCE_LABELS[decision.confidence]}
                </span>
              </div>

              {/* Line items */}
              <div className="space-y-2 mb-4">
                {decision.lineItems.map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid var(--line)' }}>
                    <span className="text-body">{item.label}</span>
                    <div className="text-right">
                      <span className="amount text-body font-semibold" style={{ color: 'var(--ok)' }}>
                        +{formatRupees(item.amount)}
                      </span>
                      <p className="text-meta">
                        {item.destination === 'wallet' ? 'Swiggy wallet' : 'Source account'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-title font-semibold">Total</span>
                <div className="text-right">
                  <span className="amount text-title font-semibold" style={{ color: 'var(--ok)' }}>
                    +{formatRupees(decision.total)}
                  </span>
                  <p className="text-meta">{decision.destination === 'wallet' ? 'to Swiggy wallet' : 'to source account'}</p>
                </div>
              </div>
            </div>

            <div className="card p-4" style={{ background: 'var(--surface-sunk)' }}>
              <p className="text-body" style={{ color: 'var(--ink-2)' }}>{decision.reason}</p>
            </div>

            {decision.outcome === 'human_review' ? (
              <div>
                <p className="text-body text-center mb-4" style={{ color: 'var(--ink-2)' }}>
                  This case needs specialist review. An agent will respond within 15 minutes.
                </p>
                <button id="escalate-btn" onClick={() => escalateMutation.mutate()} className="btn-primary" disabled={escalateMutation.isPending}>
                  {escalateMutation.isPending ? 'Sending…' : 'Send to agent →'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button id="accept-resolution-btn" onClick={() => acceptMutation.mutate()} className="btn-primary" disabled={acceptMutation.isPending}>
                  {acceptMutation.isPending ? 'Confirming…' : `Accept +${formatRupees(decision.total)}`}
                </button>
                <button id="escalate-to-human-btn" onClick={() => escalateMutation.mutate()} className="btn-ghost w-full" disabled={escalateMutation.isPending}>
                  Talk to a human instead
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Accepted */}
        {step === 'accepted' && (
          <div className="card p-8 text-center step-enter">
            <div className="text-5xl mb-4">{decision?.outcome === 'human_review' ? '🎧' : '✅'}</div>
            <h2 className="text-title mb-2">
              {decision?.outcome === 'human_review' ? 'Sent to agent' : 'Done!'}
            </h2>
            <p className="text-body mb-6" style={{ color: 'var(--ink-2)' }}>
              {decision?.outcome === 'human_review'
                ? 'An agent will review your case and respond within 15 minutes.'
                : `${formatRupees(decision?.total ?? 0)} has been added to your ${decision?.destination === 'wallet' ? 'Swiggy wallet' : 'source account'}.`}
            </p>
            <button id="back-to-track-btn" onClick={() => router.push('/track')} className="btn-primary">
              Back to tracking
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
