"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save } from 'lucide-react';

interface FinishedProduct {
  id: string;
  name: string;
}

export default function BuatSPKPage() {
  const router = useRouter();
  const [products, setProducts] = useState<FinishedProduct[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    spk_number: `SPK-${Date.now().toString().slice(-6)}`,
    target_product_id: '',
    target_quantity: 0,
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name')
      .eq('type', 'FINISHED')
      .eq('is_active', true)
      .order('name');

    if (data) setProducts(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.target_product_id || formData.target_quantity <= 0) {
      return alert('Mohon lengkapi produk dan jumlah target produksi!');
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('production_orders')
        .insert([{
          spk_number: formData.spk_number,
          target_product_id: formData.target_product_id,
          target_quantity: formData.target_quantity,
          status: 'PENDING'
        }]);

      if (error) throw error;

      alert('SPK berhasil dibuat!');
      router.push('/produksi');
      router.refresh();
      
    } catch (error: any) {
      console.error('Submit SPK Error:', error);
      alert('Terjadi kesalahan: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-full overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-4">
          <Link href="/produksi" className="p-2 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-full transition-colors shadow-sm">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Buat Surat Perintah Kerja (SPK)</h1>
            <p className="text-gray-500 mt-1 text-sm md:text-base">Terbitkan instruksi untuk mulai memproduksi kardus baru.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 md:p-8 space-y-6">
          
          <div>
            <label className="block text-base font-bold text-gray-800 mb-2">Nomor SPK Otomatis</label>
            <input 
              disabled
              type="text" 
              value={formData.spk_number}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-100 text-gray-600 font-bold text-base"
            />
          </div>

          <div>
            <label className="block text-base font-bold text-gray-800 mb-2">Target Kardus (Barang Jadi)</label>
            <select 
              required
              value={formData.target_product_id}
              onChange={e => setFormData({...formData, target_product_id: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
            >
              <option value="">-- Pilih Kardus yang akan diproduksi --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-base font-bold text-gray-800 mb-2">Target Jumlah Produksi (Pcs)</label>
            <input 
              required
              type="number" 
              min="1"
              value={formData.target_quantity || ''}
              onChange={e => setFormData({...formData, target_quantity: Number(e.target.value)})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base text-gray-900 font-bold focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Contoh: 500"
            />
          </div>

        </div>

        <div className="p-4 md:p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors bg-white text-base"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-70 text-base shadow-sm"
          >
            <Save className="w-5 h-5" />
            {isSubmitting ? 'Menyimpan...' : 'Terbitkan SPK'}
          </button>
        </div>
      </form>
    </div>
  );
}
