/**
 * Database Client Factory
 *
 * Supports two backends:
 * 1. Supabase (cloud) - when NEXT_PUBLIC_SUPABASE_URL is set
 * 2. PostgreSQL (local/Docker) - when DATABASE_URL or POSTGRES_* vars are set
 *
 * The client provides a unified API regardless of the backend.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types-manual';
import { createPostgresClient } from './postgres';

/**
 * Generic database client interface
 * Works with both Supabase and PostgreSQL backends
 */
export interface DatabaseClient {
  from(relation: string): any;
}

/**
 * Detect which backend to use based on environment variables
 */
function getBackendType(): 'supabase' | 'postgres' {
  // Check for PostgreSQL first (local/Docker takes priority)
  if (process.env.DATABASE_URL || process.env.POSTGRES_HOST) {
    console.log('[Database] Using PostgreSQL backend');
    return 'postgres';
  }

  // Check for Supabase
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.log('[Database] Using Supabase backend');
    return 'supabase';
  }

  // Default to PostgreSQL for local development
  console.log('[Database] No explicit backend configured, defaulting to PostgreSQL');
  return 'postgres';
}

/**
 * Creates a database client for server-side operations
 *
 * For Supabase: Uses service role key for admin access
 * For PostgreSQL: Uses direct connection via DATABASE_URL
 *
 * Returns a client with a `from()` method compatible with both backends.
 * The underlying implementation differs but the API is the same.
 */
export function createServerClient(): DatabaseClient {
  const backend = getBackendType();

  if (backend === 'postgres') {
    console.log('[Database] Creating PostgreSQL server client');
    return createPostgresClient();
  }

  // Supabase backend
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('[Database] createServerClient called (Supabase)');
  console.log('[Database] NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING');
  console.log('[Database] SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? `Set (${supabaseServiceKey.substring(0, 20)}...)` : 'MISSING');

  if (!supabaseUrl) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!supabaseServiceKey) {
    throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY');
  }

  console.log('[Database] Creating Supabase client...');
  const client = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  console.log('[Database] Supabase client created successfully');

  return client;
}

/**
 * Creates a browser-safe database client
 *
 * For Supabase: Uses anon key with auth
 * For PostgreSQL: Not supported (server-side only)
 */
export function createBrowserClient(): ReturnType<typeof createClient<Database>> {
  const backend = getBackendType();

  if (backend === 'postgres') {
    throw new Error(
      'PostgreSQL backend does not support browser clients. ' +
      'Use server-side API routes instead.'
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing env.NEXT_PUBLIC_SUPABASE_URL or env.NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

/**
 * Singleton Supabase client for public operations
 * Only works with Supabase backend
 */
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient();
  }
  return supabaseInstance;
}
