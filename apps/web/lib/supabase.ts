/**
 * Client Supabase pour l'app web
 *
 * Utilise les helpers du package @stock-screener/database
 * Gère gracefully l'absence de clés en dev
 */

import { createBrowserClient } from '@stock-screener/database';

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Get Supabase client (singleton)
 *
 * Retourne null si les clés ne sont pas configurées
 * (permet de dev sans Supabase au début)
 */
export function getSupabase() {
  // Si déjà initialisé, retourner
  if (supabaseClient !== null) {
    return supabaseClient;
  }

  // Vérifier que les variables d'environnement sont définies
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey || anonKey === 'your-anon-key-here') {
    console.warn(
      '⚠️  Supabase non configuré. Définissez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env'
    );
    return null;
  }

  try {
    supabaseClient = createBrowserClient();
    return supabaseClient;
  } catch (error) {
    console.error('❌ Erreur initialisation Supabase:', error);
    return null;
  }
}

/**
 * Check si Supabase est configuré et fonctionnel
 */
export function isSupabaseConfigured(): boolean {
  return getSupabase() !== null;
}
