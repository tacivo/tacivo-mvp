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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ivory-light via-background to-ivory-light">
      <div className="text-center px-4">
        {/* Logo with subtle animation */}
        <div className="w-32 h-32 mx-auto mb-8 relative">
          <div className="absolute inset-0 bg-book-cloth/10 rounded-full blur-2xl animate-pulse"></div>
          <img
            src="/assets/logo/svg/13.svg"
            alt="Tacivo"
            className="w-full h-full relative z-10 animate-fade-in"
          />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-serif text-slate-900 mb-3 animate-fade-in-up">
          Tacivo
        </h1>
        <p className="text-lg text-slate-700 mb-8 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          AI-Powered Knowledge Capture
        </p>

        {/* Loading indicator */}
        <div className="flex items-center justify-center gap-2 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="w-2 h-2 bg-book-cloth rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-book-cloth rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-book-cloth rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
