'use server';

// --- Types -------------------------------------------------------------------

interface ExchangeRateInfo {
  rate: number;
  lastUpdated: string; // ISO string (serializable for client)
  source: string;
}

// --- In-memory cache ---------------------------------------------------------

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
let cachedInfo: ExchangeRateInfo | null = null;
let cachedAt = 0;

// --- Public API --------------------------------------------------------------

/**
 * Fetch the live USD → INR exchange rate.
 * Uses open.er-api.com (free, no API key, ~1 500 req/month).
 * Returns a cached value for 24 hours to minimize calls.
 */
export async function getUsdToInrRate(): Promise<number> {
  const info = await getExchangeRateInfo();
  return info.rate;
}

/**
 * Full metadata: rate + lastUpdated + source.
 * Safe to pass to client components (all fields are serializable).
 */
export async function getExchangeRateInfo(): Promise<ExchangeRateInfo> {
  // Return cached data if fresh
  if (cachedInfo && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedInfo;
  }

  // --- Primary API: open.er-api.com ------------------------------------------
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 86_400 }, // Next.js ISR: revalidate every 24 h
    });

    if (!res.ok) throw new Error(`Exchange rate API returned ${res.status}`);

    const data = await res.json();
    const rate = data?.rates?.INR;

    if (typeof rate !== 'number' || rate <= 0) {
      throw new Error('Invalid INR rate in API response');
    }

    cachedInfo = {
      rate,
      lastUpdated: new Date().toISOString(),
      source: 'open.er-api.com',
    };
    cachedAt = Date.now();

    return cachedInfo;
  } catch (primaryError) {
    console.error('[ExchangeRate] Primary API failed:', primaryError);
  }

  // --- Fallback: exchangerate-api.com ----------------------------------------
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      next: { revalidate: 86_400 },
    });

    if (!res.ok) throw new Error(`Fallback API returned ${res.status}`);

    const data = await res.json();
    const rate = data?.rates?.INR;

    if (typeof rate !== 'number' || rate <= 0) {
      throw new Error('Invalid INR rate in fallback response');
    }

    cachedInfo = {
      rate,
      lastUpdated: new Date().toISOString(),
      source: 'exchangerate-api.com',
    };
    cachedAt = Date.now();

    return cachedInfo;
  } catch (fallbackError) {
    console.error('[ExchangeRate] Fallback API failed:', fallbackError);
  }

  // --- Stale cache -----------------------------------------------------------
  if (cachedInfo) {
    console.warn('[ExchangeRate] Returning stale cached rate');
    return cachedInfo;
  }

  // --- Last resort -----------------------------------------------------------
  console.warn('[ExchangeRate] All sources failed. Using emergency fallback rate 83.');
  return {
    rate: 83,
    lastUpdated: new Date().toISOString(),
    source: 'fallback (offline)',
  };
}
