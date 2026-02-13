'use client';

import { AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useCurrency } from '@/components/providers/CurrencyProvider';

interface AnomaliesClientProps {
  topServices: { name: string; provider: string; cost: number; change: number }[];
  totalSpendMTD: number;
  accountId: string;
  error?: string;
}

export function AnomaliesClient({ topServices, totalSpendMTD, accountId, error }: AnomaliesClientProps) {
  const { format } = useCurrency();

  if (error || totalSpendMTD === 0) {
    return (
      <div className="space-y-6 animate-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cost Anomalies</h1>
          <p className="text-sm text-muted-foreground">
            Automated detection of unusual spending patterns.
          </p>
        </div>
        <div className="rounded-xl border bg-card p-12 text-center">
          <Activity className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">No cost data available for anomaly detection.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect a cloud account to start monitoring for cost anomalies.
          </p>
        </div>
      </div>
    );
  }

  // Detect anomalies from real MoM change data
  // Services with >20% increase are flagged as cost spikes
  const spikingServices = topServices
    .filter((s) => s.change > 20)
    .sort((a, b) => b.change - a.change)
    .map((s, i) => ({
      id: String(i + 1),
      title: `${s.name} cost spike detected`,
      description: `Cost increased ${s.change.toFixed(0)}% compared to previous month. Current MTD: ${format(s.cost)}`,
      provider: s.provider,
      service: s.name,
      impact: s.cost * (s.change / 100), // Estimated excess cost
      change: s.change,
      status: 'open' as const,
    }));

  // Services with >30% decrease are flagged as significant drops
  const droppingServices = topServices
    .filter((s) => s.change < -30 && s.cost > 1)
    .sort((a, b) => a.change - b.change)
    .map((s, i) => ({
      id: `drop-${i + 1}`,
      title: `${s.name} significant cost decrease`,
      description: `Cost decreased ${Math.abs(s.change).toFixed(0)}% compared to previous month. This may indicate reduced usage or service migration.`,
      provider: s.provider,
      service: s.name,
      impact: 0,
      change: s.change,
      status: 'info' as const,
    }));

  const allAnomalies = [...spikingServices, ...droppingServices];
  const totalImpact = spikingServices.reduce((sum, a) => sum + a.impact, 0);

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cost Anomalies</h1>
        <p className="text-sm text-muted-foreground">
          Automated detection of unusual spending patterns — AWS Account {accountId}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Total Anomalies</p>
          <p className={`mt-1 text-3xl font-bold ${allAnomalies.length > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
            {allAnomalies.length}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Cost Spikes</p>
          </div>
          <p className={`mt-1 text-3xl font-bold ${spikingServices.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {spikingServices.length}
          </p>
          {spikingServices.length > 0 && totalImpact > 0 && (
            <p className="mt-1 text-xs text-destructive">
              ~{format(totalImpact)} excess cost
            </p>
          )}
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Cost Drops</p>
          </div>
          <p className={`mt-1 text-3xl font-bold ${droppingServices.length > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}>
            {droppingServices.length}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Services Monitored</p>
          <p className="mt-1 text-3xl font-bold">{topServices.length}</p>
        </div>
      </div>

      {allAnomalies.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <p className="mt-4 font-semibold text-green-700 dark:text-green-300">All Clear</p>
          <p className="mt-2 text-sm text-muted-foreground">
            No unusual spending patterns detected. All {topServices.length} monitored services
            are within normal range (less than 20% increase, less than 30% decrease).
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {allAnomalies.map((anomaly) => (
            <div key={anomaly.id} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {anomaly.status === 'open' ? (
                    <TrendingUp className="mt-0.5 h-5 w-5 text-destructive" />
                  ) : (
                    <TrendingDown className="mt-0.5 h-5 w-5 text-blue-500" />
                  )}
                  <div>
                    <h3 className="font-semibold">{anomaly.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{anomaly.description}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{anomaly.provider}</span>
                      <span>&middot;</span>
                      <span>{anomaly.service}</span>
                      <span>&middot;</span>
                      <span>{anomaly.change >= 0 ? '+' : ''}{anomaly.change.toFixed(1)}% MoM</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {anomaly.impact > 0 && (
                    <p className="font-semibold text-destructive">{format(anomaly.impact)}</p>
                  )}
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      anomaly.status === 'open'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}
                  >
                    {anomaly.status === 'open' ? 'spike' : 'drop'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Detection method:</strong> Services with &gt;20% month-over-month cost increase
          are flagged as cost spikes. Services with &gt;30% decrease are flagged as significant drops.
          AWS Cost Anomaly Detection has been enabled for more granular, ML-based anomaly detection with SNS alerts.
        </p>
      </div>
    </div>
  );
}
