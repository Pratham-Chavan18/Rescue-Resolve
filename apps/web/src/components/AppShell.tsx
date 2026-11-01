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
  Inbox,
  FileText,
  BookOpen,
  Menu,
  X,
  LogOut,
  Zap,
  ChevronRight,
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
  const { user, setAuth, clearAuth } = useAuthStore();
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
    { label: 'Swiggy Rescue', href: '/rescue', icon: ShieldAlert, badge: 'Live Proactive', badgeColor: 'bg-[#FFF3E8] text-[#FC8019]' },
    { label: 'Swiggy Resolve', href: '/resolve', icon: Scale, badge: 'Fast Settlement', badgeColor: 'bg-[#EAF7F1] text-[#1BA672]' },
    { label: 'Recovery History', href: '/recovery-history', icon: History },
    { label: 'Help & Policies', href: '/help', icon: HelpCircle },
    { label: 'Profile & Wallet', href: '/profile', icon: UserIcon },
  ];

  const restaurantNav: NavItem[] = [
    { label: 'Overview', href: '/partner/restaurant', icon: Home },
    { label: 'Incoming Orders', href: '/partner/restaurant?tab=incoming', icon: Bell, badge: '1 New', badgeColor: 'bg-[#FFF6E5] text-[#C77400]' },
    { label: 'Active Kitchen', href: '/partner/restaurant?tab=active', icon: ChefHat },
    { label: 'Order Issues', href: '/partner/restaurant?tab=issues', icon: AlertCircle },
    { label: 'Kitchen SLA Metrics', href: '/partner/restaurant?tab=performance', icon: TrendingUp },
  ];

  const riderNav: NavItem[] = [
    { label: 'Overview', href: '/partner/rider', icon: Home },
    { label: 'Assigned Deliveries', href: '/partner/rider?tab=assigned', icon: Package, badge: 'Active Task', badgeColor: 'bg-[#EAF7F1] text-[#1BA672]' },
    { label: 'Active Delivery', href: '/partner/rider?tab=active', icon: Bike },
    { label: 'Delivery History', href: '/partner/rider?tab=history', icon: History },
    { label: 'Report Delay', href: '/partner/rider?tab=issue', icon: AlertCircle },
  ];

  const agentNav: NavItem[] = [
    { label: 'Ops Overview', href: '/agent', icon: Home },
    { label: 'Dispute Queue', href: '/agent?tab=queue', icon: Inbox },
    { label: 'Priority Escalations', href: '/agent?tab=escalated', icon: AlertCircle, badge: 'High SLA', badgeColor: 'bg-[#FDECEF] text-[#D7263D]' },
    { label: 'Recovery Ledger', href: '/agent/ledger', icon: BookOpen, badge: 'Immutable', badgeColor: 'bg-[#F1F0F4] text-[#282C3F]' },
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
    : 'Portal';

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#282C3F]">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 h-15 bg-white border-b border-[#E9E9EB] px-4 lg:px-6 flex items-center justify-between">
        {/* Left: Mobile Toggle & Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-[#686B78] hover:bg-[#F7F7F9] hover:text-[#282C3F]"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link href={role === 'customer' ? '/dashboard' : navItems[0]?.href ?? '/'} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#FC8019] flex items-center justify-center text-white font-bold text-base shadow-sm transition-transform group-hover:scale-105">
              S
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-sm text-[#282C3F]">
                  Swiggy Unified Recovery
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FFF3E8] text-[#FC8019]">
                  Resolve + Rescue
                </span>
              </div>
              <p className="text-[11px] text-[#686B78] hidden sm:block">Automated & Transparent Order Resilience</p>
            </div>
          </Link>
        </div>

        {/* Center: Breadcrumbs & Live Pulse */}
        <div className="hidden md:flex items-center gap-2 text-xs text-[#686B78]">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            breadcrumbs.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight size={12} className="text-[#686B78]" />}
                <span className={i === breadcrumbs.length - 1 ? 'font-semibold text-[#282C3F]' : 'text-[#686B78]'}>
                  {b.label}
                </span>
              </React.Fragment>
            ))
          ) : (
            <>
              <span className="text-[#686B78]">Portal</span>
              <ChevronRight size={12} className="text-[#686B78]" />
              <span className="font-semibold text-[#282C3F]">{breadcrumb}</span>
            </>
          )}
          <div className="flex items-center gap-1.5 ml-2.5 px-2 py-0.5 rounded-full bg-[#EAF7F1] border border-[#1BA672]/20 text-[#1BA672] text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1BA672] animate-pulse" />
            <span>Socket Live</span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Demo Simulator Toggle Button */}
          <button
            id="toggle-simulator-btn"
            onClick={() => setSimulatorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FFF3E8] hover:bg-[#FFE8D1] border border-[#FC8019]/30 text-[#FC8019] transition-colors shadow-sm"
          >
            <Zap size={14} className="text-[#FC8019] fill-[#FC8019]" />
            <span className="hidden sm:inline">Demo Simulator</span>
            <span className="sm:hidden">Sim</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-2 rounded-lg text-[#686B78] hover:bg-[#F7F7F9] hover:text-[#282C3F] relative transition-colors"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FC8019]" />
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E9E9EB] rounded-lg shadow-xl p-4 z-40 text-xs">
                <div className="flex justify-between items-center pb-2 mb-2 border-b border-[#E9E9EB]">
                  <span className="font-bold text-sm text-[#282C3F]">Notifications</span>
                  <button onClick={() => setNotifOpen(false)} className="text-[#686B78] hover:text-[#282C3F]">✕</button>
                </div>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg bg-[#FFF3E8] border border-[#FC8019]/20">
                    <p className="font-bold text-[#FC8019]">Proactive Rescue Ready</p>
                    <p className="text-[11px] text-[#686B78] mt-0.5">Automated signal monitoring active on in-flight orders.</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#EAF7F1] border border-[#1BA672]/20">
                    <p className="font-bold text-[#1BA672]">Fairness Engine Armed</p>
                    <p className="text-[11px] text-[#686B78] mt-0.5">Photo evidence vision evaluation ready for immediate compensation preview.</p>
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
              className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg border border-[#E9E9EB] hover:bg-[#F7F7F9] transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-[#282C3F] text-white font-bold text-xs flex items-center justify-center uppercase">
                {user?.name?.charAt(0) ?? 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold leading-tight text-[#282C3F]">{user?.name ?? 'Guest'}</p>
                <p className="text-[10px] text-[#686B78] font-semibold uppercase tracking-wider">{role}</p>
              </div>
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E9E9EB] rounded-lg shadow-xl p-3 z-40 text-xs">
                <div className="pb-2 mb-2 border-b border-[#E9E9EB]">
                  <p className="font-bold text-[#282C3F]">{user?.name}</p>
                  <p className="text-[11px] text-[#686B78]">{(user as any)?.phone ?? '9000000001'} · Role: {role.toUpperCase()}</p>
                </div>

                <div className="mb-2">
                  <p className="text-[10px] font-bold text-[#686B78] uppercase tracking-wider mb-1.5">
                    1-Click Switch Role
                  </p>
                  <div className="space-y-1">
                    <button
                      onClick={() => switchRole('9000000001')}
                      className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors ${
                        role === 'customer' ? 'bg-[#FFF3E8] font-bold text-[#FC8019]' : 'hover:bg-[#F7F7F9] text-[#282C3F]'
                      }`}
                    >
                      <span>🛍️ Customer (Arjun)</span>
                      {role === 'customer' && <CheckCircle size={14} className="text-[#FC8019]" />}
                    </button>
                    <button
                      onClick={() => switchRole('9000000002')}
                      className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors ${
                        role === 'restaurant' ? 'bg-[#FFF3E8] font-bold text-[#FC8019]' : 'hover:bg-[#F7F7F9] text-[#282C3F]'
                      }`}
                    >
                      <span>🍳 Restaurant (Spice Garden)</span>
                      {role === 'restaurant' && <CheckCircle size={14} className="text-[#FC8019]" />}
                    </button>
                    <button
                      onClick={() => switchRole('9000000003')}
                      className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors ${
                        role === 'rider' ? 'bg-[#FFF3E8] font-bold text-[#FC8019]' : 'hover:bg-[#F7F7F9] text-[#282C3F]'
                      }`}
                    >
                      <span>🛵 Rider (Ravi)</span>
                      {role === 'rider' && <CheckCircle size={14} className="text-[#FC8019]" />}
                    </button>
                    <button
                      onClick={() => switchRole('9000000004')}
                      className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors ${
                        role === 'agent' ? 'bg-[#FFF3E8] font-bold text-[#FC8019]' : 'hover:bg-[#F7F7F9] text-[#282C3F]'
                      }`}
                    >
                      <span>🎧 Support Agent (Priya)</span>
                      {role === 'agent' && <CheckCircle size={14} className="text-[#FC8019]" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E9E9EB]">
                  <button
                    id="sign-out-btn"
                    onClick={() => {
                      clearAuth();
                      router.push('/');
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[#D7263D] hover:bg-[#FDECEF] flex items-center gap-2 font-medium"
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
        <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-[#E9E9EB] py-4 px-3 flex-shrink-0">
          <div className="px-3 mb-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#686B78]">
              {role.toUpperCase()} PORTAL
            </span>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const active = pathname === item.href.split('?')[0];
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[#FC8019] text-white shadow-sm'
                      : 'text-[#282C3F] hover:bg-[#F7F7F9]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className={active ? 'text-white' : 'text-[#686B78]'} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        active ? 'bg-white/20 text-white' : item.badgeColor ?? 'bg-[#F7F7F9] text-[#686B78]'
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
          <div className="mt-4 p-3 rounded-lg bg-[#F7F7F9] border border-[#E9E9EB] text-xs">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#FC8019]" />
              <span className="font-bold text-[#282C3F]">Active SLA Shield</span>
            </div>
            <p className="text-[11px] text-[#686B78] leading-relaxed">
              Every delay is proactively compensated. Every complaint is mathematically fair.
            </p>
          </div>
        </aside>

        {/* Left Navigation Sidebar (Mobile Overlay Drawer) */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="fixed inset-0 bg-black/40"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="fixed inset-y-0 left-0 w-64 bg-white p-4 flex flex-col z-50 shadow-2xl">
              <div className="flex justify-between items-center pb-3 mb-3 border-b border-[#E9E9EB]">
                <span className="font-bold text-sm text-[#282C3F]">{role.toUpperCase()} PORTAL</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-[#686B78] hover:bg-[#F7F7F9]"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>
              <nav className="space-y-1 flex-1 overflow-y-auto">
                {navItems.map((item) => {
                  const active = pathname === item.href.split('?')[0];
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold ${
                        active ? 'bg-[#FC8019] text-white' : 'text-[#282C3F] hover:bg-[#F7F7F9]'
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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#F7F7F9]">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* ── Slide-over Simulator Drawer ───────────────────────────────────── */}
      <SimulatorDrawer isOpen={simulatorOpen} onClose={() => setSimulatorOpen(false)} />
    </div>
  );
}
