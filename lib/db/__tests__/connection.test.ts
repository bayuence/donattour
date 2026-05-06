/**
 * Supabase Connection Test
 * 
 * Simple test to verify Supabase connection is working
 * Run with: npm test lib/db/__tests__/connection.test.ts
 */

import { createClient } from '@/lib/supabase/server';
import { healthCheck } from '@/lib/supabase/client';

describe('Supabase Connection', () => {
  it('should create server client successfully', () => {
    const client = createClient();
    expect(client).toBeDefined();
  });

  it('should have valid environment variables', () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
  });

  it('should connect to database', async () => {
    const client = createClient();
    const { data, error } = await client.from('outlets').select('id').limit(1);
    
    expect(error).toBeNull();
    expect(data).toBeDefined();
  }, 10000); // 10 second timeout

  it('should pass health check', async () => {
    const isHealthy = await healthCheck();
    expect(isHealthy).toBe(true);
  }, 10000);
});
