# Stock Screener Web App

Application Next.js 15 pour l'analyse et le scoring d'actions boursières.

## Stack Technique

- **Framework** : Next.js 15 (App Router)
- **Language** : TypeScript strict
- **Styling** : TailwindCSS + shadcn/ui
- **API** : tRPC (type-safe)
- **State** : TanStack Query
- **Database** : Supabase PostgreSQL
- **Tests** : Vitest (unit) + Playwright (E2E)

## Développement

```bash
# Installer les dépendances (depuis la racine du monorepo)
pnpm install

# Démarrer en mode dev
pnpm dev

# Build production
pnpm build

# Lancer les tests unitaires
pnpm test:unit

# Lancer les tests E2E
pnpm test:e2e

# Vérifier types TypeScript
pnpm type-check

# Linter
pnpm lint
```

## Structure

```
apps/web/
├── app/                    # App Router (Next.js 15)
│   ├── layout.tsx          # Layout racine
│   ├── page.tsx            # Page d'accueil
│   ├── api/trpc/           # API routes tRPC
│   └── (dashboard)/        # Route groups
├── components/
│   └── ui/                 # Composants shadcn/ui
├── lib/
│   ├── trpc/               # Configuration tRPC
│   ├── supabase.ts         # Client Supabase
│   └── utils.ts            # Utilitaires
├── styles/
│   └── globals.css         # Styles globaux + Tailwind
└── tests/
    ├── e2e/                # Tests Playwright
    └── unit/               # Tests Vitest
```

## Variables d'Environnement

Créez un fichier `.env.local` (ou éditez `.env` à la racine) :

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-anon-key

# APIs (optionnel)
FMP_API_KEY=votre-fmp-key
POLYGON_API_KEY=votre-polygon-key
```

## tRPC Routers

- `stock` : Fetch données financières, résolution ticker
- `scoring` : Calcul score, profils scoring
- `watchlist` : CRUD watchlists
- `settings` : Paramètres utilisateur

## Prochaines Étapes

- **Étape 3** : Implémenter scraper (TDD)
- **Étape 4** : Implémenter scoring engine (TDD)
- **Étape 5** : UI Dashboard complet
- **Étape 6** : Tests E2E complets + qualité

## Ressources

- [Next.js Docs](https://nextjs.org/docs)
- [tRPC Docs](https://trpc.io/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [TailwindCSS](https://tailwindcss.com/)
