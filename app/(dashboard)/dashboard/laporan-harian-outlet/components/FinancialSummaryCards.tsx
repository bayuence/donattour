'use client';

import { useState } from 'react';
import { 
  ShoppingBag, Users, Package, TrendingUp, ChevronDown, ChevronUp, Lock
} from 'lucide-react';
import type { DashboardData, ExpenseItem } from '../types';
import { rp } from '../utils/helpers';

interface FinancialSummaryCardsProps {
  dashboardData: DashboardData;
  expenses: ExpenseItem[];
  userRole?: string; // 'admin' | 'owner' | 'cashier' | etc
}

export function FinancialSummaryCards({
  dashboardData,
  expenses,
  userRole
}: FinancialSummaryCardsProps) {
  const [showDetailedFinancials, setShowDetailedFinancials] = useState(false);
  
  const omzet = dashboardData.financial_summary.omzet ?? 0;
  const totalPengeluaran = expenses.reduce((s, e) => s + (e.jumlah || 0), 0);
  const labaKotor = dashboardData.financial_summary.gross_profit ?? 0;
  const totalLoss = dashboardData.financial_summary.total_loss ?? 0;
  const labaBersih = labaKotor - totalLoss - totalPengeluaran;
  const margin = omzet > 0 ? (labaBersih / omzet) * 100 : 0;

  // Only owner and admin can see detailed financials
  const canViewDetails = userRole === 'admin' || userRole === 'owner';

  return (
    <div className="space-y-4">
      {/* ══════════════════════════════════════════════════════════
          RINGKASAN OPERASIONAL (Untuk Semua Role)
          Ini yang ditampilkan ke kasir/staff - tidak mengandung data sensitif
      ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Pendapatan Total */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-blue-900 mb-1">Pendapatan</p>
          <p className="text-3xl font-black text-blue-900">{rp(omzet)}</p>
          <p className="text-xs text-blue-600 mt-2">Total penjualan kasir (tidak termasuk omzet online)</p>
        </div>

        {/* Card 2: Jumlah Transaksi */}
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-emerald-900 mb-1">Transaksi</p>
          <p className="text-3xl font-black text-emerald-900">{dashboardData.transaction_count}</p>
          <p className="text-xs text-emerald-600 mt-2">Pelanggan dilayani</p>
        </div>

        {/* Card 3: Produk Terjual */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-amber-900 mb-1">Produk Terjual</p>
          <p className="text-3xl font-black text-amber-900">{dashboardData.production_sales.sold}</p>
          <p className="text-xs text-amber-600 mt-2">
            Donat kasir terjual{dashboardData.production_sales.channel_deductions > 0 ? ` (+${dashboardData.production_sales.channel_deductions} online)` : ''}
          </p>
        </div>

        {/* Card 4: Rata-rata per Struk */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-purple-900 mb-1">Rata-rata / Struk</p>
          <p className="text-2xl font-black text-purple-900">{rp(dashboardData.average_order_value)}</p>
          <p className="text-xs text-purple-600 mt-2">Nilai transaksi rata-rata</p>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════
          DETAIL KEUANGAN (Owner/Admin Only)
          Toggle untuk melihat breakdown profit margin, HPP, dll
      ══════════════════════════════════════════════════════════ */}
      {canViewDetails && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => setShowDetailedFinancials(!showDetailedFinancials)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Lock className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900">Detail Keuangan Lanjutan</p>
                <p className="text-xs text-gray-500">Hanya untuk Owner/Admin - Klik untuk {showDetailedFinancials ? 'sembunyikan' : 'tampilkan'}</p>
              </div>
            </div>
            {showDetailedFinancials ? (
              <ChevronUp className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
            )}
          </button>

          {showDetailedFinancials && (
            <div className="px-6 pb-6 pt-2 border-t border-gray-100 space-y-4">
              {/* Waterfall Breakdown */}
              <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-5 border border-slate-200">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 mb-4">Analisis Profitabilitas</h3>
                
                <div className="space-y-3">
                  {/* Omzet */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-sm font-medium text-slate-700">Pendapatan (Omzet)</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{rp(omzet)}</span>
                  </div>

                  {/* HPP */}
                  <div className="flex flex-col pl-4 pb-3 border-b border-slate-200 gap-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-400" />
                        <span className="text-sm text-slate-600 font-medium">HPP (Bahan Baku)</span>
                      </div>
                      <span className="text-sm font-semibold text-red-600">-{rp(dashboardData.financial_summary.hpp_sold)}</span>
                    </div>
                    {dashboardData.production_sales.channel_deductions_hpp > 0 && (
                      <span className="text-[10px] text-slate-500 italic pl-4">
                        (Termasuk HPP pemotongan online: -{rp(dashboardData.production_sales.channel_deductions_hpp)})
                      </span>
                    )}
                  </div>

                  {/* Laba Kotor */}
                  <div className="flex items-center justify-between pl-2 py-2 bg-emerald-50 rounded-lg px-3 mb-3">
                    <span className="text-sm font-bold text-emerald-800">Laba Kotor</span>
                    <span className="text-sm font-black text-emerald-700">{rp(labaKotor)}</span>
                  </div>

                  {/* Total Loss */}
                  <div className="flex items-center justify-between pl-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-400" />
                      <span className="text-sm text-slate-600">Kerugian Produksi (Rugi)</span>
                    </div>
                    <span className="text-sm font-semibold text-orange-600">-{rp(totalLoss)}</span>
                  </div>

                  {/* Pengeluaran Operasional */}
                  <div className="flex items-center justify-between pl-4 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-400" />
                      <span className="text-sm text-slate-600">Pengeluaran Operasional (Beban)</span>
                    </div>
                    <span className="text-sm font-semibold text-purple-600">-{rp(totalPengeluaran)}</span>
                  </div>

                  {/* Laba Bersih */}
                  <div className="flex items-center justify-between pl-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl px-4">
                    <span className="text-sm font-black text-white">Laba Bersih</span>
                    <div className="text-right">
                      <span className="text-lg font-black text-white block">{rp(labaBersih)}</span>
                      <span className="text-xs text-blue-100">Margin: {margin.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Breakdown Kerugian */}
              {dashboardData.financial_summary.total_loss > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-orange-700 mb-3">Rincian Kerugian</h4>
                  <div className="space-y-2 text-xs">
                    {dashboardData.loss_breakdown.production_waste.amount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-orange-700">Gagal Produksi</span>
                        <span className="font-bold text-orange-800">{rp(dashboardData.loss_breakdown.production_waste.amount)}</span>
                      </div>
                    )}
                    {dashboardData.loss_breakdown.topping_error.amount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-orange-700">Salah Topping</span>
                        <span className="font-bold text-orange-800">{rp(dashboardData.loss_breakdown.topping_error.amount)}</span>
                      </div>
                    )}
                    {dashboardData.loss_breakdown.non_topping_expired.amount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-orange-700">Expired (Non-Topping)</span>
                        <span className="font-bold text-orange-800">{rp(dashboardData.loss_breakdown.non_topping_expired.amount)}</span>
                      </div>
                    )}
                    {dashboardData.loss_breakdown.finished_product_reject.amount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-orange-700">Reject (Produk Jadi)</span>
                        <span className="font-bold text-orange-800">{rp(dashboardData.loss_breakdown.finished_product_reject.amount)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
