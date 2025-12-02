/**
 * PostgreSQL Client
 *
 * Provides a Supabase-compatible API for PostgreSQL.
 * This allows existing code using Supabase client to work with direct PostgreSQL.
 */

import { getPool } from './pool';
import { QueryBuilder } from './query-builder';
import type { Database } from '../types-manual';

type TableName = keyof Database['public']['Tables'];
type ViewName = keyof Database['public']['Views'];

/**
 * PostgreSQL client with Supabase-like API
 */
export interface PostgresClient {
  from<T extends TableName>(
    table: T
  ): QueryBuilder<Database['public']['Tables'][T]['Row']>;
  from<T extends ViewName>(
    view: T
  ): QueryBuilder<Database['public']['Views'][T]['Row']>;
  from(relation: string): QueryBuilder;
}

/**
 * Create a PostgreSQL client with Supabase-like API
 */
export function createPostgresClient(): PostgresClient {
  const pool = getPool();

  return {
    from(relation: string): QueryBuilder {
      return new QueryBuilder(pool, relation);
    },
  };
}
