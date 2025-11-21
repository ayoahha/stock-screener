import type { Metadata } from 'next';
// Google Fonts disabled in sandboxed environment (network restrictions)
// import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { TRPCProvider } from '@/lib/trpc/provider';

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
    <html lang="fr" className="dark">
      <body className="font-sans">
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
