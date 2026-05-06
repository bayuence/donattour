import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/alerts
 * 
 * Get list of alerts with filters
 * 
 * Query params:
 * - outlet_id: Filter by outlet (optional)
 * - user_id: Filter by user (optional)
 * - type: Filter by alert type (optional)
 * - severity: Filter by severity (info/warning/critical) (optional)
 * - is_read: Filter by read status (true/false) (optional)
 * - limit: Number of alerts to return (default: 10, max: 100)
 * - offset: Pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    
    // Check authentication
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const outlet_id = searchParams.get('outlet_id');
    const user_id = searchParams.get('user_id');
    const type = searchParams.get('type');
    const severity = searchParams.get('severity');
    const is_read = searchParams.get('is_read');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('alerts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (outlet_id) {
      query = query.eq('outlet_id', outlet_id);
    }

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    if (type) {
      query = query.eq('type', type);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    if (is_read !== null) {
      query = query.eq('is_read', is_read === 'true');
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: alerts, error, count } = await query;

    if (error) {
      console.error('Error fetching alerts:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to fetch alerts',
            details: error.message 
          } 
        },
        { status: 500 }
      );
    }

    // Get unread count
    let unreadQuery = supabase
      .from('alerts')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false);

    if (outlet_id) {
      unreadQuery = unreadQuery.eq('outlet_id', outlet_id);
    }

    if (user_id) {
      unreadQuery = unreadQuery.eq('user_id', user_id);
    }

    const { count: unreadCount } = await unreadQuery;

    return NextResponse.json({
      success: true,
      data: {
        items: alerts || [],
        pagination: {
          total: count || 0,
          limit,
          offset,
          has_more: (count || 0) > offset + limit,
        },
        unread_count: unreadCount || 0,
      },
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/alerts:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'An unexpected error occurred' 
        } 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/alerts
 * 
 * Create a new alert
 * 
 * Body:
 * - outlet_id: UUID (optional)
 * - user_id: UUID (optional)
 * - type: string (required)
 * - severity: 'info' | 'warning' | 'critical' (required)
 * - title: string (required, max 200 chars)
 * - message: string (required)
 * - metadata: object (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    
    // Check authentication
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { outlet_id, user_id, type, severity, title, message, metadata } = body;

    // Validate required fields
    if (!type || !severity || !title || !message) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Missing required fields: type, severity, title, message' 
          } 
        },
        { status: 400 }
      );
    }

    // Validate severity
    if (!['info', 'warning', 'critical'].includes(severity)) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid severity. Must be: info, warning, or critical' 
          } 
        },
        { status: 400 }
      );
    }

    // Validate title length
    if (title.length > 200) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Title must be 200 characters or less' 
          } 
        },
        { status: 400 }
      );
    }

    // Insert alert
    const { data: alert, error } = await (supabase as any)
      .from('alerts')
      .insert({
        outlet_id: outlet_id || null,
        user_id: user_id || null,
        type,
        severity,
        title,
        message,
        metadata: metadata || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating alert:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to create alert',
            details: error.message 
          } 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: alert,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Unexpected error in POST /api/alerts:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'An unexpected error occurred' 
        } 
      },
      { status: 500 }
    );
  }
}
