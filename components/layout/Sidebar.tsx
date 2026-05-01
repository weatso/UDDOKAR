"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, 
  Package, 
  Box, 
  Users, 
  ShoppingCart, 
  Factory, 
  Receipt, 
  Wallet,
  X,
  LogOut
} from 'lucide-react';

const menuItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Barang Mentah', href: '/master-data/barang-mentah', icon: Package },
  { name: 'Kardus Jadi', href: '/master-data/barang-jadi', icon: Box },
  { name: 'Kontak', href: '/master-data/kontak', icon: Users },
  { name: 'Pembelian (PO)', href: '/pembelian', icon: ShoppingCart },
  { name: 'Produksi (SPK)', href: '/produksi', icon: Factory },
  { name: 'Penjualan (SO)', href: '/penjualan', icon: Receipt },
  { name: 'Keuangan', href: '/keuangan', icon: Wallet },
];

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email ?? 'Admin');
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-white text-black flex flex-col h-screen border-r-2 border-gray-200 shrink-0 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="p-6 border-b-2 border-gray-200 flex items-center justify-between gap-4 bg-gray-50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-700 flex items-center justify-center shrink-0 border-2 border-purple-800">
              <Box className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-black">UD Dokar</h1>
          </div>
          <button onClick={onClose} className="md:hidden p-1 rounded-lg hover:bg-gray-200 text-black border-2 border-transparent hover:border-gray-300">
            <X className="w-6 h-6" />
          </button>
        </div>
      
      <div className="flex-1 overflow-y-auto">
        <nav className="p-5 space-y-3 bg-white">
          <div className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 px-2 border-b border-gray-300 pb-2">Menu Utama</div>
        {menuItems.map((item) => {
          const isActive = 
            item.href === '/' 
              ? pathname === '/' 
              : pathname.startsWith(item.href);

          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-colors border-2 ${
                isActive 
                  ? 'bg-purple-100 border-purple-600 text-purple-800 font-bold shadow-sm' 
                  : 'bg-white border-transparent text-black font-semibold hover:bg-gray-100 hover:border-gray-300'
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'text-purple-700' : 'text-gray-800'}`} />
              <span className="text-base">{item.name}</span>
            </Link>
          );
        })}
        </nav>
      </div>
      
      <div className="p-4 border-t mt-auto bg-gray-50 flex flex-col gap-4">
        <div className="flex items-center gap-4 px-2">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 border-2 border-gray-400">
            <span className="text-lg font-bold text-black">{userEmail ? userEmail.charAt(0).toUpperCase() : 'AD'}</span>
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-black truncate">{userEmail || 'Admin UD'}</p>
            <p className="text-sm font-semibold text-gray-800 truncate">Owner</p>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg border border-red-300 transition-colors">
          <LogOut className="w-5 h-5" /> 🚪 Keluar / Logout
        </button>
      </div>
      </aside>
    </>
  );
}
