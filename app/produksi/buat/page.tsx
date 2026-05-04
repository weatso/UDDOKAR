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
    target_quantity: '',
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
      const { data, error } = await supabase
        .from('production_orders')
        .insert([{
          spk_number: formData.spk_number,
          target_product_id: formData.target_product_id,
          target_quantity: formData.target_quantity,
          status: 'PENDING'
        }])
        .select();

      if (error) throw error;

      alert('SPK berhasil dibuat!');
      if (data && data[0]) {
        router.push(`/produksi/${data[0].id}`);
      } else {
        router.push('/produksi');
      }
      router.refresh();
      
    } catch (error: any) {
      console.error('Submit SPK Error:', error);
      alert('Terjadi kesalahan: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto overflow-hidden">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/produksi" className="p-2 bg-gray-200 hover:bg-gray-300 rounded-full text-black border-2 border-gray-400 transition-colors shadow-sm">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-black">Buat Surat Perintah Kerja (SPK)</h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base font-semibold">Terbitkan instruksi produksi kardus baru.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border-2 border-gray-300 shadow-lg overflow-hidden">
        <div className="p-6 md:p-10 space-y-8">
          
          <div>
            <label className="block text-base font-bold text-black mb-2">Nomor SPK Otomatis</label>
            <input 
              disabled
              type="text" 
              value={formData.spk_number}
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 font-black text-lg"
            />
          </div>

          <div>
            <label className="block text-base font-bold text-black mb-2">Target Kardus (Barang Jadi)</label>
            <div className="relative">
              <select 
                required
                value={formData.target_product_id}
                onChange={e => setFormData({...formData, target_product_id: e.target.value})}
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-base font-bold text-black focus:border-purple-600 focus:outline-none bg-white appearance-none transition-all"
              >
                <option value="">-- Pilih Kardus --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-700">
                <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500 font-semibold italic">* Jika kardus tidak ada, pastikan sudah terdaftar di Master Data Barang Jadi.</p>
          </div>

          <div>
            <label className="block text-base font-bold text-black mb-2">Target Jumlah Produksi (Pcs)</label>
            <input 
              required
              type="number" 
              min="1"
              value={formData.target_quantity}
              onChange={e => setFormData({...formData, target_quantity: e.target.value as any})}
              className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-xl font-black text-black focus:border-purple-600 focus:outline-none transition-all"
              placeholder="0"
            />
          </div>

        </div>

        <div className="p-6 border-t-2 border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto px-8 py-3 border-2 border-gray-300 text-black font-bold rounded-xl hover:bg-gray-100 transition-all bg-white text-base"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-10 py-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 border-2 border-purple-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-lg shadow-md"
          >
            <Save className="w-6 h-6" />
            {isSubmitting ? 'Memproses...' : 'Terbitkan SPK'}
          </button>
        </div>
      </form>
    </div>
  );
}
