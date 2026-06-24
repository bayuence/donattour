'use client';

import { Wallet, TrendingUp, ArrowUpRight } from 'lucide-react';
import type { DashboardData } from '../types';
import { rp } from '../utils/helpers';

interface PaymentMethodsCardProps {
  dashboardData: DashboardData;
  omzet: number;
}

export function PaymentMethodsCard({ dashboardData, omzet }: PaymentMethodsCardProps) {
  // Calculate cash total
  const cashTotal = dashboardData.payment_methods
    .filter(pm => !pm.method.includes('TOTAL') && 
      (pm.method.toLowerCase().includes('tunai') || pm.method.toLowerCase().includes('cash')))
    .reduce((sum, pm) => sum + pm.total, 0);

  // Get non-total payment methods
  const paymentMethods = dashboardData.payment_methods.filter(pm => !pm.method.includes('TOTAL'));
  
  // Get total
  const totalPm = dashboardData.payment_methods.find(pm => pm.method.includes('TOTAL'));

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Uang Masuk</h3>
              <p className="text-xs text-slate-500 mt-0.5">Rekap pembayaran hari ini</p>
            </div>
          </div>
          {totalPm && (
            <div className="text-right">
              <p className="text-xs text-slate-500 font-medium">Total</p>
              <p className="text-2xl font-bold text-slate-900">{rp(totalPm.total)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        {paymentMethods.length > 0 ? (
          <div className="space-y-4">
            {/* Payment Methods List */}
            <div className="space-y-3">
              {paymentMethods.map((pm, idx) => {
                const percentage = totalPm && totalPm.total > 0 ? (pm.total / totalPm.total) * 100 : 0;
                
                // Icon & Color mapping
                let icon = '💳';
                let colorClass = 'bg-slate-100 text-slate-700';
                let barColor = 'bg-slate-400';
                
                if (pm.method.toLowerCase().includes('tunai') || pm.method.toLowerCase().includes('cash')) {
                  icon = '💵';
                  colorClass = 'bg-emerald-100 text-emerald-700';
                  barColor = 'bg-emerald-500';
                } else if (pm.method.toLowerCase().includes('qris')) {
                  icon = '📱';
                  colorClass = 'bg-blue-100 text-blue-700';
                  barColor = 'bg-blue-500';
                } else if (pm.method.toLowerCase().includes('transfer') || pm.method.toLowerCase().includes('bank')) {
                  icon = '🏦';
                  colorClass = 'bg-purple-100 text-purple-700';
                  barColor = 'bg-purple-500';
                } else if (pm.method.toLowerCase().includes('gopay')) {
                  icon = '🛵';
                  colorClass = 'bg-green-100 text-green-700';
                  barColor = 'bg-green-500';
                } else if (pm.method.toLowerCase().includes('ovo')) {
                  icon = '🟣';
                  colorClass = 'bg-violet-100 text-violet-700';
                  barColor = 'bg-violet-500';
                } else if (pm.method.toLowerCase().includes('shopee')) {
                  icon = '🛍️';
                  colorClass = 'bg-orange-100 text-orange-700';
                  barColor = 'bg-orange-500';
                } else if (pm.method.toLowerCase().includes('dana')) {
                  icon = '💠';
                  colorClass = 'bg-cyan-100 text-cyan-700';
                  barColor = 'bg-cyan-500';
                }

                return (
                  <div key={idx} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{icon}</span>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{pm.method}</p>
                          <p className="text-xs text-slate-500">{pm.count} transaksi</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-slate-900">{rp(pm.total)}</p>
                        <p className="text-xs text-slate-500">{percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cash in Drawer - Highlighted */}
            <div className="mt-6 pt-5 border-t border-slate-200">
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-emerald-900">Uang Fisik di Laci</p>
                      <p className="text-[10px] text-emerald-700 mt-0.5">Harus sesuai dengan saldo tunai</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-emerald-700">{rp(cashTotal)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 mx-auto mb-4 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-900">Belum Ada Transaksi</p>
            <p className="text-xs text-slate-500 mt-1">Transaksi pembayaran akan muncul di sini</p>
          </div>
        )}
      </div>
    </div>
  );
}
