"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function CetakSPKPage() {
  const params = useParams();
  const router = useRouter();
  const spkId = params.id as string;
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (spkId) fetchDetail();
  }, [spkId]);

  const fetchDetail = async () => {
    console.log("Mulai fetch data cetak SPK:", spkId);
    const { data, error } = await supabase.from('production_orders').select('*, product:products!target_product_id(name, dimensions)').eq('id', spkId).single();
    if (error) console.error("Error data SPK:", error);
    if (data) setOrder(data);
  };

  useEffect(() => {
    if (order) {
      setTimeout(() => window.print(), 500);
    }
  }, [order]);

  const formatDate = (dateString: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateString));

  if (!order) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-200">
      <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-6 text-2xl font-bold text-black animate-pulse">Menyiapkan SPK Produksi...</p>
      <p className="mt-2 text-base text-gray-600 font-semibold">Memuat data dari server, mohon tunggu.</p>
    </div>
  );

  return (
    <div className="bg-gray-200 min-h-screen py-8 print:py-0 print:bg-transparent print:min-h-0">
      {/* Header Print */}
      <div className="flex justify-between p-4 mb-4 bg-gray-100 border border-gray-300 print:hidden max-w-[210mm] mx-auto">
        <Link href={`/produksi/${spkId}`} className="bg-gray-500 text-white px-6 py-2 rounded font-bold shadow hover:bg-gray-600 transition-colors flex items-center justify-center">
          ⬅️ Kembali ke Detail
        </Link>
        <button onClick={() => window.print()} className="bg-black text-white px-8 py-2 rounded font-bold shadow hover:bg-gray-800 transition-colors">
          🖨️ Cetak Ulang
        </button>
      </div>

      {/* A4 Printable Container */}
      <div className="print:shadow-none print:border-none w-full mx-auto bg-white shadow-2xl border-2 border-black font-mono text-black p-8">
        
        {/* Kop Surat */}
        <div className="text-center border-b-4 border-black pb-2 mb-4">
          <h1 className="text-3xl font-black tracking-tighter uppercase">UD DOKAR</h1>
          <h2 className="text-xl font-black mt-1 uppercase tracking-widest border-black inline-block border-b-2">SURAT PERINTAH KERJA (SPK)</h2>
          <p className="font-bold mt-0.5 uppercase text-[10px]">Dokumen Internal Pabrik Produksi</p>
        </div>

        {/* Info SPK */}
        <div className="grid grid-cols-2 gap-8 mb-4 border-2 border-black p-3 text-xs">
          <div>
            <p className="font-bold mb-1">No. SPK : <span className="font-black text-base ml-2">{order.spk_number}</span></p>
            <p className="font-bold">Diterbitkan : <span className="font-black ml-2">{formatDate(order.created_at)}</span></p>
          </div>
          <div className="text-right">
            <p className="font-bold italic">Batas Waktu: <span className="font-black">Menyesuaikan</span></p>
            <p className="font-bold mt-1 uppercase text-[10px]">Wajib Lapor Hasil Jika Selesai</p>
          </div>
        </div>

        {/* Target Produksi */}
        <div className="border-2 border-black mb-4 flex">
          <div className="w-2/3 p-3 border-r-2 border-black">
            <p className="font-bold uppercase tracking-widest text-[10px] mb-1 border-b-2 border-black inline-block pb-0.5">Kardus yang Dibuat:</p>
            <p className="text-xl font-black mb-2 uppercase leading-none">{order.product?.name}</p>
            
            <p className="font-bold uppercase tracking-widest text-[10px] mb-1 border-b-2 border-black inline-block pb-0.5">Dimensi Cetak:</p>
            <table className="w-full text-left font-bold text-[11px] mt-0.5">
              <tbody>
                <tr><td className="py-0.5">Panjang</td><td>: {order.product?.dimensions?.p} cm</td></tr>
                <tr><td className="py-0.5">Lebar</td><td>: {order.product?.dimensions?.l} cm</td></tr>
                <tr><td className="py-0.5">Tinggi</td><td>: {order.product?.dimensions?.t} cm</td></tr>
                <tr><td className="py-0.5">Gramasi</td><td>: {order.product?.dimensions?.gramasi} gr</td></tr>
              </tbody>
            </table>
          </div>
          <div className="w-1/3 p-3 flex flex-col justify-center items-center bg-gray-100 text-center">
            <p className="font-bold uppercase tracking-widest text-[10px] mb-1">Target Produksi</p>
            <p className="text-4xl font-black leading-none">{order.target_quantity}</p>
            <p className="font-black text-sm mt-1 uppercase">Pcs / Lembar</p>
          </div>
        </div>

        {/* Form Laporan Operator (Kosong) */}
        <div className="mb-4">
          <p className="font-bold text-[10px] uppercase mb-1">Laporan Operator Mesin (Diisi Manual)</p>
          <table className="w-full border-collapse border-2 border-black text-[11px]">
            <thead>
              <tr className="border-b-2 border-black bg-gray-100">
                <th className="border-r-2 border-black p-2 text-left w-1/2 uppercase font-black tracking-tight">Pemakaian Bahan Baku</th>
                <th className="p-2 text-left w-1/2 uppercase font-black tracking-tight">Hasil Jadi & Reject</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b-2 border-black">
                <td className="border-r-2 border-black p-2 h-20 align-top font-bold">
                  Kertas Terpakai (Kg/Lbr): <br/><br/>
                  Tinta Terpakai (Liter):
                </td>
                <td className="p-2 h-20 align-top font-bold">
                  Kardus Sukses (Pcs): <br/><br/>
                  Kardus Reject (Pcs):
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="p-2 h-16 align-top font-bold">
                  Masalah Mesin / Produksi:
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tanda Tangan */}
        <div className="flex justify-between mt-4 pt-2 text-[11px]">
          <div className="text-center w-40">
            <p className="font-bold mb-12 uppercase tracking-tighter">Operator Mesin / Mandor</p>
            <div className="border-b-2 border-black mx-auto"></div>
            <p className="mt-1 font-black uppercase">(Nama Terang)</p>
          </div>
          <div className="text-center w-40">
            <p className="font-bold mb-12 uppercase tracking-tighter">Kepala Produksi (PPIC)</p>
            <div className="border-b-2 border-black mx-auto"></div>
            <p className="mt-1 font-black uppercase underline">UD DOKAR</p>
          </div>
        </div>
      </div>
    </div>
  );
}
