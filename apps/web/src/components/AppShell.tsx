'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  ShoppingBag,
  MapPin,
  ShieldAlert,
  Scale,
  History,
  HelpCircle,
  User as UserIcon,
  ChefHat,
  Bell,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Bike,
  Package,
  Layers,
  Inbox,
  FileText,
  BookOpen,
  Menu,
  X,
  LogOut,
  Zap,
  ChevronRight,
  Radio,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { SimulatorDrawer } from './SimulatorDrawer';
import { authApi } from '@/lib/api-client';

interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
}

export interface AppShellProps {
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export function AppShell({ children, breadcrumbs }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, setAuth, clearAuth } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Quick switch role handler
  async function switchRole(phone: string) {
    try {
      const res = await authApi.verifyOtp(phone, '1234');
      setAuth(res.accessToken, res.user);
      setRoleMenuOpen(false);
      if (res.user.role === 'customer') router.push('/dashboard');
      else if (res.user.role === 'restaurant') router.push('/partner/restaurant');
      else if (res.user.role === 'rider') router.push('/partner/rider');
      else if (res.user.role === 'agent') router.push('/agent');
    } catch (e) {
      console.error(e);
    }
  }

  // Navigation Items per Role
  const customerNav: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    { label: 'My Orders', href: '/orders', icon: ShoppingBag },
    { label: 'Track Order', href: '/track', icon: MapPin },
    { label: 'Swiggy Rescue', href: '/rescue', icon: ShieldAlert, badge: 'Live Proactive', badgeColor: 'bg-orange-100 text-orange-700' },
    { label: 'Swiggy Resolve', href: '/resolve', icon: Scale, badge: 'Fast Settlement', badgeColor: 'bg-emerald-100 text-emerald-700' },
    { label: 'Recovery History', href: '/recovery-history', icon: History },
    { label: 'Help & Policies', href: '/help', icon: HelpCircle },
    { label: 'Profile & Wallet', href: '/profile', icon: UserIcon },
  ];

  const restaurantNav: NavItem[] = [
    { label: 'Overview', href: '/partner/restaurant', icon: Home },
    { label: 'Incoming Orders', href: '/partner/restaurant/incoming', icon: Bell, badge: '1 New', badgeColor: 'bg-amber-100 text-amber-700' },
    { label: 'Active Kitchen', href: '/partner/restaurant/active', icon: ChefHat },
    { label: 'Order Issues', href: '/partner/restaurant/issues', icon: AlertCircle },
    { label: 'Performance', href: '/partner/restaurant/performance', icon: TrendingUp },
  ];

  const riderNav: NavItem[] = [
    { label: 'Overview', href: '/partner/rider', icon: Home },
    { label: 'Assigned Deliveries', href: '/partner/rider/assigned', icon: Package, badge: 'Active Task', badgeColor: 'bg-blue-100 text-blue-700' },
    { label: 'Active Delivery', href: '/partner/rider/active', icon: Bike },
    { label: 'Delivery History', href: '/partner/rider/history', icon: History },
    { label: 'Report Issue', href: '/partner/rider/issues', icon: AlertCircle },
  ];

  const agentNav: NavItem[] = [
    { label: 'Ops Overview', href: '/agent', icon: Home },
    { label: 'Open Cases', href: '/agent/open', icon: Inbox },
    { label: 'Priority Escalations', href: '/agent/escalated', icon: AlertCircle, badge: 'High SLA', badgeColor: 'bg-rose-100 text-rose-700' },
    { label: 'Case History', href: '/agent/history', icon: FileText },
    { label: 'Recovery Ledger', href: '/agent/ledger', icon: BookOpen, badge: 'Immutable', badgeColor: 'bg-purple-100 text-purple-700' },
  ];

  const role = user?.role ?? 'customer';
  const navItems =
    role === 'restaurant'
      ? restaurantNav
      : role === 'rider'
      ? riderNav
      : role === 'agent'
      ? agentNav
      : customerNav;

  // Breadcrumb generator
  const pathParts = pathname.split('/').filter(Boolean);
  const breadcrumb = pathParts.length > 0
    ? pathParts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' / ')
    : 'Home';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--ink)]">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-[var(--line)] shadow-sm px-4 lg:px-6 flex items-center justify-between">
        {/* Left: Mobile Toggle & Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-[var(--ink-2)] hover:bg-[var(--surface-sunk)]"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link href={role === 'customer' ? '/dashboard' : navItems[0]?.href ?? '/'} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white font-extrabold text-lg shadow-sm transition-transform group-hover:scale-105">
              S
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-sm text-[var(--ink)]" style={{ fontFamily: 'var(--font-display)' }}>
                  Swiggy Unified Recovery
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent-ink)]">
                  Resolve + Rescue
                </span>
              </div>
              <p className="text-[11px] text-[var(--ink-2)] hidden sm:block">Automated & Transparent Order Resilience</p>
            </div>
          </Link>
        </div>

        {/* Center: Breadcrumbs & Live Pulse */}
        <div className="hidden md:flex items-center gap-2.5 text-xs text-[var(--ink-2)]">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            breadcrumbs.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight size={12} />}
                <span className={i === breadcrumbs.length - 1 ? 'font-semibold text-[var(--ink)]' : 'text-[var(--ink-2)]'}>
                  {b.label}
                </span>
              </React.Fragment>
            ))
          ) : (
            <>
              <span className="text-[var(--ink-2)]">Portal</span>
              <ChevronRight size={12} />
              <span className="font-semibold text-[var(--ink)]">{breadcrumb}</span>
            </>
          )}
          <div className="flex items-center gap-1.5 ml-3 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Socket Live</span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Demo Simulator Toggle Button */}
          <button
            id="toggle-simulator-btn"
            onClick={() => setSimulatorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 transition-all shadow-sm"
          >
            <Zap size={14} className="text-amber-600 fill-amber-500" />
            <span className="hidden sm:inline">Demo Simulator</span>
            <span className="sm:hidden">Sim</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-2 rounded-xl text-[var(--ink-2)] hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)] relative"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--accent)]" />
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-[var(--line)] rounded-2xl shadow-xl p-4 z-40 text-xs">
                <div className="flex justify-between items-center pb-2 mb-2 border-b border-[var(--line)]">
                  <span className="font-bold text-sm text-[var(--ink)]">Notifications</span>
                  <button onClick={() => setNotifOpen(false)} className="text-[var(--ink-2)] hover:text-[var(--ink)]">✕</button>
                </div>
                <div className="space-y-2.5">
                  <div className="p-2 rounded-xl bg-orange-50 border border-orange-100">
                    <p className="font-bold text-orange-800">Proactive Rescue Ready</p>
                    <p className="text-[11px] text-orange-700 mt-0.5">Automated signal monitoring active on in-flight orders.</p>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                    <p className="font-bold text-emerald-800">Fairness Engine Armed</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">Photo evidence vision evaluation ready for immediate compensation preview.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile & Role Switcher */}
          <div className="relative">
            <button
              id="user-profile-menu-btn"
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl border border-[var(--line)] hover:bg-[var(--surface-sunk)] transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white font-bold text-xs flex items-center justify-center uppercase">
                {user?.name?.charAt(0) ?? 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold leading-tight text-[var(--ink)]">{user?.name ?? 'Guest'}</p>
                <p className="text-[10px] text-[var(--ink-2)] font-semibold uppercase tracking-wider">{role}</p>
              </div>
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-[var(--line)] rounded-2xl shadow-2xl p-3 z-40 text-xs">
                <div className="pb-2 mb-2 border-b border-[var(--line)]">
                  <p className="font-bold text-[var(--ink)]">{user?.name}</p>
                  <p className="text-[11px] text-[var(--ink-2)]">{(user as any)?.phone ?? '9000000001'} · Role: {role.toUpperCase()}</p>
                </div>

                <div className="mb-2">
                  <p className="text-[10px] font-bold text-[var(--ink-2)] uppercase tracking-wider mb-1.5">Quick Switch Demo Role</p>
                  <div className="space-y-1">
                    <button
                      onClick={() => switchRole('9000000001')}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                        role === 'customer' ? 'bg-orange-50 font-bold text-[var(--accent-ink)]' : 'hover:bg-neutral-100'
                      }`}
                    >
                      <span>🛍️ Customer (Arjun)</span>
                      {role === 'customer' && <CheckCircle size={14} className="text-[var(--accent)]" />}
                    </button>
                    <button
                      onClick={() => switchRole('9000000002')}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                        role === 'restaurant' ? 'bg-orange-50 font-bold text-[var(--accent-ink)]' : 'hover:bg-neutral-100'
                      }`}
                    >
                      <span>🍳 Restaurant (Spice Garden)</span>
                      {role === 'restaurant' && <CheckCircle size={14} className="text-[var(--accent)]" />}
                    </button>
                    <button
                      onClick={() => switchRole('9000000003')}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                        role === 'rider' ? 'bg-orange-50 font-bold text-[var(--accent-ink)]' : 'hover:bg-neutral-100'
                      }`}
                    >
                      <span>🛵 Rider (Ravi)</span>
                      {role === 'rider' && <CheckCircle size={14} className="text-[var(--accent)]" />}
                    </button>
                    <button
                      onClick={() => switchRole('9000000004')}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                        role === 'agent' ? 'bg-orange-50 font-bold text-[var(--accent-ink)]' : 'hover:bg-neutral-100'
                      }`}
                    >
                      <span>🎧 Support Agent (Priya)</span>
                      {role === 'agent' && <CheckCircle size={14} className="text-[var(--accent)]" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--line)]">
                  <button
                    id="sign-out-btn"
                    onClick={() => {
                      clearAuth();
                      router.push('/');
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Layout Body (Sidebar + Content) ─────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar (Desktop) */}
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-[var(--line)] py-5 px-3 flex-shrink-0">
          <div className="px-3 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-2)]">
              {role.toUpperCase()} PORTAL
            </span>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? 'bg-[var(--accent)] text-white shadow-sm'
                      : 'text-[var(--ink)] hover:bg-[var(--surface-sunk)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className={active ? 'text-white' : 'text-[var(--ink-2)]'} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        active ? 'bg-white/20 text-white' : item.badgeColor ?? 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Quick Info & Active Order Callout in Sidebar */}
          <div className="mt-4 p-3 rounded-2xl bg-[var(--surface-sunk)] border border-[var(--line)] text-xs">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
              <span className="font-bold text-[var(--ink)]">Active SLA Shield</span>
            </div>
            <p className="text-[11px] text-[var(--ink-2)] leading-relaxed">
              Every delay is proactively compensated. Every complaint is mathematically fair.
            </p>
          </div>
        </aside>

        {/* Left Navigation Sidebar (Mobile Overlay Drawer) */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="fixed inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed inset-y-0 left-0 w-64 bg-white p-5 flex flex-col z-50 shadow-2xl">
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-[var(--line)]">
                <span className="font-bold text-sm text-[var(--ink)]">{role.toUpperCase()} PORTAL</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded text-[var(--ink-2)]">
                  <X size={20} />
                </button>
              </div>
              <nav className="space-y-1 flex-1 overflow-y-auto">
                {navItems.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold ${
                        active ? 'bg-[var(--accent)] text-white' : 'text-[var(--ink)] hover:bg-[var(--surface-sunk)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/10">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* ── Main Content Area ────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* ── Slide-over Simulator Drawer ───────────────────────────────────── */}
      <SimulatorDrawer isOpen={simulatorOpen} onClose={() => setSimulatorOpen(false)} />
    </div>
  );
}
