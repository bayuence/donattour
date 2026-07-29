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
  // Cast errors to `any` first to avoid TypeScript indexing issues with FieldError union type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wasteDetails = (errors as any).waste_details;
  const reasonError = wasteDetails?.[index]?.reason;
  const qtyError = wasteDetails?.[index]?.qty;
  const hppError = wasteDetails?.[index]?.hpp_per_pcs;

  return (
    <div className="flex items-start gap-3 p-2 bg-slate-50/50 rounded border border-slate-200">
      <div className="flex-1 space-y-1">
        <Input
          id={`waste_details.${index}.reason`}
          {...register(`waste_details.${index}.reason`)}
          placeholder="Alasan gagal (misal: gosong)"
          className="h-9 text-sm border-slate-300 focus:border-red-500"
        />
        {reasonError && (
          <p className="text-xs text-red-600">{String(reasonError.message)}</p>
        )}
      </div>

      <div className="w-24 space-y-1">
        <Input
          id={`waste_details.${index}.qty`}
          type="number"
          min="1"
          {...register(`waste_details.${index}.qty`, { valueAsNumber: true })}
          placeholder="Qty"
          className="h-9 text-sm border-slate-300 focus:border-red-500"
        />
        {qtyError && (
          <p className="text-xs text-red-600">{String(qtyError.message)}</p>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-100 flex-shrink-0"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
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
