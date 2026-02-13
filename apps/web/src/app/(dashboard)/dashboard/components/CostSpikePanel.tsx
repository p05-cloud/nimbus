'use client';

import { useMemo } from 'react';
import { TrendingUp, Zap, CheckCircle } from 'lucide-react';
import { useCurrency } from '@/components/providers/CurrencyProvider';

interface CostSpikePanelProps {
  services: { name: string; provider: string; cost: number; change: number }[];
  totalSpendMTD: number;
  previousMonthTotal: number;
}

type Severity = 'critical' | 'warning' | 'info';

interface SpikeEntry {
  name: string;
  displayName: string;
  provider: string;
  cost: number;
  change: number;
  severity: Severity;
  explanation: string;
}

const severityStyles: Record<Severity, { border: string; bg: string; badge: string }> = {
  critical: {
    border: 'border-red-300 dark:border-red-700',
    bg: 'bg-red-50 dark:bg-red-900/20',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  warning: {
    border: 'border-yellow-300 dark:border-yellow-700',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  info: {
    border: 'border-blue-300 dark:border-blue-700',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
};

function stripAwsPrefixes(name: string): string {
  return name.replace(/^(Amazon |AWS )/i, '');
}

function classifySeverity(change: number): Severity {
  if (change > 100) return 'critical';
  if (change > 50) return 'warning';
  return 'info';
}

function generateExplanation(
  displayName: string,
  change: number,
  costDelta: number,
  formatCurrency: (amount: number) => string,
): string {
  if (change > 200) {
    return `${displayName} surged ${change.toFixed(0)}% vs last month \u2014 possible new workload or scaling event. Adds ~${formatCurrency(costDelta)} to monthly spend.`;
  }
  if (change > 100) {
    return `${displayName} more than doubled (+${change.toFixed(0)}%). Investigate new instances, higher throughput, or config changes.`;
  }
  if (change > 50) {
    return `${displayName} grew ${change.toFixed(0)}% MoM. Could indicate increased usage, under-optimized resources, or pricing change.`;
  }
  return `${displayName} increased ${change.toFixed(0)}% vs last month. Monitor for continued growth.`;
}

export function CostSpikePanel({ services, totalSpendMTD, previousMonthTotal }: CostSpikePanelProps) {
  const { format } = useCurrency();

  const spikes = useMemo<SpikeEntry[]>(() => {
    if (!services || services.length === 0) return [];

    return services
      .filter((s) => s.change > 20)
      .sort((a, b) => b.change - a.change)
      .slice(0, 5)
      .map((service) => {
        const displayName = stripAwsPrefixes(service.name);
        const severity = classifySeverity(service.change);
        const previousCost = service.cost / (1 + service.change / 100);
        const costDelta = service.cost - previousCost;

        return {
          name: service.name,
          displayName,
          provider: service.provider,
          cost: service.cost,
          change: service.change,
          severity,
          explanation: generateExplanation(displayName, service.change, costDelta, format),
        };
      });
  }, [services, format]);

  if (!services || services.length === 0 || spikes.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Cost Spike Analysis</h3>
            <p className="text-sm text-muted-foreground">Monitoring for MoM cost increases</p>
          </div>
          <Zap className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-700 dark:bg-green-900/20">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              No significant cost spikes detected. All services within normal range.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Cost Spike Analysis</h3>
          <p className="text-sm text-muted-foreground">
            {spikes.length} service{spikes.length !== 1 ? 's' : ''} with significant MoM increase
          </p>
        </div>
        <Zap className="h-5 w-5 text-warning" />
      </div>
      <div className="space-y-3">
        {spikes.map((spike) => {
          const styles = severityStyles[spike.severity];
          return (
            <div
              key={spike.name}
              className={`rounded-lg border ${styles.border} ${styles.bg} p-3`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{spike.displayName}</span>
                  <span className="text-xs text-muted-foreground">{spike.provider}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles.badge}`}>
                    +{spike.change.toFixed(0)}%
                  </span>
                  <span className="text-sm font-semibold">{format(spike.cost)}</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {spike.explanation}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
