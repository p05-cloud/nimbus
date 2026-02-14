'use client';

import { CheckCircle, AlertTriangle } from 'lucide-react';
import { useCurrency } from '@/components/providers/CurrencyProvider';

interface AwsBudgetsSummary {
  totalBudgetLimit: number;
  status: 'active' | 'no-budgets' | 'error';
}

interface BudgetForecastCardProps {
  totalSpendMTD: number;
  forecastedSpend: number;
  previousMonthTotal: number;
  awsBudgets?: AwsBudgetsSummary | null;
}

type RiskLevel = 'low' | 'medium' | 'high';

const riskConfig: Record<RiskLevel, { label: string; color: string; badgeStyle: string }> = {
  low: {
    label: 'On Track',
    color: 'bg-green-500',
    badgeStyle: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  medium: {
    label: 'Warning',
    color: 'bg-yellow-500',
    badgeStyle: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  high: {
    label: 'At Risk',
    color: 'bg-red-500',
    badgeStyle: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
};

function getRiskLevel(forecastRatio: number): RiskLevel {
  if (forecastRatio > 100) return 'high';
  if (forecastRatio > 80) return 'medium';
  return 'low';
}

export function BudgetForecastCard({
  totalSpendMTD,
  forecastedSpend,
  previousMonthTotal,
  awsBudgets,
}: BudgetForecastCardProps) {
  const { format } = useCurrency();

  // Use real AWS Budgets when available, otherwise fall back to prev month + 10%
  const budget =
    awsBudgets?.status === 'active' && awsBudgets.totalBudgetLimit > 0
      ? awsBudgets.totalBudgetLimit
      : previousMonthTotal > 0
        ? previousMonthTotal * 1.1
        : 0;
  const variance = forecastedSpend - budget;
  const usagePct = budget > 0 ? (totalSpendMTD / budget) * 100 : 0;
  const forecastRatio = budget > 0 ? (forecastedSpend / budget) * 100 : 0;
  const risk = getRiskLevel(forecastRatio);
  const config = riskConfig[risk];

  if (budget === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Budget vs Forecast</h3>
            <p className="text-sm text-muted-foreground">No previous month data</p>
          </div>
          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Connect a cloud account and wait for a full billing cycle to see budget tracking.
        </p>
      </div>
    );
  }

  const RiskIcon = risk === 'low' ? CheckCircle : AlertTriangle;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Budget vs Forecast</h3>
          <p className="text-sm text-muted-foreground">
            Are we within budget this month?
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.badgeStyle}`}
        >
          <RiskIcon className="h-3 w-3" />
          {config.label}
        </span>
      </div>

      {/* Metrics grid */}
      <div className="mb-4 grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Budget</p>
          <p className="mt-1 text-lg font-bold">{format(budget)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Forecast</p>
          <p className="mt-1 text-lg font-bold">{format(forecastedSpend)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Variance</p>
          <p
            className={`mt-1 text-lg font-bold ${
              variance > 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-600 dark:text-green-400'
            }`}
          >
            {variance > 0 ? '+' : ''}
            {format(Math.abs(variance))}
            {variance < 0 ? ' under' : ' over'}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>MTD Spend: {format(totalSpendMTD)}</span>
          <span>{Math.min(usagePct, 100).toFixed(0)}% of budget</span>
        </div>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
          {/* Actual usage bar */}
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all ${config.color}`}
            style={{ width: `${Math.min(usagePct, 100)}%` }}
          />
          {/* Forecast marker line */}
          {forecastRatio > 0 && (
            <div
              className="absolute inset-y-0 w-0.5 bg-foreground/70"
              style={{ left: `${Math.min(forecastRatio, 100)}%` }}
              title={`Forecast: ${forecastRatio.toFixed(0)}% of budget`}
            />
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span>Budget ({format(budget)})</span>
        </div>
      </div>
    </div>
  );
}
