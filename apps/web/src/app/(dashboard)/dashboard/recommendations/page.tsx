import { getDashboardData } from '@/lib/cloud/fetchDashboardData';
import { fetchComputeOptimizerRecommendations } from '@/lib/cloud/aws-compute-optimizer';
import { RecommendationsClient } from './RecommendationsClient';

export const metadata = { title: 'Recommendations' };
export const dynamic = 'force-dynamic';

export default async function RecommendationsPage() {
  const [data, optimizer] = await Promise.all([
    getDashboardData(),
    fetchComputeOptimizerRecommendations().catch((e) => {
      console.error('[Recommendations] Compute Optimizer error:', e);
      return null;
    }),
  ]);

  return (
    <RecommendationsClient
      topServices={data.topServices}
      totalSpendMTD={data.totalSpendMTD}
      forecastedSpend={data.forecastedSpend}
      accountId={data.accountId}
      error={data.error}
      optimizerRecs={optimizer?.recommendations ?? []}
      optimizerStatus={optimizer?.optimizerStatus ?? 'error'}
      optimizerSavings={optimizer?.totalEstimatedSavings ?? 0}
      optimizerErrorMessage={optimizer?.errorMessage}
    />
  );
}
