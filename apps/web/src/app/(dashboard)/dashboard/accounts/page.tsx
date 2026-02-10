import { Cloud, Plus, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { getDashboardData } from '@/lib/cloud/fetchDashboardData';

export const metadata = { title: 'Cloud Accounts' };
export const dynamic = 'force-dynamic';

const pendingProviders = [
  {
    name: 'Microsoft Azure',
    color: 'bg-blue-500',
    description: 'Azure Cost Management API integration for subscription-level cost tracking.',
  },
  {
    name: 'Google Cloud Platform',
    color: 'bg-red-500',
    description: 'BigQuery billing export integration for project-level cost visibility.',
  },
  {
    name: 'Oracle Cloud Infrastructure',
    color: 'bg-[#C74634]',
    description: 'OCI Cost Analysis API integration for tenancy-level cost tracking.',
  },
];

export default async function CloudAccountsPage() {
  const data = await getDashboardData();
  const hasAwsAccount = data.accountId && data.accountId !== 'not-connected';

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cloud Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Manage connected cloud provider accounts and credentials.
          </p>
        </div>
        <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Add Account
        </button>
      </div>

      {/* Connected Accounts */}
      {hasAwsAccount && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Connected</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500">
                    <Cloud className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">ACC Digitalization</h3>
                    <p className="text-xs text-muted-foreground">Amazon Web Services</p>
                  </div>
                </div>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account ID</span>
                  <span className="font-mono text-xs">{data.accountId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Region</span>
                  <span className="font-mono text-xs">ap-south-1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Services Tracked</span>
                  <span>{data.topServices.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400">
                    <RefreshCw className="h-3 w-3" />
                    Live
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Pending Integration */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pt-2">
        Available Integrations
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pendingProviders.map((provider) => (
          <div key={provider.name} className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${provider.color}`}>
                  <Cloud className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">{provider.name}</h3>
                  <p className="text-xs text-muted-foreground">Not integrated yet</p>
                </div>
              </div>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">{provider.description}</p>
              <div className="mt-3 rounded-md bg-muted/50 p-2">
                <p className="text-xs text-muted-foreground text-center">
                  Integration available — contact your ACC team to onboard
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!hasAwsAccount && (
        <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">No accounts connected</p>
          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
            {data.error || 'Configure cloud provider credentials to start tracking costs.'}
          </p>
        </div>
      )}
    </div>
  );
}
