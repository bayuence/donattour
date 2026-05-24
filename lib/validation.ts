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

// ============================================================================
// ORDER SCHEMAS
// ============================================================================

export const OrderItemSchema = z.object({
  product_id: z.string().min(1, 'Product ID required'),
  product_name: z.string().optional(),
  quantity: z.number().int().positive('Quantity must be positive'),
  unit_price: z.number().nonnegative('Price cannot be negative'),
  subtotal: z.number().nonnegative('Subtotal cannot be negative'),
})

export const CreateOrderSchema = z.object({
  outlet_id: z.string().min(1, 'Outlet ID required'),
  customer_name: z.string().optional(),
  items: z.array(OrderItemSchema).min(1, 'At least one item required'),
  payment_method: z.enum(['cash', 'card', 'qris', 'transfer']),
  paid_amount: z.number().nonnegative('Paid amount cannot be negative'),
  change_amount: z.number().nonnegative('Change cannot be negative').optional(),
})

export const UpdateOrderSchema = z.object({
  id: z.string().min(1),
  payment_status: z.enum(['unpaid', 'paid', 'refunded']).optional(),
  status: z.enum(['completed', 'cancelled']).optional(),
})

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>
export type UpdateOrderInput = z.infer<typeof UpdateOrderSchema>

// ============================================================================
// PRODUCT SCHEMAS
// ============================================================================

export const CreateProductSchema = z.object({
  nama: z.string().min(1, 'Product name required'),
  tipe_produk: z.enum(['donat_satuan', 'paket', 'bundling', 'custom']),
  ukuran: z.enum(['standar', 'mini']).optional(),
  harga: z.number().int().positive('Price must be positive'),
  hpp: z.number().int().nonnegative('HPP cannot be negative'),
})

export const UpdateProductSchema = CreateProductSchema.extend({
  id: z.string().min(1),
})

export type CreateProductInput = z.infer<typeof CreateProductSchema>

// ============================================================================
// INVENTORY SCHEMAS
// ============================================================================

export const UpdateInventorySchema = z.object({
  outlet_id: z.string().min(1),
  product_id: z.string().min(1),
  quantity: z.number().int().nonnegative('Quantity cannot be negative'),
})

export const DeductInventorySchema = z.object({
  outlet_id: z.string().min(1),
  product_id: z.string().min(1),
  quantity: z.number().int().positive('Quantity must be positive'),
  reason: z.string().optional(),
})

export type UpdateInventoryInput = z.infer<typeof UpdateInventorySchema>
export type DeductInventoryInput = z.infer<typeof DeductInventorySchema>

// ============================================================================
// PAGINATION SCHEMAS
// ============================================================================

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive('Page must be positive').default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
})

export type PaginationInput = z.infer<typeof PaginationSchema>

