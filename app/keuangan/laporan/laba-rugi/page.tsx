"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function LabaRugiPage() {
  const [isLoading, setIsLoading] = useState(false);
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  const [pendapatan, setPendapatan] = useState<any[]>([]);
  const [beban, setBeban] = useState<any[]>([]);
  const [totalPendapatan, setTotalPendapatan] = useState(0);
  const [totalBeban, setTotalBeban] = useState(0);

  useEffect(() => { fetchReport(); }, [startDate, endDate]);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      // Use the state dates directly

      // Revenue: SO_OUTBOUND total_amount dalam periode
      const { data: soData } = await supabase
        .from('transactions')
        .select('total_amount, created_at')
        .eq('type', 'SO_OUTBOUND')
        .eq('is_void', false)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59');

      const totalSO = soData?.reduce((t, r) => t + Number(r.total_amount), 0) || 0;

      // Beban: expense_transactions dalam periode
      const { data: expData } = await supabase
        .from('expense_transactions')
        .select('amount, coa:coa(code, name)')
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);

      // Beban: PO_INBOUND dalam periode (harga beli)
      const { data: poData } = await supabase
        .from('transactions')
        .select('total_amount, created_at')
        .eq('type', 'PO_INBOUND')
        .eq('is_void', false)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59');

      const totalExp = expData?.reduce((t, r) => t + Number(r.amount), 0) || 0;
      const totalPO = poData?.reduce((t, r) => t + Number(r.total_amount), 0) || 0;

      // Group beban by COA
      const coaMap: Record<string, { name: string; code: string; total: number }> = {};

expData?.forEach((e: any) => {
  // Atasi masalah Supabase yang kadang mengembalikan data join sebagai array
  const coaItem = Array.isArray(e.coa) ? e.coa[0] : e.coa;
  
  const key = coaItem?.code || 'LAINNYA';
  
  if (!coaMap[key]) {
    coaMap[key] = { 
      name: coaItem?.name || 'Lainnya', 
      code: key, 
      total: 0 
    };
  }
  
  coaMap[key].total += Number(e.amount);
});

      setPendapatan([
        { label: 'Pendapatan Penjualan (SO)', amount: totalSO },
      ]);
      setTotalPendapatan(totalSO);

      const bebanRows = Object.values(coaMap);
      if (totalPO > 0) bebanRows.unshift({ code: 'HPP', name: 'Harga Pokok Pembelian (PO)', total: totalPO });
      setBeban(bebanRows);
      setTotalBeban(totalPO + totalExp);
    } catch (err: any) { console.error(err.message); }
    setIsLoading(false);
  };

  const labaRugi = totalPendapatan - totalBeban;
  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/keuangan" className="p-2 bg-white border-2 border-gray-300 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-black" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-black flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-green-600" /> Laporan Laba Rugi
          </h1>
          <p className="text-gray-500 font-semibold text-sm mt-0.5">Ringkasan pendapatan dan beban bisnis dalam satu periode</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3 mb-6 bg-white p-4 rounded-2xl border-2 border-gray-200 shadow-sm">
        <div>
          <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Dari Tanggal</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="px-3 py-2 border-2 border-gray-300 rounded-xl font-bold text-black focus:border-green-500 focus:outline-none bg-white text-sm" />
        </div>
        <div>
          <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Sampai Tanggal</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="px-3 py-2 border-2 border-gray-300 rounded-xl font-bold text-black focus:border-green-500 focus:outline-none bg-white text-sm" />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-gray-400 font-bold text-xl">Menghitung laporan...</div>
      ) : (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-5 h-5 text-green-600" /><p className="text-xs font-black text-green-600 uppercase tracking-widest">Total Pendapatan</p></div>
              <p className="text-2xl font-black text-green-700">{formatRupiah(totalPendapatan)}</p>
            </div>
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2"><TrendingDown className="w-5 h-5 text-red-600" /><p className="text-xs font-black text-red-600 uppercase tracking-widest">Total Beban</p></div>
              <p className="text-2xl font-black text-red-700">{formatRupiah(totalBeban)}</p>
            </div>
            <div className={`border-2 rounded-2xl p-4 ${labaRugi >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-100 border-gray-300'}`}>
              <div className="flex items-center gap-2 mb-2"><Minus className={`w-5 h-5 ${labaRugi >= 0 ? 'text-blue-600' : 'text-gray-600'}`} /><p className={`text-xs font-black uppercase tracking-widest ${labaRugi >= 0 ? 'text-blue-600' : 'text-gray-500'}`}>{labaRugi >= 0 ? 'Laba Bersih' : 'Rugi Bersih'}</p></div>
              <p className={`text-2xl font-black ${labaRugi >= 0 ? 'text-blue-700' : 'text-gray-700'}`}>{formatRupiah(Math.abs(labaRugi))}</p>
            </div>
          </div>

          {/* Pendapatan Section */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-green-50 border-b-2 border-green-200 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h2 className="font-black text-green-800 uppercase tracking-wide text-sm">PENDAPATAN</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {pendapatan.map((p, i) => (
                <div key={i} className="flex justify-between items-center px-6 py-4">
                  <span className="font-semibold text-black text-sm md:text-base">{p.label}</span>
                  <span className="font-black text-green-700 text-base md:text-lg whitespace-nowrap ml-4">{formatRupiah(p.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center px-6 py-4 bg-green-50 border-t-2 border-green-200">
                <span className="font-black text-black uppercase text-sm">Total Pendapatan</span>
                <span className="font-black text-green-700 text-xl">{formatRupiah(totalPendapatan)}</span>
              </div>
            </div>
          </div>

          {/* Beban Section */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-red-50 border-b-2 border-red-200 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <h2 className="font-black text-red-800 uppercase tracking-wide text-sm">BEBAN</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {beban.length === 0 ? (
                <p className="text-center py-6 text-gray-400 font-semibold text-sm">Tidak ada beban tercatat di periode ini.</p>
              ) : beban.map((b, i) => (
                <div key={i} className="flex justify-between items-center px-6 py-4">
                  <div>
                    <p className="text-xs font-black text-gray-400 font-mono">{b.code}</p>
                    <p className="font-semibold text-black text-sm md:text-base">{b.name}</p>
                  </div>
                  <span className="font-black text-red-700 text-base md:text-lg whitespace-nowrap ml-4">{formatRupiah(b.total)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center px-6 py-4 bg-red-50 border-t-2 border-red-200">
                <span className="font-black text-black uppercase text-sm">Total Beban</span>
                <span className="font-black text-red-700 text-xl">{formatRupiah(totalBeban)}</span>
              </div>
            </div>
          </div>

          {/* Laba/Rugi Final */}
          <div className={`rounded-2xl border-4 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${labaRugi >= 0 ? 'bg-blue-700 border-blue-900' : 'bg-gray-700 border-gray-900'}`}>
            <div>
              <p className="text-white/80 font-black uppercase tracking-widest text-xs mb-1">{labaRugi >= 0 ? '✅ LABA BERSIH' : '⚠️ RUGI BERSIH'}</p>
              <p className="text-white font-semibold text-sm">Pendapatan − Beban</p>
            </div>
            <p className="text-white font-black text-3xl md:text-4xl">{formatRupiah(Math.abs(labaRugi))}</p>
          </div>
        </div>
      )}
    </div>
  );
}
