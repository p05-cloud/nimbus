import {
  ResourceGroupsTaggingAPIClient,
  GetResourcesCommand,
  GetTagKeysCommand,
} from '@aws-sdk/client-resource-groups-tagging-api';

// --- Constants ---------------------------------------------------------------

const REQUIRED_TAGS = ['Environment', 'Team', 'CostCenter', 'Project', 'Owner'];

const COST_ALLOCATION_PATTERNS = [/cost/i, /billing/i, /finance/i, /chargeback/i];
const COST_ALLOCATION_EXACT = ['aws:createdBy'];

// --- Types -------------------------------------------------------------------

export interface TagRequirement {
  tagKey: string;
  taggedCount: number;
  untaggedCount: number;
  compliancePercent: number;
}

export interface TagComplianceSummary {
  totalResources: number;
  taggedResources: number;
  untaggedResources: number;
  compliancePercent: number;
  requiredTags: TagRequirement[];
  costAllocationTags: string[];
  status: 'active' | 'error';
  errorMessage?: string;
}

export interface TaggedResource {
  arn: string;
  tags: Record<string, string>;
}

// --- Client Factory ----------------------------------------------------------

function createClient(): ResourceGroupsTaggingAPIClient {
  return new ResourceGroupsTaggingAPIClient({
    region: 'ap-south-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

// --- Cache -------------------------------------------------------------------

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours (testing mode)
let cachedData: TagComplianceSummary | null = null;
let cachedAt = 0;

// --- Helpers -----------------------------------------------------------------

function isCostAllocationTag(tagKey: string): boolean {
  if (COST_ALLOCATION_EXACT.includes(tagKey)) return true;
  return COST_ALLOCATION_PATTERNS.some((pattern) => pattern.test(tagKey));
}

/**
 * Count total resources by paginating GetResources with no tag filters.
 * Caps at 5 pages (500 resources max) to limit API calls.
 */
async function countTotalResources(
  client: ResourceGroupsTaggingAPIClient,
): Promise<{ total: number; capped: boolean }> {
  let total = 0;
  let paginationToken: string | undefined;
  let pages = 0;

  do {
    const command = new GetResourcesCommand({
      ResourcesPerPage: 100,
      ...(paginationToken ? { PaginationToken: paginationToken } : {}),
    });

    const response = await client.send(command);
    total += response.ResourceTagMappingList?.length ?? 0;
    paginationToken = response.PaginationToken || undefined;
    pages++;
  } while (paginationToken && pages < 5);

  return { total, capped: paginationToken !== undefined };
}

/**
 * Count resources that have a specific tag key by paginating GetResources
 * with a TagFilter. Uses the same 5-page cap for consistency.
 */
async function countResourcesWithTag(
  client: ResourceGroupsTaggingAPIClient,
  tagKey: string,
): Promise<number> {
  let count = 0;
  let paginationToken: string | undefined;
  let pages = 0;

  do {
    const command = new GetResourcesCommand({
      TagFilters: [{ Key: tagKey }],
      ResourcesPerPage: 100,
      ...(paginationToken ? { PaginationToken: paginationToken } : {}),
    });

    const response = await client.send(command);
    count += response.ResourceTagMappingList?.length ?? 0;
    paginationToken = response.PaginationToken || undefined;
    pages++;
  } while (paginationToken && pages < 5);

  return count;
}

// --- Main Fetch Function -----------------------------------------------------

export async function fetchTagCompliance(): Promise<TagComplianceSummary> {
  // Return cached data if fresh
  if (cachedData && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedData;
  }

  const client = createClient();

  try {
    // Fetch total resource count and all tag keys in parallel
    const [totalResult, tagKeysResult] = await Promise.all([
      countTotalResources(client),
      client.send(new GetTagKeysCommand({})),
    ]);

    const totalResources = totalResult.total;
    const allTagKeys = tagKeysResult.TagKeys || [];

    // Identify cost allocation tags
    const costAllocationTags = allTagKeys.filter(isCostAllocationTag);

    // For each required tag, count how many resources have it
    const tagCountResults = await Promise.all(
      REQUIRED_TAGS.map(async (tagKey) => {
        const taggedCount = await countResourcesWithTag(client, tagKey);
        const untaggedCount = Math.max(0, totalResources - taggedCount);
        const compliancePercent =
          totalResources > 0
            ? Math.round((taggedCount / totalResources) * 100 * 100) / 100
            : 0;

        return {
          tagKey,
          taggedCount,
          untaggedCount,
          compliancePercent,
        } satisfies TagRequirement;
      }),
    );

    // Calculate overall compliance: average of per-tag compliance percentages
    // This approximates "resources that have ALL required tags"
    const avgCompliance =
      tagCountResults.length > 0
        ? tagCountResults.reduce((sum, t) => sum + t.compliancePercent, 0) /
          tagCountResults.length
        : 0;

    const compliancePercent = Math.round(avgCompliance * 100) / 100;
    const taggedResources = Math.round((compliancePercent / 100) * totalResources);
    const untaggedResources = totalResources - taggedResources;

    const summary: TagComplianceSummary = {
      totalResources,
      taggedResources,
      untaggedResources,
      compliancePercent,
      requiredTags: tagCountResults,
      costAllocationTags,
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
      totalResources: 0,
      taggedResources: 0,
      untaggedResources: 0,
      compliancePercent: 0,
      requiredTags: [],
      costAllocationTags: [],
      status: 'error',
      errorMessage: msg,
    };
  }
}

// --- Tag Governance Detail ---------------------------------------------------

export async function fetchTaggedResources(
  tagKey: string,
): Promise<TaggedResource[]> {
  const client = createClient();
  const resources: TaggedResource[] = [];
  let paginationToken: string | undefined;
  let pages = 0;

  try {
    do {
      const command = new GetResourcesCommand({
        TagFilters: [{ Key: tagKey }],
        ResourcesPerPage: 100,
        ...(paginationToken ? { PaginationToken: paginationToken } : {}),
      });

      const response = await client.send(command);

      for (const mapping of response.ResourceTagMappingList || []) {
        const arn = mapping.ResourceARN || '';
        const tags: Record<string, string> = {};

        for (const tag of mapping.Tags || []) {
          if (tag.Key && tag.Value !== undefined) {
            tags[tag.Key] = tag.Value;
          }
        }

        resources.push({ arn, tags });
      }

      paginationToken = response.PaginationToken || undefined;
      pages++;
    } while (paginationToken && pages < 10);

    return resources;
  } catch (error) {
    console.error(`[Tags] Failed to fetch tagged resources for "${tagKey}":`, error);
    return [];
  }
}
