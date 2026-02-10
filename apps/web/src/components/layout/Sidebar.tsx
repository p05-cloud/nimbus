'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  DollarSign,
  TrendingDown,
  Lightbulb,
  PieChart,
  Server,
  Settings,
  Shield,
  Cloud,
  Sparkles,
  Monitor,
  ChevronRight,
} from 'lucide-react';

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Cost Explorer', href: '/dashboard/costs', icon: DollarSign },
  { name: 'Budgets', href: '/dashboard/budgets', icon: PieChart },
  { name: 'Recommendations', href: '/dashboard/recommendations', icon: Lightbulb },
  { name: 'Anomalies', href: '/dashboard/anomalies', icon: TrendingDown },
  { name: 'Resources', href: '/dashboard/resources', icon: Server },
  { name: 'Cloud Accounts', href: '/dashboard/accounts', icon: Cloud },
];

const secondaryNav = [
  { name: 'Governance', href: '/dashboard/governance', icon: Shield },
  { name: 'NOC / TV Mode', href: '/dashboard/tv', icon: Monitor },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

interface SidebarProps {
  onOpenChat?: () => void;
}

export function Sidebar({ onOpenChat }: SidebarProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Hover trigger strip — always visible */}
      <div
        className="fixed inset-y-0 left-0 z-40 w-3 cursor-pointer"
        onMouseEnter={() => setExpanded(true)}
      />

      {/* Backdrop overlay when expanded */}
      {expanded && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity lg:hidden"
          onClick={() => setExpanded(false)}
        />
      )}

      {/* Collapsed icon strip */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-sidebar transition-all duration-300 ease-in-out',
          expanded ? 'w-64' : 'w-14',
        )}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        {/* Logo */}
        <div className="flex h-14 items-center border-b px-3">
          <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
            {expanded ? (
              <Image
                src="/images/pfl-logo.png"
                alt="Poonawalla Fincorp"
                width={160}
                height={40}
                className="h-9 w-auto shrink-0 object-contain"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1B2A5B]">
                <span className="text-sm font-bold text-white">P</span>
              </div>
            )}
          </Link>
        </div>

        {/* Expand indicator */}
        {!expanded && (
          <div className="flex justify-center py-2">
            <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
          </div>
        )}

        {/* Main Navigation */}
        <nav className="flex-1 space-y-1 overflow-hidden px-2 py-3">
          {expanded && (
            <div className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Analytics
            </div>
          )}
          {navigation.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                title={item.name}
                className={cn(
                  'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                  expanded ? 'px-3' : 'justify-center',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {expanded && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}

          {expanded && (
            <div className="mb-2 mt-5 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Management
            </div>
          )}
          {!expanded && <div className="my-3 border-t" />}
          {secondaryNav.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                title={item.name}
                className={cn(
                  'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                  expanded ? 'px-3' : 'justify-center',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {expanded && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* AI Chat Button */}
        <div className="px-2 pb-2">
          <button
            onClick={onOpenChat}
            title="Ask Nimbus AI"
            className={cn(
              'flex w-full items-center gap-3 rounded-lg bg-gradient-to-r from-primary to-blue-500 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg hover:brightness-110',
              expanded ? 'px-3 py-2.5' : 'justify-center py-2.5',
            )}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            {expanded && <span>Ask Nimbus AI</span>}
          </button>
        </div>

        {/* Footer */}
        {expanded && (
          <div className="border-t px-2 py-3">
            <div className="rounded-md bg-sidebar-accent/50 px-3 py-2">
              <div className="flex items-center gap-2">
                <Image src="/images/acc-logo.png" alt="ACC" width={40} height={19} className="h-4 w-auto" />
                <span className="text-[10px] text-muted-foreground">×</span>
                <Image src="/images/pfl-logo.png" alt="PFL" width={48} height={19} className="h-4 w-auto" />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">Nimbus v0.1.0 — Cloud FinOps Platform</p>
            </div>
          </div>
        )}
      </aside>

      {/* Spacer to push content right of collapsed sidebar */}
      <div className="w-14 shrink-0" />
    </>
  );
}
