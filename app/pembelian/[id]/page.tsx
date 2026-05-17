"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Receipt, Printer, Ban, CheckCircle2, Truck } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useRole } from '@/lib/hooks/useRole';

export default function DetailPOPage() {
  const params = useParams();
  const router = useRouter();
  const txId = params.id as string;
  const { role } = useRole();

  const [transaction, setTransaction] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { if (txId) fetchDetail(); }, [txId]);

  const fetchDetail = async () => {
    setIsLoading(true);
    try {
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*, contact:contacts(name, phone, address)')
        .eq('id', txId).single();
      if (txError) throw txError;
      
      const { data: itemsData, error: itemsError } = await supabase
        .from('transaction_items')
        .select('*, product:products(name, dimensions, gramasi)')
        .eq('transaction_id', txId);
      if (itemsError) throw itemsError;

      setTransaction(txData);
      setItems(itemsData);
    } catch (error: any) { alert(error.message); } finally { setIsLoading(false); }
  };

  const handleVoid = async () => {
    if (transaction.is_void) return;
    const reason = prompt("Alasan Void:");
    if (!reason) return;
    if (confirm("Batalkan transaksi?")) {
      try {
        await supabase.from('transactions').update({ status: 'VOID', is_void: true, void_reason: reason }).eq('id', txId);
        await supabase.from('payment_schedules').update({ status: 'VOID' }).eq('transaction_id', txId);
        fetchDetail();
        router.refresh();
      } catch (err: any) {
        alert("Gagal membatalkan transaksi: " + err.message);
      }
    }
  };



  if (isLoading) return <div className="p-8 font-bold text-black">Memuat detail PO...</div>;
  if (!transaction) return <div className="p-8 text-red-600 font-bold">Data transaksi tidak ditemukan.</div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/pembelian" className="p-3 bg-white border-2 border-gray-400 rounded-full hover:bg-gray-100 transition-colors"><ArrowLeft /></Link>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-black truncate text-black">Detail Pembelian (PO) #{transaction.id.slice(0,8)}</h1>
            <p className="text-gray-500 font-bold text-sm">Nomor Referensi: {transaction.reference_number || 'Belum diatur'}</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {!transaction.is_void && role === 'owner' && <button onClick={handleVoid} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 border-2 border-red-900 transition-all shadow-md"><Ban size={18} /> Void</button>}

        </div>
      </div>

      {transaction.is_void && (
        <div className="p-4 bg-red-50 border-4 border-red-600 rounded-xl text-red-800 font-black animate-pulse">
          ⚠️ TRANSAKSI DIBATALKAN (VOID): {transaction.void_reason || 'Tidak ada alasan'}
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white p-6 border-2 border-gray-300 rounded-xl shadow-sm hover:border-gray-400 transition-colors">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Supplier (Pemasok)</h2>
          <p className="text-2xl font-black text-black">{transaction.contact?.name}</p>
          <p className="text-gray-600 font-medium mt-1">{transaction.contact?.address || 'Alamat tidak tersedia'}</p>
        </div>
      </div>

      {/* Tabel Barang & Penerimaan Parsial */}
      <div className="bg-white border-2 border-gray-300 rounded-2xl overflow-hidden shadow-md">
        <div className="p-5 bg-gray-100 border-b-2 border-gray-300 flex items-center gap-3 font-black text-black text-lg">
          <Truck className="w-6 h-6" /> Rincian Barang & Penerimaan (Surat Jalan)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-200 text-xs md:text-sm uppercase font-black text-gray-700 border-b-2 border-gray-300">
              <tr>
                <th className="px-6 py-4">Nama Barang Mentah</th>
                <th className="px-6 py-4 text-center">QTY Pesan</th>
                <th className="px-6 py-4 text-center">Tonase</th>
                <th className="px-6 py-4 text-center">Terkirim</th>
                <th className="px-6 py-4 text-center">Sisa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {items.map(item => {
                const sisa = Number(item.quantity) - Number(item.qty_received || 0);
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-5">
                      <p className="font-black text-black">{item.product?.name}</p>
                      <p className="text-xs font-bold text-gray-400 mt-1">Gramasi: {item.product?.gramasi || item.product?.dimensions?.gramasi || '-'}</p>
                    </td>
                    <td className="px-6 py-5 text-center font-black text-blue-800 text-lg">{item.quantity}</td>
                    <td className="px-6 py-5 text-center font-black text-gray-600">{item.tonase || '-'}</td>
                    <td className="px-6 py-5 text-center font-black text-green-700 text-lg">{item.qty_received || 0}</td>
                    <td className="px-6 py-5 text-center">
                      <span className={`font-black text-lg ${sisa > 0 ? 'text-red-600' : 'text-green-600'}`}>{parseFloat(sisa.toFixed(4))}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>


    </div>
  );
}
