"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Plus, Calendar, User, ShoppingCart, ArrowLeft } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Pagination } from '@/components/shared/Pagination';

const ITEMS_PER_PAGE = 16;

export default function PembelianRiwayatPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchTransactions(); }, [currentPage]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    
    const from = currentPage * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data, count } = await supabase
      .from('transactions')
      .select(`
        id, created_at, total_amount, amount_paid, status, 
        contact:contacts(name),
        items:transaction_items(
          id, quantity, qty_received, product:products(name)
        )
      `, { count: 'exact' })
      .eq('type', 'PO_INBOUND')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (data) setTransactions(data);
    if (count !== null) setTotalItems(count);
    setIsLoading(false);
  };

  const formatDate = (dateString: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateString));

  return (
    <div className="p-4 md:p-8 max-w-full overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-4">
          <Link href="/pembelian" className="p-2 hover:bg-gray-200 text-gray-600 rounded-xl border-2 border-gray-200 bg-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-black uppercase tracking-tight">Riwayat Pembelian (PO)</h1>
            <p className="text-gray-500 font-bold text-sm">Daftar semua transaksi pengadaan bahan mentah.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden">
        {/* ===== DESKTOP VIEW ===== */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm md:text-base border-collapse whitespace-nowrap">
            <thead className="bg-gray-50 border-b-2 border-gray-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-[15%]">Tanggal PO</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-[20%]">Supplier</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-[25%]">Daftar Barang</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-[15%]">QTY</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-[15%]">Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-[10%]">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {isLoading ? <tr><td colSpan={6} className="text-center py-12 text-gray-400 font-bold italic">Memuat data...</td></tr> : 
             transactions.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-400 font-bold italic">Belum ada transaksi.</td></tr> : 
             transactions.map(tx => (
              <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-black font-bold align-top">{formatDate(tx.created_at)}</td>
                <td className="px-6 py-4 text-black font-bold align-top">{tx.contact?.name || '-'}</td>
                <td className="px-6 py-4 align-top">
                  <div className="flex flex-col gap-1">
                    {tx.items?.map((item: any) => (
                      <span key={item.id} className="text-sm font-bold text-gray-600 truncate">
                        • {item.product?.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-center align-top">
                  <div className="flex flex-col gap-1">
                    {tx.items?.map((item: any) => (
                      <span key={item.id} className="text-sm font-black text-blue-600">
                        {item.quantity}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-center align-top"><StatusBadge status={tx.status} /></td>
                <td className="px-6 py-4 text-center align-top">
                  <Link href={`/pembelian/${tx.id}`} className="inline-block text-white bg-gray-900 hover:bg-black px-4 py-2 rounded-lg font-black text-xs uppercase border-2 border-black transition-all">Detail</Link>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>

        {/* ===== MOBILE VIEW ===== */}
        <div className="md:hidden p-4 space-y-4">
           {transactions.map(tx => (
             <Link key={tx.id} href={`/pembelian/${tx.id}`} className="block bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-sm active:scale-95 transition-all">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-black text-blue-600 uppercase">{formatDate(tx.created_at)}</span>
                  <StatusBadge status={tx.status} />
                </div>
                <h3 className="font-black text-black mb-2">{tx.contact?.name}</h3>
                <div className="space-y-1">
                   {tx.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-xs font-bold text-gray-500">
                         <span>• {item.product?.name}</span>
                         <span className="text-blue-600 font-black">{item.quantity}</span>
                      </div>
                   ))}
                </div>
             </Link>
           ))}
        </div>
      </div>

      <div className="mt-8">
        <Pagination 
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
