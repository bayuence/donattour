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
    <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-red-100 flex items-center justify-center text-red-600 text-xs font-bold">
            {index + 1}
          </div>
          <span className="text-sm font-semibold text-slate-700">Alasan Gagal</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Reason - Text Input Bebas */}
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor={`waste_details.${index}.reason`} className="text-sm font-medium text-slate-700">
            Alasan <span className="text-red-500">*</span>
          </Label>
          <Input
            id={`waste_details.${index}.reason`}
            type="text"
            {...register(`waste_details.${index}.reason`)}
            placeholder="Contoh: Gosong, Bentuk tidak sempurna, Adonan gagal..."
            className="h-11 rounded-lg border-slate-300 shadow-sm focus:border-red-500 focus:ring-red-500/20"
          />
          {fieldErrors?.reason && (
            <p className="text-xs text-red-600">{fieldErrors.reason.message as string}</p>
          )}
          <p className="text-xs text-slate-500">Min. 5 karakter</p>
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <Label htmlFor={`waste_details.${index}.qty`} className="text-sm font-medium text-slate-700">
            Jumlah (pcs) <span className="text-red-500">*</span>
          </Label>
          <Input
            id={`waste_details.${index}.qty`}
            type="number"
            min="1"
            {...register(`waste_details.${index}.qty`, {
              valueAsNumber: true,
            })}
            placeholder="0"
            className="h-11 rounded-lg border-slate-300 shadow-sm focus:border-red-500 focus:ring-red-500/20 text-base font-medium"
          />
          {fieldErrors?.qty && (
            <p className="text-xs text-red-600">{fieldErrors.qty.message as string}</p>
          )}
        </div>
      </div>

      {/* HPP per pcs - READ ONLY (Hidden, auto from master) */}
      <input
        type="hidden"
        {...register(`waste_details.${index}.hpp_per_pcs`, {
          valueAsNumber: true,
        })}
      />
    </div>
  );
}
