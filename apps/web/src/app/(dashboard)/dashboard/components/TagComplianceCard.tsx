'use client';

import { Tag, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

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
  status: string;
  errorMessage?: string;
}

interface TagComplianceCardProps {
  tagCompliance: TagComplianceSummary | null;
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

// --- Component ---------------------------------------------------------------

export function TagComplianceCard({ tagCompliance }: TagComplianceCardProps) {
  if (!tagCompliance || tagCompliance.status === 'error') {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Tag Compliance</h3>
          <Tag className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex flex-col items-center py-6 text-center">
          <Tag className="h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">
            {tagCompliance?.errorMessage || 'Tag compliance data unavailable'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Tag Compliance</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          tagCompliance.compliancePercent >= 80
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : tagCompliance.compliancePercent >= 50
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {tagCompliance.compliancePercent.toFixed(0)}% compliant
        </span>
      </div>

      {/* Overall compliance */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Overall</span>
          <span className={`font-semibold ${getComplianceColor(tagCompliance.compliancePercent)}`}>
            {tagCompliance.taggedResources}/{tagCompliance.totalResources}
          </span>
        </div>
        <div className="mt-1.5 h-2 w-full rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${getComplianceBg(tagCompliance.compliancePercent)}`}
            style={{ width: `${Math.max(tagCompliance.compliancePercent, 2)}%` }}
          />
        </div>
      </div>

      {/* Per-tag compliance */}
      <div className="space-y-2.5">
        {tagCompliance.requiredTags.slice(0, 4).map((tag) => (
          <div key={tag.tagKey}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{tag.tagKey}</span>
              <span className={getComplianceColor(tag.compliancePercent)}>
                {tag.compliancePercent.toFixed(0)}%
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${getComplianceBg(tag.compliancePercent)}`}
                style={{ width: `${Math.max(tag.compliancePercent, 2)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Cost allocation tags */}
      {tagCompliance.costAllocationTags.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5">
          <CheckCircle className="h-3 w-3 text-green-500" />
          <span className="text-xs text-muted-foreground">
            {tagCompliance.costAllocationTags.length} cost allocation tags active
          </span>
        </div>
      )}
      {tagCompliance.costAllocationTags.length === 0 && (
        <div className="mt-3 flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 text-yellow-500" />
          <span className="text-xs text-yellow-700 dark:text-yellow-400">
            No cost allocation tags activated
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 border-t pt-3">
        <Link
          href="/dashboard/tag-governance"
          className="flex items-center justify-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View tag governance <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
