"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Plus, Calendar, User, Receipt, ArrowRight, Monitor } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Pagination } from '@/components/shared/Pagination';

const ITEMS_PER_PAGE = 16;

export default function PenjualanPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchTransactions(); }, [currentPage]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    const from = currentPage * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    try {
      const { data, count, error } = await supabase
        .from('transactions')
        .select('id, created_at, total_amount, amount_paid, status, contact:contacts(name)', { count: 'exact' })
        .eq('type', 'SO_OUTBOUND')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw new Error(error.message);
      if (data) setTransactions(data);
      if (count !== null) setTotalItems(count);
    } catch (err: any) { console.error(err.message); }
    setIsLoading(false);
  };

  const formatRupiah = (number: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(number);
  const formatDate = (dateString: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateString));

  return (
    <div className="p-4 md:p-8 max-w-full overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-black">Penjualan (SO Outbound)</h1>
          <p className="text-black font-semibold mt-2 text-base">Riwayat penjualan kardus ke pelanggan.</p>
        </div>
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
          <Link href="/penjualan/buat" className="flex-1 sm:flex-none bg-purple-700 hover:bg-purple-800 text-white border-2 border-purple-900 px-5 py-3 rounded-xl text-base font-bold flex items-center justify-center gap-2 shadow-md transition-all">
            <Monitor className="w-5 h-5" /> Mode Kasir (POS)
          </Link>
          <Link href="/penjualan/buat" className="flex-1 sm:flex-none bg-white hover:bg-gray-50 text-purple-700 border-2 border-purple-300 px-5 py-3 rounded-xl text-base font-bold flex items-center justify-center gap-2 shadow-sm transition-all">
            <Plus className="w-5 h-5" /> Buat SO Baru
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-300 shadow-md overflow-hidden">
        {/* ===== DESKTOP VIEW ===== */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm md:text-base border-collapse whitespace-nowrap">
            <thead className="bg-gray-200 border-b-2 border-gray-400">
            <tr>
              <th className="px-6 py-4 text-black font-bold">Tanggal SO</th>
              <th className="px-6 py-4 text-black font-bold">Nama Pelanggan</th>
              <th className="px-6 py-4 text-black font-bold text-right">Total Tagihan</th>
              <th className="px-6 py-4 text-black font-bold text-center">Status Pembayaran</th>
              <th className="px-6 py-4 text-black font-bold text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? <tr><td colSpan={5} className="text-center py-8 text-black font-bold">Memuat data...</td></tr> : 
             transactions.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-black font-bold">Belum ada penjualan.</td></tr> : 
             transactions.map(tx => (
              <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-black font-bold">{formatDate(tx.created_at)}</td>
                <td className="px-6 py-4 text-black font-semibold">{tx.contact?.name || '-'}</td>
                <td className="px-6 py-4 text-black font-bold text-right text-lg">{formatRupiah(tx.total_amount)}</td>
                <td className="px-6 py-4 text-center"><StatusBadge status={tx.status} /></td>
                <td className="px-6 py-4 flex justify-center">
                  <Link href={`/penjualan/${tx.id}`} className="text-white bg-gray-800 hover:bg-black px-4 py-2 rounded-lg font-bold border-2 border-black transition-all">Detail</Link>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>

        {/* ===== MOBILE CARD VIEW ===== */}
        <div className="md:hidden p-3 bg-gray-50 min-h-[200px]">
          {isLoading ? (
            <div className="text-center py-8 text-black font-bold">Memuat data...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-black font-bold bg-white rounded-xl border-2 border-dashed border-gray-300">Belum ada transaksi penjualan.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {transactions.map(tx => (
                <Link 
                  key={tx.id} 
                  href={`/penjualan/${tx.id}`}
                  className="bg-white rounded-2xl border-2 border-gray-300 shadow-sm overflow-hidden flex flex-col active:scale-[0.98] transition-all"
                >
                  <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-700" />
                      <span className="text-sm font-black text-black">{formatDate(tx.created_at)}</span>
                    </div>
                    <StatusBadge status={tx.status} />
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 bg-gray-100 p-1.5 rounded-lg border border-gray-200 text-gray-600">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pelanggan</p>
                        <p className="text-sm font-bold text-black truncate max-w-[200px]">{tx.contact?.name || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 bg-gray-100 p-1.5 rounded-lg border border-gray-200 text-gray-600">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Tagihan</p>
                        <p className="text-lg font-black text-green-700 leading-none mt-1">{formatRupiah(tx.total_amount)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-center text-xs font-black text-purple-700 uppercase tracking-widest gap-2">
                    Lihat Detail Penjualan <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <Pagination 
        currentPage={currentPage}
        totalItems={totalItems}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
