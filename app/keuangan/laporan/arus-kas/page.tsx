"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, ArrowLeftRight, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

export default function ArusKasPage() {
  const [isLoading, setIsLoading] = useState(false);
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  const [kasmasuk, setKasMasuk] = useState<any[]>([]);
  const [kaskeluar, setKasKeluar] = useState<any[]>([]);
  const [totalMasuk, setTotalMasuk] = useState(0);
  const [totalKeluar, setTotalKeluar] = useState(0);

  useEffect(() => { fetchReport(); }, [startDate, endDate]);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      // Use state dates directly

      // Kas Masuk: Pembayaran dari pelanggan (payments terkait SO_OUTBOUND)
      const { data: paymentsIn } = await supabase
        .from('payments')
        .select('amount, payment_date, payment_method, transaction:transactions!inner(type, contact:contacts(name))')
        .eq('transactions.type', 'SO_OUTBOUND')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .order('payment_date', { ascending: false });

      // Kas Keluar: Pembayaran ke supplier (payments terkait PO_INBOUND)
      const { data: paymentsOut } = await supabase
        .from('payments')
        .select('amount, payment_date, payment_method, transaction:transactions!inner(type, contact:contacts(name))')
        .eq('transactions.type', 'PO_INBOUND')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .order('payment_date', { ascending: false });

      // Kas Keluar: expense_transactions
      const { data: expData } = await supabase
        .from('expense_transactions')
        .select('amount, transaction_date, description, coa:coa(name)')
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .order('transaction_date', { ascending: false });

      const inTotal = paymentsIn?.reduce((t, p) => t + Number(p.amount), 0) || 0;
      const outPO = paymentsOut?.reduce((t, p) => t + Number(p.amount), 0) || 0;
      const outExp = expData?.reduce((t, e) => t + Number(e.amount), 0) || 0;

      setKasMasuk(paymentsIn || []);
      setTotalMasuk(inTotal);

      const keluarRows = [
        ...(paymentsOut || []).map(p => ({ label: `Bayar ke ${(p.transaction as any)?.contact?.name || 'Supplier'}`, amount: p.amount, date: p.payment_date, tag: 'PO' })),
        ...(expData || []).map(e => ({ label: e.description, amount: e.amount, date: e.transaction_date, tag: (e.coa as any)?.name || 'Beban' }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setKasKeluar(keluarRows);
      setTotalKeluar(outPO + outExp);
    } catch (err: any) { console.error(err); }
    setIsLoading(false);
  };

  const arusKasBersih = totalMasuk - totalKeluar;
  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
  const formatDate = (d: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(d + 'T00:00:00'));

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/keuangan" className="p-2 bg-white border-2 border-gray-300 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-black" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-black flex items-center gap-2">
            <ArrowLeftRight className="w-7 h-7 text-purple-600" /> Laporan Arus Kas
          </h1>
          <p className="text-gray-500 font-semibold text-sm mt-0.5">Pantau pergerakan uang masuk dan keluar bisnis</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3 mb-6 bg-white p-4 rounded-2xl border-2 border-gray-200 shadow-sm">
        <div>
          <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Dari Tanggal</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="px-3 py-2 border-2 border-gray-300 rounded-xl font-bold text-black focus:border-purple-500 focus:outline-none bg-white text-sm" />
        </div>
        <div>
          <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Sampai Tanggal</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="px-3 py-2 border-2 border-gray-300 rounded-xl font-bold text-black focus:border-purple-500 focus:outline-none bg-white text-sm" />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-gray-400 font-bold text-xl">Menghitung arus kas...</div>
      ) : (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2"><ArrowDownCircle className="w-5 h-5 text-green-600" /><p className="text-xs font-black text-green-600 uppercase tracking-widest">Kas Masuk</p></div>
              <p className="text-2xl font-black text-green-700">{formatRupiah(totalMasuk)}</p>
              <p className="text-xs text-green-500 font-semibold mt-1">{kasmasuk.length} pembayaran diterima</p>
            </div>
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2"><ArrowUpCircle className="w-5 h-5 text-red-600" /><p className="text-xs font-black text-red-600 uppercase tracking-widest">Kas Keluar</p></div>
              <p className="text-2xl font-black text-red-700">{formatRupiah(totalKeluar)}</p>
              <p className="text-xs text-red-500 font-semibold mt-1">{kaskeluar.length} transaksi keluar</p>
            </div>
            <div className={`border-2 rounded-2xl p-4 ${arusKasBersih >= 0 ? 'bg-purple-50 border-purple-200' : 'bg-orange-50 border-orange-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <ArrowLeftRight className={`w-5 h-5 ${arusKasBersih >= 0 ? 'text-purple-600' : 'text-orange-600'}`} />
                <p className={`text-xs font-black uppercase tracking-widest ${arusKasBersih >= 0 ? 'text-purple-600' : 'text-orange-600'}`}>Arus Kas Bersih</p>
              </div>
              <p className={`text-2xl font-black ${arusKasBersih >= 0 ? 'text-purple-700' : 'text-orange-700'}`}>{formatRupiah(Math.abs(arusKasBersih))}</p>
              <p className={`text-xs font-semibold mt-1 ${arusKasBersih >= 0 ? 'text-purple-500' : 'text-orange-500'}`}>{arusKasBersih >= 0 ? '✅ Positif' : '⚠️ Negatif'}</p>
            </div>
          </div>

          {/* Kas Masuk Detail */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-green-50 border-b-2 border-green-200 flex items-center gap-2">
              <ArrowDownCircle className="w-5 h-5 text-green-600" />
              <h2 className="font-black text-green-800 uppercase tracking-wide text-sm">KAS MASUK — Pembayaran dari Pelanggan</h2>
            </div>
            {kasmasuk.length === 0 ? (
              <p className="text-center py-6 text-gray-400 font-semibold text-sm">Tidak ada kas masuk di periode ini.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {kasmasuk.map((p: any, i: number) => (
                  <div key={i} className="flex justify-between items-center px-5 py-3">
                    <div>
                      <p className="text-xs text-gray-400 font-semibold">{formatDate(p.payment_date)} · {p.payment_method || 'Transfer'}</p>
                      <p className="font-semibold text-black text-sm">{(p.transaction as any)?.contact?.name || 'Pelanggan'}</p>
                    </div>
                    <span className="font-black text-green-700 whitespace-nowrap ml-4">{formatRupiah(p.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center px-5 py-3 bg-green-50 border-t-2 border-green-200">
                  <span className="font-black text-black uppercase text-xs">Total Masuk</span>
                  <span className="font-black text-green-700 text-lg">{formatRupiah(totalMasuk)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Kas Keluar Detail */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-red-50 border-b-2 border-red-200 flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-red-600" />
              <h2 className="font-black text-red-800 uppercase tracking-wide text-sm">KAS KELUAR — Supplier & Biaya Operasional</h2>
            </div>
            {kaskeluar.length === 0 ? (
              <p className="text-center py-6 text-gray-400 font-semibold text-sm">Tidak ada kas keluar di periode ini.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {kaskeluar.map((k, i) => (
                  <div key={i} className="flex justify-between items-center px-5 py-3">
                    <div>
                      <p className="text-xs text-gray-400 font-semibold">{formatDate(k.date)} · <span className="text-red-500 font-bold">{k.tag}</span></p>
                      <p className="font-semibold text-black text-sm">{k.label}</p>
                    </div>
                    <span className="font-black text-red-700 whitespace-nowrap ml-4">{formatRupiah(k.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center px-5 py-3 bg-red-50 border-t-2 border-red-200">
                  <span className="font-black text-black uppercase text-xs">Total Keluar</span>
                  <span className="font-black text-red-700 text-lg">{formatRupiah(totalKeluar)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Net */}
          <div className={`rounded-2xl border-4 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${arusKasBersih >= 0 ? 'bg-purple-700 border-purple-900' : 'bg-orange-600 border-orange-900'}`}>
            <div>
              <p className="text-white/80 font-black uppercase tracking-widest text-xs mb-1">ARUS KAS BERSIH BULAN INI</p>
              <p className="text-white font-semibold text-sm">Kas Masuk − Kas Keluar</p>
            </div>
            <p className="text-white font-black text-3xl md:text-4xl">{formatRupiah(Math.abs(arusKasBersih))}</p>
          </div>
        </div>
      )}
    </div>
  );
}
