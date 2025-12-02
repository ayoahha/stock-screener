/**
 * @stock-screener/database
 *
 * Central package for all database operations.
 * Supports both Supabase (cloud) and PostgreSQL (local/Docker) backends.
 */

// Main client exports
export { createServerClient, createBrowserClient, getSupabaseClient } from './client';

// Types
export type { Database, Json } from './types-manual';

// PostgreSQL-specific exports (for direct access if needed)
export {
  createPostgresClient,
  getPool,
  closePool,
  testConnection,
  type PostgresClient,
  type PostgresError,
  type QueryResponse,
} from './postgres';
