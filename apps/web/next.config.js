/** @type {import('next').NextConfig} */
const nextConfig = {
  // Activer le mode strict de React
  reactStrictMode: true,

  // Transpiler les packages du monorepo
  transpilePackages: [
    '@stock-screener/database',
    '@stock-screener/scraper',
    '@stock-screener/scoring',
    '@stock-screener/ui',
  ],

  // Optimisations production
  swcMinify: true,

  // Variables d'environnement exposées côté client
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  // Headers de sécurité
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Configuration images (pour logos entreprises si besoin)
  images: {
    domains: ['logo.clearbit.com', 'assets.parqet.com'],
  },
};

module.exports = nextConfig;
