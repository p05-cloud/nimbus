'use client';

import { Flame, Target } from 'lucide-react';
import { useCurrency } from '@/components/providers/CurrencyProvider';

interface BurnRateCardProps {
  totalSpendMTD: number;
  forecastedSpend: number;
  previousMonthTotal: number;
}

type PaceStatus = 'over' | 'slight' | 'on-pace';

function getPaceStatus(burnRatio: number): PaceStatus {
  if (burnRatio > 1.1) return 'over';
  if (burnRatio > 1.0) return 'slight';
  return 'on-pace';
}

function getPaceColor(status: PaceStatus): {
  text: string;
  icon: string;
  bg: string;
  bar: string;
} {
  switch (status) {
    case 'over':
      return {
        text: 'text-red-600 dark:text-red-400',
        icon: 'text-red-500',
        bg: 'bg-red-50 dark:bg-red-950/30',
        bar: 'bg-red-500',
      };
    case 'slight':
      return {
        text: 'text-yellow-600 dark:text-yellow-400',
        icon: 'text-yellow-500',
        bg: 'bg-yellow-50 dark:bg-yellow-950/30',
        bar: 'bg-yellow-500',
      };
    case 'on-pace':
      return {
        text: 'text-green-600 dark:text-green-400',
        icon: 'text-green-500',
        bg: 'bg-green-50 dark:bg-green-950/30',
        bar: 'bg-green-500',
      };
  }
}

function getPaceLabel(status: PaceStatus): string {
  switch (status) {
    case 'over':
      return 'Over pace — spending faster than budget allows. Consider reducing usage to stay within target.';
    case 'slight':
      return 'Slightly above pace — trending close to budget limit. Monitor closely.';
    case 'on-pace':
      return 'On pace — current burn rate is within budget. Keep it up.';
  }
}

export function BurnRateCard({
  totalSpendMTD,
  forecastedSpend,
  previousMonthTotal,
}: BurnRateCardProps) {
  const { format } = useCurrency();

  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - dayOfMonth;

  const currentBurnRate = totalSpendMTD / Math.max(dayOfMonth, 1);
  const budget = previousMonthTotal * 1.1;
  const budgetRemaining = Math.max(budget - totalSpendMTD, 0);
  const requiredBurnRate = daysRemaining > 0 ? budgetRemaining / daysRemaining : 0;

  const burnRatio = requiredBurnRate > 0 ? currentBurnRate / requiredBurnRate : currentBurnRate > 0 ? 2 : 1;

  const projectedEOM = currentBurnRate * daysInMonth;
  const monthProgress = (dayOfMonth / daysInMonth) * 100;

  const paceStatus = getPaceStatus(burnRatio);
  const colors = getPaceColor(paceStatus);
  const paceLabel = getPaceLabel(paceStatus);

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Daily Burn Rate</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Day {dayOfMonth} of {daysInMonth} &mdash; {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left
          </p>
        </div>
        <Flame className={`h-5 w-5 ${colors.icon}`} />
      </div>

      {/* Current vs Required Burn Rate */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className={`rounded-lg ${colors.bg} p-3`}>
          <div className="flex items-center gap-1.5">
            <Flame className={`h-3.5 w-3.5 ${colors.icon}`} />
            <span className="text-xs font-medium text-muted-foreground">Current Burn</span>
          </div>
          <p className="mt-1 text-lg font-bold">
            {format(currentBurnRate)}
          </p>
          <p className="text-xs text-muted-foreground">/day</p>
        </div>

        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Required Burn</span>
          </div>
          <p className="mt-1 text-lg font-bold">
            {format(requiredBurnRate)}
          </p>
          <p className="text-xs text-muted-foreground">/day</p>
        </div>
      </div>

      {/* Month Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Month progress</span>
          <span>{Math.round(monthProgress)}%</span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${colors.bar}`}
            style={{ width: `${Math.min(monthProgress, 100)}%` }}
          />
        </div>
      </div>

      {/* Projected EOM */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Projected EOM spend</span>
        <span className="font-medium">{format(projectedEOM)}</span>
      </div>

      {/* Budget */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Budget (prev +10%)</span>
        <span className="font-medium">{format(budget)}</span>
      </div>

      {/* Pace Status Footer */}
      <div className={`mt-3 rounded-md ${colors.bg} px-3 py-2`}>
        <p className={`text-xs ${colors.text}`}>
          {paceLabel}
        </p>
      </div>
    </div>
  );
}
