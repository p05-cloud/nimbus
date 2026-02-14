'use client';

import { DollarSign, Cpu, Cloud, CreditCard, Lightbulb, ShieldCheck, ArrowRight } from 'lucide-react';
import { useCurrency } from '@/components/providers/CurrencyProvider';
import Link from 'next/link';

// --- Types -------------------------------------------------------------------

interface CERightsizingRecommendation {
  instanceId: string;
  instanceType: string;
  action: string;
  targetInstanceType: string;
  estimatedMonthlySavings: number;
}

interface RIPurchaseRecommendation {
  instanceType: string;
  estimatedMonthlySavings: number;
}

interface SPPurchaseRecommendation {
  savingsPlanType: string;
  estimatedMonthlySavings: number;
}

interface SavingsOpportunitiesCardProps {
  ceRightsizing: CERightsizingRecommendation[];
  riRecommendations: RIPurchaseRecommendation[];
  spRecommendations: SPPurchaseRecommendation[];
  optimizerSavings: number;
  optimizerStatus: string;
  trustedAdvisorSavings: number;
}

// --- Component ---------------------------------------------------------------

export function SavingsOpportunitiesCard({
  ceRightsizing,
  riRecommendations,
  spRecommendations,
  optimizerSavings,
  optimizerStatus,
  trustedAdvisorSavings,
}: SavingsOpportunitiesCardProps) {
  const { format } = useCurrency();

  const ceRightsizingSavings = ceRightsizing.reduce((s, r) => s + r.estimatedMonthlySavings, 0);
  const riSavings = riRecommendations.reduce((s, r) => s + r.estimatedMonthlySavings, 0);
  const spSavings = spRecommendations.reduce((s, r) => s + r.estimatedMonthlySavings, 0);

  const savingsSources = [
    {
      label: 'CE Rightsizing',
      description: `${ceRightsizing.filter(r => r.action === 'Terminate').length} terminate, ${ceRightsizing.filter(r => r.action === 'Modify').length} downsize`,
      savings: ceRightsizingSavings,
      count: ceRightsizing.length,
      icon: Cpu,
      href: '/dashboard/recommendations',
      color: 'text-orange-600 dark:text-orange-400',
    },
    {
      label: 'RI Purchases',
      description: `${riRecommendations.length} reservation recommendations`,
      savings: riSavings,
      count: riRecommendations.length,
      icon: CreditCard,
      href: '/dashboard/recommendations',
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Savings Plans',
      description: `${spRecommendations.length} plan recommendations`,
      savings: spSavings,
      count: spRecommendations.length,
      icon: Cloud,
      href: '/dashboard/recommendations',
      color: 'text-purple-600 dark:text-purple-400',
    },
    {
      label: 'Compute Optimizer',
      description: optimizerStatus === 'active' ? 'EC2, Lambda, EBS optimization' : 'Not enrolled',
      savings: optimizerSavings,
      count: optimizerStatus === 'active' ? 1 : 0,
      icon: Lightbulb,
      href: '/dashboard/recommendations',
      color: 'text-green-600 dark:text-green-400',
    },
    {
      label: 'Trusted Advisor',
      description: 'Cost optimization checks',
      savings: trustedAdvisorSavings,
      count: trustedAdvisorSavings > 0 ? 1 : 0,
      icon: ShieldCheck,
      href: '/dashboard/trusted-advisor',
      color: 'text-cyan-600 dark:text-cyan-400',
    },
  ].filter((s) => s.savings > 0 || s.count > 0);

  const totalMonthlySavings = ceRightsizingSavings + riSavings + spSavings + optimizerSavings + trustedAdvisorSavings;
  const totalAnnualSavings = totalMonthlySavings * 12;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Savings Opportunities</h3>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Total savings highlight */}
      <div className="mb-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 p-4 dark:from-green-900/10 dark:to-emerald-900/10">
        <p className="text-xs text-muted-foreground">Total potential savings</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-green-600 dark:text-green-400">
            {format(totalMonthlySavings)}
          </span>
          <span className="text-sm text-muted-foreground">/month</span>
        </div>
        {totalAnnualSavings > 0 && (
          <p className="mt-1 text-xs text-green-700 dark:text-green-300">
            ~{format(totalAnnualSavings)} annualized
          </p>
        )}
      </div>

      {/* Savings funnel */}
      {savingsSources.length > 0 ? (
        <div className="space-y-2">
          {savingsSources
            .sort((a, b) => b.savings - a.savings)
            .map((source) => (
              <Link
                key={source.label}
                href={source.href}
                className="flex items-center justify-between rounded-lg p-2.5 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <source.icon className={`h-4 w-4 shrink-0 ${source.color}`} />
                  <div>
                    <p className="text-sm font-medium">{source.label}</p>
                    <p className="text-xs text-muted-foreground">{source.description}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                  {format(source.savings)}
                </span>
              </Link>
            ))}
        </div>
      ) : (
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground">No savings opportunities identified</p>
          <p className="mt-1 text-xs text-muted-foreground">All resources appear optimized</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 border-t pt-3">
        <Link
          href="/dashboard/recommendations"
          className="flex items-center justify-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View all recommendations <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
