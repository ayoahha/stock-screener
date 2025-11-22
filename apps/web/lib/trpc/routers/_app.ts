/**
 * Router tRPC principal
 *
 * Agrège tous les sous-routers :
 * - stock : fetch, resolve ticker
 * - scoring : calculate, profiles
 * - watchlist : CRUD watchlists
 * - settings : user settings
 * - history : CRUD stock history
 * - analysis : AI qualitative analysis (NEW)
 */

import { router } from '../server';
import { stockRouter } from './stock';
import { scoringRouter } from './scoring';
import { watchlistRouter } from './watchlist';
import { settingsRouter } from './settings';
import { historyRouter } from './history';
import { analysisRouter } from './analysis';

export const appRouter = router({
  stock: stockRouter,
  scoring: scoringRouter,
  watchlist: watchlistRouter,
  settings: settingsRouter,
  history: historyRouter,
  analysis: analysisRouter,
});

// Export du type pour utilisation côté client
export type AppRouter = typeof appRouter;
