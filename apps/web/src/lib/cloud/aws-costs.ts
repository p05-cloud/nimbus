import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  GetCostForecastCommand,
  type GetCostAndUsageCommandInput,
} from '@aws-sdk/client-cost-explorer';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

// --- Types -------------------------------------------------------------------

interface MonthlyCost {
  month: string;
  cost: number;
}

interface ServiceCost {
  name: string;
  provider: string;
  cost: number;
  change: number;
}

interface DashboardData {
  totalSpendMTD: number;
  previousMonthTotal: number;
  changePercentage: number;
  forecastedSpend: number;
  monthlyCosts: MonthlyCost[];
  topServices: ServiceCost[];
  accountId: string;
  currency: string;
}

// --- Client Factory ----------------------------------------------------------

function createCostExplorerClient(): CostExplorerClient {
  return new CostExplorerClient({
    region: 'us-east-1', // Cost Explorer only works in us-east-1
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

// --- Helper Functions --------------------------------------------------------

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

// --- API Functions -----------------------------------------------------------

export async function validateAwsCredentials(): Promise<{ valid: boolean; accountId?: string; error?: string }> {
  try {
    const sts = new STSClient({
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    const result = await sts.send(new GetCallerIdentityCommand({}));
    return { valid: true, accountId: result.Account };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getMonthlyTrend(months: number = 13): Promise<MonthlyCost[]> {
  const client = createCostExplorerClient();
  const end = getMonthStart(new Date());
  const start = new Date(end);
  start.setMonth(start.getMonth() - months);

  const command = new GetCostAndUsageCommand({
    TimePeriod: { Start: formatDate(start), End: formatDate(end) },
    Granularity: 'MONTHLY',
    Metrics: ['UnblendedCost'],
  });

  const response = await client.send(command);

  return (response.ResultsByTime || []).map((period) => ({
    month: period.TimePeriod?.Start || '',
    cost: parseFloat(period.Total?.UnblendedCost?.Amount || '0'),
  }));
}

export async function getTopServicesCurrent(): Promise<ServiceCost[]> {
  const client = createCostExplorerClient();
  const now = new Date();
  const currentMonthStart = getMonthStart(now);
  const currentMonthEnd = getMonthEnd(now);
  const previousMonthStart = new Date(currentMonthStart);
  previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);

  // Fetch current month by service
  const currentCommand = new GetCostAndUsageCommand({
    TimePeriod: { Start: formatDate(currentMonthStart), End: formatDate(now) },
    Granularity: 'MONTHLY',
    Metrics: ['UnblendedCost'],
    GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
  });

  // Fetch previous month by service
  const previousCommand = new GetCostAndUsageCommand({
    TimePeriod: { Start: formatDate(previousMonthStart), End: formatDate(currentMonthStart) },
    Granularity: 'MONTHLY',
    Metrics: ['UnblendedCost'],
    GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
  });

  const [currentResponse, previousResponse] = await Promise.all([
    client.send(currentCommand),
    client.send(previousCommand),
  ]);

  // Build previous month lookup
  const previousCosts: Record<string, number> = {};
  for (const group of previousResponse.ResultsByTime?.[0]?.Groups || []) {
    const service = group.Keys?.[0] || '';
    previousCosts[service] = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');
  }

  // Build current services with MoM change
  const services: ServiceCost[] = [];
  for (const group of currentResponse.ResultsByTime?.[0]?.Groups || []) {
    const name = group.Keys?.[0] || '';
    const cost = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');
    if (cost < 0.01) continue; // skip near-zero

    const prev = previousCosts[name] || 0;
    const change = prev > 0 ? ((cost - prev) / prev) * 100 : 0;

    services.push({ name, provider: 'AWS', cost, change });
  }

  // Sort by cost descending, take top 10
  return services.sort((a, b) => b.cost - a.cost).slice(0, 10);
}

export async function getCurrentMonthForecast(): Promise<number> {
  const client = createCostExplorerClient();
  const now = new Date();
  const monthEnd = getMonthEnd(now);

  // Can only forecast if we're not at the very start or end of month
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (tomorrow >= monthEnd) {
    // Last day of month — no forecast needed, just return current spend
    return 0;
  }

  try {
    const command = new GetCostForecastCommand({
      TimePeriod: { Start: formatDate(tomorrow), End: formatDate(monthEnd) },
      Granularity: 'MONTHLY',
      Metric: 'UNBLENDED_COST',
    });

    const response = await client.send(command);
    return parseFloat(response.Total?.Amount || '0');
  } catch {
    // Forecast can fail if not enough data
    return 0;
  }
}

// --- Main Dashboard Data Function --------------------------------------------

export async function fetchAwsDashboardData(): Promise<DashboardData> {
  const [validation, monthlyTrend, topServices, forecast] = await Promise.all([
    validateAwsCredentials(),
    getMonthlyTrend(13),
    getTopServicesCurrent(),
    getCurrentMonthForecast(),
  ]);

  // Current month-to-date
  const now = new Date();
  const currentMonthStart = getMonthStart(now);
  const client = createCostExplorerClient();

  const mtdCommand = new GetCostAndUsageCommand({
    TimePeriod: { Start: formatDate(currentMonthStart), End: formatDate(now) },
    Granularity: 'MONTHLY',
    Metrics: ['UnblendedCost'],
  });
  const mtdResponse = await client.send(mtdCommand);
  const totalSpendMTD = parseFloat(mtdResponse.ResultsByTime?.[0]?.Total?.UnblendedCost?.Amount || '0');

  // Previous month total (from trend)
  const previousMonthTotal = monthlyTrend.length >= 2
    ? monthlyTrend[monthlyTrend.length - 1].cost
    : 0;

  const changePercentage = previousMonthTotal > 0
    ? ((totalSpendMTD - previousMonthTotal) / previousMonthTotal) * 100
    : 0;

  return {
    totalSpendMTD,
    previousMonthTotal,
    changePercentage,
    forecastedSpend: forecast > 0 ? totalSpendMTD + forecast : totalSpendMTD * (30 / now.getDate()),
    monthlyCosts: monthlyTrend,
    topServices,
    accountId: validation.accountId || 'unknown',
    currency: 'USD',
  };
}
