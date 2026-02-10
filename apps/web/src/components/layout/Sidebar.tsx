'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

  return (
    <aside className="flex w-64 flex-col border-r bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <Cloud className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Nimbus</span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        <div className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Analytics
        </div>
        {navigation.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}

        <div className="mb-2 mt-6 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Management
        </div>
        {secondaryNav.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* AI Chat Button */}
      <div className="px-3 pb-2">
        <button
          onClick={onOpenChat}
          className="flex w-full items-center gap-3 rounded-lg bg-gradient-to-r from-primary to-blue-500 px-3 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg hover:brightness-110"
        >
          <Sparkles className="h-4 w-4" />
          Ask Nimbus AI
        </button>
      </div>

      {/* Footer */}
      <div className="border-t px-3 py-3">
        <div className="rounded-md bg-sidebar-accent/50 px-3 py-2">
          <p className="text-xs font-medium">Nimbus v0.1.0</p>
          <p className="text-xs text-muted-foreground">Cloud FinOps Platform</p>
        </div>
      </div>
    </aside>
  );
}
