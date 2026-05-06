// ============================================================================
// HOOKS - BARREL EXPORT
// ============================================================================
// File: lib/hooks/index.ts
// Description: Central export point for all custom hooks
// Version: 1.0
// Date: 2026-05-02
// ============================================================================

// Production hooks
export {
  useProductionList,
  useProductionDetail,
  useCreateProduction,
  useUpdateProduction,
  useDeleteProduction,
} from './useProduction';

// Inventory hooks
export {
  useInventoryStock,
  useDeductStock,
} from './useInventory';

// Stock validation hooks (Task 4.1 - Complete implementation)
export {
  useStockValidation,
  useInventoryStock as useInventoryStockV2,
  usePrefetchStockValidation,
} from './useStockValidation';

// Dashboard hooks
export {
  useDashboardData,
  useWeeklyDashboard,
  useMonthlyDashboard,
  usePrefetchDashboard,
} from './useDashboard';

// Closing hooks
export {
  useClosingCheck,
  useClosingList,
  useClosingDetail,
  useCreateClosing,
} from './useClosing';

// Alert hooks
export {
  useAlerts,           // From context (real-time with polling)
  useAlertsList,       // From React Query (for list pages)
  useUnreadAlertCount, // From React Query (for badge)
  useMarkAlertAsRead,
  useMarkAllAlertsAsRead,
} from './useAlerts';
