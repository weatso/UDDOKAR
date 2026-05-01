"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Plus } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';

export default function PembelianPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchTransactions(); }, []);

  const fetchTransactions = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('transactions').select('id, created_at, total_amount, amount_paid, status, contact:contacts(name)').eq('type', 'PO_INBOUND').order('created_at', { ascending: false });
    if (data) setTransactions(data);
    setIsLoading(false);
  };

  const formatRupiah = (number: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number);
  const formatDate = (dateString: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateString));

  return (
    <div className="p-4 md:p-8 max-w-full overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-black">Pembelian (PO Inbound)</h1>
          <p className="text-black font-semibold mt-2 text-base">Riwayat pembelian bahan mentah.</p>
        </div>
        <Link href="/pembelian/buat" className="bg-purple-700 hover:bg-purple-800 text-white border-2 border-purple-900 px-5 py-3 rounded-lg text-base font-bold flex items-center gap-2">
          <Plus className="w-5 h-5" /> Buat PO Baru
        </Link>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-300 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm md:text-base border-collapse whitespace-nowrap">
            <thead className="bg-gray-200 border-b-2 border-gray-400">
            <tr>
              <th className="px-6 py-4 text-black font-bold">Tanggal PO</th>
              <th className="px-6 py-4 text-black font-bold">Nama Supplier</th>
              <th className="px-6 py-4 text-black font-bold text-right">Total Tagihan</th>
              <th className="px-6 py-4 text-black font-bold text-center">Status Pembayaran</th>
              <th className="px-6 py-4 text-black font-bold text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? <tr><td colSpan={5} className="text-center py-8 text-black font-bold">Memuat data...</td></tr> : 
             transactions.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-black font-bold">Belum ada transaksi.</td></tr> : 
             transactions.map(tx => (
              <tr key={tx.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-black font-bold">{formatDate(tx.created_at)}</td>
                <td className="px-6 py-4 text-black font-semibold">{tx.contact?.name || '-'}</td>
                <td className="px-6 py-4 text-black font-bold text-right text-lg">{formatRupiah(tx.total_amount)}</td>
                <td className="px-6 py-4 text-center"><StatusBadge status={tx.status} /></td>
                <td className="px-6 py-4 flex justify-center">
                  <Link href={`/pembelian/${tx.id}`} className="text-white bg-gray-800 hover:bg-black px-4 py-2 rounded-lg font-bold border-2 border-black">Detail</Link>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
