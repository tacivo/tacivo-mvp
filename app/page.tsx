'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to interview page
    router.push('/interview');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-32 h-32 mx-auto mb-6">
          <img src="/assets/logo/svg/13.svg" alt="Tacivo" className="w-full h-full" />
        </div>
        <h1 className="text-2xl font-serif text-slate-900 mb-2">Tacivo Interview MVP</h1>
        <p className="text-slate-600">Redirecting to interview...</p>
      </div>
    </div>
  );
}
