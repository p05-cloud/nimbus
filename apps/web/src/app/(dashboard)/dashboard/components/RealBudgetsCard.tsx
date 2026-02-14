'use client';

import { PieChart, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useCurrency } from '@/components/providers/CurrencyProvider';

// --- Types -------------------------------------------------------------------

interface AwsBudget {
  budgetName: string;
  budgetType: string;
  limitAmount: number;
  currentSpend: number;
  forecastedSpend: number;
  percentUsed: number;
  alertLevel: string;
}

interface AwsBudgetsSummary {
  budgets: AwsBudget[];
  totalBudgetLimit: number;
  totalCurrentSpend: number;
  budgetsInAlarm: number;
  status: string;
  errorMessage?: string;
}

interface RealBudgetsCardProps {
  awsBudgets: AwsBudgetsSummary | null;
}

// --- Helpers -----------------------------------------------------------------

function getAlertColor(level: string): string {
  if (level === 'critical') return 'text-red-600 dark:text-red-400';
  if (level === 'warning') return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}

function getAlertBg(level: string): string {
  if (level === 'critical') return 'bg-red-500';
  if (level === 'warning') return 'bg-yellow-500';
  return 'bg-green-500';
}

function getAlertIcon(level: string) {
  if (level === 'critical') return XCircle;
  if (level === 'warning') return AlertTriangle;
  return CheckCircle;
}

// --- Component ---------------------------------------------------------------

export function RealBudgetsCard({ awsBudgets }: RealBudgetsCardProps) {
  const { format } = useCurrency();

  if (!awsBudgets || awsBudgets.status === 'error') {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">AWS Budgets</h3>
          <PieChart className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex flex-col items-center py-6 text-center">
          <PieChart className="h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">
            {awsBudgets?.errorMessage || 'Budget data unavailable'}
          </p>
        </div>
      </div>
    );
  }

  if (awsBudgets.status === 'no-budgets') {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">AWS Budgets</h3>
          <PieChart className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex flex-col items-center py-4 text-center">
          <PieChart className="h-8 w-8 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">No budgets configured</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create budgets in AWS Console to track spending limits
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">AWS Budgets</h3>
        {awsBudgets.budgetsInAlarm > 0 ? (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {awsBudgets.budgetsInAlarm} in alarm
          </span>
        ) : (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            On track
          </span>
        )}
      </div>

      {/* Budget list */}
      <div className="space-y-3">
        {awsBudgets.budgets.slice(0, 4).map((budget) => {
          const Icon = getAlertIcon(budget.alertLevel);
          return (
            <div key={budget.budgetName}>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3 w-3 ${getAlertColor(budget.alertLevel)}`} />
                  <span className="font-medium truncate max-w-[140px]">{budget.budgetName}</span>
                </div>
                <span className={getAlertColor(budget.alertLevel)}>
                  {budget.percentUsed.toFixed(0)}%
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${getAlertBg(budget.alertLevel)}`}
                  style={{ width: `${Math.min(budget.percentUsed, 100)}%` }}
                />
              </div>
              <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
                <span>{format(budget.currentSpend)}</span>
                <span>{format(budget.limitAmount)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {awsBudgets.budgets.length > 4 && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          +{awsBudgets.budgets.length - 4} more budgets
        </p>
      )}

      {/* Total */}
      <div className="mt-3 border-t pt-3">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Total spend / budget</span>
          <span className="font-semibold">
            {format(awsBudgets.totalCurrentSpend)} / {format(awsBudgets.totalBudgetLimit)}
          </span>
        </div>
      </div>
    </div>
  );
}
