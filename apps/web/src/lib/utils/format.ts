type SupportedCurrency = 'INR' | 'USD' | 'EUR' | 'GBP';

const CURRENCY_CONFIG: Record<SupportedCurrency, { locale: string; symbol: string }> = {
  INR: { locale: 'en-IN', symbol: '\u20B9' },
  USD: { locale: 'en-US', symbol: '$' },
  EUR: { locale: 'de-DE', symbol: '\u20AC' },
  GBP: { locale: 'en-GB', symbol: '\u00A3' },
};

const DEFAULT_CURRENCY: SupportedCurrency =
  (process.env.NEXT_PUBLIC_DEFAULT_CURRENCY as SupportedCurrency) || 'INR';

function getConfig(currency?: SupportedCurrency) {
  const cur = currency || DEFAULT_CURRENCY;
  return { currency: cur, ...CURRENCY_CONFIG[cur] };
}

export function formatCurrency(amount: number, currency?: SupportedCurrency): string {
  const cfg = getConfig(currency);
  return new Intl.NumberFormat(cfg.locale, {
    style: 'currency',
    currency: cfg.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrencyCompact(amount: number, currency?: SupportedCurrency): string {
  const cfg = getConfig(currency);
  return new Intl.NumberFormat(cfg.locale, {
    style: 'currency',
    currency: cfg.currency,
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(amount);
}

export function getCurrencySymbol(currency?: SupportedCurrency): string {
  return getConfig(currency).symbol;
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number): string {
  const cfg = getConfig();
  return new Intl.NumberFormat(cfg.locale).format(value);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(date);
}
