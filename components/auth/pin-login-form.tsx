'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, User, Lock, AlertCircle } from 'lucide-react';

export function PinLoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setError('Username harus diisi');
      return;
    }

    if (!password) {
      setError('Password harus diisi');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const success = await login(username.toLowerCase(), password);

      if (success) {
        router.push('/dashboard/kasir');
      } else {
        setError('Username atau password salah. Silakan coba lagi.');
        setPassword('');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Terjadi kesalahan. Silakan coba lagi.');
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-100/50 text-red-500 px-4 py-3 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle size={18} className="shrink-0" />
          <span className="text-xs font-bold leading-tight">{error}</span>
        </div>
      )}

      {/* Username Input */}
      <div className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
            Username
          </label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-amber-500 transition-colors">
              <User size={18} strokeWidth={2.5} />
            </div>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="admin.donattour"
              disabled={isLoading}
              className="w-full pl-12 h-14 bg-slate-50 border-transparent focus:border-amber-400 focus:bg-white rounded-2xl transition-all font-bold placeholder:text-slate-300"
              autoComplete="username"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
            Password
          </label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-amber-500 transition-colors">
              <Lock size={18} strokeWidth={2.5} />
            </div>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="••••••••"
              disabled={isLoading}
              className="w-full pl-12 pr-12 h-14 bg-slate-50 border-transparent focus:border-amber-400 focus:bg-white rounded-2xl transition-all font-bold placeholder:text-slate-300"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 focus:outline-none transition-colors"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
            </button>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading || !username.trim() || !password}
        className="w-full h-14 bg-slate-900 hover:bg-amber-600 disabled:opacity-20 text-white font-black uppercase tracking-[0.2em] rounded-2xl text-[11px] shadow-lg shadow-slate-900/10 transition-all active:scale-[0.98]"
      >
        {isLoading ? 'Memverifikasi...' : 'Masuk Ke Dashboard'}
      </Button>
    </form>
  );
}
