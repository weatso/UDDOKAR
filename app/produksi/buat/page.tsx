"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Search, Box, Trash2, ClipboardList, Hammer } from 'lucide-react';

interface FinishedProduct {
  id: string;
  name: string;
}

export default function BuatSPKPage() {
  const router = useRouter();
  const [products, setProducts] = useState<FinishedProduct[]>([]);
  const [rawProducts, setRawProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setPageLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    spk_number: `SPK-${Date.now().toString().slice(-6)}`,
    target_product_id: '',
    target_quantity: '',
  });

  const [cart, setCart] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setPageLoading(true);
    try {
      const [finishedRes, rawRes, catRes] = await Promise.all([
        supabase.from('products').select('id, name').eq('type', 'FINISHED').eq('is_active', true).order('name'),
        supabase.from('products').select('id, name, dimensions, category_id, stock_quantity').eq('type', 'RAW').eq('is_active', true).order('name'),
        supabase.from('categories').select('id, name').order('name')
      ]);

      if (finishedRes.data) setProducts(finishedRes.data);
      
      const rawData = rawRes.data || [];
      setRawProducts(rawData);

      const catData = catRes.data || [];
      const rawCatIds = new Set(rawData.map(p => p.category_id));
      setCategories(catData.filter(c => rawCatIds.has(c.id)));
    } catch (error: any) {
      console.error(error);
    } finally {
      setPageLoading(false);
    }
  };

  const handleAddToCart = (product: any) => {
    const existing = cart.find(i => i.product_id === product.id);
    if (existing) {
      setCart(cart.map(i => i.id === existing.id ? { ...i, quantity: Number(i.quantity) + 1 } : i));
    } else {
      setCart([...cart, { 
        id: crypto.randomUUID(), 
        product_id: product.id, 
        quantity: 1, 
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
    if (!formData.target_product_id || Number(formData.target_quantity) <= 0) {
      return alert('Mohon lengkapi produk dan jumlah target produksi!');
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('production_orders')
        .insert([{
          spk_number: formData.spk_number,
          target_product_id: formData.target_product_id,
          target_quantity: formData.target_quantity,
          status: 'PENDING'
        }])
        .select();

      if (error) throw error;
      const newSpkId = data[0].id;

      // 2. Insert Initial Production Logs (Bahan Baku Terpilih)
      if (cart.length > 0) {
        const { error: logsError } = await supabase
          .from('production_logs')
          .insert(cart.map(item => ({
            production_order_id: newSpkId,
            product_id: item.product_id,
            quantity: 0,
            type: 'CONSUMED'
          })));
        if (logsError) throw logsError;
      }

      alert('SPK berhasil dibuat!');
      router.push(`/produksi/${newSpkId}`);
      router.refresh();
      
    } catch (error: any) {
      console.error('Submit SPK Error:', error);
      alert('Terjadi kesalahan: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = rawProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory ? p.category_id === activeCategory : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex bg-gray-100 overflow-hidden font-sans">
      
      {/* LEFT COLUMN (35%): SPK FORM & CART */}
      <aside className="w-[35%] max-w-[500px] min-w-[350px] bg-white shadow-2xl flex flex-col z-20 border-r border-gray-200">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          
          {/* Header */}
          <div className="p-4 bg-white border-b-2 border-gray-100 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => router.back()} className="p-2 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors border-2 border-gray-200">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-black text-black uppercase tracking-tighter flex-1">Work Order (SPK)</h2>
              <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-200">{formData.spk_number}</span>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <select 
                required
                value={formData.target_product_id}
                onChange={e => setFormData({...formData, target_product_id: e.target.value})}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-bold text-black focus:border-orange-500 focus:outline-none bg-gray-50 transition-all"
              >
                <option value="">-- Barang Jadi Yang Diproduksi --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="p-4 bg-orange-50/50 border-b border-gray-200 flex flex-col gap-2">
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Jumlah Produksi (Dus)</label>
             <input 
               required
               type="number" 
               min="1"
               value={formData.target_quantity}
               onChange={e => setFormData({...formData, target_quantity: e.target.value as any})}
               className="w-full px-4 py-4 border-2 border-orange-300 rounded-xl text-2xl font-black text-orange-700 bg-white focus:outline-none focus:border-orange-600 transition-all placeholder:text-orange-200 text-center"
               placeholder="0"
             />
          </div>

          {/* Raw Material Cart */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-gray-50/50">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300">
                <ClipboardList className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 text-center">Bahan Baku Nihil</p>
                <p className="text-[10px] font-bold text-gray-400 mt-2 text-center">Opsional: Pilih bahan baku dari etalase untuk direkap ke SPK</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="bg-white p-3.5 rounded-xl border-2 border-gray-200 shadow-sm flex justify-between items-center relative overflow-hidden group">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500 rounded-l-xl"></div>
                  <h5 className="font-bold text-black text-sm flex-1 pl-1 pr-2 leading-tight">{item.name}</h5>
                  <button 
                    type="button" 
                    onClick={() => setCart(cart.filter(i => i.id !== item.id))}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="bg-white border-t-2 border-gray-100 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-10 p-4">
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
                 disabled={isSubmitting}
                 className="flex-1 py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:border-b-0 text-white font-black text-lg uppercase rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 border-b-4 border-orange-800"
               >
                 <Hammer className="w-6 h-6" />
                 {isSubmitting ? 'MEMPROSES...' : 'BUAT SPK'}
               </button>
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
              placeholder="Cari Bahan Baku Mentah..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-lg font-black text-black focus:outline-none focus:border-orange-500 focus:bg-white transition-all shadow-inner"
            />
          </div>
          
          {/* Horizontal Categories */}
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
            <button 
              onClick={() => setActiveCategory(null)}
              className={`whitespace-nowrap px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-widest border-2 transition-all ${!activeCategory ? 'bg-orange-100 text-orange-800 border-orange-300 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700'}`}
            >
              Semua Bahan
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-widest border-2 transition-all ${activeCategory === cat.id ? 'bg-orange-100 text-orange-800 border-orange-300 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-gray-400 font-bold text-lg">Memuat Katalog Bahan...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Box className="w-20 h-20 mb-4 opacity-50" />
              <p className="font-black text-xl uppercase tracking-tighter">Tidak Ditemukan</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 pb-20">
              {filteredProducts.map(p => {
                const isOutOfStock = p.stock_quantity <= 0;
                return (
                  <button 
                    key={p.id}
                    onClick={() => handleAddToCart(p)}
                    className="bg-white border-2 border-transparent hover:border-orange-500 hover:shadow-xl hover:-translate-y-1 active:scale-95 shadow-sm rounded-2xl overflow-hidden transition-all text-left flex flex-col group"
                  >
                    <div className="aspect-square flex items-center justify-center border-b-2 border-gray-50 relative transition-colors group-hover:bg-orange-50 bg-gray-50">
                      <Box className="w-16 h-16 transition-colors text-gray-300 group-hover:text-orange-400" />
                      {p.stock_quantity <= 5 ? (
                        <span className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase shadow-sm">Sisa {p.stock_quantity}</span>
                      ) : (
                        <span className="absolute top-3 right-3 bg-white text-gray-600 border border-gray-200 text-[10px] font-black px-2 py-1 rounded-lg uppercase shadow-sm">{p.stock_quantity} Stok</span>
                      )}
                    </div>
                    
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <h4 className="font-black text-black text-sm leading-snug line-clamp-2">{p.name}</h4>
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
