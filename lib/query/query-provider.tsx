// ============================================================================
// REACT QUERY PROVIDER
// ============================================================================
// File: lib/query/query-provider.tsx
// Description: QueryClientProvider wrapper for Next.js App Router
// Version: 1.0
// Date: 2026-05-02
// ============================================================================

'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { getQueryClient } from './query-client';
import { useState } from 'react';

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
 * - Includes React Query Devtools in development
 * - Handles client-side hydration properly
 */
export function QueryProvider({ children }: QueryProviderProps) {
  // Create a stable QueryClient instance
  // Using useState ensures the client is created once per component mount
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* React Query Devtools - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}
