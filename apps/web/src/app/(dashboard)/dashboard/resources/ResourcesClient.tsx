'use client';

import { useState, useMemo } from 'react';
import { Server, Search, Layers, MapPin, Package, AlertTriangle } from 'lucide-react';

interface CloudResource {
  arn: string;
  resourceType: string;
  service: string;
  region: string;
  lastReportedAt: string;
  properties: Record<string, string>;
}

interface ResourcesClientProps {
  totalCount: number;
  byService: { service: string; count: number }[];
  byRegion: { region: string; count: number }[];
  resources: CloudResource[];
  error?: string;
}

// Friendly service display names
const SERVICE_LABELS: Record<string, string> = {
  ec2: 'EC2',
  s3: 'S3',
  rds: 'RDS',
  lambda: 'Lambda',
  iam: 'IAM',
  cloudformation: 'CloudFormation',
  cloudwatch: 'CloudWatch',
  sns: 'SNS',
  sqs: 'SQS',
  dynamodb: 'DynamoDB',
  elasticloadbalancing: 'ELB',
  autoscaling: 'Auto Scaling',
  ecs: 'ECS',
  eks: 'EKS',
  kms: 'KMS',
  logs: 'CloudWatch Logs',
  events: 'EventBridge',
  ssm: 'Systems Manager',
  secretsmanager: 'Secrets Manager',
  elasticache: 'ElastiCache',
  'resource-explorer-2': 'Resource Explorer',
  config: 'AWS Config',
  cloudtrail: 'CloudTrail',
};

function getServiceLabel(service: string): string {
  return SERVICE_LABELS[service] || service.charAt(0).toUpperCase() + service.slice(1);
}

// Service badge colors (rotate through a palette)
const SERVICE_COLORS = [
  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
];

function getServiceColor(index: number): string {
  return SERVICE_COLORS[index % SERVICE_COLORS.length];
}

export function ResourcesClient({
  totalCount,
  byService,
  byRegion,
  resources,
  error,
}: ResourcesClientProps) {
  const [search, setSearch] = useState('');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = resources;
    if (selectedService) {
      result = result.filter((r) => r.service === selectedService);
    }
    if (selectedRegion) {
      result = result.filter((r) => r.region === selectedRegion);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.arn.toLowerCase().includes(q) ||
          r.resourceType.toLowerCase().includes(q) ||
          r.service.toLowerCase().includes(q),
      );
    }
    return result;
  }, [resources, selectedService, selectedRegion, search]);

  if (error || totalCount === 0) {
    return (
      <div className="space-y-6 animate-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resources</h1>
          <p className="text-sm text-muted-foreground">
            Inventory of all discovered cloud resources.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              No resource data available
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              {error || 'Resource Explorer returned no resources. Ensure AWS Resource Explorer is enabled.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Resources</h1>
        <p className="text-sm text-muted-foreground">
          {totalCount.toLocaleString()} resources discovered via AWS Resource Explorer
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Total Resources</p>
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-bold">{totalCount.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Services</p>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-bold">{byService.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Regions</p>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-bold">{byRegion.length}</p>
        </div>
      </div>

      {/* Service Breakdown + Region Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* By Service */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold">Resources by Service</h3>
          <p className="text-sm text-muted-foreground">Click to filter the table below</p>
          <div className="mt-4 space-y-2">
            {byService.slice(0, 12).map((s, i) => {
              const pct = totalCount > 0 ? (s.count / totalCount) * 100 : 0;
              const isActive = selectedService === s.service;
              return (
                <button
                  key={s.service}
                  onClick={() => setSelectedService(isActive ? null : s.service)}
                  className={`flex w-full items-center justify-between rounded-lg p-2.5 text-left transition-colors ${
                    isActive ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${getServiceColor(i)}`}
                    >
                      {getServiceLabel(s.service)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-24 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/60"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-sm font-medium">{s.count}</span>
                  </div>
                </button>
              );
            })}
            {byService.length > 12 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                +{byService.length - 12} more services
              </p>
            )}
          </div>
        </div>

        {/* By Region */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold">Resources by Region</h3>
          <p className="text-sm text-muted-foreground">Click to filter the table below</p>
          <div className="mt-4 space-y-2">
            {byRegion.map((r) => {
              const pct = totalCount > 0 ? (r.count / totalCount) * 100 : 0;
              const isActive = selectedRegion === r.region;
              return (
                <button
                  key={r.region}
                  onClick={() => setSelectedRegion(isActive ? null : r.region)}
                  className={`flex w-full items-center justify-between rounded-lg p-2.5 text-left transition-colors ${
                    isActive ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{r.region || 'global'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-24 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-blue-500/60"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-sm font-medium">{r.count}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Search + Filters + Resource Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 p-6 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">Resource Inventory</h3>
            <p className="text-sm text-muted-foreground">
              Showing {filtered.length.toLocaleString()} of {totalCount.toLocaleString()} resources
              {selectedService && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {getServiceLabel(selectedService)}
                  <button onClick={() => setSelectedService(null)} className="ml-0.5 hover:text-destructive">&times;</button>
                </span>
              )}
              {selectedRegion && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {selectedRegion}
                  <button onClick={() => setSelectedRegion(null)} className="ml-0.5 hover:text-destructive">&times;</button>
                </span>
              )}
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by ARN, type, service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:w-72"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-t text-left">
                <th className="px-6 py-3 font-medium text-muted-foreground">Resource Type</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Service</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Region</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">ARN</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((r) => (
                <tr key={r.arn} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-6 py-3">
                    <span className="font-medium">{r.resourceType.split(':').pop()}</span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-orange-500" />
                      {getServiceLabel(r.service)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">{r.region || 'global'}</td>
                  <td className="px-6 py-3">
                    <span className="font-mono text-xs text-muted-foreground break-all">
                      {r.arn}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    No resources match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 100 && (
          <div className="border-t px-6 py-3 text-center text-xs text-muted-foreground">
            Showing first 100 of {filtered.length.toLocaleString()} matching resources.
            Use search and filters to narrow down.
          </div>
        )}
      </div>
    </div>
  );
}
