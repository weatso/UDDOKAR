"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Printer, ArrowLeft } from 'lucide-react';

export default function CetakNotaSO() {
  const params = useParams();
  const txId = params.id as string;
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (txId) {
      supabase.from('transactions')
        .select('*, contact:contacts(*), items:transaction_items(*, product:products(*))')
        .eq('id', txId).single()
        .then(({ data }) => setData(data));
    }
  }, [txId]);

  useEffect(() => {
    if (data) {
      setTimeout(() => window.print(), 500);
    }
  }, [data]);

  if (!data) return <div className="p-8 font-black text-black">Menyiapkan Nota Penjualan...</div>;

  const formatDate = (d: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d));
  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n);
  const discountMeta = (() => { try { return data.notes ? JSON.parse(data.notes) : null; } catch { return null; } })();
  const subtotalBeforeDiscount = discountMeta?.subtotal_before_discount ?? data.total_amount;

  return (
    <div className="bg-gray-100 min-h-screen py-8 print:py-0 print:bg-transparent print:min-h-0 print:p-0 font-mono text-black">
      <style jsx global>{`
        @media print {
          @page { 
            size: landscape; 
            margin: 5mm 10mm; 
          }
          body { 
            background: none;
          }
        }
      `}</style>

      {/* Header Navigasi (Hidden on Print) */}
      <div className="flex justify-between p-4 mb-4 bg-white border-2 border-gray-300 print:hidden max-w-[210mm] mx-auto rounded-xl shadow-sm">
        <Link href={`/penjualan/${txId}`} className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all flex items-center gap-2">
          <ArrowLeft size={18} /> Kembali ke Detail
        </Link>
        <button onClick={() => window.print()} className="bg-black hover:bg-gray-800 text-white px-8 py-2 rounded-lg font-bold shadow-md transition-all flex items-center gap-2 border-2 border-black">
          <Printer size={18} /> Cetak Nota
        </button>
      </div>

      {/* Container Utama (Landscape) */}
      <div className="w-full max-w-[297mm] mx-auto border-2 border-black p-6 bg-white shadow-2xl relative print:border-none print:shadow-none print:max-w-none print:p-0">
        
        {/* Header Section: Horizontal Layout */}
        <div className="grid grid-cols-2 gap-8 border-b-2 border-black pb-2 mb-3">
          {/* Sisi Kiri: Perusahaan & Pelanggan */}
          <div className="flex gap-6">
            <div className="shrink-0">
              <h1 className="text-3xl font-black tracking-tighter leading-none">UD DOKAR</h1>
              <p className="text-[9px] font-black uppercase mt-0.5 tracking-widest">KARDUS & CUSTOM</p>
              <p className="text-[9px] font-bold">WA: 0812-XXXX-XXXX</p>
            </div>
            <div className="border-l-2 border-black pl-4">
              <p className="text-[8px] uppercase font-black text-gray-500">Pelanggan:</p>
              <p className="font-black text-base leading-none uppercase">{data.contact?.name}</p>
              <p className="text-[10px] font-bold leading-tight mt-1 max-w-[250px]">{data.contact?.address || 'Alamat tidak tersedia'}</p>
            </div>
          </div>

          {/* Sisi Kanan: Info Faktur */}
          <div className="flex justify-end items-end gap-4 pb-1">
            <div className="text-right border-r-2 border-black pr-4">
              <p className="text-[8px] uppercase font-black text-gray-500">No. Faktur</p>
              <p className="font-black text-sm">#{data.id.slice(0,8).toUpperCase()}</p>
            </div>
            <div className="text-right border-r-2 border-black pr-4">
              <p className="text-[8px] uppercase font-black text-gray-500">Tgl Faktur</p>
              <p className="font-black text-sm">{formatDate(data.created_at)}</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] uppercase font-black text-gray-500">Status</p>
              <p className="font-black text-sm uppercase">{data.status}</p>
            </div>
          </div>
        </div>

        <h2 className="text-center text-xl font-black uppercase tracking-widest mb-3 leading-none">Nota Penjualan</h2>

        {/* Tabel Barang: Compact Padding */}
        <table className="w-full border-collapse border-2 border-black mb-4">
          <thead>
            <tr className="bg-black text-white">
              <th className="border border-black px-2 py-1 w-16 text-center font-black text-[10px] uppercase tracking-tighter">Qty</th>
              <th className="border border-black px-3 py-1 text-left font-black text-[10px] uppercase tracking-tighter">Nama Barang / Spesifikasi</th>
              <th className="border border-black px-3 py-1 text-right font-black text-[10px] uppercase tracking-tighter">Harga Satuan</th>
              <th className="border border-black px-3 py-1 text-right font-black text-[10px] uppercase tracking-tighter">Jumlah (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {data.items?.map((item: any, idx: number) => (
              <tr key={idx} className="h-8">
                <td className="border border-black px-2 py-1 text-center font-bold text-base">{item.quantity}</td>
                <td className="border border-black px-3 py-1 font-bold text-base">
                  {item.product?.name} 
                  <span className="text-[10px] ml-4 font-normal text-gray-600">Dimensi: {item.product?.dimensions?.p}x{item.product?.dimensions?.l} cm</span>
                </td>
                <td className="border border-black px-3 py-1 text-right font-bold text-base">{formatRupiah(item.price)}</td>
                <td className="border border-black px-3 py-1 text-right font-black text-lg">{formatRupiah(item.quantity * item.price)}</td>
              </tr>
            ))}
            {/* Filler rows untuk menjaga layout tetap konsisten */}
            {[...Array(Math.max(0, 4 - (data.items?.length || 0)))].map((_, i) => (
              <tr key={i} className="h-8">
                <td className="border border-black"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer Section: Horizontal Layout */}
        <div className="flex justify-between items-start gap-8">
          {/* Kiri: Tanda Tangan & Keterangan */}
          <div className="flex gap-8 flex-1">
            <div className="space-y-2 max-w-[300px]">
              <p className="text-[9px] font-black border-b border-black pb-0.5 inline-block uppercase">Keterangan:</p>
              <p className="text-[8px] italic leading-tight text-gray-700">
                - Barang sudah dibeli tidak dapat ditukar/dikembalikan.<br />
                - Pembayaran sah jika ada tanda tangan & stempel.<br />
                - Cek kondisi barang saat diterima.
              </p>
            </div>
            
            <div className="flex gap-8 text-center pt-2">
              <div className="w-24">
                <p className="text-[8px] font-black uppercase mb-10">Penerima,</p>
                <div className="border-b border-black"></div>
              </div>
              <div className="w-24">
                <p className="text-[8px] font-black uppercase mb-10">Hormat Kami,</p>
                <div className="border-b border-black"></div>
                <p className="text-[7px] font-bold mt-0.5">UD DOKAR</p>
              </div>
            </div>
          </div>

          {/* Kanan: Ringkasan Biaya (Compact & Rata Kanan) */}
          <div className="w-64 shrink-0 border-2 border-black p-2 bg-gray-50">
            {discountMeta ? (
              <div className="space-y-0.5 border-b border-gray-300 pb-1 mb-1">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold uppercase">Subtotal</span>
                  <span className="font-bold text-sm">{formatRupiah(subtotalBeforeDiscount)}</span>
                </div>
                <div className="flex justify-between items-center text-green-700">
                  <span className="text-[9px] font-bold uppercase">Diskon</span>
                  <span className="font-bold text-sm">-{formatRupiah(discountMeta.discount_amount)}</span>
                </div>
              </div>
            ) : null}
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[9px] font-black uppercase">Total Akhir</span>
              <span className="font-black text-base">{formatRupiah(data.total_amount)}</span>
            </div>
            <div className="flex justify-between items-center text-red-600 mb-1 border-b border-black pb-0.5">
              <span className="text-[9px] font-bold uppercase tracking-tighter">Sudah Dibayar</span>
              <span className="font-bold text-sm">-{formatRupiah(data.amount_paid)}</span>
            </div>
            <div className="flex justify-between items-center pt-0.5">
              <span className="text-[10px] font-black uppercase bg-black text-white px-1">Sisa Tagihan</span>
              <span className="text-xl font-black">Rp {formatRupiah(data.total_amount - data.amount_paid)}</span>
            </div>
          </div>
        </div>

        <p className="text-center text-[8px] font-bold uppercase mt-4 italic opacity-50 tracking-widest">
          Terima kasih atas kepercayaannya. Harap simpan nota ini sebagai bukti transaksi sah.
        </p>
      </div>
    </div>
  );
}
