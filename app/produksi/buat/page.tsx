"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Save, Search, Hammer, Box, ArrowLeft, History } from 'lucide-react';

interface LineItem {
  uid: string;
  product_id: string;
  name: string;
  quantity: string;
  searchTerm: string;
  showSuggestions: boolean;
}

const emptyLine = (): LineItem => ({
  uid: crypto.randomUUID(),
  product_id: '',
  name: '',
  quantity: '',
  searchTerm: '',
  showSuggestions: false,
});

export default function BuatSPKPage() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]); // Finished products
  const [allProducts, setAllProducts] = useState<any[]>([]); // Raw products
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    spk_number: `SPK-${Date.now().toString().slice(-6)}`,
    target_product_id: '',
    target_quantity: '',
  });

  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);

  // Floating UI Logic
  const [activeLineUid, setActiveLineUid] = useState<string | null>(null);
  const [inputRect, setInputRect] = useState<DOMRect | null>(null);
  const activeInputRef = useRef<HTMLInputElement | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (activeInputRef.current) {
        setInputRect(activeInputRef.current.getBoundingClientRect());
      }
    };
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [activeLineUid]);

  const onInputFocus = (uid: string, e: React.FocusEvent<HTMLInputElement>) => {
    setActiveLineUid(uid);
    activeInputRef.current = e.target;
    setInputRect(e.target.getBoundingClientRect());
    updateLine(uid, { showSuggestions: true });
  };

  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isOutsideInput = activeInputRef.current && !activeInputRef.current.contains(event.target as Node);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target as Node);

      if (isOutsideInput && isOutsideDropdown) {
        setLines(prev => prev.map(l => ({ ...l, showSuggestions: false })));
        setActiveLineUid(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const [finishedRes, rawRes] = await Promise.all([
        supabase.from('products').select('id, name').eq('type', 'FINISHED').eq('is_active', true).order('name'),
        supabase.from('products').select('id, name, stock_quantity').eq('type', 'RAW').eq('is_active', true).order('name'),
      ]);
      setProducts(finishedRes.data || []);
      setAllProducts(rawRes.data || []);
      setIsLoading(false);
    })();
  }, []);

  const updateLine = (uid: string, patch: Partial<LineItem>) => {
    setLines(prev => prev.map(l => l.uid === uid ? { ...l, ...patch } : l));
  };

  const removeLine = (uid: string) => {
    setLines(prev => prev.length <= 1 ? [emptyLine()] : prev.filter(l => l.uid !== uid));
  };

  const selectProduct = (uid: string, product: any) => {
    updateLine(uid, {
      product_id: product.id,
      name: product.name,
      searchTerm: product.name,
      showSuggestions: false,
    });
    setActiveLineUid(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.target_product_id || Number(formData.target_quantity) <= 0) {
      return alert('Mohon lengkapi produk jadi dan target produksi!');
    }
    
    // Allow submitting without raw materials, or validate if they added rows
    const validLines = lines.filter(l => l.product_id);
    // Note: the previous logic allowed quantity 0 for logs. If they enter a quantity, we use it, otherwise 0.

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

      if (validLines.length > 0) {
        const { error: logsError } = await supabase
          .from('production_logs')
          .insert(validLines.map(l => ({
            production_order_id: newSpkId,
            product_id: l.product_id,
            quantity: Number(l.quantity) || 0,
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

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/produksi" className="p-2 hover:bg-gray-200 text-gray-600 rounded-xl border-2 border-gray-200 bg-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-black text-black uppercase tracking-tight">Buat Work Order (SPK)</h1>
          </div>
          <div className="text-[10px] font-black text-orange-600 bg-orange-100 px-3 py-1.5 rounded-lg border-2 border-orange-200 shadow-sm uppercase tracking-widest">
            {formData.spk_number}
          </div>
        </div>

        {/* SPK Target Details */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Barang Jadi Yang Diproduksi</label>
              <select required value={formData.target_product_id} onChange={e => setFormData({...formData, target_product_id: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl font-bold text-black focus:border-orange-500 outline-none bg-white transition-all">
                <option value="">-- Pilih Barang Jadi --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Target Jumlah Produksi (Dus)</label>
              <input type="number" min="1" required value={formData.target_quantity} onChange={e => setFormData({...formData, target_quantity: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl font-black text-orange-700 focus:border-orange-500 outline-none transition-all placeholder:text-gray-300" placeholder="0" />
            </div>
          </div>
        </div>

        {/* Raw Material Table */}
        <div ref={tableRef} className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm">
          <div className="p-4 bg-orange-50 border-b-2 border-orange-100 flex items-center gap-3">
            <Box className="w-5 h-5 text-orange-600" />
            <h2 className="font-black text-black uppercase text-sm tracking-wider">Bahan Baku Mentah <span className="text-gray-500 font-bold text-xs">(Opsional)</span></h2>
          </div>

          {/* ===== DESKTOP TABLE (md+) ===== */}
          <div className="hidden md:block overflow-x-auto" ref={tableContainerRef}>
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase w-[5%] text-center">No</th>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase w-[60%]">Deskripsi Bahan Mentah</th>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase w-[20%] text-center">Estimasi QTY</th>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase w-[15%] text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((line, idx) => (
                  <tr key={line.uid} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 text-center font-bold text-gray-400 text-sm">{idx + 1}</td>
                    <td className="py-3 px-4 align-top">
                      <div className="relative">
                        <input type="text" value={line.product_id ? line.name : line.searchTerm}
                          onChange={e => { updateLine(line.uid, { searchTerm: e.target.value, showSuggestions: true, product_id: '', name: '' }); setInputRect(e.target.getBoundingClientRect()); }}
                          onFocus={(e) => onInputFocus(line.uid, e)} placeholder="Ketik nama bahan baku..."
                          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-black font-semibold focus:border-orange-500 outline-none text-sm transition-all" />
                        {typeof document !== 'undefined' && line.showSuggestions && activeLineUid === line.uid && inputRect && createPortal(
                          <div ref={dropdownRef} className="fixed z-[9999] bg-white border-2 border-orange-500 rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden"
                            style={{ top: inputRect.bottom + 4, left: inputRect.left, width: inputRect.width }}>
                            {(() => {
                              const suggestions = allProducts.filter(p => p.name.toLowerCase().includes(line.searchTerm.toLowerCase())).slice(0, 10);
                              if (suggestions.length > 0) return suggestions.map(p => (
                                <button key={p.id} type="button" onMouseDown={e => { e.preventDefault(); selectProduct(line.uid, p); }}
                                  className="w-full px-4 py-3 text-left hover:bg-orange-50 flex items-center gap-3 border-b border-gray-100 last:border-0 transition-colors group">
                                  <Search className="w-4 h-4 text-orange-400 group-hover:text-orange-600" />
                                  <div className="flex-1 flex justify-between items-center min-w-0">
                                    <span className="font-bold text-black text-sm truncate">{p.name}</span>
                                    <span className="shrink-0 text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded uppercase ml-2 border border-orange-200">Stok: {p.stock_quantity}</span>
                                  </div>
                                </button>
                              ));
                              if (line.searchTerm.length > 0) return <div className="px-4 py-6 text-sm font-bold text-gray-400 text-center italic flex flex-col items-center gap-2"><Search className="w-8 h-8 text-gray-200" /><span>"{line.searchTerm}" tidak ditemukan</span></div>;
                              return <div className="px-4 py-4 text-xs font-bold text-gray-400 text-center uppercase tracking-widest">Silahkan ketik nama bahan...</div>;
                            })()}
                          </div>, document.body
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-top"><input type="number" step="any" min="0" value={line.quantity} onChange={e => updateLine(line.uid, { quantity: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-black font-bold focus:border-orange-500 outline-none text-sm text-center transition-all" placeholder="0" /></td>
                    <td className="py-3 px-4 text-center align-top"><button type="button" onClick={() => removeLine(line.uid)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ===== MOBILE CARD LIST (< md) ===== */}
          <div className="md:hidden divide-y divide-gray-100">
            {lines.map((line, idx) => (
              <div key={line.uid} className="p-4 space-y-3 bg-white">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bahan #{idx + 1}</span>
                  <button type="button" onClick={() => removeLine(line.uid)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg border border-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nama Bahan Mentah</label>
                  <div className="relative">
                    <input type="text" value={line.product_id ? line.name : line.searchTerm}
                      onChange={e => { updateLine(line.uid, { searchTerm: e.target.value, showSuggestions: true, product_id: '', name: '' }); setInputRect(e.target.getBoundingClientRect()); }}
                      onFocus={(e) => onInputFocus(line.uid, e)} placeholder="Ketik nama bahan baku..."
                      className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-black font-semibold focus:border-orange-500 outline-none text-sm" />
                    {typeof document !== 'undefined' && line.showSuggestions && activeLineUid === line.uid && inputRect && createPortal(
                      <div ref={dropdownRef} className="fixed z-[9999] bg-white border-2 border-orange-500 rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden"
                        style={{ top: inputRect.bottom + 4, left: inputRect.left, width: Math.min(inputRect.width, window.innerWidth - 32) }}>
                        {(() => {
                          const suggestions = allProducts.filter(p => p.name.toLowerCase().includes(line.searchTerm.toLowerCase())).slice(0, 10);
                          if (suggestions.length > 0) return suggestions.map(p => (
                            <button key={p.id} type="button" onMouseDown={e => { e.preventDefault(); selectProduct(line.uid, p); }}
                              className="w-full px-4 py-3 text-left hover:bg-orange-50 flex items-center gap-3 border-b border-gray-100 last:border-0 transition-colors">
                              <div className="flex-1 flex justify-between items-center min-w-0">
                                <span className="font-bold text-black text-sm truncate">{p.name}</span>
                                <span className="shrink-0 text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded uppercase ml-2">Stok: {p.stock_quantity}</span>
                              </div>
                            </button>
                          ));
                          if (line.searchTerm.length > 0) return <div className="px-4 py-4 text-sm font-bold text-gray-400 text-center italic">"{line.searchTerm}" tidak ditemukan</div>;
                          return <div className="px-4 py-3 text-xs font-bold text-gray-400 text-center uppercase">Ketik nama bahan...</div>;
                        })()}
                      </div>, document.body
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Estimasi QTY</label>
                  <input type="number" step="any" min="0" value={line.quantity} onChange={e => updateLine(line.uid, { quantity: e.target.value })} className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-black font-bold focus:border-orange-500 outline-none text-sm text-center" placeholder="0" />
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <button type="button" onClick={() => setLines([...lines, emptyLine()])}
              className="text-orange-700 font-bold hover:bg-orange-50 flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-orange-200 transition-all text-sm bg-white shadow-sm">
              <Plus className="w-4 h-4" /> Tambah Bahan
            </button>
          </div>
        </div>


        {/* Footer Actions */}
        <div className="flex gap-3 pt-4">
          <button type="button" onClick={() => { setLines([emptyLine()]); setFormData({...formData, target_product_id: '', target_quantity: ''}) }}
            className="w-[100px] shrink-0 py-4 bg-white text-red-600 hover:bg-red-50 font-black text-xs uppercase rounded-xl border-2 border-red-200 transition-colors flex flex-col justify-center items-center gap-1 shadow-sm">
            <Trash2 className="w-5 h-5" /> Reset
          </button>
          <button type="submit" disabled={isSubmitting}
            className="flex-1 py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:text-gray-500 text-white font-black text-lg uppercase rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 border-b-4 border-orange-800">
            <Hammer className="w-6 h-6" /> {isSubmitting ? 'MEMPROSES...' : 'BUAT SPK'}
          </button>
        </div>
      </form>
    </div>
  );
}
