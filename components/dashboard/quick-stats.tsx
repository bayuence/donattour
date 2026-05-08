'use client';

import { useEffect, useState } from 'react';
import * as Types from '@/lib/types';

export function QuickStats() {
  const [stats, setStats] = useState({
    todaysSales: 0,
    transactionCount: 0,
    productsCount: 0,
    lowStockCount: 0,
  });

  useEffect(() => {
    // TODO: Load stats from API endpoints instead of direct DB calls
    // This is a client component and can't access DB directly
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(value);
  };

  const statCards = [
    {
      label: "Today's Sales",
      value: formatCurrency(stats.todaysSales),
      icon: '💰',
      color: 'bg-green-50 border-green-200',
    },
    {
      label: 'Transactions',
      value: stats.transactionCount,
      icon: '📝',
      color: 'bg-blue-50 border-blue-200',
    },
    {
      label: 'Products',
      value: stats.productsCount,
      icon: '🍩',
      color: 'bg-yellow-50 border-yellow-200',
    },
    {
      label: 'Low Stock',
      value: stats.lowStockCount,
      icon: '⚠️',
      color: 'bg-red-50 border-red-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((card) => (
        <div
          key={card.label}
          className={`${card.color} border rounded-lg p-6 hover:shadow-md transition`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
            </div>
            <span className="text-4xl opacity-30">{card.icon}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
