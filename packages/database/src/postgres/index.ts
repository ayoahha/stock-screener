/**
 * PostgreSQL Module
 *
 * Direct PostgreSQL connection for local/Docker deployments.
 * Provides a Supabase-compatible API.
 */

export { createPostgresClient, type PostgresClient } from './client';
export { getPool, closePool, testConnection } from './pool';
export { QueryBuilder, type PostgresError, type QueryResponse } from './query-builder';
