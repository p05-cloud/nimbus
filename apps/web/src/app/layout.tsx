import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { CurrencyProvider } from '@/components/providers/CurrencyProvider';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Nimbus — Cloud FinOps Platform',
    template: '%s | Nimbus',
  },
  description: 'Nimbus by ACC for Poonawalla Fincorp — Unified Cloud FinOps Platform for cost visibility, optimization, and governance.',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <CurrencyProvider>
            {children}
          </CurrencyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
