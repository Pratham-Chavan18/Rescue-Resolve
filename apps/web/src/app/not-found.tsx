'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Home, ShoppingBag, ShieldAlert, Scale } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

export default function NotFoundPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const role = user?.role ?? 'customer';

  const homePath =
    role === 'restaurant'
      ? '/partner/restaurant'
      : role === 'rider'
      ? '/partner/rider'
      : role === 'agent'
      ? '/agent'
      : '/dashboard';

  return (
    <div className="min-h-screen bg-white text-[#282C3F] flex flex-col justify-between p-6">
      <header className="border-b border-[#E9E9EB] pb-4 flex items-center justify-between max-w-4xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#FC8019] flex items-center justify-center text-white font-bold text-base">
            S
          </div>
          <span className="font-bold text-sm tracking-tight text-[#282C3F]">
            Swiggy Unified Recovery
          </span>
        </Link>
        <span className="text-xs text-[#686B78] font-medium">Error 404</span>
      </header>

      <main className="max-w-md mx-auto my-auto text-center py-12 px-4 space-y-6">
        <div className="w-16 h-16 rounded-full bg-[#FFF3E8] text-[#FC8019] mx-auto flex items-center justify-center">
          <AlertCircle size={32} />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-[#282C3F] tracking-tight">
            Page Not Found
          </h1>
          <p className="text-sm text-[#686B78] mt-2 leading-relaxed">
            The page you requested does not exist or may have moved. Use one of the options below to resume your recovery workflow.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => router.back()}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
          <Link
            href={homePath}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Home size={16} />
            Return to Dashboard
          </Link>
        </div>

        <div className="border-t border-[#E9E9EB] pt-6 grid grid-cols-3 gap-2 text-xs">
          <Link
            href="/orders"
            className="p-3 rounded-lg border border-[#E9E9EB] hover:bg-[#F7F7F9] text-center text-[#282C3F] font-medium block"
          >
            <ShoppingBag size={16} className="mx-auto mb-1 text-[#686B78]" />
            My Orders
          </Link>
          <Link
            href="/rescue"
            className="p-3 rounded-lg border border-[#E9E9EB] hover:bg-[#F7F7F9] text-center text-[#282C3F] font-medium block"
          >
            <ShieldAlert size={16} className="mx-auto mb-1 text-[#FC8019]" />
            Rescue Hub
          </Link>
          <Link
            href="/resolve"
            className="p-3 rounded-lg border border-[#E9E9EB] hover:bg-[#F7F7F9] text-center text-[#282C3F] font-medium block"
          >
            <Scale size={16} className="mx-auto mb-1 text-[#1BA672]" />
            File Dispute
          </Link>
        </div>
      </main>

      <footer className="text-center text-xs text-[#686B78] border-t border-[#E9E9EB] pt-4 max-w-4xl mx-auto w-full">
        Swiggy Unified Recovery Platform · Transparent, algorithmic order resilience
      </footer>
    </div>
  );
}
