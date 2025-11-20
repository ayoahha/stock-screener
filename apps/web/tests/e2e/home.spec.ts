import { test, expect } from '@playwright/test';

/**
 * Tests E2E - Page d'accueil
 */

test.describe('Page d\'accueil', () => {
  test('devrait afficher le titre', async ({ page }) => {
    await page.goto('/');

    // Vérifier que le titre est présent
    await expect(page.getByText('Stock Screener')).toBeVisible();
  });

  test('devrait afficher l\'info construction', async ({ page }) => {
    await page.goto('/');

    // Vérifier que le message "En Construction" est visible
    await expect(page.getByText('En Construction')).toBeVisible();
  });

  test('devrait avoir les stats techniques', async ({ page }) => {
    await page.goto('/');

    // Vérifier que les 3 stats sont affichées
    await expect(page.getByText('Next.js 15')).toBeVisible();
    await expect(page.getByText('tRPC')).toBeVisible();
    await expect(page.getByText('Supabase')).toBeVisible();
  });
});
