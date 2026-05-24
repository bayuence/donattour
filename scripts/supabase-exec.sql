-- ============================================================================
-- HELPER FUNCTION: Execute Raw SQL
-- ============================================================================
-- This function allows executing raw SQL from Node.js scripts
-- IMPORTANT: Only create this if it doesn't exist yet
-- ============================================================================

CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  EXECUTE sql;
  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;

