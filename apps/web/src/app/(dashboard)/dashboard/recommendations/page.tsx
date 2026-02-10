import { getDashboardData } from '@/lib/cloud/fetchDashboardData';
import { RecommendationsClient } from './RecommendationsClient';

export const metadata = { title: 'Recommendations' };
export const dynamic = 'force-dynamic';

export default async function RecommendationsPage() {
  const data = await getDashboardData();

  return (
    <RecommendationsClient
      topServices={data.topServices}
      totalSpendMTD={data.totalSpendMTD}
      forecastedSpend={data.forecastedSpend}
      accountId={data.accountId}
      error={data.error}
    />
  );
}
