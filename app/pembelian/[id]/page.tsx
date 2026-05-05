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
  const [receivingQty, setReceivingQty] = useState<{ [key: string]: number }>({});
  const [refNumber, setRefNumber] = useState("");

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
        .select('*, product:products(name, dimensions)')
        .eq('transaction_id', txId);
      if (itemsError) throw itemsError;

      setTransaction(txData);
      setItems(itemsData);
      setRefNumber(txData.reference_number || "");
    } catch (error: any) { alert(error.message); } finally { setIsLoading(false); }
  };

  const handleTerimaBarang = async () => {
    try {
      // 1. Update qty_received untuk setiap item
      for (const item of items) {
        const additional = receivingQty[item.id] || 0;
        if (additional > 0) {
          const newQty = Number(item.qty_received || 0) + additional;
          const { error: itemErr } = await supabase
            .from('transaction_items')
            .update({ qty_received: newQty })
            .eq('id', item.id);
          if (itemErr) throw itemErr;
        }
      }

      // 2. Update reference_number (No Surat Jalan)
      const { error: txErr } = await supabase
        .from('transactions')
        .update({ reference_number: refNumber })
        .eq('id', txId);
      if (txErr) throw txErr;

      alert("Penerimaan barang berhasil dicatat!");
      setReceivingQty({});
      fetchDetail();
    } catch (err: any) { alert("Gagal: " + err.message); }
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

  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

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
          <a href={`/pembelian/${transaction.id}/cetak`} className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 border-2 border-purple-900 transition-all shadow-md"><Printer size={18} /> Cetak PO</a>
        </div>
      </div>

      {transaction.is_void && (
        <div className="p-4 bg-red-50 border-4 border-red-600 rounded-xl text-red-800 font-black animate-pulse">
          ⚠️ TRANSAKSI DIBATALKAN (VOID): {transaction.void_reason || 'Tidak ada alasan'}
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 border-2 border-gray-300 rounded-xl shadow-sm hover:border-gray-400 transition-colors">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Supplier (Pemasok)</h2>
          <p className="text-2xl font-black text-black">{transaction.contact?.name}</p>
          <p className="text-gray-600 font-medium mt-1">{transaction.contact?.address || 'Alamat tidak tersedia'}</p>
        </div>
        <div className="bg-white p-6 border-2 border-gray-300 rounded-xl shadow-sm hover:border-gray-400 transition-colors flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Status & Tagihan</h2>
            <StatusBadge status={transaction.status} />
          </div>
          <p className="text-3xl font-black text-purple-900 mt-4">{formatRupiah(transaction.total_amount)}</p>
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
                <th className="px-6 py-4 text-center">Dipesan</th>
                <th className="px-6 py-4 text-center">Diterima</th>
                <th className="px-6 py-4 text-center">Sisa</th>
                {!transaction.is_void && <th className="px-6 py-4 text-right">Terima Baru</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {items.map(item => {
                const sisa = item.quantity - (item.qty_received || 0);
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-5">
                      <p className="font-black text-black">{item.product?.name}</p>
                      <p className="text-xs font-bold text-gray-400 mt-1">Gramatur: {item.product?.dimensions?.gramatur || '-'}</p>
                    </td>
                    <td className="px-6 py-5 text-center font-black text-blue-800 text-lg">{item.quantity}</td>
                    <td className="px-6 py-5 text-center font-black text-green-700 text-lg">{item.qty_received || 0}</td>
                    <td className="px-6 py-5 text-center font-black text-red-600 text-lg">{sisa}</td>
                    {!transaction.is_void && (
                      <td className="px-6 py-5 text-right">
                        <input 
                          type="number" min="0" max={sisa} 
                          placeholder="0"
                          value={receivingQty[item.id] || ''}
                          onChange={(e) => setReceivingQty({...receivingQty, [item.id]: Number(e.target.value)})}
                          className="w-24 px-3 py-2 border-2 border-gray-300 rounded-lg text-right font-black focus:border-purple-600 focus:outline-none transition-all"
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Panel Konfirmasi Penerimaan */}
      {!transaction.is_void && (
        <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-6 shadow-inner">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg text-purple-700 border border-purple-300">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-purple-900">Konfirmasi Penerimaan Gudang</h2>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-black text-purple-800 mb-2 uppercase tracking-wide">No. Surat Jalan / Invoice Supplier</label>
              <input 
                type="text" 
                value={refNumber}
                onChange={(e) => setRefNumber(e.target.value)}
                placeholder="Contoh: SJ-9982 atau INV-SUP-01"
                className="w-full px-5 py-3 border-2 border-purple-300 rounded-xl font-black text-black uppercase focus:ring-4 focus:ring-purple-200 focus:border-purple-600 transition-all placeholder:text-purple-300"
              />
            </div>
            <button 
              onClick={handleTerimaBarang}
              className="w-full md:w-auto bg-purple-700 hover:bg-purple-800 text-white px-10 py-3 rounded-xl font-black shadow-lg border-2 border-purple-900 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              SIMPAN PENERIMAAN BARANG
            </button>
          </div>
          <p className="mt-4 text-xs font-bold text-purple-400 italic">* Mengisi jumlah "Terima Baru" akan menambah stok barang di database secara otomatis.</p>
        </div>
      )}
    </div>
  );
}
