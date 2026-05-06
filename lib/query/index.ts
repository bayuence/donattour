// ============================================================================
// QUERY UTILITIES - BARREL EXPORT
// ============================================================================
// File: lib/query/index.ts
// Description: Central export point for all query utilities
// Version: 1.0
// Date: 2026-05-02
// ============================================================================

// Query client and provider
export { QueryProvider } from './query-provider';
export { 
  createQueryClient, 
  getQueryClient, 
  getCacheConfig, 
  shouldRefetchOnInterval,
  cacheConfig,
  queryCacheConfig,
} from './query-client';

// Query keys
export { 
  queryKeys,
  getProductionInvalidationKeys,
  getClosingInvalidationKeys,
  getToppingErrorInvalidationKeys,
  getSaleInvalidationKeys,
} from './query-keys';

// Re-export types
export type {
  ProductionFilters,
  StockFilters,
  ClosingFilters,
  ToppingErrorFilters,
  AlertFilters,
  DashboardFilters,
} from './query-keys';
