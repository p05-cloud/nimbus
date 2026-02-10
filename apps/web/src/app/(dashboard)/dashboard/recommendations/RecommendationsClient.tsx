'use client';

import { Lightbulb, Server, Zap, HardDrive, Globe, Workflow, TrendingDown, Info } from 'lucide-react';
import { useCurrency } from '@/components/providers/CurrencyProvider';

interface RecommendationsClientProps {
  topServices: { name: string; provider: string; cost: number; change: number }[];
  totalSpendMTD: number;
  forecastedSpend: number;
  accountId: string;
  error?: string;
}

interface Recommendation {
  category: string;
  description: string;
  icon: typeof Lightbulb;
  savings: number;
  count: number;
  severity: 'high' | 'medium' | 'low';
  services: string[];
}

function deriveRecommendations(
  topServices: { name: string; provider: string; cost: number; change: number }[],
  totalSpendMTD: number,
): Recommendation[] {
  const recs: Recommendation[] = [];

  // Rightsizing from compute services
  const computeServices = topServices.filter((s) =>
    /ec2|compute|instance|lambda|fargate|ecs/i.test(s.name),
  );
  if (computeServices.length > 0) {
    const computeCost = computeServices.reduce((s, c) => s + c.cost, 0);
    recs.push({
      category: 'Rightsizing',
      description: 'Analyze EC2/Lambda utilization and downsize over-provisioned resources to match actual usage',
      icon: Server,
      savings: computeCost * 0.15,
      count: computeServices.length,
      severity: computeCost > totalSpendMTD * 0.3 ? 'high' : 'medium',
      services: computeServices.map((s) => s.name),
    });
  }

  // Reserved Instances / Savings Plans for stable workloads
  const stableCompute = topServices.filter((s) => Math.abs(s.change) < 20 && s.cost > 1);
  if (stableCompute.length > 0) {
    const stableCost = stableCompute.reduce((s, c) => s + c.cost, 0);
    recs.push({
      category: 'Reserved Instances / Savings Plans',
      description: 'Commit to 1-3 year terms for stable workloads — up to 40% savings vs on-demand',
      icon: Zap,
      savings: stableCost * 0.30,
      count: stableCompute.length,
      severity: 'high',
      services: stableCompute.slice(0, 5).map((s) => s.name),
    });
  }

  // Storage optimization
  const storageServices = topServices.filter((s) =>
    /s3|storage|ebs|efs|glacier|backup|snapshot/i.test(s.name),
  );
  if (storageServices.length > 0) {
    const storageCost = storageServices.reduce((s, c) => s + c.cost, 0);
    recs.push({
      category: 'Storage Optimization',
      description: 'Move infrequently accessed data to S3 Intelligent-Tiering or Glacier; clean up old snapshots',
      icon: HardDrive,
      savings: storageCost * 0.20,
      count: storageServices.length,
      severity: storageCost > totalSpendMTD * 0.15 ? 'high' : 'medium',
      services: storageServices.map((s) => s.name),
    });
  }

  // Network / data transfer optimization
  const networkServices = topServices.filter((s) =>
    /transfer|cloudfront|nat|vpc|route|elb|load|api gateway/i.test(s.name),
  );
  if (networkServices.length > 0) {
    const networkCost = networkServices.reduce((s, c) => s + c.cost, 0);
    recs.push({
      category: 'Network Optimization',
      description: 'Use VPC endpoints, optimize CloudFront caching, review NAT gateway data transfer',
      icon: Globe,
      savings: networkCost * 0.20,
      count: networkServices.length,
      severity: 'medium',
      services: networkServices.map((s) => s.name),
    });
  }

  // Spiking services — cost anomalies worth investigating
  const spikingServices = topServices.filter((s) => s.change > 25);
  if (spikingServices.length > 0) {
    const spikeCost = spikingServices.reduce((s, c) => s + c.cost, 0);
    recs.push({
      category: 'Anomaly Investigation',
      description: 'Services with >25% MoM cost increase — may indicate waste, misconfig, or unexpected scaling',
      icon: Workflow,
      savings: spikeCost * 0.30,
      count: spikingServices.length,
      severity: 'high',
      services: spikingServices.map((s) => s.name),
    });
  }

  // Idle / low-cost services — potential cleanup
  const tinyServices = topServices.filter((s) => s.cost > 0 && s.cost < totalSpendMTD * 0.01);
  if (tinyServices.length > 3) {
    const tinyCost = tinyServices.reduce((s, c) => s + c.cost, 0);
    recs.push({
      category: 'Idle Resource Cleanup',
      description: 'Low-cost services may indicate unused or orphaned resources — quick win with zero performance impact',
      icon: TrendingDown,
      savings: tinyCost * 0.50,
      count: tinyServices.length,
      severity: 'low',
      services: tinyServices.slice(0, 5).map((s) => s.name),
    });
  }

  return recs.sort((a, b) => b.savings - a.savings);
}

const severityStyles = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

export function RecommendationsClient({
  topServices,
  totalSpendMTD,
  forecastedSpend,
  accountId,
  error,
}: RecommendationsClientProps) {
  const { format } = useCurrency();

  if (error || totalSpendMTD === 0) {
    return (
      <div className="space-y-6 animate-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recommendations</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered optimization recommendations across all cloud providers.
          </p>
        </div>
        <div className="rounded-xl border bg-card p-12 text-center">
          <Lightbulb className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">No cost data available for analysis.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect a cloud account to get optimization recommendations.
          </p>
        </div>
      </div>
    );
  }

  const recommendations = deriveRecommendations(topServices, totalSpendMTD);
  const totalSavings = recommendations.reduce((sum, r) => sum + r.savings, 0);

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Recommendations</h1>
        <p className="text-sm text-muted-foreground">
          Cost optimization opportunities — AWS Account {accountId}
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Estimated Monthly Savings</p>
          <p className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">
            {format(totalSavings)}
            <span className="text-base font-normal text-muted-foreground">/mo</span>
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Optimization Areas</p>
          <p className="mt-1 text-3xl font-bold">{recommendations.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Annualized Savings</p>
          <p className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">
            {format(totalSavings * 12)}
          </p>
        </div>
      </div>

      {/* Recommendation Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((rec) => {
          const Icon = rec.icon;
          return (
            <div
              key={rec.category}
              className="group rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-primary/50"
            >
              <div className="flex items-start justify-between">
                <Icon className="h-5 w-5 text-warning" />
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityStyles[rec.severity]}`}>
                  {rec.severity}
                </span>
              </div>
              <h3 className="mt-3 font-semibold">{rec.category}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{rec.description}</p>
              {rec.services.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Services: {rec.services.slice(0, 3).join(', ')}{rec.services.length > 3 ? ` +${rec.services.length - 3} more` : ''}
                </p>
              )}
              <div className="mt-4 flex items-center justify-between border-t pt-3">
                <span className="text-sm text-muted-foreground">{rec.count} resources</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {format(rec.savings)}/mo
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compute Optimizer note */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <Info className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Estimates based on Cost Explorer data patterns
          </p>
          <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
            AWS Compute Optimizer has been enabled on your account and is collecting utilization metrics.
            Precise rightsizing recommendations with instance-level detail will be available after ~14 days of data collection.
          </p>
        </div>
      </div>
    </div>
  );
}
