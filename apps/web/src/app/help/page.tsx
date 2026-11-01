'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import Link from 'next/link';
import {
  HelpCircle,
  Zap,
  Scale,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  FileCheck2,
  PhoneCall,
  Clock,
} from 'lucide-react';

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
        {/* Header Card */}
        <div className="p-6 rounded-lg bg-white border border-[#E9E9EB] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-[#FFF3E8] text-[#FC8019]">
                <HelpCircle size={20} />
              </span>
              <h1 className="text-xl font-bold text-[#282C3F]">Help &amp; Recovery SLA Policies</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#FFF3E8] text-[#FC8019] border border-[#FC8019]/20">
                Transparent Guarantees
              </span>
            </div>
            <p className="text-xs text-[#686B78] max-w-2xl">
              Understand our mathematical recovery algorithms, proactive delay detection rules, and instant dispute resolution terms.
            </p>
          </div>

          <Link
            href="/resolve"
            className="btn-primary !py-2.5 !px-4 text-xs font-bold flex items-center gap-2 self-start sm:self-auto"
          >
            <span>🚨</span>
            <span>Dispute an Order</span>
          </Link>
        </div>

        {/* SLA Guarantee Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-lg bg-white border border-[#E9E9EB] shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-lg bg-[#FFF3E8] text-[#FC8019] flex items-center justify-center">
              <Zap size={18} />
            </div>
            <h2 className="text-sm font-bold text-[#282C3F]">Swiggy Rescue SLA</h2>
            <p className="text-xs text-[#686B78] leading-relaxed">
              Detects in-flight delays before food is delivered. Offers choice of Wait Credit, Kitchen Replacement, or Full Cancellation.
            </p>
          </div>

          <div className="p-5 rounded-lg bg-white border border-[#E9E9EB] shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-lg bg-[#EAF7F1] text-[#1BA672] flex items-center justify-center">
              <Scale size={18} />
            </div>
            <h2 className="text-sm font-bold text-[#282C3F]">FairnessEngine Guarantee</h2>
            <p className="text-xs text-[#686B78] leading-relaxed">
              Zero subjective bot friction. Mathematical entitlement rules are applied deterministically in milliseconds without endless chats.
            </p>
          </div>

          <div className="p-5 rounded-lg bg-white border border-[#E9E9EB] shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-lg bg-[#F7F7F9] text-[#282C3F] flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
            <h2 className="text-sm font-bold text-[#282C3F]">Immutable Ledger</h2>
            <p className="text-xs text-[#686B78] leading-relaxed">
              Every refund and credit is permanently written to an append-only PostgreSQL ledger. Never revoked or deducted arbitrarily.
            </p>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="rounded-lg bg-white border border-[#E9E9EB] shadow-sm p-6 space-y-4">
          <div className="border-b border-[#E9E9EB] pb-3">
            <h2 className="text-base font-bold text-[#282C3F]">Frequently Asked Questions</h2>
            <p className="text-xs text-[#686B78] mt-0.5">Everything you need to know about proactive orders and dispute recovery</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-lg border border-[#E9E9EB] bg-[#F7F7F9] overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full text-left p-4 flex items-center justify-between text-xs font-bold text-[#282C3F] hover:text-[#FC8019] transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <span className="text-[#686B78]">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs text-[#686B78] leading-relaxed border-t border-[#E9E9EB] bg-white">
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
