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

// --- In-memory cache (4 hr TTL) — reduces Cost Explorer API calls (~$0.01/req)
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours (testing mode)
let cachedData: DashboardPayload | null = null;
let cachedAt = 0;

export async function getDashboardData(): Promise<DashboardPayload> {
  // Return cached data if fresh
  if (cachedData && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedData;
  }

  try {
    // Check if AWS credentials are configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return fallbackData('AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.');
    }

    const data = await fetchAwsDashboardData();
    cachedData = data;
    cachedAt = Date.now();
    return data;
  } catch (error) {
    console.error('[Dashboard] Failed to fetch AWS data:', error);
    // If we have stale cache, return it instead of erroring
    if (cachedData) return cachedData;
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
