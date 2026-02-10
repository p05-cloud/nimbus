'use client';

import {
  Shield, ShieldCheck, ShieldAlert, ShieldX,
  CheckCircle, XCircle, MinusCircle, AlertTriangle,
  Tag, Lock, Eye, FileCheck, DollarSign, Info,
} from 'lucide-react';

// --- Types -------------------------------------------------------------------

interface ComplianceRule {
  ruleName: string;
  description: string;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_APPLICABLE' | 'INSUFFICIENT_DATA';
  compliantCount: number;
  nonCompliantCount: number;
  source: string;
}

interface GovernanceClientProps {
  configRecorderActive: boolean;
  rules: ComplianceRule[];
  totalCompliant: number;
  totalNonCompliant: number;
  compliancePercentage: number;
  status: 'active' | 'not-enabled' | 'error';
  errorMessage?: string;
}

// --- Styles ------------------------------------------------------------------

const statusStyles = {
  COMPLIANT: {
    bg: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle,
    label: 'Compliant',
  },
  NON_COMPLIANT: {
    bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: XCircle,
    label: 'Non-Compliant',
  },
  NOT_APPLICABLE: {
    bg: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
    icon: MinusCircle,
    label: 'N/A',
  },
  INSUFFICIENT_DATA: {
    bg: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: AlertTriangle,
    label: 'Pending',
  },
};

// --- Not Enabled State -------------------------------------------------------

function ConfigNotEnabled({ errorMessage }: { errorMessage?: string }) {
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
          {errorMessage || 'Requires AWS Config to be enabled. Config records all resource changes and evaluates compliance rules automatically.'}
        </p>

        <div className="mt-8 grid w-full max-w-lg gap-3">
          {[
            { icon: Tag, label: 'Tagging Compliance', description: 'Enforce cost-center, environment, and team tags' },
            { icon: Lock, label: 'Security Policies', description: 'No public S3 buckets, encryption at rest, IAM audit' },
            { icon: Eye, label: 'Cost Guardrails', description: 'Max instance sizes, spending limits per service' },
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
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
                AWS Config
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 w-full max-w-lg space-y-3">
          <div className="flex items-center justify-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-muted-foreground">
              AWS Config cost: <strong className="text-yellow-600 dark:text-yellow-400">~$2-3/month</strong> ($0.003 per config item/region)
            </span>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-left dark:border-blue-800 dark:bg-blue-900/20">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">To enable (run in AWS CloudShell):</p>
            <code className="mt-2 block rounded bg-blue-100 p-2 text-xs text-blue-900 dark:bg-blue-900/40 dark:text-blue-100 break-all">
              aws configservice put-configuration-recorder --configuration-recorder name=default,roleARN=arn:aws:iam::766940073591:role/aws-service-role/config.amazonaws.com/AWSServiceRoleForConfig --recording-group allSupported=true
            </code>
            <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">
              After enabling, governance policies will auto-populate on this page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Active Governance View --------------------------------------------------

export function GovernanceClient({
  configRecorderActive,
  rules,
  totalCompliant,
  totalNonCompliant,
  compliancePercentage,
  status,
  errorMessage,
}: GovernanceClientProps) {
  // Show setup page if Config is not enabled
  if (status === 'not-enabled' || status === 'error') {
    return <ConfigNotEnabled errorMessage={errorMessage} />;
  }

  const totalRules = rules.length;
  const pendingRules = rules.filter(
    (r) => r.complianceStatus === 'INSUFFICIENT_DATA' || r.complianceStatus === 'NOT_APPLICABLE',
  ).length;

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Governance</h1>
        <p className="text-sm text-muted-foreground">
          Policy compliance from AWS Config — {totalRules} rules evaluated
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Compliance Score</p>
            <ShieldCheck className="h-4 w-4 text-green-500" />
          </div>
          <p className={`mt-1 text-3xl font-bold ${
            compliancePercentage >= 80
              ? 'text-green-600 dark:text-green-400'
              : compliancePercentage >= 50
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-red-600 dark:text-red-400'
          }`}>
            {compliancePercentage.toFixed(0)}%
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Compliant</p>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
          <p className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">{totalCompliant}</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Non-Compliant</p>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </div>
          <p className={`mt-1 text-3xl font-bold ${totalNonCompliant > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
            {totalNonCompliant}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total Rules</p>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-1 text-3xl font-bold">{totalRules}</p>
        </div>
      </div>

      {/* Compliance Progress Bar */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Overall Compliance</h3>
          <span className="text-sm text-muted-foreground">
            {totalCompliant} of {totalCompliant + totalNonCompliant} rules passing
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <div className="flex h-full">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${compliancePercentage}%` }}
            />
            {totalNonCompliant > 0 && (
              <div
                className="h-full bg-red-500 transition-all"
                style={{ width: `${100 - compliancePercentage}%` }}
              />
            )}
          </div>
        </div>
        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500" /> Compliant
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" /> Non-Compliant
          </span>
          {pendingRules > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-500" /> {pendingRules} pending evaluation
            </span>
          )}
        </div>
      </div>

      {/* Rules Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="p-6 pb-3">
          <h3 className="font-semibold">Config Rules</h3>
          <p className="text-sm text-muted-foreground">
            AWS Config compliance rules and their current status
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-t text-left">
                <th className="px-6 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Rule</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Description</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Source</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Resources</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => {
                const style = statusStyles[rule.complianceStatus] || statusStyles.INSUFFICIENT_DATA;
                const Icon = style.icon;
                return (
                  <tr key={rule.ruleName} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg}`}>
                        <Icon className="h-3 w-3" />
                        {style.label}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="font-mono text-xs">{rule.ruleName}</span>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground max-w-md">
                      <span className="text-xs">{rule.description}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {rule.source}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      {rule.complianceStatus === 'NON_COMPLIANT' && rule.nonCompliantCount > 0 && (
                        <span className="text-xs text-red-600 dark:text-red-400">
                          {rule.nonCompliantCount} failing
                        </span>
                      )}
                      {rule.complianceStatus === 'COMPLIANT' && (
                        <span className="text-xs text-green-600 dark:text-green-400">All passing</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rules.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No Config rules found. Add compliance rules from the AWS Console.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <Info className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Powered by AWS Config
          </p>
          <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
            Rules are evaluated automatically by AWS Config. Add managed or custom rules from the AWS Console
            to enforce tagging, security, and cost governance policies.
          </p>
        </div>
      </div>
    </div>
  );
}
