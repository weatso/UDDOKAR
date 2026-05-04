"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Lock, Mail, Loader2, Box, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError('Email atau password salah!');
      setIsLoading(false);
    } else {
      // Set penanda sesi aktif di sessionStorage (hanya bertahan selama tab/window terbuka)
      sessionStorage.setItem('active_session', 'true');
      
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border-2 border-gray-300 overflow-hidden">
        <div className="bg-purple-700 p-8 text-center border-b-4 border-purple-900">
          <div className="w-16 h-16 bg-white rounded-xl mx-auto flex items-center justify-center shadow-lg border-2 border-purple-900 mb-4">
            <Box className="w-10 h-10 text-purple-700" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-widest uppercase">UD DOKAR</h1>
          <p className="text-purple-200 font-bold mt-2">Login Sistem ERP Pabrik</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-8">
          {error && (
            <div className="bg-red-100 border-2 border-red-500 text-red-700 p-4 rounded-xl font-bold mb-6 text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-2">Alamat Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl text-black font-bold focus:ring-purple-600 focus:border-purple-600 outline-none"
                  placeholder="Masukkan email Anda"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-12 py-4 border-2 border-gray-300 rounded-xl text-black font-bold focus:ring-purple-600 focus:border-purple-600 outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-8 bg-black hover:bg-gray-800 text-white font-black uppercase tracking-widest py-4 px-4 rounded-xl border-2 border-black flex items-center justify-center gap-2 disabled:opacity-70 transition-all shadow-lg"
          >
            {isLoading ? (
              <><Loader2 className="w-6 h-6 animate-spin" /> Memeriksa...</>
            ) : (
              'MASUK KE SISTEM'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
