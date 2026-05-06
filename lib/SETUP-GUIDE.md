# Production Tracking System - Setup Guide

This guide explains how to set up and use the Supabase client and database utilities for the production tracking system.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Configuration](#configuration)
3. [Database Setup](#database-setup)
4. [Type Generation](#type-generation)
5. [Usage](#usage)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 18+ installed
- Supabase project created
- Database schema deployed (see `QueryDATABASE/31-production-tracking-system.sql`)
- Environment variables configured

## Configuration

### 1. Environment Variables

Create or update `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Verify Configuration

Check if Supabase is configured correctly:

```typescript
import { isSupabaseConfigured, healthCheck } from '@/lib/supabase/client';

console.log('Supabase configured:', isSupabaseConfigured);

const isHealthy = await healthCheck();
console.log('Supabase connection healthy:', isHealthy);
```

## Database Setup

### 1. Deploy Schema

Run the SQL migration files in order:

```bash
# 1. Deploy production tracking schema
psql -h your-db-host -U postgres -d postgres -f QueryDATABASE/31-production-tracking-system.sql

# 2. Deploy triggers
psql -h your-db-host -U postgres -d postgres -f QueryDATABASE/31-production-tracking-system-triggers.sql
```

Or use Supabase CLI:

```bash
supabase db push
```

### 2. Verify Tables

Check that all tables are created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'production_%' 
  OR table_name LIKE 'closing_%'
  OR table_name LIKE 'inventory_%'
  OR table_name LIKE 'topping_%'
  OR table_name = 'daily_loss_summary';
```

Expected tables:
- `production_daily`
- `production_waste_details`
- `inventory_non_topping`
- `topping_usage`
- `topping_errors`
- `daily_closing`
- `closing_non_topping_status`
- `closing_finished_products`
- `daily_loss_summary`

### 3. Set Up Row-Level Security (RLS)

Enable RLS on all tables:

```sql
ALTER TABLE production_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_non_topping ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_closing ENABLE ROW LEVEL SECURITY;
-- ... (repeat for all tables)
```

Create RLS policies (see design.md for complete policies):

```sql
-- Example: Users can only see data from their outlet
CREATE POLICY "Users can view own outlet data"
ON production_daily
FOR SELECT
USING (
  outlet_id IN (
    SELECT outlet_id 
    FROM users 
    WHERE id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 
    FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);
```

## Type Generation

### 1. Generate Database Types

Generate TypeScript types from your Supabase schema:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/types/database.ts
```

Or if using local development:

```bash
npx supabase gen types typescript --local > lib/types/database.ts
```

### 2. Verify Types

Check that types are generated correctly:

```typescript
import type { Database } from '@/lib/types/database';

// Should have no TypeScript errors
const table: keyof Database['public']['Tables'] = 'production_daily';
```

## Usage

### 1. Basic Setup

Import the necessary modules:

```typescript
// Supabase client
import { supabase, getCurrentUser } from '@/lib/supabase/client';

// Database helpers
import { 
  getProductionDaily, 
  createProductionDaily 
} from '@/lib/db/production-tracking';

// Transaction utilities
import { 
  executeTransaction, 
  createProductionTransaction 
} from '@/lib/utils/transaction';

// Authentication helpers
import { 
  getAuthUser, 
  hasPermission, 
  requireAuth 
} from '@/lib/utils/auth-helpers';
```

### 2. Authentication Flow

```typescript
// In a page or component
async function checkAuth() {
  const user = await getAuthUser();
  
  if (!user) {
    // Redirect to login
    router.push('/login');
    return;
  }
  
  // Check permissions
  if (!hasPermission(user.role, 'production:create')) {
    // Show error or redirect
    return;
  }
  
  // User is authenticated and authorized
  return user;
}
```

### 3. Database Operations

```typescript
// Create production with transaction
async function createProduction(data: any) {
  const user = await requireAuth();
  
  const result = await createProductionTransaction(
    {
      ...data,
      created_by: user.id,
    },
    data.wasteDetails
  );
  
  return result;
}

// Query production records
async function getProductions(outlet_id: string) {
  const productions = await getProductionDaily({
    outlet_id,
    tanggal: new Date().toISOString().split('T')[0],
  });
  
  return productions;
}
```

### 4. Error Handling

```typescript
import { TransactionError } from '@/lib/utils/transaction';

try {
  const result = await createProduction(data);
  return { success: true, data: result };
} catch (error) {
  if (error instanceof TransactionError) {
    console.error('Transaction failed:', error.message);
    return { 
      success: false, 
      error: 'Failed to save production. Changes have been rolled back.' 
    };
  }
  
  if (error instanceof Error && error.message.includes('Permission')) {
    return { 
      success: false, 
      error: 'You do not have permission to perform this action.' 
    };
  }
  
  return { 
    success: false, 
    error: 'An unexpected error occurred.' 
  };
}
```

## Testing

### 1. Test Database Connection

```typescript
import { healthCheck } from '@/lib/supabase/client';

const isHealthy = await healthCheck();
console.log('Database connection:', isHealthy ? 'OK' : 'FAILED');
```

### 2. Test Authentication

```typescript
import { getAuthUser } from '@/lib/utils/auth-helpers';

const user = await getAuthUser();
console.log('Current user:', user);
```

### 3. Test Database Operations

```typescript
import { getProductionDaily } from '@/lib/db/production-tracking';

const productions = await getProductionDaily({
  outlet_id: 'test-outlet-id',
  limit: 1,
});

console.log('Production records:', productions);
```

### 4. Test Transactions

```typescript
import { executeTransaction, insertWithRollback } from '@/lib/utils/transaction';

try {
  const result = await executeTransaction(async (ctx) => {
    const record = await insertWithRollback(ctx, 'production_daily', {
      outlet_id: 'test-outlet',
      tanggal: '2024-01-15',
      ukuran: 'standar',
      target_qty: 100,
      success_qty: 90,
      waste_qty: 10,
      total_hpp_loss: 30000,
    });
    
    // Simulate error to test rollback
    // throw new Error('Test rollback');
    
    return record;
  });
  
  console.log('Transaction successful:', result);
} catch (error) {
  console.error('Transaction failed (rolled back):', error);
}
```

## Troubleshooting

### Issue: "Supabase is not configured"

**Solution:**
1. Check `.env.local` file exists and has correct values
2. Restart development server after adding environment variables
3. Verify environment variables are loaded: `console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)`

### Issue: "Table does not exist"

**Solution:**
1. Verify database schema is deployed
2. Check table names match exactly (case-sensitive)
3. Run migrations in correct order

### Issue: "Permission denied" or "RLS policy violation"

**Solution:**
1. Check RLS policies are created correctly
2. Verify user has correct role in database
3. Check `auth.uid()` matches user ID in policies
4. Temporarily disable RLS for testing: `ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;`

### Issue: "Transaction rollback not working"

**Solution:**
1. Supabase client doesn't support traditional transactions
2. Use the transaction wrapper utilities which implement manual rollback
3. Ensure all operations use `insertWithRollback`, `updateWithRollback`, etc.

### Issue: "Type errors with database operations"

**Solution:**
1. Regenerate database types: `npx supabase gen types typescript`
2. Check TypeScript version is 5.0+
3. Verify imports are correct: `import type { Database } from '@/lib/types/database'`

### Issue: "Authentication not working"

**Solution:**
1. Check Supabase Auth is enabled in project settings
2. Verify JWT secret is configured
3. Check user exists in `auth.users` table
4. Verify user metadata includes role and outlet_id

## Best Practices

1. **Always use transactions** for multi-step operations
2. **Check permissions** before database operations
3. **Handle errors** appropriately with try-catch
4. **Use type-safe operations** with TypeScript types
5. **Filter queries** by outlet for performance and security
6. **Paginate large datasets** with limit and offset
7. **Log errors** for debugging and monitoring
8. **Test thoroughly** before deploying to production

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Production Tracking Design Document](.kiro/specs/production-tracking-system/design.md)
- [Production Tracking Requirements](.kiro/specs/production-tracking-system/requirements.md)

## Support

For issues or questions:
1. Check this guide first
2. Review example code in `lib/examples/production-tracking-usage.ts`
3. Check design document for business logic
4. Review database schema in `QueryDATABASE/31-production-tracking-system.sql`
