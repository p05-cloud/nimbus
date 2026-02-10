'use client';

import { Lightbulb, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function RecentRecommendations() {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Recommendations</h3>
          <p className="text-sm text-muted-foreground">Optimization opportunities</p>
        </div>
        <Lightbulb className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Lightbulb className="h-6 w-6 text-primary" />
        </div>
        <p className="mt-4 text-sm font-medium">Collecting Data</p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          AWS Compute Optimizer is analyzing your resource utilization.
          Recommendations will appear here after ~14 days.
        </p>
        <Link
          href="/dashboard/recommendations"
          className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View details
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
