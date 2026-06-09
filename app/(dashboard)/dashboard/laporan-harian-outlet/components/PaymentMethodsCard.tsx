'use client';

import { DollarSign } from 'lucide-react';
import type { DashboardData } from '../types';
import { rp } from '../utils/helpers';

interface PaymentMethodsCardProps {
  dashboardData: DashboardData;
  omzet: number;
}

export function PaymentMethodsCard({ dashboardData, omzet }: PaymentMethodsCardProps) {
  return (
    <div className="bg-white border rounded-xl overflow-hidden lg:col-span-1 flex flex-col">
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b">
        <h2 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-gray-500" />
          Uang Masuk (Kasir)
        </h2>
      </div>
      
      <div className="p-4 sm:p-6 flex-1">
        {dashboardData.payment_methods.length > 0 ? (
          <div className="space-y-4">
            {dashboardData.payment_methods.map((pm, idx) => {
              const pct = omzet > 0 ? (pm.total / omzet) * 100 : 0;
              return (
                <div key={idx} className="relative">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      {pm.method === 'Tunai' ? '💵 Tunai' : pm.method === 'QRIS' ? '📱 QRIS' : '💳 Transfer'}
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-normal">{pm.count}x</span>
                    </span>
                    <span className="text-sm font-bold text-gray-900">{rp(pm.total)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pm.method === 'Tunai' ? 'bg-green-500' : pm.method === 'QRIS' ? 'bg-blue-500' : 'bg-purple-500'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            
            <div className="mt-6 pt-4 border-t border-dashed border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Uang fisik yang harus ada di Laci Kasir:</p>
              <p className="text-xl font-black text-green-600">
                {rp(dashboardData.payment_methods.find(p => p.method === 'Tunai')?.total || 0)}
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            Belum ada transaksi pembayaran
          </div>
        )}
      </div>
    </div>
  );
}
