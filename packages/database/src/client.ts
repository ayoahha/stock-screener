import { createClient } from '@supabase/supabase-js';
import type { Database } from './types-manual';

/**
 * Crée un client Supabase côté serveur avec la service role key (accès admin)
 * ⚠️ À utiliser UNIQUEMENT côté serveur (API routes, server components)
 */
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('[Database] createServerClient called');
  console.log('[Database] NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? `✅ ${supabaseUrl.substring(0, 30)}...` : '❌ MISSING');
  console.log('[Database] SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? `✅ Set (${supabaseServiceKey.substring(0, 20)}...)` : '❌ MISSING');

  if (!supabaseUrl) {
    const error = new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
    console.error('[Database] Error:', error.message);
    throw error;
  }

  if (!supabaseServiceKey) {
    const error = new Error(
      'Missing env.SUPABASE_SERVICE_ROLE_KEY (optional in v1, required for admin operations)'
    );
    console.error('[Database] Error:', error.message);
    throw error;
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
 * Crée un client Supabase côté client avec la clé anonyme
 * ✅ Sûr pour une utilisation côté client (browser)
 */
export function createBrowserClient() {
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
 * Client Supabase singleton (lazy-initialized)
 * Utilisé pour les opérations publiques sans auth
 * ⚠️ Initialisé uniquement au runtime, pas au build time
 */
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient();
  }
  return supabaseInstance;
}
