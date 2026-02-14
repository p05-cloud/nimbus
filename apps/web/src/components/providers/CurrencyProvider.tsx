'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Currency = 'INR' | 'USD';

interface RateInfo {
  lastUpdated: string;
  source: string;
}

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  /** Convert a USD amount to the selected display currency. */
  convert: (amountInUSD: number) => number;
  /** Format a USD amount as a currency string in the selected display currency. */
  format: (amountInUSD: number) => string;
  /** Compact format (e.g. $1.2K or ₹1.5L) */
  formatCompact: (amountInUSD: number) => string;
  symbol: string;
  /** The multiplier applied to USD values for the current display currency. */
  rate: number;
  /** Live exchange-rate metadata (source + timestamp). */
  rateInfo: RateInfo | null;
}

interface CurrencyProviderProps {
  children: React.ReactNode;
  /** Live USD → INR rate fetched server-side. */
  usdToInrRate: number;
  /** ISO timestamp of when the rate was last fetched. */
  rateLastUpdated?: string;
  /** Source of the rate (e.g. "open.er-api.com"). */
  rateSource?: string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({
  children,
  usdToInrRate,
  rateLastUpdated,
  rateSource,
}: CurrencyProviderProps) {
  const [currency, setCurrencyState] = useState<Currency>('INR');

  useEffect(() => {
    const saved = localStorage.getItem('nimbus-currency') as Currency | null;
    if (saved && (saved === 'INR' || saved === 'USD')) {
      setCurrencyState(saved);
    }
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem('nimbus-currency', c);
  }, []);

  // USD is the base currency (source data from AWS).
  // When displaying in INR we multiply by the live rate.
  const configs: Record<Currency, { rate: number; locale: string; symbol: string }> = {
    USD: { rate: 1, locale: 'en-US', symbol: '$' },
    INR: { rate: usdToInrRate, locale: 'en-IN', symbol: '₹' },
  };

  const config = configs[currency];

  const convert = useCallback(
    (amountInUSD: number) => amountInUSD * config.rate,
    [config.rate],
  );

  const format = useCallback(
    (amountInUSD: number) => {
      const converted = amountInUSD * config.rate;
      return new Intl.NumberFormat(config.locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(converted);
    },
    [currency, config.locale, config.rate],
  );

  const formatCompact = useCallback(
    (amountInUSD: number) => {
      const converted = amountInUSD * config.rate;
      return new Intl.NumberFormat(config.locale, {
        style: 'currency',
        currency,
        notation: 'compact',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }).format(converted);
    },
    [currency, config.locale, config.rate],
  );

  const rateInfo: RateInfo | null =
    rateLastUpdated && rateSource
      ? { lastUpdated: rateLastUpdated, source: rateSource }
      : null;

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        convert,
        format,
        formatCompact,
        symbol: config.symbol,
        rate: config.rate,
        rateInfo,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
