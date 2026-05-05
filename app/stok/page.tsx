"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Archive, Package, Box, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

type ProductType = 'RAW' | 'FINISHED';

export default function StokGudangPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProductType>('FINISHED');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProducts();
  }, [activeTab]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(name)')
        .eq('type', activeTab)
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
    <div className="p-4 md:p-8 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl font-black text-black flex items-center gap-2">
            <Archive className="w-7 h-7 text-purple-700" /> Stok Gudang Terpusat
          </h1>
          <p className="text-black font-semibold mt-2 text-base">Pantau ketersediaan seluruh inventori pabrik.</p>
        </div>
      </div>

      {/* Tabs & Search Card */}
      <div className="bg-white rounded-xl border-2 border-gray-300 shadow-md overflow-hidden">
        {/* Tabs Header */}
        <div className="flex border-b-2 border-gray-300 bg-gray-100 px-2 sm:px-4 pt-4 gap-2 sm:gap-4 overflow-x-auto whitespace-nowrap">
          <button 
            onClick={() => { setActiveTab('FINISHED'); setSearch(''); }} 
            className={`flex items-center gap-2 px-4 sm:px-5 py-3 font-black text-sm sm:text-base border-b-4 transition-colors ${activeTab === 'FINISHED' ? 'border-purple-600 text-purple-800' : 'border-transparent text-gray-600 hover:text-black'}`}
          >
            <Box className="w-4 h-4" /> Kardus Jadi
          </button>
          <button 
            onClick={() => { setActiveTab('RAW'); setSearch(''); }} 
            className={`flex items-center gap-2 px-4 sm:px-5 py-3 font-black text-sm sm:text-base border-b-4 transition-colors ${activeTab === 'RAW' ? 'border-purple-600 text-purple-800' : 'border-transparent text-gray-600 hover:text-black'}`}
          >
            <Package className="w-4 h-4" /> Barang Mentah
          </button>
        </div>

        {/* Search Bar - Integrated in the same card like Contact module context */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={`Cari ${activeTab === 'FINISHED' ? 'kardus' : 'bahan mentah'}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-xl focus:border-purple-600 focus:outline-none font-bold text-black text-sm"
            />
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-gray-200 border-b-2 border-gray-400">
              <tr>
                <th className="px-6 py-4 text-black font-black text-xs uppercase tracking-widest">Barang & Kategori</th>
                <th className="px-6 py-4 text-black font-black text-xs uppercase tracking-widest text-right">Harga Dasar (HPP)</th>
                <th className="px-6 py-4 text-black font-black text-xs uppercase tracking-widest text-center">Stok Terkini</th>
                <th className="px-6 py-4 text-black font-black text-xs uppercase tracking-widest text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan={4} className="text-center py-12 text-gray-400 font-bold italic">Menghitung stok di gudang...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-12 text-gray-400 font-bold italic">Data tidak ditemukan.</td></tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-black text-black text-base leading-tight">{p.name}</p>
                      <p className="text-xs font-bold text-gray-400 mt-0.5 uppercase tracking-tighter">
                        {p.category?.name || (activeTab === 'FINISHED' ? 'KARDUS JADI' : 'BAHAN MENTAH')}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-black font-mono">
                      {formatRupiah(p.base_price)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-2xl font-black ${p.stock_quantity <= 0 ? 'text-red-600' : p.stock_quantity <= 10 ? 'text-orange-600' : 'text-purple-700'}`}>
                        {p.stock_quantity}
                      </span>
                      <span className="text-xs font-bold text-gray-400 ml-1">pcs/unit</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {getStockBadge(p.stock_quantity)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden p-3 bg-gray-50 min-h-[200px] flex flex-col gap-3">
          {isLoading ? (
            <div className="text-center py-12 text-gray-400 font-bold italic bg-white rounded-xl border-2 border-gray-300">Memuat...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-400 font-bold italic bg-white rounded-xl border-2 border-gray-300 border-dashed">Data tidak ditemukan.</div>
          ) : (
            filteredProducts.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border-2 border-gray-300 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <h3 className="text-lg font-black text-black leading-tight mb-0.5">{p.name}</h3>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {p.category?.name || 'UMUM'}
                      </p>
                    </div>
                    {getStockBadge(p.stock_quantity)}
                  </div>
                </div>
                <div className="p-4 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Harga Dasar</p>
                    <p className="text-sm font-black text-black font-mono">{formatRupiah(p.base_price)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Jumlah Stok</p>
                    <p className={`text-2xl font-black ${p.stock_quantity <= 0 ? 'text-red-600' : p.stock_quantity <= 10 ? 'text-orange-600' : 'text-purple-700'}`}>
                      {p.stock_quantity}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {!isLoading && filteredProducts.length > 0 && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border-2 border-gray-300 flex flex-col items-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Item</p>
            <p className="text-xl font-black text-black">{filteredProducts.length}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border-2 border-gray-300 flex flex-col items-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 text-green-600">Aman</p>
            <p className="text-xl font-black text-green-700">{filteredProducts.filter(p => p.stock_quantity > 10).length}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border-2 border-gray-300 flex flex-col items-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 text-orange-600">Menipis</p>
            <p className="text-xl font-black text-orange-700">{filteredProducts.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 10).length}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border-2 border-gray-300 flex flex-col items-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 text-red-600">Habis</p>
            <p className="text-xl font-black text-red-700">{filteredProducts.filter(p => p.stock_quantity <= 0).length}</p>
          </div>
        </div>
      )}
    </div>
  );
}
