import { Shield, Lock, Tag, Eye, FileCheck, DollarSign } from 'lucide-react';

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
        <h2 className="mt-6 text-xl font-semibold">Governance & Compliance — Setup Required</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Requires AWS Config to be enabled. Config records all resource changes
          and evaluates compliance rules automatically.
        </p>

        <div className="mt-8 grid w-full max-w-lg gap-3">
          {[
            { icon: Tag, label: 'Tagging Compliance', description: 'Enforce cost-center, environment, and team tags', cost: 'AWS Config' },
            { icon: Lock, label: 'Security Policies', description: 'No public S3 buckets, encryption at rest, IAM audit', cost: 'AWS Config' },
            { icon: Eye, label: 'Cost Guardrails', description: 'Max instance sizes, spending limits per service', cost: 'AWS Config' },
            { icon: FileCheck, label: 'Audit Reports', description: 'Compliance reports for BFSI regulatory requirements', cost: 'AWS Config' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-lg border p-4 text-left">
              <div className="flex items-center gap-3">
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
                {item.cost}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 w-full max-w-lg space-y-3">
          <div className="flex items-center justify-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-muted-foreground">
              AWS Config cost: <strong className="text-yellow-600 dark:text-yellow-400">~$2-3/month</strong> (₹0.003 per config item/region)
            </span>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-left dark:border-blue-800 dark:bg-blue-900/20">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">To enable (run in AWS CloudShell):</p>
            <code className="mt-2 block rounded bg-blue-100 p-2 text-xs text-blue-900 dark:bg-blue-900/40 dark:text-blue-100">
              aws configservice put-configuration-recorder --configuration-recorder name=default,roleARN=arn:aws:iam::766940073591:role/aws-service-role/config.amazonaws.com/AWSServiceRoleForConfig --recording-group allSupported=true
            </code>
            <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">
              After enabling, governance policies will auto-populate on this page.
              Use minimal Config rules to keep costs at ~$2-3/month.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
