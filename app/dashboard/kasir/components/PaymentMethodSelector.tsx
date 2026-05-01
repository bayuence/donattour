'use client';

import * as Icons from 'lucide-react';

interface Props {
  finalTotal: number;
  formatRp: (n: number) => string;
  onSelectCash: () => void;
  onSelectDigital: () => void;
  onCancel: () => void;
}

const PAYMENT_METHODS = [
  { 
    id: 'cash' as const, 
    label: 'Tunai', 
    icon: Icons.Wallet, 
    color: 'text-slate-700', 
    bg: 'bg-slate-50', 
    border: 'border-slate-300',
    desc: 'Bayar dengan uang tunai' 
  },
  { 
    id: 'digital' as const, 
    label: 'Pembayaran Digital', 
    icon: Icons.CreditCard, 
    color: 'text-blue-700', 
    bg: 'bg-blue-50', 
    border: 'border-blue-300',
    desc: 'QRIS, GoPay, ShopeePay, Transfer Bank, Kartu Kredit' 
  },
];

export default function PaymentMethodSelector({
  finalTotal,
  formatRp,
  onSelectCash,
  onSelectDigital,
  onCancel,
}: Props) {
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 border-b border-slate-800">
          <p className="text-slate-400 text-xs font-medium mb-1">Total Pembayaran</p>
          <h2 className="text-3xl font-bold text-white">{formatRp(finalTotal)}</h2>
        </div>

        <div className="p-6">
          {/* Pilih Metode Bayar */}
          <div className="mb-6">
            <p className="text-sm font-semibold text-slate-700 mb-4">Pilih Metode Pembayaran</p>
            
            <div className="grid grid-cols-2 gap-4">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => m.id === 'cash' ? onSelectCash() : onSelectDigital()}
                  className={`group relative flex flex-col items-center gap-4 p-6 rounded-xl border-2 transition-all hover:scale-[1.02] hover:shadow-lg ${m.bg} ${m.border} hover:border-current`}
                >
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 ${m.bg} group-hover:scale-110 transition-transform`}>
                    <m.icon size={32} className={m.color} />
                  </div>
                  <div className="text-center flex-1">
                    <p className={`font-bold text-lg mb-1 ${m.color}`}>{m.label}</p>
                    <p className="text-xs text-slate-600">{m.desc}</p>
                  </div>
                  <Icons.ChevronRight size={20} className="text-slate-400 absolute top-4 right-4 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex gap-2">
              <Icons.Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                <strong>Tunai:</strong> Input nominal bayar manual. <strong>Digital:</strong> Pembayaran via Midtrans (QRIS, E-wallet, Transfer, Kartu Kredit).
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="w-full py-3 bg-slate-100 text-slate-700 font-semibold text-sm rounded-lg hover:bg-slate-200 transition-all"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
