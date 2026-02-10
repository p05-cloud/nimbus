import { Server, Layers, ArrowRight } from 'lucide-react';

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
        <h2 className="mt-6 text-xl font-semibold">Resource Inventory — Coming Soon</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Individual resource discovery requires AWS Config or AWS Resource Explorer integration.
          This will provide per-resource cost attribution, tagging status, and idle resource detection.
        </p>

        <div className="mt-8 grid w-full max-w-lg gap-3">
          {[
            { label: 'AWS Config', description: 'Resource configuration tracking and compliance', status: 'Requires setup' },
            { label: 'AWS Resource Explorer', description: 'Cross-region resource discovery', status: 'Requires setup' },
            { label: 'Cost Allocation Tags', description: 'Tag-based cost attribution per resource', status: 'Requires setup' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-lg border p-4 text-left">
              <div className="flex items-center gap-3">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {item.status}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Meanwhile, service-level cost data is available on the <strong>Cost Explorer</strong> and <strong>Dashboard</strong> pages.
        </p>
      </div>
    </div>
  );
}
