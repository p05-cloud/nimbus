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
import { DataTransferCard } from './components/DataTransferCard';
import { CommitmentCoverageCard } from './components/CommitmentCoverageCard';
import { ServiceHealthIndicators } from './components/ServiceHealthIndicators';
import { FinOpsMaturityScorecard } from './components/FinOpsMaturityScorecard';
import { TrustedAdvisorScorecard } from './components/TrustedAdvisorScorecard';
import { RealBudgetsCard } from './components/RealBudgetsCard';
import { TagComplianceCard } from './components/TagComplianceCard';
import { SavingsOpportunitiesCard } from './components/SavingsOpportunitiesCard';
import { NativeAnomaliesCard } from './components/NativeAnomaliesCard';
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

      <KpiCards
        totalSpendMTD={data.totalSpendMTD}
        forecastedSpend={data.forecastedSpend}
        changePercentage={data.changePercentage}
        previousMonthTotal={data.previousMonthTotal}
      />

      {/* Budget vs Forecast + Burn Rate */}
      <div className="grid gap-6 sm:grid-cols-2">
        <BudgetForecastCard
          totalSpendMTD={data.totalSpendMTD}
          forecastedSpend={data.forecastedSpend}
          previousMonthTotal={data.previousMonthTotal}
          awsBudgets={data.awsBudgets}
        />
        <BurnRateCard
          totalSpendMTD={data.totalSpendMTD}
          forecastedSpend={data.forecastedSpend}
          previousMonthTotal={data.previousMonthTotal}
          awsBudgets={data.awsBudgets}
        />
      </div>

      {/* Commitment Coverage + Data Transfer */}
      <div className="grid gap-6 sm:grid-cols-2">
        <CommitmentCoverageCard commitment={data.commitment} />
        <DataTransferCard
          dataTransfer={data.dataTransfer}
          totalSpendMTD={data.totalSpendMTD}
        />
      </div>

      {/* Phase 3: Trusted Advisor + AWS Budgets + Tag Compliance */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <TrustedAdvisorScorecard trustedAdvisor={data.trustedAdvisor} />
        <RealBudgetsCard awsBudgets={data.awsBudgets} />
        <TagComplianceCard tagCompliance={data.tagCompliance} />
      </div>

      {/* Phase 3: Savings Opportunities + Native Anomalies */}
      <div className="grid gap-6 sm:grid-cols-2">
        <SavingsOpportunitiesCard
          ceRightsizing={data.ceRightsizing}
          riRecommendations={data.riRecommendations}
          spRecommendations={data.spRecommendations}
          optimizerSavings={data.optimizerSavings}
          optimizerStatus={data.optimizerStatus}
          trustedAdvisorSavings={data.trustedAdvisor?.totalEstimatedSavings ?? 0}
        />
        <NativeAnomaliesCard nativeAnomalies={data.nativeAnomalies} />
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <CostTrendChart monthlyCosts={data.monthlyCosts} />
        </div>
        <div className="lg:col-span-3">
          <CostByProviderChart monthlyCosts={data.monthlyCosts} />
        </div>
      </div>

      {/* Cost Spike Analysis */}
      <CostSpikePanel
        services={data.topServices}
        totalSpendMTD={data.totalSpendMTD}
        previousMonthTotal={data.previousMonthTotal}
      />

      {/* Service Health Indicators */}
      <ServiceHealthIndicators
        services={data.topServices}
        totalSpendMTD={data.totalSpendMTD}
        optimizerByType={data.optimizerByType}
        optimizerStatus={data.optimizerStatus}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <TopServices services={data.topServices} />
        <RecentRecommendations services={data.topServices} totalSpendMTD={data.totalSpendMTD} />
      </div>

      {/* Optimization Savings Tracking */}
      <OptimizationTracking
        services={data.topServices}
        totalSpendMTD={data.totalSpendMTD}
        previousMonthTotal={data.previousMonthTotal}
        optimizerSavings={data.optimizerSavings}
        optimizerByType={data.optimizerByType}
        optimizerStatus={data.optimizerStatus}
      />

      {/* FinOps Maturity Scorecard */}
      <FinOpsMaturityScorecard
        hasForecasting={data.forecastedSpend > 0}
        hasBudgetTracking={data.previousMonthTotal > 0}
        hasOptimizationTracking={data.optimizerStatus === 'active'}
        hasCostAllocation={data.topServices.length > 3}
        hasAnomalyDetection={data.nativeAnomalies?.status === 'active' || data.topServices.some((s) => s.change > 50)}
        commitmentCoveragePercent={data.commitment.savingsPlansCoveragePercent}
        dataTransferVisible={data.dataTransfer.length > 0}
        hasTrustedAdvisor={data.trustedAdvisor?.status === 'active'}
        hasBudgetGovernance={data.awsBudgets?.status === 'active'}
        hasTagCompliance={data.tagCompliance?.status === 'active'}
      />
    </div>
  );
}
