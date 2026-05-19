import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getNowWIB } from '@/lib/utils/timezone'; // ✅ WIB

// Define alert update type
type AlertUpdate = {
  is_read: boolean;
  read_at: string;
};

/**
 * PUT /api/alerts/[id]/read
 * 
 * Mark an alert as read
 * 
 * Params:
 * - id: Alert UUID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid alert ID format' 
          } 
        },
        { status: 400 }
      );
    }

    // Check if alert exists
    const { data: existingAlert, error: fetchError } = await supabase
      .from('alerts')
      .select('id, is_read')
      .eq('id', id)
      .single();

    if (fetchError || !existingAlert) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Alert not found' 
          } 
        },
        { status: 404 }
      );
    }

    // Type assertion for existingAlert
    const alert = existingAlert as { id: string; is_read: boolean };

    // If already read, return success without updating
    if (alert.is_read) {
      return NextResponse.json({
        success: true,
        data: alert,
        message: 'Alert already marked as read',
      });
    }

    // Prepare update data
    const updateData: AlertUpdate = {
      is_read: true,
      read_at: getNowWIB(), // ✅ WIB
    };

    // Mark as read
    const { data: updatedAlert, error: updateError } = await (supabase as any)
      .from('alerts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error marking alert as read:', updateError);
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'DATABASE_ERROR', 
            message: 'Failed to mark alert as read',
            details: updateError.message 
          } 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedAlert,
    });

  } catch (error) {
    console.error('Unexpected error in PUT /api/alerts/[id]/read:', error);
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
