import { Lightbulb, Cpu, HardDrive, Zap, Globe, Trash2 } from 'lucide-react';

export const metadata = { title: 'Recommendations' };

export default function RecommendationsPage() {
  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Recommendations</h1>
        <p className="text-sm text-muted-foreground">
          AI-powered optimization recommendations across all cloud providers.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-16 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Lightbulb className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mt-6 text-xl font-semibold">Optimization Recommendations — Coming Soon</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          AWS Compute Optimizer has been enabled on your account. Detailed rightsizing and
          optimization recommendations will appear here after 14 days of utilization data collection.
        </p>

        <div className="mt-8 grid w-full max-w-lg gap-3">
          {[
            { icon: Cpu, label: 'Rightsizing', description: 'Downsize over-provisioned EC2, RDS, and Lambda', source: 'AWS Compute Optimizer' },
            { icon: Zap, label: 'Reserved Instances / Savings Plans', description: 'Commit to 1-3 year terms for stable workloads', source: 'AWS Cost Explorer' },
            { icon: Trash2, label: 'Idle Resource Cleanup', description: 'Identify and remove unused EBS, EIPs, and snapshots', source: 'AWS Trusted Advisor' },
            { icon: HardDrive, label: 'Storage Optimization', description: 'S3 Intelligent-Tiering and lifecycle policies', source: 'S3 Storage Lens' },
            { icon: Globe, label: 'Network Optimization', description: 'VPC endpoints, NAT gateway optimization, data transfer', source: 'AWS Cost Explorer' },
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
                {item.source}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-8 w-full max-w-lg rounded-lg border border-blue-200 bg-blue-50 p-4 text-left dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Status:</strong> AWS Compute Optimizer is collecting utilization metrics.
            Recommendations will auto-populate once sufficient data is available (~14 days from account setup).
          </p>
        </div>
      </div>
    </div>
  );
}
