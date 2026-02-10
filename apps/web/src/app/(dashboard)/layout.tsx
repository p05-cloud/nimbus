import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/auth/signin');

  return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
