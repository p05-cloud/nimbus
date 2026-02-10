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
import { formatCurrency, getCurrencySymbol } from '@/lib/utils';

// Sample data — in production, fetched from API with auto-refresh
const costTrend = [
  { date: 'Jan', total: 38700 },
  { date: 'Feb', total: 39300 },
  { date: 'Mar', total: 38900 },
  { date: 'Apr', total: 42600 },
  { date: 'May', total: 42700 },
  { date: 'Jun', total: 44200 },
  { date: 'Jul', total: 44000 },
  { date: 'Aug', total: 48200 },
  { date: 'Sep', total: 45800 },
  { date: 'Oct', total: 49400 },
  { date: 'Nov', total: 47400 },
  { date: 'Dec', total: 44600 },
];

const providers = [
  { name: 'AWS', value: 20800, color: '#F97316', change: -2.1 },
  { name: 'Azure', value: 14200, color: '#3B82F6', change: 5.3 },
  { name: 'GCP', value: 9600, color: '#22C55E', change: -0.8 },
  { name: 'K8s', value: 3200, color: '#A855F7', change: 1.2 },
];

const anomalies = [
  { title: 'EC2 data transfer spike', provider: 'AWS', impact: 2840, severity: 'critical' },
  { title: 'Azure SQL DTU anomaly', provider: 'Azure', impact: 1250, severity: 'warning' },
  { title: 'BigQuery scan cost spike', provider: 'GCP', impact: 890, severity: 'warning' },
];

const topServices = [
  { name: 'Amazon EC2', cost: 8420 },
  { name: 'Azure SQL', cost: 5230 },
  { name: 'Amazon S3', cost: 4180 },
  { name: 'GCE Instances', cost: 3950 },
  { name: 'Amazon RDS', cost: 3620 },
];

export function TvDashboard() {
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

  const totalSpend = 47832.5;
  const forecast = 92150;
  const savings = 30060;

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
            <p className="text-sm text-muted-foreground">Cloud FinOps Command Center</p>
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

      {/* KPI Strip */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <KpiCard
          title="Total Spend (MTD)"
          value={formatCurrency(totalSpend)}
          change={-3.2}
          icon={DollarSign}
          color="text-primary"
        />
        <KpiCard
          title="Forecasted Spend"
          value={formatCurrency(forecast)}
          change={2.1}
          icon={TrendingUp}
          color="text-orange-500"
        />
        <KpiCard
          title="Savings Available"
          value={formatCurrency(savings)}
          subtitle="/month"
          icon={TrendingDown}
          color="text-green-500"
        />
        <KpiCard
          title="Active Anomalies"
          value="3"
          icon={AlertTriangle}
          color="text-red-500"
          alert
        />
      </div>

      {/* Main Grid */}
      <div className="grid flex-1 grid-cols-12 gap-4">
        {/* Cost Trend - Large */}
        <div className="col-span-7 rounded-xl border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Cost Trend</h3>
              <p className="text-xs text-muted-foreground">12-month total cloud spend</p>
            </div>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={costTrend}>
                <defs>
                  <linearGradient id="tvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(v) => `${getCurrencySymbol()}${(v / 1000).toFixed(0)}k`}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  fill="url(#tvGrad)"
                  strokeWidth={3}
                />
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
                    <Pie
                      data={providers}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {providers.map((p) => (
                        <Cell key={p.name} fill={p.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {providers.map((p) => (
                  <div key={p.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-sm font-medium">{p.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold">{formatCurrency(p.value)}</span>
                      <span
                        className={`ml-2 text-xs ${p.change < 0 ? 'text-green-500' : 'text-red-500'}`}
                      >
                        {p.change >= 0 ? '+' : ''}{p.change}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Anomalies */}
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Active Anomalies</h3>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/10 text-xs font-bold text-red-500">
                {anomalies.length}
              </span>
            </div>
            <div className="space-y-2">
              {anomalies.map((a) => (
                <div
                  key={a.title}
                  className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${a.severity === 'critical' ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`}
                    />
                    <span className="text-sm">{a.title}</span>
                  </div>
                  <span className="text-sm font-semibold text-red-500">{formatCurrency(a.impact)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="col-span-6 rounded-xl border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Top Services</h3>
            <Lightbulb className="h-5 w-5 text-warning" />
          </div>
          <div className="space-y-2">
            {topServices.map((s, i) => {
              const maxCost = topServices[0].cost;
              return (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="w-5 text-xs text-muted-foreground">#{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{s.name}</span>
                      <span className="font-semibold">{formatCurrency(s.cost)}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${(s.cost / maxCost) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="col-span-6 rounded-xl border bg-card p-5">
          <h3 className="mb-3 text-lg font-semibold">Budget Status</h3>
          <div className="space-y-3">
            {[
              { name: 'AWS Production', spent: 20800, limit: 25000 },
              { name: 'Azure Dev', spent: 7200, limit: 10000 },
              { name: 'GCP Analytics', spent: 9600, limit: 8000 },
              { name: 'K8s Platform', spent: 3200, limit: 5000 },
            ].map((b) => {
              const pctUsed = (b.spent / b.limit) * 100;
              const isOver = pctUsed > 100;
              const isWarn = pctUsed > 80 && !isOver;
              return (
                <div key={b.name}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{b.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(b.spent)} / {formatCurrency(b.limit)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : isWarn ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(pctUsed, 100)}%` }}
                      />
                    </div>
                    <span
                      className={`text-xs font-semibold ${isOver ? 'text-red-500' : isWarn ? 'text-yellow-500' : 'text-green-500'}`}
                    >
                      {pctUsed.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="mt-4 flex items-center justify-between rounded-lg bg-card/50 px-4 py-2 text-xs text-muted-foreground">
        <span>Nimbus Cloud FinOps Platform v0.1.0</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            All systems operational
          </span>
          <span>Last sync: {time.toLocaleTimeString('en-IN')}</span>
          <span>4 cloud accounts connected</span>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  change,
  subtitle,
  icon: Icon,
  color,
  alert,
}: {
  title: string;
  value: string;
  change?: number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  alert?: boolean;
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
          <p
            className={`mt-1 text-xs font-medium ${change < 0 ? 'text-green-500' : 'text-red-500'}`}
          >
            {change >= 0 ? '+' : ''}{change}% from last month
          </p>
        )}
        {alert && (
          <p className="mt-1 text-xs font-medium text-red-500 animate-pulse">
            Requires attention
          </p>
        )}
      </div>
    </div>
  );
}
