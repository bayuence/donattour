// ============================================================================
// STOCK SUMMARY BAR COMPONENT
// ============================================================================
// File: components/pos/StockSummaryBar.tsx
// Description: Top bar showing real-time stock non-topping di POS interface
// Version: 1.0
// Date: 2026-05-03
// ============================================================================

'use client';

import { Package, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// ============================================================================
// TYPES
// ============================================================================

interface StockSummaryBarProps {
  /** Stock summary data dari useStockValidation hook */
  stock: {
    standar: {
      qty_available: number;
      status: 'sufficient' | 'low' | 'out_of_stock';
      percentage: number;
    };
    mini: {
      qty_available: number;
      status: 'sufficient' | 'low' | 'out_of_stock';
      percentage: number;
    };
  };
  /** Optional: Show alert when stock low */
  showAlert?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get color classes based on stock status
 */
function getStatusColor(status: 'sufficient' | 'low' | 'out_of_stock') {
  switch (status) {
    case 'sufficient':
      return {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-300',
        icon: 'text-green-600',
      };
    case 'low':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        border: 'border-yellow-300',
        icon: 'text-yellow-600',
      };
    case 'out_of_stock':
      return {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-300',
        icon: 'text-red-600',
      };
  }
}

/**
 * Get status icon based on stock status
 */
function getStatusIcon(status: 'sufficient' | 'low' | 'out_of_stock') {
  switch (status) {
    case 'sufficient':
      return CheckCircle;
    case 'low':
      return AlertTriangle;
    case 'out_of_stock':
      return XCircle;
  }
}

/**
 * Get status label in Indonesian
 */
function getStatusLabel(status: 'sufficient' | 'low' | 'out_of_stock') {
  switch (status) {
    case 'sufficient':
      return 'Cukup';
    case 'low':
      return 'Menipis';
    case 'out_of_stock':
      return 'Habis';
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Stock Summary Bar - Top bar showing real-time stock non-topping
 * 
 * Features:
 * - Display stock standar & mini
 * - Visual indicators (green/yellow/red)
 * - Alert when stock < 20%
 * - Auto-refresh every 30 seconds (via hook)
 * - Responsive design
 * 
 * @example
 * ```tsx
 * const { data } = useStockValidation(outletId);
 * 
 * if (data?.can_operate) {
 *   return (
 *     <>
 *       <StockSummaryBar stock={data.stock_summary} showAlert />
 *       <POSInterface />
 *     </>
 *   );
 * }
 * ```
 */
export function StockSummaryBar({ stock, showAlert = true }: StockSummaryBarProps) {
  // Check if any stock is low
  const hasLowStock = stock.standar.status === 'low' || stock.mini.status === 'low';
  const hasOutOfStock = stock.standar.status === 'out_of_stock' || stock.mini.status === 'out_of_stock';

  return (
    <div className="space-y-2">
      {/* Stock Summary Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          {/* Title */}
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-slate-600" />
            <h3 className="font-semibold text-slate-700 text-sm sm:text-base">
              📦 Stok Non-Topping Hari Ini:
            </h3>
          </div>

          {/* Stock Display */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Standar Stock */}
            <StockBadge
              label="Standar"
              qty={stock.standar.qty_available}
              status={stock.standar.status}
              percentage={stock.standar.percentage}
            />

            {/* Divider */}
            <div className="h-6 w-px bg-slate-300" />

            {/* Mini Stock */}
            <StockBadge
              label="Mini"
              qty={stock.mini.qty_available}
              status={stock.mini.status}
              percentage={stock.mini.percentage}
            />
          </div>
        </div>
      </div>

      {/* Alert for Low Stock */}
      {showAlert && hasOutOfStock && (
        <div className="px-4">
          <Alert variant="destructive" className="border-red-300 bg-red-50">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="text-sm font-medium">
              ⚠️ Stok habis! Segera hubungi bagian dapur untuk produksi tambahan.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {showAlert && hasLowStock && !hasOutOfStock && (
        <div className="px-4">
          <Alert className="border-yellow-300 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-sm text-yellow-700 font-medium">
              ⚠️ Stok menipis (kurang dari 20%)! Pertimbangkan untuk produksi tambahan.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StockBadgeProps {
  label: string;
  qty: number;
  status: 'sufficient' | 'low' | 'out_of_stock';
  percentage: number;
}

function StockBadge({ label, qty, status, percentage }: StockBadgeProps) {
  const colors = getStatusColor(status);
  const Icon = getStatusIcon(status);
  const statusLabel = getStatusLabel(status);

  return (
    <div className="flex items-center gap-2">
      {/* Label (hidden on mobile) */}
      <span className="hidden sm:inline text-sm text-slate-600 font-medium">
        {label}:
      </span>

      {/* Badge */}
      <div
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg border
          ${colors.bg} ${colors.border}
        `}
      >
        <Icon className={`h-4 w-4 ${colors.icon}`} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
          {/* Mobile: Show label */}
          <span className={`sm:hidden text-xs ${colors.text} font-medium`}>
            {label}
          </span>
          {/* Quantity */}
          <span className={`text-sm sm:text-base font-bold ${colors.text}`}>
            {qty} pcs
          </span>
          {/* Status (hidden on mobile) */}
          <span className={`hidden sm:inline text-xs ${colors.text}`}>
            ({statusLabel} - {percentage.toFixed(0)}%)
          </span>
        </div>
      </div>
    </div>
  );
}
