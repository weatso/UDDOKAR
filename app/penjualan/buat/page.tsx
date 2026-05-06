"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save, 
  ChevronDown, 
  Search, 
  Box, 
  ShoppingCart, 
  X, 
  LayoutGrid, 
  List,
  User,
  Calendar,
  Tag,
  CreditCard
} from 'lucide-react';

export default function BuatSOPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [finishedProducts, setFinishedProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ contact_id: '', created_at: new Date().toISOString().split('T')[0] });
  const [cart, setCart] = useState<any[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [tenor, setTenor] = useState<number | string>(1);
  const [dpPercent, setDpPercent] = useState<number | string>(0);

  // State Diskon
  const [discountType, setDiscountType] = useState<'persen' | 'nominal'>('persen');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [discountLabel, setDiscountLabel] = useState<string>('');

  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [customerRes, productRes, categoryRes] = await Promise.all([
        supabase.from('contacts').select('id, name').eq('type', 'CUSTOMER').eq('is_active', true).order('name'),
        supabase.from('products').select('id, name, stock_quantity, dimensions, category_id').eq('type', 'FINISHED').eq('is_active', true).order('name'),
        supabase.from('categories').select('id, name').order('name')
      ]);
      
      if (customerRes.error) throw customerRes.error;
      if (productRes.error) throw productRes.error;
      if (categoryRes.error) throw categoryRes.error;
      
      const finishedProductsData = productRes.data || [];
      const allCategories = categoryRes.data || [];
      
      // Filter kategori: Hanya tampilkan kategori yang memiliki produk FINISHED
      const finishedCategoryIds = new Set(finishedProductsData.map(p => p.category_id));
      const validCategories = allCategories.filter(c => finishedCategoryIds.has(c.id));

      setCustomers(customerRes.data || []);
      setFinishedProducts(finishedProductsData);
      setCategories(validCategories);
    } catch (error: any) { 
      alert(error.message); 
    } finally {
      setIsLoading(false);
    }
  };

  const subtotal = cart.reduce((t, i) => t + (Number(i.quantity) * Number(i.price || 0)), 0);
  const discountAmount = discountType === 'persen'
    ? Math.round(subtotal * (Number(discountValue) / 100))
    : Math.min(Number(discountValue) || 0, subtotal);
  const totalTagihan = Math.max(0, subtotal - discountAmount);

  const handleAddToCart = (product: any) => {
    const existing = cart.find(i => i.product_id === product.id);
    if (existing) {
      setCart(cart.map(i => i.id === existing.id ? { ...i, quantity: Number(i.quantity) + 1 } : i));
    } else {
      setCart([...cart, { 
        id: crypto.randomUUID(), 
        product_id: product.id, 
        quantity: 1, 
        price: product.dimensions?.selling_price || 0,
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
    if (!formData.contact_id) return alert('Pilih Pelanggan!');
    const validItems = cart.filter(i => i.product_id && i.quantity > 0 && i.price >= 0);
    if (validItems.length === 0) return alert('Isi minimal 1 kardus!');

    const calculatedDpAmount = Math.floor(totalTagihan * (Number(dpPercent) / 100));

    if (isRecurring && calculatedDpAmount >= totalTagihan && totalTagihan > 0) {
      return alert('DP tidak boleh 100% atau lebih dari Total Tagihan!');
    }
    if (isRecurring && (!tenor || Number(tenor) <= 0)) {
      return alert('Tenor cicilan harus minimal 1 bulan!');
    }

    setIsSubmitting(true);
    try {
      const discountMeta = discountValue && Number(discountValue) > 0 ? {
        discount_type: discountType,
        discount_value: Number(discountValue),
        discount_amount: discountAmount,
        discount_label: discountLabel || null,
        subtotal_before_discount: subtotal
      } : null;

      const { data: txData, error: txError } = await supabase.from('transactions').insert([{ 
        contact_id: formData.contact_id, 
        type: 'SO_OUTBOUND', 
        status: isRecurring ? 'UNPAID' : 'PAID', 
        total_amount: totalTagihan, 
        amount_paid: isRecurring ? calculatedDpAmount : totalTagihan, 
        created_at: formData.created_at,
        notes: discountMeta ? JSON.stringify(discountMeta) : null
      }]).select().single();
      if (txError) throw txError;
      
      const { error: itemsError } = await supabase.from('transaction_items').insert(validItems.map(i => ({ 
        transaction_id: txData.id, 
        product_id: i.product_id, 
        quantity: i.quantity, 
        price: i.price 
      })));
      if (itemsError) throw itemsError;

      const activeTenor = Number(tenor);
      if (isRecurring && activeTenor > 0) {
        const remainingToInstallment = totalTagihan - calculatedDpAmount;
        const baseAmount = remainingToInstallment > 0 ? Math.floor(remainingToInstallment / activeTenor) : 0;
        const remainder = remainingToInstallment > 0 ? remainingToInstallment - (baseAmount * activeTenor) : 0;
        const schedules = [];
        
        let [year, month, day] = formData.created_at.split('-').map(Number);

        if (calculatedDpAmount > 0) {
          schedules.push({ transaction_id: txData.id, amount_to_pay: calculatedDpAmount, due_date: formData.created_at, status: 'UNPAID' });
        }

        if (remainingToInstallment > 0) {
          for (let i = 0; i < activeTenor; i++) {
            let dueStr = '';
            const totalMonthsToAdd = i + 1;
            const targetDate = new Date(year, month - 1 + totalMonthsToAdd, day);
            const expectedMonth = ((month - 1 + totalMonthsToAdd) % 12 + 12) % 12;
            if (targetDate.getMonth() !== expectedMonth) targetDate.setDate(0);
            dueStr = targetDate.toISOString().split('T')[0];
            
            const amount = i === activeTenor - 1 ? baseAmount + remainder : baseAmount;
            schedules.push({ transaction_id: txData.id, amount_to_pay: amount, due_date: dueStr, status: 'UNPAID' });
          }
        }
        const { error: scheduleError } = await supabase.from('payment_schedules').insert(schedules);
        if (scheduleError) throw scheduleError;
      }
      
      alert('SO berhasil dibuat!');
      
      if (!isRecurring) {
        // Jika LUNAS, arahkan ke halaman CETAK nota profesional
        router.push(`/penjualan/${txData.id}/cetak`);
      } else {
        // Jika CICILAN, arahkan ke daftar penjualan
        router.push('/penjualan');
      }
      
      router.refresh();
    } catch (error: any) { 
      alert('Terjadi kesalahan: ' + error.message); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const filteredProducts = finishedProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory ? p.category_id === activeCategory : true;
    return matchesSearch && matchesCategory;
  });

  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="fixed inset-0 z-50 flex bg-gray-100 overflow-hidden font-sans">
      
      {/* LEFT COLUMN (35%): CASHIER / INVOICE */}
      <aside className="w-[35%] max-w-[500px] min-w-[350px] bg-white shadow-2xl flex flex-col z-20 border-r border-gray-200">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          
          {/* Header */}
          <div className="p-4 bg-white border-b-2 border-gray-100 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => router.back()} className="p-2 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors border-2 border-gray-200">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-black text-black uppercase tracking-tighter flex-1">Kasir Penjualan</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <select 
                required 
                value={formData.contact_id} 
                onChange={e => setFormData({...formData, contact_id: e.target.value})} 
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-bold text-black focus:border-emerald-500 focus:outline-none bg-gray-50 transition-all"
              >
                <option value="">-- Pilih Customer --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="flex items-center gap-2 px-3 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm font-bold text-gray-600">
                <Calendar className="w-4 h-4 shrink-0 text-emerald-600" />
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
                <p className="text-[10px] font-bold text-gray-400 mt-2">Pilih produk di etalase sebelah kanan</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="bg-white p-3.5 rounded-xl border-2 border-gray-200 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-xl"></div>
                  <div className="flex justify-between items-start pl-1">
                    <h5 className="font-bold text-black text-sm flex-1 pr-2 leading-tight">{item.name}</h5>
                    <span className="font-black text-gray-500 text-xs">{formatRupiah(item.price)}</span>
                  </div>
                  <div className="flex justify-between items-center pl-1">
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 border border-gray-200">
                      <button type="button" onClick={() => updateQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-md text-gray-600 hover:text-red-600 hover:border-red-200 transition-colors font-black text-lg">-</button>
                      <input 
                        type="number" 
                        min="1" 
                        value={item.quantity} 
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : parseInt(e.target.value);
                          setCart(cart.map(i => i.id === item.id ? { ...i, quantity: isNaN(val as number) ? '' : val } : i));
                        }}
                        onBlur={() => {
                          if (!item.quantity || Number(item.quantity) <= 0) {
                            setCart(cart.filter(i => i.id !== item.id));
                          }
                        }}
                        className="w-12 text-center text-sm font-black text-black bg-transparent focus:outline-none" 
                      />
                      <button type="button" onClick={() => updateQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-md text-gray-600 hover:text-emerald-600 hover:border-emerald-200 transition-colors font-black text-lg">+</button>
                    </div>
                    <span className="font-black text-emerald-700 text-sm">{formatRupiah(Number(item.quantity) * Number(item.price))}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer: Discount, Tenor, Totals */}
          <div className="bg-white border-t-2 border-gray-100 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-10 flex flex-col">
            
            {/* Options Toggle */}
            <div className="p-4 bg-gray-50/50 space-y-3">
              <div className="flex p-1 bg-gray-200 rounded-xl border border-gray-300">
                <button type="button" onClick={() => setIsRecurring(false)} className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all ${!isRecurring ? 'bg-white text-emerald-700 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}>LUNAS (TUNAI)</button>
                <button type="button" onClick={() => setIsRecurring(true)} className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all ${isRecurring ? 'bg-white text-emerald-700 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}>TEMPO / CICILAN</button>
              </div>

              {isRecurring && (
                <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="bg-white p-3 rounded-xl border-2 border-gray-200">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Down Payment (%)</p>
                    <input type="number" min="0" max="99" value={dpPercent} onChange={e => setDpPercent(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-transparent font-black text-sm text-black focus:outline-none placeholder:text-gray-300" placeholder="0" />
                  </div>
                  <div className="bg-white p-3 rounded-xl border-2 border-gray-200">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Tenor (Bulan)</p>
                    <input type="number" min="1" value={tenor} onChange={e => setTenor(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-transparent font-black text-sm text-black focus:outline-none placeholder:text-gray-300" placeholder="0" />
                  </div>
                </div>
              )}

              {/* Discount Input */}
              <div className="bg-white p-3 rounded-xl border-2 border-gray-200 flex items-center gap-3">
                <div className="bg-emerald-50 p-2.5 rounded-lg text-emerald-600">
                  <Tag className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Potongan Harga</p>
                    <button type="button" onClick={() => setDiscountType(discountType === 'persen' ? 'nominal' : 'persen')} className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">{discountType === 'persen' ? '%' : 'Rp'}</button>
                  </div>
                  <input 
                    type="text" 
                    placeholder={discountType === 'persen' ? 'Diskon %' : 'Potongan Nominal'} 
                    value={discountType === 'persen' ? discountValue : (discountValue ? new Intl.NumberFormat('id-ID').format(Number(discountValue)) : '')}
                    onChange={(e) => {
                      if (discountType === 'persen') {
                        setDiscountValue(e.target.value);
                      } else {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setDiscountValue(val);
                      }
                    }}
                    className="w-full bg-transparent font-black text-sm text-black focus:outline-none placeholder:text-gray-300" 
                  />
                </div>
              </div>
            </div>

            {/* Grand Totals */}
            <div className="px-6 py-4 bg-white">
              <div className="space-y-1.5 mb-5">
                <div className="flex justify-between text-sm font-bold text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatRupiah(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm font-bold text-red-500">
                    <span>Diskon</span>
                    <span>-{formatRupiah(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t-2 border-gray-100 items-end">
                  <span className="text-sm font-black text-black uppercase tracking-widest mb-1">Tagihan</span>
                  <span className="text-3xl font-black text-emerald-600 tracking-tighter">{formatRupiah(totalTagihan)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => { setCart([]); setDiscountValue(''); }}
                  className="w-[72px] shrink-0 py-3 bg-white text-red-600 hover:bg-red-50 font-black text-[10px] uppercase rounded-xl border-2 border-red-200 transition-colors flex flex-col justify-center items-center gap-1"
                >
                  <Trash2 className="w-5 h-5" /> Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting || cart.length === 0}
                  className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:border-b-0 text-white font-black text-lg uppercase rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 border-b-4 border-emerald-800"
                >
                  <Save className="w-6 h-6" />
                  {isSubmitting ? 'MEMPROSES...' : 'SIMPAN PENJUALAN'}
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
              placeholder="Cari Produk (Nama / Spesifikasi)..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-lg font-black text-black focus:outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
            />
          </div>
          
          {/* Horizontal Categories */}
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
            <button 
              onClick={() => setActiveCategory(null)}
              className={`whitespace-nowrap px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-widest border-2 transition-all ${!activeCategory ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700'}`}
            >
              Semua Produk
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-widest border-2 transition-all ${activeCategory === cat.id ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-gray-400 font-bold text-lg">Memuat Katalog...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Box className="w-20 h-20 mb-4 opacity-50" />
              <p className="font-black text-xl uppercase tracking-tighter">Tidak Ditemukan</p>
              <p className="font-bold text-sm mt-2 text-gray-400">Coba kata kunci lain atau ubah kategori</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 pb-20">
              {filteredProducts.map(p => {
                const isOutOfStock = p.stock_quantity <= 0;
                return (
                  <button 
                    key={p.id}
                    onClick={() => !isOutOfStock && handleAddToCart(p)}
                    disabled={isOutOfStock}
                    className={`bg-white border-2 rounded-2xl overflow-hidden transition-all text-left flex flex-col group ${
                      isOutOfStock 
                        ? 'border-gray-200 opacity-60 cursor-not-allowed grayscale' 
                        : 'border-transparent hover:border-emerald-500 hover:shadow-xl hover:-translate-y-1 active:scale-95 shadow-sm'
                    }`}
                  >
                    <div className={`aspect-square flex items-center justify-center border-b-2 border-gray-50 relative transition-colors ${!isOutOfStock && 'group-hover:bg-emerald-50 bg-gray-50'}`}>
                      <Box className={`w-16 h-16 transition-colors ${isOutOfStock ? 'text-gray-300' : 'text-gray-300 group-hover:text-emerald-400'}`} />
                      
                      {/* Stock Badges */}
                      {isOutOfStock ? (
                        <span className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase shadow-sm">Habis</span>
                      ) : p.stock_quantity <= 5 ? (
                        <span className="absolute top-3 right-3 bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase shadow-sm">Sisa {p.stock_quantity}</span>
                      ) : (
                        <span className="absolute top-3 right-3 bg-white text-gray-600 border border-gray-200 text-[10px] font-black px-2 py-1 rounded-lg uppercase shadow-sm">{p.stock_quantity} Dus</span>
                      )}
                    </div>
                    
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <h4 className="font-black text-black text-sm leading-snug mb-3 line-clamp-2">{p.name}</h4>
                      <div className="flex justify-between items-end mt-auto">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{p.dimensions?.selling_price ? 'Harga' : ''}</span>
                        <span className="font-black text-emerald-600 text-lg tracking-tighter">{formatRupiah(p.dimensions?.selling_price || 0)}</span>
                      </div>
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
