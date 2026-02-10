import { fetchAwsConfigCompliance } from '@/lib/cloud/aws-config';
import { GovernanceClient } from './GovernanceClient';

export const metadata = { title: 'Governance' };
export const dynamic = 'force-dynamic';

export default async function GovernancePage() {
  let governance = null;
  let error: string | undefined;

  try {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      error = 'AWS credentials not configured.';
    } else {
      governance = await fetchAwsConfigCompliance();
    }
  } catch (e) {
    console.error('[Governance] Failed to fetch AWS Config data:', e);
    error = e instanceof Error ? e.message : 'Failed to fetch governance data';
  }

  return (
    <GovernanceClient
      configRecorderActive={governance?.configRecorderActive ?? false}
      rules={governance?.rules ?? []}
      totalCompliant={governance?.totalCompliant ?? 0}
      totalNonCompliant={governance?.totalNonCompliant ?? 0}
      compliancePercentage={governance?.compliancePercentage ?? 0}
      status={governance?.status ?? 'error'}
      errorMessage={governance?.errorMessage ?? error}
    />
  );
}
