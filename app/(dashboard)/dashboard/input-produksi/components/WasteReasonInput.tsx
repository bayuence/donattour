// ============================================================================
// WASTE REASON INPUT COMPONENT
// ============================================================================
// File: app/dashboard/input-produksi/components/WasteReasonInput.tsx
// Description: Input component untuk detail alasan waste produksi
// Version: 1.0
// Date: 2026-05-09
// ============================================================================

'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';

interface WasteReasonInputProps {
  index: number;
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  onRemove: () => void;
}

export function WasteReasonInput({
  index,
  register,
  errors,
  onRemove,
}: WasteReasonInputProps) {
  const wasteDetails = errors.waste_details as any;
  const reasonError = wasteDetails?.[index]?.reason;
  const qtyError = wasteDetails?.[index]?.qty;
  const hppError = wasteDetails?.[index]?.hpp_per_pcs;

  return (
    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-slate-700">
          Alasan Gagal #{index + 1}
        </h4>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Reason */}
        <div className="md:col-span-2 space-y-1.5">
          <Label
            htmlFor={`waste_details.${index}.reason`}
            className="text-xs font-medium text-slate-600"
          >
            Alasan <span className="text-red-500">*</span>
          </Label>
          <Input
            id={`waste_details.${index}.reason`}
            {...register(`waste_details.${index}.reason`)}
            placeholder="Contoh: Gosong, Bentuk tidak sempurna, dll"
            className="h-10 text-sm border-slate-300 focus:border-red-500 focus:ring-red-500/20"
          />
          {reasonError && (
            <p className="text-xs text-red-600">
              {String(reasonError.message)}
            </p>
          )}
        </div>

        {/* Quantity */}
        <div className="space-y-1.5">
          <Label
            htmlFor={`waste_details.${index}.qty`}
            className="text-xs font-medium text-slate-600"
          >
            Qty <span className="text-red-500">*</span>
          </Label>
          <Input
            id={`waste_details.${index}.qty`}
            type="number"
            min="1"
            {...register(`waste_details.${index}.qty`, {
              valueAsNumber: true,
            })}
            placeholder="0"
            className="h-10 text-sm border-slate-300 focus:border-red-500 focus:ring-red-500/20"
          />
          {qtyError && (
            <p className="text-xs text-red-600">{String(qtyError.message)}</p>
          )}
        </div>
      </div>

      {/* HPP per pcs (hidden, auto-filled) */}
      <input
        type="hidden"
        {...register(`waste_details.${index}.hpp_per_pcs`, {
          valueAsNumber: true,
        })}
      />
      {hppError && (
        <p className="text-xs text-red-600">{String(hppError.message)}</p>
      )}
    </div>
  );
}
