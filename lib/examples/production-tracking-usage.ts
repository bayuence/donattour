/**
 * Production Tracking System - Usage Examples
 * 
 * This file demonstrates how to use the production tracking utilities
 * in various scenarios.
 * 
 * DO NOT IMPORT THIS FILE IN PRODUCTION CODE
 * This is for reference and documentation purposes only
 */

// ============================================================================
// EXAMPLE 1: Input Produksi Harian (Bagian Dapur)
// ============================================================================

import { createProductionTransaction } from '@/lib/utils/transaction';
import { getAuthUser, validateProductionInputPermission } from '@/lib/utils/auth-helpers';
import { checkProductionExists } from '@/lib/db/production-tracking';

async function exampleInputProduksi() {
  // Step 1: Authenticate and authorize
  const user = await getAuthUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const outlet_id = 'outlet-123';
  await validateProductionInputPermission(user, outlet_id);

  // Step 2: Check if production already exists
  const tanggal = new Date().toISOString().split('T')[0];
  const exists = await checkProductionExists(outlet_id, tanggal, 'standar');
  
  if (exists) {
    throw new Error('Produksi sudah diinput untuk hari ini');
  }

  // Step 3: Prepare production data
  const productionData = {
    outlet_id,
    tanggal,
    ukuran: 'standar' as const,
    target_qty: 300,
    success_qty: 280,
    waste_qty: 20,
    total_hpp_loss: 60000,
    created_by: user.id,
  };

  const wasteDetails = [
    {
      reason: 'gosong',
      qty: 10,
      hpp_per_pcs: 3000,
    },
    {
      reason: 'bentuk_jelek',
      qty: 10,
      hpp_per_pcs: 3000,
    },
  ];

  // Step 4: Create production with transaction (atomic operation)
  try {
    const result = await createProductionTransaction(productionData, wasteDetails);
    
    console.log('Production created:', result.production);
    console.log('Waste details:', result.waste_details);
    
    return result;
  } catch (error) {
    console.error('Failed to create production:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 2: Validasi Kasir (Kasir)
// ============================================================================

import { validateKasirCanOperate, getStockSummary } from '@/lib/db/production-tracking';
import { validateKasirPermission } from '@/lib/utils/auth-helpers';

async function exampleValidasiKasir() {
  // Step 1: Authenticate and authorize
  const user = await getAuthUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const outlet_id = user.outlet_id || 'outlet-123';
  await validateKasirPermission(user, outlet_id);

  // Step 2: Validate kasir can operate
  const tanggal = new Date().toISOString().split('T')[0];
  const validation = await validateKasirCanOperate(outlet_id, tanggal);

  if (!validation.can_operate) {
    // Show blocking modal
    return {
      blocked: true,
      message: validation.message,
    };
  }

  // Step 3: Get stock summary
  const stockSummary = await getStockSummary(outlet_id, tanggal);

  return {
    blocked: false,
    stock: {
      standar: stockSummary.standar.total_available,
      mini: stockSummary.mini.total_available,
    },
  };
}

// ============================================================================
// EXAMPLE 3: Lapor Kesalahan Topping (Kasir)
// ============================================================================

import { createToppingError } from '@/lib/db/production-tracking';

async function exampleLaporKesalahanTopping() {
  // Step 1: Authenticate
  const user = await getAuthUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Step 2: Prepare topping error data
  const toppingErrorData = {
    outlet_id: user.outlet_id || 'outlet-123',
    kasir_id: user.id,
    tanggal: new Date().toISOString().split('T')[0],
    product_ordered: 'Donat Coklat Standar',
    product_made: 'Donat Strawberry Standar',
    qty: 1,
    hpp_loss: 5000, // HPP 3000 + Topping 2000
    reason: 'Salah dengar pesanan customer',
  };

  // Step 3: Create topping error record
  try {
    const result = await createToppingError(toppingErrorData);
    
    console.log('Topping error reported:', result);
    
    return result;
  } catch (error) {
    console.error('Failed to report topping error:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 4: Closing Harian (Closing Staff)
// ============================================================================

import { createClosingTransaction } from '@/lib/utils/transaction';
import { validateClosingPermission } from '@/lib/utils/auth-helpers';
import { checkClosingExists } from '@/lib/db/production-tracking';

async function exampleClosingHarian() {
  // Step 1: Authenticate and authorize
  const user = await getAuthUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const outlet_id = user.outlet_id || 'outlet-123';
  await validateClosingPermission(user, outlet_id);

  // Step 2: Check if closing already exists
  const tanggal = new Date().toISOString().split('T')[0];
  const exists = await checkClosingExists(outlet_id, tanggal);
  
  if (exists) {
    throw new Error('Closing sudah dilakukan untuk hari ini');
  }

  // Step 3: Prepare closing data
  const closingData = {
    outlet_id,
    tanggal,
    closed_by: user.id,
    notes: 'Closing normal, tidak ada masalah',
  };

  const nonToppingStatus = [
    {
      ukuran: 'standar' as const,
      total_sisa: 50,
      qty_fresh: 40,
      qty_aging: 5,
      qty_expired: 5,
      hpp_loss_expired: 15000,
      reason_expired: 'Donat terlalu lama, sudah keras',
    },
    {
      ukuran: 'mini' as const,
      total_sisa: 20,
      qty_fresh: 15,
      qty_aging: 5,
      qty_expired: 0,
      hpp_loss_expired: 0,
      reason_expired: null,
    },
  ];

  const finishedProducts = [
    {
      product_id: 'product-123',
      product_name: 'Donat Coklat Standar',
      total_sisa: 10,
      qty_fresh: 8,
      qty_aging: 2,
      qty_reject: 0,
      hpp_topping_loss: 0,
      reason_reject: null,
    },
    {
      product_id: 'product-456',
      product_name: 'Donat Strawberry Standar',
      total_sisa: 5,
      qty_fresh: 3,
      qty_aging: 0,
      qty_reject: 2,
      hpp_topping_loss: 10000,
      reason_reject: 'Topping meleleh, tidak layak jual',
    },
  ];

  // Step 4: Create closing with transaction (atomic operation)
  try {
    const result = await createClosingTransaction(
      closingData,
      nonToppingStatus,
      finishedProducts
    );
    
    console.log('Closing created:', result.closing);
    console.log('Loss summary:', result.loss_summary);
    
    return result;
  } catch (error) {
    console.error('Failed to create closing:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 5: Dashboard Owner (Owner/Manager)
// ============================================================================

import {
  getProductionDaily,
  getToppingErrors,
  getDailyLossSummary,
} from '@/lib/db/production-tracking';
import { validateDashboardPermission, getOutletFilter } from '@/lib/utils/auth-helpers';

async function exampleDashboardOwner() {
  // Step 1: Authenticate and authorize
  const user = await getAuthUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  await validateDashboardPermission(user);

  // Step 2: Get outlet filter based on user role
  const outletFilter = await getOutletFilter(user);

  // Step 3: Fetch dashboard data
  const tanggal = new Date().toISOString().split('T')[0];

  const [productions, toppingErrors, lossSummary] = await Promise.all([
    getProductionDaily({
      outlet_id: typeof outletFilter === 'string' ? outletFilter : undefined,
      tanggal,
    }),
    getToppingErrors({
      outlet_id: typeof outletFilter === 'string' ? outletFilter : undefined,
      tanggal,
    }),
    getDailyLossSummary({
      outlet_id: typeof outletFilter === 'string' ? outletFilter : undefined,
      tanggal,
    }),
  ]);

  // Step 4: Calculate metrics
  const totalProduction = productions.reduce(
    (sum, p) => sum + p.success_qty,
    0
  );
  const totalWaste = productions.reduce((sum, p) => sum + p.waste_qty, 0);
  const wasteRate = totalProduction > 0 ? (totalWaste / totalProduction) * 100 : 0;

  const totalLoss = lossSummary.reduce((sum, l) => sum + l.total_loss, 0);

  return {
    production: {
      total: totalProduction,
      waste: totalWaste,
      waste_rate: wasteRate,
    },
    topping_errors: {
      count: toppingErrors.length,
      total_loss: toppingErrors.reduce((sum, e) => sum + e.hpp_loss, 0),
    },
    loss: {
      total: totalLoss,
      breakdown: lossSummary,
    },
  };
}

// ============================================================================
// EXAMPLE 6: Permission Checking (Component Level)
// ============================================================================

import { hasPermission, canAccessRoute } from '@/lib/utils/auth-helpers';

async function examplePermissionChecking() {
  const user = await getAuthUser();
  if (!user) {
    return { canView: false };
  }

  // Check specific permission
  const canCreateProduction = hasPermission(user.role, 'production:create');
  const canExportReports = hasPermission(user.role, 'reports:export');

  // Check route access
  const canAccessInputProduksi = canAccessRoute(
    '/dashboard/input-produksi',
    user.role
  );
  const canAccessDashboardOwner = canAccessRoute(
    '/dashboard/dashboard-owner',
    user.role
  );

  return {
    canView: true,
    permissions: {
      canCreateProduction,
      canExportReports,
    },
    routes: {
      canAccessInputProduksi,
      canAccessDashboardOwner,
    },
  };
}

// ============================================================================
// EXAMPLE 7: Error Handling Best Practices
// ============================================================================

import { TransactionError } from '@/lib/utils/transaction';

async function exampleErrorHandling() {
  try {
    // Attempt to create production
    const result = await createProductionTransaction(
      {
        outlet_id: 'outlet-123',
        tanggal: '2024-01-15',
        ukuran: 'standar',
        target_qty: 300,
        success_qty: 280,
        waste_qty: 20,
        total_hpp_loss: 60000,
        created_by: 'user-123',
      },
      []
    );

    return { success: true, data: result };
  } catch (error) {
    // Handle transaction errors
    if (error instanceof TransactionError) {
      console.error('Transaction failed:', error.message);
      console.error('Failed operation:', error.failedOperation);
      console.error('Original error:', error.originalError);

      return {
        success: false,
        error: {
          type: 'transaction',
          message: error.message,
          operation: error.failedOperation,
        },
      };
    }

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Authentication')) {
      return {
        success: false,
        error: {
          type: 'auth',
          message: 'Please login to continue',
        },
      };
    }

    // Handle authorization errors
    if (error instanceof Error && error.message.includes('Permission')) {
      return {
        success: false,
        error: {
          type: 'permission',
          message: 'You do not have permission to perform this action',
        },
      };
    }

    // Handle generic errors
    return {
      success: false,
      error: {
        type: 'unknown',
        message: 'An unexpected error occurred',
      },
    };
  }
}

// ============================================================================
// EXPORT EXAMPLES (for documentation purposes only)
// ============================================================================

export const examples = {
  exampleInputProduksi,
  exampleValidasiKasir,
  exampleLaporKesalahanTopping,
  exampleClosingHarian,
  exampleDashboardOwner,
  examplePermissionChecking,
  exampleErrorHandling,
};
