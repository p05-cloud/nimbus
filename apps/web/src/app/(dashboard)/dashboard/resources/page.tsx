import { Server, Layers, DollarSign } from 'lucide-react';

export const metadata = { title: 'Resources' };

export default function ResourcesPage() {
  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Resources</h1>
        <p className="text-sm text-muted-foreground">
          Inventory of all discovered cloud resources with cost attribution.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-16 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Server className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mt-6 text-xl font-semibold">Resource Inventory — Setup Required</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Per-resource discovery needs AWS Resource Explorer to be enabled.
          This is a free service — one CloudShell command activates it.
        </p>

        <div className="mt-8 grid w-full max-w-lg gap-3">
          {[
            {
              label: 'AWS Resource Explorer',
              description: 'Cross-region resource discovery — lists every EC2, S3, RDS etc.',
              cost: 'Free',
              costColor: 'text-green-600 dark:text-green-400',
            },
            {
              label: 'Cost Allocation Tags',
              description: 'Tag-based cost attribution per resource (cost-center, team, env)',
              cost: 'Free',
              costColor: 'text-green-600 dark:text-green-400',
            },
            {
              label: 'AWS Config (optional)',
              description: 'Configuration tracking + compliance rules for governance',
              cost: '~$2-3/mo',
              costColor: 'text-yellow-600 dark:text-yellow-400',
            },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-lg border p-4 text-left">
              <div className="flex items-center gap-3">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <DollarSign className="h-3 w-3 text-muted-foreground" />
                <span className={`text-xs font-medium ${item.costColor}`}>
                  {item.cost}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 w-full max-w-lg rounded-lg border border-blue-200 bg-blue-50 p-4 text-left dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">To enable (run in AWS CloudShell):</p>
          <code className="mt-2 block rounded bg-blue-100 p-2 text-xs text-blue-900 dark:bg-blue-900/40 dark:text-blue-100">
            aws resource-explorer-2 create-index --type LOCAL --region ap-south-1
          </code>
          <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">
            After enabling, resource data will appear on this page within minutes. Zero additional cost.
          </p>
        </div>
      </div>
    </div>
  );
}
