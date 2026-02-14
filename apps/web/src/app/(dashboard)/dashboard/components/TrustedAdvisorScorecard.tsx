'use client';

import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle, DollarSign, ArrowRight } from 'lucide-react';
import { useCurrency } from '@/components/providers/CurrencyProvider';
import Link from 'next/link';

// --- Types -------------------------------------------------------------------

interface CategoryScore {
  ok: number;
  warning: number;
  error: number;
  estimatedSavings?: number;
}

interface TrustedAdvisorSummary {
  checks: {
    checkId: string;
    name: string;
    category: string;
    status: string;
    estimatedMonthlySavings: number;
  }[];
  byCategoryScore: {
    cost_optimizing: CategoryScore & { estimatedSavings: number };
    security: CategoryScore;
    fault_tolerance: CategoryScore;
    performance: CategoryScore;
    service_limits: CategoryScore;
  };
  totalEstimatedSavings: number;
  status: string;
  errorMessage?: string;
}

interface TrustedAdvisorScorecardProps {
  trustedAdvisor: TrustedAdvisorSummary | null;
}

// --- Helpers -----------------------------------------------------------------

const CATEGORIES = [
  { key: 'cost_optimizing' as const, label: 'Cost', icon: DollarSign, color: 'text-green-600 dark:text-green-400' },
  { key: 'security' as const, label: 'Security', icon: ShieldCheck, color: 'text-blue-600 dark:text-blue-400' },
  { key: 'performance' as const, label: 'Perf', icon: AlertTriangle, color: 'text-purple-600 dark:text-purple-400' },
  { key: 'fault_tolerance' as const, label: 'Reliability', icon: ShieldAlert, color: 'text-orange-600 dark:text-orange-400' },
  { key: 'service_limits' as const, label: 'Limits', icon: AlertTriangle, color: 'text-cyan-600 dark:text-cyan-400' },
] as const;

function getScoreColor(score: CategoryScore): string {
  if (score.error > 0) return 'text-red-600 dark:text-red-400';
  if (score.warning > 0) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}

function getScoreBg(score: CategoryScore): string {
  if (score.error > 0) return 'bg-red-500';
  if (score.warning > 0) return 'bg-yellow-500';
  return 'bg-green-500';
}

// --- Component ---------------------------------------------------------------

export function TrustedAdvisorScorecard({ trustedAdvisor }: TrustedAdvisorScorecardProps) {
  const { format } = useCurrency();

  if (!trustedAdvisor || trustedAdvisor.status === 'not-entitled') {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Trusted Advisor</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            Enterprise
          </span>
        </div>
        <div className="flex flex-col items-center py-6 text-center">
          <ShieldCheck className="h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">
            {trustedAdvisor?.status === 'not-entitled'
              ? 'Requires Business or Enterprise Support plan'
              : 'Trusted Advisor data unavailable'}
          </p>
        </div>
      </div>
    );
  }

  if (trustedAdvisor.status === 'error') {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Trusted Advisor</h3>
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400">
            Error
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{trustedAdvisor.errorMessage}</p>
      </div>
    );
  }

  const totalChecks = trustedAdvisor.checks.length;
  const totalWarnings = Object.values(trustedAdvisor.byCategoryScore).reduce((s, c) => s + c.warning, 0);
  const totalErrors = Object.values(trustedAdvisor.byCategoryScore).reduce((s, c) => s + c.error, 0);
  const totalOk = Object.values(trustedAdvisor.byCategoryScore).reduce((s, c) => s + c.ok, 0);

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Trusted Advisor</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          totalErrors > 0
            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            : totalWarnings > 0
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        }`}>
          {totalErrors > 0 ? `${totalErrors} action needed` : totalWarnings > 0 ? `${totalWarnings} warnings` : 'All clear'}
        </span>
      </div>

      {/* Savings highlight */}
      {trustedAdvisor.totalEstimatedSavings > 0 && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 dark:bg-green-900/10">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              {format(trustedAdvisor.totalEstimatedSavings)}/mo potential savings
            </span>
          </div>
        </div>
      )}

      {/* 5-pillar scorecard */}
      <div className="space-y-2">
        {CATEGORIES.map((cat) => {
          const score = trustedAdvisor.byCategoryScore[cat.key];
          const total = score.ok + score.warning + score.error;
          const okPercent = total > 0 ? (score.ok / total) * 100 : 100;

          return (
            <div key={cat.key} className="flex items-center gap-3">
              <cat.icon className={`h-4 w-4 shrink-0 ${cat.color}`} />
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{cat.label}</span>
                  <span className={getScoreColor(score)}>
                    {score.error > 0 && <span className="text-red-600 dark:text-red-400">{score.error}!</span>}
                    {score.warning > 0 && <span className="ml-1 text-yellow-600 dark:text-yellow-400">{score.warning}w</span>}
                    {score.error === 0 && score.warning === 0 && (
                      <CheckCircle className="inline h-3 w-3 text-green-500" />
                    )}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${getScoreBg(score)}`}
                    style={{ width: `${Math.max(okPercent, 3)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 flex items-center justify-between border-t pt-3">
        <span className="text-xs text-muted-foreground">
          {totalOk}/{totalChecks} checks passing
        </span>
        <Link
          href="/dashboard/trusted-advisor"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View all checks <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
