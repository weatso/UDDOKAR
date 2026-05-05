"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Archive, Box, AlertTriangle, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function StokKardusJadiPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(name)')
        .eq('type', 'FINISHED')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      alert("Gagal mengambil data stok: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const getStockBadge = (qty: number) => {
    if (qty <= 0) {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 text-[10px] font-black">
          <XCircle className="w-3 h-3" /> HABIS
        </span>
      );
    }
    if (qty <= 10) {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200 text-[10px] font-black">
          <AlertTriangle className="w-3 h-3" /> MENIPIS
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 border border-green-200 text-[10px] font-black">
        <CheckCircle className="w-3 h-3" /> AMAN
      </span>
    );
  };

  const formatRupiah = (n: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="p-2 bg-white border-2 border-gray-200 rounded-full hover:bg-gray-100 transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5 text-black" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-black flex items-center gap-3">
            <Box className="w-8 h-8 text-purple-700" /> Stok Kardus Jadi
          </h1>
          <p className="text-gray-500 font-semibold mt-1">Pantau stok produk siap jual dan hasil produksi pabrik.</p>
        </div>
      </div>

      {/* Search & Actions */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari kardus berdasarkan nama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-2xl focus:border-purple-500 focus:outline-none font-semibold text-black"
          />
        </div>
        <div className="flex gap-2">
          <div className="bg-purple-50 px-4 py-2 rounded-xl border border-purple-200 text-xs font-bold text-purple-700">
            Total Item: {filteredProducts.length}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-20 text-center text-gray-400 font-bold italic">Menghitung stok kardus...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-20 text-center">
            <Archive className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-bold">Tidak ada kardus jadi ditemukan.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b-2 border-gray-100">
                  <tr>
                    <th className="px-6 py-4 font-black text-gray-400 text-[10px] uppercase tracking-widest">Kardus & Spesifikasi</th>
                    <th className="px-6 py-4 font-black text-gray-400 text-[10px] uppercase tracking-widest text-right">Harga Dasar (HPP)</th>
                    <th className="px-6 py-4 font-black text-gray-400 text-[10px] uppercase tracking-widest text-center">Jumlah Stok</th>
                    <th className="px-6 py-4 font-black text-gray-400 text-[10px] uppercase tracking-widest text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="px-6 py-5">
                        <p className="font-black text-black text-base">{p.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-600 rounded">
                            {p.category?.name || 'FINISHED'}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase">
                            {p.dimensions?.p}x{p.dimensions?.l}x{p.dimensions?.t} cm · {p.dimensions?.gramasi}gr
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right font-black text-black font-mono">
                        {formatRupiah(p.base_price)}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`text-2xl font-black ${p.stock_quantity <= 0 ? 'text-red-600' : p.stock_quantity <= 10 ? 'text-orange-600' : 'text-purple-700'}`}>
                          {p.stock_quantity}
                        </span>
                        <span className="text-xs font-bold text-gray-400 ml-1">pcs</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center">
                          {getStockBadge(p.stock_quantity)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden p-4 space-y-4">
              {filteredProducts.map((p) => (
                <div key={p.id} className="p-5 rounded-2xl border-2 border-gray-100 bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0">
                      <h3 className="font-black text-black text-lg leading-tight truncate">{p.name}</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1">
                        {p.dimensions?.p}x{p.dimensions?.l}x{p.dimensions?.t} cm · {p.dimensions?.gramasi}gr
                      </p>
                    </div>
                    {getStockBadge(p.stock_quantity)}
                  </div>
                  
                  <div className="flex justify-between items-center border-t border-gray-200 pt-3 mt-3">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase">Harga Dasar</p>
                      <p className="text-sm font-black text-black font-mono">{formatRupiah(p.base_price)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase">Stok</p>
                      <p className={`text-xl font-black ${p.stock_quantity <= 0 ? 'text-red-600' : p.stock_quantity <= 10 ? 'text-orange-600' : 'text-purple-700'}`}>
                        {p.stock_quantity} <span className="text-xs text-gray-400 uppercase font-bold">Pcs</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
