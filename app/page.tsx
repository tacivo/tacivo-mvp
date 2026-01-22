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
      router.push('/platform');
    } else {
      router.push('/login');
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'hsl(60 2% 10%)' }}>
      {/* Animated background elements with Tacivo colors */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full blur-3xl animate-pulse" style={{ background: 'hsl(15 52% 58% / 0.1)' }}></div>
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full blur-3xl animate-pulse" style={{ background: 'hsl(36 27% 56% / 0.08)', animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl animate-pulse" style={{ background: 'hsl(15 52% 58% / 0.05)', animationDelay: '2s' }}></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          {/* Logo with glow effect */}
          <div className="w-32 h-32 mx-auto mb-8 relative">
            <div className="absolute inset-0 rounded-full blur-2xl animate-pulse" style={{ background: 'hsl(15 52% 58% / 0.3)' }}></div>
            <div className="absolute inset-4 rounded-full blur-xl animate-pulse" style={{ background: 'hsl(15 52% 58% / 0.4)', animationDelay: '0.5s' }}></div>
            <img
              src="/assets/logo/svg/13.svg"
              alt="Tacivo"
              className="w-full h-full relative z-10 drop-shadow-2xl"
            />
          </div>

          {/* Loading indicator */}
          <div className="flex items-center justify-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'hsl(15 52% 58%)', animationDelay: '0ms' }}></div>
            <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'hsl(36 27% 56%)', animationDelay: '150ms' }}></div>
            <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'hsl(15 52% 58%)', animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32" style={{ background: 'linear-gradient(to top, hsl(60 2% 10%), transparent)' }}></div>
    </div>
  );
}
