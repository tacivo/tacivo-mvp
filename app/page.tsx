'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-32 h-32 mx-auto mb-6">
          <img src="/assets/logo/svg/13.svg" alt="Tacivo" className="w-full h-full" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Tacivo Interview</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
