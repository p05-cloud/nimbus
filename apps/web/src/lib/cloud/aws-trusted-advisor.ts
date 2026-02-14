import {
  SupportClient,
  DescribeTrustedAdvisorChecksCommand,
  DescribeTrustedAdvisorCheckSummariesCommand,
  DescribeTrustedAdvisorCheckResultCommand,
  type TrustedAdvisorCheckDescription,
  type TrustedAdvisorCheckSummary,
} from '@aws-sdk/client-support';

// --- Types -------------------------------------------------------------------

export interface TrustedAdvisorCheck {
  checkId: string;
  name: string;
  category: string;
  status: string; // 'ok' | 'warning' | 'error' | 'not_available'
  estimatedMonthlySavings: number;
}

export interface CategoryScore {
  ok: number;
  warning: number;
  error: number;
  estimatedSavings?: number;
}

export interface TrustedAdvisorSummary {
  checks: TrustedAdvisorCheck[];
  byCategoryScore: {
    cost_optimizing: CategoryScore & { estimatedSavings: number };
    security: CategoryScore;
    fault_tolerance: CategoryScore;
    performance: CategoryScore;
    service_limits: CategoryScore;
  };
  totalEstimatedSavings: number;
  status: 'active' | 'not-entitled' | 'error';
  errorMessage?: string;
}

export interface TrustedAdvisorFlaggedResource {
  resourceId: string;
  status: string;
  region: string;
  metadata: string[];
}

export interface TrustedAdvisorCheckDetail {
  checkId: string;
  name: string;
  category: string;
  flaggedResources: TrustedAdvisorFlaggedResource[];
  headers: string[];
}

// --- Client Factory ----------------------------------------------------------

function createClient(): SupportClient {
  return new SupportClient({
    region: 'us-east-1', // Trusted Advisor only works from us-east-1
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

// --- Cache -------------------------------------------------------------------

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours (testing mode)
let cachedData: TrustedAdvisorSummary | null = null;
let cachedAt = 0;

// --- Helpers -----------------------------------------------------------------

type CategoryKey = keyof TrustedAdvisorSummary['byCategoryScore'];

function normalizeCategoryKey(category: string): CategoryKey {
  const mapped: Record<string, CategoryKey> = {
    cost_optimizing: 'cost_optimizing',
    security: 'security',
    fault_tolerance: 'fault_tolerance',
    performance: 'performance',
    service_limits: 'service_limits',
  };
  return mapped[category] ?? 'performance';
}

function createEmptyCategoryScore(): CategoryScore {
  return { ok: 0, warning: 0, error: 0 };
}

function extractSavingsFromSummary(
  summary: TrustedAdvisorCheckSummary,
  checkDescription: TrustedAdvisorCheckDescription,
): number {
  // Cost savings come from cost_optimizing category checks
  if (checkDescription.category === 'cost_optimizing') {
    const costSummary = summary.categorySpecificSummary?.costOptimizing;
    return costSummary?.estimatedMonthlySavings ?? 0;
  }
  return 0;
}

function mapStatus(status: string | undefined): string {
  switch (status) {
    case 'ok':
      return 'ok';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    case 'not_available':
      return 'not_available';
    default:
      return 'not_available';
  }
}

// --- Main Fetch Function -----------------------------------------------------

export async function fetchTrustedAdvisorSummary(): Promise<TrustedAdvisorSummary> {
  if (cachedData && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedData;
  }

  const client = createClient();

  try {
    // Step 1: Fetch all available Trusted Advisor checks
    const checksResponse = await client.send(
      new DescribeTrustedAdvisorChecksCommand({ language: 'en' }),
    );

    const checkDescriptions = checksResponse.checks || [];
    if (checkDescriptions.length === 0) {
      return {
        checks: [],
        byCategoryScore: {
          cost_optimizing: { ...createEmptyCategoryScore(), estimatedSavings: 0 },
          security: createEmptyCategoryScore(),
          fault_tolerance: createEmptyCategoryScore(),
          performance: createEmptyCategoryScore(),
          service_limits: createEmptyCategoryScore(),
        },
        totalEstimatedSavings: 0,
        status: 'active',
      };
    }

    // Build a lookup map from checkId to description
    const checkMap = new Map<string, TrustedAdvisorCheckDescription>();
    const checkIds: string[] = [];
    for (const check of checkDescriptions) {
      if (check.id) {
        checkMap.set(check.id, check);
        checkIds.push(check.id);
      }
    }

    // Step 2: Fetch summaries for all checks
    const summariesResponse = await client.send(
      new DescribeTrustedAdvisorCheckSummariesCommand({ checkIds }),
    );

    const summaries = summariesResponse.summaries || [];

    // Build a lookup from checkId to summary
    const summaryMap = new Map<string, TrustedAdvisorCheckSummary>();
    for (const summary of summaries) {
      if (summary.checkId) {
        summaryMap.set(summary.checkId, summary);
      }
    }

    // Step 3: Map results into our interface
    const checks: TrustedAdvisorCheck[] = [];
    const byCategoryScore: TrustedAdvisorSummary['byCategoryScore'] = {
      cost_optimizing: { ...createEmptyCategoryScore(), estimatedSavings: 0 },
      security: createEmptyCategoryScore(),
      fault_tolerance: createEmptyCategoryScore(),
      performance: createEmptyCategoryScore(),
      service_limits: createEmptyCategoryScore(),
    };

    let totalEstimatedSavings = 0;

    for (const checkId of checkIds) {
      const description = checkMap.get(checkId);
      const summary = summaryMap.get(checkId);

      if (!description || !summary) continue;

      const status = mapStatus(summary.status);
      const category = description.category || 'performance';
      const savings = extractSavingsFromSummary(summary, description);

      checks.push({
        checkId: description.id || checkId,
        name: description.name || 'Unknown Check',
        category,
        status,
        estimatedMonthlySavings: savings,
      });

      // Accumulate category scores
      const categoryKey = normalizeCategoryKey(category);
      const categoryScore = byCategoryScore[categoryKey];

      if (status === 'ok') {
        categoryScore.ok++;
      } else if (status === 'warning') {
        categoryScore.warning++;
      } else if (status === 'error') {
        categoryScore.error++;
      }
      // 'not_available' checks are not counted in category scores

      // Accumulate savings
      if (savings > 0) {
        totalEstimatedSavings += savings;
        if (categoryKey === 'cost_optimizing') {
          byCategoryScore.cost_optimizing.estimatedSavings += savings;
        }
      }
    }

    // Sort checks: errors first, then warnings, then ok
    checks.sort((a, b) => {
      const order: Record<string, number> = { error: 0, warning: 1, ok: 2, not_available: 3 };
      return (order[a.status] ?? 4) - (order[b.status] ?? 4);
    });

    const result: TrustedAdvisorSummary = {
      checks,
      byCategoryScore,
      totalEstimatedSavings,
      status: 'active',
    };

    cachedData = result;
    cachedAt = Date.now();
    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const errorName = error instanceof Error ? error.name : '';

    // Handle "not subscribed to Business/Enterprise Support"
    if (
      msg.includes('SubscriptionRequiredException') ||
      msg.includes('not subscribed') ||
      errorName === 'SubscriptionRequiredException'
    ) {
      return {
        checks: [],
        byCategoryScore: {
          cost_optimizing: { ...createEmptyCategoryScore(), estimatedSavings: 0 },
          security: createEmptyCategoryScore(),
          fault_tolerance: createEmptyCategoryScore(),
          performance: createEmptyCategoryScore(),
          service_limits: createEmptyCategoryScore(),
        },
        totalEstimatedSavings: 0,
        status: 'not-entitled',
        errorMessage: 'Requires AWS Business or Enterprise Support plan.',
      };
    }

    // Return stale cache if available
    if (cachedData) return cachedData;

    return {
      checks: [],
      byCategoryScore: {
        cost_optimizing: { ...createEmptyCategoryScore(), estimatedSavings: 0 },
        security: createEmptyCategoryScore(),
        fault_tolerance: createEmptyCategoryScore(),
        performance: createEmptyCategoryScore(),
        service_limits: createEmptyCategoryScore(),
      },
      totalEstimatedSavings: 0,
      status: 'error',
      errorMessage: msg,
    };
  }
}

// --- Detail Fetch (single check) ---------------------------------------------

export async function fetchTrustedAdvisorCheckDetail(
  checkId: string,
): Promise<TrustedAdvisorCheckDetail> {
  const client = createClient();

  const response = await client.send(
    new DescribeTrustedAdvisorCheckResultCommand({ checkId }),
  );

  const result = response.result;

  const flaggedResources: TrustedAdvisorFlaggedResource[] = (
    result?.flaggedResources || []
  ).map((r) => ({
    resourceId: r.resourceId || 'unknown',
    status: r.status || 'unknown',
    region: r.region || 'unknown',
    metadata: r.metadata || [],
  }));

  // Fetch the check description to get name, category, and headers
  const checksResponse = await client.send(
    new DescribeTrustedAdvisorChecksCommand({ language: 'en' }),
  );

  const checkDescription = (checksResponse.checks || []).find((c) => c.id === checkId);

  return {
    checkId,
    name: checkDescription?.name || 'Unknown Check',
    category: checkDescription?.category || 'unknown',
    flaggedResources,
    headers: checkDescription?.metadata || [],
  };
}
