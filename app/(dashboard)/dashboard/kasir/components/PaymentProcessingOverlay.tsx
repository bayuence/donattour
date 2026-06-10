'use client';

interface Props {
  finalTotal: number;
  formatRp: (n: number) => string;
}

export default function PaymentProcessingOverlay({ finalTotal, formatRp }: Props) {
  return (
    /* Backdrop penuh: pointer-events-auto memblokir SEMUA klik ke belakang */
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] pointer-events-auto">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-xs w-full text-center space-y-5">
        
        {/* Spinner */}
        <div className="flex justify-center">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>

        {/* Text */}
        <div>
          <p className="text-sm text-slate-500 mb-1 font-medium">Memproses Pembayaran</p>
          <p className="text-2xl font-black text-slate-900">{formatRp(finalTotal)}</p>
          <p className="text-xs text-slate-400 mt-2">Mohon tunggu sebentar...</p>
        </div>
      </div>
    </div>
  );
}
