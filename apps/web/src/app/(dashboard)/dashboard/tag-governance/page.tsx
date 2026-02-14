import { fetchTagCompliance } from '@/lib/cloud/aws-tags';
import { TagGovernanceClient } from './TagGovernanceClient';

export const metadata = { title: 'Tag Governance' };
export const dynamic = 'force-dynamic';

export default async function TagGovernancePage() {
  const data = await fetchTagCompliance().catch(() => null);

  return <TagGovernanceClient data={data} />;
}
