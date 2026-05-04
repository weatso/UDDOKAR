"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, Trash2, X, Search } from 'lucide-react';
import { Pagination } from '@/components/shared/Pagination';

const ITEMS_PER_PAGE = 16;

export default function BarangJadiPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', category_id: '', new_category_name: '', sub_type: 'POLOS', dim_p: '', dim_l: '', gramasi: '', selling_price: '' });

  // Fetch categories once
  useEffect(() => {
    const fetchCats = async () => {
      const { data } = await supabase.from('categories').select('*').eq('is_active', true).order('name', { ascending: true });
      if (data) setCategories(data);
    };
    fetchCats();
  }, []);

  // Fetch products on page/search change
  useEffect(() => {
    fetchData(currentPage);
  }, [currentPage, searchQuery]);

  const fetchData = async (page: number) => {
    setIsLoading(true);
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    try {
      let query = supabase
        .from('products')
        .select('*, category:categories(name)', { count: 'exact' })
        .eq('type', 'FINISHED')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, count, error } = await query.range(from, to);
      if (error) throw error;
      if (data) setProducts(data);
      if (count !== null) setTotalItems(count);
    } catch (error: any) {
      console.error("Fetch Data Error:", error);
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
        gramasi: product.dimensions?.gramasi || '',
        selling_price: product.dimensions?.selling_price || ''
      });
    } else {
      setFormData({ id: '', name: '', category_id: '', new_category_name: '', sub_type: 'POLOS', dim_p: '', dim_l: '', gramasi: '', selling_price: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalCategoryId = formData.category_id;
      if (formData.category_id === 'NEW') {
        if (!formData.new_category_name.trim()) return alert('Nama kategori baru tidak boleh kosong!');
        const { data: newCat, error: catError } = await supabase.from('categories').insert([{ name: formData.new_category_name }]).select().single();
        if (catError) throw catError;
        if (newCat) finalCategoryId = newCat.id;
      }
      if (!finalCategoryId || finalCategoryId === 'NEW') return alert('Kategori harus dipilih!');

      const payload = {
        name: formData.name,
        category_id: finalCategoryId,
        type: 'FINISHED',
        sub_type: formData.sub_type,
        dimensions: { 
          p: Number(formData.dim_p), 
          l: Number(formData.dim_l), 
          gramasi: Number(formData.gramasi),
          selling_price: Number(formData.selling_price) || 0
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
      if (opError) throw opError;
      alert('Data berhasil disimpan!');
      setIsModalOpen(false);
      fetchData(currentPage);
    } catch (error: any) { alert(error.message); }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus?')) {
      await supabase.from('products').update({ is_active: false }).eq('id', id);
      fetchData(currentPage);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-full overflow-hidden">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-black">Kardus Jadi (Barang Jadi)</h1>
          <p className="text-black font-semibold mt-1 text-sm md:text-base">Kelola daftar kardus hasil produksi.</p>
        </div>
        <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text"
              placeholder="Cari nama kardus..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0); }}
              className="pl-10 pr-4 py-3 w-full border-2 border-gray-300 rounded-xl focus:border-purple-600 focus:outline-none text-black font-bold transition-all shadow-sm"
            />
          </div>
          <button onClick={() => handleOpenModal()} className="bg-purple-700 hover:bg-purple-800 text-white border-2 border-purple-900 px-5 py-3 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-all shadow-md">
            <Plus className="w-5 h-5" /> Tambah Kardus
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-300 shadow-md overflow-hidden">
        {/* ===== DESKTOP VIEW ===== */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm md:text-base border-collapse whitespace-nowrap">
            <thead className="bg-gray-200 border-b-2 border-gray-400">
              <tr>
                <th className="px-6 py-4 text-black font-bold">Nama Kardus</th>
                <th className="px-6 py-4 text-black font-bold">Tipe</th>
                <th className="px-6 py-4 text-black font-bold">Dimensi (P x L x T)</th>
                <th className="px-6 py-4 text-black font-bold text-right">Harga Jual</th>
                <th className="px-6 py-4 text-black font-bold text-right">Stok</th>
                <th className="px-6 py-4 text-black font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? <tr><td colSpan={5} className="text-center py-8 text-black font-bold">Memuat data...</td></tr> :
                products.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-black font-bold">Kardus tidak ditemukan.</td></tr> :
                  products.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-black font-bold">{p.name} <span className="block text-sm font-semibold text-gray-600">{p.category?.name}</span></td>
                      <td className="px-6 py-4 text-black font-semibold">{p.sub_type}</td>
                      <td className="px-6 py-4 text-black font-semibold">{p.dimensions?.p}x{p.dimensions?.l} cm ({p.dimensions?.gramasi}gr)</td>
                      <td className="px-6 py-4 text-black font-black text-right">Rp {new Intl.NumberFormat('id-ID').format(p.dimensions?.selling_price || 0)}</td>
                      <td className="px-6 py-4 text-black font-bold text-right text-lg">{p.stock_quantity}</td>
                      <td className="px-6 py-4 flex justify-center gap-3">
                        <button onClick={() => handleOpenModal(p)} className="p-2 text-white bg-purple-600 hover:bg-purple-700 rounded-md border border-purple-800 transition-all"><Edit className="w-5 h-5" /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-md border border-red-800 transition-all"><Trash2 className="w-5 h-5" /></button>
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
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-black font-bold bg-white rounded-xl border-2 border-dashed border-gray-300">Kardus tidak ditemukan.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {products.map(p => (
                <div key={p.id} className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <p className="text-lg font-bold text-black leading-tight">{p.name}</p>
                    <span className={`shrink-0 text-xs font-black px-2.5 py-1 rounded-full border ${p.sub_type === 'CETAK' ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>{p.sub_type}</span>
                  </div>
                  <div className="flex flex-col gap-2 text-sm border-t border-gray-100 pt-3">
                    <div className="flex justify-between text-gray-600 mb-1"><span className="font-semibold">Kategori</span><span className="font-bold text-black">{p.category?.name || '-'}</span></div>
                    <div className="flex justify-between text-gray-600 mb-1"><span className="font-semibold">Dimensi</span><span className="font-bold text-black">{p.dimensions?.p ?? '-'} × {p.dimensions?.l ?? '-'} cm</span></div>
                    <div className="flex justify-between text-gray-600 mb-2"><span className="font-semibold">Gramasi</span><span className="font-bold text-black">{p.dimensions?.gramasi ?? '-'} g/m²</span></div>
                  </div>
                  <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 mt-1">
                    <span className="text-sm font-semibold text-gray-500">Harga Jual</span>
                    <span className="text-lg font-black text-black">Rp {new Intl.NumberFormat('id-ID').format(p.dimensions?.selling_price || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 mt-2">
                    <span className="text-sm font-semibold text-gray-500">Stok Saat Ini</span>
                    <span className={`text-xl font-black ${(p.stock_quantity ?? 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>{p.stock_quantity ?? 0}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <button onClick={() => handleOpenModal(p)} className="flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-lg border border-purple-800 transition-all"><Edit className="w-4 h-4" /> Edit</button>
                    <button onClick={() => handleDelete(p.id)} className="flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-lg border border-red-800 transition-all"><Trash2 className="w-4 h-4" /> Hapus</button>
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
              <h2 className="font-bold text-xl text-black">{formData.id ? 'Edit Kardus' : 'Tambah Kardus'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-black transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
                <div>
                  <label className="block text-base font-bold text-black mb-2">Nama Kardus</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-black font-semibold focus:border-purple-600 transition-all" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-base font-bold text-black mb-2">Kategori</label>
                    <select value={formData.category_id} onChange={e => setFormData({ ...formData, category_id: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-black font-semibold focus:border-purple-600 transition-all">
                      <option value="">Pilih Kategori...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      <option value="NEW">+ Kategori Baru</option>
                    </select>
                    {formData.category_id === 'NEW' && <input required type="text" value={formData.new_category_name} onChange={e => setFormData({ ...formData, new_category_name: e.target.value })} className="w-full px-4 py-3 border-2 border-purple-600 rounded-xl text-black font-semibold bg-purple-50 focus:outline-none mt-2 transition-all" placeholder="Nama Kategori Baru" />}
                  </div>
                  <div>
                    <label className="block text-base font-bold text-black mb-2">Tipe</label>
                    <select value={formData.sub_type} onChange={e => setFormData({ ...formData, sub_type: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-black font-semibold focus:border-purple-600 transition-all">
                      <option value="POLOS">POLOS</option>
                      <option value="CETAK">CETAK</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-base font-bold text-black mb-2">Harga Jual Standar (Rp)</label>
                  <input required type="number" value={formData.selling_price} onChange={e => setFormData({ ...formData, selling_price: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-black font-black text-lg focus:border-purple-600 transition-all" placeholder="0" />
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
                  <label className="block text-base font-bold text-black mb-3">Dimensi & Gramasi</label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Panjang (cm)</label>
                      <input required type="number" value={formData.dim_p} onChange={e => setFormData({ ...formData, dim_p: e.target.value })} className="w-full p-2 border-2 border-gray-300 rounded-lg font-semibold text-black focus:border-purple-600 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Lebar (cm)</label>
                      <input required type="number" value={formData.dim_l} onChange={e => setFormData({ ...formData, dim_l: e.target.value })} className="w-full p-2 border-2 border-gray-300 rounded-lg font-semibold text-black focus:border-purple-600 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Gramasi (g/m²)</label>
                      <input required type="number" value={formData.gramasi} onChange={e => setFormData({ ...formData, gramasi: e.target.value })} className="w-full p-2 border-2 border-gray-300 rounded-lg font-semibold text-black focus:border-purple-600 transition-all" />
                    </div>
                  </div>
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
