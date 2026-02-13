'use client';

import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { useCurrency } from '@/components/providers/CurrencyProvider';
import { formatPercentage } from '@/lib/utils';

interface BudgetVarianceWidgetProps {
  totalSpendMTD: number;
  forecastedSpend: number;
  previousMonthTotal: number;
}

export function BudgetVarianceWidget({
  totalSpendMTD,
  forecastedSpend,
  previousMonthTotal,
}: BudgetVarianceWidgetProps) {
  const { format } = useCurrency();

  const budget = previousMonthTotal * 1.1;
  const variance = forecastedSpend - budget;
  const variancePct = budget !== 0 ? (variance / budget) * 100 : 0;
  const momChange =
    previousMonthTotal !== 0
      ? ((forecastedSpend - previousMonthTotal) / previousMonthTotal) * 100
      : 0;

  const isOverBudget = variance > 0;
  const isUnderBudget = variance < 0;
  const isMomUp = momChange > 0;
  const isMomDown = momChange < 0;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="text-sm font-medium text-muted-foreground">
        Budget vs Forecast Variance
      </h3>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Budget Limit</span>
          <span className="font-medium">{format(budget)}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Actual Spend (MTD)</span>
          <span className="font-medium">{format(totalSpendMTD)}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Forecasted Spend</span>
          <span className="font-medium">{format(forecastedSpend)}</span>
        </div>

        <div className="flex items-center justify-between border-t pt-3 text-sm">
          <span className="font-medium">Variance</span>
          <span
            className={`font-semibold ${
              isOverBudget
                ? 'text-red-600 dark:text-red-400'
                : isUnderBudget
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-muted-foreground'
            }`}
          >
            {isOverBudget ? '+' : ''}
            {format(variance)} ({formatPercentage(variancePct)})
          </span>
        </div>
      </div>

      {/* MoM Comparison */}
      <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/50 p-3">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Last Month</p>
          <p className="text-sm font-semibold">{format(previousMonthTotal)}</p>
        </div>

        <div className="flex flex-col items-center">
          {isMomUp ? (
            <ArrowUpRight className="h-4 w-4 text-red-500" />
          ) : isMomDown ? (
            <ArrowDownRight className="h-4 w-4 text-green-500" />
          ) : (
            <Minus className="h-4 w-4 text-muted-foreground" />
          )}
          <span
            className={`text-xs font-medium ${
              isMomUp
                ? 'text-red-600 dark:text-red-400'
                : isMomDown
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-muted-foreground'
            }`}
          >
            {formatPercentage(momChange)}
          </span>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">Projected</p>
          <p className="text-sm font-semibold">{format(forecastedSpend)}</p>
        </div>
      </div>
    </div>
  );
}
