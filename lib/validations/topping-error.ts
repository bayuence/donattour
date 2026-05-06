/**
 * Zod Validation Schemas for Topping Error Module
 */

import { z } from 'zod';

// ============================================================================
// TOPPING ERROR SCHEMAS
// ============================================================================

export const createToppingErrorSchema = z.object({
  outlet_id: z.string().uuid('Outlet ID harus valid UUID'),
  product_ordered: z.string().min(1, 'Produk yang dipesan wajib diisi').max(100),
  product_made: z.string().min(1, 'Produk yang dibuat wajib diisi').max(100),
  qty: z.number().int().positive('Qty harus > 0'),
  reason: z.string().min(10, 'Alasan minimal 10 karakter').max(500),
}).refine(
  (data) => data.product_ordered !== data.product_made,
  {
    message: 'Produk yang dipesan dan dibuat harus berbeda',
    path: ['product_made'],
  }
);

export const getToppingErrorsSchema = z.object({
  outlet_id: z.string().uuid().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

// ============================================================================
// TYPES FROM SCHEMAS
// ============================================================================

export type CreateToppingErrorInput = z.infer<typeof createToppingErrorSchema>;
export type GetToppingErrorsInput = z.infer<typeof getToppingErrorsSchema>;
