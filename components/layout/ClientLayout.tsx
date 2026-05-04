"use client";

import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Menu, Box } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isPrintPage = pathname?.endsWith('/cetak');
  const isLoginPage = pathname?.startsWith('/login');

  // Fitur Keamanan: Paksa Logout jika browser baru dibuka (tab baru/window baru)
  // Kecualikan halaman cetak agar tidak logout saat membuka tab print baru
  useEffect(() => {
    if (typeof window !== 'undefined' && !isLoginPage && !isPrintPage) {
      const activeSession = sessionStorage.getItem('active_session');
      
      // Jika penanda sesi aktif tidak ada, berarti ini adalah sesi browser baru
      if (!activeSession) {
        const forceLogout = async () => {
          await supabase.auth.signOut();
          router.push('/login');
          router.refresh();
        };
        forceLogout();
      }
    }
  }, [isLoginPage, isPrintPage, router]);

  if (isLoginPage || isPrintPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 text-black w-full overflow-x-hidden">
      {/* Sidebar for Desktop & Mobile */}
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Mobile Header (Only visible on md:hidden) */}
        <header className="md:hidden bg-white border-b-2 border-gray-200 p-4 flex items-center justify-between shrink-0 shadow-sm z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-700 flex items-center justify-center border-2 border-purple-800">
              <Box className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-black tracking-widest">UD DOKAR</h1>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-black hover:bg-gray-100 rounded-lg border-2 border-transparent hover:border-gray-300"
          >
            <Menu className="w-7 h-7" />
          </button>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 print:bg-white w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
