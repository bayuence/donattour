// ============================================================================
// REACT QUERY PROVIDER
// ============================================================================
// File: lib/query/query-provider.tsx
// Description: QueryClientProvider wrapper with offline persistence
// Version: 2.0
// Date: 2026-05-08
// ============================================================================

'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { getQueryClient } from './query-client';
import { createIDBPersister } from '@/lib/offline/persister';
import { initSyncManager } from '@/lib/offline/sync';
import { useState, useEffect } from 'react';

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * QueryProvider component
 * 
 * Wraps the app with QueryClientProvider to enable React Query
 * 
 * Features:
 * - Creates a stable QueryClient instance per component mount
 * - Persists cache to IndexedDB for offline support
 * - Includes React Query Devtools in development
 * - Handles client-side hydration properly
 * - Initializes offline sync manager
 */
export function QueryProvider({ children }: QueryProviderProps) {
  // Create a stable QueryClient instance
  const [queryClient] = useState(() => getQueryClient());
  
  // Create IndexedDB persister — DISABLED in development to prevent cache conflicts
  const [persister] = useState(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      return createIDBPersister();
    }
    return undefined;
  });

  // Initialize sync manager on mount — DISABLED in development
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      initSyncManager();
    }
  }, []);

  // If persister is available (production only), use PersistQueryClientProvider
  if (persister) {
    return (
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
          buster: '', // Change this to invalidate all cached data
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              // Only persist successful queries
              return query.state.status === 'success';
            },
          },
        }}
      >
        {children}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools
            initialIsOpen={false}
            buttonPosition="bottom-right"
          />
        )}
      </PersistQueryClientProvider>
    );
  }

  // Development: plain QueryClientProvider (no IndexedDB, no SW, no crashes)
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}
