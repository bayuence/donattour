// ============================================================================
// WASTE REASON INPUT COMPONENT
// ============================================================================
// File: app/dashboard/input-produksi/components/WasteReasonInput.tsx
// Description: Input component untuk satu alasan waste
// Version: 1.0
// Date: 2026-05-03
// ============================================================================

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { WASTE_REASONS } from '@/lib/constants/production';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';

// ============================================================================
// TYPES
// ============================================================================

interface WasteReasonInputProps {
  index: number;
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  onRemove: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WasteReasonInput({
  index,
  register,
  errors,
  onRemove,
}: WasteReasonInputProps) {
  const fieldErrors: any = (errors.waste_details as any)?.[index];

  return (
    <Card className="border-red-200">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">
              Alasan Waste #{index + 1}
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Hapus
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor={`waste_details.${index}.reason`}>
                Alasan *
              </Label>
              <select
                id={`waste_details.${index}.reason`}
                {...register(`waste_details.${index}.reason`)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Pilih alasan...</option>
                {WASTE_REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
              {fieldErrors?.reason && (
                <p className="text-sm text-red-500">
                  {fieldErrors.reason.message as string}
                </p>
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor={`waste_details.${index}.qty`}>
                Jumlah (pcs) *
              </Label>
              <Input
                id={`waste_details.${index}.qty`}
                type="number"
                min="1"
                {...register(`waste_details.${index}.qty`, {
                  valueAsNumber: true,
                })}
                placeholder="0"
              />
              {fieldErrors?.qty && (
                <p className="text-sm text-red-500">
                  {fieldErrors.qty.message as string}
                </p>
              )}
            </div>

            {/* HPP per pcs */}
            <div className="space-y-2">
              <Label htmlFor={`waste_details.${index}.hpp_per_pcs`}>
                HPP per pcs (Rp) *
              </Label>
              <Input
                id={`waste_details.${index}.hpp_per_pcs`}
                type="number"
                min="1"
                {...register(`waste_details.${index}.hpp_per_pcs`, {
                  valueAsNumber: true,
                })}
                placeholder="2000"
              />
              {fieldErrors?.hpp_per_pcs && (
                <p className="text-sm text-red-500">
                  {fieldErrors.hpp_per_pcs.message as string}
                </p>
              )}
            </div>
          </div>

          {/* Calculated Loss */}
          <div className="bg-red-50 rounded-md p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">HPP Loss:</span>
              <span className="font-semibold text-red-700">
                (Akan dihitung otomatis)
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
