import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to dashboard (production-ready app)
  redirect('/dashboard');
}
