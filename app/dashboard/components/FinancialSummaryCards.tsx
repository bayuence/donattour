'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';
import { formatRupiah, formatPercent } from '@/lib/utils/format';

interface FinancialSummaryCardsProps {
  data: {
    omzet: number;
    gross_profit: number;
    total_loss: number;
    margin: number;
  };
  loading?: boolean;
}

export function FinancialSummaryCards({ data, loading }: FinancialSummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const { omzet, gross_profit, total_loss, margin } = data;

  // Determine color based on values
  const getProfitColor = (profit: number) => {
    if (profit > 0) return 'text-green-600';
    if (profit < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getMarginColor = (margin: number) => {
    if (margin >= 50) return 'text-green-600';
    if (margin >= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getLossColor = (loss: number) => {
    if (loss < 100000) return 'text-green-600';
    if (loss < 200000) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMarginBgColor = (margin: number) => {
    if (margin >= 50) return 'bg-green-50 border-green-200';
    if (margin >= 30) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getLossBgColor = (loss: number) => {
    if (loss < 100000) return 'bg-green-50 border-green-200';
    if (loss < 200000) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Omzet */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Omzet Hari Ini
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-blue-900">
              {formatRupiah(omzet)}
            </p>
            <p className="text-xs text-blue-600">Total penjualan</p>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Gross Profit */}
      <Card className={gross_profit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
        <CardHeader className="pb-2">
          <CardTitle className={`text-sm font-medium flex items-center gap-2 ${getProfitColor(gross_profit)}`}>
            {gross_profit >= 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            Gross Profit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className={`text-2xl font-bold ${getProfitColor(gross_profit)}`}>
              {formatRupiah(gross_profit)}
            </p>
            <p className={`text-xs ${gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {gross_profit >= 0 ? 'Untung' : 'Rugi'} setelah HPP & waste
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Total Rugi */}
      <Card className={getLossBgColor(total_loss)}>
        <CardHeader className="pb-2">
          <CardTitle className={`text-sm font-medium flex items-center gap-2 ${getLossColor(total_loss)}`}>
            <AlertTriangle className="h-4 w-4" />
            Total Rugi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className={`text-2xl font-bold ${getLossColor(total_loss)}`}>
              {formatRupiah(total_loss)}
            </p>
            <p className={`text-xs ${getLossColor(total_loss)}`}>
              {total_loss < 100000 ? '✅ Bagus!' : total_loss < 200000 ? '⚠️ Perhatian' : '🚨 Tinggi!'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Margin */}
      <Card className={getMarginBgColor(margin)}>
        <CardHeader className="pb-2">
          <CardTitle className={`text-sm font-medium flex items-center gap-2 ${getMarginColor(margin)}`}>
            <TrendingUp className="h-4 w-4" />
            Margin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className={`text-2xl font-bold ${getMarginColor(margin)}`}>
              {formatPercent(margin)}
            </p>
            <p className={`text-xs ${getMarginColor(margin)}`}>
              {margin >= 50 ? '✅ Excellent!' : margin >= 30 ? '⚠️ Good' : '🚨 Low'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
