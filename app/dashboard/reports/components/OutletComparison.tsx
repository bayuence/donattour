// ============================================================================
// OUTLET COMPARISON COMPONENT
// ============================================================================
// File: app/dashboard/reports/components/OutletComparison.tsx
// Description: Compare performance across outlets
// Version: 1.0
// Date: 2026-05-06
// ============================================================================

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Award } from 'lucide-react';

interface OutletComparisonProps {
  outlets: Array<{
    outlet_id: string;
    outlet_name: string;
    total_production: number;
    waste_rate: number;
    total_loss: number;
  }>;
}

export function OutletComparison({ outlets }: OutletComparisonProps) {
  // Sort outlets by waste rate (ascending - lower is better)
  const sortedByWasteRate = [...outlets].sort((a, b) => a.waste_rate - b.waste_rate);
  
  // Sort outlets by production (descending - higher is better)
  const sortedByProduction = [...outlets].sort((a, b) => b.total_production - a.total_production);

  // Format currency
  const formatCurrency = (value: number) => {
    return `Rp ${value.toLocaleString('id-ID')}`;
  };

  // Get waste rate badge color
  const getWasteRateBadge = (wasteRate: number) => {
    if (wasteRate <= 10) {
      return <Badge className="bg-green-500">Excellent</Badge>;
    } else if (wasteRate <= 15) {
      return <Badge className="bg-yellow-500">Good</Badge>;
    } else {
      return <Badge className="bg-red-500">Needs Improvement</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>🏢 Perbandingan Antar Outlet</CardTitle>
        <p className="text-sm text-gray-600">
          Analisis performa outlet berdasarkan produksi, waste rate, dan rugi
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Best Performers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Best Waste Rate */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <Award className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-green-900">
                🏆 Best Waste Rate
              </h3>
            </div>
            {sortedByWasteRate[0] && (
              <div>
                <p className="text-lg font-bold text-green-700">
                  {sortedByWasteRate[0].outlet_name}
                </p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {sortedByWasteRate[0].waste_rate.toFixed(1)}%
                </p>
                <p className="text-sm text-green-600 mt-1">
                  Produksi: {sortedByWasteRate[0].total_production.toLocaleString('id-ID')} pcs
                </p>
              </div>
            )}
          </div>

          {/* Highest Production */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">
                🏆 Highest Production
              </h3>
            </div>
            {sortedByProduction[0] && (
              <div>
                <p className="text-lg font-bold text-blue-700">
                  {sortedByProduction[0].outlet_name}
                </p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {sortedByProduction[0].total_production.toLocaleString('id-ID')} pcs
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  Waste Rate: {sortedByProduction[0].waste_rate.toFixed(1)}%
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Rank</th>
                <th className="px-4 py-3 text-left font-semibold">Outlet</th>
                <th className="px-4 py-3 text-right font-semibold">Produksi</th>
                <th className="px-4 py-3 text-right font-semibold">Waste Rate</th>
                <th className="px-4 py-3 text-right font-semibold">Total Rugi</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedByWasteRate.map((outlet, index) => (
                <tr
                  key={outlet.outlet_id}
                  className="border-b hover:bg-gray-50 transition-colors"
                >
                  {/* Rank */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {index === 0 && (
                        <Award className="h-4 w-4 text-yellow-500" />
                      )}
                      <span className="font-semibold">#{index + 1}</span>
                    </div>
                  </td>

                  {/* Outlet Name */}
                  <td className="px-4 py-3 font-medium">
                    {outlet.outlet_name}
                  </td>

                  {/* Production */}
                  <td className="px-4 py-3 text-right">
                    {outlet.total_production.toLocaleString('id-ID')} pcs
                  </td>

                  {/* Waste Rate */}
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-semibold ${
                        outlet.waste_rate <= 10
                          ? 'text-green-600'
                          : outlet.waste_rate <= 15
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {outlet.waste_rate.toFixed(1)}%
                    </span>
                  </td>

                  {/* Total Loss */}
                  <td className="px-4 py-3 text-right text-red-600 font-semibold">
                    {formatCurrency(outlet.total_loss)}
                  </td>

                  {/* Status Badge */}
                  <td className="px-4 py-3 text-center">
                    {getWasteRateBadge(outlet.waste_rate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Insights */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">💡 Insights</h4>
          <ul className="space-y-1 text-sm text-blue-700">
            <li>
              • Outlet dengan waste rate terendah:{' '}
              <strong>{sortedByWasteRate[0]?.outlet_name}</strong> (
              {sortedByWasteRate[0]?.waste_rate.toFixed(1)}%)
            </li>
            <li>
              • Outlet dengan waste rate tertinggi:{' '}
              <strong>
                {sortedByWasteRate[sortedByWasteRate.length - 1]?.outlet_name}
              </strong>{' '}
              ({sortedByWasteRate[sortedByWasteRate.length - 1]?.waste_rate.toFixed(1)}%)
            </li>
            <li>
              • Outlet dengan produksi tertinggi:{' '}
              <strong>{sortedByProduction[0]?.outlet_name}</strong> (
              {sortedByProduction[0]?.total_production.toLocaleString('id-ID')} pcs)
            </li>
            {sortedByWasteRate.some((o) => o.waste_rate > 15) && (
              <li className="text-red-600 font-semibold">
                ⚠️ Ada outlet dengan waste rate &gt; 15%. Perlu evaluasi proses
                produksi!
              </li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
