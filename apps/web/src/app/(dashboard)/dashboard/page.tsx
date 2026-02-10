import { getDashboardData } from '@/lib/cloud/fetchDashboardData';
import { KpiCards } from './components/KpiCards';
import { CostTrendChart } from './components/CostTrendChart';
import { CostByProviderChart } from './components/CostByProviderChart';
import { TopServices } from './components/TopServices';
import { RecentRecommendations } from './components/RecentRecommendations';
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
      />

      <div className="grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <CostTrendChart monthlyCosts={data.monthlyCosts} />
        </div>
        <div className="lg:col-span-3">
          <CostByProviderChart monthlyCosts={data.monthlyCosts} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TopServices services={data.topServices} />
        <RecentRecommendations />
      </div>
    </div>
  );
}
