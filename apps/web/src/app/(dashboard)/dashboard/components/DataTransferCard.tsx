'use client';

import { ArrowRightLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useCurrency } from '@/components/providers/CurrencyProvider';

interface DataTransferCost {
  category: string;
  cost: number;
  change: number;
}

interface DataTransferCardProps {
  dataTransfer: DataTransferCost[];
  totalSpendMTD: number;
}

function stripPrefix(category: string): string {
  return category
    .replace(/^(EC2|S3|CloudFront|RDS): Data Transfer - /i, '')
    .replace(/\(Out\)/i, '(Out)')
    .trim();
}

function getChangeIcon(change: number) {
  if (change > 5) return TrendingUp;
  if (change < -5) return TrendingDown;
  return Minus;
}

export function DataTransferCard({ dataTransfer, totalSpendMTD }: DataTransferCardProps) {
  const { format } = useCurrency();

  const totalTransferCost = dataTransfer.reduce((sum, d) => sum + d.cost, 0);
  const transferPercent = totalSpendMTD > 0 ? (totalTransferCost / totalSpendMTD) * 100 : 0;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Data Transfer Visibility</h3>
          <p className="text-sm text-muted-foreground">
            Network egress costs — {transferPercent.toFixed(1)}% of total spend
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
          <ArrowRightLeft className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
      </div>

      {/* Total */}
      <div className="mb-4 rounded-lg bg-muted/50 p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Data Transfer (MTD)</span>
          <span className="text-lg font-bold">{format(totalTransferCost)}</span>
        </div>
      </div>

      {/* Breakdown */}
      {dataTransfer.length > 0 ? (
        <div className="space-y-2">
          {dataTransfer.slice(0, 5).map((item) => {
            const ChangeIcon = getChangeIcon(item.change);
            const changeColor = item.change > 5
              ? 'text-red-600 dark:text-red-400'
              : item.change < -5
                ? 'text-green-600 dark:text-green-400'
                : 'text-muted-foreground';

            return (
              <div
                key={item.category}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <span className="text-xs">{stripPrefix(item.category)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{format(item.cost)}</span>
                  {item.change !== 0 && (
                    <span className={`flex items-center gap-0.5 text-xs ${changeColor}`}>
                      <ChangeIcon className="h-3 w-3" />
                      {Math.abs(item.change).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground py-4">
          No data transfer costs detected this month
        </p>
      )}
    </div>
  );
}
