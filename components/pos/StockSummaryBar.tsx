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
  /** Optional: Add component to the left of the bar */
  addonLeft?: React.ReactNode;
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
export function StockSummaryBar({ stock, showAlert = true, addonLeft }: StockSummaryBarProps) {
  // Check if any stock is low
  const hasLowStock = stock.standar.status === 'low' || stock.mini.status === 'low';
  const hasOutOfStock = stock.standar.status === 'out_of_stock' || stock.mini.status === 'out_of_stock';

  // Generate short alert message
  const getAlertMessage = () => {
    const outOfStockItems: string[] = [];
    const lowStockItems: string[] = [];

    if (stock.standar.status === 'out_of_stock') outOfStockItems.push('Standar');
    if (stock.mini.status === 'out_of_stock') outOfStockItems.push('Mini');
    if (stock.standar.status === 'low') lowStockItems.push('Standar');
    if (stock.mini.status === 'low') lowStockItems.push('Mini');

    if (outOfStockItems.length > 0) {
      return `⚠️ ${outOfStockItems.join(' & ')} habis!`;
    }
    if (lowStockItems.length > 0) {
      return `⚠️ ${lowStockItems.join(' & ')} menipis!`;
    }
    return null;
  };

  const alertMessage = getAlertMessage();

  return (
    <div className="bg-white border-b border-slate-200 px-4 lg:px-6 py-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          {/* Left Area: Addon + Title */}
          <div className="flex items-center gap-4">
            {addonLeft && (
              <div className="flex items-center gap-2">
                {addonLeft}
              </div>
            )}
            
            {/* Title */}
            <div className={`flex items-center gap-2 ${addonLeft ? 'hidden md:flex pl-4 border-l border-slate-200' : ''}`}>
              <Package className="h-4 w-4 text-slate-600" />
              <h3 className="font-black text-slate-700 text-[10px] uppercase tracking-wider whitespace-nowrap">
                Stok Non-Topping:
              </h3>
            </div>
          </div>

          {/* Alert - Short & Inline (only if there's a problem) */}
          {showAlert && alertMessage && (
            <div className="flex-shrink-0">
              <div className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg border
                ${hasOutOfStock 
                  ? 'bg-red-50 border-red-300 text-red-700' 
                  : 'bg-yellow-50 border-yellow-300 text-yellow-700'
                }
              `}>
                {hasOutOfStock ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <span className="text-xs sm:text-sm font-bold whitespace-nowrap">
                  {alertMessage}
                </span>
              </div>
            </div>
          )}

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
    <div className="flex items-center gap-1.5">
      {/* Label (hidden on mobile) */}
      <span className="hidden sm:inline text-[10px] font-black uppercase tracking-wider text-slate-500">
        {label}:
      </span>

      {/* Badge */}
      <div
        className={`
          flex items-center gap-1.5 px-2.5 py-1 rounded-md border
          ${colors.bg} ${colors.border}
        `}
      >
        <Icon className={`h-3 w-3 ${colors.icon}`} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5">
          {/* Mobile: Show label */}
          <span className={`sm:hidden text-[9px] font-black uppercase tracking-wider ${colors.text}`}>
            {label}
          </span>
          {/* Quantity */}
          <span className={`text-[10px] font-black uppercase tracking-wider ${colors.text}`}>
            {qty} pcs
          </span>
        </div>
      </div>
    </div>
  );
}
