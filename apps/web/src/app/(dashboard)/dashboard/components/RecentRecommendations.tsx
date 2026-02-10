'use client';

import { Lightbulb, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useCurrency } from '@/components/providers/CurrencyProvider';

interface RecentRecommendationsProps {
  services: { name: string; provider: string; cost: number; change: number }[];
  totalSpendMTD: number;
}

function deriveQuickRecs(
  services: { name: string; provider: string; cost: number; change: number }[],
  totalSpendMTD: number,
) {
  const recs: { id: string; title: string; savings: number; severity: 'high' | 'medium' | 'low' }[] = [];

  const compute = services.filter((s) => /ec2|compute|instance|lambda/i.test(s.name));
  if (compute.length > 0) {
    recs.push({
      id: 'rightsize',
      title: 'Rightsize EC2/Lambda based on utilization',
      savings: compute.reduce((s, c) => s + c.cost, 0) * 0.15,
      severity: 'medium',
    });
  }

  const stable = services.filter((s) => Math.abs(s.change) < 20 && s.cost > 1);
  if (stable.length > 0) {
    recs.push({
      id: 'ri',
      title: 'Savings Plans for stable workloads',
      savings: stable.reduce((s, c) => s + c.cost, 0) * 0.30,
      severity: 'high',
    });
  }

  const storage = services.filter((s) => /s3|storage|ebs|backup/i.test(s.name));
  if (storage.length > 0) {
    recs.push({
      id: 'storage',
      title: 'Optimize S3 storage classes & lifecycle',
      savings: storage.reduce((s, c) => s + c.cost, 0) * 0.20,
      severity: 'medium',
    });
  }

  const spiking = services.filter((s) => s.change > 25);
  if (spiking.length > 0) {
    recs.push({
      id: 'spike',
      title: `Investigate ${spiking.length} spiking service(s)`,
      savings: spiking.reduce((s, c) => s + c.cost, 0) * 0.30,
      severity: 'high',
    });
  }

  return recs.sort((a, b) => b.savings - a.savings).slice(0, 4);
}

const severityStyles = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

export function RecentRecommendations({ services, totalSpendMTD }: RecentRecommendationsProps) {
  const { format } = useCurrency();
  const recs = deriveQuickRecs(services, totalSpendMTD);
  const totalSavings = recs.reduce((sum, r) => sum + r.savings, 0);

  if (recs.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Recommendations</h3>
            <p className="text-sm text-muted-foreground">No data yet</p>
          </div>
          <Lightbulb className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Connect a cloud account to get optimization recommendations.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Recommendations</h3>
          <p className="text-sm text-muted-foreground">
            {format(totalSavings)}/mo potential savings
          </p>
        </div>
        <Link href="/dashboard/recommendations">
          <Lightbulb className="h-5 w-5 text-warning" />
        </Link>
      </div>
      <div className="space-y-3">
        {recs.map((rec) => (
          <div
            key={rec.id}
            className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium">{rec.title}</p>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${severityStyles[rec.severity]}`}>
                {rec.severity}
              </span>
            </div>
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
              {format(rec.savings)}/mo
            </span>
          </div>
        ))}
      </div>
      <Link
        href="/dashboard/recommendations"
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        View all recommendations
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
