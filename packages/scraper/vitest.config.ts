import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['tests/**', '**/*.d.ts', '**/*.config.*', '**/dist/**'],
    },
    testTimeout: 30000, // 30s pour les tests de scraping
  },
});
