"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Receipt, Printer, Ban } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';

export default function DetailSOPage() {
  const params = useParams();
  const router = useRouter();
  const txId = params.id as string;

  const [transaction, setTransaction] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (txId) fetchDetail();
  }, [txId]);

  const fetchDetail = async () => {
    setIsLoading(true);
    try {
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*, contact:contacts(name, phone, address)')
        .eq('id', txId)
        .single();
      if (txError) throw txError;
      
      const { data: itemsData, error: itemsError } = await supabase
        .from('transaction_items')
        .select('*, product:products(name, dimensions)')
        .eq('transaction_id', txId);
      if (itemsError) throw itemsError;

      if (txData) setTransaction(txData);
      if (itemsData) setItems(itemsData);
    } catch (error: any) {
      alert('Gagal mengambil data detail SO: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoid = async () => {
    if (transaction.status === 'PAID' || transaction.is_void) {
      return alert("Transaksi yang sudah lunas atau sudah dibatalkan tidak bisa di-void.");
    }

    const reason = prompt("Masukkan alasan pembatalan (Void) transaksi ini:");
    if (!reason) return;

    if (confirm("Apakah Anda yakin ingin MEMBATALKAN transaksi ini secara permanen? Semua jadwal tagihan terkait akan ikut dibatalkan.")) {
      try {
        // 1. Update Transaksi
        const { error: txError } = await supabase
          .from('transactions')
          .update({ 
            status: 'VOID', 
            is_void: true, 
            void_reason: reason 
          })
          .eq('id', txId);

        if (txError) throw txError;

        // 2. Update Semua Jadwal Pembayaran terkait menjadi VOID
        const { error: scheduleError } = await supabase
          .from('payment_schedules')
          .update({ status: 'VOID' })
          .eq('transaction_id', txId);

        if (scheduleError) throw scheduleError;

        alert("Transaksi Berhasil Dibatalkan (Void)!");
        fetchDetail(); // Refresh data di layar
        router.refresh();
      } catch (err: any) {
        alert("Gagal membatalkan transaksi: " + err.message);
      }
    }
  };

  const formatRupiah = (number: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(number);
  const formatDate = (dateString: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateString));

  if (isLoading) return <div className="p-8 text-xl font-bold text-black">Memuat detail SO...</div>;
  if (!transaction) return <div className="p-8 text-xl font-bold text-red-600">Transaksi tidak ditemukan.</div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Tombol Kembali & Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-4">
          <Link href="/penjualan" className="p-3 bg-white border-2 border-gray-400 hover:bg-gray-200 text-black rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-xl md:text-3xl font-black text-black">Detail Sales Order (SO)</h1>
            <p className="text-gray-600 font-bold mt-1 text-sm md:text-lg">ID: #{transaction.id.slice(0,8)} | Tanggal: {formatDate(transaction.created_at)}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {/* Tombol Void (Hanya muncul jika belum lunas & belum void) */}
          {transaction.status !== 'PAID' && !transaction.is_void && (
            <button 
              onClick={handleVoid}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-lg font-bold flex items-center gap-2 border-2 border-red-900 shadow-md transition-all"
            >
              <Ban className="w-5 h-5" /> Batalkan (Void)
            </button>
          )}

          <a href={`/penjualan/${transaction.id}/cetak`} target="_blank" rel="noopener noreferrer" className="bg-purple-700 hover:bg-purple-800 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg border-2 border-purple-900">
            <Printer className="w-5 h-5" /> Cetak Dokumen
          </a>
        </div>
      </div>

      {/* Banner Notifikasi Void */}
      {transaction.is_void && (
        <div className="mb-8 p-6 bg-red-50 border-4 border-red-600 rounded-2xl shadow-lg animate-pulse">
          <div className="flex items-center gap-4 text-red-700">
            <Ban className="w-10 h-10 shrink-0" />
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">TRANSAKSI INI TELAH DIBATALKAN (VOID)</h2>
              <p className="text-lg font-bold italic mt-1 text-red-800">Alasan: {transaction.void_reason || 'Tidak disebutkan'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Informasi Utama */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border-2 border-gray-300 shadow-sm md:col-span-2">
          <h2 className="text-lg font-bold text-gray-500 uppercase tracking-wide mb-2">Informasi Pelanggan</h2>
          <p className="text-2xl font-black text-black">{transaction.contact?.name}</p>
          <p className="text-gray-800 font-medium mt-1">{transaction.contact?.phone || 'Tidak ada no telepon'}</p>
          <p className="text-gray-800 font-medium mt-1">{transaction.contact?.address || 'Tidak ada alamat'}</p>
        </div>
        
        <div className={`${transaction.is_void ? 'bg-gray-100 border-gray-400' : 'bg-purple-50 border-purple-300'} p-6 rounded-2xl border-2 shadow-sm flex flex-col justify-between items-start md:items-end text-left md:text-right`}>
          <div>
            <h2 className="text-sm font-bold text-purple-800 uppercase tracking-wide mb-2">Status Transaksi</h2>
            <StatusBadge status={transaction.status} />
          </div>
          <div className="mt-4">
            <h2 className="text-sm font-bold text-purple-800 uppercase tracking-wide mb-1">Piutang Tersisa</h2>
            <p className={`text-2xl font-black ${transaction.is_void ? 'text-gray-500 line-through' : 'text-purple-900'}`}>
              {formatRupiah(transaction.total_amount - transaction.amount_paid)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabel Item */}
      <div className="bg-white rounded-2xl border-2 border-gray-300 shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b-2 border-gray-300 bg-gray-100 flex items-center gap-3">
          <Receipt className="w-6 h-6 text-black" />
          <h2 className="text-xl font-bold text-black">Rincian Barang Terjual</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm md:text-base border-collapse whitespace-nowrap">
            <thead className="bg-gray-200 border-b-2 border-gray-400">
              <tr>
                <th className="px-6 py-4 text-black font-bold uppercase">Kardus Jadi</th>
                <th className="px-6 py-4 text-black font-bold text-right uppercase">Qty</th>
                <th className="px-6 py-4 text-black font-bold text-right uppercase">Harga</th>
                <th className="px-6 py-4 text-black font-bold text-right uppercase">Subtotal</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-black font-bold">
                    {index + 1}. {item.product?.name}
                    <span className="block text-sm font-semibold text-gray-400 mt-1">P:{item.product?.dimensions?.p} L:{item.product?.dimensions?.l}</span>
                  </td>
                  <td className="px-6 py-4 text-black font-black text-right text-lg">{item.quantity}</td>
                  <td className="px-6 py-4 text-black font-bold text-right">{formatRupiah(item.price)}</td>
                  <td className="px-6 py-4 text-black font-black text-right text-lg">{formatRupiah(item.quantity * item.price)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-4 border-gray-300">
              <tr>
                <td colSpan={3} className="px-6 py-4 text-black font-bold text-right uppercase">Grand Total</td>
                <td className="px-6 py-4 text-purple-800 font-black text-right text-2xl">{formatRupiah(transaction.total_amount)}</td>
              </tr>
              {!transaction.is_void && (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-black font-bold text-right uppercase">Telah Dibayar</td>
                  <td className="px-6 py-4 text-green-700 font-black text-right text-xl">{formatRupiah(transaction.amount_paid)}</td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
