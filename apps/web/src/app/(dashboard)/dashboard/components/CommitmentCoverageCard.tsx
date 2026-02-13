'use client';

import { ShieldCheck, DollarSign, TrendingDown } from 'lucide-react';
import { useCurrency } from '@/components/providers/CurrencyProvider';

interface CommitmentCoverage {
  savingsPlansCoveragePercent: number;
  savingsPlansUtilizationPercent: number;
  totalOnDemandCost: number;
  totalCommittedCost: number;
  estimatedSavingsFromCommitments: number;
}

interface CommitmentCoverageCardProps {
  commitment: CommitmentCoverage;
}

function getCoverageColor(percent: number): string {
  if (percent >= 70) return 'text-green-600 dark:text-green-400';
  if (percent >= 40) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function getCoverageBg(percent: number): string {
  if (percent >= 70) return 'bg-green-500';
  if (percent >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getCoverageLabel(percent: number): string {
  if (percent >= 70) return 'Good';
  if (percent >= 40) return 'Moderate';
  if (percent > 0) return 'Low';
  return 'None';
}

export function CommitmentCoverageCard({ commitment }: CommitmentCoverageCardProps) {
  const { format } = useCurrency();

  const metrics = [
    {
      label: 'SP/RI Coverage',
      value: `${commitment.savingsPlansCoveragePercent.toFixed(1)}%`,
      color: getCoverageColor(commitment.savingsPlansCoveragePercent),
      icon: ShieldCheck,
    },
    {
      label: 'Utilization',
      value: commitment.totalCommittedCost > 0
        ? `${commitment.savingsPlansUtilizationPercent.toFixed(0)}%`
        : 'N/A',
      color: commitment.totalCommittedCost > 0
        ? getCoverageColor(commitment.savingsPlansUtilizationPercent)
        : 'text-muted-foreground',
      icon: TrendingDown,
    },
    {
      label: 'Est. Savings',
      value: format(commitment.estimatedSavingsFromCommitments),
      color: 'text-green-600 dark:text-green-400',
      icon: DollarSign,
    },
  ];

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Commitment Coverage</h3>
          <p className="text-sm text-muted-foreground">
            Savings Plans & Reserved Instances
          </p>
        </div>
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
          commitment.savingsPlansCoveragePercent >= 70
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : commitment.savingsPlansCoveragePercent >= 40
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {getCoverageLabel(commitment.savingsPlansCoveragePercent)}
        </span>
      </div>

      {/* Coverage progress bar */}
      <div className="mb-4">
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>Coverage</span>
          <span className={getCoverageColor(commitment.savingsPlansCoveragePercent)}>
            {commitment.savingsPlansCoveragePercent.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${getCoverageBg(commitment.savingsPlansCoveragePercent)}`}
            style={{ width: `${Math.min(commitment.savingsPlansCoveragePercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border p-3 text-center">
            <metric.icon className={`mx-auto h-4 w-4 ${metric.color}`} />
            <p className={`mt-1 text-sm font-bold ${metric.color}`}>{metric.value}</p>
            <p className="text-[10px] text-muted-foreground">{metric.label}</p>
          </div>
        ))}
      </div>

      {/* On-demand vs committed breakdown */}
      <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs">
        <span className="text-muted-foreground">
          On-Demand: <span className="font-medium text-foreground">{format(commitment.totalOnDemandCost)}</span>
        </span>
        <span className="text-muted-foreground">
          Committed: <span className="font-medium text-foreground">{format(commitment.totalCommittedCost)}</span>
        </span>
      </div>
    </div>
  );
}
