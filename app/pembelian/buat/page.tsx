"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';

export default function BuatPOPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [rawProducts, setRawProducts] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ contact_id: '', created_at: new Date().toISOString().split('T')[0] });
  const [cart, setCart] = useState<any[]>([{ id: crypto.randomUUID(), product_id: '', quantity: 1, price: 0 }]);
  
  // State Tenor & DP
  const [isRecurring, setIsRecurring] = useState(false);
  const [tenor, setTenor] = useState(1);
  const [dpAmount, setDpAmount] = useState(0);
  const [intervalValue, setIntervalValue] = useState(1);
  const [intervalUnit, setIntervalUnit] = useState<'Bulan' | 'Hari'>('Bulan');

  useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = async () => {
    try {
      const [supplierRes, productRes] = await Promise.all([
        supabase.from('contacts').select('id, name').eq('type', 'SUPPLIER').eq('is_active', true).order('name'),
        supabase.from('products').select('id, name, dimensions').eq('type', 'RAW').eq('is_active', true).order('name')
      ]);
      if (supplierRes.data) setSuppliers(supplierRes.data);
      if (productRes.data) setRawProducts(productRes.data);
    } catch (error: any) { alert(error.message); }
  };

  const totalTagihan = cart.reduce((t, i) => t + (i.quantity * i.price), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contact_id) return alert('Pilih Supplier!');
    const validItems = cart.filter(i => i.product_id && i.quantity > 0 && i.price >= 0);
    if (validItems.length === 0) return alert('Isi minimal 1 barang!');
    
    setIsSubmitting(true);
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
          let [year, month, day] = formData.created_at.split('-').map(Number);

          for (let i = 0; i < tenor; i++) {
            let dueStr = '';
            if (intervalUnit === 'Bulan') {
              const targetMonthCount = month + (intervalValue * (i + 1));
              const currentYear = year + Math.floor((targetMonthCount - 1) / 12);
              const currentMonth = ((targetMonthCount - 1) % 12) + 1;
              const maxDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();
              const targetDay = Math.min(day, maxDaysInMonth);
              dueStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
            } else {
              const d = new Date(year, month - 1, day);
              d.setDate(d.getDate() + (intervalValue * (i + 1)));
              dueStr = d.toISOString().split('T')[0];
            }
            // Sisa pembulatan ke tenor terakhir
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
    } catch (error: any) { alert('Gagal: ' + error.message); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/pembelian" className="p-2 bg-gray-200 hover:bg-gray-300 rounded-full text-black border-2 border-gray-400 transition-colors"><ArrowLeft className="w-6 h-6" /></Link>
        <h1 className="text-2xl font-bold text-black">Buat Purchase Order (PO)</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-xl border-2 border-gray-300 shadow-md">
          <h2 className="text-xl font-bold text-black mb-4 border-b-2 border-gray-200 pb-2">Informasi Supplier</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-bold text-black mb-2">Supplier</label>
              <select required value={formData.contact_id} onChange={e => setFormData({...formData, contact_id: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold text-black focus:border-purple-600 focus:outline-none">
                <option value="">-- Pilih Supplier --</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-base font-bold text-black mb-2">Tanggal</label>
              <input required type="date" value={formData.created_at} onChange={e => setFormData({...formData, created_at: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold text-black focus:border-purple-600 focus:outline-none" />
            </div>
          </div>
          <div className="mt-6 border-t-2 border-gray-200 pt-6">
            <div className="flex items-center gap-3 mb-4">
              <input type="checkbox" id="recurring" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="w-5 h-5 accent-purple-700" />
              <label htmlFor="recurring" className="text-base font-bold text-black cursor-pointer">Jadwalkan Pembayaran (Cicilan)</label>
            </div>
            {isRecurring && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-purple-50 p-4 border-2 border-purple-200 rounded-lg">
                <div><label className="block text-sm font-bold text-purple-900 mb-2">DP - Rp</label><input type="number" value={dpAmount || ''} onChange={e => setDpAmount(Number(e.target.value))} className="w-full px-3 py-2 border-2 border-purple-300 rounded-lg font-bold text-black" /></div>
                <div><label className="block text-sm font-bold text-purple-900 mb-2">Tenor (Kali)</label><input required={isRecurring} type="number" min="1" value={tenor} onChange={e => setTenor(Number(e.target.value))} className="w-full px-3 py-2 border-2 border-purple-300 rounded-lg font-bold text-black" /></div>
                <div><label className="block text-sm font-bold text-purple-900 mb-2">Satuan</label><select value={intervalUnit} onChange={e => setIntervalUnit(e.target.value as any)} className="w-full px-3 py-2 border-2 border-purple-300 rounded-lg font-bold text-black"><option value="Bulan">Bulan</option><option value="Hari">Hari</option></select></div>
                <div><label className="block text-sm font-bold text-purple-900 mb-2">Interval</label><input required={isRecurring} type="number" min="1" value={intervalValue} onChange={e => setIntervalValue(Number(e.target.value))} className="w-full px-3 py-2 border-2 border-purple-300 rounded-lg font-bold text-black" /></div>
              </div>
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border-2 border-gray-300 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-black">Daftar Bahan Mentah (PO)</h2>
            <button type="button" onClick={() => setCart([...cart, { id: crypto.randomUUID(), product_id: '', quantity: 1, price: 0 }])} className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-bold border-2 border-purple-300 flex items-center gap-1 hover:bg-purple-200 transition-colors"><Plus className="w-5 h-5" /> Tambah</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-gray-100 border-b-2 border-gray-300">
                <tr><th className="px-4 py-3 font-bold text-black">Barang Mentah</th><th className="px-4 py-3 font-bold text-black w-32">Kuantitas</th><th className="px-4 py-3 font-bold text-black w-48">Harga Satuan</th><th className="px-4 py-3 font-bold text-black text-right">Subtotal</th><th className="px-2 py-3"></th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cart.map(item => (
                  <tr key={item.id}>
                    <td className="py-3 px-2"><select required value={item.product_id} onChange={e => setCart(cart.map(i => i.id === item.id ? { ...i, product_id: e.target.value } : i))} className="w-full p-2 border-2 border-gray-300 rounded-lg font-semibold text-black focus:border-purple-600 focus:outline-none"><option value="">Pilih Barang...</option>{rawProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></td>
                    <td className="py-3 px-2"><input required type="number" min="1" value={item.quantity} onChange={e => setCart(cart.map(i => i.id === item.id ? { ...i, quantity: Number(e.target.value) } : i))} className="w-full p-2 border-2 border-gray-300 rounded-lg font-bold text-black" /></td>
                    <td className="py-3 px-2"><input required type="number" min="0" value={item.price} onChange={e => setCart(cart.map(i => i.id === item.id ? { ...i, price: Number(e.target.value) } : i))} className="w-full p-2 border-2 border-gray-300 rounded-lg font-bold text-black" /></td>
                    <td className="py-3 px-2 text-right font-black text-lg text-black">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.quantity * item.price)}</td>
                    <td className="py-3 px-2 text-right"><button type="button" onClick={() => cart.length > 1 && setCart(cart.filter(i => i.id !== item.id))} className="p-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"><Trash2 className="w-5 h-5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="p-6 border-2 border-gray-300 bg-gray-100 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-4"><button type="button" onClick={() => router.back()} className="px-6 py-3 border-2 border-gray-400 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors">Batal</button><button type="submit" disabled={isSubmitting} className="px-8 py-3 bg-purple-700 text-white font-bold rounded-lg border-2 border-purple-900 hover:bg-purple-800 disabled:opacity-50 transition-colors"><Save className="w-5 h-5 inline mr-2" /> Simpan PO</button></div>
          <div className="text-right"><p className="text-base font-bold text-gray-700">Total Tagihan (Grand Total)</p><p className="text-3xl font-black text-black">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalTagihan)}</p></div>
        </div>
      </form>
    </div>
  );
}
