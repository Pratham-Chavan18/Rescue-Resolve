'use client';

import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import Link from 'next/link';

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'What triggers Swiggy Rescue automatically?',
      a: 'Swiggy Rescue is powered by our real-time telemetry engine. It monitors rider GPS, kitchen prep times, and traffic conditions. If a kitchen is delayed by >8 minutes, a rider is stationary for >6 minutes, or ETA slips by >15 minutes, Rescue triggers proactive options without requiring you to file a complaint.',
    },
    {
      q: 'How does Swiggy Resolve calculate compensation?',
      a: 'Swiggy Resolve runs the deterministic FairnessEngine on pure TypeScript. For wrong items: 100% item refund + proportional delivery fee credit. For missing items: 100% missing item refund + 50% delivery fee credit. For late delivery: calibrated ₹50 / ₹75 / ₹100 tiers based on ETA overrun.',
    },
    {
      q: 'Where do refunds and credits get deposited?',
      a: 'Wallet credits are deposited immediately into your Swiggy Wallet (usable on any subsequent order). Source refunds are processed to your original UPI ID or card via our payment gateway within 2 to 4 business hours.',
    },
    {
      q: 'When does a case get escalated to an agent?',
      a: 'Cases trigger human review when the order value exceeds ₹1,500, when conflicting telemetry signals are detected, or when you explicitly choose "Talk to a human instead". Support agents review the audit trace within 15 minutes.',
    },
    {
      q: 'What are the photo evidence guidelines?',
      a: 'Photos should clearly show the delivered food container or bill label. File size must not exceed 2 MB. Accepted formats: JPEG, PNG, or WebP.',
    },
  ];

  return (
    <AppShell
      breadcrumbs={[
        { label: 'Customer' },
        { label: 'Help & Recovery Policies' },
      ]}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Help & Recovery SLA Policies</h1>
            <p className="text-xs text-white/50 mt-1">
              Transparent guarantees, algorithmic recovery rules, and resolution assistance.
            </p>
          </div>
          <Link
            href="/resolve"
            className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs transition shadow-lg shadow-orange-600/30 flex items-center gap-2 self-start sm:self-auto"
          >
            <span>🚨</span> Dispute an Order
          </Link>
        </div>

        {/* SLA Guarantee Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#18181b] border border-white/10 rounded-2xl p-5 shadow-lg">
            <span className="text-2xl mb-2 block">⚡</span>
            <h2 className="text-sm font-bold text-white">Swiggy Rescue SLA</h2>
            <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
              Detects in-flight delays before food is delivered. Offers choice of Wait Credit, Kitchen Replacement, or Full Cancellation.
            </p>
          </div>

          <div className="bg-[#18181b] border border-white/10 rounded-2xl p-5 shadow-lg">
            <span className="text-2xl mb-2 block">⚖️</span>
            <h2 className="text-sm font-bold text-white">FairnessEngine Guarantee</h2>
            <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
              Zero subjective bot friction. Mathematical entitlement rules are applied deterministically in milliseconds.
            </p>
          </div>

          <div className="bg-[#18181b] border border-white/10 rounded-2xl p-5 shadow-lg">
            <span className="text-2xl mb-2 block">🔒</span>
            <h2 className="text-sm font-bold text-white">Immutable Ledger</h2>
            <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
              Every refund and credit is permanently written to an append-only PostgreSQL ledger. Never revoked or deducted arbitrarily.
            </p>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white pb-3 border-b border-white/10">
            Frequently Asked Questions
          </h2>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden transition"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full text-left p-4 flex items-center justify-between text-sm font-semibold text-white hover:text-orange-400 transition"
                  >
                    <span>{faq.q}</span>
                    <span className="text-white/40 text-lg">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-white/60 leading-relaxed border-t border-white/5 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
