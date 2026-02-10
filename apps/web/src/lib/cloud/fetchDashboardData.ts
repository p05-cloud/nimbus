'use server';

import { fetchAwsDashboardData } from './aws-costs';

export interface DashboardPayload {
  totalSpendMTD: number;
  previousMonthTotal: number;
  changePercentage: number;
  forecastedSpend: number;
  monthlyCosts: { month: string; cost: number }[];
  topServices: { name: string; provider: string; cost: number; change: number }[];
  accountId: string;
  currency: string;
  error?: string;
}

export async function getDashboardData(): Promise<DashboardPayload> {
  try {
    // Check if AWS credentials are configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return fallbackData('AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.');
    }

    const data = await fetchAwsDashboardData();
    return data;
  } catch (error) {
    console.error('[Dashboard] Failed to fetch AWS data:', error);
    return fallbackData(error instanceof Error ? error.message : 'Failed to fetch data');
  }
}

function fallbackData(error: string): DashboardPayload {
  return {
    totalSpendMTD: 0,
    previousMonthTotal: 0,
    changePercentage: 0,
    forecastedSpend: 0,
    monthlyCosts: [],
    topServices: [],
    accountId: 'not-connected',
    currency: 'USD',
    error,
  };
}
