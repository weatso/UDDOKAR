"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Plus, ArrowRight, Calendar, Hash, BoxIcon, ClipboardList } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Pagination } from '@/components/shared/Pagination';

const ITEMS_PER_PAGE = 16;

export default function ProduksiPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchOrders(); }, [currentPage]);

  const fetchOrders = async () => {
    setIsLoading(true);
    const from = currentPage * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data, count } = await supabase
      .from('production_orders')
      .select('id, spk_number, target_quantity, status, created_at, product:products!target_product_id(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (data) setOrders(data);
    if (count !== null) setTotalItems(count);
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
        <Link href="/produksi/buat" className="w-full md:w-auto bg-purple-700 hover:bg-purple-800 text-white border-2 border-purple-900 px-5 py-3 rounded-xl text-base font-bold flex items-center justify-center gap-2 shadow-md transition-all">
          <Plus className="w-5 h-5" /> Buat SPK Baru
        </Link>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-300 shadow-md overflow-hidden">
        {/* ===== DESKTOP VIEW ===== */}
        <div className="hidden md:block overflow-x-auto">
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
              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-black font-bold">{order.spk_number}</td>
                <td className="px-6 py-4 text-black font-semibold">{formatDate(order.created_at)}</td>
                <td className="px-6 py-4 text-black font-bold">{order.product?.name || '-'}</td>
                <td className="px-6 py-4 text-black font-black text-right text-lg">{order.target_quantity}</td>
                <td className="px-6 py-4 text-center"><StatusBadge status={order.status} /></td>
                <td className="px-6 py-4 flex justify-center">
                  <Link href={`/produksi/${order.id}`} className="text-white bg-purple-700 hover:bg-purple-800 border-2 border-purple-900 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all">
                    {order.status === 'PENDING' ? 'Proses SPK' : 'Lihat Detail'} <ArrowRight className="w-4 h-4" />
                  </Link>
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
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-black font-bold bg-white rounded-xl border-2 border-dashed border-gray-300">Belum ada data SPK.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {orders.map(order => (
                <Link 
                  key={order.id} 
                  href={`/produksi/${order.id}`}
                  className="bg-white rounded-2xl border-2 border-gray-300 shadow-sm overflow-hidden flex flex-col active:scale-[0.98] transition-all"
                >
                  <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-purple-700">
                      <Hash className="w-4 h-4" />
                      <span className="text-sm font-black text-black">{order.spk_number}</span>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-100 p-1.5 rounded-lg border border-gray-200 text-gray-600">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="flex justify-between items-center flex-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tanggal</span>
                        <span className="text-sm font-bold text-black">{formatDate(order.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 pt-2">
                      <div className="mt-0.5 bg-gray-100 p-1.5 rounded-lg border border-gray-200 text-gray-600">
                        <BoxIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Produk Target</p>
                        <p className="text-sm font-bold text-black leading-tight">{order.product?.name || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                      <div className="bg-purple-50 p-1.5 rounded-lg border border-purple-100 text-purple-700">
                        <ClipboardList className="w-4 h-4" />
                      </div>
                      <div className="flex justify-between items-center flex-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Qty</span>
                        <span className="text-lg font-black text-black">{order.target_quantity} <span className="text-xs text-gray-500 font-bold">Pcs</span></span>
                      </div>
                    </div>
                  </div>
                  <div className={`p-3 border-t border-gray-200 flex items-center justify-center text-xs font-black uppercase tracking-widest gap-2 ${order.status === 'PENDING' ? 'bg-purple-700 text-white' : 'bg-gray-50 text-purple-700'}`}>
                    {order.status === 'PENDING' ? 'Proses SPK Sekarang' : 'Lihat Detail Produksi'} <ArrowRight className="w-4 h-4" />
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
