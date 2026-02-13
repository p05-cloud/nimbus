# Dashboard Enhancements Phase 1 — Executive FinOps Insights

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Nimbus dashboard and budget pages from basic data display into executive decision tools with budget-vs-forecast variance, daily burn rate, cost spike explanations, optimization tracking, multi-level alerts, and tax separation.

**Architecture:** All 6 enhancements derive data from the existing `getDashboardData()` return (monthlyCosts, topServices, totalSpendMTD, forecastedSpend, previousMonthTotal). No new AWS API calls needed. New components are client-side "use client" components co-located with the dashboard route. Budget page gets multi-level thresholds and variance widgets.

**Tech Stack:** Next.js 15 (Server Components + Client Components), Recharts (charts), Tailwind CSS, lucide-react (icons), CurrencyProvider (INR/USD formatting)

---

## Overview of Tasks

| # | Enhancement | Image Source | Component |
|---|------------|-------------|-----------|
| 1 | Budget vs Forecast with Variance & Risk | Image 1 #1, Image 2 #4, #8 | `BudgetForecastCard.tsx` |
| 2 | Daily Burn Rate Indicator | Image 1 #4 | `BurnRateCard.tsx` |
| 3 | Cost Spike Explanation Panel | Image 1 #5 | `CostSpikePanel.tsx` |
| 4 | Optimization Tracking Section | Image 1 #6 | `OptimizationTracking.tsx` |
| 5 | Separate Tax from Cloud Spend | Image 1 #9 | Modify `KpiCards.tsx` |
| 6 | Multi-Level Alert Thresholds (Budget Page) | Image 2 #1 | Modify `BudgetsClient.tsx` |
| 7 | Budget Variance Widget (Budget Page) | Image 2 #4, #7 | `BudgetVarianceWidget.tsx` |
| 8 | Forecast Risk Indicator (Budget Page) | Image 2 #8 | `ForecastRiskIndicator.tsx` |
| 9 | Wire everything into page.tsx + budgets/page.tsx | — | Modify server components |
| 10 | Build & verify | — | — |

---

### Task 1: Budget vs Forecast Card (Overview Dashboard)

**Files:**
- Create: `apps/web/src/app/(dashboard)/dashboard/components/BudgetForecastCard.tsx`

**What it shows:**
- Monthly Budget (110% of forecast)
- Forecasted Spend
- Variance = Forecast - Budget (positive = risk, negative = under)
- Risk Indicator: Green (< 80%), Amber (80-100%), Red (> 100%)
- "Are we within budget?" — answered at a glance

**Step 1: Create the component**

```tsx
'use client';

import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import { useCurrency } from '@/components/providers/CurrencyProvider';

interface BudgetForecastCardProps {
  totalSpendMTD: number;
  forecastedSpend: number;
  previousMonthTotal: number;
}

export function BudgetForecastCard({
  totalSpendMTD,
  forecastedSpend,
  previousMonthTotal,
}: BudgetForecastCardProps) {
  const { format } = useCurrency();

  // Budget = 110% of previous month (a realistic baseline)
  const budget = previousMonthTotal * 1.1;
  const variance = forecastedSpend - budget;
  const variancePct = budget > 0 ? (variance / budget) * 100 : 0;
  const usagePct = budget > 0 ? (totalSpendMTD / budget) * 100 : 0;

  // Risk logic: based on forecasted vs budget
  const forecastRatio = budget > 0 ? (forecastedSpend / budget) * 100 : 0;
  const risk: 'low' | 'medium' | 'high' =
    forecastRatio > 100 ? 'high' : forecastRatio > 80 ? 'medium' : 'low';

  const riskConfig = {
    low: {
      label: 'On Track',
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/30',
      icon: CheckCircle,
      barColor: 'bg-green-500',
    },
    medium: {
      label: 'Warning',
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      icon: AlertTriangle,
      barColor: 'bg-yellow-500',
    },
    high: {
      label: 'At Risk',
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
      icon: AlertTriangle,
      barColor: 'bg-red-500',
    },
  };

  const rc = riskConfig[risk];
  const RiskIcon = rc.icon;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Budget vs Forecast</h3>
          <p className="text-sm text-muted-foreground">Are we within budget?</p>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${rc.bg} ${rc.color}`}>
          <RiskIcon className="h-3.5 w-3.5" />
          {rc.label}
        </div>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Budget</p>
          <p className="text-lg font-bold">{format(budget)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Forecast</p>
          <p className="text-lg font-bold">{format(forecastedSpend)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Variance</p>
          <p className={`text-lg font-bold ${variance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {variance > 0 ? '+' : ''}{format(Math.abs(variance))}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>MTD: {format(totalSpendMTD)} ({usagePct.toFixed(1)}%)</span>
          <span>Budget: {format(budget)}</span>
        </div>
        <div className="h-2.5 rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${rc.barColor}`}
            style={{ width: `${Math.min(usagePct, 100)}%` }}
          />
        </div>
        {/* Forecast marker */}
        <div className="relative h-0">
          <div
            className="absolute -top-2.5 h-2.5 w-0.5 bg-foreground/60"
            style={{ left: `${Math.min(forecastRatio, 100)}%` }}
            title={`Forecast: ${forecastRatio.toFixed(0)}%`}
          />
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify build compiles**

Run: `cd /Users/alex/Documents/FinOps/.claude/worktrees/dreamy-spence && pnpm --filter web build 2>&1 | tail -5`

(Don't wire into page.tsx yet — we do that in Task 9)

**Step 3: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/dashboard/components/BudgetForecastCard.tsx
git commit -m "feat: add BudgetForecastCard component with variance and risk indicator"
```

---

### Task 2: Daily Burn Rate Indicator

**Files:**
- Create: `apps/web/src/app/(dashboard)/dashboard/components/BurnRateCard.tsx`

**What it shows:**
- Current daily burn rate (MTD / days elapsed)
- Required daily burn to stay within budget for remaining days
- Month progress (day X of Y)
- Projected risk: on pace vs over pace

**Step 1: Create the component**

```tsx
'use client';

import { Flame, Target } from 'lucide-react';
import { useCurrency } from '@/components/providers/CurrencyProvider';

interface BurnRateCardProps {
  totalSpendMTD: number;
  forecastedSpend: number;
  previousMonthTotal: number;
}

export function BurnRateCard({
  totalSpendMTD,
  forecastedSpend,
  previousMonthTotal,
}: BurnRateCardProps) {
  const { format } = useCurrency();

  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - dayOfMonth;

  const currentBurnRate = totalSpendMTD / Math.max(dayOfMonth, 1);
  const budget = previousMonthTotal * 1.1;
  const budgetRemaining = Math.max(budget - totalSpendMTD, 0);
  const requiredBurnRate = daysRemaining > 0 ? budgetRemaining / daysRemaining : 0;

  const burnRatio = requiredBurnRate > 0 ? currentBurnRate / requiredBurnRate : 1;
  const isOverPace = burnRatio > 1.1;
  const isSlightlyOver = burnRatio > 0.95 && !isOverPace;

  const projectedEOM = currentBurnRate * daysInMonth;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Daily Burn Rate</h3>
          <p className="text-sm text-muted-foreground">
            Day {dayOfMonth} of {daysInMonth} — {daysRemaining} days left
          </p>
        </div>
        <Flame className={`h-5 w-5 ${isOverPace ? 'text-red-500' : isSlightlyOver ? 'text-yellow-500' : 'text-green-500'}`} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Flame className="h-3.5 w-3.5" />
            Current Burn
          </div>
          <p className="mt-1 text-xl font-bold">{format(currentBurnRate)}<span className="text-sm font-normal text-muted-foreground">/day</span></p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Target className="h-3.5 w-3.5" />
            Required Burn
          </div>
          <p className="mt-1 text-xl font-bold">{format(requiredBurnRate)}<span className="text-sm font-normal text-muted-foreground">/day</span></p>
        </div>
      </div>

      {/* Month progress bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Month Progress</span>
          <span>{((dayOfMonth / daysInMonth) * 100).toFixed(0)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(dayOfMonth / daysInMonth) * 100}%` }}
          />
        </div>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        {isOverPace ? (
          <span className="text-red-600 dark:text-red-400">
            Burning {((burnRatio - 1) * 100).toFixed(0)}% faster than budget allows. Projected: {format(projectedEOM)}
          </span>
        ) : (
          <span className="text-green-600 dark:text-green-400">
            On pace. Projected EOM: {format(projectedEOM)}
          </span>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/dashboard/components/BurnRateCard.tsx
git commit -m "feat: add BurnRateCard with current vs required daily burn rate"
```

---

### Task 3: Cost Spike Explanation Panel

**Files:**
- Create: `apps/web/src/app/(dashboard)/dashboard/components/CostSpikePanel.tsx`

**What it shows:**
- Auto-generated summaries like "EC2 increased 214% due to growth in usage"
- Services with >20% MoM increase flagged
- Natural language explanations clients can share with management
- "Clients don't want numbers, they want reasons"

**Step 1: Create the component**

```tsx
'use client';

import { Zap, TrendingUp, Info } from 'lucide-react';
import { useCurrency } from '@/components/providers/CurrencyProvider';

interface CostSpikePanelProps {
  services: { name: string; provider: string; cost: number; change: number }[];
  totalSpendMTD: number;
  previousMonthTotal: number;
}

interface SpikeExplanation {
  service: string;
  change: number;
  cost: number;
  impact: number; // % of total spend this service represents
  explanation: string;
  severity: 'critical' | 'warning' | 'info';
}

function generateExplanations(
  services: { name: string; provider: string; cost: number; change: number }[],
  totalSpendMTD: number,
  previousMonthTotal: number,
): SpikeExplanation[] {
  const spikes: SpikeExplanation[] = [];

  for (const svc of services) {
    if (svc.change <= 20) continue; // Only flag >20% increases

    const impact = totalSpendMTD > 0 ? (svc.cost / totalSpendMTD) * 100 : 0;
    const prevCost = svc.change > 0 ? svc.cost / (1 + svc.change / 100) : svc.cost;
    const costIncrease = svc.cost - prevCost;

    // Generate natural language explanation
    let explanation: string;
    const svcShort = svc.name.replace('Amazon ', '').replace('AWS ', '');

    if (svc.change > 200) {
      explanation = `${svcShort} surged ${svc.change.toFixed(0)}% vs last month — a ${svc.provider === 'AWS' ? 'possible new workload or scaling event' : 'significant increase'}. This adds ~${formatUsd(costIncrease)} to monthly spend.`;
    } else if (svc.change > 100) {
      explanation = `${svcShort} more than doubled (+${svc.change.toFixed(0)}%). Investigate whether new instances, higher throughput, or configuration changes are driving the increase.`;
    } else if (svc.change > 50) {
      explanation = `${svcShort} grew ${svc.change.toFixed(0)}% MoM. This could indicate increased usage, under-optimized resources, or a pricing change.`;
    } else {
      explanation = `${svcShort} increased ${svc.change.toFixed(0)}% compared to last month. Monitor for continued growth.`;
    }

    spikes.push({
      service: svc.name,
      change: svc.change,
      cost: svc.cost,
      impact,
      explanation,
      severity: svc.change > 100 ? 'critical' : svc.change > 50 ? 'warning' : 'info',
    });
  }

  return spikes.sort((a, b) => b.change - a.change).slice(0, 5);
}

function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

const severityConfig = {
  critical: {
    bg: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
    icon: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  },
  warning: {
    bg: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20',
    icon: 'text-yellow-600 dark:text-yellow-400',
    badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  },
  info: {
    bg: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
    icon: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  },
};

export function CostSpikePanel({ services, totalSpendMTD, previousMonthTotal }: CostSpikePanelProps) {
  const { format } = useCurrency();
  const spikes = generateExplanations(services, totalSpendMTD, previousMonthTotal);

  if (spikes.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Cost Spike Analysis</h3>
            <p className="text-sm text-muted-foreground">Auto-detected anomalies</p>
          </div>
          <Zap className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
          <Info className="h-4 w-4 text-green-600 dark:text-green-400" />
          <p className="text-sm text-green-700 dark:text-green-300">
            No significant cost spikes detected. All services within normal range.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Cost Spike Analysis</h3>
          <p className="text-sm text-muted-foreground">
            {spikes.length} service{spikes.length !== 1 ? 's' : ''} with significant MoM increase
          </p>
        </div>
        <Zap className="h-5 w-5 text-yellow-500" />
      </div>

      <div className="space-y-3">
        {spikes.map((spike) => {
          const cfg = severityConfig[spike.severity];
          return (
            <div key={spike.service} className={`rounded-lg border p-3 ${cfg.bg}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className={`h-4 w-4 ${cfg.icon}`} />
                  <span className="text-sm font-medium">{spike.service}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.badge}`}>
                    +{spike.change.toFixed(0)}%
                  </span>
                  <span className="text-sm font-semibold">{format(spike.cost)}</span>
                </div>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                {spike.explanation}
              </p>
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
git add apps/web/src/app/\(dashboard\)/dashboard/components/CostSpikePanel.tsx
git commit -m "feat: add CostSpikePanel with natural-language spike explanations"
```

---

### Task 4: Optimization Tracking Section

**Files:**
- Create: `apps/web/src/app/(dashboard)/dashboard/components/OptimizationTracking.tsx`

**What it shows:**
- Identified Savings (total potential from recommendations)
- Open Opportunities count
- Savings Realized This Month (estimated)
- Required Daily Burn to meet forecast

**Step 1: Create the component**

```tsx
'use client';

import { Target, DollarSign, Lightbulb, TrendingDown } from 'lucide-react';
import { useCurrency } from '@/components/providers/CurrencyProvider';

interface OptimizationTrackingProps {
  services: { name: string; provider: string; cost: number; change: number }[];
  totalSpendMTD: number;
  previousMonthTotal: number;
}

export function OptimizationTracking({
  services,
  totalSpendMTD,
  previousMonthTotal,
}: OptimizationTrackingProps) {
  const { format } = useCurrency();

  // Derive optimization metrics from service data
  const compute = services.filter((s) => /ec2|compute|instance|lambda/i.test(s.name));
  const storage = services.filter((s) => /s3|storage|ebs|backup/i.test(s.name));
  const stable = services.filter((s) => Math.abs(s.change) < 20 && s.cost > 0.5);
  const spiking = services.filter((s) => s.change > 25);

  const rightsizingSavings = compute.reduce((s, c) => s + c.cost, 0) * 0.15;
  const savingsPlanSavings = stable.reduce((s, c) => s + c.cost, 0) * 0.30;
  const storageSavings = storage.reduce((s, c) => s + c.cost, 0) * 0.20;
  const spikeSavings = spiking.reduce((s, c) => s + c.cost, 0) * 0.30;

  const totalIdentified = rightsizingSavings + savingsPlanSavings + storageSavings + spikeSavings;
  const openOpportunities =
    (compute.length > 0 ? 1 : 0) +
    (stable.length > 0 ? 1 : 0) +
    (storage.length > 0 ? 1 : 0) +
    (spiking.length > 0 ? 1 : 0);

  // Estimated realized savings (if spend decreased vs last month)
  const realizedSavings = previousMonthTotal > totalSpendMTD
    ? previousMonthTotal - totalSpendMTD
    : 0;

  const metrics = [
    {
      label: 'Identified Savings',
      value: format(totalIdentified),
      sublabel: '/month potential',
      icon: DollarSign,
      color: 'text-green-600 dark:text-green-400',
    },
    {
      label: 'Open Opportunities',
      value: String(openOpportunities),
      sublabel: 'categories to optimize',
      icon: Lightbulb,
      color: 'text-yellow-600 dark:text-yellow-400',
    },
    {
      label: 'Realized Savings',
      value: format(realizedSavings),
      sublabel: 'vs last month',
      icon: TrendingDown,
      color: realizedSavings > 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground',
    },
    {
      label: 'Savings Rate',
      value: totalSpendMTD > 0 ? `${((totalIdentified / totalSpendMTD) * 100).toFixed(1)}%` : '0%',
      sublabel: 'of current spend',
      icon: Target,
      color: 'text-blue-600 dark:text-blue-400',
    },
  ];

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="font-semibold">Optimization Tracking</h3>
        <p className="text-sm text-muted-foreground">Savings potential across all services</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="text-center">
            <m.icon className={`mx-auto h-5 w-5 ${m.color}`} />
            <p className="mt-1 text-lg font-bold">{m.value}</p>
            <p className="text-xs text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Savings breakdown bar */}
      {totalIdentified > 0 && (
        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-1">Savings Breakdown</p>
          <div className="flex h-2 rounded-full overflow-hidden">
            {rightsizingSavings > 0 && (
              <div
                className="bg-blue-500 transition-all"
                style={{ width: `${(rightsizingSavings / totalIdentified) * 100}%` }}
                title={`Rightsizing: ${format(rightsizingSavings)}`}
              />
            )}
            {savingsPlanSavings > 0 && (
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${(savingsPlanSavings / totalIdentified) * 100}%` }}
                title={`Savings Plans: ${format(savingsPlanSavings)}`}
              />
            )}
            {storageSavings > 0 && (
              <div
                className="bg-purple-500 transition-all"
                style={{ width: `${(storageSavings / totalIdentified) * 100}%` }}
                title={`Storage: ${format(storageSavings)}`}
              />
            )}
            {spikeSavings > 0 && (
              <div
                className="bg-orange-500 transition-all"
                style={{ width: `${(spikeSavings / totalIdentified) * 100}%` }}
                title={`Spike Investigation: ${format(spikeSavings)}`}
              />
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {rightsizingSavings > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />Rightsizing</span>}
            {savingsPlanSavings > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" />Savings Plans</span>}
            {storageSavings > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500" />Storage</span>}
            {spikeSavings > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" />Spike Reduction</span>}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/dashboard/components/OptimizationTracking.tsx
git commit -m "feat: add OptimizationTracking with savings breakdown visualization"
```

---

### Task 5: Separate Tax from Cloud Spend in KPI Cards

**Files:**
- Modify: `apps/web/src/app/(dashboard)/dashboard/components/KpiCards.tsx`

**What changes:**
- Replace "Active Anomalies" card (currently hardcoded to 0) with "Tax" card
- Show Cloud Usage, Tax (estimated 18% GST for India), Total
- This makes the executive view cleaner — "here's what you're paying for cloud, here's tax on top"

**Step 1: Modify KpiCards**

In `KpiCards.tsx`, update the `KpiCardsProps` interface to accept `previousMonthTotal`:

```tsx
interface KpiCardsProps {
  totalSpendMTD: number;
  forecastedSpend: number;
  changePercentage: number;
  previousMonthTotal: number;
}
```

Replace the kpis array to separate cloud spend and tax:

```tsx
export function KpiCards({ totalSpendMTD, forecastedSpend, changePercentage, previousMonthTotal }: KpiCardsProps) {
  const { format } = useCurrency();

  // Estimate tax (18% GST in India, configurable)
  const taxRate = 0.18;
  const cloudSpend = totalSpendMTD / (1 + taxRate);
  const tax = totalSpendMTD - cloudSpend;

  const kpis = [
    {
      title: 'Cloud Usage (MTD)',
      value: cloudSpend,
      change: changePercentage,
      icon: DollarSign,
      trend: changePercentage <= 0 ? ('down' as const) : ('up' as const),
    },
    {
      title: 'Tax (GST 18%)',
      value: tax,
      change: 0,
      icon: Receipt,
      trend: 'neutral' as const,
    },
    {
      title: 'Total Spend (MTD)',
      value: totalSpendMTD,
      change: changePercentage,
      icon: TrendingUp,
      trend: changePercentage <= 0 ? ('down' as const) : ('up' as const),
    },
    {
      title: 'Forecasted (EOM)',
      value: forecastedSpend,
      change: 0,
      icon: TrendingUp,
      trend: 'neutral' as const,
    },
  ];
  // ... rest of render stays the same
```

Add `Receipt` to the lucide-react imports:

```tsx
import { DollarSign, TrendingUp, Receipt } from 'lucide-react';
```

Note: Remove `TrendingDown, AlertTriangle` if no longer used.

**Step 2: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/dashboard/components/KpiCards.tsx
git commit -m "feat: separate tax from cloud spend in KPI cards"
```

---

### Task 6: Multi-Level Alert Thresholds (Budget Page)

**Files:**
- Modify: `apps/web/src/app/(dashboard)/dashboard/budgets/BudgetsClient.tsx`

**What changes:**
- Current gap: Only "On Track" status with basic Warning/Over Budget
- New: 3-level alerts: < 50% = On Track (green), 50-80% = Normal (blue), 80-100% = Warning (yellow), > 100% = Critical (red)
- Show threshold markers on progress bar (50%, 80%, 100%)
- Add alert icons and clearer status messaging

**Step 1: Update BudgetsClient with multi-level thresholds**

Replace the budget card rendering section (inside the `.map()`) with enhanced threshold logic:

```tsx
// Replace existing threshold logic with multi-level
const percentage = (budget.spent / budget.limit) * 100;
const projectedPct = (budget.projected / budget.limit) * 100;

type AlertLevel = 'on-track' | 'normal' | 'warning' | 'critical';
const alertLevel: AlertLevel =
  percentage > 100 ? 'critical' :
  percentage > 80 ? 'warning' :
  percentage > 50 ? 'normal' : 'on-track';

const willExceed = projectedPct > 100 && alertLevel !== 'critical';

const alertConfig = {
  'on-track': {
    label: 'On Track',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    bar: 'bg-green-500',
    icon: '✓',
  },
  'normal': {
    label: '50% Used',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    bar: 'bg-blue-500',
    icon: 'ℹ',
  },
  'warning': {
    label: 'Warning (>80%)',
    badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    bar: 'bg-yellow-500',
    icon: '⚠',
  },
  'critical': {
    label: 'Critical (>100%)',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    bar: 'bg-red-500',
    icon: '🔴',
  },
};
```

Add threshold markers on the progress bar:

```tsx
{/* Progress bar with threshold markers */}
<div className="mt-2 relative">
  <div className="h-2.5 rounded-full bg-muted">
    <div
      className={`h-full rounded-full transition-all ${ac.bar}`}
      style={{ width: `${Math.min(percentage, 100)}%` }}
    />
  </div>
  {/* Threshold markers */}
  <div className="absolute top-0 h-2.5 w-px bg-yellow-600/60" style={{ left: '50%' }} />
  <div className="absolute top-0 h-2.5 w-px bg-orange-600/60" style={{ left: '80%' }} />
  <div className="absolute top-0 h-2.5 w-px bg-red-600/60" style={{ left: '100%' }} />
</div>
<div className="mt-1 flex justify-between text-xs text-muted-foreground">
  <span>{percentage.toFixed(1)}% used</span>
  {willExceed && <span className="text-yellow-600 dark:text-yellow-400">⚠ Projected to exceed</span>}
  <span>Projected: {format(budget.projected)}</span>
</div>
```

**Step 2: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/dashboard/budgets/BudgetsClient.tsx
git commit -m "feat: add multi-level alert thresholds (50%, 80%, 100%) to budget cards"
```

---

### Task 7: Budget Variance Widget (Budget Page)

**Files:**
- Create: `apps/web/src/app/(dashboard)/dashboard/budgets/BudgetVarianceWidget.tsx`

**What it shows (from Image 2 #4):**
- Budget Limit, Actual Spend, Forecasted Spend, Variance Amount
- Example: Budget ₹3,400, Forecast ₹3,900, Variance: +₹500 (Risk)
- Also MoM comparison (Image 2 #7): Last Month Spend, Current Month Projection, % change

**Step 1: Create the widget**

```tsx
'use client';

import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { useCurrency } from '@/components/providers/CurrencyProvider';
import { formatPercentage } from '@/lib/utils';

interface BudgetVarianceWidgetProps {
  totalSpendMTD: number;
  forecastedSpend: number;
  previousMonthTotal: number;
}

export function BudgetVarianceWidget({
  totalSpendMTD,
  forecastedSpend,
  previousMonthTotal,
}: BudgetVarianceWidgetProps) {
  const { format } = useCurrency();

  const budget = previousMonthTotal * 1.1;
  const variance = forecastedSpend - budget;
  const variancePct = budget > 0 ? (variance / budget) * 100 : 0;
  const momChange = previousMonthTotal > 0
    ? ((forecastedSpend - previousMonthTotal) / previousMonthTotal) * 100
    : 0;

  const rows = [
    { label: 'Budget Limit', value: format(budget), emphasis: false },
    { label: 'Actual Spend (MTD)', value: format(totalSpendMTD), emphasis: false },
    { label: 'Forecasted Spend', value: format(forecastedSpend), emphasis: false },
    {
      label: 'Variance',
      value: `${variance >= 0 ? '+' : ''}${format(Math.abs(variance))}`,
      emphasis: true,
      isRisk: variance > 0,
    },
  ];

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="font-semibold mb-4">Budget vs Forecast Variance</h3>

      {/* Main table */}
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className={`flex items-center justify-between ${row.emphasis ? 'border-t pt-3' : ''}`}>
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span className={`text-sm font-semibold ${
              row.emphasis
                ? row.isRisk
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
                : ''
            }`}>
              {row.value}
              {row.emphasis && (
                <span className="ml-1 text-xs">
                  ({variancePct >= 0 ? '+' : ''}{variancePct.toFixed(1)}%)
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* MoM comparison */}
      <div className="mt-4 rounded-lg bg-muted/50 p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Month-over-Month</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Last Month</p>
            <p className="text-sm font-semibold">{format(previousMonthTotal)}</p>
          </div>
          <div className={`flex items-center gap-1 ${
            momChange > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
          }`}>
            {momChange > 0 ? <ArrowUpRight className="h-4 w-4" /> : momChange < 0 ? <ArrowDownRight className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
            <span className="text-sm font-bold">{formatPercentage(momChange)}</span>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Projected</p>
            <p className="text-sm font-semibold">{format(forecastedSpend)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/dashboard/budgets/BudgetVarianceWidget.tsx
git commit -m "feat: add BudgetVarianceWidget with MoM comparison"
```

---

### Task 8: Forecast Risk Indicator (Budget Page)

**Files:**
- Create: `apps/web/src/app/(dashboard)/dashboard/budgets/ForecastRiskIndicator.tsx`

**What it shows (from Image 2 #8):**
- If Projected > 95% of Budget → Risk: High
- Visual: Low / Medium / High gauge
- Simple, clear risk communication for executives

**Step 1: Create the component**

```tsx
'use client';

import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { useCurrency } from '@/components/providers/CurrencyProvider';

interface ForecastRiskIndicatorProps {
  totalSpendMTD: number;
  forecastedSpend: number;
  previousMonthTotal: number;
}

export function ForecastRiskIndicator({
  totalSpendMTD,
  forecastedSpend,
  previousMonthTotal,
}: ForecastRiskIndicatorProps) {
  const { format } = useCurrency();

  const budget = previousMonthTotal * 1.1;
  const forecastRatio = budget > 0 ? (forecastedSpend / budget) * 100 : 0;

  const risk: 'low' | 'medium' | 'high' =
    forecastRatio > 95 ? 'high' : forecastRatio > 75 ? 'medium' : 'low';

  const config = {
    low: {
      label: 'Low Risk',
      description: 'Forecast is well within budget. No action needed.',
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-500',
      bgLight: 'bg-green-100 dark:bg-green-900/30',
      icon: CheckCircle,
    },
    medium: {
      label: 'Medium Risk',
      description: 'Forecast approaching budget limit. Monitor closely.',
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-500',
      bgLight: 'bg-yellow-100 dark:bg-yellow-900/30',
      icon: AlertTriangle,
    },
    high: {
      label: 'High Risk',
      description: 'Forecast exceeds or nearly exceeds budget. Immediate attention required.',
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-500',
      bgLight: 'bg-red-100 dark:bg-red-900/30',
      icon: AlertTriangle,
    },
  };

  const c = config[risk];
  const Icon = c.icon;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="font-semibold mb-4">Forecast Risk</h3>

      <div className="flex items-center gap-4">
        {/* Risk gauge */}
        <div className={`flex h-16 w-16 items-center justify-center rounded-full ${c.bgLight}`}>
          <Icon className={`h-8 w-8 ${c.color}`} />
        </div>

        <div>
          <p className={`text-lg font-bold ${c.color}`}>{c.label}</p>
          <p className="text-xs text-muted-foreground">{c.description}</p>
        </div>
      </div>

      {/* Risk meter bar */}
      <div className="mt-4">
        <div className="flex h-3 rounded-full overflow-hidden">
          <div className={`flex-1 ${risk === 'low' ? 'bg-green-500' : 'bg-green-200 dark:bg-green-900/30'}`} />
          <div className={`flex-1 mx-0.5 ${risk === 'medium' ? 'bg-yellow-500' : 'bg-yellow-200 dark:bg-yellow-900/30'}`} />
          <div className={`flex-1 ${risk === 'high' ? 'bg-red-500' : 'bg-red-200 dark:bg-red-900/30'}`} />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Low</span>
          <span>Medium</span>
          <span>High</span>
        </div>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        Forecast is at <span className={`font-semibold ${c.color}`}>{forecastRatio.toFixed(1)}%</span> of budget ({format(forecastedSpend)} / {format(budget)})
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/dashboard/budgets/ForecastRiskIndicator.tsx
git commit -m "feat: add ForecastRiskIndicator with low/medium/high gauge"
```

---

### Task 9: Wire Everything into Page Components

**Files:**
- Modify: `apps/web/src/app/(dashboard)/dashboard/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/dashboard/budgets/page.tsx`

**Step 1: Update main dashboard page.tsx**

```tsx
import { getDashboardData } from '@/lib/cloud/fetchDashboardData';
import { KpiCards } from './components/KpiCards';
import { CostTrendChart } from './components/CostTrendChart';
import { CostByProviderChart } from './components/CostByProviderChart';
import { TopServices } from './components/TopServices';
import { RecentRecommendations } from './components/RecentRecommendations';
import { BudgetForecastCard } from './components/BudgetForecastCard';
import { BurnRateCard } from './components/BurnRateCard';
import { CostSpikePanel } from './components/CostSpikePanel';
import { OptimizationTracking } from './components/OptimizationTracking';
import { AlertTriangle } from 'lucide-react';

export const metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Cloud spend overview — Account {data.accountId}
        </p>
      </div>

      {data.error && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Live data unavailable</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">{data.error}</p>
          </div>
        </div>
      )}

      {/* Row 1: KPI Cards (4 cards) */}
      <KpiCards
        totalSpendMTD={data.totalSpendMTD}
        forecastedSpend={data.forecastedSpend}
        changePercentage={data.changePercentage}
        previousMonthTotal={data.previousMonthTotal}
      />

      {/* Row 2: Budget vs Forecast + Burn Rate (side by side) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <BudgetForecastCard
          totalSpendMTD={data.totalSpendMTD}
          forecastedSpend={data.forecastedSpend}
          previousMonthTotal={data.previousMonthTotal}
        />
        <BurnRateCard
          totalSpendMTD={data.totalSpendMTD}
          forecastedSpend={data.forecastedSpend}
          previousMonthTotal={data.previousMonthTotal}
        />
      </div>

      {/* Row 3: Cost Trend + Provider Distribution */}
      <div className="grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <CostTrendChart monthlyCosts={data.monthlyCosts} />
        </div>
        <div className="lg:col-span-3">
          <CostByProviderChart monthlyCosts={data.monthlyCosts} />
        </div>
      </div>

      {/* Row 4: Cost Spike Analysis (full width) */}
      <CostSpikePanel
        services={data.topServices}
        totalSpendMTD={data.totalSpendMTD}
        previousMonthTotal={data.previousMonthTotal}
      />

      {/* Row 5: Optimization Tracking (full width) */}
      <OptimizationTracking
        services={data.topServices}
        totalSpendMTD={data.totalSpendMTD}
        previousMonthTotal={data.previousMonthTotal}
      />

      {/* Row 6: Top Services + Recommendations */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TopServices services={data.topServices} />
        <RecentRecommendations services={data.topServices} totalSpendMTD={data.totalSpendMTD} />
      </div>
    </div>
  );
}
```

**Step 2: Update budgets page.tsx**

```tsx
import { getDashboardData } from '@/lib/cloud/fetchDashboardData';
import { BudgetsClient } from './BudgetsClient';
import { BudgetVarianceWidget } from './BudgetVarianceWidget';
import { ForecastRiskIndicator } from './ForecastRiskIndicator';

export const metadata = { title: 'Budgets' };
export const dynamic = 'force-dynamic';

export default async function BudgetsPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6 animate-in">
      {/* Variance + Risk widgets (above the main budget view) */}
      {data.totalSpendMTD > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <BudgetVarianceWidget
            totalSpendMTD={data.totalSpendMTD}
            forecastedSpend={data.forecastedSpend}
            previousMonthTotal={data.previousMonthTotal}
          />
          <ForecastRiskIndicator
            totalSpendMTD={data.totalSpendMTD}
            forecastedSpend={data.forecastedSpend}
            previousMonthTotal={data.previousMonthTotal}
          />
        </div>
      )}

      {/* Existing budget cards (now with multi-level thresholds) */}
      <BudgetsClient
        totalSpendMTD={data.totalSpendMTD}
        forecastedSpend={data.forecastedSpend}
        previousMonthTotal={data.previousMonthTotal}
        topServices={data.topServices}
        accountId={data.accountId}
        error={data.error}
      />
    </div>
  );
}
```

Note: `BudgetsClient` needs `previousMonthTotal` added to its props interface.

**Step 3: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/dashboard/page.tsx apps/web/src/app/\(dashboard\)/dashboard/budgets/page.tsx
git commit -m "feat: wire all Phase 1 enhancements into dashboard and budget pages"
```

---

### Task 10: Build, Verify, and Final Commit

**Step 1: Run TypeScript type check**

```bash
cd /Users/alex/Documents/FinOps/.claude/worktrees/dreamy-spence && npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -30
```

**Step 2: Run build**

```bash
cd /Users/alex/Documents/FinOps/.claude/worktrees/dreamy-spence && pnpm --filter web build 2>&1 | tail -20
```

**Step 3: Fix any type errors or build failures**

Common issues to watch for:
- `previousMonthTotal` not passed through to modified components
- Import paths incorrect
- `Receipt` icon not available in lucide-react (use `FileText` as fallback)
- `formatPercentage` import from `@/lib/utils` (re-exported from format.ts)

**Step 4: Push to both remotes**

```bash
git push origin claude/dreamy-spence && git push deploy claude/dreamy-spence:main
```

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `dashboard/components/BudgetForecastCard.tsx` | CREATE | Budget vs Forecast with variance & risk |
| `dashboard/components/BurnRateCard.tsx` | CREATE | Daily burn rate + required burn to stay on budget |
| `dashboard/components/CostSpikePanel.tsx` | CREATE | Natural-language cost spike explanations |
| `dashboard/components/OptimizationTracking.tsx` | CREATE | Savings identified, open opportunities, realized |
| `dashboard/components/KpiCards.tsx` | MODIFY | Separate Tax (GST 18%) from cloud usage spend |
| `dashboard/page.tsx` | MODIFY | Wire new components into dashboard layout |
| `dashboard/budgets/BudgetsClient.tsx` | MODIFY | Multi-level alert thresholds (50/80/100%) |
| `dashboard/budgets/BudgetVarianceWidget.tsx` | CREATE | Budget vs Forecast variance table + MoM |
| `dashboard/budgets/ForecastRiskIndicator.tsx` | CREATE | Low/Medium/High risk gauge |
| `dashboard/budgets/page.tsx` | MODIFY | Wire variance + risk widgets into budget page |
