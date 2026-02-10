import { Shield, Lock, Tag, Eye, FileCheck } from 'lucide-react';

export const metadata = { title: 'Governance' };

export default function GovernancePage() {
  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Governance</h1>
        <p className="text-sm text-muted-foreground">
          Policy compliance, tagging rules, and cost governance.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-16 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mt-6 text-xl font-semibold">Governance & Compliance — Coming Soon</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Automated policy enforcement requires AWS Config Rules integration.
          This will enable tagging compliance, security posture checks, and cost governance policies.
        </p>

        <div className="mt-8 grid w-full max-w-lg gap-3">
          {[
            { icon: Tag, label: 'Tagging Compliance', description: 'Enforce cost-center, environment, and team tags on all resources' },
            { icon: Lock, label: 'Security Policies', description: 'No public S3 buckets, encryption at rest, IAM best practices' },
            { icon: Eye, label: 'Cost Guardrails', description: 'Max instance sizes, spending limits, and auto-remediation' },
            { icon: FileCheck, label: 'Audit Reports', description: 'Compliance reports for BFSI regulatory requirements' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-lg border p-4 text-left">
              <div className="flex items-center gap-3">
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Planned
              </span>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Requires AWS Config Rules. Setup instructions will be provided when this feature is enabled.
        </p>
      </div>
    </div>
  );
}
