"use client";

import Link from 'next/link';
import { Clock, TrendingDown, BookOpen, BarChart3, ArrowLeftRight, ChevronRight, Wallet, FileText } from 'lucide-react';

const subModules = [
  { href: '/keuangan/transaksi', icon: TrendingDown, title: 'Transaksi Biaya', description: 'Catat beban operasional harian: listrik, gaji, sewa, transportasi, dan lainnya.', color: 'red', badge: 'Operasional' },
  { href: '/keuangan/coa', icon: BookOpen, title: 'Chart of Accounts', description: 'Kelola akun keuangan: Pendapatan, Beban, dan Asset bisnis Anda.', color: 'blue', badge: 'Master Data' },
  { href: '/keuangan/laporan/laba-rugi', icon: BarChart3, title: 'Laporan Laba Rugi', description: 'Ringkasan pendapatan vs. beban dalam satu periode untuk melihat profitabilitas.', color: 'green', badge: 'Laporan' },
  { href: '/keuangan/laporan/arus-kas', icon: ArrowLeftRight, title: 'Laporan Arus Kas', description: 'Pantau pergerakan kas masuk (pelanggan) dan kas keluar (supplier & biaya).', color: 'purple', badge: 'Laporan' },
  { href: '/keuangan/laporan/aging', icon: Clock, title: 'Aging Schedule', description: 'Pantau tagihan jatuh tempo, cicilan piutang, dan hutang yang belum lunas.', color: 'orange', badge: 'Monitoring' },
];

const colorMap: Record<string, { bg: string; border: string; icon: string; badgeBg: string; badgeText: string; hover: string }> = {
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600', badgeBg: 'bg-orange-100', badgeText: 'text-orange-700', hover: 'hover:border-orange-400' },
  red:    { bg: 'bg-red-50',    border: 'border-red-200',    icon: 'text-red-600',    badgeBg: 'bg-red-100',    badgeText: 'text-red-700',    hover: 'hover:border-red-400' },
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: 'text-blue-600',   badgeBg: 'bg-blue-100',   badgeText: 'text-blue-700',   hover: 'hover:border-blue-400' },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  icon: 'text-green-600',  badgeBg: 'bg-green-100',  badgeText: 'text-green-700',  hover: 'hover:border-green-400' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600', badgeBg: 'bg-purple-100', badgeText: 'text-purple-700', hover: 'hover:border-purple-400' },
};

export default function KeuanganHubPage() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start gap-4">
        <div className="p-3 bg-purple-100 rounded-2xl border-2 border-purple-200 shrink-0">
          <Wallet className="w-8 h-8 text-purple-700" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-black leading-tight">Modul Keuangan</h1>
          <p className="text-gray-500 font-semibold mt-1 text-sm">Kelola keuangan bisnis UD Dokar: tagihan, beban, akun, dan laporan keuangan lengkap.</p>
        </div>
      </div>

      {/* Banner */}
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-700 to-purple-900 rounded-2xl text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
        <div>
          <p className="text-purple-200 font-bold text-xs uppercase tracking-widest mb-1">Panduan Cepat</p>
          <p className="font-black text-lg leading-tight">Mulai dari mana?</p>
          <p className="text-purple-200 text-sm font-medium mt-1">Catat biaya → Cek laba rugi → Pantau arus kas</p>
        </div>
        <Link href="/keuangan/transaksi" className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-white text-purple-800 font-black rounded-xl hover:bg-purple-50 transition-all text-sm border-2 border-purple-200 shadow">
          <TrendingDown className="w-4 h-4" /> Catat Biaya Sekarang
        </Link>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subModules.map((mod) => {
          const c = colorMap[mod.color];
          const Icon = mod.icon;
          return (
            <Link key={mod.href} href={mod.href} className={`group flex flex-col p-5 rounded-2xl border-2 ${c.bg} ${c.border} ${c.hover} hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5`}>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl bg-white border-2 ${c.border} shadow-sm`}>
                  <Icon className={`w-6 h-6 ${c.icon}`} />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${c.badgeBg} ${c.badgeText}`}>{mod.badge}</span>
              </div>
              <h2 className="text-base font-black text-black mb-1.5">{mod.title}</h2>
              <p className="text-sm text-gray-600 font-medium leading-snug flex-1">{mod.description}</p>
              <div className={`mt-4 pt-3 border-t ${c.border} flex items-center justify-between`}>
                <span className={`text-xs font-bold ${c.icon}`}>Buka Modul</span>
                <ChevronRight className={`w-4 h-4 ${c.icon} group-hover:translate-x-1 transition-transform`} />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Note */}
      <div className="mt-6 p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl flex items-start gap-3">
        <FileText className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500 font-medium leading-relaxed">
          <span className="font-black text-gray-700">Catatan:</span> Laporan Laba Rugi menggunakan <span className="font-bold">Basis Akrual</span>. Laporan Arus Kas menggunakan <span className="font-bold">Basis Kas</span> (berdasarkan pembayaran aktual yang diterima/dikeluarkan).
        </p>
      </div>
    </div>
  );
}
