/**
 * @stock-screener/database
 *
 * Package central pour toutes les opérations base de données avec Supabase
 */

export { createServerClient, createBrowserClient, getSupabaseClient } from './client';
export type { Database, Json } from './types-manual';
