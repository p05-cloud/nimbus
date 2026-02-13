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
      {/* Budget Variance + Forecast Risk row */}
      {!data.error && data.totalSpendMTD > 0 && (
        <div className="grid gap-6 sm:grid-cols-2">
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
