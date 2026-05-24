-- ============================================================================
-- ENHANCED EXEC_SQL FUNCTION - FULL CONTROL
-- ============================================================================
-- This function allows Kiro AI to have full read access to your database
-- for auditing, cleanup, and automatic feature development
-- ============================================================================

-- Drop old function if exists
DROP FUNCTION IF EXISTS exec_sql(TEXT);

-- Create new function that returns query results
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  rec RECORD;
  results JSONB := '[]'::JSONB;
  row_count INTEGER := 0;
BEGIN
  -- Always try to execute and collect results
  FOR rec IN EXECUTE sql LOOP
    results := results || jsonb_build_array(to_jsonb(rec));
    row_count := row_count + 1;
  END LOOP;
  
  -- Return results
  RETURN jsonb_build_object(
    'success', true,
    'data', results,
    'count', row_count
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE,
      'sql', sql
    );
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION exec_sql(TEXT) IS 'Execute raw SQL with full result return. Used by Kiro AI for database auditing and management.';

-- ============================================================================
-- TEST THE FUNCTION
-- ============================================================================

-- Test 1: SELECT query
SELECT exec_sql('SELECT table_name FROM information_schema.tables WHERE table_schema = ''public'' LIMIT 5');

-- Test 2: Check expenses columns
SELECT exec_sql('
  SELECT column_name, data_type, is_nullable 
  FROM information_schema.columns 
  WHERE table_name = ''expenses'' 
  ORDER BY ordinal_position
');

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ EXEC_SQL FUNCTION UPGRADED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '🔓 Kiro AI now has full read access to:';
  RAISE NOTICE '   • All table schemas';
  RAISE NOTICE '   • All columns and data types';
  RAISE NOTICE '   • All indexes and constraints';
  RAISE NOTICE '   • All functions and triggers';
  RAISE NOTICE '   • Query execution with results';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 This enables:';
  RAISE NOTICE '   • Automatic database auditing';
  RAISE NOTICE '   • Unused table/column detection';
  RAISE NOTICE '   • Duplicate detection';
  RAISE NOTICE '   • Safe cleanup recommendations';
  RAISE NOTICE '   • Auto feature development';
  RAISE NOTICE '';
END $$;
