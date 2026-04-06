'use client';

import { useState } from 'react';
import * as Icons from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import type { PaymentMethodKasir } from '@/lib/types';

interface Props {
  finalTotal: number;
  formatRp: (n: number) => string;
  bayarNominal: string;
  setBayarNominal: (v: string) => void;
  paymentMethod: PaymentMethodKasir;
  setPaymentMethod: (v: PaymentMethodKasir) => void;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const PAYMENT_METHODS: { id: PaymentMethodKasir; label: string; icon: any; color: string; bg: string }[] = [
  { id: 'cash', label: 'Tunai', icon: Icons.Banknote, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  { id: 'qris', label: 'QRIS', icon: Icons.QrCode, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  { id: 'transfer', label: 'Transfer', icon: Icons.ArrowLeftRight, color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
  { id: 'gopay', label: 'GoPay', icon: Icons.Smartphone, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  { id: 'ovo', label: 'OVO', icon: Icons.Smartphone, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  { id: 'dana', label: 'Dana', icon: Icons.Smartphone, color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200' },
  { id: 'shopeepay', label: 'ShopeePay', icon: Icons.Smartphone, color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  { id: 'card', label: 'Kartu', icon: Icons.CreditCard, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
];

export default function PaymentModal({
  finalTotal, formatRp, bayarNominal, setBayarNominal,
  paymentMethod, setPaymentMethod, isLoading, onConfirm, onCancel
}: Props) {
  const bayarInt = parseInt(bayarNominal) || 0;
  const kembalian = bayarInt - finalTotal;
  const isCash = paymentMethod === 'cash';
  const isValid = isCash ? bayarInt >= finalTotal : true;

  const quickAmounts = [finalTotal, 50000, 100000, 200000].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-8 py-6 text-center">
          <p className="text-slate-400 text-[10px] uppercase tracking-widest font-black mb-1">Total Pembayaran</p>
          <h2 className="text-4xl font-black text-white">{formatRp(finalTotal)}</h2>
        </div>

        <div className="p-6 space-y-5">
          {/* Pilih Metode Bayar */}
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Metode Pembayaran</p>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_METHODS.map(m => {
                const isActive = paymentMethod === m.id;
                return (
                  <button key={m.id} onClick={() => { setPaymentMethod(m.id); if (m.id !== 'cash') setBayarNominal(''); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all ${isActive ? `${m.bg} border-2 shadow-sm` : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}>
                    <m.icon size={20} className={isActive ? m.color : 'text-slate-400'} />
                    <span className={`text-[9px] font-black uppercase tracking-wide ${isActive ? m.color : 'text-slate-500'}`}>{m.label}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* QRIS Info */}
          {paymentMethod === 'qris' && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center border border-blue-100 shrink-0">
                <Icons.QrCode size={36} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-black text-blue-800">Scan QR Code</p>
                <p className="text-xs text-blue-600 mt-0.5">Tampilkan QR code outlet kepada pelanggan, lalu konfirmasi setelah pembayaran masuk.</p>
              </div>
            </div>
          )}

          {/* Transfer Info */}
          {paymentMethod === 'transfer' && (
            <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4">
              <p className="text-sm font-black text-violet-800 mb-2">Info Transfer Bank</p>
              <p className="text-xs text-violet-600">Sampaikan nomor rekening outlet kepada pelanggan, konfirmasi setelah bukti transfer diterima.</p>
            </div>
          )}

          {/* E-Wallet Info */}
          {['gopay', 'ovo', 'dana', 'shopeepay'].includes(paymentMethod) && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
              <Icons.Smartphone size={24} className="text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700">Minta pelanggan transfer ke nomor {paymentMethod.toUpperCase()} outlet, konfirmasi setelah notifikasi masuk.</p>
            </div>
          )}

          {/* Input Tunai */}
          {isCash && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Nominal Bayar</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">Rp</span>
                  <CurrencyInput value={bayarNominal} onChange={e => setBayarNominal(e.target.value)} autoFocus
                    className="w-full p-4 pl-12 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xl font-black focus:border-amber-400 focus:outline-none transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map(v => (
                  <button key={v} onClick={() => setBayarNominal(v.toString())}
                    className="py-2.5 bg-slate-100 rounded-xl text-[10px] font-black hover:bg-amber-100 hover:text-amber-700 transition-all">
                    {formatRp(v)}
                  </button>
                ))}
              </div>
              {bayarInt >= finalTotal && (
                <div className="flex justify-between items-center bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
                  <span className="text-sm font-black text-emerald-700">Kembalian</span>
                  <span className="text-xl font-black text-emerald-600">{formatRp(kembalian)}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={onCancel}
              className="px-6 py-4 bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-slate-200 transition-all flex-shrink-0">
              Batal
            </button>
            <button disabled={isLoading || !isValid} onClick={onConfirm}
              className="flex-1 py-4 bg-gradient-to-br from-amber-500 to-orange-500 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <Icons.CheckCircle size={16} />
              {isLoading ? 'Memproses...' : 'Konfirmasi Bayar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
