/**
 * Zod Validation Schemas for Dashboard Module
 */

import { z } from 'zod';

// ============================================================================
// DASHBOARD SCHEMAS
// ============================================================================

export const getDashboardDailySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
  outlet_id: z.string().uuid('Outlet ID harus valid UUID').optional(),
  channel: z.string().optional(),
  mode: z.enum(['single', 'all', 'comparison']).default('single'),
  outlet_ids: z.array(z.string().uuid()).max(5, 'Maksimal 5 outlet untuk comparison').optional(),
});

export const getReportPeriodSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  outlet_id: z.string().uuid().optional(),
  group_by: z.enum(['day', 'week', 'month']).default('day'),
}).refine(
  (data) => {
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    return start <= end;
  },
  {
    message: 'Start date harus <= end date',
    path: ['end_date'],
  }
);

// ============================================================================
// TYPES FROM SCHEMAS
// ============================================================================

export type GetDashboardDailyInput = z.infer<typeof getDashboardDailySchema>;
export type GetReportPeriodInput = z.infer<typeof getReportPeriodSchema>;
