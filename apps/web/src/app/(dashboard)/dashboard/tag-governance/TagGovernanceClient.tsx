'use client';

import {
  Tag, CheckCircle, XCircle, AlertTriangle, Info, Search,
} from 'lucide-react';

// --- Types -------------------------------------------------------------------

interface TagRequirement {
  tagKey: string;
  taggedCount: number;
  untaggedCount: number;
  compliancePercent: number;
}

interface TagComplianceSummary {
  totalResources: number;
  taggedResources: number;
  untaggedResources: number;
  compliancePercent: number;
  requiredTags: TagRequirement[];
  costAllocationTags: string[];
  status: 'active' | 'error';
  errorMessage?: string;
}

interface TagGovernanceClientProps {
  data: TagComplianceSummary | null;
}

// --- Helpers -----------------------------------------------------------------

function getComplianceColor(percent: number): string {
  if (percent >= 80) return 'text-green-600 dark:text-green-400';
  if (percent >= 50) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function getComplianceBg(percent: number): string {
  if (percent >= 80) return 'bg-green-500';
  if (percent >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getComplianceBadge(percent: number): string {
  if (percent >= 80) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (percent >= 50) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
}

// --- Unavailable State -------------------------------------------------------

function TagGovernanceUnavailable({ errorMessage }: { errorMessage?: string }) {
  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tag Governance</h1>
        <p className="text-sm text-muted-foreground">
          Tag compliance, cost allocation tags, and resource tagging policies.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-16 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Tag className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mt-6 text-xl font-semibold">Tag Governance — Unavailable</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {errorMessage || 'Unable to fetch tag compliance data. Ensure AWS credentials are configured and the Resource Groups Tagging API is accessible.'}
        </p>

        <div className="mt-8 grid w-full max-w-lg gap-3">
          {[
            { icon: Tag, label: 'Required Tags', description: 'Enforce Environment, Team, CostCenter, Project, and Owner tags' },
            { icon: Search, label: 'Compliance Tracking', description: 'Monitor tag compliance across all AWS resources' },
            { icon: CheckCircle, label: 'Cost Allocation Tags', description: 'Track which tags are activated for cost attribution' },
            { icon: AlertTriangle, label: 'Gap Analysis', description: 'Identify untagged resources that need attention' },
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
                AWS Tags
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 w-full max-w-lg">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-left dark:border-blue-800 dark:bg-blue-900/20">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">How it works</p>
            <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
              Tag governance uses the AWS Resource Groups Tagging API to scan your resources
              and check compliance against required tags. Configure your AWS credentials in
              the environment to enable this feature.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Active Tag Governance View ----------------------------------------------

export function TagGovernanceClient({ data }: TagGovernanceClientProps) {
  // Show unavailable state if no data or error status
  if (!data || data.status === 'error') {
    return <TagGovernanceUnavailable errorMessage={data?.errorMessage} />;
  }

  const { totalResources, taggedResources, untaggedResources, compliancePercent, requiredTags, costAllocationTags } = data;

  return (
    <div className="space-y-6 animate-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tag Governance</h1>
        <p className="text-sm text-muted-foreground">
          Tag compliance across {totalResources} resources — {requiredTags.length} required tags evaluated
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Overall Compliance</p>
            <Tag className="h-4 w-4 text-primary" />
          </div>
          <p className={`mt-1 text-3xl font-bold ${getComplianceColor(compliancePercent)}`}>
            {compliancePercent.toFixed(0)}%
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total Resources</p>
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-1 text-3xl font-bold">{totalResources}</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Tagged Resources</p>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
          <p className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">{taggedResources}</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Untagged Resources</p>
            <XCircle className="h-4 w-4 text-red-500" />
          </div>
          <p className={`mt-1 text-3xl font-bold ${untaggedResources > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
            {untaggedResources}
          </p>
        </div>
      </div>

      {/* Overall Compliance Progress Bar */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Overall Tag Compliance</h3>
          <span className="text-sm text-muted-foreground">
            {taggedResources} of {totalResources} resources compliant
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getComplianceBg(compliancePercent)}`}
            style={{ width: `${Math.max(compliancePercent, 1)}%` }}
          />
        </div>
        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${getComplianceBg(compliancePercent)}`} /> Compliant ({compliancePercent.toFixed(1)}%)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/30" /> Non-compliant ({(100 - compliancePercent).toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Required Tags Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="p-6 pb-3">
          <h3 className="font-semibold">Required Tags</h3>
          <p className="text-sm text-muted-foreground">
            Compliance status for each required tag across all discovered resources.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-t text-left">
                <th className="px-6 py-3 font-medium text-muted-foreground">Tag Key</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Tagged</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Untagged</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Compliance</th>
                <th className="px-6 py-3 font-medium text-muted-foreground min-w-[200px]">Progress</th>
              </tr>
            </thead>
            <tbody>
              {requiredTags.map((tag) => (
                <tr key={tag.tagKey} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-6 py-3">
                    <span className="font-mono text-xs font-medium">{tag.tagKey}</span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-green-600 dark:text-green-400">{tag.taggedCount}</span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={tag.untaggedCount > 0 ? 'text-red-600 dark:text-red-400' : ''}>
                      {tag.untaggedCount}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${getComplianceBadge(tag.compliancePercent)}`}>
                      {tag.compliancePercent >= 80 ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : tag.compliancePercent >= 50 ? (
                        <AlertTriangle className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {tag.compliancePercent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getComplianceBg(tag.compliancePercent)}`}
                        style={{ width: `${Math.max(tag.compliancePercent, 1)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {requiredTags.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No required tags configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost Allocation Tags */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h3 className="font-semibold">Cost Allocation Tags</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Tags activated for cost attribution in AWS Billing Console.
        </p>

        {costAllocationTags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {costAllocationTags.map((tagKey) => (
              <span
                key={tagKey}
                className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
              >
                <CheckCircle className="h-3 w-3" />
                {tagKey}
              </span>
            ))}
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                No cost allocation tags activated
              </p>
              <p className="mt-0.5 text-xs text-yellow-700 dark:text-yellow-300">
                Activate cost allocation tags in the AWS Billing Console to enable accurate cost-per-tag breakdowns
                and chargeback reporting.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <Info className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            About Tag Governance
          </p>
          <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
            Tag compliance is checked against required tags: Environment, Team, CostCenter, Project, Owner.
            Enable cost allocation tags in AWS Billing Console for accurate cost attribution. Tag data is
            fetched from the AWS Resource Groups Tagging API and cached for performance.
          </p>
        </div>
      </div>
    </div>
  );
}
