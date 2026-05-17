"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Save, Search, ShoppingCart, History } from 'lucide-react';

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
  searchTerm: '',
  showSuggestions: false,
});

export default function PenjualanKasirPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
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

  // Payment mode
  const [isRecurring, setIsRecurring] = useState(false);
  const [tenor, setTenor] = useState<number | string>(1);
  const [dpPercent, setDpPercent] = useState<number | string>(0);

  // Discount
  const [discountType, setDiscountType] = useState<'persen' | 'nominal'>('persen');
  const [discountValue, setDiscountValue] = useState('');

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
      const [cRes, pRes] = await Promise.all([
        supabase.from('contacts').select('id, name').eq('type', 'CUSTOMER').eq('is_active', true).order('name'),
        supabase.from('products').select('id, name, stock_quantity, dimensions').eq('type', 'FINISHED').eq('is_active', true).order('name'),
      ]);
      setCustomers(cRes.data || []);
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
      harga_satuan: product.dimensions?.selling_price?.toString() || '',
    });
    setActiveLineUid(null);
  };

  // Calculations
  const lineTotal = (l: LineItem) => Math.round(Number(l.quantity || 0) * Number(l.harga_satuan || 0));
  const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0);
  const discountAmount = discountType === 'persen'
    ? Math.round(subtotal * (Number(discountValue) / 100))
    : Math.min(Number(discountValue) || 0, subtotal);
  const grandTotal = Math.max(0, subtotal - discountAmount);

  const formatRp = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(n);
  const formatNum = (n: string) => n ? new Intl.NumberFormat('id-ID').format(Number(n)) : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactId) return alert('Pilih Pelanggan!');
    const validLines = lines.filter(l => l.product_id && Number(l.quantity) > 0);
    if (validLines.length === 0) return alert('Isi minimal 1 barang!');

    const dpAmount = Math.floor(grandTotal * (Number(dpPercent) / 100));
    if (isRecurring && dpAmount >= grandTotal && grandTotal > 0) return alert('DP tidak boleh 100% atau lebih!');
    if (isRecurring && (!tenor || Number(tenor) <= 0)) return alert('Tenor minimal 1 bulan!');

    setIsSubmitting(true);
    try {
      const discountMeta = discountValue && Number(discountValue) > 0 ? {
        discount_type: discountType, discount_value: Number(discountValue),
        discount_amount: discountAmount, subtotal_before_discount: subtotal
      } : null;

      const { data: txData, error: txError } = await supabase.from('transactions').insert([{
        contact_id: contactId, type: 'SO_OUTBOUND',
        status: isRecurring ? 'UNPAID' : 'PAID',
        total_amount: grandTotal,
        amount_paid: isRecurring ? dpAmount : grandTotal,
        created_at: createdAt,
        notes: JSON.stringify({ 
          ...(discountMeta || {}), 
          keterangan: keterangan || null,
          item_meta: validLines.map(l => ({ product_id: l.product_id, price_per_kg: l.harga_perkilo }))
        }),
      }]).select().single();
      if (txError) throw txError;

      const { error: itemsErr } = await supabase.from('transaction_items').insert(
        validLines.map(l => ({
          transaction_id: txData.id, product_id: l.product_id,
          quantity: Number(l.quantity), price: Number(l.harga_satuan),
        }))
      );
      if (itemsErr) throw itemsErr;

      // Payment schedules for recurring
      if (isRecurring && Number(tenor) > 0) {
        const remaining = grandTotal - dpAmount;
        const base = remaining > 0 ? Math.floor(remaining / Number(tenor)) : 0;
        const rem = remaining - base * Number(tenor);
        const schedules: any[] = [];
        const [yr, mo, dy] = createdAt.split('-').map(Number);
        if (dpAmount > 0) schedules.push({ transaction_id: txData.id, amount_to_pay: dpAmount, due_date: createdAt, status: 'UNPAID' });
        if (remaining > 0) {
          for (let i = 0; i < Number(tenor); i++) {
            const d = new Date(yr, mo - 1 + i + 1, dy);
            const exp = ((mo - 1 + i + 1) % 12 + 12) % 12;
            if (d.getMonth() !== exp) d.setDate(0);
            schedules.push({ transaction_id: txData.id, amount_to_pay: i === Number(tenor) - 1 ? base + rem : base, due_date: d.toISOString().split('T')[0], status: 'UNPAID' });
          }
        }
        await supabase.from('payment_schedules').insert(schedules);
      }

      alert('Penjualan berhasil!');
      router.push(`/penjualan/${txData.id}/cetak`);
      router.refresh();
    } catch (err: any) { alert('Error: ' + err.message); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black text-black uppercase tracking-tight">Penjualan (Mode Kasir)</h1>
          </div>
          <Link href="/penjualan/riwayat" className="w-full md:w-auto bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-300 px-6 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-sm transition-all uppercase tracking-wider">
            <History className="w-5 h-5" /> Lihat Riwayat
          </Link>
        </div>

        {/* Customer & Date */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Pelanggan</label>
              <select required value={contactId} onChange={e => setContactId(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl font-bold text-black focus:border-purple-600 outline-none bg-white">
                <option value="">-- Pilih Customer --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Tanggal</label>
              <input type="date" value={createdAt} onChange={e => setCreatedAt(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl font-bold text-black focus:border-purple-600 outline-none" />
            </div>
          </div>
        </div>

        {/* Invoice Table */}
        <div ref={tableRef} className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm">
          <div className="p-4 bg-gray-50 border-b-2 border-gray-100 flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-purple-600" />
            <h2 className="font-black text-black uppercase text-sm tracking-wider">Daftar Barang {allProducts.length > 0 ? `(${allProducts.length})` : isLoading ? '(Memuat...)' : '(0)'}</h2>
          </div>

          {/* ===== DESKTOP TABLE (md+) ===== */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="bg-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase w-[5%] text-center">No</th>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase w-[35%]">Deskripsi Barang</th>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase w-[10%] text-center">QTY</th>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase w-[15%] text-right">Harga /kg</th>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase w-[15%] text-right">Harga Satuan</th>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase w-[15%] text-right">Jumlah</th>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-500 uppercase w-[5%] text-center">Aksi</th>
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
                          onFocus={(e) => onInputFocus(line.uid, e)}
                          placeholder="Ketik nama barang..."
                          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-black font-semibold focus:border-purple-600 outline-none text-sm" />
                        {typeof document !== 'undefined' && line.showSuggestions && activeLineUid === line.uid && inputRect && createPortal(
                          <div ref={dropdownRef} className="fixed z-[9999] bg-white border-2 border-purple-600 rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden"
                            style={{ top: inputRect.bottom + 4, left: inputRect.left, width: inputRect.width }}>
                            {(() => {
                              const suggestions = allProducts.filter(p => p.name.toLowerCase().includes(line.searchTerm.toLowerCase())).slice(0, 10);
                              if (suggestions.length > 0) return suggestions.map(p => (
                                <button key={p.id} type="button" onMouseDown={e => { e.preventDefault(); selectProduct(line.uid, p); }}
                                  className="w-full px-4 py-3 text-left hover:bg-purple-50 flex items-center gap-3 border-b border-gray-100 last:border-0 transition-colors group">
                                  <Search className="w-4 h-4 text-purple-400 group-hover:text-purple-600" />
                                  <div className="flex-1 flex justify-between items-center min-w-0">
                                    <span className="font-bold text-black text-sm truncate">{p.name}</span>
                                    <span className="shrink-0 text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded uppercase ml-2 border border-purple-100">Stok: {p.stock_quantity}</span>
                                  </div>
                                </button>
                              ));
                              if (line.searchTerm.length > 0) return <div className="px-4 py-6 text-sm font-bold text-gray-400 text-center italic flex flex-col items-center gap-2"><Search className="w-8 h-8 text-gray-200" /><span>"{line.searchTerm}" tidak ditemukan</span></div>;
                              return <div className="px-4 py-4 text-xs font-bold text-gray-400 text-center uppercase tracking-widest">Silahkan ketik nama barang...</div>;
                            })()}
                          </div>, document.body
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-top"><input type="number" step="any" min="0" value={line.quantity} onChange={e => updateLine(line.uid, { quantity: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-black font-bold focus:border-purple-600 outline-none text-sm text-center" placeholder="0" /></td>
                    <td className="py-3 px-4 align-top"><input type="text" value={formatNum(line.harga_perkilo)} onChange={e => updateLine(line.uid, { harga_perkilo: e.target.value.replace(/[^0-9]/g, '') })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-black font-bold focus:border-purple-600 outline-none text-sm text-right" placeholder="0" /></td>
                    <td className="py-3 px-4 align-top"><input type="text" value={formatNum(line.harga_satuan)} onChange={e => updateLine(line.uid, { harga_satuan: e.target.value.replace(/[^0-9]/g, '') })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-black font-bold focus:border-purple-600 outline-none text-sm text-right" placeholder="0" /></td>
                    <td className="py-3 px-4 align-top text-right"><span className="font-black text-black text-sm">{formatRp(lineTotal(line))}</span></td>
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
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Item #{idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-purple-700">{formatRp(lineTotal(line))}</span>
                    <button type="button" onClick={() => removeLine(line.uid)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Deskripsi Barang</label>
                  <div className="relative">
                    <input type="text" value={line.product_id ? line.name : line.searchTerm}
                      onChange={e => { updateLine(line.uid, { searchTerm: e.target.value, showSuggestions: true, product_id: '', name: '' }); setInputRect(e.target.getBoundingClientRect()); }}
                      onFocus={(e) => onInputFocus(line.uid, e)}
                      placeholder="Ketik nama barang..."
                      className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-black font-semibold focus:border-purple-600 outline-none text-sm" />
                    {typeof document !== 'undefined' && line.showSuggestions && activeLineUid === line.uid && inputRect && createPortal(
                      <div ref={dropdownRef} className="fixed z-[9999] bg-white border-2 border-purple-600 rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden"
                        style={{ top: inputRect.bottom + 4, left: inputRect.left, width: Math.min(inputRect.width, window.innerWidth - 32) }}>
                        {(() => {
                          const suggestions = allProducts.filter(p => p.name.toLowerCase().includes(line.searchTerm.toLowerCase())).slice(0, 10);
                          if (suggestions.length > 0) return suggestions.map(p => (
                            <button key={p.id} type="button" onMouseDown={e => { e.preventDefault(); selectProduct(line.uid, p); }}
                              className="w-full px-4 py-3 text-left hover:bg-purple-50 flex items-center gap-3 border-b border-gray-100 last:border-0 transition-colors">
                              <div className="flex-1 flex justify-between items-center min-w-0">
                                <span className="font-bold text-black text-sm truncate">{p.name}</span>
                                <span className="shrink-0 text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded uppercase ml-2">Stok: {p.stock_quantity}</span>
                              </div>
                            </button>
                          ));
                          if (line.searchTerm.length > 0) return <div className="px-4 py-4 text-sm font-bold text-gray-400 text-center italic">"{line.searchTerm}" tidak ditemukan</div>;
                          return <div className="px-4 py-3 text-xs font-bold text-gray-400 text-center uppercase">Ketik nama barang...</div>;
                        })()}
                      </div>, document.body
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">QTY</label>
                    <input type="number" step="any" min="0" value={line.quantity} onChange={e => updateLine(line.uid, { quantity: e.target.value })} className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-black font-bold focus:border-purple-600 outline-none text-sm text-center" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Harga/kg</label>
                    <input type="text" value={formatNum(line.harga_perkilo)} onChange={e => updateLine(line.uid, { harga_perkilo: e.target.value.replace(/[^0-9]/g, '') })} className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-black font-bold focus:border-purple-600 outline-none text-sm text-right" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Satuan</label>
                    <input type="text" value={formatNum(line.harga_satuan)} onChange={e => updateLine(line.uid, { harga_satuan: e.target.value.replace(/[^0-9]/g, '') })} className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-black font-bold focus:border-purple-600 outline-none text-sm text-right" placeholder="0" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-100">
            <button type="button" onClick={() => setLines([...lines, emptyLine()])}
              className="text-purple-700 font-bold hover:bg-purple-50 flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-purple-200 transition-all text-sm">
              <Plus className="w-4 h-4" /> Tambah Baris
            </button>
          </div>
        </div>

        {/* Totals, Terbilang, Keterangan */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Terbilang + Keterangan */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 shadow-sm">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Terbilang</label>
              <p className="text-sm font-black text-purple-800 italic leading-relaxed">
                {grandTotal > 0 ? terbilang(grandTotal) : '-'}
              </p>
            </div>
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 shadow-sm">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Keterangan</label>
              <textarea value={keterangan} onChange={e => setKeterangan(e.target.value)} rows={3}
                placeholder="Catatan tambahan (opsional)..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl font-semibold text-black focus:border-purple-600 outline-none text-sm resize-none" />
            </div>
          </div>

          {/* Right: Totals + Payment */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 shadow-sm space-y-3">
              {/* Payment Mode */}
              <div className="flex p-1 bg-gray-100 rounded-xl border border-gray-200">
                <button type="button" onClick={() => setIsRecurring(false)}
                  className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all ${!isRecurring ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'}`}>LUNAS (TUNAI)</button>
                <button type="button" onClick={() => setIsRecurring(true)}
                  className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all ${isRecurring ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'}`}>TEMPO / CICILAN</button>
              </div>
              {isRecurring && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">DP (%)</p>
                    <input type="number" min="0" max="99" value={dpPercent} onChange={e => setDpPercent(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-transparent font-black text-sm text-black outline-none" placeholder="0" />
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Tenor (Bulan)</p>
                    <input type="number" min="1" value={tenor} onChange={e => setTenor(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-transparent font-black text-sm text-black outline-none" placeholder="1" />
                  </div>
                </div>
              )}
              {/* Discount */}
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase">Potongan</p>
                    <button type="button" onClick={() => setDiscountType(discountType === 'persen' ? 'nominal' : 'persen')}
                      className="text-[10px] font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded border border-purple-200">
                      {discountType === 'persen' ? '%' : 'Rp'}
                    </button>
                  </div>
                  <input type="text" placeholder={discountType === 'persen' ? 'Diskon %' : 'Nominal'}
                    value={discountType === 'persen' ? discountValue : formatNum(discountValue)}
                    onChange={e => setDiscountValue(discountType === 'persen' ? e.target.value : e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-transparent font-black text-sm text-black outline-none" />
                </div>
              </div>
              {/* Summary */}
              <div className="space-y-2 pt-3 border-t border-gray-200">
                <div className="flex justify-between text-sm font-bold text-gray-500">
                  <span>Jumlah</span><span>{formatRp(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm font-bold text-red-500">
                    <span>Potongan</span><span>-{formatRp(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t-2 border-gray-100 items-end">
                  <span className="text-sm font-black text-black uppercase tracking-widest">Total</span>
                  <span className="text-3xl font-black text-purple-700 tracking-tighter">{formatRp(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button type="button" onClick={() => { setLines([emptyLine()]); setDiscountValue(''); }}
                className="w-[72px] shrink-0 py-3 bg-white text-red-600 hover:bg-red-50 font-black text-[10px] uppercase rounded-xl border-2 border-red-200 transition-colors flex flex-col justify-center items-center gap-1">
                <Trash2 className="w-5 h-5" /> Batal
              </button>
              <button type="submit" disabled={isSubmitting || lines.every(l => !l.product_id)}
                className="flex-1 py-4 bg-purple-700 hover:bg-purple-800 disabled:bg-gray-300 text-white font-black text-lg uppercase rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 border-b-4 border-purple-900">
                <Save className="w-6 h-6" /> {isSubmitting ? 'MEMPROSES...' : 'SIMPAN PENJUALAN'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
