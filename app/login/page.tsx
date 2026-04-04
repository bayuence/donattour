import { PinLoginForm } from '@/components/auth/pin-login-form';
import Image from 'next/image';

export const metadata = {
  title: 'Login - donattour System',
  description: 'Login ke sistem manajemen donattour',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Logo area */}
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 py-6 flex flex-col items-center justify-center">
            <div className="w-48 h-48 sm:w-56 sm:h-56 relative">
              <Image
                src="/logo.png"
                alt="Donattour Logo"
                fill
                className="object-contain drop-shadow-lg"
                priority
              />
            </div>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <div className="flex items-center gap-3 mb-6">
               <div className="w-1 h-8 bg-amber-500 rounded-full" />
               <div>
                  <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Selamat Datang</h1>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1.5 whitespace-nowrap">Manajemen Sistem Donattour</p>
               </div>
            </div>
            <PinLoginForm />
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-2">
           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
             Management System v2.0
           </p>
           <div className="h-px w-8 bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
