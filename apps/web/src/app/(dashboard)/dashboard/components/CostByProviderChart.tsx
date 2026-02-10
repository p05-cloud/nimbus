'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useCurrency } from '@/components/providers/CurrencyProvider';

interface CostByProviderChartProps {
  monthlyCosts: { month: string; cost: number }[];
}

export function CostByProviderChart({ monthlyCosts }: CostByProviderChartProps) {
  const { format } = useCurrency();

  // Aggregate last month's total as "AWS" (single provider for now)
  const currentMonthCost = monthlyCosts.length > 0 ? monthlyCosts[monthlyCosts.length - 1].cost : 0;

  const data = [
    { name: 'AWS', value: currentMonthCost, color: 'hsl(25, 95%, 53%)' },
  ];

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">No cost data available.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="font-semibold">Cost by Provider</h3>
        <p className="text-sm text-muted-foreground">Last full month distribution</p>
      </div>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => format(value)}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 space-y-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span>{item.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">
                {total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%
              </span>
              <span className="font-medium">{format(item.value)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
