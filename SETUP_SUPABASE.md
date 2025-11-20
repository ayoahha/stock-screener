# 🔧 Configuration Supabase (5 minutes)

## ✅ Clés Configurées !

Vos clés Supabase sont maintenant dans `.env` :

```bash
✅ NEXT_PUBLIC_SUPABASE_URL=https://ofudbmnwpaelgvoufbln.supabase.co
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (configurée)
```

---

## 📋 **Prochaines Étapes**

### **Étape 1 : Exécuter la Migration SQL** (2 minutes)

La migration SQL crée toutes les tables nécessaires.

#### **Option A : Via Supabase Dashboard (Recommandé)**

1. **Ouvrez Supabase SQL Editor** :
   👉 https://app.supabase.com/project/ofudbmnwpaelgvoufbln/sql/new

2. **Copiez le contenu de la migration** :
   - Fichier : `packages/database/src/migrations/001_initial_schema.sql`
   - Ou cliquez ici pour le voir : [001_initial_schema.sql](./packages/database/src/migrations/001_initial_schema.sql)

3. **Collez dans l'éditeur SQL** et cliquez sur **"Run"** (en bas à droite)

4. **Vérifiez le résultat** :
   ```
   ✅ CREATE TABLE user_settings
   ✅ CREATE TABLE watchlists
   ✅ CREATE TABLE custom_scoring_profiles
   ✅ CREATE TABLE stock_cache
   ✅ INSERT INTO custom_scoring_profiles (3 profils)
   ✅ INSERT INTO user_settings (1 user par défaut)
   ```

#### **Option B : Via Supabase CLI** (Si vous l'avez installé)

```bash
# 1. Installer Supabase CLI (si pas encore fait)
brew install supabase/tap/supabase  # macOS
# ou
npm install -g supabase              # npm

# 2. Se connecter
npx supabase login

# 3. Lier le projet
npx supabase link --project-ref ofudbmnwpaelgvoufbln

# 4. Appliquer la migration
npx supabase db push
```

---

### **Étape 2 : Tester la Connexion** (30 secondes)

Une fois la migration exécutée, testez que tout fonctionne :

```bash
# Dans le répertoire racine du projet
pnpm db:test
```

**Résultat attendu :**

```
🔍 Test connexion Supabase...

1️⃣  Test connexion basique...
   ✅ Connexion OK

2️⃣  Test table user_settings...
   ✅ Table OK (1 row(s))

3️⃣  Test table custom_scoring_profiles...
   ✅ Table OK (3 profil(s))
      - Value (Default)
      - Growth (Default)
      - Dividend (Default)

4️⃣  Test table watchlists...
   ✅ Table OK

5️⃣  Test table stock_cache...
   ✅ Table OK

═══════════════════════════════════════════════════════════════════════════
✅ SUPABASE CONFIGURÉ ET FONCTIONNEL !
═══════════════════════════════════════════════════════════════════════════
```

---

### **Étape 3 : Générer les Types TypeScript** (30 secondes)

Une fois les tables créées, générez les types TypeScript :

```bash
pnpm db:generate-types
```

**Résultat attendu :**

```
🔄 Génération des types TypeScript depuis Supabase...
   Project ID: ofudbmnwpaelgvoufbln
   Output: /packages/database/src/types.ts

✅ Types générés avec succès !
   Fichier: packages/database/src/types.ts

💡 Les types sont maintenant synchronisés avec votre schéma Supabase.
   Relancez cette commande après chaque modification du schéma.
```

---

## 🚀 **Démarrer l'Application**

Tout est prêt ! Démarrez l'app :

```bash
pnpm install  # Si pas encore fait
pnpm dev
```

Ouvrez http://localhost:3000

**Vous devriez voir :**

```
📊 Stock Screener

Application d'aide à la décision boursière
Scraping robuste • Scoring modulaire • 100% Local

┌──────────────────────────────────────┐
│  🔌 Test tRPC Connection             │
│  ✅ tRPC fonctionne !                │
│  Profil par défaut : value           │
│  Thème : dark                        │
└──────────────────────────────────────┘

Stats :
[✅ Next.js 15]  [✅ tRPC]  [✅ Supabase]
```

Le 3ème checkmark (Supabase) devrait maintenant être vert ! ✅

---

## 🐛 **Troubleshooting**

### ❌ Erreur "relation does not exist"

**Problème** : Les tables n'existent pas encore.

**Solution** : Exécutez la migration SQL (Étape 1).

---

### ❌ Erreur "Invalid API key"

**Problème** : La clé `NEXT_PUBLIC_SUPABASE_ANON_KEY` est incorrecte.

**Solution** :

1. Vérifiez votre clé dans Supabase Dashboard > Settings > API
2. Comparez avec `.env`
3. Redémarrez l'app : `pnpm dev`

---

### ❌ Erreur "Failed to generate types"

**Problème** : Supabase CLI pas connecté ou mauvais project ID.

**Solution** :

```bash
# Se connecter manuellement
npx supabase login

# Vérifier le project ID
echo $NEXT_PUBLIC_SUPABASE_URL
# Doit afficher : https://ofudbmnwpaelgvoufbln.supabase.co

# Relancer
pnpm db:generate-types
```

---

### ❌ `pnpm db:test` échoue

**Problème** : Dépendances pas installées.

**Solution** :

```bash
pnpm install
pnpm db:test
```

---

## 📊 **Vérifier les Données dans Supabase**

Ouvrez le Table Editor pour voir vos données :

👉 https://app.supabase.com/project/ofudbmnwpaelgvoufbln/editor

**Tables à vérifier :**

- **user_settings** : 1 row (user par défaut)
- **custom_scoring_profiles** : 3 rows (Value, Growth, Dividend)
- **watchlists** : 0 row (vide pour l'instant)
- **stock_cache** : 0 row (sera rempli par le scraper)

---

## ✅ **Checklist Finale**

Avant de passer à l'étape 3 (Scraping), vérifiez :

- [ ] Migration SQL exécutée (4 tables créées)
- [ ] `pnpm db:test` passe ✅
- [ ] Types générés : `packages/database/src/types.ts` existe
- [ ] `pnpm dev` démarre sans erreur
- [ ] http://localhost:3000 affiche "✅ Supabase" (au lieu de "⏳")

---

## 🎯 **Vous êtes prêt pour l'Étape 3 !**

Une fois tous les checks ✅, vous pouvez passer à l'**Étape 3 : Scraping Robuste (TDD)** ! 🚀

Dites "**GO ÉTAPE 3**" et on commence le scraping Yahoo Finance avec TDD strict !
