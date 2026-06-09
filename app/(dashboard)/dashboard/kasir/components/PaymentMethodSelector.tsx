'use client';

import { ChevronRight, CreditCard, Wallet, X } from 'lucide-react';
import type { PaymentMethodConfig } from '@/lib/types';

const Icons = { ChevronRight, CreditCard, Wallet, X };

interface Props {
  finalTotal: number;
  formatRp: (n: number) => string;
  paymentMethods: PaymentMethodConfig[];
  onSelectMethod: (method: PaymentMethodConfig) => void;
  onCancel: () => void;
}

export default function PaymentMethodSelector({
  finalTotal,
  formatRp,
  paymentMethods,
  onSelectMethod,
  onCancel,
}: Props) {
  // Filter out any dynamic "Tunai" methods so we don't have duplicates with our hardcoded default
  const dynamicMethods = paymentMethods.filter(m => 
    m.is_active && 
    !m.type?.toLowerCase().includes('tunai') && 
    !m.type?.toLowerCase().includes('cash') && 
    m.name.toLowerCase() !== 'tunai'
  );
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Elegant Header */}
        <div className="px-6 sm:px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start shrink-0">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Total Tagihan</p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">{formatRp(finalTotal)}</h2>
          </div>
          <button 
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-all"
            title="Tutup"
          >
            <Icons.X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 sm:px-8 sm:py-6 overflow-y-auto flex-1 bg-white">
          
          {/* Primary Method: Tunai */}
          <div className="mb-8">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Metode Utama</p>
            <button
              onClick={() => onSelectMethod({ id: 'cash', name: 'Tunai', type: 'cash', is_active: true } as any)}
              className="w-full flex items-center justify-between p-4 sm:p-5 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:ring-1 hover:ring-blue-500 transition-all group"
            >
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                  <Icons.Wallet size={24} className="sm:w-7 sm:h-7" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-900 text-base sm:text-lg tracking-tight mb-0.5">Tunai / Cash</p>
                  <p className="text-xs text-slate-500 font-medium">Kalkulator kembalian otomatis</p>
                </div>
              </div>
              <Icons.ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
            </button>
          </div>

          {/* Secondary Methods: Digital / Non-Tunai */}
          {dynamicMethods.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Metode Digital & Transfer</p>
              <div className="space-y-3">
                {dynamicMethods.map(m => (
                  <button
                    key={m.id}
                    onClick={() => onSelectMethod(m)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 bg-white border border-slate-200 rounded-xl hover:border-slate-400 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center gap-4 sm:gap-5">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center bg-slate-50 border border-slate-100 text-slate-500 overflow-hidden shadow-sm group-hover:bg-slate-100 transition-colors">
                        {m.logo_url ? (
                          <img src={m.logo_url} alt={m.name} className="w-full h-full object-contain p-2 sm:p-2.5" />
                        ) : (
                          <Icons.CreditCard size={24} className="sm:w-6 sm:h-6" />
                        )}
                      </div>
                      <div className="text-left flex flex-col justify-center">
                        <p className="font-bold text-slate-800 text-sm sm:text-base tracking-tight">{m.name}</p>
                        {(m.account_number || m.account_name) && (
                          <p className="text-xs text-slate-500 font-medium mt-1">
                            {m.account_number} {m.account_name && <span className="opacity-75">• a.n {m.account_name}</span>}
                          </p>
                        )}
                      </div>
                    </div>
                    <Icons.ChevronRight size={20} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
