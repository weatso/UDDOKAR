"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, CheckCircle, PackageMinus, PackagePlus, Plus, Printer } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';

export default function ProsesSPKPage() {
  const router = useRouter();
  const params = useParams();
  const spkId = params.id as string;
  const [order, setOrder] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [rawProducts, setRawProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [consumedForm, setConsumedForm] = useState({ product_id: '', quantity: '' });
  const [producedForm, setProducedForm] = useState({ quantity: '' });

  useEffect(() => { if (spkId) fetchData(); }, [spkId]);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: orderData } = await supabase.from('production_orders').select('*, product:products!target_product_id(name)').eq('id', spkId).single();
    const { data: logsData } = await supabase.from('production_logs').select('*, product:products(name)').eq('production_order_id', spkId).order('created_at', { ascending: true });
    const { data: rawData } = await supabase.from('products').select('id, name, stock_quantity, dimensions').eq('type', 'RAW').eq('is_active', true).order('name');
    if (orderData) setOrder(orderData);
    if (logsData) setLogs(logsData);
    if (rawData) setRawProducts(rawData);
    setIsLoading(false);
  };

  const handleAddConsumed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consumedForm.product_id || !consumedForm.quantity) return;
    try {
      const { error } = await supabase.from('production_logs').insert([{ production_order_id: spkId, product_id: consumedForm.product_id, quantity: Number(consumedForm.quantity), type: 'CONSUMED' }]);
      if (error) throw error;
      setConsumedForm({ product_id: '', quantity: '' });
      fetchData();
    } catch (error: any) { alert('Gagal: ' + error.message); }
  };

  const handleAddProduced = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!producedForm.quantity) return;
    try {
      const { error } = await supabase.from('production_logs').insert([{ production_order_id: spkId, product_id: order.target_product_id, quantity: Number(producedForm.quantity), type: 'PRODUCED' }]);
      if (error) throw error;
      setProducedForm({ quantity: '' });
      fetchData();
    } catch (error: any) { alert('Gagal: ' + error.message); }
  };

  const handleCompleteSPK = async () => {
    if (confirm('Yakin ingin menyelesaikan SPK? HPP akan dikalkulasi.')) {
      try {
        await supabase.from('production_orders').update({ status: 'COMPLETED' }).eq('id', spkId);
        alert('SPK Selesai!');
        fetchData();
      } catch (error: any) { alert('Gagal: ' + error.message); }
    }
  };

  if (isLoading) return <div className="p-8 text-xl font-bold text-black">Memuat data SPK...</div>;
  if (!order) return <div className="p-8 text-xl font-bold text-red-700">SPK tidak ditemukan!</div>;

  const isCompleted = order.status === 'COMPLETED';
  const totalProduced = logs.filter(l => l.type === 'PRODUCED').reduce((sum, l) => sum + Number(l.quantity), 0);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-4">
          <Link href="/produksi" className="p-3 bg-white border-2 border-gray-400 hover:bg-gray-200 text-black rounded-full"><ArrowLeft className="w-6 h-6" /></Link>
          <div>
            <h1 className="text-xl md:text-3xl font-black text-black">Detail Produksi (SPK)</h1>
            <p className="text-black font-bold mt-1 text-sm md:text-lg">SPK: {order.spk_number} | <span className="text-purple-800">{order.target_quantity} Pcs</span> | Produk: {order.product?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a href={`/produksi/${order.id}/cetak`} target="_blank" rel="noopener noreferrer" className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg border-2 border-black">
            <Printer className="w-5 h-5" /> Cetak SPK
          </a>
          <StatusBadge status={order.status} />
          {!isCompleted && <button onClick={handleCompleteSPK} className="bg-green-600 hover:bg-green-700 text-white border-2 border-green-800 px-6 py-3 rounded-xl text-base font-bold flex items-center gap-2"><CheckCircle className="w-6 h-6" /> Selesaikan SPK</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl border-2 border-gray-300 shadow-md">
          <div className="p-6 border-b-2 border-gray-300 bg-gray-200 flex items-center gap-3">
            <PackageMinus className="w-8 h-8 text-black" />
            <h2 className="text-2xl font-bold text-black">Bahan Terpakai</h2>
          </div>
          {!isCompleted && (
            <form onSubmit={handleAddConsumed} className="p-6 border-b-2 border-gray-300 bg-gray-100 flex flex-col md:flex-row gap-4 items-end">
              <div className="w-full md:flex-1">
                <label className="block text-base font-bold text-black mb-2">Bahan Mentah</label>
                <select required value={consumedForm.product_id} onChange={e => setConsumedForm({...consumedForm, product_id: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg text-black font-bold focus:border-purple-600 focus:outline-none">
                  <option value="">-- Pilih --</option>
                  {rawProducts.map(p => <option key={p.id} value={p.id}>{p.name} (Stok: {p.stock_quantity})</option>)}
                </select>
              </div>
              <div className="w-full md:w-32">
                <label className="block text-base font-bold text-black mb-2">Qty</label>
                <input required type="number" min="0.01" step="0.01" value={consumedForm.quantity} onChange={e => setConsumedForm({...consumedForm, quantity: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg text-black font-bold focus:border-purple-600 focus:outline-none" />
              </div>
              <button type="submit" className="w-full md:w-auto bg-black hover:bg-gray-800 text-white border-2 border-black px-5 py-3 rounded-xl font-bold"><Plus className="w-5 h-5 inline" /> Catat</button>
            </form>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base border-collapse">
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.filter(l => l.type === 'CONSUMED').length === 0 ? <tr><td className="p-8 text-center text-black font-bold">Belum ada bahan dicatat.</td></tr> : 
                 logs.filter(l => l.type === 'CONSUMED').map((log, i) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-5 font-bold text-black">{i+1}. {log.product?.name}</td>
                    <td className="px-6 py-5 text-right font-black text-black text-xl">- {log.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border-2 border-gray-300 shadow-md">
          <div className="p-6 border-b-2 border-gray-300 bg-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <PackagePlus className="w-8 h-8 text-black" />
              <h2 className="text-2xl font-bold text-black">Hasil Jadi</h2>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-black uppercase">Total Tercapai</p>
              <p className="text-3xl font-black text-purple-700">{totalProduced} <span className="text-black">/ {order.target_quantity}</span></p>
            </div>
          </div>
          {!isCompleted && (
            <form onSubmit={handleAddProduced} className="p-6 border-b-2 border-gray-300 bg-gray-100 flex flex-col md:flex-row gap-4 items-end">
              <div className="w-full md:flex-1">
                <label className="block text-base font-bold text-black mb-2">Jumlah Kardus Jadi (Sukses)</label>
                <input required type="number" min="1" value={producedForm.quantity} onChange={e => setProducedForm({...producedForm, quantity: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg text-black font-bold focus:border-purple-600 focus:outline-none" />
              </div>
              <button type="submit" className="w-full md:w-auto bg-black hover:bg-gray-800 text-white border-2 border-black px-5 py-3 rounded-xl font-bold"><Plus className="w-5 h-5 inline" /> Catat</button>
            </form>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base border-collapse">
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.filter(l => l.type === 'PRODUCED').length === 0 ? <tr><td className="p-8 text-center text-black font-bold">Belum ada hasil disetor.</td></tr> : 
                 logs.filter(l => l.type === 'PRODUCED').map((log, i) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-5 font-bold text-black">Setoran ke-{i+1}</td>
                    <td className="px-6 py-5 text-right font-black text-purple-700 text-xl">+ {log.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
