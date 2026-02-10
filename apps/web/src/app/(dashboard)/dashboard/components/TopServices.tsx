'use client';

import { formatPercentage } from '@/lib/utils';
import { useCurrency } from '@/components/providers/CurrencyProvider';

interface TopServicesProps {
  services: { name: string; provider: string; cost: number; change: number }[];
}

const providerColors: Record<string, string> = {
  AWS: 'bg-orange-500',
  Azure: 'bg-blue-500',
  GCP: 'bg-green-500',
};

export function TopServices({ services }: TopServicesProps) {
  const { format } = useCurrency();

  if (services.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="font-semibold">Top Services by Cost</h3>
          <p className="text-sm text-muted-foreground">Highest spending services this month</p>
        </div>
        <p className="text-sm text-muted-foreground">No data available yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="font-semibold">Top Services by Cost</h3>
        <p className="text-sm text-muted-foreground">Highest spending services this month</p>
      </div>
      <div className="space-y-3">
        {services.map((service) => (
          <div key={service.name} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-2 w-2 rounded-full ${providerColors[service.provider] || 'bg-gray-500'}`} />
              <div>
                <p className="text-sm font-medium">{service.name}</p>
                <p className="text-xs text-muted-foreground">{service.provider}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{format(service.cost)}</p>
              {service.change !== 0 && (
                <p
                  className={`text-xs ${
                    service.change < 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatPercentage(service.change)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
