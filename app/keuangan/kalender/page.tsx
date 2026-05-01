"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';

export default function KalenderKeuanganPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedDateSchedules, setSelectedDateSchedules] = useState<any[] | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    fetchSchedules();
  }, [month, year]);

  const fetchSchedules = async () => {
    // Fetch from first day to last day of month
    const firstDayStr = new Date(year, month, 1).toISOString().split('T')[0];
    const lastDayStr = new Date(year, month + 1, 0).toISOString().split('T')[0];

    try {
      const { data, error } = await supabase
        .from('payment_schedules')
        .select('*, transaction:transactions!inner(type, status, contact:contacts(name))')
        .gte('due_date', firstDayStr)
        .lte('due_date', lastDayStr)
        .neq('transaction.status', 'PAID');

      if (error) throw error;
      setSchedules(data || []);
    } catch (error: any) {
      console.error(error);
    }
  };

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Calendar logic
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
  const calendarDays = [];

  // Empty slots for days before 1st
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }

  // Actual days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const formatRupiah = (number: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number);
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  const handleDayClick = (day: number) => {
    const dayStr = new Date(year, month, day + 1).toISOString().split('T')[0];
    const filtered = schedules.filter(s => s.due_date === dayStr);
    if (filtered.length > 0) {
      setSelectedDateSchedules(filtered);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto overflow-hidden max-w-full">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6 md:mb-8">
        <div className="p-4 bg-purple-100 rounded-2xl border-2 border-purple-300">
          <CalendarIcon className="w-8 h-8 text-purple-700" />
        </div>
        <div>
          <h1 className="text-xl md:text-3xl font-black text-black">Kalender Jatuh Tempo</h1>
          <p className="text-gray-600 font-bold mt-1 text-sm md:text-lg">Pantau jadwal pembayaran hutang dan piutang</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border-2 border-gray-300 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b-2 border-gray-300 bg-gray-100 flex justify-between items-center gap-2">
          <button onClick={handlePrevMonth} className="p-2 bg-white border-2 border-gray-400 hover:bg-gray-200 rounded-full shrink-0">
            <ChevronLeft className="w-6 h-6 text-black" />
          </button>
          <h2 className="text-lg md:text-2xl font-black text-black uppercase tracking-wide text-center">
            {monthNames[month]} {year}
          </h2>
          <button onClick={handleNextMonth} className="p-2 bg-white border-2 border-gray-400 hover:bg-gray-200 rounded-full">
            <ChevronRight className="w-6 h-6 text-black" />
          </button>
        </div>

        <div className="p-4 md:p-6 overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-7 gap-2 md:gap-4 mb-4">
              {dayNames.map(name => (
                <div key={name} className="text-center font-bold text-gray-500 uppercase tracking-widest text-sm md:text-base">{name}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2 md:gap-4">
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="h-24 md:h-32 rounded-xl bg-gray-50 border-2 border-transparent"></div>;
                }

                // Check if there are schedules for this day
                const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const daySchedules = schedules.filter(s => s.due_date === dayStr);
                
                const hasHutang = daySchedules.some(s => s.transaction?.type === 'PO_INBOUND');
                const hasPiutang = daySchedules.some(s => s.transaction?.type === 'SO_OUTBOUND');

                const isToday = dayStr === new Date().toISOString().split('T')[0];

                return (
                  <div 
                    key={`day-${day}`} 
                    onClick={() => daySchedules.length > 0 && handleDayClick(day)}
                    className={`h-24 md:h-32 rounded-xl border-2 p-2 md:p-3 flex flex-col transition-all cursor-pointer relative overflow-hidden
                      ${isToday ? 'border-black bg-yellow-50' : 'border-gray-200 hover:border-purple-400'}
                      ${daySchedules.length > 0 ? 'bg-white hover:shadow-md' : 'bg-white cursor-default'}
                    `}
                  >
                    <span className={`text-lg md:text-xl font-black ${isToday ? 'text-black' : 'text-gray-700'}`}>{day}</span>
                    
                    <div className="mt-auto space-y-1">
                      {hasHutang && (
                        <div className="bg-red-100 text-red-800 text-[10px] md:text-xs font-bold px-1 md:px-2 py-1 rounded truncate border border-red-300">
                          🔴 Ada Hutang
                        </div>
                      )}
                      {hasPiutang && (
                        <div className="bg-purple-100 text-purple-800 text-[10px] md:text-xs font-bold px-1 md:px-2 py-1 rounded truncate border border-purple-300">
                          🟣 Ada Piutang
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Detail Jadwal */}
      {selectedDateSchedules && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border-4 border-black">
            <div className="p-6 bg-gray-100 border-b-4 border-black flex justify-between items-center">
              <h2 className="text-2xl font-black text-black">
                Jadwal Tanggal {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(selectedDateSchedules[0].due_date))}
              </h2>
              <button onClick={() => setSelectedDateSchedules(null)} className="p-2 bg-white border-2 border-black hover:bg-gray-200 rounded-full">
                <X className="w-6 h-6 text-black" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto bg-white">
              <div className="space-y-4">
                {selectedDateSchedules.map((schedule, idx) => (
                  <div key={idx} className={`p-5 rounded-xl border-2 flex justify-between items-center ${schedule.transaction?.type === 'PO_INBOUND' ? 'border-red-300 bg-red-50' : 'border-purple-300 bg-purple-50'}`}>
                    <div>
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest mb-2 text-white ${schedule.transaction?.type === 'PO_INBOUND' ? 'bg-red-700' : 'bg-purple-700'}`}>
                        {schedule.transaction?.type === 'PO_INBOUND' ? '🔴 BAYAR HUTANG KE' : '🟣 TAGIH PIUTANG KE'}
                      </span>
                      <p className="text-lg md:text-xl font-black text-black">{schedule.transaction?.contact?.name}</p>
                      <p className="text-xs md:text-sm font-bold text-gray-600 mt-1">Status: <span className="text-red-600 uppercase">{schedule.status}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-1">Nominal</p>
                      <p className="text-3xl font-black text-black">{formatRupiah(schedule.amount_to_pay)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 bg-gray-100 border-t-4 border-black text-center">
              <button onClick={() => setSelectedDateSchedules(null)} className="bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-xl font-bold border-2 border-black">Tutup Kalender</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
