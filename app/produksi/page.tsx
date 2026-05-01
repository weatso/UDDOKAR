"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Plus, ArrowRight } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';

export default function ProduksiPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('production_orders').select('id, spk_number, target_quantity, status, created_at, product:products!target_product_id(name)').order('created_at', { ascending: false });
    if (data) setOrders(data);
    setIsLoading(false);
  };

  const formatDate = (dateString: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateString));

  return (
    <div className="p-4 md:p-8 max-w-full overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-black">Produksi (SPK)</h1>
          <p className="text-black font-semibold mt-2 text-base">Surat Perintah Kerja produksi kardus.</p>
        </div>
        <Link href="/produksi/buat" className="bg-purple-700 hover:bg-purple-800 text-white border-2 border-purple-900 px-5 py-3 rounded-lg text-base font-bold flex items-center gap-2">
          <Plus className="w-5 h-5" /> Buat SPK Baru
        </Link>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-300 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm md:text-base border-collapse whitespace-nowrap">
            <thead className="bg-gray-200 border-b-2 border-gray-400">
            <tr>
              <th className="px-6 py-4 text-black font-bold">Nomor SPK</th>
              <th className="px-6 py-4 text-black font-bold">Tanggal</th>
              <th className="px-6 py-4 text-black font-bold">Target Kardus (Barang Jadi)</th>
              <th className="px-6 py-4 text-black font-bold text-right">Target Qty</th>
              <th className="px-6 py-4 text-black font-bold text-center">Status</th>
              <th className="px-6 py-4 text-black font-bold text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? <tr><td colSpan={6} className="text-center py-8 text-black font-bold">Memuat data...</td></tr> : 
             orders.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-black font-bold">Belum ada SPK.</td></tr> : 
             orders.map(order => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-black font-bold">{order.spk_number}</td>
                <td className="px-6 py-4 text-black font-semibold">{formatDate(order.created_at)}</td>
                <td className="px-6 py-4 text-black font-bold">{order.product?.name || '-'}</td>
                <td className="px-6 py-4 text-black font-black text-right text-lg">{order.target_quantity}</td>
                <td className="px-6 py-4 text-center"><StatusBadge status={order.status} /></td>
                <td className="px-6 py-4 flex justify-center">
                  <Link href={`/produksi/${order.id}`} className="text-white bg-purple-700 hover:bg-purple-800 border-2 border-purple-900 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                    {order.status === 'PENDING' ? 'Proses SPK' : 'Lihat Detail'} <ArrowRight className="w-4 h-4" />
                  </Link>
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
