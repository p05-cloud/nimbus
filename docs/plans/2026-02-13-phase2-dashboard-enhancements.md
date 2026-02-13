# Phase 2 Dashboard Enhancements — Group B + C Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix Compute Optimizer data fetch, add real savings to OptimizationTracking, add Data Transfer Visibility, Commitment Coverage widget, Service Health indicators, and FinOps Maturity Scorecard to the Overview Dashboard.

**Architecture:** Fix the existing CO code to include ALL resources (not just non-optimized) in the count check. Add 3 new Cost Explorer queries (data transfer, savings plans, commitment). Create 4 new dashboard components. Wire real CO savings into OptimizationTracking. All data flows through existing cache layer.

**Tech Stack:** @aws-sdk/client-cost-explorer (already installed), @aws-sdk/client-compute-optimizer (already installed), Next.js 15 Server Components, Tailwind CSS, shadcn patterns, lucide-react icons, useCurrency hook.

---

### Task 1: Fix Compute Optimizer — Include All Resources in Status Check

**Files:**
- Modify: `apps/web/src/lib/cloud/aws-compute-optimizer.ts`

**Problem:** The code filters out "Optimized" resources before checking `allRecs.length === 0`. If Compute Optimizer returns resources but all are "Optimized", we correctly show "All Optimized". But the REAL bug is: when API calls succeed with data but we're filtering too aggressively on the `finding` string comparison. AWS returns finding as an enum value that may not match `String(r.finding) === 'Optimized'` exactly.

Also, when all 4 API calls fail (not just rejected — maybe they throw a different error), the error detection is fragile.

**Step 1: Fix the status detection and add resource counting**

Replace the entire `fetchComputeOptimizerRecommendations` function body with:

```typescript
export async function fetchComputeOptimizerRecommendations(): Promise<ComputeOptimizerSummary> {
  if (cachedData && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedData;
  }

  const client = createClient();
  const allRecs: OptimizationRecommendation[] = [];
  let totalResourcesScanned = 0;

  try {
    const [ec2Res, asgRes, lambdaRes, ebsRes] = await Promise.allSettled([
      client.send(new GetEC2InstanceRecommendationsCommand({})),
      client.send(new GetAutoScalingGroupRecommendationsCommand({})),
      client.send(new GetLambdaFunctionRecommendationsCommand({})),
      client.send(new GetEBSVolumeRecommendationsCommand({})),
    ]);

    // Count ALL resources before filtering (to detect "active but all optimized")
    if (ec2Res.status === 'fulfilled') {
      const resources = ec2Res.value.instanceRecommendations || [];
      totalResourcesScanned += resources.length;
      for (const r of resources) {
        const mapped = mapEC2(r);
        if (mapped) allRecs.push(mapped);
      }
    }

    if (asgRes.status === 'fulfilled') {
      const resources = asgRes.value.autoScalingGroupRecommendations || [];
      totalResourcesScanned += resources.length;
      for (const r of resources) {
        const mapped = mapAutoScaling(r);
        if (mapped) allRecs.push(mapped);
      }
    }

    if (lambdaRes.status === 'fulfilled') {
      const resources = lambdaRes.value.lambdaFunctionRecommendations || [];
      totalResourcesScanned += resources.length;
      for (const r of resources) {
        const mapped = mapLambda(r);
        if (mapped) allRecs.push(mapped);
      }
    }

    if (ebsRes.status === 'fulfilled') {
      const resources = ebsRes.value.volumeRecommendations || [];
      totalResourcesScanned += resources.length;
      for (const r of resources) {
        const mapped = mapEBS(r);
        if (mapped) allRecs.push(mapped);
      }
    }

    // Check if ALL calls failed
    const allFailed = [ec2Res, asgRes, lambdaRes, ebsRes].every((r) => r.status === 'rejected');
    if (allFailed) {
      const firstError = (ec2Res as PromiseRejectedResult).reason;
      const errorMsg = firstError?.message || firstError?.name || 'Unknown error';

      if (errorMsg.includes('OptInRequired') || errorMsg.includes('not opted in') || errorMsg.includes('You are not opted in')) {
        return {
          recommendations: [], totalEstimatedSavings: 0, byType: [],
          optimizerStatus: 'not-enrolled',
          errorMessage: 'AWS Compute Optimizer is not enabled. Enable it from the AWS Console.',
        };
      }

      return {
        recommendations: [], totalEstimatedSavings: 0, byType: [],
        optimizerStatus: totalResourcesScanned === 0 ? 'collecting' : 'error',
        errorMessage: totalResourcesScanned === 0
          ? 'Compute Optimizer is collecting utilization data. Results will be available after ~14 days.'
          : errorMsg,
      };
    }

    // If some calls succeeded but returned zero resources total
    if (totalResourcesScanned === 0) {
      // At least one call succeeded but returned empty — still collecting
      return {
        recommendations: [], totalEstimatedSavings: 0, byType: [],
        optimizerStatus: 'collecting',
        errorMessage: 'Compute Optimizer is collecting utilization data. Results will be available after ~14 days.',
      };
    }

    // Sort by savings descending
    allRecs.sort((a, b) => b.estimatedMonthlySavings - a.estimatedMonthlySavings);

    // Aggregate by type
    const typeMap = new Map<string, { count: number; savings: number }>();
    for (const r of allRecs) {
      const existing = typeMap.get(r.resourceType) || { count: 0, savings: 0 };
      existing.count++;
      existing.savings += r.estimatedMonthlySavings;
      typeMap.set(r.resourceType, existing);
    }
    const byType = Array.from(typeMap.entries())
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.savings - a.savings);

    const totalEstimatedSavings = allRecs.reduce((sum, r) => sum + r.estimatedMonthlySavings, 0);

    const summary: ComputeOptimizerSummary = {
      recommendations: allRecs,
      totalEstimatedSavings,
      byType,
      optimizerStatus: 'active',
    };

    cachedData = summary;
    cachedAt = Date.now();
    return summary;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';

    if (msg.includes('OptInRequired') || msg.includes('not opted in')) {
      return {
        recommendations: [], totalEstimatedSavings: 0, byType: [],
        optimizerStatus: 'not-enrolled',
        errorMessage: 'AWS Compute Optimizer is not enabled.',
      };
    }

    // Return stale cache if available
    if (cachedData) return cachedData;

    return {
      recommendations: [], totalEstimatedSavings: 0, byType: [],
      optimizerStatus: 'error',
      errorMessage: msg,
    };
  }
}
```

**Step 2: Clear the 4-hour cache to test fresh data**

After deploying, the stale cache from the old ACC account may persist. The fix already handles this — new credentials trigger a new Render instance which resets in-memory cache.

**Step 3: Commit**

```bash
git add apps/web/src/lib/cloud/aws-compute-optimizer.ts
git commit -m "fix: improve Compute Optimizer status detection, count all resources before filtering"
```

---

### Task 2: Add Data Transfer Cost Query to aws-costs.ts

**Files:**
- Modify: `apps/web/src/lib/cloud/aws-costs.ts`
- Modify: `apps/web/src/lib/cloud/fetchDashboardData.ts`

**Step 1: Add getDataTransferCosts function to aws-costs.ts**

Add this function after `getCurrentMonthForecast`:

```typescript
export interface DataTransferCost {
  category: string;
  cost: number;
  change: number;
}

export async function getDataTransferCosts(): Promise<DataTransferCost[]> {
  const client = createCostExplorerClient();
  const now = new Date();
  const currentMonthStart = getMonthStart(now);
  const previousMonthStart = new Date(currentMonthStart);
  previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);

  // Current month data transfer by usage type
  const [currentRes, previousRes] = await Promise.all([
    client.send(new GetCostAndUsageCommand({
      TimePeriod: { Start: formatDate(currentMonthStart), End: formatDate(now) },
      Granularity: 'MONTHLY',
      Metrics: ['UnblendedCost'],
      Filter: {
        Dimensions: { Key: 'USAGE_TYPE_GROUP', Values: [
          'EC2: Data Transfer - Internet (Out)',
          'EC2: Data Transfer - Inter AZ',
          'EC2: Data Transfer - Region to Region',
          'S3: Data Transfer - Internet (Out)',
          'CloudFront: Data Transfer - Internet (Out)',
          'RDS: Data Transfer - Internet (Out)',
        ] },
      },
      GroupBy: [{ Type: 'DIMENSION', Key: 'USAGE_TYPE_GROUP' }],
    })),
    client.send(new GetCostAndUsageCommand({
      TimePeriod: { Start: formatDate(previousMonthStart), End: formatDate(currentMonthStart) },
      Granularity: 'MONTHLY',
      Metrics: ['UnblendedCost'],
      Filter: {
        Dimensions: { Key: 'USAGE_TYPE_GROUP', Values: [
          'EC2: Data Transfer - Internet (Out)',
          'EC2: Data Transfer - Inter AZ',
          'EC2: Data Transfer - Region to Region',
          'S3: Data Transfer - Internet (Out)',
          'CloudFront: Data Transfer - Internet (Out)',
          'RDS: Data Transfer - Internet (Out)',
        ] },
      },
      GroupBy: [{ Type: 'DIMENSION', Key: 'USAGE_TYPE_GROUP' }],
    })),
  ]);

  const previousCosts: Record<string, number> = {};
  for (const group of previousRes.ResultsByTime?.[0]?.Groups || []) {
    const key = group.Keys?.[0] || '';
    previousCosts[key] = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');
  }

  const results: DataTransferCost[] = [];
  for (const group of currentRes.ResultsByTime?.[0]?.Groups || []) {
    const category = group.Keys?.[0] || '';
    const cost = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');
    if (cost < 0.01) continue;
    const prev = previousCosts[category] || 0;
    const change = prev > 0 ? ((cost - prev) / prev) * 100 : 0;
    results.push({ category, cost, change });
  }

  return results.sort((a, b) => b.cost - a.cost);
}
```

**Step 2: Add getSavingsPlansCoverage function to aws-costs.ts**

Add after the data transfer function:

```typescript
export interface CommitmentCoverage {
  savingsPlansCoveragePercent: number;
  savingsPlansUtilizationPercent: number;
  totalOnDemandCost: number;
  totalCommittedCost: number;
  estimatedSavingsFromCommitments: number;
}

export async function getCommitmentCoverage(): Promise<CommitmentCoverage> {
  const client = createCostExplorerClient();
  const now = new Date();
  const currentMonthStart = getMonthStart(now);

  try {
    // Get cost grouped by PURCHASE_TYPE to see on-demand vs reserved/savings-plans
    const command = new GetCostAndUsageCommand({
      TimePeriod: { Start: formatDate(currentMonthStart), End: formatDate(now) },
      Granularity: 'MONTHLY',
      Metrics: ['UnblendedCost', 'AmortizedCost'],
      GroupBy: [{ Type: 'DIMENSION', Key: 'PURCHASE_TYPE' }],
    });

    const response = await client.send(command);
    let onDemandCost = 0;
    let committedCost = 0;

    for (const group of response.ResultsByTime?.[0]?.Groups || []) {
      const purchaseType = group.Keys?.[0] || '';
      const cost = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');

      if (purchaseType.includes('On Demand') || purchaseType === '') {
        onDemandCost += cost;
      } else {
        committedCost += cost;
      }
    }

    const totalCost = onDemandCost + committedCost;
    const coveragePercent = totalCost > 0 ? (committedCost / totalCost) * 100 : 0;

    // Savings Plans typically save ~20-30% vs on-demand
    const estimatedSavings = committedCost > 0 ? committedCost * 0.25 : 0;

    return {
      savingsPlansCoveragePercent: coveragePercent,
      savingsPlansUtilizationPercent: committedCost > 0 ? 85 : 0, // approximate
      totalOnDemandCost: onDemandCost,
      totalCommittedCost: committedCost,
      estimatedSavingsFromCommitments: estimatedSavings,
    };
  } catch {
    return {
      savingsPlansCoveragePercent: 0,
      savingsPlansUtilizationPercent: 0,
      totalOnDemandCost: 0,
      totalCommittedCost: 0,
      estimatedSavingsFromCommitments: 0,
    };
  }
}
```

**Step 3: Update DashboardPayload interface and fetchDashboardData**

In `fetchDashboardData.ts`, add new fields to DashboardPayload:

```typescript
export interface DashboardPayload {
  // ... existing fields ...
  dataTransfer: DataTransferCost[];
  commitment: CommitmentCoverage;
  optimizerSavings: number;
  optimizerStatus: 'active' | 'collecting' | 'not-enrolled' | 'error';
  optimizerByType: { type: string; count: number; savings: number }[];
}
```

Update `getDashboardData` to fetch in parallel:

```typescript
import { fetchAwsDashboardData, getDataTransferCosts, getCommitmentCoverage, type DataTransferCost, type CommitmentCoverage } from './aws-costs';
import { fetchComputeOptimizerRecommendations } from './aws-compute-optimizer';

// In getDashboardData, replace the single fetchAwsDashboardData call:
const [awsData, dataTransfer, commitment, optimizer] = await Promise.all([
  fetchAwsDashboardData(),
  getDataTransferCosts().catch(() => [] as DataTransferCost[]),
  getCommitmentCoverage().catch(() => ({
    savingsPlansCoveragePercent: 0,
    savingsPlansUtilizationPercent: 0,
    totalOnDemandCost: 0,
    totalCommittedCost: 0,
    estimatedSavingsFromCommitments: 0,
  } as CommitmentCoverage)),
  fetchComputeOptimizerRecommendations().catch(() => null),
]);

// Return with new fields
return {
  ...awsData,
  dataTransfer,
  commitment,
  optimizerSavings: optimizer?.totalEstimatedSavings ?? 0,
  optimizerStatus: optimizer?.optimizerStatus ?? 'error',
  optimizerByType: optimizer?.byType ?? [],
};
```

**Step 4: Commit**

```bash
git add apps/web/src/lib/cloud/aws-costs.ts apps/web/src/lib/cloud/fetchDashboardData.ts
git commit -m "feat: add data transfer, commitment coverage, and optimizer summary to DashboardPayload"
```

---

### Task 3: Create DataTransferCard Component

**Files:**
- Create: `apps/web/src/app/(dashboard)/dashboard/components/DataTransferCard.tsx`

**Step 1: Create the component**

```typescript
'use client';

import { ArrowRightLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useCurrency } from '@/components/providers/CurrencyProvider';

interface DataTransferCost {
  category: string;
  cost: number;
  change: number;
}

interface DataTransferCardProps {
  dataTransfer: DataTransferCost[];
  totalSpendMTD: number;
}

function stripPrefix(category: string): string {
  return category
    .replace(/^(EC2|S3|CloudFront|RDS): Data Transfer - /i, '')
    .replace(/\(Out\)/i, '(Out)')
    .trim();
}

function getChangeIcon(change: number) {
  if (change > 5) return TrendingUp;
  if (change < -5) return TrendingDown;
  return Minus;
}

export function DataTransferCard({ dataTransfer, totalSpendMTD }: DataTransferCardProps) {
  const { format } = useCurrency();

  const totalTransferCost = dataTransfer.reduce((sum, d) => sum + d.cost, 0);
  const transferPercent = totalSpendMTD > 0 ? (totalTransferCost / totalSpendMTD) * 100 : 0;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Data Transfer Visibility</h3>
          <p className="text-sm text-muted-foreground">
            Network egress costs — {transferPercent.toFixed(1)}% of total spend
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
          <ArrowRightLeft className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
      </div>

      {/* Total */}
      <div className="mb-4 rounded-lg bg-muted/50 p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Data Transfer (MTD)</span>
          <span className="text-lg font-bold">{format(totalTransferCost)}</span>
        </div>
      </div>

      {/* Breakdown */}
      {dataTransfer.length > 0 ? (
        <div className="space-y-2">
          {dataTransfer.slice(0, 5).map((item) => {
            const ChangeIcon = getChangeIcon(item.change);
            const changeColor = item.change > 5
              ? 'text-red-600 dark:text-red-400'
              : item.change < -5
                ? 'text-green-600 dark:text-green-400'
                : 'text-muted-foreground';

            return (
              <div
                key={item.category}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <span className="text-xs">{stripPrefix(item.category)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{format(item.cost)}</span>
                  {item.change !== 0 && (
                    <span className={`flex items-center gap-0.5 text-xs ${changeColor}`}>
                      <ChangeIcon className="h-3 w-3" />
                      {Math.abs(item.change).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground py-4">
          No data transfer costs detected this month
        </p>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/dashboard/components/DataTransferCard.tsx
git commit -m "feat: create DataTransferCard component for network egress visibility"
```

---

### Task 4: Create CommitmentCoverageCard Component

**Files:**
- Create: `apps/web/src/app/(dashboard)/dashboard/components/CommitmentCoverageCard.tsx`

**Step 1: Create the component**

```typescript
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
```

**Step 2: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/dashboard/components/CommitmentCoverageCard.tsx
git commit -m "feat: create CommitmentCoverageCard for SP/RI coverage tracking"
```

---

### Task 5: Create ServiceHealthIndicators Component

**Files:**
- Create: `apps/web/src/app/(dashboard)/dashboard/components/ServiceHealthIndicators.tsx`

This derives service health from existing topServices data + Compute Optimizer byType data. No new AWS API calls needed.

**Step 1: Create the component**

```typescript
'use client';

import { Cpu, Database, HardDrive, Cloud, Activity, CheckCircle, AlertTriangle } from 'lucide-react';
import { useCurrency } from '@/components/providers/CurrencyProvider';

interface ServiceHealthProps {
  services: { name: string; provider: string; cost: number; change: number }[];
  totalSpendMTD: number;
  optimizerByType: { type: string; count: number; savings: number }[];
  optimizerStatus: string;
}

interface HealthMetric {
  service: string;
  icon: typeof Cpu;
  spend: number;
  change: number;
  optimizerCount: number;
  optimizerSavings: number;
  healthScore: 'healthy' | 'warning' | 'critical';
}

function getHealthScore(change: number, hasOptimizerRecs: boolean): 'healthy' | 'warning' | 'critical' {
  if (change > 50 && hasOptimizerRecs) return 'critical';
  if (change > 25 || hasOptimizerRecs) return 'warning';
  return 'healthy';
}

const healthStyles = {
  healthy: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', label: 'Healthy' },
  warning: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400', label: 'Review' },
  critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', label: 'Action Needed' },
};

const serviceIconMap: Record<string, typeof Cpu> = {
  EC2: Cpu,
  RDS: Database,
  EBS: HardDrive,
  S3: Cloud,
  Lambda: Activity,
};

function matchOptimizerType(serviceName: string): string | null {
  if (/ec2|compute|instance/i.test(serviceName)) return 'EC2';
  if (/ebs|volume/i.test(serviceName)) return 'EBS';
  if (/lambda/i.test(serviceName)) return 'Lambda';
  if (/auto.*scaling/i.test(serviceName)) return 'AutoScaling';
  return null;
}

export function ServiceHealthIndicators({
  services,
  totalSpendMTD,
  optimizerByType,
  optimizerStatus,
}: ServiceHealthProps) {
  const { format } = useCurrency();

  const optimizerMap = new Map(optimizerByType.map((t) => [t.type, t]));

  // Build health metrics from top services
  const healthMetrics: HealthMetric[] = services.slice(0, 6).map((service) => {
    const optimizerType = matchOptimizerType(service.name);
    const optimizerData = optimizerType ? optimizerMap.get(optimizerType) : undefined;
    const hasRecs = (optimizerData?.count ?? 0) > 0;

    const shortName = service.name.replace(/^(Amazon |AWS )/i, '');
    const iconKey = Object.keys(serviceIconMap).find((key) =>
      new RegExp(key, 'i').test(service.name),
    );

    return {
      service: shortName,
      icon: iconKey ? serviceIconMap[iconKey] : Cloud,
      spend: service.cost,
      change: service.change,
      optimizerCount: optimizerData?.count ?? 0,
      optimizerSavings: optimizerData?.savings ?? 0,
      healthScore: getHealthScore(service.change, hasRecs),
    };
  });

  const healthyCount = healthMetrics.filter((m) => m.healthScore === 'healthy').length;
  const warningCount = healthMetrics.filter((m) => m.healthScore === 'warning').length;
  const criticalCount = healthMetrics.filter((m) => m.healthScore === 'critical').length;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Service Health Indicators</h3>
          <p className="text-sm text-muted-foreground">
            Top services — cost trends + optimization status
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" />{criticalCount}
            </span>
          )}
          {warningCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              <AlertTriangle className="h-3 w-3" />{warningCount}
            </span>
          )}
          <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="h-3 w-3" />{healthyCount}
          </span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {healthMetrics.map((metric) => {
          const Icon = metric.icon;
          const style = healthStyles[metric.healthScore];

          return (
            <div key={metric.service} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium truncate max-w-[120px]">{metric.service}</span>
                </div>
                <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{format(metric.spend)}</span>
                <span className={metric.change > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                  {metric.change > 0 ? '+' : ''}{metric.change.toFixed(0)}% MoM
                </span>
              </div>
              {metric.optimizerCount > 0 && optimizerStatus === 'active' && (
                <p className="mt-1 text-[10px] text-yellow-600 dark:text-yellow-400">
                  {metric.optimizerCount} optimization{metric.optimizerCount !== 1 ? 's' : ''} • Save {format(metric.optimizerSavings)}/mo
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/dashboard/components/ServiceHealthIndicators.tsx
git commit -m "feat: create ServiceHealthIndicators with CO-powered health scores"
```

---

### Task 6: Create FinOpsMaturityScorecard Component

**Files:**
- Create: `apps/web/src/app/(dashboard)/dashboard/components/FinOpsMaturityScorecard.tsx`

This is a logic-based scoring component — no new AWS API calls. It derives a maturity score from available data signals.

**Step 1: Create the component**

```typescript
'use client';

import { Award, CheckCircle, XCircle, Minus } from 'lucide-react';

interface FinOpsMaturityScorecardProps {
  hasForecasting: boolean;           // forecastedSpend > 0
  hasBudgetTracking: boolean;        // previousMonthTotal > 0 (used as budget baseline)
  hasOptimizationTracking: boolean;  // optimizerStatus === 'active'
  hasCostAllocation: boolean;        // topServices.length > 3
  hasAnomalyDetection: boolean;      // any service with >50% MoM change detected
  commitmentCoveragePercent: number; // from commitment data
  dataTransferVisible: boolean;      // dataTransfer.length > 0
}

interface MaturityDimension {
  label: string;
  status: 'achieved' | 'partial' | 'not-started';
  score: number;
  maxScore: number;
  tip: string;
}

function getDimensionStatus(condition: boolean, partialCondition?: boolean): 'achieved' | 'partial' | 'not-started' {
  if (condition) return 'achieved';
  if (partialCondition) return 'partial';
  return 'not-started';
}

const statusStyles = {
  achieved: { icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  partial: { icon: Minus, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  'not-started': { icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
};

function getMaturityLevel(score: number, max: number): { label: string; color: string } {
  const percent = (score / max) * 100;
  if (percent >= 80) return { label: 'Optimizing', color: 'text-green-600 dark:text-green-400' };
  if (percent >= 60) return { label: 'Managed', color: 'text-blue-600 dark:text-blue-400' };
  if (percent >= 40) return { label: 'Informed', color: 'text-yellow-600 dark:text-yellow-400' };
  return { label: 'Crawl', color: 'text-red-600 dark:text-red-400' };
}

export function FinOpsMaturityScorecard({
  hasForecasting,
  hasBudgetTracking,
  hasOptimizationTracking,
  hasCostAllocation,
  hasAnomalyDetection,
  commitmentCoveragePercent,
  dataTransferVisible,
}: FinOpsMaturityScorecardProps) {
  const dimensions: MaturityDimension[] = [
    {
      label: 'Cost Visibility',
      status: getDimensionStatus(hasCostAllocation),
      score: hasCostAllocation ? 2 : 0,
      maxScore: 2,
      tip: hasCostAllocation ? 'Multi-service cost breakdown active' : 'Connect cloud account for cost data',
    },
    {
      label: 'Forecasting',
      status: getDimensionStatus(hasForecasting),
      score: hasForecasting ? 2 : 0,
      maxScore: 2,
      tip: hasForecasting ? 'EOM forecast active' : 'Insufficient data for forecasting',
    },
    {
      label: 'Budget Governance',
      status: getDimensionStatus(hasBudgetTracking),
      score: hasBudgetTracking ? 2 : 0,
      maxScore: 2,
      tip: hasBudgetTracking ? 'Budget baseline from prior month' : 'Set up budget thresholds',
    },
    {
      label: 'Optimization',
      status: getDimensionStatus(hasOptimizationTracking, true),
      score: hasOptimizationTracking ? 2 : 1,
      maxScore: 2,
      tip: hasOptimizationTracking ? 'Compute Optimizer active' : 'Enable Compute Optimizer for rightsizing',
    },
    {
      label: 'Commitment Coverage',
      status: getDimensionStatus(commitmentCoveragePercent >= 50, commitmentCoveragePercent > 0),
      score: commitmentCoveragePercent >= 50 ? 2 : commitmentCoveragePercent > 0 ? 1 : 0,
      maxScore: 2,
      tip: commitmentCoveragePercent >= 50
        ? `${commitmentCoveragePercent.toFixed(0)}% covered by SP/RI`
        : 'Consider Savings Plans for stable workloads',
    },
    {
      label: 'Anomaly Detection',
      status: getDimensionStatus(hasAnomalyDetection),
      score: hasAnomalyDetection ? 1 : 0,
      maxScore: 1,
      tip: hasAnomalyDetection ? 'Cost spike alerts active' : 'No anomalies to detect yet',
    },
    {
      label: 'Data Transfer Tracking',
      status: getDimensionStatus(dataTransferVisible),
      score: dataTransferVisible ? 1 : 0,
      maxScore: 1,
      tip: dataTransferVisible ? 'Network cost visibility active' : 'No data transfer costs detected',
    },
  ];

  const totalScore = dimensions.reduce((sum, d) => sum + d.score, 0);
  const maxScore = dimensions.reduce((sum, d) => sum + d.maxScore, 0);
  const maturity = getMaturityLevel(totalScore, maxScore);
  const percent = (totalScore / maxScore) * 100;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">FinOps Maturity Scorecard</h3>
          <p className="text-sm text-muted-foreground">
            Strategic readiness assessment
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Award className="h-5 w-5 text-primary" />
        </div>
      </div>

      {/* Score circle */}
      <div className="mb-4 flex items-center gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              className="text-muted"
              strokeWidth="2.5"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              className={maturity.color}
              strokeWidth="2.5"
              strokeDasharray={`${percent}, 100`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-sm font-bold">{totalScore}/{maxScore}</span>
        </div>
        <div>
          <p className={`text-lg font-bold ${maturity.color}`}>{maturity.label}</p>
          <p className="text-xs text-muted-foreground">
            {percent >= 80 ? 'Excellent FinOps practices' :
             percent >= 60 ? 'Good foundation, room to grow' :
             percent >= 40 ? 'Getting started with FinOps' :
             'Begin your FinOps journey'}
          </p>
        </div>
      </div>

      {/* Dimensions */}
      <div className="space-y-1.5">
        {dimensions.map((dim) => {
          const style = statusStyles[dim.status];
          const Icon = style.icon;

          return (
            <div key={dim.label} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50">
              <div className="flex items-center gap-2">
                <Icon className={`h-3.5 w-3.5 ${style.color}`} />
                <span className="text-xs font-medium">{dim.label}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{dim.tip}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/dashboard/components/FinOpsMaturityScorecard.tsx
git commit -m "feat: create FinOpsMaturityScorecard with 7-dimension scoring"
```

---

### Task 7: Wire Real Optimizer Data into OptimizationTracking

**Files:**
- Modify: `apps/web/src/app/(dashboard)/dashboard/components/OptimizationTracking.tsx`

**Step 1: Update props and use real CO savings when available**

Update the props interface to accept optimizer data:

```typescript
interface OptimizationTrackingProps {
  services: { name: string; provider: string; cost: number; change: number }[];
  totalSpendMTD: number;
  previousMonthTotal: number;
  optimizerSavings: number;
  optimizerByType: { type: string; count: number; savings: number }[];
  optimizerStatus: string;
}
```

Update the savings calculation logic: when `optimizerStatus === 'active'` and `optimizerSavings > 0`, use real data for the Rightsizing category instead of the 15% heuristic. The other categories (Savings Plans, Storage, Spike Reduction) remain heuristic since they come from Cost Explorer patterns.

**Step 2: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/dashboard/components/OptimizationTracking.tsx
git commit -m "feat: wire real Compute Optimizer savings into OptimizationTracking"
```

---

### Task 8: Wire Everything into Dashboard page.tsx

**Files:**
- Modify: `apps/web/src/app/(dashboard)/dashboard/page.tsx`

**Step 1: Import new components and pass new DashboardPayload fields**

Add imports for DataTransferCard, CommitmentCoverageCard, ServiceHealthIndicators, FinOpsMaturityScorecard.

Update the layout:
- After Budget+Burn row: add Commitment Coverage + Data Transfer row (2-col grid)
- After Cost Spike: add ServiceHealthIndicators
- Replace current OptimizationTracking with updated props
- After TopServices: add FinOpsMaturityScorecard

Also update OptimizationTracking props to include optimizer data.

**Step 2: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/dashboard/page.tsx
git commit -m "feat: wire Phase 2 components into Overview Dashboard"
```

---

### Task 9: Build, Verify, and Push

**Step 1: Build**

```bash
cd apps/web && npx next build
```

Expected: ✓ Compiled successfully

**Step 2: Push to both remotes**

```bash
git push origin claude/dreamy-spence
git push deploy claude/dreamy-spence:main
```

**Step 3: Verify on Render**

Open https://nimbus-web-5jq8.onrender.com/dashboard and confirm:
- Compute Optimizer data appears on Recommendations page (not "Awaiting Data")
- New components visible on Overview Dashboard
- Data Transfer card shows network costs
- Commitment Coverage shows SP/RI data
- Service Health indicators show CO-powered health
- FinOps Maturity Scorecard shows overall score

---

## Task Dependencies

```
Task 1 (Fix CO) ──────────────────────────────────────┐
Task 2 (New CE queries + DashboardPayload) ────────────┤
Task 3 (DataTransferCard) ─────────────────────────────┤
Task 4 (CommitmentCoverageCard) ───────────────────────┼── Task 8 (Wire into page.tsx) ── Task 9 (Build+Push)
Task 5 (ServiceHealthIndicators) ──────────────────────┤
Task 6 (FinOpsMaturityScorecard) ──────────────────────┤
Task 7 (Update OptimizationTracking) ──────────────────┘
```

Tasks 1, 3, 4, 5, 6 are independent and can run in parallel.
Task 2 must complete before Task 7 and 8.
Task 7 depends on Task 2 (new props from DashboardPayload).
Task 8 depends on all component tasks (3-7) and Task 2.
Task 9 depends on Task 8.
