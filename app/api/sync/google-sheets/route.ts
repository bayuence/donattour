// ============================================================================
// GOOGLE SHEETS SYNC API
// ============================================================================
// File: app/api/sync/google-sheets/route.ts
// Description: API endpoint to sync data to Google Sheets
// Version: 1.0
// Date: May 8, 2026
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { syncTransactionToSheets, syncProductionToSheets, initializeGoogleSheets } from '@/lib/integrations/google-sheets';

// ============================================================================
// POST /api/sync/google-sheets
// ============================================================================
// Sync transaction or production to Google Sheets
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type, data' },
        { status: 400 }
      );
    }

    let success = false;

    if (type === 'transaction') {
      success = await syncTransactionToSheets(data);
    } else if (type === 'production') {
      success = await syncProductionToSheets(data);
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "transaction" or "production"' },
        { status: 400 }
      );
    }

    if (success) {
      return NextResponse.json({
        success: true,
        message: `${type} synced to Google Sheets successfully`,
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to sync to Google Sheets' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[API] Error syncing to Google Sheets:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET /api/sync/google-sheets?action=init
// ============================================================================
// Initialize Google Sheets with headers
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'init') {
      const success = await initializeGoogleSheets();

      if (success) {
        return NextResponse.json({
          success: true,
          message: 'Google Sheets initialized successfully',
        });
      } else {
        return NextResponse.json(
          { error: 'Failed to initialize Google Sheets' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid action. Use ?action=init' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[API] Error initializing Google Sheets:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
