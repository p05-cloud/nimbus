import { getDashboardData } from '@/lib/cloud/fetchDashboardData';
import { TvDashboard } from './TvDashboard';

export const metadata = { title: 'NOC Dashboard' };
export const dynamic = 'force-dynamic';

export default async function TvPage() {
  const data = await getDashboardData();

  return (
    <TvDashboard
      totalSpendMTD={data.totalSpendMTD}
      forecastedSpend={data.forecastedSpend}
      changePercentage={data.changePercentage}
      monthlyCosts={data.monthlyCosts}
      topServices={data.topServices}
      accountId={data.accountId}
      error={data.error}
    />
  );
}
