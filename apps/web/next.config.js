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

  // Exclude Playwright and other server-only packages from client bundle
  // Note: serverExternalPackages is the correct option for Next.js 15+
  serverExternalPackages: ['playwright', 'playwright-core', 'openai'],

  // Webpack configuration to exclude Playwright from bundle
  webpack: (config, { isServer }) => {
    // Externalize Playwright and OpenAI for both client and server builds
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push('playwright', 'playwright-core', 'openai');
    }

    // For client builds, alias Playwright and OpenAI to false to prevent bundling attempts
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        playwright: false,
        'playwright-core': false,
        openai: false,
      };
    }

    return config;
  },

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
