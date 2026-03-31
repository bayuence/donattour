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
          <div className="px-6 py-5">
            <h1 className="text-xl font-bold text-gray-900 mb-0.5">Selamat Datang 👋</h1>
            <p className="text-gray-400 text-sm mb-4">Masuk ke sistem manajemen donattour</p>
            <PinLoginForm />
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-gray-400">
          donattour Management System v1.0
        </p>
      </div>
    </div>
  );
}
