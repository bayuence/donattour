/**
 * Zod Validation Schemas for Daily Closing Module
 */

import { z } from 'zod';
import { DonutSize } from '@/lib/types/database';

// ============================================================================
// CLOSING INPUT SCHEMAS
// ============================================================================

export const closingNonToppingSchema = z.object({
  ukuran: z.nativeEnum(DonutSize, { message: 'Ukuran harus standar atau mini' }),
  total_sisa: z.number().int().min(0, 'Total sisa harus >= 0'),
  qty_fresh: z.number().int().min(0, 'Qty fresh harus >= 0'),
  qty_aging: z.number().int().min(0, 'Qty aging harus >= 0'),
  qty_expired: z.number().int().min(0, 'Qty expired harus >= 0'),
  reason_expired: z.string().min(10, 'Alasan expired minimal 10 karakter').optional(),
}).refine(
  (data) => {
    if (data.qty_expired > 0 && (!data.reason_expired || data.reason_expired.trim().length < 10)) {
      return false;
    }
    return true;
  },
  {
    message: 'Alasan expired wajib diisi (min 10 karakter) jika ada qty expired',
    path: ['reason_expired'],
  }
).refine(
  (data) => {
    return data.total_sisa === data.qty_fresh + data.qty_aging + data.qty_expired;
  },
  {
    message: 'Total sisa harus sama dengan qty_fresh + qty_aging + qty_expired',
    path: ['total_sisa'],
  }
);

export const closingFinishedProductSchema = z.object({
  product_id: z.string().uuid('Product ID harus valid UUID').optional(),
  product_name: z.string().min(1, 'Nama produk wajib diisi'),
  total_sisa: z.number().int().min(0, 'Total sisa harus >= 0'),
  qty_fresh: z.number().int().min(0, 'Qty fresh harus >= 0'),
  qty_aging: z.number().int().min(0, 'Qty aging harus >= 0'),
  qty_reject: z.number().int().min(0, 'Qty reject harus >= 0'),
  reason_reject: z.string().min(10, 'Alasan reject minimal 10 karakter').optional(),
}).refine(
  (data) => {
    if (data.qty_reject > 0 && (!data.reason_reject || data.reason_reject.trim().length < 10)) {
      return false;
    }
    return true;
  },
  {
    message: 'Alasan reject wajib diisi (min 10 karakter) jika ada qty reject',
    path: ['reason_reject'],
  }
).refine(
  (data) => {
    return data.total_sisa === data.qty_fresh + data.qty_aging + data.qty_reject;
  },
  {
    message: 'Total sisa harus sama dengan qty_fresh + qty_aging + qty_reject',
    path: ['total_sisa'],
  }
).refine(
  (data) => {
    return data.total_sisa > 0;
  },
  {
    message: 'Total sisa harus > 0',
    path: ['total_sisa'],
  }
);

export const createClosingSchema = z.object({
  outlet_id: z.string().uuid('Outlet ID harus valid UUID'),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  non_topping_status: z.array(closingNonToppingSchema).min(1, 'Minimal 1 status non-topping'),
  finished_products: z.array(closingFinishedProductSchema).default([]),
  notes: z.string().max(500, 'Notes maksimal 500 karakter').optional(),
}).refine(
  (data) => {
    // Validate: harus ada entry untuk standar dan mini
    const sizes = data.non_topping_status.map(s => s.ukuran);
    return sizes.includes(DonutSize.STANDAR) && sizes.includes(DonutSize.MINI);
  },
  {
    message: 'Harus ada status untuk ukuran standar dan mini',
    path: ['non_topping_status'],
  }
);

export const getClosingCheckSchema = z.object({
  outlet_id: z.string().uuid('Outlet ID harus valid UUID'),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
});

// ============================================================================
// TYPES FROM SCHEMAS
// ============================================================================

export type CreateClosingInput = z.infer<typeof createClosingSchema>;
export type ClosingNonToppingInput = z.infer<typeof closingNonToppingSchema>;
export type ClosingFinishedProductInput = z.infer<typeof closingFinishedProductSchema>;
export type GetClosingCheckInput = z.infer<typeof getClosingCheckSchema>;
