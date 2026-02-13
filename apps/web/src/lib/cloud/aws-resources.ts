import {
  ResourceExplorer2Client,
  SearchCommand,
  type Resource,
} from '@aws-sdk/client-resource-explorer-2';

// --- Types -------------------------------------------------------------------

export interface CloudResource {
  arn: string;
  resourceType: string;
  service: string;
  region: string;
  lastReportedAt: string;
  properties: Record<string, string>;
}

export interface ResourceSummary {
  totalCount: number;
  capped: boolean; // true if we hit the page limit and more resources exist
  byService: { service: string; count: number }[];
  byRegion: { region: string; count: number }[];
  resources: CloudResource[];
}

// --- Client Factory ----------------------------------------------------------

function createResourceExplorerClient(): ResourceExplorer2Client {
  return new ResourceExplorer2Client({
    region: 'ap-south-1', // Resource Explorer index region
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

// --- Helper ------------------------------------------------------------------

function mapResource(r: Resource): CloudResource {
  const arn = r.Arn || '';
  // Extract service from ARN: arn:aws:SERVICE:region:account:...
  const arnParts = arn.split(':');
  const service = arnParts[2] || r.ResourceType?.split(':')[0] || 'unknown';
  const region = r.Region || arnParts[3] || 'unknown';

  const props: Record<string, string> = {};
  for (const p of r.Properties || []) {
    if (p.Name && p.Data) {
      try {
        props[p.Name] = typeof p.Data === 'string' ? p.Data : JSON.stringify(p.Data);
      } catch {
        props[p.Name] = String(p.Data);
      }
    }
  }

  return {
    arn,
    resourceType: r.ResourceType || 'unknown',
    service,
    region,
    lastReportedAt: r.LastReportedAt?.toISOString() || '',
    properties: props,
  };
}

// --- Cache -------------------------------------------------------------------

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours (testing mode)
let cachedResources: ResourceSummary | null = null;
let cachedAt = 0;

// --- Main Fetch Function -----------------------------------------------------

export async function fetchAwsResources(): Promise<ResourceSummary> {
  // Return cached data if fresh
  if (cachedResources && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedResources;
  }

  const client = createResourceExplorerClient();
  const allResources: CloudResource[] = [];
  let nextToken: string | undefined;

  // Paginate through all results. Safety limit of 20 pages (20,000 resources)
  // to prevent infinite loops or runaway API costs. If more resources exist
  // beyond the cap, the `capped` flag will be set on the returned summary.
  let pages = 0;
  do {
    const command = new SearchCommand({
      QueryString: '*', // all resources
      MaxResults: 1000,
      ...(nextToken ? { NextToken: nextToken } : {}),
    });

    const response = await client.send(command);

    for (const r of response.Resources || []) {
      allResources.push(mapResource(r));
    }

    nextToken = response.NextToken;
    pages++;
  } while (nextToken && pages < 20);

  // If nextToken is still defined after the loop, we hit the safety cap
  const capped = nextToken !== undefined;

  // Aggregate by service
  const serviceMap = new Map<string, number>();
  for (const r of allResources) {
    serviceMap.set(r.service, (serviceMap.get(r.service) || 0) + 1);
  }
  const byService = Array.from(serviceMap.entries())
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count);

  // Aggregate by region
  const regionMap = new Map<string, number>();
  for (const r of allResources) {
    regionMap.set(r.region, (regionMap.get(r.region) || 0) + 1);
  }
  const byRegion = Array.from(regionMap.entries())
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count);

  const summary: ResourceSummary = {
    totalCount: allResources.length,
    capped,
    byService,
    byRegion,
    resources: allResources,
  };

  cachedResources = summary;
  cachedAt = Date.now();

  return summary;
}
