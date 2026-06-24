'use client';

import { 
  Package, TrendingUp, XCircle, AlertTriangle, 
  CheckCircle2, RefreshCw 
} from 'lucide-react';
import type { DashboardData } from '../types';

interface ProductionMetricsProps {
  dashboardData: DashboardData;
  loadingData: boolean;
}

export function ProductionMetrics({ dashboardData, loadingData }: ProductionMetricsProps) {
  const successRate = dashboardData.production_sales.success_rate;

  return (
    <div className="bg-white border rounded-xl">
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b flex items-center justify-between">
        <h2 className="text-sm sm:text-base font-bold text-gray-900">Metrik Produksi &amp; Operasional</h2>
        {loadingData && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Memperbarui...
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6">
        {/* Real-time Stock Monitoring */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
          {[
            {
              icon: <Package className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />,
              bg: 'bg-gray-100',
              value: dashboardData.production_sales.success,
              label: 'Diproduksi',
              subtitle: 'Total input berhasil',
            },
            {
              icon: <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />,
              bg: 'bg-green-100',
              value: dashboardData.production_sales.sold,
              label: 'Terjual',
              subtitle: 'Sudah jadi struk',
            },
            {
              icon: <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />,
              bg: 'bg-amber-100',
              value: Math.max(0, dashboardData.production_sales.success - dashboardData.production_sales.sold),
              label: 'Sisa',
              subtitle: 'Stok tersedia',
              highlight: true,
            },
            {
              icon: <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />,
              bg: 'bg-red-100',
              value: dashboardData.production_sales.waste,
              label: 'Gagal Produksi',
              subtitle: 'Total waste',
            },
            {
              icon: <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />,
              bg: 'bg-blue-100',
              value: `${successRate.toFixed(1)}%`,
              label: 'Success Rate',
              subtitle: 'Terjual / Diproduksi',
            },
          ].map((item, i) => (
            <div 
              key={i} 
              className={`text-center ${item.highlight ? 'ring-2 ring-amber-300 rounded-xl p-3 bg-amber-50/50' : ''}`}
            >
              <div className={`inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 ${item.bg} rounded-xl mb-2 sm:mb-3`}>
                {item.icon}
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{item.value}</p>
              <p className="text-[10px] sm:text-xs font-semibold text-gray-700 mt-1 uppercase tracking-wide leading-tight">{item.label}</p>
              <p className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5">{item.subtitle}</p>
            </div>
          ))}
        </div>

        {/* Success Rate Bar */}
        <div className="mt-6 pt-5 border-t">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs sm:text-sm font-semibold text-gray-700">
              Success Rate (Terjual / Diproduksi)
            </span>
            <span className={`text-xs sm:text-sm font-bold ${successRate >= 80 ? 'text-green-600' : successRate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
              {successRate.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 sm:h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${successRate >= 80 ? 'bg-green-500' : successRate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(successRate, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
