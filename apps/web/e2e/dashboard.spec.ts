import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Stock Screener Dashboard
 *
 * Tests the complete user flow:
 * 1. Search for a stock
 * 2. View score and verdict
 * 3. Analyze ratio breakdown
 * 4. Error handling
 */

test.describe('Stock Screener Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should display dashboard header and search', async ({ page }) => {
    // Check header
    await expect(page.getByRole('heading', { name: 'Stock Screener' })).toBeVisible();
    await expect(
      page.getByText('Analyse de valeur pour actions européennes')
    ).toBeVisible();

    // Check search input
    await expect(
      page.getByPlaceholder(/Rechercher une action/)
    ).toBeVisible();

    // Check quick action buttons
    await expect(page.getByRole('button', { name: 'CAP.PA' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'MC.PA' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'AIR.PA' })).toBeVisible();
  });

  test('should show empty state initially', async ({ page }) => {
    await expect(
      page.getByText('Sélectionnez une action pour voir le score')
    ).toBeVisible();
    await expect(
      page.getByText('Sélectionnez une action pour voir les ratios')
    ).toBeVisible();
  });

  test('should search for a stock using quick action button', async ({
    page,
  }) => {
    // Click on a quick action button
    await page.getByRole('button', { name: 'AAPL' }).click();

    // Should show loading state
    await expect(page.getByText(/Chargement des données/)).toBeVisible();

    // Wait for data to load (with timeout)
    await page.waitForSelector('text=/Score Global/', { timeout: 30000 });

    // Should display stock info
    await expect(page.getByText('AAPL')).toBeVisible();

    // Should display score gauge
    await expect(page.getByText('Score Global')).toBeVisible();

    // Should display ratios
    await expect(page.getByText('Ratios Financiers')).toBeVisible();
  });

  test('should search for a stock using search input', async ({ page }) => {
    // Type in search input
    await page.getByPlaceholder(/Rechercher une action/).fill('CAP.PA');

    // Click Analyser button
    await page.getByRole('button', { name: 'Analyser' }).click();

    // Should show loading state
    await expect(page.getByText(/Chargement des données/)).toBeVisible();

    // Wait for data to load
    await page.waitForSelector('text=/Score Global/', { timeout: 30000 });

    // Should display stock data
    await expect(page.getByText('CAP.PA')).toBeVisible();
  });

  test('should search using Enter key', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Rechercher une action/);

    await searchInput.fill('MC.PA');
    await searchInput.press('Enter');

    // Should show loading state
    await expect(page.getByText(/Chargement des données/)).toBeVisible();

    // Wait for data to load
    await page.waitForSelector('text=/Score Global/', { timeout: 30000 });
  });

  test('should display score with verdict', async ({ page }) => {
    // Search for a stock
    await page.getByRole('button', { name: 'AAPL' }).click();

    // Wait for score to load
    await page.waitForSelector('text=/Score Global/', { timeout: 30000 });

    // Should display score (0-100)
    const scoreElement = page.locator('text=/^[0-9]+$/').first();
    await expect(scoreElement).toBeVisible();

    // Should display verdict in French
    const verdicts = [
      'TROP CHER',
      'CHER',
      'CORRECT',
      'BONNE AFFAIRE',
      'EXCELLENTE AFFAIRE',
      'OPPORTUNITÉ EXCEPTIONNELLE',
    ];

    // One of the verdicts should be visible
    let verdictFound = false;
    for (const verdict of verdicts) {
      if (await page.getByText(verdict).isVisible()) {
        verdictFound = true;
        break;
      }
    }
    expect(verdictFound).toBe(true);
  });

  test('should display ratio breakdown with categories', async ({ page }) => {
    // Search for a stock
    await page.getByRole('button', { name: 'AAPL' }).click();

    // Wait for ratios to load
    await page.waitForSelector('text=/Ratios Financiers/', {
      timeout: 30000,
    });

    // Should display ratio categories
    const categories = [
      'Valorisation',
      'Profitabilité',
      'Dette',
      'Dividendes',
      'Croissance',
    ];

    for (const category of categories) {
      // At least some categories should be visible (not all stocks have all ratios)
      const categoryElement = page.getByText(category);
      if (await categoryElement.isVisible()) {
        await expect(categoryElement).toBeVisible();
      }
    }

    // Should display some ratio labels
    const ratioLabels = ['P/E Ratio', 'P/B Ratio', 'ROE', 'ROA'];
    let ratioFound = false;
    for (const label of ratioLabels) {
      if (await page.getByText(label).isVisible()) {
        ratioFound = true;
        break;
      }
    }
    expect(ratioFound).toBe(true);
  });

  test('should display stock information card', async ({ page }) => {
    // Search for a stock
    await page.getByRole('button', { name: 'AAPL' }).click();

    // Wait for stock info to load
    await page.waitForSelector('text=/Ticker/', { timeout: 30000 });

    // Should display ticker, name, price, source
    await expect(page.getByText('Ticker')).toBeVisible();
    await expect(page.getByText('Nom')).toBeVisible();
    await expect(page.getByText('Prix')).toBeVisible();
    await expect(page.getByText('Source')).toBeVisible();
  });

  test('should handle search with invalid ticker gracefully', async ({
    page,
  }) => {
    // Search for invalid ticker
    await page.getByPlaceholder(/Rechercher une action/).fill('INVALID123');
    await page.getByRole('button', { name: 'Analyser' }).click();

    // Should show loading state
    await expect(page.getByText(/Chargement des données/)).toBeVisible();

    // Should eventually show error message
    await expect(page.getByText(/Erreur lors du chargement/)).toBeVisible({
      timeout: 30000,
    });
  });

  test('should disable search button when input is empty', async ({ page }) => {
    const searchButton = page.getByRole('button', { name: 'Analyser' });

    // Button should be disabled initially
    await expect(searchButton).toBeDisabled();

    // Type something
    await page.getByPlaceholder(/Rechercher une action/).fill('AAPL');

    // Button should be enabled
    await expect(searchButton).toBeEnabled();

    // Clear input
    await page.getByPlaceholder(/Rechercher une action/).clear();

    // Button should be disabled again
    await expect(searchButton).toBeDisabled();
  });

  test('should search multiple stocks sequentially', async ({ page }) => {
    // Search first stock
    await page.getByRole('button', { name: 'AAPL' }).click();
    await page.waitForSelector('text=/AAPL/', { timeout: 30000 });

    // Search second stock
    await page.getByRole('button', { name: 'CAP.PA' }).click();
    await page.waitForSelector('text=/CAP.PA/', { timeout: 30000 });

    // Should show new stock data
    await expect(page.getByText('CAP.PA')).toBeVisible();
  });
});
