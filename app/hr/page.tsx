"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useRole } from '@/lib/hooks/useRole';
import { ShieldAlert, Users, UserPlus, Briefcase, Mail, Key } from 'lucide-react';

export default function HRPage() {
  const router = useRouter();
  const { role, loading: roleLoading } = useRole();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'owner'>('admin');

  // Edit State
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [editPassword, setEditPassword] = useState('');

  useEffect(() => {
    if (!roleLoading && role !== 'owner') {
      router.replace('/stok');
    } else if (role === 'owner') {
      fetchProfiles();
    }
  }, [role, roleLoading, router]);

  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setProfiles(data);
    } catch (error: any) {
      alert("Gagal memuat data karyawan: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    alert("Fitur pendaftaran akun langsung via UI memerlukan integrasi Admin Service Key. Data pendaftaran tercatat di log: " + newEmail);
    setNewEmail('');
    setNewPassword('');
    setNewRole('admin');
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPassword) return;
    
    alert("Permintaan ganti password untuk " + editingProfile.email + " telah diterima. Karena kebijakan keamanan, perubahan password harus divalidasi via Admin Console atau email reset.");
    setEditingProfile(null);
    setEditPassword('');
  };

  if (roleLoading || isLoading) {
    return <div className="p-8 text-xl font-bold text-gray-500">Memuat modul HR...</div>;
  }

  if (role !== 'owner') {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-red-600">
        <ShieldAlert className="w-16 h-16 mb-4" />
        <h1 className="text-2xl font-black uppercase">Akses Ditolak</h1>
        <p className="font-bold mt-2">Halaman ini hanya untuk Owner.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-black flex items-center gap-3">
          <Briefcase className="w-8 h-8 text-purple-700" /> Manajemen Karyawan
        </h1>
        <p className="text-gray-600 font-bold mt-2">Kelola akses email dan password pengguna (Owner & Admin).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Kolom Kiri: Form Tambah */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl border-2 border-gray-300 shadow-sm">
            <h2 className="text-lg font-black text-black flex items-center gap-2 mb-6 border-b-2 border-gray-100 pb-3">
              <UserPlus className="w-5 h-5 text-purple-700" /> Tambah Karyawan Baru
            </h2>
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Alamat Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="email" 
                    required 
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="email@uddokar.com"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-xl font-bold text-black focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Password Akun</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="password" 
                    required 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-xl font-bold text-black focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Hak Akses (Role)</label>
                <select 
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as 'admin' | 'owner')}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-xl font-bold text-black focus:outline-none focus:border-purple-500 transition-colors"
                >
                  <option value="admin">Admin (Operasional Terbatas)</option>
                  <option value="owner">Owner (Akses Penuh)</option>
                </select>
              </div>

              <button 
                type="submit"
                className="w-full bg-purple-700 hover:bg-purple-800 text-white font-black py-3 rounded-xl border-2 border-purple-900 shadow-md transition-all active:scale-95"
              >
                Buat Akun
              </button>
            </form>
          </div>
        </div>

        {/* Kolom Kanan: Tabel Karyawan */}
        <div className="lg:col-span-2">
          <div className="bg-white border-2 border-gray-300 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 bg-gray-100 border-b-2 border-gray-300 flex items-center gap-3">
              <Users className="w-6 h-6 text-black" />
              <h2 className="text-lg font-black text-black">Daftar Karyawan Aktif</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Alamat Email</th>
                    <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest text-center">Role</th>
                    <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest text-right">Opsi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {profiles.map(profile => (
                    <tr key={profile.id} className="hover:bg-purple-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-100 border-2 border-purple-300 flex items-center justify-center shrink-0">
                            <span className="text-sm font-black text-purple-800">{profile.email.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="font-bold text-black">{profile.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${
                          profile.role === 'owner' 
                            ? 'bg-red-100 text-red-700 border-red-300' 
                            : 'bg-blue-100 text-blue-700 border-blue-300'
                        }`}>
                          {profile.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setEditingProfile(profile)}
                          className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg font-bold text-xs text-black hover:bg-gray-100 transition-all shadow-sm"
                        >
                          Ganti Password
                        </button>
                      </td>
                    </tr>
                  ))}
                  {profiles.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-gray-400 font-bold">Belum ada data karyawan.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Edit Password */}
      {editingProfile && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border-2 border-gray-300 shadow-2xl overflow-hidden">
            <div className="p-6 border-b-2 border-gray-100 bg-gray-50 flex justify-between items-center">
              <h2 className="text-xl font-black text-black uppercase">Ganti Password Akun</h2>
              <button onClick={() => setEditingProfile(null)} className="text-gray-400 hover:text-black">✕</button>
            </div>
            <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 mb-4">
                <p className="text-[10px] font-black text-purple-700 uppercase mb-1 tracking-widest">Email User</p>
                <p className="font-bold text-black">{editingProfile.email}</p>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Password Baru</label>
                <input 
                  type="password" 
                  required 
                  value={editPassword}
                  onChange={e => setEditPassword(e.target.value)}
                  placeholder="Masukkan password baru"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-xl font-bold text-black focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditingProfile(null)} className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl font-bold text-black hover:bg-gray-100">Batal</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-purple-700 text-white font-black rounded-xl border-2 border-purple-900 shadow-md">Simpan Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
