import { fetchAwsResources } from '@/lib/cloud/aws-resources';
import { ResourcesClient } from './ResourcesClient';

export const metadata = { title: 'Resources' };
export const dynamic = 'force-dynamic';

export default async function ResourcesPage() {
  let resources = null;
  let error: string | undefined;

  try {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      error = 'AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.';
    } else {
      resources = await fetchAwsResources();
    }
  } catch (e) {
    console.error('[Resources] Failed to fetch AWS resources:', e);
    error = e instanceof Error ? e.message : 'Failed to fetch resource data';
  }

  return (
    <ResourcesClient
      totalCount={resources?.totalCount ?? 0}
      byService={resources?.byService ?? []}
      byRegion={resources?.byRegion ?? []}
      resources={resources?.resources ?? []}
      error={error}
    />
  );
}
