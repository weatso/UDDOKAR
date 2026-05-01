"use client";

import React, { useState, useEffect } from 'react';
import { Package, Wallet, Factory, CreditCard, AlertTriangle, CalendarDays, TrendingUp } from "lucide-react";
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';

export default function Home() {
  const [stats, setStats] = useState({ 
    rawStock: 0, 
    finishedStock: 0, 
    activeSPK: 0, 
    overdue: 0, 
    hutang: 0, 
    netProfit: 0, 
    overdueSchedules: [] as any[],
    chartData: [] as any[]
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        // Fetch Basic Stats & Histories
        const [rawRes, finishedRes, spkRes, piutangRes, hutangRes, schedulesRes, txHistoryRes] = await Promise.all([
          supabase.from('products').select('stock_quantity').eq('type', 'RAW').eq('is_active', true),
          supabase.from('products').select('stock_quantity').eq('type', 'FINISHED').eq('is_active', true),
          supabase.from('production_orders').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
          supabase.from('transactions').select('total_amount, amount_paid').eq('type', 'SO_OUTBOUND').neq('status', 'PAID').eq('is_void', false),
          supabase.from('transactions').select('total_amount, amount_paid').eq('type', 'PO_INBOUND').neq('status', 'PAID').eq('is_void', false),
          supabase.from('payment_schedules').select('id, amount_to_pay, due_date, status, transaction:transactions(type, contact:contacts(name))').eq('status', 'UNPAID').lte('due_date', today.toISOString().split('T')[0]).order('due_date', { ascending: true }).limit(5),
          // Fetch last 30 days of transactions for chart
          supabase.from('transactions').select('created_at, total_amount, type').gte('created_at', thirtyDaysAgoStr).eq('is_void', false).order('created_at', { ascending: true })
        ]);

        const rawStock = rawRes.data?.reduce((acc, curr) => acc + Number(curr.stock_quantity), 0) || 0;
        const finishedStock = finishedRes.data?.reduce((acc, curr) => acc + Number(curr.stock_quantity), 0) || 0;
        const overdue = piutangRes.data?.reduce((acc, curr) => acc + (Number(curr.total_amount) - Number(curr.amount_paid)), 0) || 0;
        const hutang = hutangRes.data?.reduce((acc, curr) => acc + (Number(curr.total_amount) - Number(curr.amount_paid)), 0) || 0;

        // Calculate Net Profit (Lunas only)
        const { data: piutangLunas } = await supabase.from('transactions').select('amount_paid').eq('type', 'SO_OUTBOUND').eq('status', 'PAID').eq('is_void', false);
        const { data: hutangLunas } = await supabase.from('transactions').select('amount_paid').eq('type', 'PO_INBOUND').eq('status', 'PAID').eq('is_void', false);
        const netProfit = (piutangLunas?.reduce((acc, curr) => acc + Number(curr.amount_paid), 0) || 0) - (hutangLunas?.reduce((acc, curr) => acc + Number(curr.amount_paid), 0) || 0);

        // Process Chart Data
        const dailyData: { [key: string]: { date: string, pemasukan: number, pengeluaran: number } } = {};
        
        // Initialize last 30 days
        for (let i = 30; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          dailyData[dateStr] = { date: dateStr, pemasukan: 0, pengeluaran: 0 };
        }

        txHistoryRes.data?.forEach(tx => {
          const date = tx.created_at.split('T')[0];
          if (dailyData[date]) {
            if (tx.type === 'SO_OUTBOUND') dailyData[date].pemasukan += Number(tx.total_amount);
            else if (tx.type === 'PO_INBOUND') dailyData[date].pengeluaran += Number(tx.total_amount);
          }
        });

        setStats({ 
          rawStock, 
          finishedStock, 
          activeSPK: spkRes.count || 0, 
          overdue, 
          hutang, 
          netProfit, 
          overdueSchedules: schedulesRes.data || [],
          chartData: Object.values(dailyData)
        });
      } catch (error) {
        console.error("Dashboard Error:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  const formatRupiah = (number: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(number);
  
  return (
    <div className="p-4 md:p-8 max-w-full overflow-hidden space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-black">Dashboard Utama</h1>
        <p className="text-gray-800 mt-2 text-base font-semibold">Ringkasan operasional pabrik UD Dokar secara real-time.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        <StatCard title="Total Stok Mentah" value={stats.rawStock} icon={<Package />} color="purple" isLoading={isLoading} />
        <StatCard title="Stok Kardus Jadi" value={stats.finishedStock} icon={<BoxIcon />} color="purple" isLoading={isLoading} />
        <StatCard title="SPK Berjalan" value={stats.activeSPK} icon={<Factory />} color="purple" isLoading={isLoading} />
        <StatCard title="Total Piutang Berjalan" value={formatRupiah(stats.overdue)} icon={<Wallet />} color="purple" isLoading={isLoading} />
        <StatCard title="Total Hutang Berjalan" value={formatRupiah(stats.hutang)} icon={<CreditCard />} color="red" isLoading={isLoading} />
        <StatCard title="Estimasi Laba Bersih" value={formatRupiah(stats.netProfit)} icon={<TrendingUp />} color="green" isLoading={isLoading} />
      </div>

      {/* Pengingat Jatuh Tempo */}
      <div className="bg-white border-2 border-gray-300 rounded-xl p-4 md:p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4 border-b-2 border-gray-200 pb-3">
          <div className="bg-red-100 p-2 rounded-lg text-red-600 border border-red-200">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">🚨 Pengingat Jatuh Tempo</h2>
        </div>
        
        {stats.overdueSchedules.length > 0 ? (
          <div className="grid gap-3">
            {stats.overdueSchedules.map((schedule: any) => (
              <div key={schedule.id} className="flex flex-col sm:flex-row justify-between sm:items-center bg-white p-4 rounded-lg border-2 border-red-200 shadow-sm gap-4 hover:border-red-400 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 text-xs font-bold rounded border ${schedule.transaction?.type === 'PO_INBOUND' ? 'bg-orange-100 text-orange-800 border-orange-300' : 'bg-blue-100 text-blue-800 border-blue-300'}`}>
                      {schedule.transaction?.type === 'PO_INBOUND' ? 'HUTANG (PO)' : 'PIUTANG (SO)'}
                    </span>
                    <span className="font-bold text-gray-800 truncate">{schedule.transaction?.contact?.name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-red-600 font-semibold text-sm">
                    <CalendarDays className="w-4 h-4" /> Jatuh Tempo: {new Date(schedule.due_date).toLocaleDateString('id-ID')}
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <span className="text-lg font-black text-red-700">{formatRupiah(schedule.amount_to_pay)}</span>
                  <Link href="/keuangan" className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors text-sm text-center border-2 border-red-800">Bayar</Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <p className="text-green-700 font-bold text-lg">✅ Semua tagihan aman, tidak ada yang menunggak hari ini.</p>
          </div>
        )}
      </div>

      {/* Matriks Keuangan */}
      <div className="bg-white border-2 border-gray-300 rounded-xl p-4 md:p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-6 border-b-2 border-gray-100 pb-3 flex items-center gap-2">
          <TrendingUp className="text-purple-700" /> Matriks Keuangan (30 Hari Terakhir)
        </h2>
        <div className="h-80 w-full">
          {isLoading ? (
            <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg animate-pulse font-bold text-gray-400">Memproses Data Grafik...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPemasukan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPengeluaran" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(str) => {
                    const d = new Date(str);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }} 
                  tick={{fontSize: 12, fontWeight: 'bold'}} 
                  stroke="#666" 
                />
                <YAxis hide />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  formatter={(value: number) => [formatRupiah(value), ""]}
                  contentStyle={{ borderRadius: '12px', border: '2px solid #e5e7eb', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="top" height={36}/>
                <Area type="monotone" dataKey="pemasukan" name="Pemasukan (SO)" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPemasukan)" />
                <Area type="monotone" dataKey="pengeluaran" name="Pengeluaran (PO)" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorPengeluaran)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, isLoading }: any) {
  const colorClasses: any = {
    purple: "bg-purple-100 text-purple-700 border-purple-300",
    red: "bg-red-100 text-red-700 border-red-300",
    green: "bg-green-100 text-green-700 border-green-300",
  };

  return (
    <div className="bg-white p-6 rounded-xl border-2 border-gray-300 shadow-md flex flex-col">
      <div className="flex justify-between items-start">
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-base font-bold text-gray-800">{title}</p>
          <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-800 break-words mt-3">{isLoading ? '...' : value}</h3>
        </div>
        <div className={`p-3 rounded-lg border-2 flex-shrink-0 ${colorClasses[color]}`}>
          {React.cloneElement(icon, { className: "w-7 h-7" })}
        </div>
      </div>
    </div>
  );
}

function BoxIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
    </svg>
  );
}
