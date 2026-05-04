"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Lock, Save, ShieldCheck, User, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

export default function PengaturanPage() {
  const [user, setUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUser(user);
    });
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      return setMessage({ text: 'Konfirmasi password tidak cocok!', type: 'error' });
    }

    if (newPassword.length < 6) {
      return setMessage({ text: 'Password minimal 6 karakter!', type: 'error' });
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setMessage({ text: 'Password berhasil diperbarui!', type: 'success' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({ text: 'Gagal memperbarui password: ' + error.message, type: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-black uppercase tracking-tight">Pengaturan Akun</h1>
        <p className="text-gray-600 mt-2 font-bold italic">Kelola profil dan keamanan akun sistem ERP Anda.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Profile Info Side */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border-2 border-gray-300 shadow-lg p-6 text-center">
            <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto border-4 border-purple-200 mb-4 shadow-inner">
              <User className="w-12 h-12 text-purple-700" />
            </div>
            <h3 className="text-xl font-black text-black break-words">{user?.email || 'Memuat...'}</h3>
            <p className="text-purple-600 font-bold uppercase text-xs tracking-widest mt-1">Administrator / Owner</p>

            <div className="mt-6 pt-6 border-t-2 border-gray-100 flex items-center justify-center gap-2 text-green-600">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-sm font-bold">Akun Terverifikasi</span>
            </div>
          </div>

          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-5 flex gap-4">
            <AlertCircle className="w-6 h-6 text-orange-600 shrink-0" />
            <p className="text-xs font-bold text-orange-800 leading-relaxed">
              Jaga kerahasiaan password Anda. Jangan berikan password kepada siapapun untuk menghindari penyalahgunaan data perusahaan.
            </p>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleUpdatePassword} className="bg-white rounded-2xl border-2 border-gray-300 shadow-xl overflow-hidden">
            <div className="bg-gray-50 p-6 border-b-2 border-gray-200">
              <div className="flex items-center gap-3">
                <Lock className="w-6 h-6 text-purple-700" />
                <h2 className="text-xl font-black text-black uppercase tracking-wide">Ganti Password</h2>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {message && (
                <div className={`p-4 rounded-xl border-2 font-bold flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700'
                  }`}>
                  {message.type === 'success' ? <ShieldCheck /> : <AlertCircle />}
                  {message.text}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-black text-gray-700 uppercase tracking-widest">Password Baru</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-black font-bold focus:ring-purple-600 focus:border-purple-600 outline-none transition-all pr-12"
                    placeholder="Minimal 6 karakter"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-black text-gray-700 uppercase tracking-widest">Konfirmasi Password Baru</label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-black font-bold focus:ring-purple-600 focus:border-purple-600 outline-none transition-all"
                  placeholder="Ulangi password baru"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="w-full bg-black hover:bg-gray-800 text-white font-black uppercase tracking-widest py-4 px-6 rounded-xl border-2 border-black flex items-center justify-center gap-3 disabled:opacity-50 transition-all shadow-lg active:scale-[0.98]"
                >
                  {isUpdating ? (
                    <><Loader2 className="w-6 h-6 animate-spin" /> Sedang Memproses...</>
                  ) : (
                    <><Save className="w-6 h-6" /> Perbarui Password</>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
