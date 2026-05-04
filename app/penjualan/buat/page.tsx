"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Trash2, Save, ChevronDown } from 'lucide-react';

export default function BuatSOPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [finishedProducts, setFinishedProducts] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ contact_id: '', created_at: new Date().toISOString().split('T')[0] });
  const [cart, setCart] = useState<any[]>([{ id: crypto.randomUUID(), product_id: '', quantity: '', price: '' }]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [tenor, setTenor] = useState(1);
  const [interval, setIntervalVal] = useState(1);
  const [dpAmount, setDpAmount] = useState<number>(0);
  const [intervalUnit, setIntervalUnit] = useState<'Bulan' | 'Hari'>('Bulan');

  // State Diskon
  const [discountType, setDiscountType] = useState<'persen' | 'nominal'>('persen');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [discountLabel, setDiscountLabel] = useState<string>('');

  useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = async () => {
    try {
      const [customerRes, productRes] = await Promise.all([
        supabase.from('contacts').select('id, name').eq('type', 'CUSTOMER').eq('is_active', true).order('name'),
        supabase.from('products').select('id, name, stock_quantity, dimensions').eq('type', 'FINISHED').eq('is_active', true).order('name')
      ]);
      if (customerRes.error) throw customerRes.error;
      if (productRes.error) throw productRes.error;
      if (customerRes.data) setCustomers(customerRes.data);
      if (productRes.data) setFinishedProducts(productRes.data);
    } catch (error: any) { alert(error.message); }
  };

  const subtotal = cart.reduce((t, i) => t + (Number(i.quantity) * Number(i.price || 0)), 0);
  const discountAmount = discountType === 'persen'
    ? Math.round(subtotal * (Number(discountValue) / 100))
    : Math.min(Number(discountValue) || 0, subtotal);
  const totalTagihan = Math.max(0, subtotal - discountAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contact_id) return alert('Pilih Pelanggan!');
    const validItems = cart.filter(i => i.product_id && i.quantity > 0 && i.price >= 0);
    if (validItems.length === 0) return alert('Isi minimal 1 kardus!');

    // [FIX A] Validasi DP tidak boleh >= Total Tagihan
    if (isRecurring && dpAmount > 0 && dpAmount >= totalTagihan) {
      return alert('Uang Muka (DP) tidak boleh sama atau lebih besar dari Total Tagihan!');
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
        status: 'UNPAID', 
        total_amount: totalTagihan, 
        amount_paid: 0, 
        created_at: formData.created_at,
        notes: discountMeta ? JSON.stringify(discountMeta) : null
      }]).select().single();
      if (txError) throw txError;
      
      const { error: itemsError } = await supabase.from('transaction_items').insert(validItems.map(i => ({ transaction_id: txData.id, product_id: i.product_id, quantity: i.quantity, price: i.price })));
      if (itemsError) throw itemsError;

      if (isRecurring && tenor > 0) {
        const remainingToInstallment = totalTagihan - (dpAmount || 0);
        const baseAmount = remainingToInstallment > 0 ? Math.floor(remainingToInstallment / tenor) : 0;
        const remainder = remainingToInstallment > 0 ? remainingToInstallment - (baseAmount * tenor) : 0;
        const schedules = [];
        
        let [year, month, day] = formData.created_at.split('-').map(Number);

        // DP Schedule (Bulan 0)
        if (dpAmount > 0) {
          schedules.push({
            transaction_id: txData.id,
            amount_to_pay: dpAmount,
            due_date: formData.created_at,
            status: 'UNPAID'
          });
        }

        if (remainingToInstallment > 0) {
          for (let i = 0; i < tenor; i++) {
            let dueStr = '';

            if (intervalUnit === 'Bulan') {
              // [FIX B] Kalkulasi absolut — TIDAK mengubah variabel 'month' di luar loop
              const totalMonthsToAdd = interval * (i + 1);
              // Date constructor JS otomatis menangani overflow bulan & tahun
              const targetDate = new Date(year, month - 1 + totalMonthsToAdd, day);
              // Tangani kasus akhir bulan (misal: 31 Jan + 1 bulan → 28/29 Feb)
              // Jika hari bergeser (overflow), mundurkan ke akhir bulan target
              const expectedMonth = ((month - 1 + totalMonthsToAdd) % 12 + 12) % 12;
              if (targetDate.getMonth() !== expectedMonth) {
                targetDate.setDate(0); // mundur ke hari terakhir bulan sebelumnya
              }
              dueStr = targetDate.toISOString().split('T')[0];
            } else {
              // Interval Hari: kalkulasi absolut dari tanggal awal
              const d = new Date(year, month - 1, day);
              d.setDate(d.getDate() + (interval * (i + 1)));
              dueStr = d.toISOString().split('T')[0];
            }

            const amount = i === tenor - 1 ? baseAmount + remainder : baseAmount;
            schedules.push({
              transaction_id: txData.id,
              amount_to_pay: amount,
              due_date: dueStr,
              status: 'UNPAID'
            });
          }
        }
        
        const { error: scheduleError } = await supabase.from('payment_schedules').insert(schedules);
        if (scheduleError) throw scheduleError;
      }
      
      alert('SO berhasil dibuat!');
      router.push('/penjualan');
      router.refresh();
    } catch (error: any) { 
      alert('Terjadi kesalahan (Mungkin Stok Tidak Cukup): ' + error.message); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  return (
    <div className="p-2 sm:p-4 md:p-8 max-w-5xl mx-auto overflow-x-hidden">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/penjualan" className="p-2 bg-gray-200 hover:bg-gray-300 text-black border-2 border-gray-400 rounded-full"><ArrowLeft className="w-6 h-6" /></Link>
        <h1 className="text-xl md:text-2xl font-bold text-black">Buat Sales Order (SO)</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informasi Pelanggan */}
        <div className="bg-white p-4 md:p-6 rounded-xl border-2 border-gray-300 shadow-md">
          <h2 className="text-lg md:text-xl font-bold text-black mb-4 border-b-2 border-gray-200 pb-2">Informasi Pelanggan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-black mb-2">Pelanggan (Customer)</label>
              <select required value={formData.contact_id} onChange={e => setFormData({...formData, contact_id: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:outline-none bg-white">
                <option value="">-- Pilih Pelanggan --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-black mb-2">Tanggal Transaksi</label>
              <input required type="date" value={formData.created_at} onChange={e => setFormData({...formData, created_at: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:outline-none" />
            </div>
          </div>
          
          <div className="mt-6 border-t-2 border-gray-200 pt-6">
            <div className="flex items-center gap-3 mb-4">
              <input type="checkbox" id="recurring" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="w-5 h-5 accent-purple-700" />
              <label htmlFor="recurring" className="text-sm md:text-base font-bold text-black cursor-pointer">Jadwalkan Pembayaran (Cicilan)</label>
            </div>
            {isRecurring && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-purple-50 p-4 border-2 border-purple-200 rounded-lg">
                <div>
                  <label className="block text-xs font-bold text-purple-900 mb-2">DP - Rp</label>
                  <input type="number" min="0" value={dpAmount || ''} onChange={e => setDpAmount(Number(e.target.value))} className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:outline-none" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-900 mb-2">Cicilan</label>
                  <input required={isRecurring} type="number" min="1" value={tenor} onChange={e => setTenor(Number(e.target.value))} className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-900 mb-2">Satuan</label>
                  <select required={isRecurring} value={intervalUnit} onChange={e => setIntervalUnit(e.target.value as any)} className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:outline-none bg-white">
                    <option value="Bulan">Bulan</option>
                    <option value="Hari">Hari</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-900 mb-2">Interval</label>
                  <input required={isRecurring} type="number" min="1" value={interval} onChange={e => setIntervalVal(Number(e.target.value))} className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:outline-none" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Daftar Pesanan */}
        <div className="bg-white p-3 md:p-6 rounded-xl border-2 border-gray-300 shadow-md">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-lg md:text-xl font-bold text-black uppercase tracking-tight">Daftar Pesanan (Kardus)</h2>
            <button type="button" onClick={() => setCart([...cart, { id: crypto.randomUUID(), product_id: '', quantity: '', price: '' }])} className="w-full sm:w-auto text-purple-700 font-black flex items-center justify-center gap-1 bg-purple-100 px-4 py-3 rounded-xl border-2 border-purple-300 hover:bg-purple-200 transition-colors shadow-sm">
              <Plus className="w-5 h-5" /> TAMBAH BARIS
            </button>
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap border-collapse">
              <thead className="bg-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="px-4 py-3 font-bold text-black">Kardus Jadi</th>
                  <th className="px-4 py-3 font-bold text-black w-32">Kuantitas</th>
                  <th className="px-4 py-3 font-bold text-black w-48">Harga Satuan</th>
                  <th className="px-4 py-3 font-bold text-black text-right">Subtotal</th>
                  <th className="px-2 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
              {cart.map(item => (
                <tr key={item.id}>
                  <td className="py-3 pr-4">
                    <select 
                      required 
                      value={item.product_id} 
                      onChange={e => {
                        const pid = e.target.value;
                        const prod = finishedProducts.find(p => p.id === pid);
                        setCart(cart.map(i => i.id === item.id ? { ...i, product_id: pid, price: prod?.dimensions?.selling_price || i.price } : i));
                      }} 
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg font-semibold focus:border-purple-600 focus:outline-none bg-white"
                    >
                      <option value="">Pilih Kardus...</option>
                      {finishedProducts.map(p => <option key={p.id} value={p.id}>{p.name} (Stok: {p.stock_quantity})</option>)}
                    </select>
                  </td>
                  <td className="py-3 pr-4"><input required type="number" min="1" value={item.quantity} onChange={e => setCart(cart.map(i => i.id === item.id ? { ...i, quantity: e.target.value } : i))} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg font-bold focus:border-purple-600 focus:outline-none" /></td>
                  <td className="py-3 pr-4"><input required type="number" min="0" value={item.price} onChange={e => setCart(cart.map(i => i.id === item.id ? { ...i, price: e.target.value } : i))} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg font-bold focus:border-purple-600 focus:outline-none" /></td>
                  <td className="py-3 text-right font-black text-black text-lg">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(item.quantity) * Number(item.price || 0))}</td>
                  <td className="py-3 text-right"><button type="button" onClick={() => cart.length > 1 && setCart(cart.filter(i => i.id !== item.id))} className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-lg border-2 border-red-800"><Trash2 className="w-5 h-5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="md:hidden space-y-4">
            {cart.map((item, index) => (
              <div key={item.id} className="p-3 border-2 border-gray-200 rounded-2xl bg-gray-50 flex flex-col gap-4 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-center bg-white -m-3 p-3 mb-1 border-b-2 border-gray-100">
                  <span className="bg-purple-700 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">Item #{index + 1}</span>
                  <button type="button" onClick={() => cart.length > 1 && setCart(cart.filter(i => i.id !== item.id))} className="p-2 text-red-600 bg-red-50 rounded-xl border-2 border-red-100 active:bg-red-200 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex flex-col gap-2 pt-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Pilih Produk</label>
                  <div className="relative">
                    <select 
                      required 
                      value={item.product_id} 
                      onChange={e => {
                        const pid = e.target.value;
                        const prod = finishedProducts.find(p => p.id === pid);
                        setCart(cart.map(i => i.id === item.id ? { ...i, product_id: pid, price: prod?.dimensions?.selling_price || i.price } : i));
                      }} 
                      className="w-full p-4 pr-10 border-2 border-gray-300 rounded-xl font-bold text-black focus:border-purple-600 bg-white appearance-none transition-all text-sm leading-tight shadow-inner"
                    >
                      <option value="">-- PILIH --</option>
                      {finishedProducts.map(p => <option key={p.id} value={p.id}>{p.name} [{p.stock_quantity}]</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-purple-600">
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Kuantitas</label>
                    <input required type="number" min="1" value={item.quantity} onChange={e => setCart(cart.map(i => i.id === item.id ? { ...i, quantity: e.target.value } : i))} className="w-full p-4 border-2 border-gray-300 rounded-xl font-bold text-black bg-white focus:border-purple-600 transition-all text-sm shadow-inner" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Harga Jual</label>
                    <input required type="number" min="0" value={item.price} onChange={e => setCart(cart.map(i => i.id === item.id ? { ...i, price: e.target.value } : i))} className="w-full p-4 border-2 border-gray-300 rounded-xl font-bold text-black bg-white focus:border-purple-600 transition-all text-sm shadow-inner" />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t-2 border-gray-200 mt-2 bg-white -m-3 p-3">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subtotal</span>
                  <span className="text-xl font-black text-purple-800">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(item.quantity) * Number(item.price || 0))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

          {/* Diskon Section */}
          <div className="bg-white p-4 md:p-6 rounded-xl border-2 border-dashed border-purple-300 shadow-sm">
            <h2 className="text-base md:text-lg font-bold text-black mb-4 flex items-center gap-2">
              <span className="bg-purple-700 text-white text-xs font-black px-2 py-0.5 rounded">OPSIONAL</span>
              Diskon Penjualan
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-bold text-black mb-2">Jenis Diskon</label>
                <div className="flex rounded-xl overflow-hidden border-2 border-gray-300">
                  <button type="button" onClick={() => setDiscountType('persen')} className={`flex-1 py-3 font-black text-sm transition-all ${discountType === 'persen' ? 'bg-purple-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>% Persen</button>
                  <button type="button" onClick={() => setDiscountType('nominal')} className={`flex-1 py-3 font-black text-sm transition-all ${discountType === 'nominal' ? 'bg-purple-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Rp Nominal</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">
                  {discountType === 'persen' ? 'Besar Diskon (%)' : 'Nominal Diskon (Rp)'}
                </label>
                <input
                  type="number"
                  min="0"
                  max={discountType === 'persen' ? 100 : undefined}
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  placeholder={discountType === 'persen' ? 'cth: 10' : 'cth: 50000'}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl font-bold text-black focus:border-purple-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">Keterangan Diskon <span className="text-gray-400 font-normal">(opsional)</span></label>
                <input
                  type="text"
                  value={discountLabel}
                  onChange={e => setDiscountLabel(e.target.value)}
                  placeholder="cth: Diskon Pelanggan Setia"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl font-semibold text-black focus:border-purple-600 focus:outline-none"
                />
              </div>
            </div>
            {discountAmount > 0 && (
              <div className="mt-4 flex justify-end">
                <div className="bg-green-50 border-2 border-green-300 rounded-xl px-5 py-3 text-right">
                  <p className="text-xs font-black text-green-700 uppercase tracking-widest">Potongan Diskon</p>
                  <p className="text-2xl font-black text-green-700">- {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(discountAmount)}</p>
                </div>
              </div>
            )}
          </div>

        {/* Footer Ringkasan */}
        <div className="p-4 md:p-6 border-2 border-gray-300 bg-gray-100 rounded-xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex gap-4 w-full md:w-auto order-2 md:order-1">
            <button type="button" onClick={() => router.back()} className="flex-1 md:flex-none px-6 py-4 border-2 border-gray-400 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all">BATAL</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 md:flex-none px-10 py-4 bg-purple-700 border-2 border-purple-900 text-white font-black rounded-xl hover:bg-purple-800 disabled:opacity-70 shadow-lg active:scale-95 transition-all">
              <Save className="w-5 h-5 inline mr-2" /> SIMPAN
            </button>
          </div>
          <div className="text-center md:text-right w-full md:order-2">
            {discountAmount > 0 && (
              <>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-0.5">Subtotal</p>
                <p className="text-lg font-black text-gray-400 line-through mb-1">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(subtotal)}
                </p>
                <p className="text-xs font-black text-green-600 uppercase tracking-widest mb-0.5">Diskon {discountLabel && `(${discountLabel})`}</p>
                <p className="text-lg font-black text-green-600 mb-2">- {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(discountAmount)}</p>
              </>
            )}
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Total Tagihan</p>
            <p className="text-3xl md:text-5xl font-black text-black">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalTagihan)}
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
