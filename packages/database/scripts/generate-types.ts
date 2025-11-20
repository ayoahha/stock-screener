#!/usr/bin/env tsx

/**
 * Script de génération automatique des types TypeScript depuis Supabase
 *
 * Usage :
 *   pnpm db:generate-types
 *
 * Prérequis :
 *   - NEXT_PUBLIC_SUPABASE_URL configuré dans .env
 *   - Supabase CLI installé (installé automatiquement via package.json)
 *   - Accès au projet Supabase
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

// Charger les variables d'environnement depuis la racine du monorepo
const rootEnvPath = resolve(__dirname, '../../../.env');
if (existsSync(rootEnvPath)) {
  config({ path: rootEnvPath });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!supabaseUrl) {
  console.error('❌ Erreur: NEXT_PUBLIC_SUPABASE_URL manquant dans .env');
  console.error('');
  console.error('Créez un fichier .env à la racine avec :');
  console.error('NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  process.exit(1);
}

// Extraire le project ID depuis l'URL
const projectIdMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
if (!projectIdMatch) {
  console.error('❌ Erreur: Format d\'URL Supabase invalide');
  console.error(`URL reçue: ${supabaseUrl}`);
  console.error('Format attendu: https://xxxxx.supabase.co');
  process.exit(1);
}

const projectId = projectIdMatch[1];
const outputPath = resolve(__dirname, '../src/types.ts');

console.log('🔄 Génération des types TypeScript depuis Supabase...');
console.log(`   Project ID: ${projectId}`);
console.log(`   Output: ${outputPath}`);
console.log('');

try {
  // Générer les types avec Supabase CLI
  execSync(
    `npx supabase gen types typescript --project-id ${projectId} > ${outputPath}`,
    {
      stdio: 'inherit',
      cwd: resolve(__dirname, '..'),
    }
  );

  console.log('');
  console.log('✅ Types générés avec succès !');
  console.log(`   Fichier: ${outputPath}`);
  console.log('');
  console.log('💡 Les types sont maintenant synchronisés avec votre schéma Supabase.');
  console.log('   Relancez cette commande après chaque modification du schéma.');
} catch (error) {
  console.error('');
  console.error('❌ Erreur lors de la génération des types');
  console.error('');
  console.error('Vérifiez que :');
  console.error('  1. Vous avez accès au projet Supabase');
  console.error('  2. Le project ID est correct');
  console.error('  3. Supabase CLI est installé (normalement auto-installé)');
  console.error('');
  console.error('Pour vous connecter manuellement :');
  console.error('  npx supabase login');
  console.error('');
  process.exit(1);
}
