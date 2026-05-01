import { z } from 'zod';

// ============================================================================
// MIDTRANS VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema untuk Create Transaction Request
 */
export const CreateTransactionSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .max(100_000_000, 'Amount too large (max 100 million)'),
  
  customerName: z.string()
    .min(1, 'Customer name required')
    .max(100, 'Customer name too long'),
  
  customerPhone: z.string()
    .regex(/^(\+62|62|0)[0-9]{9,12}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  
  items: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1).max(200),
    price: z.number().nonnegative(),
    quantity: z.number().positive().int(),
    category: z.string(),
  }))
    .min(1, 'At least one item required')
    .max(100, 'Too many items (max 100)'),
  
  outletId: z.string().uuid('Invalid outlet ID'),
  cashierId: z.string().uuid('Invalid cashier ID').optional(),
  channel: z.enum(['toko', 'gofood', 'grabfood', 'shopee', 'tiktok']),
});

/**
 * Schema untuk Save Order Request
 */
export const SaveOrderSchema = z.object({
  midtransOrderId: z.string().min(1, 'Midtrans order ID required'),
  midtransTransactionId: z.string().min(1, 'Midtrans transaction ID required'),
  paymentType: z.string().min(1, 'Payment type required'),
  outletId: z.string().uuid('Invalid outlet ID'),
  cashierId: z.string().uuid('Invalid cashier ID').optional(),
  customerName: z.string().min(1).max(100),
  customerPhone: z.string().optional().or(z.literal('')),
  channel: z.enum(['toko', 'gofood', 'grabfood', 'shopee', 'tiktok']),
  amount: z.number().positive('Amount must be positive'),
  items: z.array(z.any()).min(1, 'At least one item required'),
  
  // Optional Midtrans payment details
  vaNumbers: z.array(z.any()).optional(),
  billKey: z.string().optional(),
  store: z.string().optional(),
  paymentCode: z.string().optional(),
  acquirer: z.string().optional(),
  issuer: z.string().optional(),
});

/**
 * Schema untuk Midtrans Webhook
 */
export const MidtransWebhookSchema = z.object({
  order_id: z.string().min(1),
  transaction_id: z.string().min(1),
  transaction_status: z.enum(['capture', 'settlement', 'pending', 'deny', 'cancel', 'expire', 'failure']),
  fraud_status: z.enum(['accept', 'challenge', 'deny']).optional(),
  payment_type: z.string(),
  gross_amount: z.string(),
  signature_key: z.string(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate data dengan Zod schema dan return hasil
 * 
 * @param schema - Zod schema untuk validation
 * @param data - Data yang akan divalidasi
 * @returns Object dengan success flag dan data/errors
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * Format Zod errors untuk API response
 * 
 * @param error - Zod error object
 * @returns Formatted error object untuk client
 */
export function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }
  
  return formatted;
}

/**
 * Safe parse dengan Zod (tidak throw error)
 * 
 * @param schema - Zod schema
 * @param data - Data yang akan divalidasi
 * @returns SafeParseReturnType dari Zod
 */
export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown) {
  return schema.safeParse(data);
}
