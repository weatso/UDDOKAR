"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Printer } from 'lucide-react';

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

  if (!data) return <div className="p-8 font-black text-black">Menyiapkan Nota Penjualan...</div>;

  const formatDate = (d: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d));
  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n);

  return (
    <div className="bg-white min-h-screen p-0 md:p-10 font-mono text-black print:bg-white">
      {/* Container Utama A4 */}
      <div className="max-w-[210mm] mx-auto border-4 border-black p-8 bg-white shadow-none relative print:border-none print:p-0">
        
        {/* Header Section */}
        <div className="flex justify-between border-b-4 border-black pb-4 mb-8">
          <div>
            <h1 className="text-5xl font-black tracking-tighter leading-none">UD DOKAR</h1>
            <p className="text-sm font-black uppercase mt-1 tracking-widest">MENYEDIAKAN DUS & CUSTOM</p>
            <p className="text-sm font-bold mt-2">No. HP / WA: 0812-XXXX-XXXX</p>
          </div>
          <div className="text-right flex flex-col justify-end">
            <p className="font-black text-lg">Tanggal: {formatDate(data.created_at)}</p>
            <div className="mt-3 border-4 border-black p-3 text-left min-w-[250px] bg-gray-50">
              <p className="text-[10px] uppercase font-black text-gray-500 mb-1">Kepada Yth:</p>
              <p className="font-black text-xl leading-tight uppercase">{data.contact?.name}</p>
              <p className="text-sm font-bold mt-1 leading-snug">{data.contact?.address || 'Alamat tidak tersedia'}</p>
              <p className="text-xs font-bold mt-1 italic">{data.contact?.phone || '-'}</p>
            </div>
          </div>
        </div>

        <div className="text-center mb-10">
          <h2 className="text-3xl font-black inline-block border-b-8 border-black pb-1 uppercase tracking-tight">NOTA PENJUALAN</h2>
          <p className="text-xs font-bold mt-2">#{data.id.slice(0,12).toUpperCase()}</p>
        </div>

        {/* Tabel Utama dengan Style Border Tegas */}
        <table className="w-full border-collapse border-4 border-black mb-10">
          <thead>
            <tr className="bg-black text-white">
              <th className="border-2 border-white px-3 py-3 w-28 text-center font-black text-sm uppercase">Banyaknya</th>
              <th className="border-2 border-white px-5 py-3 text-left font-black text-sm uppercase">Nama Barang</th>
              <th className="border-2 border-white px-5 py-3 text-right font-black text-sm uppercase">Harga Satuan</th>
              <th className="border-2 border-white px-5 py-3 text-right font-black text-sm uppercase">Jumlah (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {data.items?.map((item: any, idx: number) => (
              <tr key={idx} className="h-12">
                <td className="border-2 border-black px-3 py-2 text-center font-black text-xl">{item.quantity}</td>
                <td className="border-2 border-black px-5 py-2 font-black text-lg">
                  {item.product?.name} 
                  <span className="text-xs ml-3 font-bold text-gray-600 italic">P:{item.product?.dimensions?.p} L:{item.product?.dimensions?.l}</span>
                </td>
                <td className="border-2 border-black px-5 py-2 text-right font-bold text-lg">{formatRupiah(item.price)}</td>
                <td className="border-2 border-black px-5 py-2 text-right font-black text-xl">{formatRupiah(item.quantity * item.price)}</td>
              </tr>
            ))}
            {/* Row Kosong untuk estetika nota manual agar tabel tetap penuh */}
            {[...Array(Math.max(0, 8 - (data.items?.length || 0)))].map((_, i) => (
              <tr key={i} className="h-12">
                <td className="border-2 border-black"></td>
                <td className="border-2 border-black"></td>
                <td className="border-2 border-black"></td>
                <td className="border-2 border-black"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer Section */}
        <div className="flex justify-between items-start gap-10">
          <div className="flex-1">
            <div className="border-2 border-black p-3 bg-gray-50 mb-6">
              <p className="text-[10px] italic font-black leading-tight text-gray-700">
                ⚠️ PERHATIAN:<br />
                - Barang-barang yang sudah dibeli tidak dapat ditukar atau dikembalikan.<br />
                - Pembayaran dianggap sah jika sudah ada tanda tangan penerima & stempel toko.<br />
                - Mohon periksa kembali kondisi barang saat diterima.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-8 text-center mt-4">
              <div className="flex flex-col items-center">
                <p className="text-[10px] font-black uppercase mb-16">Tanda Tangan Pelanggan</p>
                <div className="border-b-4 border-black w-40"></div>
                <p className="text-[9px] font-bold mt-1">( ............................ )</p>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-[10px] font-black uppercase mb-16">Hormat Kami,</p>
                <h3 className="font-black text-xl underline decoration-double uppercase">UD DOKAR</h3>
                <p className="text-[9px] font-bold mt-1">Admin Gudang</p>
              </div>
            </div>
          </div>

          <div className="w-80 shrink-0">
            <div className="border-[6px] border-black p-5 bg-white">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-black uppercase tracking-tighter">Total Gross</span>
                <span className="font-black text-lg">{formatRupiah(data.total_amount)}</span>
              </div>
              <div className="flex justify-between items-center mb-3 border-b-4 border-black pb-2 text-red-600">
                <span className="text-xs font-black uppercase tracking-tighter">Sudah Dibayar</span>
                <span className="font-black text-lg">-{formatRupiah(data.amount_paid)}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-black uppercase text-gray-500 mb-1">Sisa Tagihan:</span>
                <span className="text-4xl font-black bg-black text-white px-3 py-1">Rp {formatRupiah(data.total_amount - data.amount_paid)}</span>
              </div>
            </div>
            <p className="text-[10px] text-center mt-4 font-black uppercase tracking-widest italic border-y border-black py-1">TERIMA KASIH ATAS KERJASAMANYA</p>
          </div>
        </div>
      </div>

      {/* Kontrol Cetak (Hanya tampil di layar) */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 print:hidden z-50">
        <button 
          onClick={() => window.print()} 
          className="bg-black text-white px-12 py-5 rounded-full font-black shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center gap-4 border-4 border-gray-300"
        >
          <Printer size={28} /> 
          <span className="text-xl">CETAK NOTA SEKARANG</span>
        </button>
      </div>
    </div>
  );
}
