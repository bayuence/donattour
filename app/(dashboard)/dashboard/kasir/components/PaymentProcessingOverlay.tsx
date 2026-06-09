'use client';

interface Props {
  finalTotal: number;
  formatRp: (n: number) => string;
}

export default function PaymentProcessingOverlay({ finalTotal, formatRp }: Props) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none">
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-xs w-full text-center space-y-4 pointer-events-auto">
        
        {/* Simple Spinner */}
        <div className="flex justify-center">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-3 border-slate-200 rounded-full"></div>
            <div className="absolute inset-0 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>

        {/* Text */}
        <div>
          <p className="text-sm text-slate-600 mb-1">Memproses Pembayaran</p>
          <p className="text-xl font-bold text-slate-900">{formatRp(finalTotal)}</p>
        </div>
      </div>
    </div>
  );
}
