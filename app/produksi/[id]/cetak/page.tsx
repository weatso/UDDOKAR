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
    <div className="bg-gray-200 min-h-screen py-8 print:py-0 print:bg-transparent print:min-h-0 font-mono text-black">
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
      <div className="flex justify-between p-4 mb-4 bg-gray-100 border border-gray-300 print:hidden max-w-[210mm] mx-auto">
        <Link href={`/produksi/${spkId}`} className="bg-gray-500 text-white px-6 py-2 rounded font-bold shadow hover:bg-gray-600 transition-colors flex items-center justify-center">
          ⬅️ Kembali ke Detail
        </Link>
        <button onClick={() => window.print()} className="bg-black text-white px-8 py-2 rounded font-bold shadow hover:bg-gray-800 transition-colors">
          🖨️ Cetak SPK
        </button>
      </div>

      {/* Container Utama (Landscape) */}
      <div className="w-full max-w-[297mm] mx-auto bg-white border-2 border-black p-6 print:border-none print:p-0">
        
        {/* Header Section: Horizontal Layout */}
        <div className="grid grid-cols-2 gap-8 border-b-2 border-black pb-2 mb-4">
          {/* Sisi Kiri: Detail Dokumen */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase bg-black text-white px-1">Nomor SPK</span>
              <span className="text-lg font-black tracking-tight">{order.spk_number}</span>
            </div>
            <p className="text-xs font-bold italic">Tgl Diterbitkan: {formatDate(order.created_at)}</p>
          </div>

          {/* Sisi Kanan: Identitas & Judul */}
          <div className="text-right flex flex-col items-end">
            <h1 className="text-3xl font-black tracking-tighter leading-none mb-1">UD DOKAR</h1>
            <h2 className="text-lg font-black uppercase tracking-widest border-y border-black px-4 py-0.5">Surat Perintah Kerja</h2>
          </div>
        </div>

        {/* Tabel Informasi Produksi Utama (Horizontal) */}
        <table className="w-full border-collapse border-2 border-black mb-4">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-black">
              <th className="border-r-2 border-black p-2 text-left w-1/3 text-[10px] uppercase font-black tracking-tight">Informasi Produk & Target</th>
              <th className="border-r-2 border-black p-2 text-left w-1/3 text-[10px] uppercase font-black tracking-tight">Spesifikasi Cetak / Dimensi</th>
              <th className="p-2 text-left w-1/3 text-[10px] uppercase font-black tracking-tight">Realisasi & Reject (Manual)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {/* Kolom 1: Produk */}
              <td className="border-r-2 border-black p-3 align-top">
                <p className="text-[8px] uppercase font-black text-gray-500 mb-0.5">Produk:</p>
                <p className="text-base font-black leading-tight mb-2">{order.product?.name}</p>
                <p className="text-[8px] uppercase font-black text-gray-500 mb-0.5">Target Produksi:</p>
                <p className="text-3xl font-black leading-none">{order.target_quantity} <span className="text-xs">PCS</span></p>
              </td>
              {/* Kolom 2: Dimensi */}
              <td className="border-r-2 border-black p-3 align-top">
                <table className="w-full text-[11px] font-bold">
                  <tbody>
                    <tr><td className="w-20 uppercase text-[9px] font-black text-gray-500">Panjang</td><td className="font-black">: {order.product?.dimensions?.p} cm</td></tr>
                    <tr><td className="w-20 uppercase text-[9px] font-black text-gray-500">Lebar</td><td className="font-black">: {order.product?.dimensions?.l} cm</td></tr>
                    <tr><td className="w-20 uppercase text-[9px] font-black text-gray-500">Tinggi</td><td className="font-black">: {order.product?.dimensions?.t} cm</td></tr>
                    <tr><td className="w-20 uppercase text-[9px] font-black text-gray-500">Gramasi</td><td className="font-black">: {order.product?.dimensions?.gramasi} gr</td></tr>
                  </tbody>
                </table>
              </td>
              {/* Kolom 3: Slot Kosong */}
              <td className="p-3 align-top space-y-4">
                <div className="flex items-end gap-2">
                  <span className="text-[9px] font-black uppercase text-gray-500">Hasil Sukses:</span>
                  <div className="border-b border-black w-16 mb-0.5"></div>
                  <span className="text-[9px] font-bold">PCS</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-[9px] font-black uppercase text-gray-500">Hasil Reject:</span>
                  <div className="border-b border-black w-16 mb-0.5"></div>
                  <span className="text-[9px] font-bold">PCS</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Form Bahan Baku (Landscape) */}
        <div className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-widest mb-1 border-l-4 border-black pl-2">Laporan Penggunaan Bahan Baku</p>
          <table className="w-full border-collapse border-2 border-black">
            <thead>
              <tr className="bg-gray-100 border-b border-black">
                <th className="border-r border-black p-1 text-[9px] uppercase font-black w-1/4">Bahan Baku Utama</th>
                <th className="border-r border-black p-1 text-[9px] uppercase font-black w-1/4">Tinta / Lem</th>
                <th className="p-1 text-[9px] uppercase font-black w-1/2">Catatan Masalah Produksi</th>
              </tr>
            </thead>
            <tbody>
              <tr className="h-20">
                <td className="border-r border-black p-2 align-top text-[10px] font-bold italic text-gray-400">Tulis pemakaian...</td>
                <td className="border-r border-black p-2 align-top text-[10px] font-bold italic text-gray-400">Tulis pemakaian...</td>
                <td className="p-2 align-top text-[10px] font-bold italic text-gray-400">Tulis kendala mesin/bahan jika ada...</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer: 4 Kotak Tanda Tangan */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="text-center">
            <p className="text-[9px] font-black uppercase mb-1">Dibuat oleh,</p>
            <div className="border border-black h-20 bg-white"></div>
            <p className="text-[8px] font-bold mt-0.5">( Admin PPIC )</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black uppercase mb-1">Dikerjakan oleh,</p>
            <div className="border border-black h-20 bg-white"></div>
            <p className="text-[8px] font-bold mt-0.5">( Operator )</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black uppercase mb-1">Diperiksa oleh,</p>
            <div className="border border-black h-20 bg-white"></div>
            <p className="text-[8px] font-bold mt-0.5">( QC / Mandor )</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black uppercase mb-1">Diketahui oleh,</p>
            <div className="border border-black h-20 bg-white"></div>
            <p className="text-[8px] font-bold mt-0.5">( Kepala Pabrik )</p>
          </div>
        </div>

        <p className="text-center text-[7px] font-bold uppercase mt-4 italic opacity-50 tracking-widest">
          Surat Perintah Kerja ini merupakan dokumen sah instruksi produksi UD DOKAR. Harap diproses sesuai target.
        </p>
      </div>
    </div>
  );
}
