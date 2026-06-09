'use client';

import { PieChart } from 'lucide-react';
import type { ExpenseItem } from '../types';
import { rp } from '../utils/helpers';

interface ExpenseBreakdownProps {
  expenses: ExpenseItem[];
  totalPengeluaran: number;
}

export function ExpenseBreakdown({ expenses, totalPengeluaran }: ExpenseBreakdownProps) {
  // Aggregate expenses by category
  const expenseCategories = expenses.reduce((acc, curr) => {
    const cat = curr.kategori || 'Lainnya';
    if (!acc[cat]) acc[cat] = 0;
    acc[cat] += curr.jumlah;
    return acc;
  }, {} as Record<string, number>);
  
  const sortedExpenseCategories = Object.entries(expenseCategories).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-white border rounded-xl overflow-hidden lg:col-span-1">
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b">
        <h2 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-gray-500" />
          Rekap Kategori
        </h2>
      </div>
      <div className="p-4 sm:p-6 space-y-4">
        {sortedExpenseCategories.length > 0 ? (
          sortedExpenseCategories.map(([cat, total], idx) => {
            const pct = (total / totalPengeluaran) * 100;
            return (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold text-gray-700 capitalize">{cat.replace(/_/g, ' ')}</span>
                  <span className="font-bold text-gray-900">{rp(total)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-red-400 h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">Belum ada data</p>
        )}
      </div>
    </div>
  );
}
