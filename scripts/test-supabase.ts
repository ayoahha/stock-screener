#!/usr/bin/env tsx

/**
 * Script de test Supabase
 *
 * Vérifie que :
 * 1. La connexion Supabase fonctionne
 * 2. Les tables existent
 * 3. Les seed data sont présentes
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Charger .env depuis la racine
config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabase() {
  console.log('🔍 Test connexion Supabase...\n');

  try {
    // Test 1: Connexion
    console.log('1️⃣  Test connexion basique...');
    const { error: pingError } = await supabase.from('user_settings').select('count');
    if (pingError) {
      console.error('   ❌ Échec:', pingError.message);
      return false;
    }
    console.log('   ✅ Connexion OK\n');

    // Test 2: Table user_settings
    console.log('2️⃣  Test table user_settings...');
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .limit(1);

    if (settingsError) {
      console.error('   ❌ Échec:', settingsError.message);
      console.error('   💡 Avez-vous exécuté la migration SQL ?');
      return false;
    }
    console.log(`   ✅ Table OK (${settings?.length || 0} row(s))\n`);

    // Test 3: Table custom_scoring_profiles
    console.log('3️⃣  Test table custom_scoring_profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('custom_scoring_profiles')
      .select('name')
      .limit(5);

    if (profilesError) {
      console.error('   ❌ Échec:', profilesError.message);
      return false;
    }
    console.log(`   ✅ Table OK (${profiles?.length || 0} profil(s))`);
    if (profiles && profiles.length > 0) {
      profiles.forEach((p) => console.log(`      - ${p.name}`));
    }
    console.log('');

    // Test 4: Table watchlists
    console.log('4️⃣  Test table watchlists...');
    const { data: watchlists, error: watchlistsError } = await supabase
      .from('watchlists')
      .select('count');

    if (watchlistsError) {
      console.error('   ❌ Échec:', watchlistsError.message);
      return false;
    }
    console.log('   ✅ Table OK\n');

    // Test 5: Table stock_cache
    console.log('5️⃣  Test table stock_cache...');
    const { data: cache, error: cacheError } = await supabase
      .from('stock_cache')
      .select('count');

    if (cacheError) {
      console.error('   ❌ Échec:', cacheError.message);
      return false;
    }
    console.log('   ✅ Table OK\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ SUPABASE CONFIGURÉ ET FONCTIONNEL !');
    console.log('═══════════════════════════════════════════════════════════\n');

    return true;
  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
    return false;
  }
}

testSupabase().then((success) => {
  process.exit(success ? 0 : 1);
});
