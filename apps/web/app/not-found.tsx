import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Page non trouvée</h2>
        <p className="text-muted-foreground mb-8">
          La page que vous recherchez n'existe pas.
        </p>
        <Link
          href="/"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
