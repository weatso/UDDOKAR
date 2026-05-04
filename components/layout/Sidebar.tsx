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
  Settings,
  X,
  LogOut,
  ChevronDown,
  ChevronRight,
  BarChart3,
  BookOpen,
  TrendingDown,
  Clock,
  FileText,
  ArrowLeftRight,
} from 'lucide-react';

const keuanganSubMenu = [
  { name: 'Aging Schedule', href: '/keuangan/laporan/aging', icon: Clock },
  { name: 'Transaksi Biaya', href: '/keuangan/transaksi', icon: TrendingDown },
  { name: 'COA', href: '/keuangan/coa', icon: BookOpen },
  { name: 'Laporan Laba Rugi', href: '/keuangan/laporan/laba-rugi', icon: BarChart3 },
  { name: 'Arus Kas', href: '/keuangan/laporan/arus-kas', icon: ArrowLeftRight },
];

const menuItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Barang Mentah', href: '/master-data/barang-mentah', icon: Package },
  { name: 'Kardus Jadi', href: '/master-data/barang-jadi', icon: Box },
  { name: 'Kontak', href: '/master-data/kontak', icon: Users },
  { name: 'Pembelian (PO)', href: '/pembelian', icon: ShoppingCart },
  { name: 'Produksi (SPK)', href: '/produksi', icon: Factory },
  { name: 'Penjualan (SO)', href: '/penjualan', icon: Receipt },
  { name: 'Pengaturan Akun', href: '/pengaturan', icon: Settings },
];

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('Owner');

  const isKeuanganActive = pathname.startsWith('/keuangan');
  const [isKeuanganOpen, setIsKeuanganOpen] = useState(isKeuanganActive);

  useEffect(() => {
    if (isKeuanganActive) setIsKeuanganOpen(true);
  }, [isKeuanganActive]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email ?? 'Admin');
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem('active_session');
    router.push('/login');
    router.refresh();
  };

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all border-2 text-sm font-semibold ${
      active
        ? 'bg-purple-100 border-purple-500 text-purple-800 font-bold shadow-sm'
        : 'bg-white border-transparent text-black hover:bg-gray-100 hover:border-gray-300'
    }`;

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
        {/* Logo */}
        <div className="p-5 border-b-2 border-gray-200 flex items-center justify-between gap-4 bg-gray-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-700 flex items-center justify-center shrink-0 border-2 border-purple-800 shadow-md">
              <Box className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-black text-black">UD Dokar</h1>
          </div>
          <button onClick={onClose} className="md:hidden p-1.5 rounded-lg hover:bg-gray-200 text-black border border-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto">
          <nav className="p-4 space-y-1.5">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-2 pt-1">Menu Utama</p>

            {menuItems.map((item) => {
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link key={item.name} href={item.href} onClick={onClose} className={linkClass(isActive)}>
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-purple-700' : 'text-gray-600'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            {/* ===== KEUANGAN EXPANDABLE ===== */}
            <div className="pt-1">
              <button
                onClick={() => setIsKeuanganOpen(!isKeuanganOpen)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all border-2 text-sm font-semibold ${
                  isKeuanganActive
                    ? 'bg-purple-100 border-purple-500 text-purple-800 font-bold'
                    : 'bg-white border-transparent text-black hover:bg-gray-100 hover:border-gray-300'
                }`}
              >
                <Wallet className={`w-5 h-5 shrink-0 ${isKeuanganActive ? 'text-purple-700' : 'text-gray-600'}`} />
                <span className="flex-1 text-left">Keuangan</span>
                {isKeuanganOpen
                  ? <ChevronDown className="w-4 h-4 shrink-0" />
                  : <ChevronRight className="w-4 h-4 shrink-0" />
                }
              </button>

              {/* Sub-Menu */}
              {isKeuanganOpen && (
                <div className="mt-1.5 ml-4 pl-3 border-l-2 border-purple-200 space-y-1">
                  {keuanganSubMenu.map((sub) => {
                    const isSubActive = pathname.startsWith(sub.href);
                    const Icon = sub.icon;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all border text-xs font-semibold ${
                          isSubActive
                            ? 'bg-purple-50 border-purple-300 text-purple-800 font-bold'
                            : 'bg-white border-transparent text-gray-700 hover:bg-gray-50 hover:border-gray-200'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isSubActive ? 'text-purple-600' : 'text-gray-500'}`} />
                        <span>{sub.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* User Info */}
        <div className="p-4 border-t-2 border-gray-200 bg-gray-50 flex flex-col gap-3">
          <div className="flex items-center gap-3 px-1">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0 border-2 border-purple-300">
              <span className="text-base font-black text-purple-700">{userEmail ? userEmail.charAt(0).toUpperCase() : 'A'}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-black truncate">{userEmail || 'Admin UD'}</p>
              <p className="text-xs font-semibold text-gray-500">{userRole}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl border border-red-200 transition-all text-sm">
            <LogOut className="w-4 h-4" /> Keluar / Logout
          </button>
        </div>
      </aside>
    </>
  );
}
