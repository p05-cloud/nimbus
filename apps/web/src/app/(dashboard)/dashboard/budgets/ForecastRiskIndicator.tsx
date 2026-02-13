'use client';

import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { useCurrency } from '@/components/providers/CurrencyProvider';

interface ForecastRiskIndicatorProps {
  totalSpendMTD: number;
  forecastedSpend: number;
  previousMonthTotal: number;
}

type RiskLevel = 'low' | 'medium' | 'high';

function getRiskLevel(forecastRatio: number): RiskLevel {
  if (forecastRatio > 95) return 'high';
  if (forecastRatio > 75) return 'medium';
  return 'low';
}

const riskConfig: Record<
  RiskLevel,
  {
    label: string;
    description: string;
    textColor: string;
    bgColor: string;
    Icon: typeof CheckCircle;
  }
> = {
  low: {
    label: 'Low Risk',
    description: 'Spending is well within budget. No action needed.',
    textColor: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900',
    Icon: CheckCircle,
  },
  medium: {
    label: 'Medium Risk',
    description: 'Spending is approaching the budget threshold. Monitor closely.',
    textColor: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900',
    Icon: AlertTriangle,
  },
  high: {
    label: 'High Risk',
    description: 'Spending is projected to exceed budget. Immediate action recommended.',
    textColor: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900',
    Icon: AlertTriangle,
  },
};

export function ForecastRiskIndicator({
  totalSpendMTD,
  forecastedSpend,
  previousMonthTotal,
}: ForecastRiskIndicatorProps) {
  const { format } = useCurrency();

  const budget = previousMonthTotal <= 0 ? forecastedSpend : previousMonthTotal * 1.1;
  const forecastRatio = budget > 0 ? (forecastedSpend / budget) * 100 : 0;
  const risk = getRiskLevel(forecastRatio);
  const { label, description, textColor, bgColor, Icon } = riskConfig[risk];

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Shield className="h-4 w-4" />
        Forecast Risk
      </h3>

      {/* Icon + risk label row */}
      <div className="mb-6 flex items-start gap-4">
        <div className={`rounded-full p-3 ${bgColor}`}>
          <Icon className={`h-6 w-6 ${textColor}`} />
        </div>
        <div>
          <p className={`text-lg font-semibold ${textColor}`}>{label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {/* 3-segment risk meter bar */}
      <div className="mb-6">
        <div className="flex h-3 w-full overflow-hidden rounded-full">
          <div
            className={`flex-1 ${
              risk === 'low' ? 'bg-green-500' : 'bg-green-500/20'
            }`}
          />
          <div
            className={`flex-1 ${
              risk === 'medium' ? 'bg-yellow-500' : 'bg-yellow-500/20'
            }`}
          />
          <div
            className={`flex-1 ${
              risk === 'high' ? 'bg-red-500' : 'bg-red-500/20'
            }`}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
          <span>Low</span>
          <span>Medium</span>
          <span>High</span>
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-muted-foreground">
        Forecast is at {forecastRatio.toFixed(0)}% of budget ({format(forecastedSpend)} /{' '}
        {format(budget)})
      </p>
    </div>
  );
}
