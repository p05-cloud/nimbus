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
import { getCurrencySymbol, formatCurrency } from '@/lib/utils';

// TODO: Replace with real data
const data = [
  { date: 'Jan', aws: 18200, azure: 12400, gcp: 8100 },
  { date: 'Feb', aws: 19100, azure: 11800, gcp: 8400 },
  { date: 'Mar', aws: 17800, azure: 13200, gcp: 7900 },
  { date: 'Apr', aws: 20500, azure: 12900, gcp: 9200 },
  { date: 'May', aws: 19800, azure: 14100, gcp: 8800 },
  { date: 'Jun', aws: 21200, azure: 13500, gcp: 9500 },
  { date: 'Jul', aws: 20100, azure: 14800, gcp: 9100 },
  { date: 'Aug', aws: 22800, azure: 15200, gcp: 10200 },
  { date: 'Sep', aws: 21500, azure: 14500, gcp: 9800 },
  { date: 'Oct', aws: 23100, azure: 15800, gcp: 10500 },
  { date: 'Nov', aws: 22200, azure: 15100, gcp: 10100 },
  { date: 'Dec', aws: 20800, azure: 14200, gcp: 9600 },
];

export function CostTrendChart() {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="font-semibold">Cost Trend</h3>
        <p className="text-sm text-muted-foreground">Monthly spend by cloud provider</p>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAws" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorAzure" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(210, 100%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(210, 100%, 50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorGcp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v) => `${getCurrencySymbol()}${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [formatCurrency(value), undefined]}
            />
            <Area
              type="monotone"
              dataKey="aws"
              name="AWS"
              stroke="hsl(25, 95%, 53%)"
              fill="url(#colorAws)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="azure"
              name="Azure"
              stroke="hsl(210, 100%, 50%)"
              fill="url(#colorAzure)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="gcp"
              name="GCP"
              stroke="hsl(142, 76%, 36%)"
              fill="url(#colorGcp)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
