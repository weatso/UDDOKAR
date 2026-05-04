"use client";

import Link from 'next/link';
import { Clock, TrendingDown, BookOpen, BarChart3, ArrowLeftRight, ChevronRight } from 'lucide-react';

const subModules = [
  {
    href: '/keuangan/laporan/aging',
    icon: Clock,
    title: 'Aging Schedule',
    description: 'Pantau tagihan yang belum lunas dan catat pembayarannya.',
    color: 'orange',
  },
  {
    href: '/keuangan/transaksi',
    icon: TrendingDown,
    title: 'Transaksi Biaya',
    description: 'Catat beban operasional: listrik, gaji, transportasi, dll.',
    color: 'red',
  },
  {
    href: '/keuangan/coa',
    icon: BookOpen,
    title: 'COA (Akun)',
    description: 'Kelola Chart of Accounts: Revenue, Beban, dan Asset.',
    color: 'blue',
  },
  {
    href: '/keuangan/laporan/laba-rugi',
    icon: BarChart3,
    title: 'Laporan Laba Rugi',
    description: 'Ringkasan pendapatan dan beban dalam satu periode.',
    color: 'green',
  },
  {
    href: '/keuangan/laporan/arus-kas',
    icon: ArrowLeftRight,
    title: 'Laporan Arus Kas',
    description: 'Pantau pergerakan kas masuk dan kas keluar bisnis.',
    color: 'purple',
  },
];

const colorMap: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
  red:    { bg: 'bg-red-50',    border: 'border-red-200',    icon: 'text-red-600',    badge: 'bg-red-100 text-red-700' },
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700' },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  icon: 'text-green-600',  badge: 'bg-green-100 text-green-700' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
};

export default function KeuanganHubPage() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-black">Modul Keuangan</h1>
        <p className="text-gray-600 font-semibold mt-1 text-sm md:text-base">Kelola keuangan bisnis UD Dokar: tagihan, beban, COA, dan laporan keuangan.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {subModules.map((mod) => {
          const c = colorMap[mod.color];
          const Icon = mod.icon;
          return (
            <Link
              key={mod.href}
              href={mod.href}
              className={`group flex flex-col p-5 rounded-2xl border-2 ${c.bg} ${c.border} hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl bg-white border-2 ${c.border} shadow-sm`}>
                  <Icon className={`w-6 h-6 ${c.icon}`} />
                </div>
                <ChevronRight className={`w-5 h-5 ${c.icon} opacity-0 group-hover:opacity-100 transition-opacity mt-1`} />
              </div>
              <h2 className="text-lg font-black text-black mb-1">{mod.title}</h2>
              <p className="text-sm text-gray-600 font-medium leading-snug">{mod.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
