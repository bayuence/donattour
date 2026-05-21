'use client';

import { useMemo } from 'react';
import type { ExpenseWithDetails } from '@/lib/types/expenses';

interface ExpenseChartProps {
  expenses: ExpenseWithDetails[];
  type: 'category' | 'trend';
}

const KATEGORI_COLORS: Record<string, string> = {
  operasional: '#3B82F6',
  bahan_baku: '#F59E0B',
  gaji: '#10B981',
  transportasi: '#8B5CF6',
  perawatan: '#F97316',
  marketing: '#EC4899',
  lainnya: '#6B7280',
};

export function ExpenseChart({ expenses, type }: ExpenseChartProps) {
  const chartData = useMemo(() => {
    if (type === 'category') {
      // Group by category
      const categoryMap = new Map<string, number>();
      expenses.forEach(exp => {
        const current = categoryMap.get(exp.kategori) || 0;
        categoryMap.set(exp.kategori, current + Number(exp.jumlah));
      });
      
      const total = Array.from(categoryMap.values()).reduce((a, b) => a + b, 0);
      
      return Array.from(categoryMap.entries()).map(([kategori, amount]) => ({
        kategori,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
        color: KATEGORI_COLORS[kategori] || '#6B7280',
      })).sort((a, b) => b.amount - a.amount);
    }
    
    // Trend by date
    const dateMap = new Map<string, number>();
    expenses.forEach(exp => {
      const current = dateMap.get(exp.tanggal) || 0;
      dateMap.set(exp.tanggal, current + Number(exp.jumlah));
    });
    
    return Array.from(dateMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [expenses, type]);

  if (type === 'category') {
    const categoryData = chartData as Array<{ kategori: string; amount: number; percentage: number; color: string; }>;
    const maxAmount = Math.max(...categoryData.map(d => d.amount), 1);
    
    return (
      <div className="space-y-3">
        {categoryData.map((item, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700 capitalize">
                {item.kategori.replace('_', ' ')}
              </span>
              <span className="text-gray-900 font-semibold">
                {new Intl.NumberFormat('id-ID', { 
                  style: 'currency', 
                  currency: 'IDR',
                  maximumFractionDigits: 0 
                }).format(item.amount)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(item.amount / maxAmount) * 100}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
              <span className="text-xs text-gray-500 w-12 text-right">
                {item.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Trend chart (simple bar chart)
  const trendData = chartData as Array<{ date: string; amount: number; }>;
  const maxAmount = Math.max(...trendData.map(d => d.amount), 1);
  
  return (
    <div className="flex items-end gap-2 h-48">
      {trendData.map((item, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center gap-2">
          <div className="flex-1 w-full flex items-end">
            <div
              className="w-full bg-blue-500 rounded-t-lg transition-all duration-500 hover:bg-blue-600 cursor-pointer relative group"
              style={{ height: `${(item.amount / maxAmount) * 100}%` }}
            >
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {new Intl.NumberFormat('id-ID', { 
                  style: 'currency', 
                  currency: 'IDR',
                  maximumFractionDigits: 0 
                }).format(item.amount)}
              </div>
            </div>
          </div>
          <span className="text-xs text-gray-500 transform -rotate-45 origin-top-left mt-4">
            {new Date(item.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
          </span>
        </div>
      ))}
    </div>
  );
}
