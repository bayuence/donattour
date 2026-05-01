'use client';

import * as Icons from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';

interface Props {
  finalTotal: number;
  formatRp: (n: number) => string;
  bayarNominal: string;
  setBayarNominal: (v: string) => void;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CashPaymentModal({
  finalTotal,
  formatRp,
  bayarNominal,
  setBayarNominal,
  isLoading,
  onConfirm,
  onCancel,
}: Props) {
  const bayarInt = parseInt(bayarNominal) || 0;
  const kembalian = bayarInt - finalTotal;
  const isValid = bayarInt >= finalTotal;

  const quickAmounts = [finalTotal, 50000, 100000, 200000].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-2">
            <Icons.Wallet size={24} className="text-slate-400" />
            <p className="text-slate-400 text-sm font-medium">Pembayaran Tunai</p>
          </div>
          <h2 className="text-3xl font-bold text-white">{formatRp(finalTotal)}</h2>
        </div>

        <div className="p-6 space-y-4">
          {/* Input Nominal */}
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-2">Nominal Bayar</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-slate-500 text-sm">Rp</span>
              <CurrencyInput
                value={bayarNominal}
                onChange={e => setBayarNominal(e.target.value)}
                autoFocus
                className="w-full p-4 pl-12 bg-slate-50 border-2 border-slate-200 rounded-lg text-xl font-bold focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
              />
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {quickAmounts.map(v => (
              <button
                key={v}
                onClick={() => setBayarNominal(v.toString())}
                className="py-2.5 bg-slate-100 rounded-lg text-xs font-semibold hover:bg-slate-900 hover:text-white transition-all"
              >
                {formatRp(v)}
              </button>
            ))}
          </div>

          {/* Kembalian */}
          {bayarInt >= finalTotal && (
            <div className="flex justify-between items-center bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <span className="text-sm font-semibold text-green-700">Kembalian</span>
              <span className="text-xl font-bold text-green-600">{formatRp(kembalian)}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancel}
              className="px-6 py-3.5 bg-slate-100 text-slate-700 font-semibold text-sm rounded-lg hover:bg-slate-200 transition-all flex-shrink-0"
            >
              Batal
            </button>
            <button
              disabled={isLoading || !isValid}
              onClick={onConfirm}
              className="flex-1 py-3.5 bg-slate-900 text-white font-semibold text-sm rounded-lg hover:bg-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Icons.Check size={16} />
              {isLoading ? 'Memproses...' : 'Konfirmasi Bayar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
