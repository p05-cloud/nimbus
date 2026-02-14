'use client';

import {
  ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle,
  DollarSign, Cpu, Shield, Activity, Server, Info,
} from 'lucide-react';
import { useCurrency } from '@/components/providers/CurrencyProvider';

// --- Types -------------------------------------------------------------------

interface CategoryScore {
  ok: number;
  warning: number;
  error: number;
  estimatedSavings?: number;
}

interface TrustedAdvisorCheck {
  checkId: string;
  name: string;
  category: string;
  status: string;
  estimatedMonthlySavings: number;
}

interface TrustedAdvisorSummary {
  checks: TrustedAdvisorCheck[];
  byCategoryScore: {
    cost_optimizing: CategoryScore & { estimatedSavings: number };
    security: CategoryScore;
    fault_tolerance: CategoryScore;
    performance: CategoryScore;
    service_limits: CategoryScore;
  };
  totalEstimatedSavings: number;
  status: 'active' | 'not-entitled' | 'error';
  errorMessage?: string;
}

interface TrustedAdvisorClientProps {
  data: TrustedAdvisorSummary | null;
}

// --- Helpers -----------------------------------------------------------------

type CategoryKey = keyof TrustedAdvisorSummary['byCategoryScore'];

const CATEGORIES: {
  key: CategoryKey;
  label: string;
  icon: typeof DollarSign;
  color: string;
  bgLight: string;
}[] = [
  { key: 'cost_optimizing', label: 'Cost Optimizing', icon: DollarSign, color: 'text-green-600 dark:text-green-400', bgLight: 'bg-green-50 dark:bg-green-900/10' },
  { key: 'security', label: 'Security', icon: Shield, color: 'text-blue-600 dark:text-blue-400', bgLight: 'bg-blue-50 dark:bg-blue-900/10' },
  { key: 'fault_tolerance', label: 'Fault Tolerance', icon: ShieldAlert, color: 'text-orange-600 dark:text-orange-400', bgLight: 'bg-orange-50 dark:bg-orange-900/10' },
  { key: 'performance', label: 'Performance', icon: Activity, color: 'text-purple-600 dark:text-purple-400', bgLight: 'bg-purple-50 dark:bg-purple-900/10' },
  { key: 'service_limits', label: 'Service Limits', icon: Server, color: 'text-cyan-600 dark:text-cyan-400', bgLight: 'bg-cyan-50 dark:bg-cyan-900/10' },
];

const statusOrder: Record<string, number> = { error: 0, warning: 1, ok: 2, not_available: 3 };

const statusStyles: Record<string, { bg: string; label: string }> = {
  ok: {
    bg: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    label: 'OK',
  },
  warning: {
    bg: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    label: 'Warning',
  },
  error: {
    bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    label: 'Action Needed',
  },
  not_available: {
    bg: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
    label: 'N/A',
  },
};

function getStatusIcon(status: string) {
  switch (status) {
    case 'ok':
      return CheckCircle;
    case 'warning':
      return AlertTriangle;
    case 'error':
      return ShieldAlert;
    default:
      return Info;
  }
}

function getScoreBg(score: CategoryScore): string {
  if (score.error > 0) return 'bg-red-500';
  if (score.warning > 0) return 'bg-yellow-500';
  return 'bg-green-500';
}

function formatCategoryLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// --- Not Entitled State ------------------------------------------------------

function NotEntitledState({ data }: { data: TrustedAdvisorSummary | null }) {
  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trusted Advisor</h1>
        <p className="text-sm text-muted-foreground">
          AWS best-practice recommendations across cost, security, performance, fault tolerance, and service limits.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-16 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mt-6 text-xl font-semibold">Trusted Advisor — Setup Required</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {data?.status === 'not-entitled'
            ? 'AWS Trusted Advisor requires a Business or Enterprise Support plan. Upgrade your AWS Support plan to unlock full best-practice checks.'
            : 'Trusted Advisor data is currently unavailable. Ensure AWS credentials are configured and your account has the necessary permissions.'}
        </p>

        <div className="mt-8 grid w-full max-w-lg gap-3">
          {[
            { icon: DollarSign, label: 'Cost Optimization', description: 'Identify idle resources, underutilized instances, and savings opportunities' },
            { icon: Shield, label: 'Security', description: 'Check IAM policies, security groups, MFA, and encryption settings' },
            { icon: Activity, label: 'Performance', description: 'Detect over-provisioned resources and high-utilization bottlenecks' },
            { icon: ShieldAlert, label: 'Fault Tolerance', description: 'Verify backups, multi-AZ, and disaster recovery configurations' },
            { icon: Server, label: 'Service Limits', description: 'Monitor usage against AWS service quotas before hitting limits' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-lg border p-4 text-left">
              <div className="flex items-center gap-3">
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
                Business+
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 w-full max-w-lg">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-left dark:border-blue-800 dark:bg-blue-900/20">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">How to enable</p>
            <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
              Upgrade your AWS Support plan to Business or Enterprise tier in the AWS Console under
              Support Center. Once upgraded, Trusted Advisor checks will auto-populate on this page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Error State -------------------------------------------------------------

function ErrorState({ message }: { message?: string }) {
  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trusted Advisor</h1>
        <p className="text-sm text-muted-foreground">
          AWS best-practice recommendations.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-16 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/20">
          <ShieldAlert className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="mt-6 text-xl font-semibold">Error Loading Trusted Advisor</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {message || 'An unexpected error occurred while fetching Trusted Advisor data. Please try again later.'}
        </p>
      </div>
    </div>
  );
}

// --- Main Component ----------------------------------------------------------

export function TrustedAdvisorClient({ data }: TrustedAdvisorClientProps) {
  const { format } = useCurrency();

  // Not entitled or null data
  if (!data || data.status === 'not-entitled') {
    return <NotEntitledState data={data} />;
  }

  // Error state
  if (data.status === 'error') {
    return <ErrorState message={data.errorMessage} />;
  }

  // Active state — compute aggregates
  const totalChecks = data.checks.length;
  const totalOk = Object.values(data.byCategoryScore).reduce((s, c) => s + c.ok, 0);
  const totalWarnings = Object.values(data.byCategoryScore).reduce((s, c) => s + c.warning, 0);
  const totalErrors = Object.values(data.byCategoryScore).reduce((s, c) => s + c.error, 0);

  // Sort checks: error > warning > ok > not_available
  const sortedChecks = [...data.checks].sort(
    (a, b) => (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4),
  );

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trusted Advisor</h1>
        <p className="text-sm text-muted-foreground">
          AWS best-practice checks — {totalChecks} checks evaluated across 5 pillars
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total Checks</p>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-1 text-3xl font-bold">{totalChecks}</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Passing</p>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
          <p className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">{totalOk}</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Warnings</p>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </div>
          <p className={`mt-1 text-3xl font-bold ${totalWarnings > 0 ? 'text-yellow-600 dark:text-yellow-400' : ''}`}>
            {totalWarnings}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Errors</p>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </div>
          <p className={`mt-1 text-3xl font-bold ${totalErrors > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
            {totalErrors}
          </p>
        </div>
      </div>

      {/* Savings Highlight Banner */}
      {data.totalEstimatedSavings > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                {format(data.totalEstimatedSavings)}/mo potential savings identified
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                Based on Trusted Advisor cost optimization recommendations
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5-Pillar Category Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {CATEGORIES.map((cat) => {
          const score = data.byCategoryScore[cat.key];
          const total = score.ok + score.warning + score.error;
          const okPercent = total > 0 ? (score.ok / total) * 100 : 100;
          const CatIcon = cat.icon;

          return (
            <div key={cat.key} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <CatIcon className={`h-4 w-4 ${cat.color}`} />
                <h3 className="text-sm font-semibold">{cat.label}</h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-green-600 dark:text-green-400">OK</span>
                  <span className="font-medium">{score.ok}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-yellow-600 dark:text-yellow-400">Warning</span>
                  <span className="font-medium">{score.warning}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-red-600 dark:text-red-400">Error</span>
                  <span className="font-medium">{score.error}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getScoreBg(score)}`}
                  style={{ width: `${Math.max(okPercent, 3)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {score.ok}/{total} passing
              </p>

              {/* Show savings for cost_optimizing */}
              {cat.key === 'cost_optimizing' && score.estimatedSavings !== undefined && score.estimatedSavings > 0 && (
                <p className="mt-1 text-xs font-medium text-green-600 dark:text-green-400">
                  {format(score.estimatedSavings)}/mo savings
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Full Checks Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="p-6 pb-3">
          <h3 className="font-semibold">All Checks</h3>
          <p className="text-sm text-muted-foreground">
            Full list of Trusted Advisor checks sorted by severity.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-t text-left">
                <th className="px-6 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Check Name</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Category</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Savings</th>
              </tr>
            </thead>
            <tbody>
              {sortedChecks.map((check) => {
                const style = statusStyles[check.status] || statusStyles.not_available;
                const StatusIcon = getStatusIcon(check.status);

                return (
                  <tr key={check.checkId} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg}`}>
                        <StatusIcon className="h-3 w-3" />
                        {style.label}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-sm">{check.name}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {formatCategoryLabel(check.category)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      {check.category === 'cost_optimizing' && check.estimatedMonthlySavings > 0 ? (
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          {format(check.estimatedMonthlySavings)}/mo
                        </span>
                      ) : check.category === 'cost_optimizing' ? (
                        <span className="text-xs text-muted-foreground">--</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {sortedChecks.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    No Trusted Advisor checks found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Footer */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <Info className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Powered by AWS Trusted Advisor
          </p>
          <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
            Checks are refreshed automatically. Trusted Advisor evaluates your AWS account against best practices
            across cost optimization, security, performance, fault tolerance, and service limits.
            Requires AWS Business or Enterprise Support plan for full access.
          </p>
        </div>
      </div>
    </div>
  );
}
