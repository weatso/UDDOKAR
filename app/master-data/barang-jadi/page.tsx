"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, Trash2, X } from 'lucide-react';

export default function BarangJadiPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', category_id: '', new_category_name: '', sub_type: 'POLOS', dim_p: '', dim_l: '', gramasi: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('*, category:categories(name)')
        .eq('type', 'FINISHED')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
        
      if (prodErr) throw new Error('Gagal mengambil data kardus: ' + prodErr.message);

      const { data: catData, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
        
      if (catErr) throw new Error('Gagal mengambil data kategori: ' + catErr.message);

      if (prodData) setProducts(prodData);
      if (catData) setCategories(catData);
    } catch (error: any) {
      console.error("Fetch Data Error:", error);
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (product?: any) => {
    if (product) {
      setFormData({ 
        id: product.id, 
        name: product.name, 
        category_id: product.category_id || '', 
        new_category_name: '', 
        sub_type: product.sub_type || 'POLOS', 
        dim_p: product.dimensions?.p || '', 
        dim_l: product.dimensions?.l || '', 
        gramasi: product.dimensions?.gramasi || '' 
      });
    } else {
      setFormData({ id: '', name: '', category_id: '', new_category_name: '', sub_type: 'POLOS', dim_p: '', dim_l: '', gramasi: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalCategoryId = formData.category_id;
      
      // Handle buat kategori baru
      if (formData.category_id === 'NEW') {
        if (!formData.new_category_name.trim()) return alert('Nama kategori baru tidak boleh kosong!');
        
        const { data: newCat, error: catError } = await supabase
          .from('categories')
          .insert([{ name: formData.new_category_name }])
          .select()
          .single();
          
        if (catError) throw new Error('Gagal membuat kategori baru: ' + catError.message);
        if (newCat) finalCategoryId = newCat.id;
      }

      if (!finalCategoryId || finalCategoryId === 'NEW') {
        return alert('Kategori harus dipilih atau dibuat dengan benar!');
      }

      const payload = { 
        name: formData.name, 
        category_id: finalCategoryId, 
        type: 'FINISHED', 
        sub_type: formData.sub_type, 
        dimensions: { 
          p: Number(formData.dim_p), 
          l: Number(formData.dim_l), 
          gramasi: Number(formData.gramasi) 
        } 
      };

      let opError;
      if (formData.id) {
        const { error } = await supabase.from('products').update(payload).eq('id', formData.id);
        opError = error;
      } else {
        const { error } = await supabase.from('products').insert([payload]);
        opError = error;
      }

      if (opError) throw new Error('Gagal menyimpan kardus jadi: ' + opError.message);

      alert('Data berhasil disimpan!');
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Save Product Error:", error);
      alert(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus kardus ini?')) {
      try {
        const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id);
        if (error) throw new Error('Gagal menghapus data: ' + error.message);
        alert('Data berhasil dihapus');
        fetchData();
      } catch (error: any) {
        console.error("Delete Error:", error);
        alert(error.message);
      }
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-full overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-black">Kardus Jadi (Barang Jadi)</h1>
          <p className="text-black font-semibold mt-2 text-base">Kelola daftar kardus hasil produksi.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-purple-700 hover:bg-purple-800 text-white border-2 border-purple-900 px-5 py-3 rounded-lg text-base font-bold flex items-center gap-2">
          <Plus className="w-5 h-5" /> Tambah Kardus
        </button>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-300 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm md:text-base border-collapse whitespace-nowrap">
            <thead className="bg-gray-200 border-b-2 border-gray-400">
            <tr>
              <th className="px-6 py-4 text-black font-bold">Nama Kardus</th>
              <th className="px-6 py-4 text-black font-bold">Tipe</th>
              <th className="px-6 py-4 text-black font-bold">Dimensi (P x L x T)</th>
              <th className="px-6 py-4 text-black font-bold text-right">Stok</th>
              <th className="px-6 py-4 text-black font-bold text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? <tr><td colSpan={5} className="text-center py-8 text-black font-bold">Memuat data...</td></tr> : 
             products.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-black font-bold">Belum ada data.</td></tr> : 
             products.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-black font-bold">{p.name} <span className="block text-sm font-semibold text-gray-600">{p.category?.name}</span></td>
                <td className="px-6 py-4 text-black font-semibold">{p.sub_type}</td>
                <td className="px-6 py-4 text-black font-semibold">{p.dimensions?.p}x{p.dimensions?.l} cm ({p.dimensions?.gramasi}gr)</td>
                <td className="px-6 py-4 text-black font-bold text-right text-lg">{p.stock_quantity}</td>
                <td className="px-6 py-4 flex justify-center gap-3">
                  <button onClick={() => handleOpenModal(p)} className="p-2 text-white bg-purple-600 hover:bg-purple-700 rounded-md border border-purple-800"><Edit className="w-5 h-5" /></button>
                  <button onClick={() => handleDelete(p.id)} className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-md border border-red-800"><Trash2 className="w-5 h-5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border-2 border-gray-400 w-full max-w-lg">
            <div className="flex justify-between items-center p-5 border-b-2 border-gray-200 bg-gray-100">
              <h2 className="font-bold text-xl text-black">{formData.id ? 'Edit Kardus' : 'Tambah Kardus'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-black hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="block text-base font-bold text-black mb-2">Nama Kardus</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-black font-semibold focus:border-purple-600" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-bold text-black mb-2">Kategori</label>
                  <select value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-black font-semibold focus:border-purple-600">
                    <option value="">Pilih Kategori...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    <option value="NEW">+ Kategori Baru</option>
                  </select>
                  {formData.category_id === 'NEW' && <input required type="text" value={formData.new_category_name} onChange={e => setFormData({...formData, new_category_name: e.target.value})} className="w-full px-4 py-3 border-2 border-purple-600 rounded-lg text-black font-semibold bg-purple-50 focus:outline-none mt-2" placeholder="Nama Kategori Baru" />}
                </div>
                <div>
                  <label className="block text-base font-bold text-black mb-2">Tipe</label>
                  <select value={formData.sub_type} onChange={e => setFormData({...formData, sub_type: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:outline-none">
                    <option value="POLOS">POLOS</option>
                    <option value="CETAK">CETAK</option>
                  </select>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
                <label className="block text-base font-bold text-black mb-3">Dimensi & Gramasi</label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Panjang (cm)</label>
                    <input required type="number" value={formData.dim_p} onChange={e => setFormData({...formData, dim_p: e.target.value})} className="w-full p-2 border-2 border-gray-300 rounded-lg font-semibold text-black focus:border-purple-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Lebar (cm)</label>
                    <input required type="number" value={formData.dim_l} onChange={e => setFormData({...formData, dim_l: e.target.value})} className="w-full p-2 border-2 border-gray-300 rounded-lg font-semibold text-black focus:border-purple-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Gramasi (g/m²)</label>
                    <input required type="number" value={formData.gramasi} onChange={e => setFormData({...formData, gramasi: e.target.value})} className="w-full p-2 border-2 border-gray-300 rounded-lg font-semibold text-black focus:border-purple-600" />
                  </div>
                </div>
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
