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
      {/* Header Print (Navigasi) */}
      <div className="flex justify-between p-4 mb-4 bg-white border-2 border-gray-300 print:hidden max-w-[210mm] mx-auto rounded-xl shadow-sm">
        <Link href={`/penjualan/${txId}`} className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all flex items-center gap-2">
          <ArrowLeft size={18} /> Kembali ke Detail
        </Link>
        <button onClick={() => window.print()} className="bg-black hover:bg-gray-800 text-white px-8 py-2 rounded-lg font-bold shadow-md transition-all flex items-center gap-2 border-2 border-black">
          <Printer size={18} /> Cetak Ulang
        </button>
      </div>

      {/* Container Utama A4 */}
      <div className="w-full mx-auto border-4 border-black p-8 bg-white shadow-2xl relative print:border-none print:shadow-none">
        
        {/* Header Section */}
        <div className="flex justify-between border-b-4 border-black pb-2 mb-4">
          <div>
            <h1 className="text-4xl font-black tracking-tighter leading-none">UD DOKAR</h1>
            <p className="text-[10px] font-black uppercase mt-1 tracking-widest">MENYEDIAKAN DUS & CUSTOM</p>
            <p className="text-[10px] font-bold mt-1">No. HP / WA: 0812-XXXX-XXXX</p>
          </div>
          <div className="text-right flex flex-col justify-end">
            <p className="font-black text-base">Tanggal: {formatDate(data.created_at)}</p>
            <div className="mt-2 border-2 border-black p-2 text-left min-w-[200px] bg-gray-50">
              <p className="text-[9px] uppercase font-black text-gray-500 mb-0.5">Kepada Yth:</p>
              <p className="font-black text-lg leading-tight uppercase">{data.contact?.name}</p>
              <p className="text-[11px] font-bold mt-0.5 leading-snug">{data.contact?.address || 'Alamat tidak tersedia'}</p>
            </div>
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-black inline-block border-b-4 border-black pb-0.5 uppercase tracking-tight">NOTA PENJUALAN</h2>
          <p className="text-[10px] font-bold mt-1">#{data.id.slice(0,12).toUpperCase()}</p>
        </div>

        {/* Tabel Utama dengan Style Border Tegas */}
        <table className="w-full border-collapse border-4 border-black mb-6">
          <thead>
            <tr className="bg-black text-white">
              <th className="border-2 border-white px-2 py-2 w-24 text-center font-black text-[11px] uppercase">Banyaknya</th>
              <th className="border-2 border-white px-4 py-2 text-left font-black text-[11px] uppercase">Nama Barang</th>
              <th className="border-2 border-white px-4 py-2 text-right font-black text-[11px] uppercase">Harga Satuan</th>
              <th className="border-2 border-white px-4 py-2 text-right font-black text-[11px] uppercase">Jumlah (Rp)</th>
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
            {[...Array(Math.max(0, 5 - (data.items?.length || 0)))].map((_, i) => (
              <tr key={i} className="h-10">
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
            
            <div className="grid grid-cols-2 gap-8 text-center mt-2">
              <div className="flex flex-col items-center">
                <p className="text-[9px] font-black uppercase mb-10">Tanda Tangan Pelanggan</p>
                <div className="border-b-2 border-black w-32"></div>
                <p className="text-[8px] font-bold mt-1">( ............................ )</p>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-[9px] font-black uppercase mb-10">Hormat Kami,</p>
                <h3 className="font-black text-lg underline decoration-double uppercase leading-none">UD DOKAR</h3>
                <p className="text-[8px] font-bold mt-1">Admin Gudang</p>
              </div>
            </div>
          </div>

          <div className="w-80 shrink-0">
            <div className="border-[4px] border-black p-4 bg-white">
              {discountMeta ? (
                <>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black uppercase tracking-tighter">Subtotal</span>
                    <span className="font-black text-base">{formatRupiah(subtotalBeforeDiscount)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-1 text-green-700">
                    <span className="text-[10px] font-black uppercase tracking-tighter">
                      Diskon {discountMeta.discount_type === 'persen' ? `${discountMeta.discount_value}%` : 'Nominal'}
                      {discountMeta.discount_label && <span className="block text-[8px] normal-case italic font-bold">{discountMeta.discount_label}</span>}
                    </span>
                    <span className="font-black text-base">-{formatRupiah(discountMeta.discount_amount)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2 border-b-2 border-black pb-1 text-red-600">
                    <span className="text-[10px] font-black uppercase tracking-tighter">Sudah Dibayar</span>
                    <span className="font-black text-base">-{formatRupiah(data.amount_paid)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black uppercase tracking-tighter">Total Gross</span>
                    <span className="font-black text-base">{formatRupiah(data.total_amount)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2 border-b-2 border-black pb-1 text-red-600">
                    <span className="text-[10px] font-black uppercase tracking-tighter">Sudah Dibayar</span>
                    <span className="font-black text-base">-{formatRupiah(data.amount_paid)}</span>
                  </div>
                </>
              )}
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black uppercase text-gray-500 mb-0.5">Sisa Tagihan:</span>
                <span className="text-3xl font-black bg-black text-white px-2 py-1 leading-none">Rp {formatRupiah(data.total_amount - data.amount_paid)}</span>
              </div>
            </div>
            <p className="text-[10px] text-center mt-4 font-black uppercase tracking-widest italic border-y border-black py-1">TERIMA KASIH ATAS KERJASAMANYA</p>
          </div>
        </div>
      </div>
    </div>
  );
}
