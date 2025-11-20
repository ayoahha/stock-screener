# 📊 Stock Screener - Aide à la Décision Boursière

> Application web **100% locale** d'analyse et de scoring d'actions avec **scraping ultra-robuste** des marchés européens (France, Allemagne, etc.) et américains.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TDD](https://img.shields.io/badge/TDD-Vitest-yellow)](https://vitest.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)

---

## 🎯 **Objectif**

Aider un investisseur privé à **prendre des décisions éclairées** sur les actions en :

1. **Résolvant automatiquement** les tickers (ex: "LVMH" → `MC.PA`)
2. **Scrapant robustement** les données financières (focus actions européennes mal couvertes par APIs gratuites)
3. **Calculant un score** clair et immédiat selon 3 styles : **Value / Growth / Dividend**
4. **Affichant le verdict** : `TROP CHER` → `CHER` → `CORRECT` → `BONNE AFFAIRE` → `EXCELLENTE AFFAIRE` → `OPPORTUNITÉ EXCEPTIONNELLE`

---

## ✨ **Fonctionnalités**

- ✅ **Recherche multi-ticker** : entrez plusieurs tickers (ex: `AAPL, CAP.PA, AIR.PA, BMW.DE`)
- ✅ **Résolution automatique** : "Airbus" → `AIR.PA`, "Total" → `TTE.PA`
- ✅ **Scraping ultra-robuste** : Yahoo Finance Europe (avec fallback FMP/Polygon)
- ✅ **3 profils de scoring** : Value, Growth, Dividend (100% personnalisables)
- ✅ **Dashboard grand écran** : optimisé pour 34" (mais responsive)
- ✅ **Watchlists** : sauvegardez vos listes de surveillance
- ✅ **Cache intelligent** : évite le spam des sources de données
- ✅ **TDD strict** : tests unitaires + E2E Playwright
- ✅ **Qualité code** : Semgrep + ESLint + Prettier + TypeScript strict

---

## 🏗️ **Architecture**

### Stack Technique

```
┌─────────────────────────────────────────────────────────────┐
│                     Monorepo Turborepo                       │
├─────────────────────────────────────────────────────────────┤
│  Frontend: Next.js 15 (App Router) + shadcn/ui + TailwindCSS│
│  Backend: tRPC API + Next.js API Routes                     │
│  Database: Supabase PostgreSQL (100% local-friendly)        │
│  Scraping: Playwright + httpx + Cheerio (fallback APIs)     │
│  Tests: Vitest + React Testing Library + Playwright         │
│  Qualité: Semgrep + ESLint + Prettier + TypeScript strict   │
└─────────────────────────────────────────────────────────────┘
```

### Structure Monorepo

```
stock-screener/
├── apps/
│   └── web/                          # Next.js 15 App (frontend + API)
│
├── packages/
│   ├── database/                     # Supabase client + types générés
│   ├── scraper/                      # Moteur de scraping ultra-robuste
│   ├── scoring/                      # Algorithme de scoring modulaire
│   ├── ui/                           # shadcn/ui components partagés
│   ├── typescript-config/            # Configs TypeScript partagées
│   └── eslint-config/                # ESLint config partagée
│
├── scripts/
│   ├── setup.sh                      # Setup automatisé 1-clic
│   └── check-quality.sh              # Vérification qualité/sécurité
│
├── package.json                      # Root workspace
├── turbo.json                        # Turborepo config
└── pnpm-workspace.yaml               # Workspaces PNPM
```

---

## 🚀 **Installation Rapide (< 5 minutes)**

### Prérequis

- **Node.js 20+** ([Télécharger](https://nodejs.org/))
- **pnpm 8+** (installé automatiquement par le script si absent)
- **Compte Supabase** gratuit ([S'inscrire](https://supabase.com/))

### Setup en 3 Commandes

```bash
# 1. Cloner le repo
git clone <votre-repo-url>
cd stock-screener

# 2. Lancer le script de setup automatisé
pnpm setup
# (ou : bash scripts/setup.sh)

# 3. Démarrer l'app en mode dev
pnpm dev
```

**L'app sera accessible sur [http://localhost:3000](http://localhost:3000)** 🎉

---

## ⚙️ **Configuration**

### 1. Variables d'Environnement

Le script `setup.sh` crée automatiquement un fichier `.env` depuis `.env.example`.

**Éditez `.env` et configurez :**

```bash
# === OBLIGATOIRE ===
# URL de votre projet Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ofudbmnwpaelgvoufbln.supabase.co

# Clé anonyme Supabase (publique, utilisable côté client)
# → Supabase Dashboard > Settings > API > anon/public key
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...votre-anon-key

# === OPTIONNEL (v1 sans auth) ===
# Clé service role (privée, côté serveur uniquement)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...votre-service-role-key

# === OPTIONNEL (APIs fallback si scraping échoue) ===
# Financial Modeling Prep (250 calls/jour gratuit)
FMP_API_KEY=your-fmp-key

# Polygon.io (5 calls/minute gratuit)
POLYGON_API_KEY=your-polygon-key
```

### 2. Migration Base de Données

Le schéma SQL complet est dans `packages/database/src/migrations/001_initial_schema.sql`.

**Deux options :**

#### Option A : Via Supabase Dashboard (recommandé)

1. Ouvrez [Supabase Dashboard](https://app.supabase.com/) → votre projet
2. Allez dans **SQL Editor**
3. Créez une nouvelle requête
4. Copiez-collez le contenu de `packages/database/src/migrations/001_initial_schema.sql`
5. Cliquez sur **Run**

#### Option B : Via Supabase CLI

```bash
# Connectez-vous à Supabase
npx supabase login

# Liez votre projet
npx supabase link --project-ref ofudbmnwpaelgvoufbln

# Appliquez la migration
npx supabase db push
```

### 3. Génération des Types TypeScript

Une fois la migration exécutée, générez les types TypeScript :

```bash
pnpm db:generate-types
```

Cela crée automatiquement `packages/database/src/types.ts` synchronisé avec votre schéma Supabase.

---

## 🧪 **Tests (TDD Strict)**

### Tests Unitaires

```bash
# Tous les tests unitaires
pnpm test:unit

# Mode watch (recommandé pendant dev)
pnpm test:unit --watch

# Avec coverage
pnpm test:unit --coverage
```

### Tests E2E (Playwright)

```bash
# Tous les tests E2E
pnpm test:e2e

# Mode UI (debug visuel)
pnpm test:e2e --ui

# Mode headed (voir le navigateur)
pnpm test:e2e --headed
```

### Vérification Qualité Complète

```bash
# Lance : TypeScript + ESLint + Prettier + Tests + Semgrep
pnpm quality:check
```

---

## 🔧 **Commandes Utiles**

| Commande                | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `pnpm dev`              | Démarre l'app en mode dev (http://localhost:3000) |
| `pnpm build`            | Build production                                 |
| `pnpm test`             | Tous les tests (unit + e2e)                     |
| `pnpm test:unit`        | Tests unitaires uniquement                       |
| `pnpm test:e2e`         | Tests E2E uniquement                             |
| `pnpm lint`             | ESLint sur tout le code                          |
| `pnpm format`           | Prettier (auto-format)                           |
| `pnpm type-check`       | TypeScript type checking                         |
| `pnpm db:generate-types`| Génère les types Supabase                        |
| `pnpm quality:check`    | Vérification qualité complète                    |
| `pnpm clean`            | Nettoyage (node_modules, .turbo, etc.)           |

---

## 📐 **Méthodologie TDD**

Ce projet suit **strictement** le Test-Driven Development :

### Cycle TDD

1. **RED** : Écrivez un test qui échoue
2. **GREEN** : Écrivez le code minimal qui fait passer le test
3. **REFACTOR** : Refactorisez en gardant les tests verts
4. **QUALITY** : Lancez `pnpm quality:check` (Semgrep + linting)

### Exemple de Workflow

```bash
# 1. Créez un test qui échoue
# packages/scraper/tests/yahoo-finance.test.ts

# 2. Lancez le test (doit échouer)
pnpm test:unit yahoo-finance --watch

# 3. Écrivez le code minimal
# packages/scraper/src/providers/yahoo-finance.ts

# 4. Vérifiez que le test passe
# (watch mode se relance automatiquement)

# 5. Refactorisez si nécessaire

# 6. Vérification qualité complète
pnpm quality:check
```

---

## 🎨 **UI/UX Design**

### Optimisé pour Grand Écran (34")

- **Jauge géante** : Score visuel immédiat (couleur + pourcentage)
- **Tableaux larges** : Affichage multi-colonnes des ratios
- **Graphiques** : Évolution historique des ratios (optionnel v2)
- **Dark mode par défaut** : Meilleur pour les yeux sur grand écran

### Palette de Couleurs (Score)

| Score                   | Couleur       | Hex       |
| ----------------------- | ------------- | --------- |
| 🔴 TROP CHER            | Rouge foncé   | `#DC2626` |
| 🟠 CHER                 | Orange        | `#F97316` |
| 🟡 CORRECT              | Jaune         | `#FACC15` |
| 🟢 BONNE AFFAIRE        | Vert clair    | `#22C55E` |
| 🟢 EXCELLENTE AFFAIRE   | Vert vif      | `#10B981` |
| 🟢 OPPORTUNITÉ EXCEPT.  | Vert foncé    | `#059669` |

---

## 🧩 **Architecture des Packages**

### `@stock-screener/database`

Client Supabase + types générés + migrations.

**Usage :**

```typescript
import { supabase, createServerClient } from '@stock-screener/database';

// Côté client (browser)
const { data } = await supabase.from('watchlists').select('*');

// Côté serveur (API routes, server components)
const serverClient = createServerClient();
const { data } = await serverClient.from('stock_cache').select('*');
```

### `@stock-screener/scraper`

Moteur de scraping ultra-robuste avec fallback multi-sources.

**Architecture :**

```
scraper/
├── providers/
│   ├── yahoo-finance.ts      # Scraping Yahoo Finance (priorité 1)
│   ├── fmp.ts                # Financial Modeling Prep API
│   ├── polygon.ts            # Polygon.io API
│   └── fallback.ts           # Orchestrateur fallback intelligent
├── resolver/
│   └── ticker-resolver.ts    # Résolution nom → ticker
├── cache/
│   └── cache-manager.ts      # Gestion cache local
└── index.ts
```

**Usage :**

```typescript
import { fetchStockData } from '@stock-screener/scraper';

const data = await fetchStockData('CAP.PA');
// {
//   ticker: 'CAP.PA',
//   name: 'Capgemini SE',
//   price: 180.50,
//   ratios: { PE: 18.2, PB: 3.1, ... },
//   source: 'yahoo' | 'fmp' | 'polygon'
// }
```

### `@stock-screener/scoring`

Algorithme de scoring modulaire avec profils personnalisables.

**Usage :**

```typescript
import { calculateScore, ScoringProfile } from '@stock-screener/scoring';

const profile: ScoringProfile = 'value'; // 'value' | 'growth' | 'dividend'
const ratios = { PE: 12, PB: 1.5, ROE: 18, ... };

const result = calculateScore(ratios, profile);
// {
//   score: 75,          // 0-100
//   verdict: 'EXCELLENTE AFFAIRE',
//   breakdown: {
//     PE: { score: 90, weight: 0.25 },
//     PB: { score: 85, weight: 0.25 },
//     ...
//   }
// }
```

---

## 🔒 **Sécurité**

### Analyse Automatique (Semgrep)

```bash
# Vérification complète
pnpm quality:check

# Ou uniquement Semgrep
semgrep --config=auto --error .
```

### Best Practices

- ✅ **Clés API** : Jamais côté client (seulement dans API routes)
- ✅ **SUPABASE_SERVICE_ROLE_KEY** : Strictement côté serveur
- ✅ **Validation** : Zod pour toutes les entrées utilisateur
- ✅ **Sanitization** : Aucune exécution de code utilisateur
- ✅ **CORS** : Configuré uniquement pour localhost en dev

---

## 🐛 **Debugging**

### Scraping Yahoo Finance

Si le scraping échoue pour une action européenne :

1. **Vérifiez le ticker** : `CAP.PA` (pas `CAP`)
2. **Testez manuellement** : https://finance.yahoo.com/quote/CAP.PA
3. **Activez le mode headed** : `PLAYWRIGHT_HEADLESS=false` dans `.env`
4. **Logs détaillés** : Vérifiez `console.log` dans `packages/scraper/src/providers/yahoo-finance.ts`

### Génération Types Supabase

Si `pnpm db:generate-types` échoue :

```bash
# Connectez-vous manuellement
npx supabase login

# Vérifiez le project ID
echo $NEXT_PUBLIC_SUPABASE_URL
# Doit afficher : https://ofudbmnwpaelgvoufbln.supabase.co

# Relancez la génération
pnpm db:generate-types
```

---

## 📚 **Ressources**

### Documentation

- [Next.js 15](https://nextjs.org/docs)
- [Supabase](https://supabase.com/docs)
- [tRPC](https://trpc.io/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)
- [Turborepo](https://turbo.build/repo/docs)

### APIs Financières

- [Yahoo Finance](https://finance.yahoo.com/) (scraping)
- [Financial Modeling Prep](https://site.financialmodelingprep.com/) (API gratuite 250/jour)
- [Polygon.io](https://polygon.io/) (API gratuite 5/min)

---

## 🤝 **Contribution**

Ce projet est en développement actif. Toute contribution est bienvenue !

### Workflow

1. Créez une branche : `git checkout -b feature/ma-fonctionnalite`
2. Écrivez les tests AVANT le code (TDD strict)
3. Vérifiez la qualité : `pnpm quality:check`
4. Committez : `git commit -m "feat: ma fonctionnalité"`
5. Pushez : `git push origin feature/ma-fonctionnalite`
6. Ouvrez une Pull Request

---

## 📝 **Roadmap**

### v1.0 (MVP - En cours)

- [x] Setup monorepo Turborepo
- [x] Configuration Supabase + types générés
- [x] Schéma SQL (watchlists, scoring profiles, cache)
- [ ] Scraping Yahoo Finance robuste (actions EU)
- [ ] Moteur de scoring modulaire
- [ ] UI Dashboard grand écran
- [ ] Tests TDD complets
- [ ] README ultra-détaillé

### v2.0 (Améliorations)

- [ ] Auth Supabase (multi-utilisateurs)
- [ ] Graphiques historiques (TradingView / Recharts)
- [ ] Alertes par email (quand score passe en "BONNE AFFAIRE")
- [ ] Export PDF/Excel des analyses
- [ ] Comparaison multi-actions
- [ ] Backtesting (simuler stratégies passées)

### v3.0 (Avancé)

- [ ] Intelligence Artificielle (prédiction tendances)
- [ ] Analyse fondamentale approfondie (news, earnings calls)
- [ ] Mobile app (React Native / Expo)
- [ ] API publique (endpoints tRPC exposés)

---

## 📄 **Licence**

MIT © Stock Screener Team

---

## 💬 **Support**

- **Issues** : [GitHub Issues](https://github.com/votre-repo/issues)
- **Discussions** : [GitHub Discussions](https://github.com/votre-repo/discussions)

---

**Développé avec ❤️ et TDD strict par l'équipe Stock Screener**

*100% Local • 100% Open Source • 100% Testé*
