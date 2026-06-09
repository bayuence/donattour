'use client';

import { Receipt, Wifi } from 'lucide-react';
import type { ExpenseItem } from '../types';
import { rp } from '../utils/helpers';

interface ExpenseListProps {
  expenses: ExpenseItem[];
  totalPengeluaran: number;
}

export function ExpenseList({ expenses, totalPengeluaran }: ExpenseListProps) {
  return (
    <div className="bg-white border rounded-xl overflow-hidden lg:col-span-3">
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b">
        <h2 className="text-sm sm:text-base font-bold text-gray-900">Rincian Transaksi Pengeluaran</h2>
      </div>

      {expenses.length > 0 ? (
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full min-w-[360px]">
            <thead className="bg-gray-50 border-b sticky top-0 z-10">
              <tr>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Kategori</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Keterangan</th>
                <th className="px-4 md:px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Jumlah</th>
                <th className="hidden sm:table-cell px-4 md:px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map((item) => {
                const pct = totalPengeluaran > 0 ? (item.jumlah / totalPengeluaran) * 100 : 0;
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 capitalize">
                        {String(item.kategori || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-700">
                      {item.keterangan}
                    </td>
                    <td className="px-4 md:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {rp(item.jumlah)}
                    </td>
                    <td className="hidden sm:table-cell px-4 md:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                      {pct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td colSpan={2} className="px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-gray-900">
                  Total Pengeluaran
                </td>
                <td className="px-4 md:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-bold text-gray-900 whitespace-nowrap">
                  {rp(totalPengeluaran)}
                </td>
                <td className="hidden sm:table-cell px-4 md:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-bold text-gray-900">
                  100%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="p-10 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Receipt className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-600 font-semibold">Belum ada pengeluaran hari ini</p>
          <p className="text-gray-400 text-sm mt-1 flex items-center justify-center gap-1">
            <Wifi className="w-3.5 h-3.5" />
            Data akan muncul otomatis setelah ada input pengeluaran
          </p>
        </div>
      )}
    </div>
  );
}
