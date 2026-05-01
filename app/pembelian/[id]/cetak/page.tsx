"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function CetakPOPage() {
  const params = useParams();
  const router = useRouter();
  const txId = params.id as string;
  const [transaction, setTransaction] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (txId) fetchDetail();
  }, [txId]);

  const fetchDetail = async () => {
    console.log("Mulai fetch data cetak PO:", txId);
    const { data: txData, error: txError } = await supabase.from('transactions').select('*, contact:contacts(name, phone, address)').eq('id', txId).single();
    if (txError) console.error("Error txData:", txError);
    const { data: itemsData, error: itemsError } = await supabase.from('transaction_items').select('*, product:products(name, dimensions)').eq('transaction_id', txId);
    if (itemsError) console.error("Error itemsData:", itemsError);
    if (txData) setTransaction(txData);
    if (itemsData) setItems(itemsData);
  };

  useEffect(() => {
    if (transaction) {
      setTimeout(() => window.print(), 500);
    }
  }, [transaction]);

  const formatRupiah = (number: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number);
  const formatDate = (dateString: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateString));

  if (!transaction) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-200">
      <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-6 text-2xl font-bold text-black animate-pulse">Menyiapkan Bukti PO...</p>
      <p className="mt-2 text-base text-gray-600 font-semibold">Memuat data dari server, mohon tunggu.</p>
    </div>
  );

  return (
    <div className="bg-gray-200 min-h-screen py-8 print:py-0 print:bg-transparent">
      {/* Header Print */}
      <div className="flex justify-between p-4 mb-4 bg-gray-100 border border-gray-300 print:hidden max-w-[210mm] mx-auto">
        <Link href={`/pembelian/${txId}`} className="bg-gray-500 text-white px-6 py-2 rounded font-bold shadow hover:bg-gray-600 transition-colors flex items-center justify-center">
          ⬅️ Kembali ke Detail
        </Link>
        <button onClick={() => window.print()} className="bg-black text-white px-8 py-2 rounded font-bold shadow hover:bg-gray-800 transition-colors">
          🖨️ Cetak Ulang
        </button>
      </div>

      {/* A4 Printable Container */}
      <div className="print:shadow-none print:border-none print:m-0 print:p-0 w-[210mm] max-w-full mx-auto bg-white shadow-2xl border-2 border-black font-mono text-black p-8">
        
        {/* Kop Surat */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter">UD DOKAR</h1>
            <p className="text-sm font-bold mt-1 uppercase">Pabrik Produksi Kardus Berkualitas</p>
            <p className="text-sm">Jl. Industri No. 123, Kota Pabrik</p>
            <p className="text-sm">Telp: 0812-3456-7890</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-black uppercase tracking-widest border-b-2 border-black pb-1 mb-2">PURCHASE ORDER</h2>
            <p className="text-sm font-bold">No. PO: {transaction.id.split('-')[0].toUpperCase()}</p>
            <p className="text-sm font-bold">Tanggal: {formatDate(transaction.created_at)}</p>
          </div>
        </div>

        {/* Info Pelanggan */}
        <div className="mb-6 border-2 border-black p-4">
          <h3 className="text-sm font-bold uppercase border-b-2 border-black mb-2 inline-block">Order Kepada Supplier:</h3>
          <p className="text-xl font-black">{transaction.contact?.name}</p>
          <p className="font-bold text-sm">{transaction.contact?.phone || 'Tanpa no. telepon'}</p>
          <p className="font-bold text-sm max-w-md">{transaction.contact?.address || 'Tanpa alamat'}</p>
        </div>

        {/* Tabel Barang */}
        <table className="w-full border-collapse border-2 border-black mb-8 text-sm">
          <thead className="border-b-2 border-black">
            <tr>
              <th className="border-2 border-black p-2 text-center font-black w-10">No</th>
              <th className="border-2 border-black p-2 text-left font-black">Nama Bahan Baku</th>
              <th className="border-2 border-black p-2 text-center font-black w-24">Qty</th>
              <th className="border-2 border-black p-2 text-right font-black w-32">Harga Satuan</th>
              <th className="border-2 border-black p-2 text-right font-black w-36">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id}>
                <td className="border-2 border-black p-2 text-center font-bold">{index + 1}</td>
                <td className="border-2 border-black p-2 font-bold">{item.product?.name}</td>
                <td className="border-2 border-black p-2 text-center font-black text-base">{item.quantity}</td>
                <td className="border-2 border-black p-2 text-right font-bold">{formatRupiah(item.price)}</td>
                <td className="border-2 border-black p-2 text-right font-black">{formatRupiah(item.quantity * item.price)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="border-2 border-black p-3 text-right font-black uppercase tracking-wide">Total Order Tagihan</td>
              <td className="border-2 border-black p-3 text-right font-black text-lg">{formatRupiah(transaction.total_amount)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Tanda Tangan */}
        <div className="flex justify-between mt-12 pt-4">
          <div className="text-center w-48">
            <p className="font-bold mb-20 uppercase">Menyetujui, Supplier</p>
            <div className="border-b-2 border-black mx-auto"></div>
            <p className="mt-2 font-black uppercase">{transaction.contact?.name}</p>
          </div>
          <div className="text-center w-48">
            <p className="font-bold mb-20 uppercase">Purchasing, UD Dokar</p>
            <div className="border-b-2 border-black mx-auto"></div>
            <p className="mt-2 font-black uppercase">Divisi Pembelian</p>
          </div>
        </div>
      </div>
    </div>
  );
}
