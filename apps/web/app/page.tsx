'use client';

import { trpc } from '@/lib/trpc/client';

export default function HomePage() {
  // Test tRPC : récupération des settings
  const { data: settings, isLoading } = trpc.settings.get.useQuery();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          📊 Stock Screener
        </h1>

        <p className="text-center text-muted-foreground mb-8">
          Application d'aide à la décision boursière
          <br />
          Scraping robuste • Scoring modulaire • 100% Local
        </p>

        {/* Test tRPC */}
        <div className="mt-8 p-6 border rounded-lg bg-card">
          <h2 className="text-xl font-semibold mb-4">
            🔌 Test tRPC Connection
          </h2>

          {isLoading && (
            <p className="text-muted-foreground">Chargement...</p>
          )}

          {settings && (
            <div className="space-y-2">
              <p>
                ✅ <span className="font-semibold">tRPC fonctionne !</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Profil par défaut : {settings.defaultScoringProfile}
              </p>
              <p className="text-sm text-muted-foreground">
                Thème : {settings.theme}
              </p>
            </div>
          )}
        </div>

        {/* Info étape suivante */}
        <div className="mt-8 p-6 border border-yellow-500/50 rounded-lg bg-yellow-500/10">
          <h2 className="text-xl font-semibold mb-2 text-yellow-500">
            🚧 En Construction
          </h2>
          <p className="text-sm text-muted-foreground">
            Cette page sera remplacée par le Dashboard complet à l'étape 5.
            <br />
            Pour l'instant, nous configurons l'infrastructure technique (tRPC,
            Supabase, tests).
          </p>
        </div>

        {/* Stats actuelles */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="p-4 border rounded-lg">
            <p className="text-2xl font-bold">✅</p>
            <p className="text-sm text-muted-foreground">Next.js 15</p>
          </div>
          <div className="p-4 border rounded-lg">
            <p className="text-2xl font-bold">✅</p>
            <p className="text-sm text-muted-foreground">tRPC</p>
          </div>
          <div className="p-4 border rounded-lg">
            <p className="text-2xl font-bold">⏳</p>
            <p className="text-sm text-muted-foreground">Supabase</p>
          </div>
        </div>
      </div>
    </main>
  );
}
