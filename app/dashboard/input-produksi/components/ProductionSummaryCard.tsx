// ============================================================================
// PRODUCTION SUMMARY CARD COMPONENT
// ============================================================================
// File: app/dashboard/input-produksi/components/ProductionSummaryCard.tsx
// Description: Summary card showing production statistics
// Version: 1.0
// Date: 2026-05-03
// ============================================================================

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, Target } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface ProductionSummaryCardProps {
  target: number;
  success: number;
  waste: number;
  successRate: number;
  wasteRate: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProductionSummaryCard({
  target,
  success,
  waste,
  successRate,
  wasteRate,
}: ProductionSummaryCardProps) {
  const total = success + waste;
  const isComplete = total === target;
  const isOverTarget = total > target;

  return (
    <Card
      className={
        isOverTarget
          ? 'border-red-500 bg-red-50'
          : !isComplete && total > 0
          ? 'border-yellow-500 bg-yellow-50'
          : 'border-blue-500 bg-blue-50'
      }
    >
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5" />
              Ringkasan Produksi
            </h3>
            {isComplete && !isOverTarget && (
              <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Sesuai Target
              </span>
            )}
            {isOverTarget && (
              <span className="text-red-600 text-sm font-medium flex items-center gap-1">
                <XCircle className="h-4 w-4" />
                Melebihi Target
              </span>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* Target */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Target</p>
              <p className="text-3xl font-bold">{target || 0}</p>
              <p className="text-xs text-muted-foreground">pcs</p>
            </div>

            {/* Success */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Berhasil</p>
              <p className="text-3xl font-bold text-green-600">{success || 0}</p>
              <p className="text-xs text-green-600 font-medium">
                {(successRate || 0).toFixed(1)}%
              </p>
            </div>

            {/* Waste */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Waste</p>
              <p className="text-3xl font-bold text-red-600">{waste || 0}</p>
              <p className="text-xs text-red-600 font-medium">
                {(wasteRate || 0).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {total} / {target} pcs
              </span>
            </div>
            <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
              {/* Success Bar */}
              <div
                className="absolute top-0 left-0 h-full bg-green-500 transition-all"
                style={{
                  width: `${Math.min((success / target) * 100, 100)}%`,
                }}
              />
              {/* Waste Bar */}
              <div
                className="absolute top-0 h-full bg-red-500 transition-all"
                style={{
                  left: `${Math.min((success / target) * 100, 100)}%`,
                  width: `${Math.min((waste / target) * 100, 100 - (success / target) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Status Message */}
          {total > 0 && (
            <div className="text-sm">
              {isOverTarget ? (
                <p className="text-red-700 font-medium">
                  ⚠️ Total input ({total}) melebihi target ({target})
                </p>
              ) : !isComplete ? (
                <p className="text-yellow-700 font-medium">
                  ⚠️ Total input ({total}) belum sesuai target ({target})
                </p>
              ) : (
                <p className="text-green-700 font-medium">
                  ✅ Total input sesuai dengan target
                </p>
              )}
            </div>
          )}

          {/* Waste Rate Warning */}
          {wasteRate > 15 && (
            <div className="bg-yellow-100 border border-yellow-300 rounded-md p-3 text-sm">
              <p className="text-yellow-800 font-medium">
                ⚠️ Waste rate tinggi ({wasteRate.toFixed(1)}%)
              </p>
              <p className="text-yellow-700 text-xs mt-1">
                Waste rate di atas 15% akan memicu alert ke owner untuk review
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
