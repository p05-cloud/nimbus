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
