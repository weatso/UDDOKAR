"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, Trash2, Search, X } from 'lucide-react';

export default function BarangMentahPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', category_id: '', new_category_name: '', unit: 'Lembar' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('*, category:categories(name)')
        .eq('type', 'RAW')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
        
      if (prodErr) throw new Error('Gagal mengambil data barang: ' + prodErr.message);

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
        unit: product.dimensions?.unit || 'Lembar' 
      });
    } else {
      setFormData({ id: '', name: '', category_id: '', new_category_name: '', unit: 'Lembar' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalCategoryId = formData.category_id;
      
      // Jika user memilih buat kategori baru
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

      // Payload dipastikan sesuai skema
      const payload = { 
        name: formData.name, 
        category_id: finalCategoryId, 
        type: 'RAW', 
        dimensions: { unit: formData.unit } 
      };

      let opError;
      if (formData.id) {
        const { error } = await supabase.from('products').update(payload).eq('id', formData.id);
        opError = error;
      } else {
        const { error } = await supabase.from('products').insert([payload]);
        opError = error;
      }

      if (opError) throw new Error('Gagal menyimpan barang mentah: ' + opError.message);

      alert('Data berhasil disimpan!');
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Save Product Error:", error);
      alert(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus barang ini?')) {
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
          <h1 className="text-2xl font-bold text-black">Barang Mentah</h1>
          <p className="text-black font-semibold mt-2 text-base">Kelola daftar bahan baku.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-purple-700 hover:bg-purple-800 text-white border-2 border-purple-900 px-5 py-3 rounded-lg text-base font-bold flex items-center gap-2">
          <Plus className="w-5 h-5" /> Tambah Barang
        </button>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-300 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm md:text-base border-collapse whitespace-nowrap">
            <thead className="bg-gray-200 border-b-2 border-gray-400">
            <tr>
              <th className="px-6 py-4 text-black font-bold">Nama Barang</th>
              <th className="px-6 py-4 text-black font-bold">Kategori</th>
              <th className="px-6 py-4 text-black font-bold text-center">Satuan</th>
              <th className="px-6 py-4 text-black font-bold text-right">Stok Saat Ini</th>
              <th className="px-6 py-4 text-black font-bold text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? <tr><td colSpan={5} className="text-center py-8 text-black font-bold">Memuat data...</td></tr> : 
             products.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-black font-bold">Belum ada data.</td></tr> : 
             products.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-black font-bold">{p.name}</td>
                <td className="px-6 py-4 text-black font-semibold">{p.category?.name || '-'}</td>
                <td className="px-6 py-4 text-black font-semibold text-center">{p.dimensions?.unit || '-'}</td>
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
          <div className="bg-white rounded-xl shadow-2xl border-2 border-gray-400 w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b-2 border-gray-200 bg-gray-100">
              <h2 className="font-bold text-xl text-black">{formData.id ? 'Edit Barang' : 'Tambah Barang'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-black hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="block text-base font-bold text-black mb-2">Nama Barang</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:outline-none" />
              </div>
              <div>
                <label className="block text-base font-bold text-black mb-2">Kategori</label>
                <select value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:outline-none mb-3">
                  <option value="">Pilih Kategori...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value="NEW">+ Buat Kategori Baru</option>
                </select>
                {formData.category_id === 'NEW' && <input required type="text" value={formData.new_category_name} onChange={e => setFormData({...formData, new_category_name: e.target.value})} className="w-full px-4 py-3 border-2 border-purple-600 rounded-lg text-black font-semibold bg-purple-50 focus:outline-none" placeholder="Ketik nama kategori baru" />}
              </div>
              <div>
                <label className="block text-base font-bold text-black mb-2">Satuan</label>
                <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:outline-none">
                  <option value="Lembar">Lembar</option>
                  <option value="Kg">Kg</option>
                  <option value="Pcs">Pcs</option>
                  <option value="Roll">Roll</option>
                  <option value="Liter">Liter (Tinta)</option>
                </select>
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
