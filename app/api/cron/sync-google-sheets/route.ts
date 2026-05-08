// ============================================================================
// GOOGLE SHEETS SYNC CRON JOB
// ============================================================================
// File: app/api/cron/sync-google-sheets/route.ts
// Description: Cron job to process pending Google Sheets syncs
// Version: 1.0
// Date: May 8, 2026
// Schedule: Every 1 minute
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { syncTransactionToSheets, syncProductionToSheets } from '@/lib/integrations/google-sheets';

const supabase = createAdminClient();

// ============================================================================
// GET /api/cron/sync-google-sheets
// ============================================================================
// Process pending Google Sheets syncs
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (security) - only in production
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isProduction = process.env.NODE_ENV === 'production';

    // In production, require cron secret
    if (isProduction && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In development, allow without secret for easy testing
    if (!isProduction) {
      console.log('[Cron] Running in development mode - no auth required');
    }

    console.log('[Cron] Starting Google Sheets sync...');

    // Get pending syncs from database
    const { data: pendingSyncs, error } = await supabase.rpc('get_pending_google_sheets_syncs', {
      p_limit: 100, // Process 100 records per run
    });

    if (error) {
      console.error('[Cron] Error fetching pending syncs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!pendingSyncs || pendingSyncs.length === 0) {
      console.log('[Cron] No pending syncs');
      return NextResponse.json({
        success: true,
        message: 'No pending syncs',
        processed: 0,
      });
    }

    console.log(`[Cron] Found ${pendingSyncs.length} pending syncs`);

    // Process each sync
    let successCount = 0;
    let failedCount = 0;

    for (const sync of pendingSyncs) {
      try {
        let syncSuccess = false;

        if (sync.record_type === 'transaction') {
          syncSuccess = await syncTransactionToSheets(sync.record_data);
        } else if (sync.record_type === 'production') {
          syncSuccess = await syncProductionToSheets(sync.record_data);
        }

        // Update sync status
        if (syncSuccess) {
          await supabase.rpc('update_google_sheets_sync_status', {
            p_sync_id: sync.sync_id,
            p_status: 'success',
            p_error_message: null,
          });
          successCount++;
        } else {
          await supabase.rpc('update_google_sheets_sync_status', {
            p_sync_id: sync.sync_id,
            p_status: 'failed',
            p_error_message: 'Sync failed (unknown error)',
          });
          failedCount++;
        }
      } catch (syncError: any) {
        console.error(`[Cron] Error syncing ${sync.record_type}:`, syncError.message);

        // Update sync status to failed
        await supabase.rpc('update_google_sheets_sync_status', {
          p_sync_id: sync.sync_id,
          p_status: 'failed',
          p_error_message: syncError.message,
        });
        failedCount++;
      }
    }

    console.log(`[Cron] Sync completed: ${successCount} success, ${failedCount} failed`);

    return NextResponse.json({
      success: true,
      message: 'Sync completed',
      processed: pendingSyncs.length,
      success: successCount,
      failed: failedCount,
    });
  } catch (error: any) {
    console.error('[Cron] Error in sync job:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/cron/sync-google-sheets (Manual trigger)
// ============================================================================

export async function POST(request: NextRequest) {
  // Allow manual trigger without cron secret (for testing)
  return GET(request);
}
