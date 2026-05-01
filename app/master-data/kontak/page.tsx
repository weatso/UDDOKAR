"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, Trash2, X, Phone, MapPin } from 'lucide-react';

export default function KontakPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'SUPPLIER' | 'CUSTOMER'>('CUSTOMER');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', pic_name: '', type: 'CUSTOMER', phone: '', address: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('contacts').select('*').eq('is_active', true).order('name', { ascending: true });
    if (data) setContacts(data);
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
    const payload = { name: formData.name, pic_name: formData.pic_name, type: formData.type, phone: formData.phone, address: formData.address };
    if (formData.id) await supabase.from('contacts').update(payload).eq('id', formData.id);
    else await supabase.from('contacts').insert([payload]);

    setIsModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus?')) {
      await supabase.from('contacts').update({ is_active: false }).eq('id', id);
      fetchData();
    }
  };

  const filteredContacts = contacts.filter(c => c.type === activeTab);

  return (
    <div className="p-4 md:p-8 max-w-full overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-black">Buku Kontak</h1>
          <p className="text-black font-semibold mt-2 text-base">Kelola daftar Pelanggan dan Pemasok.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-purple-700 hover:bg-purple-800 text-white border-2 border-purple-900 px-5 py-3 rounded-lg text-base font-bold flex items-center gap-2">
          <Plus className="w-5 h-5" /> Tambah Kontak
        </button>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-300 shadow-md overflow-hidden">
        <div className="flex border-b-2 border-gray-300 bg-gray-100 px-4 pt-4 gap-4">
          <button onClick={() => setActiveTab('CUSTOMER')} className={`px-5 py-3 font-bold text-base border-b-4 transition-colors ${activeTab === 'CUSTOMER' ? 'border-purple-600 text-purple-800' : 'border-transparent text-gray-600 hover:text-black'}`}>Pelanggan</button>
          <button onClick={() => setActiveTab('SUPPLIER')} className={`px-5 py-3 font-bold text-base border-b-4 transition-colors ${activeTab === 'SUPPLIER' ? 'border-purple-600 text-purple-800' : 'border-transparent text-gray-600 hover:text-black'}`}>Pemasok</button>
        </div>
        <div className="overflow-x-auto">
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
             filteredContacts.length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-black font-bold">Belum ada data.</td></tr> : 
             filteredContacts.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
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
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border-2 border-gray-400 w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b-2 border-gray-200 bg-gray-100">
              <h2 className="font-bold text-xl text-black">{formData.id ? 'Edit Kontak' : 'Tambah Kontak'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-black hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="block text-base font-bold text-black mb-2">Tipe Kontak</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:outline-none">
                  <option value="CUSTOMER">Pelanggan</option>
                  <option value="SUPPLIER">Pemasok</option>
                </select>
              </div>
              <div>
                <label className="block text-base font-bold text-black mb-2">Nama / Instansi</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:outline-none" />
              </div>
              <div>
                <label className="block text-base font-bold text-black mb-2">Nama PIC (Penanggung Jawab)</label>
                <input type="text" value={formData.pic_name} onChange={e => setFormData({...formData, pic_name: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:outline-none" placeholder="Opsional" />
              </div>
              <div>
                <label className="block text-base font-bold text-black mb-2">No. Telepon</label>
                <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:outline-none" />
              </div>
              <div>
                <label className="block text-base font-bold text-black mb-2">Alamat Lengkap</label>
                <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:outline-none" rows={3} />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-3 border-2 border-gray-300 bg-gray-100 text-black font-bold rounded-lg hover:bg-gray-200">Batal</button>
                <button type="submit" className="px-5 py-3 bg-purple-700 border-2 border-purple-900 text-white font-bold rounded-lg hover:bg-purple-800">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
