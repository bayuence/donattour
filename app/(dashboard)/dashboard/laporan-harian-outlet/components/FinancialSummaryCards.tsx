'use client';

import { useState } from 'react';
import { 
  ShoppingBag, Globe, Package, TrendingUp, Users, 
  Package2, TrendingDown, AlertTriangle, CheckCircle2, RefreshCw,
  Receipt, ArrowDownRight
} from 'lucide-react';
import type { DashboardData, ExpenseItem } from '../types';
import { rp } from '../utils/helpers';

interface FinancialSummaryCardsProps {
  dashboardData: DashboardData;
  expenses: ExpenseItem[];
  userRole?: string;
}

export function FinancialSummaryCards({
  dashboardData,
  expenses,
  userRole
}: FinancialSummaryCardsProps) {
  const omzet = dashboardData.financial_summary.omzet ?? 0;
  const cashierRevenue = dashboardData.financial_summary.cashier_revenue ?? omzet;
  const onlineRevenue = dashboardData.financial_summary.online_revenue ?? 0;
  const totalPengeluaran = expenses.reduce((s, e) => s + (e.jumlah || 0), 0);
  
  const onlineQty = dashboardData.production_sales?.channel_deductions ?? 0;
  const onlineHpp = dashboardData.production_sales?.channel_deductions_hpp ?? 0;
  const channelsSummary = dashboardData.production_sales?.channels_summary ?? [];
  const onlineChannelsText = channelsSummary.length > 0
    ? channelsSummary.map(c => `${c.channel_name} ${c.qty}pcs`).join(' · ')
    : 'Tidak ada penjualan online';

  const successRate = dashboardData.production_sales.success_rate;
  const produksi = dashboardData.production_sales.success;
  const produksiStandar = (dashboardData.production_sales as any).success_standar ?? 0;
  const produksiMini = (dashboardData.production_sales as any).success_mini ?? 0;
  const terjual = dashboardData.production_sales.sold;
  const terjualStandar = (dashboardData.production_sales as any).sold_standar ?? 0;
  const terjualMini = (dashboardData.production_sales as any).sold_mini ?? 0;
  
  const onlineStandar = (dashboardData.production_sales as any).channel_deductions_standar ?? 0;
  const onlineMini = (dashboardData.production_sales as any).channel_deductions_mini ?? 0;

  const totalTerjualStandar = terjualStandar + onlineStandar;
  const totalTerjualMini = terjualMini + onlineMini;

  const sisa = dashboardData.production_sales.remaining;
  const sisaStandar = (dashboardData.production_sales as any).remaining_standar ?? 0;
  const sisaMini = (dashboardData.production_sales as any).remaining_mini ?? 0;
  const waste = dashboardData.production_sales.waste;
  const wasteStandar = (dashboardData.production_sales as any).waste_standar ?? 0;
  const wasteMini = (dashboardData.production_sales as any).waste_mini ?? 0;
  const totalTerjual = terjual + onlineQty;

  return (
    <div className="space-y-3">
      {/* Row 1: 3 KPI Cards — selalu 1 baris di semua ukuran */}
      <div className="grid grid-cols-3 gap-2">

        {/* Card 1: Pendapatan Kasir */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full shrink-0">
              {dashboardData.transaction_count} trx
            </span>
          </div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide truncate">Pendapatan Kasir</p>
          <p className="text-base font-black text-slate-900 mt-0.5 truncate">{rp(cashierRevenue)}</p>
          {/* Metode bayar — hanya yang > 0, compact */}
          <div className="mt-1.5 border-t border-slate-100 pt-1.5 space-y-0.5">
            {dashboardData.payment_methods
              .filter(pm => pm.total > 0 && pm.method !== '─── TOTAL ───')
              .slice(0, 4)
              .map((pm) => (
                <div key={pm.method} className="flex items-center justify-between gap-1 min-w-0">
                  <span className="text-[9px] text-slate-500 truncate">{pm.method}</span>
                  <span className="text-[9px] font-bold text-slate-700 shrink-0">{rp(pm.total)}</span>
                </div>
              ))}
            {dashboardData.payment_methods.filter(pm => pm.total > 0 && pm.method !== '─── TOTAL ───').length === 0 && (
              <p className="text-[9px] text-slate-400">Belum ada</p>
            )}
          </div>
        </div>

        {/* Card 2: Total Donat Terjual — all ukuran, all sumber */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
              <Package className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0">ALL</span>
          </div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide truncate">Total Terjual</p>
          <p className="text-base font-black text-slate-900 mt-0.5">{totalTerjual} <span className="text-xs font-semibold text-slate-500">pcs</span></p>
          
          {/* Breakdown total ukuran STD / MINI */}
          <div className="flex gap-1.5 mt-1.5">
            <div className="flex-1 bg-slate-50 rounded-lg px-1.5 py-0.5 text-center">
              <p className="text-[7px] font-bold text-slate-400 uppercase">ALL STD</p>
              <p className="text-[10px] font-black text-slate-700">{totalTerjualStandar}</p>
            </div>
            <div className="flex-1 bg-orange-50 rounded-lg px-1.5 py-0.5 text-center">
              <p className="text-[7px] font-bold text-orange-400 uppercase">ALL MINI</p>
              <p className="text-[10px] font-black text-orange-700">{totalTerjualMini}</p>
            </div>
          </div>

          {/* Rincian per sumber + breakdown ukuran masing-masing */}
          <div className="mt-2 border-t border-slate-100 pt-2 space-y-1.5">
            {/* Kasir */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[9px] text-slate-500 truncate">Kasir (Langsung)</span>
                <span className="text-[9px] font-bold text-slate-700 shrink-0">{terjual} pcs</span>
              </div>
              <div className="flex items-center gap-1.5 text-[8px] text-slate-400">
                <span>STD: {terjualStandar}</span>
                <span className="text-[6px]">•</span>
                <span>MINI: {terjualMini}</span>
              </div>
            </div>

            {/* Online */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[9px] text-slate-500 truncate">Online (Channel)</span>
                <span className="text-[9px] font-bold text-emerald-700 shrink-0">{onlineQty} pcs</span>
              </div>
              <div className="flex items-center gap-1.5 text-[8px] text-emerald-600/70">
                <span>STD: {onlineStandar}</span>
                <span className="text-[6px]">•</span>
                <span>MINI: {onlineMini}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Rata-rata per Transaksi */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide truncate">Rata-rata / Trx</p>
          <p className="text-base font-black text-slate-900 mt-0.5 truncate">{rp(dashboardData.average_order_value)}</p>
          <p className="text-[9px] text-slate-400 mt-0.5">Omzet ÷ struk</p>
          <div className="mt-1.5 border-t border-slate-100 pt-1.5 space-y-0.5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9px] text-slate-500 truncate">Jml struk</span>
              <span className="text-[9px] font-bold text-slate-700 shrink-0">{dashboardData.transaction_count}</span>
            </div>
            <div className="flex items-center justify-between gap-1 min-w-0">
              <span className="text-[9px] text-slate-500 truncate">Omzet</span>
              <span className="text-[9px] font-bold text-slate-700 shrink-0">{rp(cashierRevenue)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Row 2: Produksi Metrics — dengan breakdown standar/mini */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-5 divide-x divide-slate-100">
          {[
            {
              label: 'Diproduksi',
              value: produksi,
              standar: produksiStandar,
              mini: produksiMini,
              color: 'text-slate-800',
              bg: 'bg-slate-100',
              icon: <Package2 className="w-4 h-4 text-slate-500" />,
            },
            {
              label: 'Terjual',
              value: terjual,
              standar: terjualStandar,
              mini: terjualMini,
              color: 'text-green-700',
              bg: 'bg-green-100',
              icon: <TrendingUp className="w-4 h-4 text-green-600" />,
            },
            {
              label: 'Sisa Stok',
              value: sisa,
              standar: sisaStandar,
              mini: sisaMini,
              color: 'text-amber-700',
              bg: 'bg-amber-100',
              icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
              highlight: true,
            },
            {
              label: 'Gagal',
              value: waste,
              standar: wasteStandar,
              mini: wasteMini,
              color: 'text-red-700',
              bg: 'bg-red-100',
              icon: <TrendingDown className="w-4 h-4 text-red-500" />,
            },
            {
              label: 'Success Rate',
              value: `${successRate.toFixed(1)}%`,
              standar: null,
              mini: null,
              color: successRate >= 80 ? 'text-green-700' : successRate >= 60 ? 'text-amber-700' : 'text-red-700',
              bg: 'bg-blue-100',
              icon: <CheckCircle2 className="w-4 h-4 text-blue-500" />,
            },
          ].map((item, i) => (
            <div key={i} className={`px-3 py-3 text-center ${item.highlight ? 'bg-amber-50/60' : ''}`}>
              {/* Label di atas */}
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight mb-1">{item.label}</p>
              {/* Angka total dengan ikon + label ALL */}
              <div className={`inline-flex items-center justify-center w-7 h-7 ${item.bg} rounded-lg mb-1`}>
                {item.icon}
              </div>
              <div className="flex items-center justify-center gap-1">
                <p className={`text-xl font-black ${item.color}`}>{item.value}</p>
                {item.standar !== null && (
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide self-end mb-0.5">all</span>
                )}
              </div>
              {/* Breakdown STD / MINI */}
              {item.standar !== null && (
                <div className="flex items-center justify-center gap-1.5 mt-1.5">
                  <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                    STD {item.standar}
                  </span>
                  <span className="text-[9px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                    MINI {item.mini}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Success Rate Bar */}
        <div className="px-4 pb-3 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500 shrink-0">Success Rate</span>
            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${successRate >= 80 ? 'bg-green-500' : successRate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(successRate, 100)}%` }}
              />
            </div>
            <span className={`text-[11px] font-bold shrink-0 ${successRate >= 80 ? 'text-green-600' : successRate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
              {successRate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
