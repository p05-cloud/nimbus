'use client';

import { DollarSign, Lightbulb, TrendingDown, Target } from 'lucide-react';
import { useCurrency } from '@/components/providers/CurrencyProvider';

interface OptimizationTrackingProps {
  services: { name: string; provider: string; cost: number; change: number }[];
  totalSpendMTD: number;
  previousMonthTotal: number;
}

interface SavingsCategory {
  label: string;
  color: string;
  dotColor: string;
  savings: number;
}

export function OptimizationTracking({
  services,
  totalSpendMTD,
  previousMonthTotal,
}: OptimizationTrackingProps) {
  const { format } = useCurrency();

  // Categorize services and compute savings potential
  const computeServices = services.filter((s) =>
    /ec2|compute|instance|lambda/i.test(s.name),
  );
  const stableWorkloads = services.filter(
    (s) => Math.abs(s.change) < 20 && s.cost > 0.5,
  );
  const storageServices = services.filter((s) =>
    /s3|storage|ebs|backup/i.test(s.name),
  );
  const spikingServices = services.filter((s) => s.change > 25);

  const rightsizingSavings =
    computeServices.reduce((sum, s) => sum + s.cost, 0) * 0.15;
  const savingsPlanSavings =
    stableWorkloads.reduce((sum, s) => sum + s.cost, 0) * 0.3;
  const storageSavings =
    storageServices.reduce((sum, s) => sum + s.cost, 0) * 0.2;
  const spikeReductionSavings =
    spikingServices.reduce((sum, s) => sum + s.cost, 0) * 0.3;

  const categories: SavingsCategory[] = [
    {
      label: 'Rightsizing',
      color: 'bg-blue-500',
      dotColor: 'bg-blue-500',
      savings: rightsizingSavings,
    },
    {
      label: 'Savings Plans',
      color: 'bg-green-500',
      dotColor: 'bg-green-500',
      savings: savingsPlanSavings,
    },
    {
      label: 'Storage',
      color: 'bg-purple-500',
      dotColor: 'bg-purple-500',
      savings: storageSavings,
    },
    {
      label: 'Spike Reduction',
      color: 'bg-orange-500',
      dotColor: 'bg-orange-500',
      savings: spikeReductionSavings,
    },
  ];

  const totalIdentified =
    rightsizingSavings + savingsPlanSavings + storageSavings + spikeReductionSavings;
  const openOpportunities = categories.filter((c) => c.savings > 0).length;
  const realizedSavings = Math.max(previousMonthTotal - totalSpendMTD, 0);
  const savingsRate =
    totalSpendMTD > 0 ? (totalIdentified / totalSpendMTD) * 100 : 0;

  const activeCategories = categories.filter((c) => c.savings > 0);

  const metrics = [
    {
      title: 'Identified Savings',
      value: format(totalIdentified),
      subtitle: '/month potential',
      icon: DollarSign,
      iconColor: 'text-green-600 dark:text-green-400',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      title: 'Open Opportunities',
      value: String(openOpportunities),
      subtitle: 'categories to optimize',
      icon: Lightbulb,
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    },
    {
      title: 'Realized Savings',
      value: format(realizedSavings),
      subtitle: 'vs last month',
      icon: TrendingDown,
      iconColor:
        realizedSavings > 0
          ? 'text-green-600 dark:text-green-400'
          : 'text-muted-foreground',
      iconBg:
        realizedSavings > 0
          ? 'bg-green-100 dark:bg-green-900/30'
          : 'bg-muted',
    },
    {
      title: 'Savings Rate',
      value: `${savingsRate.toFixed(1)}%`,
      subtitle: 'of current spend',
      icon: Target,
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    },
  ];

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6">
        <h3 className="font-semibold">Optimization Tracking</h3>
        <p className="text-sm text-muted-foreground">
          Savings potential across all services
        </p>
      </div>

      {/* Metric cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.title}
            className="flex flex-col items-center rounded-lg border bg-card p-4 text-center"
          >
            <div
              className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full ${metric.iconBg}`}
            >
              <metric.icon className={`h-5 w-5 ${metric.iconColor}`} />
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              {metric.title}
            </p>
            <p className="mt-1 text-xl font-bold">{metric.value}</p>
            <p className="text-xs text-muted-foreground">{metric.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Savings breakdown bar */}
      <div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          Savings Breakdown
        </p>
        {totalIdentified > 0 ? (
          <>
            <div className="flex h-2 overflow-hidden rounded-full">
              {activeCategories.map((category) => (
                <div
                  key={category.label}
                  className={`${category.color}`}
                  style={{
                    width: `${(category.savings / totalIdentified) * 100}%`,
                  }}
                />
              ))}
            </div>
            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-4">
              {activeCategories.map((category) => (
                <div
                  key={category.label}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${category.dotColor}`}
                  />
                  <span>{category.label}</span>
                  <span className="font-medium text-foreground">
                    {format(category.savings)}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex h-2 overflow-hidden rounded-full bg-muted" />
        )}
      </div>
    </div>
  );
}
