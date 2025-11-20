import { defineWorkspace } from 'vitest/config';

/**
 * Configuration Vitest Workspace pour monorepo Turborepo
 * Permet de lancer tous les tests du monorepo avec une seule commande
 */
export default defineWorkspace([
  // App web
  {
    test: {
      name: 'web',
      root: './apps/web',
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'tests/',
          '**/*.config.{ts,js}',
          '**/*.d.ts',
        ],
      },
    },
  },

  // Package database
  {
    test: {
      name: 'database',
      root: './packages/database',
      environment: 'node',
    },
  },

  // Package scraper
  {
    test: {
      name: 'scraper',
      root: './packages/scraper',
      environment: 'node',
      testTimeout: 30000, // Scraping peut être lent
    },
  },

  // Package scoring
  {
    test: {
      name: 'scoring',
      root: './packages/scoring',
      environment: 'node',
    },
  },

  // Package UI
  {
    test: {
      name: 'ui',
      root: './packages/ui',
      environment: 'jsdom',
    },
  },
]);
