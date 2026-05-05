"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Trash2, Search, Box, ShoppingCart, User, Calendar, Tag } from 'lucide-react';

export default function BuatPOPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [rawProducts, setRawProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isSubmitting, setIsLoading] = useState(false);
  const [isLoading, setPageLoading] = useState(true);
  
  const [formData, setFormData] = useState({ contact_id: '', created_at: new Date().toISOString().split('T')[0] });
  const [cart, setCart] = useState<any[]>([]);
  
  // State Tenor & DP
  const [isRecurring, setIsRecurring] = useState(false);
  const [tenor, setTenor] = useState(1);
  const [dpAmount, setDpAmount] = useState(0);
  const [intervalValue, setIntervalValue] = useState(1);
  const [intervalUnit, setIntervalUnit] = useState<'Bulan' | 'Hari'>('Bulan');

  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = async () => {
    setPageLoading(true);
    try {
      const [supplierRes, productRes, categoryRes] = await Promise.all([
        supabase.from('contacts').select('id, name').eq('type', 'SUPPLIER').eq('is_active', true).order('name'),
        supabase.from('products').select('id, name, dimensions, category_id, stock_quantity').eq('type', 'RAW').eq('is_active', true).order('name'),
        supabase.from('categories').select('id, name').order('name')
      ]);
      
      if (supplierRes.data) setSuppliers(supplierRes.data);
      
      const rawProductsData = productRes.data || [];
      setRawProducts(rawProductsData);

      const allCategories = categoryRes.data || [];
      const rawCategoryIds = new Set(rawProductsData.map(p => p.category_id));
      const validCategories = allCategories.filter(c => rawCategoryIds.has(c.id));
      setCategories(validCategories);
    } catch (error: any) { 
      alert(error.message); 
    } finally {
      setPageLoading(false);
    }
  };

  const totalTagihan = cart.reduce((t, i) => t + (Number(i.quantity) * Number(i.price || 0)), 0);

  const handleAddToCart = (product: any) => {
    const existing = cart.find(i => i.product_id === product.id);
    if (existing) {
      setCart(cart.map(i => i.id === existing.id ? { ...i, quantity: Number(i.quantity) + 1 } : i));
    } else {
      setCart([...cart, { 
        id: crypto.randomUUID(), 
        product_id: product.id, 
        quantity: 1, 
        price: 0, // Default 0 for PO, admin must input price
        name: product.name 
      }]);
    }
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = Math.max(0, Number(i.quantity) + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contact_id) return alert('Pilih Supplier!');
    const validItems = cart.filter(i => i.product_id && i.quantity > 0 && i.price >= 0);
    if (validItems.length === 0) return alert('Isi minimal 1 barang!');

    // [FIX A] Validasi DP tidak boleh >= Total Tagihan
    if (isRecurring && dpAmount > 0 && dpAmount >= totalTagihan) {
      return alert('Uang Muka (DP) tidak boleh sama atau lebih besar dari Total Tagihan!');
    }

    setIsLoading(true);
    try {
      // 1. Insert Transaction (PO_INBOUND)
      const { data: txData, error: txError } = await supabase.from('transactions').insert([{ 
        contact_id: formData.contact_id, 
        type: 'PO_INBOUND', 
        status: 'UNPAID', 
        total_amount: totalTagihan, 
        amount_paid: 0, 
        created_at: formData.created_at 
      }]).select().single();
      
      if (txError) throw txError;
      
      // 2. Insert Items
      const { error: itemsError } = await supabase.from('transaction_items').insert(
        validItems.map(i => ({ transaction_id: txData.id, product_id: i.product_id, quantity: i.quantity, price: i.price }))
      );
      if (itemsError) throw itemsError;

      // 3. Logika Penjadwalan
      if (isRecurring) {
        const remainingBalance = totalTagihan - (dpAmount || 0);
        const schedules = [];

        // JADWAL DP (Bulan 0)
        if (dpAmount > 0) {
          schedules.push({
            transaction_id: txData.id,
            amount_to_pay: Math.floor(dpAmount),
            due_date: formData.created_at,
            status: 'UNPAID'
          });
        }

        // JADWAL CICILAN
        if (remainingBalance > 0 && tenor > 0) {
          const baseInstallment = Math.floor(remainingBalance / tenor);
          const roundingRemainder = remainingBalance - (baseInstallment * tenor);
          const [year, month, day] = formData.created_at.split('-').map(Number);

          for (let i = 0; i < tenor; i++) {
            let dueStr = '';

            if (intervalUnit === 'Bulan') {
              const totalMonthsToAdd = intervalValue * (i + 1);
              const targetDate = new Date(year, month - 1 + totalMonthsToAdd, day);
              const expectedMonth = ((month - 1 + totalMonthsToAdd) % 12 + 12) % 12;
              if (targetDate.getMonth() !== expectedMonth) {
                targetDate.setDate(0);
              }
              dueStr = targetDate.toISOString().split('T')[0];
            } else {
              const d = new Date(year, month - 1, day);
              d.setDate(d.getDate() + (intervalValue * (i + 1)));
              dueStr = d.toISOString().split('T')[0];
            }

            const amount = i === tenor - 1 ? baseInstallment + roundingRemainder : baseInstallment;
            schedules.push({ transaction_id: txData.id, amount_to_pay: amount, due_date: dueStr, status: 'UNPAID' });
          }
        }
        const { error: scheduleError } = await supabase.from('payment_schedules').insert(schedules);
        if (scheduleError) throw scheduleError;
      }
      
      alert('Pembelian (PO) berhasil dibuat!');
      router.push('/pembelian');
      router.refresh();
    } catch (error: any) { alert('Gagal: ' + error.message); } finally { setIsLoading(false); }
  };

  const filteredProducts = rawProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory ? p.category_id === activeCategory : true;
    return matchesSearch && matchesCategory;
  });

  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="fixed inset-0 z-50 flex bg-gray-100 overflow-hidden font-sans">
      
      {/* LEFT COLUMN (35%): INVOICE PO */}
      <aside className="w-[35%] max-w-[500px] min-w-[350px] bg-white shadow-2xl flex flex-col z-20 border-r border-gray-200">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          
          {/* Header */}
          <div className="p-4 bg-white border-b-2 border-gray-100 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => router.back()} className="p-2 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors border-2 border-gray-200">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-black text-black uppercase tracking-tighter flex-1">Buat PO Baru</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <select 
                required 
                value={formData.contact_id} 
                onChange={e => setFormData({...formData, contact_id: e.target.value})} 
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-bold text-black focus:border-blue-500 focus:outline-none bg-gray-50 transition-all"
              >
                <option value="">-- Pilih Supplier --</option>
                {suppliers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="flex items-center gap-2 px-3 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm font-bold text-gray-600">
                <Calendar className="w-4 h-4 shrink-0 text-blue-600" />
                <span className="truncate">{formData.created_at}</span>
              </div>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-gray-50/50">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300">
                <ShoppingCart className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Keranjang Kosong</p>
                <p className="text-[10px] font-bold text-gray-400 mt-2">Pilih bahan baku di etalase sebelah kanan</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="bg-white p-3.5 rounded-xl border-2 border-gray-200 shadow-sm flex flex-col gap-3 relative overflow-hidden group">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-xl"></div>
                  <div className="flex justify-between items-start pl-1">
                    <h5 className="font-bold text-black text-sm flex-1 pr-2 leading-tight">{item.name}</h5>
                    <button type="button" onClick={() => updateQty(item.id, -item.quantity)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="flex justify-between items-center pl-1 gap-2">
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 border border-gray-200">
                      <button type="button" onClick={() => updateQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-md text-gray-600 hover:text-red-600 transition-colors font-black text-lg">-</button>
                      <input 
                        type="number" 
                        min="1" 
                        value={item.quantity} 
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 0);
                          setCart(cart.map(i => i.id === item.id ? { ...i, quantity: val } : i));
                        }}
                        className="w-12 text-center text-sm font-black text-black bg-transparent focus:outline-none" 
                      />
                      <button type="button" onClick={() => updateQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-md text-gray-600 hover:text-blue-600 transition-colors font-black text-lg">+</button>
                    </div>
                    
                    <div className="flex-1">
                      <input 
                        type="number" 
                        placeholder="Harga Beli"
                        value={item.price || ''}
                        onChange={(e) => setCart(cart.map(i => i.id === item.id ? { ...i, price: e.target.value } : i))}
                        className="w-full text-right text-sm font-black text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-2 focus:outline-none focus:border-blue-500" 
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer: Tenor, Totals */}
          <div className="bg-white border-t-2 border-gray-100 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-10 flex flex-col">
            
            {/* Options Toggle */}
            <div className="p-4 bg-gray-50/50 space-y-3">
              <div className="flex p-1 bg-gray-200 rounded-xl border border-gray-300">
                <button type="button" onClick={() => setIsRecurring(false)} className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all ${!isRecurring ? 'bg-white text-blue-700 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}>LUNAS (TUNAI)</button>
                <button type="button" onClick={() => setIsRecurring(true)} className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all ${isRecurring ? 'bg-white text-blue-700 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}>TEMPO / CICILAN</button>
              </div>

              {isRecurring && (
                <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="bg-white p-3 rounded-xl border-2 border-gray-200">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Down Payment (Rp)</p>
                    <input type="number" value={dpAmount || ''} onChange={e => setDpAmount(Number(e.target.value))} className="w-full bg-transparent font-black text-sm text-black focus:outline-none placeholder:text-gray-300" placeholder="0" />
                  </div>
                  <div className="bg-white p-3 rounded-xl border-2 border-gray-200">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Tenor</p>
                    <div className="flex gap-2">
                       <input type="number" value={intervalValue} onChange={e => setIntervalValue(Number(e.target.value))} className="w-1/2 bg-gray-50 px-2 py-1 rounded font-black text-sm text-black focus:outline-none" />
                       <select value={intervalUnit} onChange={e => setIntervalUnit(e.target.value as 'Bulan' | 'Hari')} className="w-1/2 bg-transparent text-xs font-bold focus:outline-none">
                         <option value="Bulan">Bulan</option>
                         <option value="Hari">Hari</option>
                       </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Grand Totals */}
            <div className="px-6 py-4 bg-white">
              <div className="space-y-1.5 mb-5">
                <div className="flex justify-between pt-3 border-t-2 border-gray-100 items-end">
                  <span className="text-sm font-black text-black uppercase tracking-widest mb-1">Tagihan</span>
                  <span className="text-3xl font-black text-blue-600 tracking-tighter">{formatRupiah(totalTagihan)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setCart([]) }
                  className="w-[72px] shrink-0 py-3 bg-white text-red-600 hover:bg-red-50 font-black text-[10px] uppercase rounded-xl border-2 border-red-200 transition-colors flex flex-col justify-center items-center gap-1"
                >
                  <Trash2 className="w-5 h-5" /> Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting || cart.length === 0}
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:border-b-0 text-white font-black text-lg uppercase rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 border-b-4 border-blue-800"
                >
                  <Save className="w-6 h-6" />
                  {isSubmitting ? 'MEMPROSES...' : 'SIMPAN PO'}
                </button>
              </div>
            </div>

          </div>
        </form>
      </aside>

      {/* RIGHT COLUMN (65%): PRODUCTS ETALASE */}
      <main className="w-[65%] flex-1 bg-gray-100 flex flex-col overflow-hidden relative">
        {/* Header: Search */}
        <div className="p-6 bg-white border-b border-gray-200 shadow-sm flex flex-col gap-4 shrink-0 z-10">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari Bahan Baku (Nama / Spesifikasi)..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-lg font-black text-black focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
            />
          </div>
          
          {/* Horizontal Categories */}
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
            <button 
              onClick={() => setActiveCategory(null)}
              className={`whitespace-nowrap px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-widest border-2 transition-all ${!activeCategory ? 'bg-blue-100 text-blue-800 border-blue-300 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700'}`}
            >
              Semua Bahan
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-widest border-2 transition-all ${activeCategory === cat.id ? 'bg-blue-100 text-blue-800 border-blue-300 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-gray-400 font-bold text-lg">Memuat Katalog Mentah...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Box className="w-20 h-20 mb-4 opacity-50" />
              <p className="font-black text-xl uppercase tracking-tighter">Tidak Ditemukan</p>
              <p className="font-bold text-sm mt-2 text-gray-400">Coba kata kunci lain atau ubah kategori</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 pb-20">
              {filteredProducts.map(p => {
                return (
                  <button 
                    key={p.id}
                    onClick={() => handleAddToCart(p)}
                    className="bg-white border-2 border-transparent hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 active:scale-95 shadow-sm rounded-2xl overflow-hidden transition-all text-left flex flex-col group"
                  >
                    <div className="aspect-square flex items-center justify-center border-b-2 border-gray-50 relative transition-colors group-hover:bg-blue-50 bg-gray-50">
                      <Box className="w-16 h-16 transition-colors text-gray-300 group-hover:text-blue-400" />
                      
                      {p.stock_quantity <= 5 ? (
                        <span className="absolute top-3 right-3 bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase shadow-sm">Sisa {p.stock_quantity}</span>
                      ) : (
                        <span className="absolute top-3 right-3 bg-white text-gray-600 border border-gray-200 text-[10px] font-black px-2 py-1 rounded-lg uppercase shadow-sm">{p.stock_quantity} Stok</span>
                      )}
                    </div>
                    
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <h4 className="font-black text-black text-sm leading-snug mb-3 line-clamp-2">{p.name}</h4>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      ` }} />
    </div>
  );
}

