"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Wallet, X, AlertTriangle, Calendar, Receipt, CreditCard, ArrowLeft, Clock } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Pagination } from '@/components/shared/Pagination';

const ITEMS_PER_PAGE = 16;

export default function AgingSchedulePage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'Transfer' });

  useEffect(() => { fetchTransactions(); }, [currentPage]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    const from = currentPage * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    try {
      const { data, count, error } = await supabase.from('transactions')
        .select('id, type, created_at, total_amount, amount_paid, status, contact:contacts(name), payment_schedules(id, amount_to_pay, due_date)', { count: 'exact' })
        .in('status', ['UNPAID', 'PARTIAL'])
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw new Error(error.message);
      if (data) setTransactions(data);
      if (count !== null) setTotalItems(count);
    } catch (err: any) { console.error(err.message); }
    setIsLoading(false);
  };

  const handleOpenModal = (tx: any) => {
    setSelectedTx(tx);
    const sisaTagihan = tx.total_amount - tx.amount_paid;
    setPaymentForm({ amount: sisaTagihan.toString(), payment_date: new Date().toISOString().split('T')[0], payment_method: 'Transfer' });
    setIsModalOpen(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const nominal = Number(paymentForm.amount);
    const sisa = selectedTx.total_amount - selectedTx.amount_paid;
    if (nominal <= 0) return alert('Nominal harus lebih dari 0');
    if (nominal > sisa) return alert(`Nominal (${formatRupiah(nominal)}) melebihi sisa tagihan (${formatRupiah(sisa)})`);
    try {
      const { error } = await supabase.from('payments').insert([{
        transaction_id: selectedTx.id,
        amount: nominal,
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method
      }]);
      if (error) throw error;
      alert('Pembayaran berhasil dicatat!');
      setIsModalOpen(false);
      fetchTransactions();
    } catch (err: any) { alert('Gagal: ' + err.message); }
  };

  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
  const formatDate = (d: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d));

  return (
    <div className="p-4 md:p-8 max-w-full overflow-hidden">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/keuangan" className="p-2 bg-white border-2 border-gray-300 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-black" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-black flex items-center gap-2">
            <Clock className="w-7 h-7 text-orange-500" /> Aging Schedule
          </h1>
          <p className="text-gray-500 font-semibold text-sm mt-0.5">Pantau semua tagihan yang belum lunas dan catat pembayarannya.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-300 shadow-md overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
            <thead className="bg-gray-200 border-b-2 border-gray-400">
              <tr>
                <th className="px-4 py-4 text-black font-bold">Tipe & Kontak</th>
                <th className="px-4 py-4 text-black font-bold">Tgl Transaksi</th>
                <th className="px-4 py-4 text-black font-bold">Jatuh Tempo</th>
                <th className="px-4 py-4 text-black font-bold text-center">Tenor</th>
                <th className="px-4 py-4 text-black font-bold text-right">Total Tagihan</th>
                <th className="px-4 py-4 text-green-700 font-bold text-right">Dibayar</th>
                <th className="px-4 py-4 text-red-700 font-bold text-right">Sisa</th>
                <th className="px-4 py-4 text-black font-bold text-center">Status</th>
                <th className="px-4 py-4 text-black font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? <tr><td colSpan={9} className="text-center py-8 text-gray-400 font-semibold">Memuat data...</td></tr>
              : transactions.length === 0 ? <tr><td colSpan={9} className="text-center py-8 text-gray-400 font-semibold">Tidak ada tagihan tertunggak.</td></tr>
              : transactions.map(tx => {
                const sisaTagihan = tx.total_amount - tx.amount_paid;
                let nextDueDateStr = tx.created_at.split('T')[0];
                let tenorText = '-';
                let isOverdue = false;
                if (tx.payment_schedules?.length > 0) {
                  const sorted = [...tx.payment_schedules].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
                  let covered = tx.amount_paid, paidCount = 0;
                  let nextDue = null;
                  for (const s of sorted) { if (covered >= s.amount_to_pay) { covered -= s.amount_to_pay; paidCount++; } else { if (!nextDue) nextDue = s.due_date; } }
                  tenorText = `${paidCount}/${sorted.length} Bln`;
                  nextDueDateStr = nextDue || sorted[sorted.length - 1].due_date;
                }
                const today = new Date(); today.setHours(0,0,0,0);
                const due = new Date(nextDueDateStr); due.setHours(0,0,0,0);
                if (due <= today) isOverdue = true;
                return (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <span className={`block font-bold text-xs uppercase ${tx.type === 'PO_INBOUND' ? 'text-orange-600' : 'text-blue-600'}`}>{tx.type === 'PO_INBOUND' ? 'HUTANG (PO)' : 'PIUTANG (SO)'}</span>
                      <span className="text-sm font-semibold text-black">{tx.contact?.name}</span>
                    </td>
                    <td className="px-4 py-4 text-black font-semibold">{formatDate(tx.created_at)}</td>
                    <td className="px-4 py-4">
                      <div className={`inline-flex items-center gap-1 font-bold px-2 py-1 rounded text-sm ${isOverdue ? 'bg-red-100 text-red-800 border border-red-300' : 'text-black'}`}>
                        {isOverdue && <AlertTriangle className="w-3.5 h-3.5" />}
                        {formatDate(nextDueDateStr)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-black font-bold text-center text-sm">{tenorText}</td>
                    <td className="px-4 py-4 text-black font-bold text-right">{formatRupiah(tx.total_amount)}</td>
                    <td className="px-4 py-4 text-green-700 font-bold text-right">{formatRupiah(tx.amount_paid)}</td>
                    <td className="px-4 py-4 text-red-700 font-black text-right">{formatRupiah(sisaTagihan)}</td>
                    <td className="px-4 py-4 text-center"><StatusBadge status={tx.status} /></td>
                    <td className="px-4 py-4 flex justify-center">
                      <button onClick={() => handleOpenModal(tx)} className="text-white bg-green-600 hover:bg-green-700 border-2 border-green-800 px-3 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all text-sm">
                        <Wallet className="w-4 h-4" /> Bayar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden p-3 bg-gray-50 min-h-[200px]">
          {isLoading ? <div className="text-center py-8 text-gray-400 font-semibold">Memuat data...</div>
          : transactions.length === 0 ? <div className="text-center py-8 text-gray-400 font-semibold bg-white rounded-xl border-2 border-dashed border-gray-300 p-8">Tidak ada tagihan tertunggak.</div>
          : (
            <div className="flex flex-col gap-3">
              {transactions.map(tx => {
                const sisaTagihan = tx.total_amount - tx.amount_paid;
                let nextDueDateStr = tx.created_at.split('T')[0];
                let tenorText = '-';
                let isOverdue = false;
                if (tx.payment_schedules?.length > 0) {
                  const sorted = [...tx.payment_schedules].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
                  let covered = tx.amount_paid, paidCount = 0, nextDue = null;
                  for (const s of sorted) { if (covered >= s.amount_to_pay) { covered -= s.amount_to_pay; paidCount++; } else { if (!nextDue) nextDue = s.due_date; } }
                  tenorText = `${paidCount}/${sorted.length} Bln`;
                  nextDueDateStr = nextDue || sorted[sorted.length - 1].due_date;
                }
                const today = new Date(); today.setHours(0,0,0,0);
                const due = new Date(nextDueDateStr); due.setHours(0,0,0,0);
                if (due <= today) isOverdue = true;
                return (
                  <div key={tx.id} className="bg-white rounded-2xl border-2 border-gray-300 shadow-sm overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                      <div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${tx.type === 'PO_INBOUND' ? 'text-orange-600' : 'text-blue-600'}`}>{tx.type === 'PO_INBOUND' ? 'HUTANG (PO)' : 'PIUTANG (SO)'}</span>
                        <h3 className="text-base font-black text-black leading-none mt-0.5">{tx.contact?.name}</h3>
                      </div>
                      <StatusBadge status={tx.status} />
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-0.5"><Calendar className="w-3 h-3" />Jatuh Tempo</p>
                          <div className={`text-sm font-black flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-black'}`}>{isOverdue && <AlertTriangle className="w-3.5 h-3.5" />}{formatDate(nextDueDateStr)}</div>
                        </div>
                        <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-0.5"><CreditCard className="w-3 h-3" />Tenor</p><p className="text-sm font-bold text-black">{tenorText}</p></div>
                      </div>
                      <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 space-y-1.5">
                        <div className="flex justify-between"><span className="text-xs text-gray-500 font-semibold">Total</span><span className="text-sm font-bold text-gray-700">{formatRupiah(tx.total_amount)}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-gray-500 font-semibold">Dibayar</span><span className="text-sm font-bold text-green-600">{formatRupiah(tx.amount_paid)}</span></div>
                        <div className="flex justify-between pt-1.5 border-t border-gray-200"><span className="text-xs font-black text-black uppercase">Sisa</span><span className="text-lg font-black text-red-600">{formatRupiah(sisaTagihan)}</span></div>
                      </div>
                      <button onClick={() => handleOpenModal(tx)} className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white font-black text-sm rounded-xl border-2 border-green-800 shadow-sm transition-all">
                        <Wallet className="w-4 h-4" /> CATAT PEMBAYARAN
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Pagination currentPage={currentPage} totalItems={totalItems} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />

      {/* Payment Modal */}
      {isModalOpen && selectedTx && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border-2 border-gray-200 w-full sm:max-w-lg">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h2 className="font-black text-xl text-black">Catat Pembayaran</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="w-6 h-6 text-gray-400 hover:text-black" /></button>
            </div>
            <form onSubmit={handleSavePayment} className="p-5 flex flex-col gap-4">
              <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-200">
                <p className="text-sm font-bold text-blue-800">{selectedTx.contact?.name}</p>
                <p className="text-xs text-blue-600 font-semibold">Sisa Tagihan:</p>
                <p className="text-2xl font-black text-blue-900">{formatRupiah(selectedTx.total_amount - selectedTx.amount_paid)}</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-1.5">Tanggal Bayar</label>
                <input required type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl text-black font-semibold focus:border-green-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-1.5">Nominal (Rp)</label>
                <input required type="number" min="1" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl text-black font-black text-xl focus:border-green-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-1.5">Metode</label>
                <select value={paymentForm.payment_method} onChange={e => setPaymentForm({...paymentForm, payment_method: e.target.value})}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl text-black font-semibold focus:border-green-500 focus:outline-none bg-white">
                  <option value="Transfer">Transfer Bank</option>
                  <option value="Tunai">Tunai / Cash</option>
                  <option value="Cek/Giro">Cek / Giro</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border-2 border-gray-300 bg-white text-black font-bold rounded-xl">Batal</button>
                <button type="submit" className="flex-1 py-3 bg-green-600 border-2 border-green-800 text-white font-black rounded-xl hover:bg-green-700 shadow-md">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
