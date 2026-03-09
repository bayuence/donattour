import { PinLoginForm } from '@/components/auth/pin-login-form';

export const metadata = {
  title: 'Login - donattour System',
  description: 'Login ke sistem manajemen donattour',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
              <span className="text-3xl">🍩</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">donattour</h1>
            <p className="text-gray-500 mt-2">Masuk ke sistem manajemen</p>
          </div>

          <PinLoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          donattour Management System v1.0
        </p>
      </div>
    </div>
  );
}
