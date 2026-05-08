/**
 * Zod Validation Schemas for Production Module
 */

import { z } from 'zod';
import { DonutSize } from '@/lib/types/database';

// ============================================================================
// PRODUCTION INPUT SCHEMAS
// ============================================================================

export const wasteDetailSchema = z.object({
  reason: z.string().min(5, 'Alasan waste minimal 5 karakter').max(200),
  qty: z.number().int().positive('Qty waste harus > 0'),
  hpp_per_pcs: z.number().positive('HPP per pcs harus > 0'),
});

export const createProductionSchema = z.object({
  outlet_id: z.string().uuid('Outlet ID harus valid UUID'),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  ukuran: z.nativeEnum(DonutSize, { message: 'Ukuran harus standar atau mini' }),
  target_qty: z.number().int().min(0, 'Target qty harus >= 0').optional(), // Optional karena auto-calculate
  success_qty: z.number().int().min(0, 'Success qty harus >= 0'),
  waste_details: z.array(wasteDetailSchema).default([]),
}).refine(
  (data) => {
    // ✅ VALIDASI: Minimal harus ada berhasil atau gagal (tidak boleh keduanya 0)
    const total_waste = data.waste_details.reduce((sum, w) => sum + w.qty, 0);
    return data.success_qty > 0 || total_waste > 0;
  },
  {
    message: 'Minimal harus ada qty berhasil atau gagal. Tidak boleh keduanya 0!',
    path: ['success_qty'],
  }
).refine(
  (data) => {
    // ✅ VALIDASI: Jika ada waste detail, harus lengkap
    if (data.waste_details.length > 0) {
      return data.waste_details.every(w => w.reason && w.qty > 0 && w.hpp_per_pcs > 0);
    }
    return true;
  },
  {
    message: 'Semua detail waste harus lengkap (alasan, qty, hpp)',
    path: ['waste_details'],
  }
);

export const getProductionListSchema = z.object({
  outlet_id: z.string().uuid().optional(),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ukuran: z.nativeEnum(DonutSize).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

// ============================================================================
// TYPES FROM SCHEMAS
// ============================================================================

export type CreateProductionInput = z.infer<typeof createProductionSchema>;
export type WasteDetailInput = z.infer<typeof wasteDetailSchema>;
export type GetProductionListInput = z.infer<typeof getProductionListSchema>;
