'use client';

import { useCurrency } from '@/components/providers/CurrencyProvider';
import { AlertTriangle, PlusCircle } from 'lucide-react';

interface BudgetsClientProps {
  totalSpendMTD: number;
  forecastedSpend: number;
  previousMonthTotal: number;
  topServices: { name: string; provider: string; cost: number; change: number }[];
  accountId: string;
  error?: string;
}

type AlertLevel = 'on-track' | 'normal' | 'warning' | 'critical';

const alertConfig: Record<AlertLevel, { label: string; badge: string; bar: string }> = {
  'on-track': {
    label: 'On Track',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    bar: 'bg-green-500',
  },
  'normal': {
    label: '50%+ Used',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    bar: 'bg-blue-500',
  },
  'warning': {
    label: 'Warning (>80%)',
    badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    bar: 'bg-yellow-500',
  },
  'critical': {
    label: 'Critical (>100%)',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    bar: 'bg-red-500',
  },
};

function getAlertLevel(percentage: number): AlertLevel {
  if (percentage > 100) return 'critical';
  if (percentage > 80) return 'warning';
  if (percentage > 50) return 'normal';
  return 'on-track';
}

export function BudgetsClient({
  totalSpendMTD,
  forecastedSpend,
  previousMonthTotal,
  topServices,
  accountId,
  error,
}: BudgetsClientProps) {
  const { format } = useCurrency();

  if (error || totalSpendMTD === 0) {
    return (
      <div className="space-y-6 animate-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
          <p className="text-sm text-muted-foreground">
            Track spend against budgets and set alerts for overspend.
          </p>
        </div>
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-muted-foreground">No cost data available. Connect a cloud account first.</p>
        </div>
      </div>
    );
  }

  // Derive budgets from real data — overall account + top 3 services
  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const burnRate = totalSpendMTD / Math.max(dayOfMonth, 1);

  const budgets = [
    {
      name: 'AWS Total (Account)',
      provider: 'AWS',
      limit: previousMonthTotal > 0 ? previousMonthTotal * 1.1 : forecastedSpend * 1.1,
      spent: totalSpendMTD,
      projected: forecastedSpend,
    },
    ...topServices.slice(0, 3).map((s) => ({
      name: s.name,
      provider: s.provider,
      limit: s.cost * (daysInMonth / Math.max(dayOfMonth, 1)) * 1.1,
      spent: s.cost,
      projected: s.cost * (daysInMonth / Math.max(dayOfMonth, 1)),
    })),
  ];

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
          <p className="text-sm text-muted-foreground">
            Budget tracking for AWS Account {accountId} — Day {dayOfMonth}/{daysInMonth}
          </p>
        </div>
        <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
          <PlusCircle className="h-4 w-4" />
          Create Budget
        </button>
      </div>

      {/* Budget progress summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">MTD Spend</p>
          <p className="mt-1 text-2xl font-bold">{format(totalSpendMTD)}</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Daily Burn Rate</p>
          <p className="mt-1 text-2xl font-bold">{format(burnRate)}</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Projected EOM</p>
          <p className="mt-1 text-2xl font-bold">{format(forecastedSpend)}</p>
        </div>
      </div>

      {/* Budget cards with multi-level thresholds */}
      <div className="grid gap-4 sm:grid-cols-2">
        {budgets.map((budget) => {
          const percentage = (budget.spent / budget.limit) * 100;
          const projectedPct = (budget.projected / budget.limit) * 100;
          const alertLevel = getAlertLevel(percentage);
          const willExceed = projectedPct > 100 && alertLevel !== 'critical';
          const ac = alertConfig[alertLevel];

          return (
            <div key={budget.name} className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{budget.name}</h3>
                  <p className="text-xs text-muted-foreground">{budget.provider}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ac.badge}`}>
                  {willExceed ? 'Will Exceed' : ac.label}
                </span>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm">
                  <span>{format(budget.spent)} spent</span>
                  <span className="text-muted-foreground">{format(budget.limit)} limit</span>
                </div>
                {/* Progress bar with threshold markers */}
                <div className="relative mt-2">
                  <div className="h-2.5 rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${ac.bar}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  {/* Threshold markers at 50%, 80%, 100% */}
                  <div className="absolute top-0 h-2.5 w-px bg-blue-500/40" style={{ left: '50%' }} title="50%" />
                  <div className="absolute top-0 h-2.5 w-px bg-yellow-500/60" style={{ left: '80%' }} title="80% Warning" />
                </div>
                <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                  <span>{percentage.toFixed(1)}% used</span>
                  {willExceed && (
                    <span className="text-yellow-600 dark:text-yellow-400">Projected to exceed</span>
                  )}
                  <span>Projected: {format(budget.projected)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alert threshold legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" />On Track (&lt;50%)</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />Normal (50-80%)</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500" />Warning (80-100%)</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />Critical (&gt;100%)</span>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Auto-budgets:</strong> Budgets are auto-calculated at 110% of previous month or forecasted spend.
          Custom budgets with email alerts can be configured via AWS Budgets in the AWS Console.
        </p>
      </div>
    </div>
  );
}
