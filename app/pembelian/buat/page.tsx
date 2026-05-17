"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Trash2, Save, Search, ShoppingCart, Box } from 'lucide-react';

// Helper: angka ke terbilang Indonesia
function terbilang(n: number): string {
  if (n === 0) return 'Nol Rupiah';
  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  const convert = (x: number): string => {
    if (x < 12) return satuan[x];
    if (x < 20) return satuan[x - 10] + ' Belas';
    if (x < 100) return satuan[Math.floor(x / 10)] + ' Puluh' + (x % 10 ? ' ' + satuan[x % 10] : '');
    if (x < 200) return 'Seratus' + (x - 100 ? ' ' + convert(x - 100) : '');
    if (x < 1000) return satuan[Math.floor(x / 100)] + ' Ratus' + (x % 100 ? ' ' + convert(x % 100) : '');
    if (x < 2000) return 'Seribu' + (x - 1000 ? ' ' + convert(x - 1000) : '');
    if (x < 1000000) return convert(Math.floor(x / 1000)) + ' Ribu' + (x % 1000 ? ' ' + convert(x % 1000) : '');
    if (x < 1000000000) return convert(Math.floor(x / 1000000)) + ' Juta' + (x % 1000000 ? ' ' + convert(x % 1000000) : '');
    if (x < 1000000000000) return convert(Math.floor(x / 1000000000)) + ' Miliar' + (x % 1000000000 ? ' ' + convert(x % 1000000000) : '');
    return convert(Math.floor(x / 1000000000000)) + ' Triliun' + (x % 1000000000000 ? ' ' + convert(x % 1000000000000) : '');
  };
  return convert(Math.round(n)) + ' Rupiah';
}

interface LineItem {
  uid: string;
  product_id: string;
  name: string;
  quantity: string;
  harga_satuan: string;
  harga_perkilo: string;
  tonase: string;
  searchTerm: string;
  showSuggestions: boolean;
}

const emptyLine = (): LineItem => ({
  uid: crypto.randomUUID(),
  product_id: '',
  name: '',
  quantity: '',
  harga_satuan: '',
  harga_perkilo: '',
  tonase: '',
  searchTerm: '',
  showSuggestions: false,
});

export default function BuatPOPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactId, setContactId] = useState('');
  const [createdAt, setCreatedAt] = useState(new Date().toISOString().split('T')[0]);
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [keterangan, setKeterangan] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Floating UI Logic
  const [activeLineUid, setActiveLineUid] = useState<string | null>(null);
  const [inputRect, setInputRect] = useState<DOMRect | null>(null);
  const activeInputRef = useRef<HTMLInputElement | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

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
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close if click is outside both the active input AND the dropdown portal
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
      const [sRes, pRes] = await Promise.all([
        supabase.from('contacts').select('id, name').eq('type', 'SUPPLIER').eq('is_active', true).order('name'),
        supabase.from('products').select('id, name, stock_quantity').eq('type', 'RAW').eq('is_active', true).order('name'),
      ]);
      setSuppliers(sRes.data || []);
      setAllProducts(pRes.data || []);
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

  // Calculations
  const lineTotal = (l: LineItem) => Math.round(Number(l.quantity || 0) * Number(l.harga_satuan || 0));
  const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0);
  const grandTotal = subtotal; 

  const formatRp = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(n);
  const formatNum = (n: string) => n ? new Intl.NumberFormat('id-ID').format(Number(n)) : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactId) return alert('Pilih Supplier!');
    const validLines = lines.filter(l => l.product_id && Number(l.quantity) > 0);
    if (validLines.length === 0) return alert('Isi minimal 1 barang!');

    setIsSubmitting(true);
    try {
      const { data: txData, error: txError } = await supabase.from('transactions').insert([{
        contact_id: contactId, type: 'PO_INBOUND',
        status: 'PAID', 
        total_amount: grandTotal,
        amount_paid: grandTotal,
        created_at: createdAt,
        notes: JSON.stringify({ 
          keterangan: keterangan || null,
          item_meta: validLines.map(l => ({ product_id: l.product_id, price_per_kg: l.harga_perkilo, tonase: l.tonase }))
        }),
      }]).select().single();
      if (txError) throw txError;

      const { error: itemsErr } = await supabase.from('transaction_items').insert(
        validLines.map(l => ({
          transaction_id: txData.id, product_id: l.product_id,
          quantity: Number(l.quantity), price: Number(l.harga_satuan),
          tonase: Number(l.tonase) || 0
        }))
      );
      if (itemsErr) throw itemsErr;

      alert('PO berhasil dibuat!');
      router.push('/pembelian');
      router.refresh();
    } catch (err: any) { alert('Error: ' + err.message); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => router.back()} className="p-2 hover:bg-gray-200 text-gray-600 rounded-xl border-2 border-gray-200 bg-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-black text-black uppercase tracking-tight">Buat Pembelian (PO)</h1>
        </div>

        <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Supplier</label>
              <select required value={contactId} onChange={e => setContactId(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl font-bold text-black focus:border-blue-600 outline-none bg-white">
                <option value="">-- Pilih Supplier --</option>
                {suppliers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Tanggal PO</label>
              <input type="date" value={createdAt} onChange={e => setCreatedAt(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl font-bold text-black focus:border-blue-600 outline-none" />
            </div>
          </div>
        </div>

        <div ref={tableRef} className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm">
          <div className="p-4 bg-gray-50 border-b-2 border-gray-100 flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <h2 className="font-black text-black uppercase text-sm tracking-wider">Daftar Bahan Mentah {allProducts.length > 0 ? `(${allProducts.length})` : isLoading ? '(Memuat...)' : '(0)'}</h2>
          </div>
          <div className="overflow-x-auto" ref={tableContainerRef}>
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase w-[5%] text-center">No</th>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase w-[30%]">Deskripsi Barang</th>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase w-[10%] text-center">QTY</th>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase w-[10%] text-center">Tonase</th>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase w-[15%] text-right">Harga /kg</th>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase w-[15%] text-right">Harga Satuan</th>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase w-[15%] text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((line, idx) => {
                  return (
                    <tr key={line.uid} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4 text-center font-bold text-gray-400 text-sm">{idx + 1}</td>
                      <td className="py-3 px-4 align-top">
                        <div className="relative">
                          <input
                            type="text"
                            value={line.product_id ? line.name : line.searchTerm}
                            onChange={e => {
                              updateLine(line.uid, { searchTerm: e.target.value, showSuggestions: true, product_id: '', name: '' });
                              setInputRect(e.target.getBoundingClientRect());
                            }}
                            onFocus={(e) => onInputFocus(line.uid, e)}
                            placeholder="Ketik nama bahan..."
                            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-black font-semibold focus:border-blue-600 outline-none text-sm"
                          />
                          {typeof document !== 'undefined' && line.showSuggestions && activeLineUid === line.uid && inputRect && createPortal(
                            <div 
                              ref={dropdownRef}
                              className="fixed z-[9999] bg-white border-2 border-blue-600 rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden"
                              style={{
                                top: inputRect.bottom + 4,
                                left: inputRect.left,
                                width: inputRect.width,
                              }}
                            >
                              {(() => {
                                const suggestions = allProducts.filter(p => 
                                  p.name.toLowerCase().includes(line.searchTerm.toLowerCase())
                                ).slice(0, 10);

                                if (suggestions.length > 0) {
                                  return suggestions.map(p => (
                                    <button key={p.id} type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        selectProduct(line.uid, p);
                                      }}
                                      className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center gap-3 border-b border-gray-100 last:border-0 transition-colors group">
                                      <Box className="w-4 h-4 text-blue-400 group-hover:text-blue-600" />
                                      <div className="flex-1 flex justify-between items-center min-w-0">
                                        <span className="font-bold text-black text-sm truncate">{p.name}</span>
                                        <span className="shrink-0 text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase ml-2 border border-blue-100">
                                          Stok: {p.stock_quantity}
                                        </span>
                                      </div>
                                    </button>
                                  ));
                                }
                                
                                if (line.searchTerm.length > 0) {
                                  return (
                                    <div className="px-4 py-6 text-sm font-bold text-gray-400 text-center italic flex flex-col items-center gap-2">
                                      <Search className="w-8 h-8 text-gray-200" />
                                      <span>"{line.searchTerm}" tidak ditemukan</span>
                                    </div>
                                  );
                                }

                                return (
                                  <div className="px-4 py-4 text-xs font-bold text-gray-400 text-center uppercase tracking-widest">
                                    Silahkan ketik nama barang...
                                  </div>
                                );
                              })()}
                            </div>,
                            document.body
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <input type="number" step="any" min="0" value={line.quantity}
                          onChange={e => updateLine(line.uid, { quantity: e.target.value })}
                          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-black font-bold focus:border-blue-600 outline-none text-sm text-center" placeholder="0" />
                      </td>
                      <td className="py-3 px-4 align-top">
                        <input type="number" step="any" min="0" value={line.tonase}
                          onChange={e => updateLine(line.uid, { tonase: e.target.value })}
                          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-black font-bold focus:border-blue-600 outline-none text-sm text-center" placeholder="0" />
                      </td>
                      <td className="py-3 px-4 align-top">
                        <input type="text" value={formatNum(line.harga_perkilo)}
                          onChange={e => updateLine(line.uid, { harga_perkilo: e.target.value.replace(/[^0-9]/g, '') })}
                          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-black font-bold focus:border-blue-600 outline-none text-sm text-right" placeholder="0" />
                      </td>
                      <td className="py-3 px-4 align-top">
                        <input type="text" value={formatNum(line.harga_satuan)}
                          onChange={e => updateLine(line.uid, { harga_satuan: e.target.value.replace(/[^0-9]/g, '') })}
                          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-black font-bold focus:border-blue-600 outline-none text-sm text-right" placeholder="0" />
                      </td>
                      <td className="py-3 px-4 align-top text-right">
                        <span className="font-black text-black text-sm">{formatRp(lineTotal(line))}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/30">
            <button type="button" onClick={() => setLines([...lines, emptyLine()])}
              className="text-blue-700 font-bold hover:bg-blue-50 flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-blue-200 transition-all text-sm bg-white">
              <Plus className="w-4 h-4" /> Tambah Baris
            </button>
            <div className="flex items-center gap-4 pr-4">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Baris: {lines.length}</span>
            </div>
          </div>
        </div>

        {/* Totals, Terbilang, Keterangan */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Terbilang + Keterangan */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 shadow-sm">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Terbilang</label>
              <p className="text-sm font-black text-blue-800 italic leading-relaxed">
                {grandTotal > 0 ? terbilang(grandTotal) : '-'}
              </p>
            </div>
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 shadow-sm">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Keterangan PO</label>
              <textarea value={keterangan} onChange={e => setKeterangan(e.target.value)} rows={3}
                placeholder="Catatan tambahan untuk supplier..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl font-semibold text-black focus:border-blue-600 outline-none text-sm resize-none" />
            </div>
          </div>

          {/* Right: Totals + Actions */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 shadow-sm space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between pt-3 border-t-2 border-gray-100 items-end">
                  <span className="text-sm font-black text-black uppercase tracking-widest">Total Tagihan PO</span>
                  <span className="text-3xl font-black text-blue-700 tracking-tighter">{formatRp(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button type="button" onClick={() => { setLines([emptyLine()]); setKeterangan(''); }}
                className="w-[72px] shrink-0 py-3 bg-white text-red-600 hover:bg-red-50 font-black text-[10px] uppercase rounded-xl border-2 border-red-200 transition-colors flex flex-col justify-center items-center gap-1">
                <Trash2 className="w-5 h-5" /> Reset
              </button>
              <button type="submit" disabled={isSubmitting || lines.every(l => !l.product_id)}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-black text-lg uppercase rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 border-b-4 border-blue-800">
                <Save className="w-6 h-6" /> {isSubmitting ? 'MEMPROSES...' : 'SIMPAN PEMBELIAN (PO)'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
