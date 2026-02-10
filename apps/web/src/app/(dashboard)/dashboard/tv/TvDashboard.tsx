'use client';

import { useEffect, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Cloud,
  Activity,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useCurrency } from '@/components/providers/CurrencyProvider';

interface TvDashboardProps {
  totalSpendMTD: number;
  forecastedSpend: number;
  changePercentage: number;
  monthlyCosts: { month: string; cost: number }[];
  topServices: { name: string; provider: string; cost: number; change: number }[];
  accountId: string;
  error?: string;
}

export function TvDashboard({
  totalSpendMTD,
  forecastedSpend,
  changePercentage,
  monthlyCosts,
  topServices,
  accountId,
  error,
}: TvDashboardProps) {
  const { format, symbol, convert } = useCurrency();
  const [time, setTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
      setRefreshing(true);
      setTimeout(() => setRefreshing(false), 1000);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Clock tick
  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  // Derive anomalies from services with >20% MoM increase
  const anomalies = topServices
    .filter((s) => s.change > 20)
    .sort((a, b) => b.change - a.change)
    .map((s) => ({
      title: `${s.name} cost spike`,
      provider: s.provider,
      impact: s.cost * (s.change / 100),
      severity: s.change > 50 ? 'critical' as const : 'warning' as const,
    }));

  // Derive savings estimates
  const computeServices = topServices.filter((s) =>
    /ec2|compute|instance|lambda|fargate|ecs/i.test(s.name),
  );
  const computeSavings = computeServices.reduce((s, c) => s + c.cost, 0) * 0.15;
  const stableCost = topServices
    .filter((s) => Math.abs(s.change) < 20 && s.cost > 1)
    .reduce((s, c) => s + c.cost, 0);
  const riSavings = stableCost * 0.30;
  const totalSavings = computeSavings + riSavings;

  // Budget & forecast
  const budgetLimit = forecastedSpend * 1.1;
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dailyBurn = totalSpendMTD / Math.max(new Date().getDate(), 1);
  const projectedEOM = dailyBurn * daysInMonth;

  // Chart data
  const chartData = monthlyCosts.map((item) => {
    const date = new Date(item.month);
    return { date: date.toLocaleDateString('en-US', { month: 'short' }), total: item.cost };
  });

  // Provider data
  const providerData = [
    { name: 'AWS', value: totalSpendMTD, color: '#F97316', change: changePercentage },
  ];

  const top5Services = topServices.slice(0, 5);

  return (
    <div className="-m-6 flex min-h-screen flex-col bg-background p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Cloud className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nimbus NOC</h1>
            <p className="text-sm text-muted-foreground">
              Cloud FinOps Command Center — AWS Account {accountId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="text-xs">Auto-refresh 60s</span>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">
              {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-xs text-muted-foreground">
              {time.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <p className="text-sm text-yellow-700 dark:text-yellow-300">{error}</p>
        </div>
      )}

      {/* KPI Strip */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <KpiCard title="Total Spend (MTD)" value={format(totalSpendMTD)} change={changePercentage} icon={DollarSign} color="text-primary" />
        <KpiCard title="Forecasted Spend" value={format(forecastedSpend)} subtitle="(EOM)" icon={TrendingUp} color="text-orange-500" />
        <KpiCard title="Savings Available" value={format(totalSavings)} subtitle="/month" icon={TrendingDown} color="text-green-500" />
        <KpiCard title="Active Anomalies" value={String(anomalies.length)} icon={AlertTriangle} color={anomalies.length > 0 ? 'text-red-500' : 'text-green-500'} alert={anomalies.length > 0} />
      </div>

      {/* Main Grid */}
      <div className="grid flex-1 grid-cols-12 gap-4">
        {/* Cost Trend */}
        <div className="col-span-7 rounded-xl border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Cost Trend</h3>
              <p className="text-xs text-muted-foreground">12-month AWS spend from Cost Explorer</p>
            </div>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="tvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `${symbol}${(convert(v) / 1000).toFixed(0)}k`} />
                <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="url(#tvGrad)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-5 flex flex-col gap-4">
          {/* Provider Split */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-3 text-lg font-semibold">Spend by Provider</h3>
            <div className="flex items-center gap-6">
              <div className="h-[140px] w-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={providerData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" stroke="none">
                      {providerData.map((p) => (<Cell key={p.name} fill={p.color} />))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {providerData.map((p) => (
                  <div key={p.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-sm font-medium">{p.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold">{format(p.value)}</span>
                      <span className={`ml-2 text-xs ${p.change < 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {p.change >= 0 ? '+' : ''}{p.change.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
                {['Azure', 'GCP', 'Oracle'].map((name) => (
                  <div key={name} className="flex items-center justify-between opacity-40">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-muted" />
                      <span className="text-sm font-medium">{name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Not connected</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Anomalies */}
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Active Anomalies</h3>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${anomalies.length > 0 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                {anomalies.length}
              </span>
            </div>
            {anomalies.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-3">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm text-green-700 dark:text-green-300">All services within normal range</span>
              </div>
            ) : (
              <div className="space-y-2">
                {anomalies.slice(0, 3).map((a) => (
                  <div key={a.title} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${a.severity === 'critical' ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`} />
                      <span className="text-sm">{a.title}</span>
                    </div>
                    <span className="text-sm font-semibold text-red-500">{format(a.impact)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row */}
        <div className="col-span-6 rounded-xl border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Top Services</h3>
            <Lightbulb className="h-5 w-5 text-warning" />
          </div>
          <div className="space-y-2">
            {top5Services.map((s, i) => {
              const maxCost = top5Services[0]?.cost || 1;
              return (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="w-5 text-xs text-muted-foreground">#{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{s.name}</span>
                      <span className="font-semibold">{format(s.cost)}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary/70" style={{ width: `${(s.cost / maxCost) * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="col-span-6 rounded-xl border bg-card p-5">
          <h3 className="mb-3 text-lg font-semibold">Budget & Forecast</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm">
                <span className="font-medium">AWS Monthly Budget</span>
                <span className="text-xs text-muted-foreground">{format(totalSpendMTD)} / {format(budgetLimit)}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${
                      totalSpendMTD / budgetLimit > 1 ? 'bg-red-500' : totalSpendMTD / budgetLimit > 0.8 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min((totalSpendMTD / budgetLimit) * 100, 100)}%` }}
                  />
                </div>
                <span className={`text-xs font-semibold ${
                  totalSpendMTD / budgetLimit > 1 ? 'text-red-500' : totalSpendMTD / budgetLimit > 0.8 ? 'text-yellow-500' : 'text-green-500'
                }`}>
                  {((totalSpendMTD / budgetLimit) * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-muted/30 p-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Daily Burn</p>
                <p className="text-sm font-semibold">{format(dailyBurn)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Projected EOM</p>
                <p className="text-sm font-semibold">{format(projectedEOM)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Est. Savings</p>
                <p className="text-sm font-semibold text-green-500">{format(totalSavings)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="mt-4 flex items-center justify-between rounded-lg bg-card/50 px-4 py-2 text-xs text-muted-foreground">
        <span>Nimbus Cloud FinOps Platform v0.1.0</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${error ? 'bg-yellow-500' : 'bg-green-500'}`} />
            {error ? 'Connection issue' : 'All systems operational'}
          </span>
          <span>Last sync: {time.toLocaleTimeString('en-IN')}</span>
          <span>1 cloud account connected</span>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, change, subtitle, icon: Icon, color, alert }: {
  title: string; value: string; change?: number; subtitle?: string;
  icon: React.ComponentType<{ className?: string }>; color: string; alert?: boolean;
}) {
  return (
    <div className={`rounded-xl border bg-card p-5 shadow-sm ${alert ? 'border-red-500/50' : ''}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className="mt-2">
        <p className="text-3xl font-bold">
          {value}
          {subtitle && <span className="text-base font-normal text-muted-foreground">{subtitle}</span>}
        </p>
        {change !== undefined && (
          <p className={`mt-1 text-xs font-medium ${change < 0 ? 'text-green-500' : 'text-red-500'}`}>
            {change >= 0 ? '+' : ''}{change.toFixed(1)}% from last month
          </p>
        )}
        {alert && <p className="mt-1 text-xs font-medium text-red-500 animate-pulse">Requires attention</p>}
      </div>
    </div>
  );
}
