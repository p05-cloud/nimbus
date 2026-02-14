import {
  BudgetsClient,
  DescribeBudgetsCommand,
  type Budget,
} from '@aws-sdk/client-budgets';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

// --- Types -------------------------------------------------------------------

export interface AwsBudget {
  budgetName: string;
  budgetType: string;
  limitAmount: number;
  currentSpend: number;
  forecastedSpend: number;
  percentUsed: number;
  alertLevel: 'ok' | 'warning' | 'critical';
}

export interface AwsBudgetsSummary {
  budgets: AwsBudget[];
  totalBudgetLimit: number;
  totalCurrentSpend: number;
  budgetsInAlarm: number;
  status: 'active' | 'no-budgets' | 'error';
  errorMessage?: string;
}

// --- Client Factory ----------------------------------------------------------

function createBudgetsClient(): BudgetsClient {
  return new BudgetsClient({
    region: 'us-east-1', // Budgets API works from us-east-1
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

function createStsClient(): STSClient {
  return new STSClient({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

// --- Helpers -----------------------------------------------------------------

function getAlertLevel(percentUsed: number): 'ok' | 'warning' | 'critical' {
  if (percentUsed >= 90) return 'critical';
  if (percentUsed >= 75) return 'warning';
  return 'ok';
}

function mapBudget(budget: Budget): AwsBudget {
  const budgetName = budget.BudgetName || 'Unnamed';
  const budgetType = budget.BudgetType || 'COST';
  const limitAmount = parseFloat(budget.BudgetLimit?.Amount || '0');
  const currentSpend = parseFloat(budget.CalculatedSpend?.ActualSpend?.Amount || '0');
  const forecastedSpend = parseFloat(budget.CalculatedSpend?.ForecastedSpend?.Amount || '0');
  const percentUsed = limitAmount > 0 ? (currentSpend / limitAmount) * 100 : 0;

  return {
    budgetName,
    budgetType,
    limitAmount,
    currentSpend,
    forecastedSpend,
    percentUsed,
    alertLevel: getAlertLevel(percentUsed),
  };
}

// --- Cache -------------------------------------------------------------------

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
let cachedData: AwsBudgetsSummary | null = null;
let cachedAt = 0;

// --- Main Fetch Function -----------------------------------------------------

export async function fetchAwsBudgets(): Promise<AwsBudgetsSummary> {
  if (cachedData && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedData;
  }

  try {
    // Get the AWS account ID via STS
    const stsClient = createStsClient();
    const identity = await stsClient.send(new GetCallerIdentityCommand({}));
    const accountId = identity.Account;

    if (!accountId) {
      return {
        budgets: [],
        totalBudgetLimit: 0,
        totalCurrentSpend: 0,
        budgetsInAlarm: 0,
        status: 'error',
        errorMessage: 'Unable to determine AWS account ID from STS.',
      };
    }

    // Fetch budgets
    const budgetsClient = createBudgetsClient();
    const response = await budgetsClient.send(
      new DescribeBudgetsCommand({ AccountId: accountId }),
    );

    const rawBudgets = response.Budgets || [];

    if (rawBudgets.length === 0) {
      const summary: AwsBudgetsSummary = {
        budgets: [],
        totalBudgetLimit: 0,
        totalCurrentSpend: 0,
        budgetsInAlarm: 0,
        status: 'no-budgets',
      };

      cachedData = summary;
      cachedAt = Date.now();
      return summary;
    }

    // Map and sort by percentUsed descending
    const budgets = rawBudgets.map(mapBudget).sort((a, b) => b.percentUsed - a.percentUsed);

    const totalBudgetLimit = budgets.reduce((sum, b) => sum + b.limitAmount, 0);
    const totalCurrentSpend = budgets.reduce((sum, b) => sum + b.currentSpend, 0);
    const budgetsInAlarm = budgets.filter((b) => b.alertLevel === 'critical' || b.alertLevel === 'warning').length;

    const summary: AwsBudgetsSummary = {
      budgets,
      totalBudgetLimit,
      totalCurrentSpend,
      budgetsInAlarm,
      status: 'active',
    };

    cachedData = summary;
    cachedAt = Date.now();
    return summary;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';

    // Return stale cache if available
    if (cachedData) return cachedData;

    return {
      budgets: [],
      totalBudgetLimit: 0,
      totalCurrentSpend: 0,
      budgetsInAlarm: 0,
      status: 'error',
      errorMessage: msg,
    };
  }
}
