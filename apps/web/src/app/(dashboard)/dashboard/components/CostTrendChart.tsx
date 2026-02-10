'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useCurrency } from '@/components/providers/CurrencyProvider';

interface CostTrendChartProps {
  monthlyCosts: { month: string; cost: number }[];
}

export function CostTrendChart({ monthlyCosts }: CostTrendChartProps) {
  const { symbol, convert, format } = useCurrency();

  const data = monthlyCosts.map((item) => {
    const date = new Date(item.month);
    const label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    return { date: label, aws: item.cost };
  });

  if (data.length === 0) {
    return (
      <div className="flex h-[380px] items-center justify-center rounded-xl border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">No cost data available. Connect a cloud account.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="font-semibold">Cost Trend</h3>
        <p className="text-sm text-muted-foreground">Monthly AWS spend</p>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAws" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v) => `${symbol}${(convert(v) / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [format(value), undefined]}
            />
            <Area type="monotone" dataKey="aws" name="AWS" stroke="hsl(25, 95%, 53%)" fill="url(#colorAws)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
