"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, Trash2, X, Phone, MapPin, UserCheck } from 'lucide-react';
import { Pagination } from '@/components/shared/Pagination';

const ITEMS_PER_PAGE = 16;

export default function KontakPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'SUPPLIER' | 'CUSTOMER'>('CUSTOMER');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', pic_name: '', type: 'CUSTOMER', phone: '', address: '' });

  useEffect(() => {
    fetchData(currentPage);
  }, [activeTab, currentPage]);

  const fetchData = async (page: number) => {
    setIsLoading(true);
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data, count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .eq('type', activeTab)
        .order('name', { ascending: true })
        .range(from, to);

    if (data) setContacts(data);
    if (count !== null) setTotalItems(count);
    setIsLoading(false);
  };

  const handleOpenModal = (contact?: any) => {
    if (contact) {
      setFormData({ id: contact.id, name: contact.name, pic_name: contact.pic_name || '', type: contact.type, phone: contact.phone || '', address: contact.address || '' });
    } else {
      setFormData({ id: '', name: '', pic_name: '', type: activeTab, phone: '', address: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const payload = { 
      name: formData.name, 
      pic_name: formData.pic_name, 
      type: formData.type, 
      phone: formData.phone, 
      address: formData.address 
    };

    try {
      const { error } = formData.id 
        ? await supabase.from('contacts').update(payload).eq('id', formData.id)
        : await supabase.from('contacts').insert([{ ...payload, is_active: true }]);

      if (error) throw error;

      setIsModalOpen(false);
      
      // Jika tipe kontak yang disimpan berbeda dengan tab aktif, pindah tab
      if (formData.type !== activeTab) {
        setActiveTab(formData.type as any);
        setCurrentPage(0);
      } else {
        fetchData(currentPage);
      }
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus?')) {
      await supabase.from('contacts').update({ is_active: false }).eq('id', id);
      fetchData(currentPage);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-full overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-black">Buku Kontak</h1>
          <p className="text-black font-semibold mt-2 text-base">Kelola daftar Pelanggan dan Pemasok.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="w-full md:w-auto bg-purple-700 hover:bg-purple-800 text-white border-2 border-purple-900 px-5 py-3 rounded-xl text-base font-bold flex items-center justify-center gap-2 shadow-md transition-all">
          <Plus className="w-5 h-5" /> Tambah Kontak
        </button>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-300 shadow-md overflow-hidden">
        <div className="flex border-b-2 border-gray-300 bg-gray-100 px-2 sm:px-4 pt-4 gap-2 sm:gap-4 overflow-x-auto whitespace-nowrap">
          <button onClick={() => setActiveTab('CUSTOMER')} className={`px-4 sm:px-5 py-3 font-black text-sm sm:text-base border-b-4 transition-colors ${activeTab === 'CUSTOMER' ? 'border-purple-600 text-purple-800' : 'border-transparent text-gray-600 hover:text-black'}`}>📦 Pelanggan</button>
          <button onClick={() => setActiveTab('SUPPLIER')} className={`px-4 sm:px-5 py-3 font-black text-sm sm:text-base border-b-4 transition-colors ${activeTab === 'SUPPLIER' ? 'border-purple-600 text-purple-800' : 'border-transparent text-gray-600 hover:text-black'}`}>🏭 Pemasok</button>
        </div>

        {/* ===== DESKTOP TABLE VIEW ===== */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm md:text-base border-collapse whitespace-nowrap">
            <thead className="bg-gray-200 border-b-2 border-gray-400">
              <tr>
                <th className="px-6 py-4 text-black font-bold">Nama Lengkap / Instansi</th>
                <th className="px-6 py-4 text-black font-bold">Telepon</th>
                <th className="px-6 py-4 text-black font-bold">Alamat</th>
                <th className="px-6 py-4 text-black font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? <tr><td colSpan={4} className="text-center py-8 text-black font-bold">Memuat data...</td></tr> : 
               contacts.length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-black font-bold">Belum ada data.</td></tr> : 
               contacts.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-black font-bold text-base">{c.name}</p>
                    {c.pic_name && <p className="text-sm font-semibold text-gray-600">PIC: {c.pic_name}</p>}
                  </td>
                  <td className="px-6 py-4 text-black font-semibold">{c.phone || '-'}</td>
                  <td className="px-6 py-4 text-black font-semibold">{c.address || '-'}</td>
                  <td className="px-6 py-4 flex justify-center gap-3">
                    <button onClick={() => handleOpenModal(c)} className="p-2 text-white bg-purple-600 hover:bg-purple-700 rounded-md border border-purple-800"><Edit className="w-5 h-5" /></button>
                    <button onClick={() => handleDelete(c.id)} className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-md border border-red-800"><Trash2 className="w-5 h-5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ===== MOBILE CARD VIEW ===== */}
        <div className="md:hidden p-3 bg-gray-50 min-h-[200px]">
          {isLoading ? (
            <div className="text-center py-8 text-black font-bold">Memuat data...</div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-8 text-black font-bold bg-white rounded-xl border-2 border-dashed border-gray-300">Belum ada data {activeTab.toLowerCase()}.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {contacts.map(c => (
                <div key={c.id} className="bg-white rounded-2xl border-2 border-gray-300 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg font-black text-black leading-tight mb-1">{c.name}</h3>
                    {c.pic_name && (
                      <div className="flex items-center gap-1.5 text-purple-700 font-bold text-xs uppercase tracking-wider">
                        <UserCheck className="w-3.5 h-3.5" /> PIC: {c.pic_name}
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 bg-gray-100 p-1.5 rounded-lg border border-gray-200 text-gray-600">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nomor Telepon</p>
                        <p className="text-sm font-bold text-black">{c.phone || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 bg-gray-100 p-1.5 rounded-lg border border-gray-200 text-gray-600">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Alamat Lengkap</p>
                        <p className="text-sm font-bold text-black leading-relaxed">{c.address || '-'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 border-t border-gray-200 flex gap-2">
                    <button onClick={() => handleOpenModal(c)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl border-2 border-purple-800 shadow-sm transition-all"><Edit className="w-4 h-4" /> Edit</button>
                    <button onClick={() => handleDelete(c.id)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl border-2 border-red-800 shadow-sm transition-all"><Trash2 className="w-4 h-4" /> Hapus</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Pagination 
        currentPage={currentPage}
        totalItems={totalItems}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-300 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b-2 border-gray-100 bg-gray-50/50">
              <h2 className="font-bold text-xl text-black">{formData.id ? 'Edit Kontak' : 'Tambah Kontak'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-black transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
                <div>
                  <label className="block text-base font-bold text-black mb-2">Tipe Kontak</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-black font-semibold focus:border-purple-600 focus:outline-none transition-all">
                    <option value="CUSTOMER">Pelanggan</option>
                    <option value="SUPPLIER">Pemasok</option>
                  </select>
                </div>
                <div>
                  <label className="block text-base font-bold text-black mb-2">Nama / Instansi</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-black font-semibold focus:border-purple-600 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-base font-bold text-black mb-2">Nama PIC (Penanggung Jawab)</label>
                  <input type="text" value={formData.pic_name} onChange={e => setFormData({...formData, pic_name: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-black font-semibold focus:border-purple-600 focus:outline-none transition-all" placeholder="Opsional" />
                </div>
                <div>
                  <label className="block text-base font-bold text-black mb-2">No. Telepon</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-black font-semibold focus:border-purple-600 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-base font-bold text-black mb-2">Alamat Lengkap</label>
                  <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-black font-semibold focus:border-purple-600 focus:outline-none transition-all" rows={3} />
                </div>
              </div>
              <div className="p-5 border-t-2 border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 border-2 border-gray-300 bg-white text-black font-bold rounded-xl hover:bg-gray-100 transition-all">Batal</button>
                <button type="submit" className="px-8 py-3 bg-purple-600 border-2 border-purple-800 text-white font-bold rounded-xl hover:bg-purple-700 shadow-md transition-all">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
