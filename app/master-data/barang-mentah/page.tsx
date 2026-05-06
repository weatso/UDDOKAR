"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, Trash2, Search, X, Save } from 'lucide-react';
import { Pagination } from '@/components/shared/Pagination';

const ITEMS_PER_PAGE = 16;

export default function BarangMentahPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemsToInsert, setItemsToInsert] = useState([
    { id: '', name: '', category_id: '', new_category_name: '', unit: 'pcs', base_price: '', stock_quantity: '' }
  ]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').eq('is_active', true).order('name', { ascending: true });
    if (data) setCategories(data);
  };

  // Fetch categories once on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch products when page or search changes
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
        .eq('type', 'RAW')
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
      setItemsToInsert([{ 
        id: product.id, 
        name: product.name, 
        category_id: product.category_id || '', 
        new_category_name: '',
        unit: product.dimensions?.unit || 'pcs',
        base_price: product.base_price?.toString() || '',
        stock_quantity: product.stock_quantity?.toString() || ''
      }]);
    } else {
      setItemsToInsert([{ id: '', name: '', category_id: '', new_category_name: '', unit: 'pcs', base_price: '', stock_quantity: '' }]);
    }
    setIsModalOpen(true);
  };

  const handleAddRow = () => {
    setItemsToInsert([...itemsToInsert, { id: '', name: '', category_id: '', new_category_name: '', unit: 'pcs', base_price: '', stock_quantity: '' }]);
  };

  const handleRemoveRow = (index: number) => {
    setItemsToInsert(itemsToInsert.filter((_, i) => i !== index));
  };
  
  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...itemsToInsert];
    newItems[index] = { ...newItems[index], [field as keyof typeof newItems[0]]: value };
    setItemsToInsert(newItems);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Process new categories first
      const uniqueNewCategories = new Map<string, string>();
      for (const item of itemsToInsert) {
        if (item.category_id === 'NEW' && item.new_category_name?.trim()) {
          const newName = item.new_category_name.trim();
          const lowerName = newName.toLowerCase();
          
          const exists = categories.find(c => c.name.toLowerCase() === lowerName);
          if (exists) {
            throw new Error(`Kategori "${newName}" sudah ada di sistem! Silakan batalkan Kategori Baru dan pilih langsung dari dropdown.`);
          }
          uniqueNewCategories.set(lowerName, newName);
        }
      }
      
      const newCategoryMap: Record<string, string> = {};
      for (const [lowerName, originalName] of uniqueNewCategories) {
        const { data: newCat, error: catError } = await supabase.from('categories').insert([{ name: originalName }]).select().single();
        if (catError) throw catError;
        newCategoryMap[lowerName] = newCat.id;
      }

      // 2. Build payloads
      const payloads = itemsToInsert.map(item => {
        let finalCategoryId = item.category_id;
        if (item.category_id === 'NEW') {
          if (!item.new_category_name?.trim()) throw new Error('Nama kategori baru tidak boleh kosong!');
          finalCategoryId = newCategoryMap[item.new_category_name.trim().toLowerCase()];
        }
        if (!finalCategoryId) throw new Error('Kategori wajib dipilih untuk semua baris!');
        if (!item.name) throw new Error('Nama barang wajib diisi untuk semua baris!');

        return {
          id: item.id || undefined,
          name: item.name,
          category_id: finalCategoryId,
          type: 'RAW',
          dimensions: { unit: item.unit },
          base_price: Number(item.base_price) || 0,
          stock_quantity: Number(item.stock_quantity) || 0
        };
      });

      const toInsert = payloads.filter(p => !p.id).map(({ id, ...rest }) => rest);
      const toUpdate = payloads.filter(p => p.id);

      if (toInsert.length > 0) {
        const { error } = await supabase.from('products').insert(toInsert);
        if (error) throw error;
      }

      for (const p of toUpdate) {
        const { id, ...updateData } = p;
        const { error } = await supabase.from('products').update(updateData).eq('id', id);
        if (error) throw error;
      }

      alert('Data berhasil disimpan!');
      setIsModalOpen(false);
      fetchData(currentPage);
      if (uniqueNewCategories.size > 0) fetchCategories();
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
          <h1 className="text-2xl font-bold text-black">Barang Mentah</h1>
          <p className="text-black font-semibold mt-1 text-sm md:text-base">Kelola daftar bahan baku.</p>
        </div>
        <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari nama barang..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0); }}
              className="pl-10 pr-4 py-3 w-full border-2 border-gray-300 rounded-xl focus:border-purple-600 focus:outline-none text-black font-bold transition-all shadow-sm"
            />
          </div>
          <button onClick={() => handleOpenModal()} className="bg-purple-700 hover:bg-purple-800 text-white border-2 border-purple-900 px-5 py-3 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-all shadow-md">
            <Plus className="w-5 h-5" /> Tambah Barang
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-300 shadow-md overflow-hidden">
        {/* ===== DESKTOP VIEW ===== */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm md:text-base border-collapse whitespace-nowrap">
            <thead className="bg-gray-200 border-b-2 border-gray-400">
              <tr>
                <th className="px-6 py-4 text-black font-bold">Nama Barang</th>
                <th className="px-6 py-4 text-black font-bold">Kategori</th>
                <th className="px-6 py-4 text-black font-bold text-center">Satuan</th>
                <th className="px-6 py-4 text-black font-bold text-right">Sisa Stok</th>
                <th className="px-6 py-4 text-black font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? <tr><td colSpan={5} className="text-center py-8 text-black font-bold">Memuat data...</td></tr> :
                products.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-black font-bold">Barang tidak ditemukan.</td></tr> :
                  products.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-black font-bold">{p.name}</td>
                      <td className="px-6 py-4 text-black font-semibold">{p.category?.name || '-'}</td>
                      <td className="px-6 py-4 text-black font-semibold text-center">{p.dimensions?.unit || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center justify-center px-3 py-1 text-xs font-black uppercase tracking-tighter border-2 rounded-lg shadow-sm ${p.stock_quantity === 0 ? 'bg-red-100 text-red-700 border-red-300' :
                            p.stock_quantity <= 10 ? 'bg-orange-100 text-orange-700 border-orange-300' :
                              'bg-green-100 text-green-700 border-green-300'
                          }`}>
                          {p.stock_quantity === 0 ? '0 (HABIS)' : p.stock_quantity <= 10 ? `${p.stock_quantity} (MENIPIS)` : `${p.stock_quantity} (AMAN)`}
                        </span>
                      </td>
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
            <div className="text-center py-8 text-black font-bold bg-white rounded-xl border-2 border-dashed border-gray-300">Barang tidak ditemukan.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {products.map(p => (
                <div key={p.id} className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-lg font-bold text-black leading-tight">{p.name}</p>
                    <span className="shrink-0 bg-purple-100 text-purple-800 border border-purple-300 text-xs font-bold px-2.5 py-1 rounded-full">{p.category?.name || 'Tanpa Kategori'}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 text-sm border-t border-gray-100 pt-3">
                    <div className="flex justify-between items-center"><span className="text-gray-500 font-semibold">Satuan</span><span className="text-black font-bold">{p.dimensions?.unit || '-'}</span></div>
                    <div className="flex justify-between items-center"><span className="text-gray-500 font-semibold">Sisa Stok</span>
                      <span className={`inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter border-2 rounded-md shadow-sm ${p.stock_quantity === 0 ? 'bg-red-100 text-red-700 border-red-300' :
                          p.stock_quantity <= 10 ? 'bg-orange-100 text-orange-700 border-orange-300' :
                            'bg-green-100 text-green-700 border-green-300'
                        }`}>
                        {p.stock_quantity === 0 ? '0 (HABIS)' : p.stock_quantity <= 10 ? `${p.stock_quantity} (MENIPIS)` : `${p.stock_quantity} (AMAN)`}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 border-t border-gray-100 pt-3">
                    <button onClick={() => handleOpenModal(p)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-lg border border-purple-800 transition-all"><Edit className="w-4 h-4" /> Edit</button>
                    <button onClick={() => handleDelete(p.id)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-lg border border-red-800 transition-all"><Trash2 className="w-4 h-4" /> Hapus</button>
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
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-300 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b-2 border-gray-100 bg-gray-50/50">
              <h2 className="font-bold text-xl text-black">{itemsToInsert[0]?.id ? 'Edit Barang' : 'Tambah Barang (Bulk Insert)'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-black transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5 bg-gray-50/30">
                <div className="overflow-x-auto border-2 border-gray-200 rounded-xl bg-white">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-gray-100">
                      <tr className="border-b-2 border-gray-200">
                        <th className="py-3 px-4 font-bold text-gray-700 w-[25%] text-sm uppercase tracking-wider">Nama Barang</th>
                        <th className="py-3 px-4 font-bold text-gray-700 w-[20%] text-sm uppercase tracking-wider">Kategori</th>
                        <th className="py-3 px-4 font-bold text-gray-700 w-[15%] text-sm uppercase tracking-wider">Satuan</th>
                        <th className="py-3 px-4 font-bold text-gray-700 w-[15%] text-sm uppercase tracking-wider">Harga (Rp)</th>
                        <th className="py-3 px-4 font-bold text-gray-700 w-[15%] text-sm uppercase tracking-wider">Stok Awal</th>
                        <th className="py-3 px-4 font-bold text-gray-700 text-center w-[10%] text-sm uppercase tracking-wider">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {itemsToInsert.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50/50">
                          <td className="py-3 px-4 align-top">
                            <input required type="text" value={item.name} onChange={e => handleItemChange(index, 'name', e.target.value)} className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:ring-0 transition-all text-sm outline-none" placeholder="Nama..." />
                          </td>
                          <td className="py-3 px-4 align-top">
                            <select required value={item.category_id} onChange={e => handleItemChange(index, 'category_id', e.target.value)} className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:ring-0 transition-all text-sm outline-none bg-white">
                              <option value="">Pilih...</option>
                              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              <option value="NEW">+ Kategori Baru</option>
                            </select>
                            {item.category_id === 'NEW' && (
                              <input required type="text" value={item.new_category_name || ''} onChange={e => handleItemChange(index, 'new_category_name', e.target.value)} className="mt-2 w-full px-3 py-2 border-2 border-purple-400 rounded-lg text-black font-semibold bg-purple-50 focus:border-purple-600 focus:outline-none transition-all text-sm placeholder-purple-300" placeholder="Ketik kategori..." />
                            )}
                          </td>
                          <td className="py-3 px-4 align-top">
                            <select required value={item.unit} onChange={e => handleItemChange(index, 'unit', e.target.value)} className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:ring-0 transition-all text-sm outline-none bg-white">
                              <option value="pack">pack</option>
                              <option value="kg">kg</option>
                              <option value="lembar">lembar</option>
                              <option value="liter">liter</option>
                              <option value="roll">roll</option>
                              <option value="pcs">pcs</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 align-top">
                            <input type="text" value={item.base_price ? new Intl.NumberFormat('id-ID').format(Number(item.base_price)) : ''} onChange={e => handleItemChange(index, 'base_price', e.target.value.replace(/[^0-9]/g, ''))} className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:ring-0 transition-all text-sm outline-none" placeholder="0" />
                          </td>
                          <td className="py-3 px-4 align-top">
                            <input required type="number" value={item.stock_quantity} onChange={e => handleItemChange(index, 'stock_quantity', e.target.value)} className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:ring-0 transition-all text-sm outline-none" placeholder="0" />
                          </td>
                          <td className="py-3 px-4 text-center align-top">
                            <button type="button" onClick={() => handleRemoveRow(index)} className="p-2 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors border border-transparent hover:border-red-200">
                              <Trash2 className="w-5 h-5 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!itemsToInsert[0]?.id && (
                  <button type="button" onClick={handleAddRow} className="mt-1 text-purple-700 font-bold hover:text-purple-800 hover:bg-purple-100 flex items-center justify-center gap-2 self-start bg-purple-50 px-5 py-2.5 rounded-xl border-2 border-purple-200 transition-all shadow-sm">
                    <Plus className="w-5 h-5" /> Tambah Baris
                  </button>
                )}
              </div>
              <div className="p-5 border-t-2 border-gray-200 bg-white flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 border-2 border-gray-300 bg-white text-black font-bold rounded-xl hover:bg-gray-100 transition-all">Batal</button>
                <button type="submit" className="px-8 py-3 bg-green-600 border-2 border-green-700 text-white font-black rounded-xl hover:bg-green-700 shadow-md transition-all text-sm uppercase tracking-widest flex items-center gap-2">
                  <Save className="w-5 h-5" /> SIMPAN SEMUA BARANG
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
