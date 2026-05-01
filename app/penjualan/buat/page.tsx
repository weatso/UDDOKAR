"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';

export default function BuatSOPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [finishedProducts, setFinishedProducts] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ contact_id: '', created_at: new Date().toISOString().split('T')[0] });
  const [cart, setCart] = useState<any[]>([{ id: crypto.randomUUID(), product_id: '', quantity: 1, price: 0 }]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [tenor, setTenor] = useState(1);
  const [interval, setIntervalVal] = useState(1);
  const [dpAmount, setDpAmount] = useState<number>(0);
  const [intervalUnit, setIntervalUnit] = useState<'Bulan' | 'Hari'>('Bulan');

  useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = async () => {
    try {
      const [customerRes, productRes] = await Promise.all([
        supabase.from('contacts').select('id, name').eq('type', 'CUSTOMER').eq('is_active', true).order('name'),
        supabase.from('products').select('id, name, stock_quantity, base_price').eq('type', 'FINISHED').eq('is_active', true).order('name')
      ]);
      if (customerRes.error) throw customerRes.error;
      if (productRes.error) throw productRes.error;
      if (customerRes.data) setCustomers(customerRes.data);
      if (productRes.data) setFinishedProducts(productRes.data);
    } catch (error: any) { alert(error.message); }
  };

  const totalTagihan = cart.reduce((t, i) => t + (i.quantity * i.price), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contact_id) return alert('Pilih Pelanggan!');
    const validItems = cart.filter(i => i.product_id && i.quantity > 0 && i.price >= 0);
    if (validItems.length === 0) return alert('Isi minimal 1 kardus!');
    setIsSubmitting(true);
    try {
      const { data: txData, error: txError } = await supabase.from('transactions').insert([{ contact_id: formData.contact_id, type: 'SO_OUTBOUND', status: 'UNPAID', total_amount: totalTagihan, amount_paid: 0, created_at: formData.created_at }]).select().single();
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
            if (intervalUnit === 'Bulan') {
              month += interval;
              let currentYear = year + Math.floor((month - 1) / 12);
              let currentMonth = ((month - 1) % 12) + 1;
              const daysInTargetMonth = new Date(currentYear, currentMonth, 0).getDate();
              const targetDay = Math.min(day, daysInTargetMonth);
              const dueStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
              
              const amount = i === tenor - 1 ? baseAmount + remainder : baseAmount;
              schedules.push({
                transaction_id: txData.id,
                amount_to_pay: amount,
                due_date: dueStr,
                status: 'UNPAID'
              });
            } else {
              let d = new Date(year, month - 1, day);
              d.setDate(d.getDate() + (interval * (i + 1)));
              const dueStr = d.toISOString().split('T')[0];
              
              const amount = i === tenor - 1 ? baseAmount + remainder : baseAmount;
              schedules.push({
                transaction_id: txData.id,
                amount_to_pay: amount,
                due_date: dueStr,
                status: 'UNPAID'
              });
            }
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
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/penjualan" className="p-2 bg-gray-200 hover:bg-gray-300 text-black border-2 border-gray-400 rounded-full"><ArrowLeft className="w-6 h-6" /></Link>
        <h1 className="text-2xl font-bold text-black">Buat Sales Order (SO)</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-4 md:p-6 rounded-xl border-2 border-gray-300 shadow-md">
          <h2 className="text-xl font-bold text-black mb-4 border-b-2 border-gray-200 pb-2">Informasi Pelanggan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-bold text-black mb-2">Pelanggan (Customer)</label>
              <select required value={formData.contact_id} onChange={e => setFormData({...formData, contact_id: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:outline-none">
                <option value="">-- Pilih Pelanggan --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-base font-bold text-black mb-2">Tanggal Transaksi</label>
              <input required type="date" value={formData.created_at} onChange={e => setFormData({...formData, created_at: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:outline-none" />
            </div>
          </div>
          
          <div className="mt-6 border-t-2 border-gray-300 pt-6">
            <div className="flex items-center gap-3 mb-4">
              <input type="checkbox" id="recurring" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="w-5 h-5 accent-purple-700" />
              <label htmlFor="recurring" className="text-base font-bold text-black cursor-pointer">Jadwalkan Pembayaran Berkala (Tenor / Cicilan)</label>
            </div>
            {isRecurring && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-purple-50 p-4 border-2 border-purple-200 rounded-lg">
                <div>
                  <label className="block text-sm font-bold text-purple-900 mb-2">Uang Muka (DP) - Rp</label>
                  <input type="number" min="0" value={dpAmount || ''} onChange={e => setDpAmount(Number(e.target.value))} className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:outline-none" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-purple-900 mb-2">Jumlah Cicilan</label>
                  <input required={isRecurring} type="number" min="1" value={tenor} onChange={e => setTenor(Number(e.target.value))} className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-purple-900 mb-2">Satuan Interval</label>
                  <select required={isRecurring} value={intervalUnit} onChange={e => setIntervalUnit(e.target.value as any)} className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:outline-none">
                    <option value="Bulan">Bulan</option>
                    <option value="Hari">Hari</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-purple-900 mb-2">Interval ({intervalUnit})</label>
                  <input required={isRecurring} type="number" min="1" value={interval} onChange={e => setIntervalVal(Number(e.target.value))} className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:outline-none" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl border-2 border-gray-300 shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <h2 className="text-xl font-bold text-black">Daftar Pesanan (Kardus Jadi)</h2>
            <button type="button" onClick={() => setCart([...cart, { id: crypto.randomUUID(), product_id: '', quantity: 1, price: 0 }])} className="text-purple-700 font-bold flex items-center gap-1 bg-purple-100 px-4 py-2 rounded-lg border-2 border-purple-300">
              <Plus className="w-5 h-5" /> Tambah Baris
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm md:text-base border-collapse whitespace-nowrap min-w-[700px]">
              <thead className="bg-gray-200 border-b-2 border-gray-400">
                <tr>
                  <th className="px-4 py-3 text-black font-bold">Kardus Jadi</th>
                  <th className="px-4 py-3 text-black font-bold w-32">Kuantitas</th>
                  <th className="px-4 py-3 text-black font-bold w-48">Harga Satuan</th>
                  <th className="px-4 py-3 text-black font-bold text-right">Subtotal</th>
                  <th className="px-2 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
              {cart.map(item => (
                <tr key={item.id}>
                  <td className="py-3 pr-4">
                    <select required value={item.product_id} onChange={e => setCart(cart.map(i => i.id === item.id ? { ...i, product_id: e.target.value } : i))} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg font-semibold focus:border-purple-600 focus:outline-none">
                      <option value="">Pilih Kardus...</option>
                      {finishedProducts.map(p => <option key={p.id} value={p.id}>{p.name} (Sisa: {p.stock_quantity}) - HPP: {p.base_price}</option>)}
                    </select>
                  </td>
                  <td className="py-3 pr-4"><input required type="number" min="1" value={item.quantity || ''} onChange={e => setCart(cart.map(i => i.id === item.id ? { ...i, quantity: Number(e.target.value) } : i))} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg font-bold focus:border-purple-600 focus:outline-none" /></td>
                  <td className="py-3 pr-4"><input required type="number" min="0" value={item.price || ''} onChange={e => setCart(cart.map(i => i.id === item.id ? { ...i, price: Number(e.target.value) } : i))} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg font-bold focus:border-purple-600 focus:outline-none" /></td>
                  <td className="py-3 text-right font-bold text-black text-lg">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.quantity * item.price)}</td>
                  <td className="py-3 text-right"><button type="button" onClick={() => cart.length > 1 && setCart(cart.filter(i => i.id !== item.id))} className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-lg border-2 border-red-800 disabled:opacity-50"><Trash2 className="w-5 h-5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
        <div className="p-4 md:p-6 border-2 border-gray-300 bg-gray-100 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex gap-4 w-full md:w-auto">
            <button type="button" onClick={() => router.back()} className="flex-1 md:flex-none px-6 py-3 border-2 border-gray-400 bg-white text-black font-bold rounded-lg hover:bg-gray-200">Batal</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 md:flex-none px-8 py-3 bg-purple-700 border-2 border-purple-900 text-white font-bold rounded-lg hover:bg-purple-800 disabled:opacity-70">
              <Save className="w-5 h-5 inline mr-2" />Simpan SO
            </button>
          </div>
          <div className="text-left md:text-right w-full md:w-auto">
            <p className="text-base font-bold text-gray-700 mb-1">Total Tagihan (Piutang)</p>
            <p className="text-3xl md:text-4xl font-black text-black">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalTagihan)}</p>
          </div>
        </div>
      </form>
    </div>
  );
}
