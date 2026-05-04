"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, Trash2, X, ArrowLeft, BookOpen, Search } from 'lucide-react';

const TYPES = ['REVENUE', 'BEBAN', 'ASSET'] as const;
type CoaType = typeof TYPES[number];

const typeConfig: Record<CoaType, { label: string; color: string }> = {
  REVENUE: { label: 'Pendapatan', color: 'bg-green-100 text-green-800 border-green-300' },
  BEBAN:   { label: 'Beban',      color: 'bg-red-100 text-red-800 border-red-300' },
  ASSET:   { label: 'Asset',      color: 'bg-blue-100 text-blue-800 border-blue-300' },
};

export default function COAPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<CoaType | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: '', code: '', name: '', type: 'BEBAN' as CoaType });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('coa').select('*').eq('is_active', true).order('code');
    if (data) setAccounts(data);
    setIsLoading(false);
  };

  const filtered = accounts.filter(a => {
    const matchType = filterType === 'ALL' || a.type === filterType;
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.code.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const handleOpenModal = (account?: any) => {
    if (account) setFormData({ id: account.id, code: account.code, name: account.name, type: account.type });
    else setFormData({ id: '', code: '', name: '', type: 'BEBAN' });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { code: formData.code, name: formData.name, type: formData.type };
      let error;
      if (formData.id) {
        ({ error } = await supabase.from('coa').update(payload).eq('id', formData.id));
      } else {
        ({ error } = await supabase.from('coa').insert([payload]));
      }
      if (error) throw error;
      alert('Akun berhasil disimpan!');
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) { alert(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus akun ini?')) return;
    await supabase.from('coa').update({ is_active: false }).eq('id', id);
    fetchData();
  };

  const groupedCounts = { REVENUE: 0, BEBAN: 0, ASSET: 0 };
  accounts.forEach(a => { if (a.type in groupedCounts) groupedCounts[a.type as CoaType]++; });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/keuangan" className="p-2 bg-white border-2 border-gray-300 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-black" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-black flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-blue-600" /> Chart of Accounts
          </h1>
          <p className="text-gray-500 font-semibold text-sm mt-0.5">Kelola akun keuangan: Pendapatan, Beban, dan Asset</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">
        {TYPES.map(t => (
          <button key={t} onClick={() => setFilterType(filterType === t ? 'ALL' : t)}
            className={`p-2.5 md:p-4 rounded-xl border-2 text-left transition-all ${filterType === t ? typeConfig[t].color + ' border-current' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
            <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-500 mb-1 truncate">{typeConfig[t].label}</p>
            <p className="text-xl md:text-2xl font-black text-black">{groupedCounts[t]}</p>
          </button>
        ))}
      </div>

      {/* Search & Add */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Cari kode atau nama akun..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-sm font-semibold text-black" />
        </div>
        <button onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl border-2 border-blue-800 shadow-sm transition-all whitespace-nowrap">
          <Plus className="w-4 h-4" /> Tambah Akun
        </button>
      </div>

      {/* Table - Desktop */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left font-bold text-black">Kode</th>
                <th className="px-5 py-3 text-left font-bold text-black">Nama Akun</th>
                <th className="px-5 py-3 text-left font-bold text-black">Tipe</th>
                <th className="px-5 py-3 text-center font-bold text-black">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={4} className="text-center py-10 text-gray-400 font-semibold">Memuat data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-10 text-gray-400 font-semibold">Tidak ada akun ditemukan.</td></tr>
              ) : filtered.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-black text-gray-700 font-mono">{a.code}</td>
                  <td className="px-5 py-3 font-semibold text-black">{a.name}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${typeConfig[a.type as CoaType]?.color}`}>
                      {typeConfig[a.type as CoaType]?.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 flex justify-center gap-2">
                    <button onClick={() => handleOpenModal(a)} className="p-2 text-white bg-purple-600 hover:bg-purple-700 rounded-lg border border-purple-800 transition-all"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(a.id)} className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-lg border border-red-800 transition-all"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards - Mobile */}
        <div className="md:hidden p-3 space-y-3">
          {isLoading ? <p className="text-center py-8 text-gray-400 font-semibold">Memuat data...</p>
          : filtered.length === 0 ? <p className="text-center py-8 text-gray-400 font-semibold">Tidak ada akun.</p>
          : filtered.map(a => (
            <div key={a.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex justify-between items-start">
              <div>
                <p className="text-xs font-black text-gray-400 font-mono mb-0.5">{a.code}</p>
                <p className="font-bold text-black text-base">{a.name}</p>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full border mt-1.5 inline-block ${typeConfig[a.type as CoaType]?.color}`}>
                  {typeConfig[a.type as CoaType]?.label}
                </span>
              </div>
              <div className="flex gap-2 ml-2 shrink-0">
                <button onClick={() => handleOpenModal(a)} className="p-2 text-white bg-purple-600 rounded-lg border border-purple-800"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(a.id)} className="p-2 text-white bg-red-600 rounded-lg border border-red-800"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200 w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h2 className="font-black text-xl text-black">{formData.id ? 'Edit Akun' : 'Tambah Akun Baru'}</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="w-6 h-6 text-gray-400 hover:text-black" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-black mb-1.5">Kode Akun</label>
                <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})}
                  placeholder="cth: 5-006" className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl font-mono font-bold text-black focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-1.5">Nama Akun</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="cth: Beban Sewa Gudang" className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl font-semibold text-black focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-1.5">Tipe Akun</label>
                <div className="flex flex-wrap gap-2">
                  {TYPES.map(t => (
                    <button key={t} type="button" onClick={() => setFormData({...formData, type: t})}
                      className={`flex-1 min-w-[80px] py-2.5 rounded-xl font-black text-xs md:text-sm border-2 transition-all ${formData.type === t ? typeConfig[t].color + ' border-current' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {typeConfig[t].label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border-2 border-gray-300 bg-white text-black font-bold rounded-xl hover:bg-gray-50">Batal</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 border-2 border-blue-800 text-white font-black rounded-xl hover:bg-blue-700 shadow-md">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
