'use client';

import { DollarSign, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatPercentage } from '@/lib/utils';
import { useCurrency } from '@/components/providers/CurrencyProvider';

interface KpiCardsProps {
  totalSpendMTD: number;
  forecastedSpend: number;
  changePercentage: number;
}

export function KpiCards({ totalSpendMTD, forecastedSpend, changePercentage }: KpiCardsProps) {
  const { format } = useCurrency();

  const kpis = [
    {
      title: 'Total Spend (MTD)',
      value: totalSpendMTD,
      change: changePercentage,
      icon: DollarSign,
      trend: changePercentage <= 0 ? ('down' as const) : ('up' as const),
    },
    {
      title: 'Forecasted Spend',
      value: forecastedSpend,
      change: 0,
      icon: TrendingUp,
      trend: 'neutral' as const,
    },
    {
      title: 'Previous Month',
      value: totalSpendMTD > 0 ? totalSpendMTD / (1 + changePercentage / 100) : 0,
      change: 0,
      icon: TrendingDown,
      trend: 'neutral' as const,
    },
    {
      title: 'Active Anomalies',
      value: 0,
      change: 0,
      icon: AlertTriangle,
      trend: 'neutral' as const,
      isCurrency: false,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <div key={kpi.title} className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
            <kpi.icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold">
              {kpi.isCurrency === false ? kpi.value : format(kpi.value)}
            </p>
            {kpi.change !== 0 && (
              <p
                className={`mt-1 text-xs font-medium ${
                  kpi.trend === 'down' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {formatPercentage(kpi.change)} from last month
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
