"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Printer, FileText, Truck } from 'lucide-react';

// ─── Terbilang Helper ───────────────────────────────────────────────────────
function terbilang(n: number): string {
  if (n === 0) return 'Nol Rupiah';
  const s = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  const c = (x: number): string => {
    if (x < 12) return s[x];
    if (x < 20) return s[x - 10] + ' Belas';
    if (x < 100) return s[Math.floor(x / 10)] + ' Puluh' + (x % 10 ? ' ' + s[x % 10] : '');
    if (x < 200) return 'Seratus' + (x - 100 ? ' ' + c(x - 100) : '');
    if (x < 1000) return s[Math.floor(x / 100)] + ' Ratus' + (x % 100 ? ' ' + c(x % 100) : '');
    if (x < 2000) return 'Seribu' + (x - 1000 ? ' ' + c(x - 1000) : '');
    if (x < 1_000_000) return c(Math.floor(x / 1000)) + ' Ribu' + (x % 1000 ? ' ' + c(x % 1000) : '');
    if (x < 1_000_000_000) return c(Math.floor(x / 1_000_000)) + ' Juta' + (x % 1_000_000 ? ' ' + c(x % 1_000_000) : '');
    return c(Math.floor(x / 1_000_000_000)) + ' Miliar' + (x % 1_000_000_000 ? ' ' + c(x % 1_000_000_000) : '');
  };
  return c(Math.round(n)) + ' Rupiah';
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function CetakSOPage() {
  const params = useParams();
  const txId = params.id as string;
  const [transaction, setTransaction] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'invoice' | 'sj'>('invoice');


  useEffect(() => {
    if (txId) fetchDetail();
  }, [txId]);

  const fetchDetail = async () => {
    setIsLoading(true);
    const { data: txData } = await supabase
      .from('transactions')
      .select('*, contact:contacts(*)')
      .eq('id', txId)
      .single();
    const { data: itemsData } = await supabase
      .from('transaction_items')
      .select('*, product:products(*)')
      .eq('transaction_id', txId);
    if (txData) setTransaction(txData);
    if (itemsData) setItems(itemsData);
    setIsLoading(false);
  };

  if (isLoading || !transaction) return (
    <div className="min-h-screen flex items-center justify-center bg-white font-mono">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-bold text-gray-500">Memuat Dokumen...</p>
      </div>
    </div>
  );

  const rp = (n: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n);
  const tgl = (d: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d));

  let notes: any = { keterangan: '', subtotal_before_discount: 0, discount_amount: 0, discount_value: 0, discount_type: 'persen', item_meta: [] };
  try { notes = { ...notes, ...JSON.parse(transaction.notes || '{}') }; } catch (_) {}

  const ivNo = `IV${transaction.id.split('-')[0].toUpperCase()}`;
  const sjNo = `SJ${transaction.id.split('-')[0].toUpperCase()}`;
  const EMPTY_ROWS_INVOICE = Math.max(0, 7 - items.length);
  const EMPTY_ROWS_SJ = Math.max(0, 6 - items.length);

  return (
    <div className="bg-gray-100 min-h-screen print:min-h-0 print:bg-white font-serif text-black">
      {/* ── Force Landscape + Fit-to-One-Page ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: landscape;
            margin: 3mm 8mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-doc {
            font-size: 10px !important;
          }
          .print-doc table {
            font-size: 9px !important;
          }
          .print-doc .sig-box {
            min-height: 22mm !important;
          }
        }
      `}} />

      {/* ── Control Panel (hidden on print) ─────────────────────────────────── */}
      <div className="print:hidden p-4 md:p-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center bg-white p-5 rounded-2xl shadow-xl border-2 border-purple-100 gap-4">
          <div className="flex items-center gap-6">
            <Link href="/penjualan" className="flex items-center gap-2 text-gray-400 hover:text-black font-black uppercase text-xs tracking-widest transition-colors">
              <ArrowLeft className="w-4 h-4" /> Kembali
            </Link>
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
              <button onClick={() => setView('invoice')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-black text-xs uppercase transition-all ${view === 'invoice' ? 'bg-white text-purple-700 shadow-md' : 'text-gray-500 hover:text-black'}`}>
                <FileText className="w-4 h-4" /> Invoice
              </button>
              <button onClick={() => setView('sj')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-black text-xs uppercase transition-all ${view === 'sj' ? 'bg-white text-purple-700 shadow-md' : 'text-gray-500 hover:text-black'}`}>
                <Truck className="w-4 h-4" /> Surat Jalan
              </button>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="bg-purple-700 hover:bg-purple-800 text-white px-8 py-3 rounded-xl font-black flex items-center gap-3 shadow-lg active:scale-95 transition-all uppercase text-xs tracking-widest border-b-4 border-purple-900">
            <Printer className="w-5 h-5" /> Cetak Dokumen
          </button>
        </div>
      </div>

      {/* ── Preview Container ── */}
      <div className="px-4 pb-8 print:p-0 print:m-0 flex justify-center font-['Times_New_Roman',_Times,_serif] text-black">
        <div className="w-full max-w-5xl print:max-w-none print:w-full print:min-h-0 text-black">

          {/* ════════════════════════════════════════════════════════════════════
              NOTA INVOICE
          ════════════════════════════════════════════════════════════════════ */}
          {view === 'invoice' && (
            <div className="print-doc bg-white print:bg-white shadow-2xl print:shadow-none border border-gray-300 print:border-0 p-8 print:p-0 print:m-0">

              {/* Kop Surat */}
              <div className="text-center mb-4 print:mb-1 pb-3 print:pb-1 border-b-4 border-double border-black text-black">
                <h1 className="text-3xl font-bold uppercase tracking-widest text-black">UD DOKAR</h1>
                <p className="text-sm font-bold">Pabrik Produksi Kardus &amp; Box Custom</p>
              </div>

              {/* Baris Info: Judul + Alamat Pelanggan */}
              <div className="flex gap-6 mb-4 print:mb-2">
                {/* Kiri: NOTA INVOICE + detail nomor */}
                <div className="flex-1">
                  <h2 className="text-xl font-extrabold uppercase underline mb-2 print:mb-1 tracking-wide text-black">NOTA INVOICE</h2>
                  <div className="grid gap-x-2 gap-y-0.5 text-xs" style={{ gridTemplateColumns: '90px 8px 1fr 70px 8px 1fr' }}>
                    <span className="font-bold"># Invoice</span><span>:</span><span className="font-bold">{ivNo}</span>
                    <span className="font-bold"># PO</span><span>:</span><span>-</span>
                    <span className="font-bold">Tanggal</span><span>:</span><span>{tgl(transaction.created_at)}</span>
                    <span className="font-bold"># Surat Jalan</span><span>:</span><span>{sjNo}</span>
                    <span className="font-bold">Jatuh Tempo</span><span>:</span><span>{transaction.status === 'PAID' ? tgl(transaction.created_at) : '-'}</span>
                  </div>
                </div>
                {/* Kanan: Kotak Pelanggan */}
                <div className="w-72 border-2 border-black p-3 self-start">
                  <p className="text-[10px] font-bold uppercase mb-1 underline">Kepada Yth,</p>
                  <p className="font-black text-base uppercase">{transaction.contact?.name}</p>
                  <p className="text-[10px] font-bold uppercase whitespace-pre-wrap leading-snug">{transaction.contact?.address || '-'}</p>
                  <p className="text-[10px] font-bold mt-1">HP: {transaction.contact?.phone || '-'}</p>
                </div>
              </div>

              {/* Tabel Barang */}
              <table className="w-full border-collapse border-2 border-black text-xs">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="border-2 border-black p-1.5 text-center font-bold w-8 uppercase">No.</th>
                    <th className="border-2 border-black p-1.5 text-left font-bold uppercase">Deskripsi Barang</th>
                    <th className="border-2 border-black p-1.5 text-center font-bold w-20 uppercase">Quantity</th>
                    <th className="border-2 border-black p-1.5 text-right font-bold w-28 uppercase">Harga /kg</th>
                    <th className="border-2 border-black p-1.5 text-right font-bold w-32 uppercase">Harga Satuan</th>
                    <th className="border-2 border-black p-1.5 text-right font-bold w-32 uppercase">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id} className="h-8">
                      <td className="border-2 border-black p-1.5 text-center font-medium text-base">{idx + 1}</td>
                      <td className="border-2 border-black p-1.5 font-normal uppercase">{item.product?.name}</td>
                      <td className="border-2 border-black p-1.5 text-center font-semibold text-base">{item.quantity}</td>
                      <td className="border-2 border-black p-1.5 text-right font-semibold text-base">
                        {(() => {
                          const m = (notes.item_meta as any[])?.find((x: any) => x.product_id === item.product_id);
                          return m?.price_per_kg ? rp(Number(m.price_per_kg)) : '-';
                        })()}
                      </td>
                      <td className="border-2 border-black p-1.5 text-right font-semibold text-base">{rp(item.price)}</td>
                      <td className="border-2 border-black p-1.5 text-right font-semibold text-base">{rp(item.quantity * item.price)}</td>
                    </tr>
                  ))}
                  {[...Array(EMPTY_ROWS_INVOICE)].map((_, i) => (
                    <tr key={i} className="h-7 print:h-5">
                      {[...Array(6)].map((__, j) => <td key={j} className="border-2 border-black" />)}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="border-2 border-black p-2 align-top">
                      <p className="text-[9px] font-black uppercase underline mb-1">Terbilang :</p>
                      <p className="font-bold italic">{terbilang(transaction.total_amount)}</p>
                    </td>
                    <td className="border-2 border-black p-2 text-right text-[10px] font-bold space-y-1">
                      <p>Jumlah :</p>
                      <p>Potongan ({notes.discount_value}{notes.discount_type === 'persen' ? '%' : ''}) :</p>
                      <p className="text-base font-bold border-t border-black pt-1">Total :</p>
                    </td>
                    <td className="border-2 border-black p-2 text-right text-[10px] font-semibold space-y-1 text-black">
                      <p>{rp(notes.subtotal_before_discount || transaction.total_amount)}</p>
                      <p>{rp(notes.discount_amount || 0)}</p>
                      <p className="text-base border-t border-black pt-1 font-bold">{rp(transaction.total_amount)}</p>
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Footer */}
              <div className="flex justify-between mt-3 print:mt-1 text-[10px] break-inside-avoid">
                <div>
                  <p className="font-black uppercase underline">Keterangan:</p>
                  <p className="font-bold uppercase">{notes.keterangan || '-'}</p>
                </div>
                <div className="text-right italic text-[9px] space-y-0.5">
                  <p>* Transaksi dianggap sah jika pembayaran telah dikonfirmasi atau bukti transfer diterima.</p>
                  <p>* Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.</p>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              SURAT JALAN
          ════════════════════════════════════════════════════════════════════ */}
          {view === 'sj' && (
            <div className="print-doc bg-white print:bg-white shadow-2xl print:shadow-none border border-gray-300 print:border-0 p-8 print:p-0 print:m-0">

              {/* Header 3-kolom */}
              <div className="flex justify-between items-start mb-5 print:mb-2 pb-4 print:pb-2 border-b-2 border-black">
                {/* Kiri: metadata */}
                <div className="text-[10px] font-bold space-y-0.5 w-48">
                  <div className="grid gap-x-1" style={{ gridTemplateColumns: '55px 8px 1fr' }}>
                    <span>No Nota</span><span>:</span><span>{ivNo}</span>
                    <span>No PO</span><span>:</span><span>-</span>
                    <span>Tanggal</span><span>:</span><span>{tgl(transaction.created_at)}</span>
                  </div>
                </div>
                {/* Tengah: Judul */}
                <div className="text-center">
                  <h1 className="text-3xl font-extrabold uppercase italic underline tracking-wide text-black">SURAT JALAN</h1>
                  <p className="text-xl font-bold bg-black text-white px-8 py-1 inline-block mt-1 tracking-widest">#{sjNo}</p>
                  <h2 className="text-2xl font-bold uppercase tracking-widest mt-1 text-black">UD DOKAR</h2>
                </div>
                {/* Kanan: Alamat kirim */}
                <div className="w-64 border-2 border-black p-2">
                  <p className="text-[10px] font-black uppercase border-b border-black mb-1 pb-0.5 italic">Alamat Kirim :</p>
                  <p className="font-black text-base uppercase">{transaction.contact?.name}</p>
                  <p className="text-[10px] font-bold uppercase whitespace-pre-wrap">{transaction.contact?.address || '-'}</p>
                </div>
              </div>

              {/* Tabel */}
              <table className="w-full border-collapse border-2 border-black text-sm mb-4 print:mb-2">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-black">
                    <th className="border-2 border-black p-2 text-center font-bold w-10 uppercase">No.</th>
                    <th className="border-2 border-black p-2 text-center font-bold w-28 uppercase">Quantity</th>
                    <th className="border-2 border-black p-2 text-left font-bold uppercase">Deskripsi Barang</th>
                    <th className="border-2 border-black p-2 text-right font-bold w-40 uppercase">Tonase (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id} className="h-10">
                      <td className="border-2 border-black p-2 text-center font-medium text-base">{idx + 1}</td>
                      <td className="border-2 border-black p-2 text-center text-base font-semibold">{item.quantity}</td>
                      <td className="border-2 border-black p-2 font-normal uppercase tracking-tight">{item.product?.name}</td>
                      <td className="border-2 border-black p-2 text-right italic font-semibold text-base">-</td>
                    </tr>
                  ))}
                  {[...Array(EMPTY_ROWS_SJ)].map((_, i) => (
                    <tr key={i} className="h-10 print:h-6">
                      {[...Array(4)].map((__, j) => <td key={j} className="border-2 border-black" />)}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Perhatian */}
              <div className="mb-4 print:mb-2 text-[10px] font-bold italic border-l-4 border-black pl-3 py-1 bg-gray-50 break-inside-avoid">
                <span className="font-black not-italic uppercase">PERHATIAN: </span>
                Barang ini telah diterima dengan baik dan benar dalam kondisi segel utuh.
              </div>

              {/* Tanda Tangan */}
              <div className="grid grid-cols-4 border-2 border-black break-inside-avoid">
                {['Dicetak oleh,', 'Dicek oleh,', 'Dikirim oleh,', 'Diterima oleh,'].map((label, i) => (
                  <div key={i} className={`sig-box p-4 print:p-2 text-center min-h-[38mm] print:min-h-[22mm] flex flex-col justify-between ${i < 3 ? 'border-r-2 border-black' : 'bg-gray-50'}`}>
                    <p className="text-[10px] font-black uppercase underline">{label}</p>
                    <p className={`text-xs font-black border-t-2 border-black pt-1 uppercase ${i === 3 ? 'italic text-[9px]' : ''}`}>
                      {i === 0 ? 'Admin UD Dokar' : i === 1 ? 'Kepala Gudang' : i === 2 ? 'Sopir / Expedisi' : '(Stempel & Tanda Tangan)'}
                    </p>
                  </div>
                ))}
              </div>

            </div>
          )}
        </div>
      </div>



    </div>
  );
}
