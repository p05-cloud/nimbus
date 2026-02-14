import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { CurrencyProvider } from '@/components/providers/CurrencyProvider';
import { getExchangeRateInfo } from '@/lib/cloud/exchangeRate';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Nimbus — Cloud FinOps Platform',
    template: '%s | Nimbus',
  },
  description: 'Nimbus by ACC — Unified Cloud FinOps Platform for cost visibility, optimization, and governance.',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Fetch live USD → INR exchange rate (cached 24 h server-side)
  const rateInfo = await getExchangeRateInfo();

  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <CurrencyProvider
            usdToInrRate={rateInfo.rate}
            rateLastUpdated={rateInfo.lastUpdated}
            rateSource={rateInfo.source}
          >
            {children}
          </CurrencyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
