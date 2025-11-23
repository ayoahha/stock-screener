import type { Metadata } from 'next';
// Google Fonts disabled in sandboxed environment (network restrictions)
// import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { TRPCProvider } from '@/lib/trpc/provider';
import { ToastProvider } from '@/components/ui/toast';
import { ThemeToggle } from '@/components/theme-toggle';

// const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Stock Screener - Aide à la Décision Boursière',
  description:
    'Application d\'analyse et de scoring d\'actions avec scraping robuste des marchés européens et américains',
  keywords: [
    'bourse',
    'actions',
    'stock screener',
    'analyse financière',
    'CAC 40',
    'value investing',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="font-sans">
        {/* Skip to main content link for keyboard navigation */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-gold focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-gold-light"
        >
          Aller au contenu principal
        </a>
        <TRPCProvider>
          <ToastProvider>
            <ThemeToggle />
            {children}
          </ToastProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
