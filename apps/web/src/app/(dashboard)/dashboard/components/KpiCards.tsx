'use client';

import { DollarSign, TrendingUp, Receipt, Calculator } from 'lucide-react';
import { formatPercentage } from '@/lib/utils';
import { useCurrency } from '@/components/providers/CurrencyProvider';

interface KpiCardsProps {
  totalSpendMTD: number;
  forecastedSpend: number;
  changePercentage: number;
  previousMonthTotal: number;
}

export function KpiCards({ totalSpendMTD, forecastedSpend, changePercentage, previousMonthTotal }: KpiCardsProps) {
  const { format } = useCurrency();

  // Separate cloud usage from tax (18% GST for India)
  const taxRate = 0.18;
  const cloudSpend = totalSpendMTD / (1 + taxRate);
  const tax = totalSpendMTD - cloudSpend;

  const kpis = [
    {
      title: 'Cloud Usage (MTD)',
      value: cloudSpend,
      change: changePercentage,
      icon: DollarSign,
      trend: changePercentage <= 0 ? ('down' as const) : ('up' as const),
    },
    {
      title: 'Tax (GST 18%)',
      value: tax,
      change: 0,
      icon: Receipt,
      trend: 'neutral' as const,
    },
    {
      title: 'Total Spend (MTD)',
      value: totalSpendMTD,
      change: changePercentage,
      icon: Calculator,
      trend: changePercentage <= 0 ? ('down' as const) : ('up' as const),
    },
    {
      title: 'Forecasted (EOM)',
      value: forecastedSpend,
      change: 0,
      icon: TrendingUp,
      trend: 'neutral' as const,
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
              {format(kpi.value)}
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
