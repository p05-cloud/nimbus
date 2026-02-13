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
