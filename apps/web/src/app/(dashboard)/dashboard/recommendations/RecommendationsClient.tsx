'use client';

import { useState } from 'react';
import {
  Lightbulb, Server, Zap, HardDrive, Globe, Workflow,
  TrendingDown, Info, Cpu, Database, CheckCircle, Clock, AlertTriangle,
} from 'lucide-react';
import { useCurrency } from '@/components/providers/CurrencyProvider';

// --- Types -------------------------------------------------------------------

interface OptimizationRecommendation {
  resourceId: string;
  resourceType: 'EC2' | 'AutoScaling' | 'Lambda' | 'EBS';
  finding: string;
  currentConfig: string;
  recommendedConfig: string;
  estimatedMonthlySavings: number;
  estimatedSavingsPercentage: number;
  risk: 'VeryLow' | 'Low' | 'Medium' | 'High';
  region: string;
}

interface RecommendationsClientProps {
  topServices: { name: string; provider: string; cost: number; change: number }[];
  totalSpendMTD: number;
  forecastedSpend: number;
  accountId: string;
  error?: string;
  optimizerRecs: OptimizationRecommendation[];
  optimizerStatus: 'active' | 'collecting' | 'not-enrolled' | 'error';
  optimizerSavings: number;
  optimizerErrorMessage?: string;
}

// --- Cost-pattern derived recommendations ------------------------------------

interface CostRecommendation {
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
): CostRecommendation[] {
  const recs: CostRecommendation[] = [];

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

  const stableCompute = topServices.filter((s) => Math.abs(s.change) < 20 && s.cost > 1);
  if (stableCompute.length > 0) {
    const stableCost = stableCompute.reduce((s, c) => s + c.cost, 0);
    recs.push({
      category: 'Savings Plans',
      description: 'Commit to 1-3 year terms for stable workloads — up to 40% savings vs on-demand',
      icon: Zap,
      savings: stableCost * 0.30,
      count: stableCompute.length,
      severity: 'high',
      services: stableCompute.slice(0, 5).map((s) => s.name),
    });
  }

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

// --- Styles ------------------------------------------------------------------

const severityStyles = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const riskStyles: Record<string, string> = {
  VeryLow: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  High: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const typeIcons: Record<string, typeof Cpu> = {
  EC2: Cpu,
  AutoScaling: Server,
  Lambda: Zap,
  EBS: Database,
};

// --- Component ---------------------------------------------------------------

export function RecommendationsClient({
  topServices,
  totalSpendMTD,
  forecastedSpend,
  accountId,
  error,
  optimizerRecs,
  optimizerStatus,
  optimizerSavings,
  optimizerErrorMessage,
}: RecommendationsClientProps) {
  const { format } = useCurrency();
  const [activeTab, setActiveTab] = useState<'optimizer' | 'patterns'>('optimizer');

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

  const costRecs = deriveRecommendations(topServices, totalSpendMTD);
  const costSavings = costRecs.reduce((sum, r) => sum + r.savings, 0);
  const totalSavings = optimizerSavings + costSavings;

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Recommendations</h1>
        <p className="text-sm text-muted-foreground">
          Cost optimization opportunities — AWS Account {accountId}
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Total Estimated Savings</p>
          <p className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">
            {format(totalSavings)}
            <span className="text-base font-normal text-muted-foreground">/mo</span>
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Compute Optimizer</p>
          <p className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">
            {format(optimizerSavings)}
            <span className="text-base font-normal text-muted-foreground">/mo</span>
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Rightsizing Opportunities</p>
          <p className="mt-1 text-3xl font-bold">{optimizerRecs.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Annualized Savings</p>
          <p className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">
            {format(totalSavings * 12)}
          </p>
        </div>
      </div>

      {/* Optimizer Status Banner */}
      {optimizerStatus === 'collecting' && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <Clock className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Compute Optimizer is collecting data
            </p>
            <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
              {optimizerErrorMessage || 'Precise rightsizing recommendations will be available after ~14 days of utilization data collection.'}
            </p>
          </div>
        </div>
      )}

      {optimizerStatus === 'not-enrolled' && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Compute Optimizer not enabled
            </p>
            <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
              Enable AWS Compute Optimizer from the AWS Console for free rightsizing recommendations. It analyzes EC2, Lambda, EBS, and Auto Scaling utilization.
            </p>
          </div>
        </div>
      )}

      {optimizerStatus === 'error' && optimizerErrorMessage && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              Compute Optimizer error
            </p>
            <p className="mt-1 text-xs text-red-700 dark:text-red-300">{optimizerErrorMessage}</p>
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setActiveTab('optimizer')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'optimizer'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Cpu className="mr-2 inline h-4 w-4" />
          Compute Optimizer ({optimizerRecs.length})
        </button>
        <button
          onClick={() => setActiveTab('patterns')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'patterns'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Lightbulb className="mr-2 inline h-4 w-4" />
          Cost Patterns ({costRecs.length})
        </button>
      </div>

      {/* Compute Optimizer Tab */}
      {activeTab === 'optimizer' && (
        <>
          {optimizerRecs.length === 0 ? (
            <div className="rounded-xl border bg-card p-8 text-center">
              {optimizerStatus === 'active' ? (
                <>
                  <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                  <p className="mt-4 font-semibold text-green-700 dark:text-green-300">All Optimized</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    AWS Compute Optimizer found no rightsizing opportunities. All resources are properly sized.
                  </p>
                </>
              ) : (
                <>
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 font-semibold">Awaiting Data</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Compute Optimizer recommendations will appear here once enough utilization data is collected.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-xl border bg-card shadow-sm">
              <div className="p-6 pb-3">
                <h3 className="font-semibold">Rightsizing Recommendations</h3>
                <p className="text-sm text-muted-foreground">
                  From AWS Compute Optimizer — based on real utilization metrics
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-t text-left">
                      <th className="px-6 py-3 font-medium text-muted-foreground">Resource</th>
                      <th className="px-6 py-3 font-medium text-muted-foreground">Type</th>
                      <th className="px-6 py-3 font-medium text-muted-foreground">Finding</th>
                      <th className="px-6 py-3 font-medium text-muted-foreground">Current</th>
                      <th className="px-6 py-3 font-medium text-muted-foreground">Recommended</th>
                      <th className="px-6 py-3 text-right font-medium text-muted-foreground">Savings</th>
                      <th className="px-6 py-3 font-medium text-muted-foreground">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {optimizerRecs.map((rec) => {
                      const Icon = typeIcons[rec.resourceType] || Server;
                      return (
                        <tr key={`${rec.resourceType}-${rec.resourceId}`} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="px-6 py-3">
                            <span className="font-mono text-xs">{rec.resourceId}</span>
                          </td>
                          <td className="px-6 py-3">
                            <span className="inline-flex items-center gap-1.5">
                              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                              {rec.resourceType}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <span className="text-xs">{rec.finding}</span>
                          </td>
                          <td className="px-6 py-3">
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{rec.currentConfig}</code>
                          </td>
                          <td className="px-6 py-3">
                            <code className="rounded bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 text-xs text-green-700 dark:text-green-400">
                              {rec.recommendedConfig}
                            </code>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              {format(rec.estimatedMonthlySavings)}/mo
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${riskStyles[rec.risk] || riskStyles.Low}`}>
                              {rec.risk}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Cost Patterns Tab */}
      {activeTab === 'patterns' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {costRecs.map((rec) => {
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
      )}

      {/* Source Info */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <Info className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Data sources
          </p>
          <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
            <strong>Compute Optimizer</strong> — real utilization-based rightsizing from AWS (EC2, Lambda, EBS, Auto Scaling).{' '}
            <strong>Cost Patterns</strong> — heuristic savings estimates derived from AWS Cost Explorer spending data.
          </p>
        </div>
      </div>
    </div>
  );
}
