"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Wallet, X, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { StatusBadge } from '@/components/shared/StatusBadge';

export default function KeuanganPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'Transfer' });

  useEffect(() => { fetchTransactions(); }, []);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      // Ambil transaksi yang belum lunas (UNPAID atau PARTIAL) beserta jadwal payment_schedules
      const { data, error } = await supabase.from('transactions')
        .select('id, type, created_at, total_amount, amount_paid, status, contact:contacts(name), payment_schedules(id, amount_to_pay, due_date)')
        .in('status', ['UNPAID', 'PARTIAL'])
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      if (data) setTransactions(data);
    } catch (err: any) { alert(err.message); }
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
    if (Number(paymentForm.amount) <= 0) return alert('Nominal harus lebih dari 0');
    try {
      const { error } = await supabase.from('payments').insert([{
        transaction_id: selectedTx.id,
        amount: Number(paymentForm.amount),
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method
      }]);
      if (error) throw error;
      alert('Pembayaran berhasil dicatat!');
      setIsModalOpen(false);
      fetchTransactions();
    } catch (err: any) { alert('Gagal menyimpan pembayaran: ' + err.message); }
  };

  const formatRupiah = (number: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number);
  const formatDate = (dateString: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateString));

  return (
    <div className="p-4 md:p-8 max-w-full overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-black">Dashboard Keuangan (Aging Schedule)</h1>
          <p className="text-black font-semibold mt-2 text-base">Pantau semua tagihan yang belum lunas dan catat pembayarannya.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-300 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
            <thead className="bg-gray-200 border-b-2 border-gray-400">
              <tr>
                <th className="px-4 py-4 text-black font-bold">Tipe & Kontak</th>
                <th className="px-4 py-4 text-black font-bold">Tgl Transaksi</th>
                <th className="px-4 py-4 text-black font-bold">Jatuh Tempo</th>
                <th className="px-4 py-4 text-black font-bold text-center">Tenor</th>
                <th className="px-4 py-4 text-black font-bold text-right">Total Tagihan</th>
                <th className="px-4 py-4 text-black font-bold text-right text-green-700">Dibayar</th>
                <th className="px-4 py-4 text-black font-bold text-right text-red-700">Sisa</th>
                <th className="px-4 py-4 text-black font-bold text-center">Status</th>
                <th className="px-4 py-4 text-black font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? <tr><td colSpan={9} className="text-center py-8 text-black font-bold">Memuat data...</td></tr> : 
              transactions.length === 0 ? <tr><td colSpan={9} className="text-center py-8 text-black font-bold">Hore! Tidak ada tagihan yang tertunggak.</td></tr> : 
              transactions.map(tx => {
                const sisaTagihan = tx.total_amount - tx.amount_paid;
                
                // Menghitung Tenor & Jatuh Tempo Terdekat berdasarkan schedules
                let nextDueDateStr = tx.created_at.split('T')[0];
                let tenorText = '-';
                let isOverdue = false;

                if (tx.payment_schedules && tx.payment_schedules.length > 0) {
                  const sortedSchedules = [...tx.payment_schedules].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
                  let amountCovered = tx.amount_paid;
                  let paidCount = 0;
                  let nextDue = null;

                  for (const s of sortedSchedules) {
                    if (amountCovered >= s.amount_to_pay) {
                      amountCovered -= s.amount_to_pay;
                      paidCount++;
                    } else {
                      if (!nextDue) nextDue = s.due_date;
                    }
                  }
                  
                  tenorText = `${paidCount} dari ${sortedSchedules.length} Bln`;
                  nextDueDateStr = nextDue || sortedSchedules[sortedSchedules.length - 1].due_date;
                }

                // Check Overdue (Hari Ini atau Lewat)
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const due = new Date(nextDueDateStr);
                due.setHours(0, 0, 0, 0);
                if (due <= today) {
                  isOverdue = true;
                }

                return (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <span className="block font-bold text-black">{tx.type === 'PO_INBOUND' ? 'HUTANG (PO)' : 'PIUTANG (SO)'}</span>
                      <span className="text-xs font-semibold text-gray-700">{tx.contact?.name}</span>
                    </td>
                    <td className="px-4 py-4 text-black font-semibold">{formatDate(tx.created_at)}</td>
                    <td className="px-4 py-4">
                      <div className={`inline-flex items-center gap-1 font-bold px-2 py-1 rounded ${isOverdue ? 'bg-red-100 text-red-800 border border-red-300' : 'text-black'}`}>
                        {isOverdue && <AlertTriangle className="w-4 h-4" />}
                        {formatDate(nextDueDateStr)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-black font-bold text-center">{tenorText}</td>
                    <td className="px-4 py-4 text-black font-bold text-right">{formatRupiah(tx.total_amount)}</td>
                    <td className="px-4 py-4 text-green-700 font-bold text-right">{formatRupiah(tx.amount_paid)}</td>
                    <td className="px-4 py-4 text-red-700 font-black text-right text-base">{formatRupiah(sisaTagihan)}</td>
                    <td className="px-4 py-4 text-center"><StatusBadge status={tx.status} /></td>
                    <td className="px-4 py-4 flex justify-center">
                      <button onClick={() => handleOpenModal(tx)} className="text-white bg-green-600 hover:bg-green-700 border-2 border-green-800 px-3 py-2 rounded-lg font-bold flex items-center gap-2">
                        <Wallet className="w-4 h-4" /> Bayar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Pembayaran */}
      {isModalOpen && selectedTx && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border-2 border-gray-400 w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b-2 border-gray-200 bg-gray-100">
              <h2 className="font-bold text-xl text-black">Catat Pembayaran Baru</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-black hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSavePayment} className="p-6 space-y-5">
              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200 mb-4">
                <p className="text-sm font-bold text-blue-900">Sisa Tagihan yang harus dibayar:</p>
                <p className="text-2xl font-black text-blue-900">{formatRupiah(selectedTx.total_amount - selectedTx.amount_paid)}</p>
              </div>

              <div>
                <label className="block text-base font-bold text-black mb-2">Tanggal Bayar</label>
                <input required type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm({...paymentForm, payment_date: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-black font-semibold focus:border-purple-600" />
              </div>
              
              <div>
                <label className="block text-base font-bold text-black mb-2">Nominal Uang (Rp)</label>
                <input required type="number" min="1" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-black font-black text-xl focus:border-purple-600" />
              </div>

              <div>
                <label className="block text-base font-bold text-black mb-2">Metode Pembayaran</label>
                <select value={paymentForm.payment_method} onChange={e => setPaymentForm({...paymentForm, payment_method: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-black font-semibold focus:border-purple-600">
                  <option value="Transfer">Transfer Bank</option>
                  <option value="Tunai">Tunai / Cash</option>
                  <option value="Cek/Giro">Cek / Giro</option>
                </select>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-3 border-2 border-gray-300 bg-gray-100 text-black font-bold rounded-lg hover:bg-gray-200">Batal</button>
                <button type="submit" className="px-5 py-3 bg-green-600 border-2 border-green-800 text-white font-bold rounded-lg hover:bg-green-700">Simpan Pembayaran</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
