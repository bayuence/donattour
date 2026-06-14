'use client';

import { 
  Receipt, FileText, Activity, BarChart2, 
  Users, TrendingUp
} from 'lucide-react';
import type { DashboardData, ExpenseItem } from '../types';
import { rp } from '../utils/helpers';

interface FinancialSummaryCardsProps {
  dashboardData: DashboardData;
  expenses: ExpenseItem[];
}

export function FinancialSummaryCards({
  dashboardData,
  expenses
}: FinancialSummaryCardsProps) {
  const totalPengeluaran = expenses.reduce((s, e) => s + (e.jumlah || 0), 0);
  const omzet = dashboardData.financial_summary.omzet ?? 0;
  const labaBersih = omzet - totalPengeluaran;
  const labaKotor = dashboardData.financial_summary.gross_profit ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">

      {/* Pendapatan */}
      <div className="bg-white border rounded-xl p-4 sm:p-5 md:p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -translate-y-8 translate-x-8 opacity-60" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Receipt className="w-4 h-4 text-blue-700" />
            </div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pendapatan</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{rp(omzet)}</p>
          <div className="flex flex-col gap-1 mt-2">
            <p className="text-xs text-gray-600 flex items-center gap-1.5 font-medium">
              <Users className="w-3.5 h-3.5" />
              {dashboardData.transaction_count} Pelanggan
            </p>
            <p className="text-[10px] text-gray-500 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Rata-rata: {rp(dashboardData.average_order_value)} / struk
            </p>
          </div>
        </div>
      </div>

      {/* Pengeluaran */}
      <div className="bg-white border rounded-xl p-4 sm:p-5 md:p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full -translate-y-8 translate-x-8 opacity-60" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-red-700" />
            </div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pengeluaran</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{rp(totalPengeluaran)}</p>
          <p className="text-xs text-gray-500">{expenses.length} transaksi</p>
        </div>
      </div>

      {/* Laba Kotor */}
      <div className="bg-white border rounded-xl p-4 sm:p-5 md:p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -translate-y-8 translate-x-8 opacity-60" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Activity className="w-4 h-4 text-amber-700" />
              </div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Laba Kotor</span>
            </div>
          </div>
          <p className={`text-xl sm:text-2xl font-bold mb-1 ${labaKotor >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
            {rp(labaKotor)}
          </p>
          <p className="text-xs text-gray-500 mb-2">Setelah HPP · margin {(dashboardData.financial_summary.margin ?? 0).toFixed(1)}%</p>
          
          {(dashboardData.financial_summary.total_loss ?? 0) > 0 && (
            <div className="pt-2 mt-2 border-t border-dashed border-gray-200">
              <p className="text-[10px] text-red-500 font-bold mb-1">RUGI PRODUKSI (WASTE): {rp(dashboardData.financial_summary.total_loss)}</p>
              <div className="flex gap-2 flex-wrap text-[9px] text-gray-500">
                {dashboardData.loss_breakdown.production_waste.amount > 0 && (
                  <span>Gagal Goreng: {rp(dashboardData.loss_breakdown.production_waste.amount)}</span>
                )}
                {dashboardData.loss_breakdown.topping_error.amount > 0 && (
                  <span>Gagal Topping: {rp(dashboardData.loss_breakdown.topping_error.amount)}</span>
                )}
                {dashboardData.loss_breakdown.non_topping_expired.amount > 0 && (
                  <span>Basi: {rp(dashboardData.loss_breakdown.non_topping_expired.amount)}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Laba Bersih */}
      <div className="bg-white border rounded-xl p-4 sm:p-5 md:p-6 relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-24 h-24 ${labaBersih >= 0 ? 'bg-green-50' : 'bg-red-50'} rounded-full -translate-y-8 translate-x-8 opacity-60`} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-9 h-9 ${labaBersih >= 0 ? 'bg-green-100' : 'bg-red-100'} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <BarChart2 className={`w-4 h-4 ${labaBersih >= 0 ? 'text-green-700' : 'text-red-700'}`} />
            </div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Laba Bersih</span>
          </div>
          <p className={`text-xl sm:text-2xl font-bold mb-1 ${labaBersih >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
            {rp(labaBersih)}
          </p>
          <p className="text-xs text-gray-500">Setelah semua biaya</p>
        </div>
      </div>

    </div>
  );
}
