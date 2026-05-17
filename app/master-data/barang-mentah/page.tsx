"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, Trash2, Search, X, Save, Truck, Receipt, CheckCircle2 } from 'lucide-react';
import { Pagination } from '@/components/shared/Pagination';

const ITEMS_PER_PAGE = 16;

export default function BarangMentahPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemsToInsert, setItemsToInsert] = useState([
    { id: '', name: '', gramasi: '', unit: '', new_unit_name: '', base_price: '', stock_quantity: '' }
  ]);
  
  // Receive PO States
  const [isTerimaModalOpen, setIsTerimaModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [activePOs, setActivePOs] = useState<any[]>([]);
  const [receivingQty, setReceivingQty] = useState<{ [key: string]: string }>({});
  const [refNumber, setRefNumber] = useState("");
  const [isSubmittingPO, setIsSubmittingPO] = useState(false);

  const fetchUnits = async () => {
    const { data } = await supabase.from('units').select('*').eq('is_active', true).order('name', { ascending: true });
    if (data) setUnits(data);
  };

  useEffect(() => {
    fetchUnits();
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
        .select('*', { count: 'exact' })
        .eq('type', 'RAW')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, count, error } = await query.range(from, to);

      if (error) throw error;

      // 2. Fetch Pending PO quantities for visible products
      const { data: pendingData } = await supabase
        .from('transaction_items')
        .select('product_id, quantity, qty_received, transactions!inner(status, type, is_void)')
        .eq('transactions.type', 'PO_INBOUND')
        .eq('transactions.is_void', false);

      const pendingMap = (pendingData || []).reduce((acc: any, item: any) => {
        const pending = Number(item.quantity) - Number(item.qty_received || 0);
        if (pending > 0) {
          acc[item.product_id] = (acc[item.product_id] || 0) + pending;
        }
        return acc;
      }, {});

      if (data) {
        const productsWithPending = data.map(p => ({
          ...p,
          pending_po: pendingMap[p.id] || 0
        }));
        setProducts(productsWithPending);
      }
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
        gramasi: product.gramasi || '',
        unit: product.dimensions?.unit || '',
        new_unit_name: '',
        base_price: product.base_price?.toString() || '',
        stock_quantity: product.stock_quantity?.toString() || ''
      }]);
    } else {
      setItemsToInsert([{ id: '', name: '', gramasi: '', unit: '', new_unit_name: '', base_price: '', stock_quantity: '' }]);
    }
    setIsModalOpen(true);
  };

  const handleAddRow = () => {
    setItemsToInsert([...itemsToInsert, { id: '', name: '', gramasi: '', unit: '', new_unit_name: '', base_price: '', stock_quantity: '' }]);
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
      // 1. Process new units first
      const uniqueNewUnits = new Map<string, string>();
      for (const item of itemsToInsert) {
        if (item.unit === 'NEW' && item.new_unit_name?.trim()) {
          const newName = item.new_unit_name.trim();
          const lowerName = newName.toLowerCase();
          
          const exists = units.find(u => u.name.toLowerCase() === lowerName);
          if (exists) {
            item.unit = exists.name; // Use existing if already there
          } else {
            uniqueNewUnits.set(lowerName, newName);
          }
        }
      }
      
      const newUnitMap: Record<string, string> = {};
      for (const [lowerName, originalName] of uniqueNewUnits) {
        const { data: newUnit, error: unitError } = await supabase.from('units').insert([{ name: originalName }]).select().single();
        if (unitError) throw unitError;
        newUnitMap[lowerName] = newUnit.name;
      }

      // 2. Build payloads
      const payloads = itemsToInsert.map(item => {
        let finalUnit = item.unit;
        if (item.unit === 'NEW') {
          if (!item.new_unit_name?.trim()) throw new Error('Nama satuan baru tidak boleh kosong!');
          finalUnit = newUnitMap[item.new_unit_name.trim().toLowerCase()];
        }
        if (!finalUnit) throw new Error('Satuan wajib dipilih untuk semua baris!');
        if (!item.name) throw new Error('Nama barang wajib diisi untuk semua baris!');

        return {
          id: item.id || undefined,
          name: item.name,
          gramasi: item.gramasi,
          type: 'RAW',
          dimensions: { unit: finalUnit },
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
      if (uniqueNewUnits.size > 0) fetchUnits();
    } catch (error: any) { alert(error.message); }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus?')) {
      await supabase.from('products').update({ is_active: false }).eq('id', id);
      fetchData(currentPage);
    }
  };

  const handleOpenTerimaModal = async (product: any) => {
    setSelectedProduct(product);
    setIsTerimaModalOpen(true);
    setReceivingQty({});
    setRefNumber("");
    
    // Fetch active POs for this product
    const { data, error } = await supabase
      .from('transaction_items')
      .select('*, transactions!inner(id, created_at, reference_number, contact:contacts(name))')
      .eq('product_id', product.id)
      .eq('transactions.type', 'PO_INBOUND')
      .eq('transactions.is_void', false);
    
    if (data) {
      // Filter only those with pending quantities
      const pending = data.filter(item => (Number(item.quantity) - Number(item.qty_received || 0)) > 0);
      setActivePOs(pending);
    }
  };

  const handleSaveTerimaPO = async () => {
    const validItems = Object.entries(receivingQty).filter(([_, qty]) => Number(qty) > 0);
    if (validItems.length === 0) return alert("Isi jumlah barang yang diterima!");
    
    setIsSubmittingPO(true);
    try {
      let totalAddedStock = 0;
      
      for (const [itemId, qtyStr] of validItems) {
        const qty = Number(qtyStr);
        const item = activePOs.find(i => i.id === itemId);
        if (!item) continue;
        
        const sisa = Number(item.quantity) - Number(item.qty_received || 0);
        if (qty > sisa) {
          throw new Error(`Jumlah terima untuk PO #${item.transactions.id.slice(0,8)} melebihi sisa pesanan!`);
        }
        
        // 1. Update transaction_items
        const { error: itemErr } = await supabase
          .from('transaction_items')
          .update({ qty_received: Number(item.qty_received || 0) + qty })
          .eq('id', itemId);
        if (itemErr) throw itemErr;
        
        // 2. Update transaction reference number (No Surat Jalan) if provided
        if (refNumber) {
          await supabase.from('transactions').update({ reference_number: refNumber }).eq('id', item.transaction_id);
        }
        
        totalAddedStock += qty;
      }
      
      // 3. Update main product stock
      const { error: stockErr } = await supabase
        .from('products')
        .update({ stock_quantity: Number(selectedProduct.stock_quantity || 0) + totalAddedStock })
        .eq('id', selectedProduct.id);
      if (stockErr) throw stockErr;
      
      alert("Penerimaan barang berhasil dicatat dan stok telah diperbarui!");
      setIsTerimaModalOpen(false);
      fetchData(currentPage);
    } catch (error: any) {
      alert("Gagal: " + error.message);
    } finally {
      setIsSubmittingPO(false);
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
                <th className="px-6 py-4 text-black font-bold text-center">Gramasi</th>
                <th className="px-6 py-4 text-black font-bold text-center">Satuan</th>
                <th className="px-6 py-4 text-black font-bold text-right">Sisa Stok</th>
                <th className="px-6 py-4 text-black font-bold text-center">Sisa Pesanan (PO)</th>
                <th className="px-6 py-4 text-black font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? <tr><td colSpan={5} className="text-center py-8 text-black font-bold">Memuat data...</td></tr> :
                products.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-black font-bold">Barang tidak ditemukan.</td></tr> :
                  products.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-black font-bold">{p.name}</td>
                      <td className="px-6 py-4 text-black font-semibold text-center">{p.gramasi || '-'}</td>
                      <td className="px-6 py-4 text-black font-semibold text-center">{p.dimensions?.unit || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center justify-center px-3 py-1 text-xs font-black uppercase tracking-tighter border-2 rounded-lg shadow-sm ${p.stock_quantity === 0 ? 'bg-red-100 text-red-700 border-red-300' :
                            p.stock_quantity <= 10 ? 'bg-orange-100 text-orange-700 border-orange-300' :
                              'bg-green-100 text-green-700 border-green-300'
                          }`}>
                          {p.stock_quantity === 0 ? '0 (HABIS)' : p.stock_quantity <= 10 ? `${p.stock_quantity} (MENIPIS)` : `${p.stock_quantity} (AMAN)`}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {p.pending_po > 0 ? (
                          <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-black bg-blue-100 text-blue-700 border-2 border-blue-300 rounded-lg shadow-sm animate-pulse">
                            {p.pending_po} {p.dimensions?.unit || ''}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-bold">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 flex justify-center gap-3">
                        {p.pending_po > 0 && (
                          <button onClick={() => handleOpenTerimaModal(p)} title="Terima Barang" className="p-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md border border-blue-800 transition-all"><Truck className="w-5 h-5" /></button>
                        )}
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
                    <span className="shrink-0 bg-purple-100 text-purple-800 border border-purple-300 text-xs font-bold px-2.5 py-1 rounded-full">{p.gramasi || '-'}</span>
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
                    <div className="flex justify-between items-center"><span className="text-gray-500 font-semibold">Pesanan PO</span>
                      <span className={`font-black ${p.pending_po > 0 ? 'text-blue-600' : 'text-gray-400'}`}>{p.pending_po || '-'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 border-t border-gray-100 pt-3">
                    {p.pending_po > 0 && (
                      <button onClick={() => handleOpenTerimaModal(p)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg border border-blue-800 transition-all"><Truck className="w-4 h-4" /> Terima</button>
                    )}
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
                        <th className="py-3 px-4 font-bold text-gray-700 w-[30%] text-sm uppercase tracking-wider">Nama Barang</th>
                        <th className="py-3 px-4 font-bold text-gray-700 w-[15%] text-sm uppercase tracking-wider text-center">Gramasi</th>
                        <th className="py-3 px-4 font-bold text-gray-700 w-[20%] text-sm uppercase tracking-wider">Satuan</th>
                        <th className="py-3 px-4 font-bold text-gray-700 w-[15%] text-sm uppercase tracking-wider">Harga (Rp)</th>
                        <th className="py-3 px-4 font-bold text-gray-700 w-[10%] text-sm uppercase tracking-wider">Stok Awal</th>
                        <th className="py-3 px-4 font-bold text-gray-700 text-center w-[10%] text-sm uppercase tracking-wider">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {itemsToInsert.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50/50">
                          <td className="py-3 px-4 align-top">
                            <input required type="text" value={item.name} onChange={e => handleItemChange(index, 'name', e.target.value)} className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:ring-0 transition-all text-sm outline-none" placeholder="Nama..." />
                          </td>
                          <td className="py-3 px-4 align-top text-center">
                            <input type="text" value={item.gramasi} onChange={e => handleItemChange(index, 'gramasi', e.target.value)} className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:ring-0 transition-all text-sm text-center outline-none" placeholder="-" />
                          </td>
                          <td className="py-3 px-4 align-top">
                            <select required value={item.unit} onChange={e => handleItemChange(index, 'unit', e.target.value)} className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg text-black font-semibold focus:border-purple-600 focus:ring-0 transition-all text-sm outline-none bg-white">
                              <option value="">Pilih...</option>
                              {units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                              <option value="NEW">+ Satuan Baru</option>
                            </select>
                            {item.unit === 'NEW' && (
                              <input required type="text" value={item.new_unit_name || ''} onChange={e => handleItemChange(index, 'new_unit_name', e.target.value)} className="mt-2 w-full px-3 py-2 border-2 border-purple-400 rounded-lg text-black font-semibold bg-purple-50 focus:border-purple-600 focus:outline-none transition-all text-sm placeholder-purple-300" placeholder="Ketik satuan..." />
                            )}
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

      {/* MODAL TERIMA PO */}
      {isTerimaModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-300 w-full max-w-4xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 bg-blue-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Truck className="w-6 h-6" />
                <div>
                  <h2 className="font-black text-xl leading-tight">Terima Barang (PO)</h2>
                  <p className="text-xs font-bold opacity-80 uppercase tracking-widest">{selectedProduct.name}</p>
                </div>
              </div>
              <button onClick={() => setIsTerimaModalOpen(false)} className="hover:bg-white/20 p-2 rounded-lg transition-colors"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              {activePOs.length === 0 ? (
                <div className="py-12 text-center text-gray-400 font-bold">
                  <Receipt className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>Tidak ada pesanan aktif untuk barang ini.</p>
                </div>
              ) : (
                <>
                  <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b-2 border-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-500">No. PO / Supplier</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-500 text-center">QTY Pesan</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-500 text-center">Sisa</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-500 text-right">Terima Baru</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {activePOs.map(item => {
                          const sisa = Number(item.quantity) - Number(item.qty_received || 0);
                          return (
                            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-4">
                                <p className="font-black text-black">#{item.transactions.id.slice(0,8)}</p>
                                <p className="text-xs font-bold text-gray-400">{item.transactions.contact?.name}</p>
                              </td>
                              <td className="px-4 py-4 text-center font-bold text-gray-600">{item.quantity}</td>
                              <td className="px-4 py-4 text-center">
                                <span className="bg-red-50 text-red-600 px-2 py-1 rounded font-black text-sm">{parseFloat(sisa.toFixed(4))}</span>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <input 
                                  type="number" step="any" min="0" max={sisa}
                                  placeholder="0"
                                  value={receivingQty[item.id] || ''}
                                  onChange={e => setReceivingQty({...receivingQty, [item.id]: e.target.value})}
                                  className="w-24 px-3 py-2 border-2 border-gray-200 rounded-lg text-right font-black focus:border-blue-500 outline-none transition-all"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <CheckCircle2 className="text-blue-600 w-5 h-5" />
                      <h3 className="font-black text-blue-900 uppercase text-xs tracking-widest">Konfirmasi Penerimaan</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-blue-800 uppercase mb-1.5">No. Surat Jalan / Invoice Supplier</label>
                        <input 
                          type="text" 
                          placeholder="SJ-XXXX"
                          value={refNumber}
                          onChange={e => setRefNumber(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl font-black text-black uppercase focus:border-blue-600 outline-none transition-all"
                        />
                      </div>
                      <button 
                        onClick={handleSaveTerimaPO}
                        disabled={isSubmittingPO}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-lg shadow-blue-200 transition-all disabled:bg-gray-300 disabled:shadow-none"
                      >
                        {isSubmittingPO ? 'Memproses...' : 'Simpan Penerimaan'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
