"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, X, ArrowLeft, TrendingDown, Save } from 'lucide-react';

const ITEMS_PER_PAGE = 15;

export default function TransaksiBiayaPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [coaList, setCoaList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState({
    coa_id: '',
    description: '',
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => { fetchCOA(); }, []);
  useEffect(() => { fetchExpenses(); }, [currentPage, filterMonth]);

  const fetchCOA = async () => {
    const { data } = await supabase.from('coa').select('id, code, name, type').eq('is_active', true).order('code');
    if (data) setCoaList(data);
  };

  const fetchExpenses = async () => {
    setIsLoading(true);
    const from = currentPage * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    const startDate = filterMonth + '-01';
    const endDate = new Date(parseInt(filterMonth.slice(0,4)), parseInt(filterMonth.slice(5,7)), 0).toISOString().split('T')[0];

    const { data, count } = await supabase
      .from('expense_transactions')
      .select('*, coa:coa(code, name, type)', { count: 'exact' })
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: false })
      .range(from, to);

    if (data) setExpenses(data);
    if (count !== null) setTotalItems(count);
    setIsLoading(false);
  };

  const totalBulanIni = expenses.reduce((t, e) => t + Number(e.amount), 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.coa_id) return alert('Pilih akun COA!');
    if (!form.amount || Number(form.amount) <= 0) return alert('Masukkan nominal biaya yang valid!');
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('expense_transactions').insert([{
        coa_id: form.coa_id,
        description: form.description,
        amount: Number(form.amount),
        transaction_date: form.transaction_date,
        notes: form.notes || null,
      }]);
      if (error) throw error;
      alert('Biaya berhasil dicatat!');
      setIsModalOpen(false);
      setForm({ coa_id: '', description: '', amount: '', transaction_date: new Date().toISOString().split('T')[0], notes: '' });
      fetchExpenses();
    } catch (err: any) { alert(err.message); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus catatan biaya ini? Tindakan tidak dapat dibatalkan.')) return;
    await supabase.from('expense_transactions').delete().eq('id', id);
    fetchExpenses();
  };

  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
  const formatDate = (d: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d + 'T00:00:00'));

  const bebanCOA = coaList.filter(c => c.type === 'BEBAN');
  const asetCOA  = coaList.filter(c => c.type === 'ASSET');
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/keuangan" className="p-2 bg-white border-2 border-gray-300 rounded-full hover:bg-gray-100 transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5 text-black" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl md:text-3xl font-black text-black flex items-center gap-2 truncate">
              <TrendingDown className="w-6 h-6 md:w-7 md:h-7 text-red-500 shrink-0" /> Transaksi Biaya
            </h1>
            <p className="text-gray-500 font-semibold text-xs md:text-sm mt-0.5">Catat semua pengeluaran dan beban operasional bisnis</p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl border-2 border-red-800 shadow-md transition-all text-sm whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Catat Biaya
        </button>
      </div>

      {/* Summary Card + Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-5">
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex-1">
          <p className="text-xs font-black text-red-500 uppercase tracking-widest mb-1">Total Beban Bulan Ini</p>
          <p className="text-2xl md:text-3xl font-black text-red-700">{formatRupiah(totalBulanIni)}</p>
          <p className="text-xs text-red-400 font-semibold mt-1">{totalItems} transaksi tercatat</p>
        </div>
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 flex flex-col justify-center">
          <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Filter Bulan</label>
          <input type="month" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setCurrentPage(0); }}
            className="px-3 py-2 border-2 border-gray-300 rounded-xl font-bold text-black focus:border-red-500 focus:outline-none text-sm" />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left font-bold text-black">Tanggal</th>
                <th className="px-5 py-3 text-left font-bold text-black">Akun COA</th>
                <th className="px-5 py-3 text-left font-bold text-black">Keterangan</th>
                <th className="px-5 py-3 text-right font-bold text-black">Jumlah</th>
                <th className="px-5 py-3 text-center font-bold text-black">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400 font-semibold">Memuat data...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400 font-semibold">Belum ada transaksi biaya di bulan ini.</td></tr>
              ) : expenses.map(e => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-black whitespace-nowrap">{formatDate(e.transaction_date)}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-black text-gray-500 font-mono block">{e.coa?.code}</span>
                    <span className="font-semibold text-black">{e.coa?.name}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-700 font-medium max-w-xs truncate">{e.description}</td>
                  <td className="px-5 py-3 text-right font-black text-red-700 text-base whitespace-nowrap">{formatRupiah(e.amount)}</td>
                  <td className="px-5 py-3 flex justify-center">
                    <button onClick={() => handleDelete(e.id)} className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-lg border border-red-800 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {expenses.length > 0 && (
              <tfoot className="bg-red-50 border-t-2 border-red-200">
                <tr>
                  <td colSpan={3} className="px-5 py-3 text-right font-black text-black uppercase text-sm">Total Ditampilkan</td>
                  <td className="px-5 py-3 text-right font-black text-red-700 text-lg">{formatRupiah(totalBulanIni)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden p-3 space-y-3">
          {isLoading ? (
            <p className="text-center py-8 text-gray-400 font-semibold">Memuat...</p>
          ) : expenses.length === 0 ? (
            <p className="text-center py-8 text-gray-400 font-semibold">Belum ada transaksi biaya.</p>
          ) : expenses.map(e => (
            <div key={e.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-gray-400 mb-0.5">{formatDate(e.transaction_date)}</p>
                  <p className="font-black text-black truncate">{e.description}</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{e.coa?.code} — {e.coa?.name}</p>
                </div>
                <button onClick={() => handleDelete(e.id)} className="p-2 text-white bg-red-600 rounded-lg border border-red-800 ml-2 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="text-right border-t border-gray-200 pt-2 mt-2">
                <span className="text-xl font-black text-red-700">{formatRupiah(e.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-5">
          <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}
            className="px-4 py-2 border-2 border-gray-300 rounded-xl font-bold text-black disabled:opacity-40 hover:bg-gray-100 transition-all">‹ Prev</button>
          <span className="px-4 py-2 font-semibold text-black">{currentPage + 1} / {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}
            className="px-4 py-2 border-2 border-gray-300 rounded-xl font-bold text-black disabled:opacity-40 hover:bg-gray-100 transition-all">Next ›</button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border-2 border-gray-200 w-full sm:max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-red-100 rounded-lg"><TrendingDown className="w-5 h-5 text-red-600" /></div>
                <h2 className="font-black text-xl text-black">Catat Biaya / Beban</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-6 h-6 text-gray-400 hover:text-black" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 flex flex-col gap-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-black mb-1.5">Tanggal Transaksi</label>
                <input required type="date" value={form.transaction_date} onChange={e => setForm({...form, transaction_date: e.target.value})}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl font-semibold text-black focus:border-red-500 focus:outline-none" />
              </div>

              <div>
                <label className="block text-sm font-bold text-black mb-1.5">Kategori Biaya (COA)</label>
                <select required value={form.coa_id} onChange={e => setForm({...form, coa_id: e.target.value})}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl font-semibold text-black focus:border-red-500 focus:outline-none bg-white">
                  <option value="">-- Pilih Akun --</option>
                  {bebanCOA.length > 0 && (
                    <optgroup label="── BEBAN ──">
                      {bebanCOA.map(c => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
                    </optgroup>
                  )}
                  {asetCOA.length > 0 && (
                    <optgroup label="── ASSET ──">
                      {asetCOA.map(c => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
                    </optgroup>
                  )}
                  {bebanCOA.length === 0 && asetCOA.length === 0 && (
                    <option disabled>Belum ada akun COA. Tambah di menu COA dulu.</option>
                  )}
                </select>
                {bebanCOA.length === 0 && (
                  <p className="mt-1.5 text-xs text-orange-600 font-bold">
                    ⚠️ Belum ada akun BEBAN. <Link href="/keuangan/coa" className="underline">Tambah COA dulu →</Link>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-black mb-1.5">Keterangan Singkat</label>
                <input required type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="cth: Bayar tagihan listrik bulan Mei"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl font-semibold text-black focus:border-red-500 focus:outline-none" />
              </div>

              <div>
                <label className="block text-sm font-bold text-black mb-1.5">Jumlah (Rp)</label>
                <input required type="number" min="1" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                  placeholder="Masukkan nominal dalam Rupiah"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl font-black text-black text-xl focus:border-red-500 focus:outline-none" />
              </div>

              <div>
                <label className="block text-sm font-bold text-black mb-1.5">
                  Catatan Tambahan <span className="text-gray-400 font-normal">(opsional)</span>
                </label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
                  placeholder="Detail atau keterangan tambahan..."
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl font-medium text-black focus:border-red-500 focus:outline-none resize-none" />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 border-2 border-gray-300 bg-white text-black font-bold rounded-xl hover:bg-gray-50 transition-all">
                  Batal
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="flex-1 py-3 bg-red-600 border-2 border-red-800 text-white font-black rounded-xl hover:bg-red-700 shadow-md disabled:opacity-60 flex items-center justify-center gap-2 transition-all">
                  <Save className="w-4 h-4" /> {isSubmitting ? 'Menyimpan...' : 'Simpan Biaya'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
