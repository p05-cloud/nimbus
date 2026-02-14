'use client';

import { AlertTriangle, TrendingUp, Activity, ArrowRight } from 'lucide-react';
import { useCurrency } from '@/components/providers/CurrencyProvider';
import Link from 'next/link';

// --- Types -------------------------------------------------------------------

interface AwsAnomaly {
  anomalyId: string;
  startDate: string;
  endDate: string;
  dimensionValue: string;
  rootCauses: { service: string; region: string; usageType: string }[];
  impact: { maxImpact: number; totalImpact: number; totalActualSpend: number; totalExpectedSpend: number };
  feedback: string;
}

interface NativeAnomalySummary {
  anomalies: AwsAnomaly[];
  monitors: { monitorArn: string; monitorName: string; monitorType: string }[];
  totalImpact: number;
  activeAnomalies: number;
  status: string;
  errorMessage?: string;
}

interface NativeAnomaliesCardProps {
  nativeAnomalies: NativeAnomalySummary | null;
}

// --- Component ---------------------------------------------------------------

export function NativeAnomaliesCard({ nativeAnomalies }: NativeAnomaliesCardProps) {
  const { format } = useCurrency();

  if (!nativeAnomalies || nativeAnomalies.status === 'error') {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Cost Anomalies</h3>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex flex-col items-center py-6 text-center">
          <Activity className="h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">
            {nativeAnomalies?.errorMessage || 'Anomaly detection unavailable'}
          </p>
        </div>
      </div>
    );
  }

  if (nativeAnomalies.status === 'no-monitors') {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Cost Anomalies</h3>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex flex-col items-center py-4 text-center">
          <Activity className="h-8 w-8 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">No anomaly monitors configured</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Enable AWS Cost Anomaly Detection for ML-based anomaly alerts
          </p>
        </div>
      </div>
    );
  }

  const hasAnomalies = nativeAnomalies.activeAnomalies > 0;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Cost Anomalies</h3>
        {hasAnomalies ? (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {nativeAnomalies.activeAnomalies} active
          </span>
        ) : (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Normal
          </span>
        )}
      </div>

      {/* Impact summary */}
      {hasAnomalies && nativeAnomalies.totalImpact > 0 && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 dark:bg-red-900/10">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-sm font-medium text-red-700 dark:text-red-300">
              {format(nativeAnomalies.totalImpact)} total anomalous spend
            </span>
          </div>
        </div>
      )}

      {/* Anomaly list */}
      {hasAnomalies ? (
        <div className="space-y-2">
          {nativeAnomalies.anomalies.slice(0, 3).map((anomaly) => {
            const rootCause = anomaly.rootCauses[0];
            return (
              <div
                key={anomaly.anomalyId}
                className="flex items-start gap-2.5 rounded-lg border p-2.5"
              >
                <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">
                    {rootCause?.service || anomaly.dimensionValue || 'Unknown'}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                    {rootCause?.region && <span>{rootCause.region}</span>}
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      +{format(anomaly.impact.totalImpact)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {nativeAnomalies.anomalies.length > 3 && (
            <p className="text-center text-xs text-muted-foreground">
              +{nativeAnomalies.anomalies.length - 3} more anomalies
            </p>
          )}
        </div>
      ) : (
        <div className="py-4 text-center">
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">All Clear</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {nativeAnomalies.monitors.length} monitor{nativeAnomalies.monitors.length !== 1 ? 's' : ''} active, no anomalies detected
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 border-t pt-3">
        <Link
          href="/dashboard/anomalies"
          className="flex items-center justify-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View anomaly details <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
