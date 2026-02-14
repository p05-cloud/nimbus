import { fetchTrustedAdvisorSummary } from '@/lib/cloud/aws-trusted-advisor';
import { TrustedAdvisorClient } from './TrustedAdvisorClient';

export const metadata = { title: 'Trusted Advisor' };
export const dynamic = 'force-dynamic';

export default async function TrustedAdvisorPage() {
  const data = await fetchTrustedAdvisorSummary().catch(() => null);

  return <TrustedAdvisorClient data={data} />;
}
