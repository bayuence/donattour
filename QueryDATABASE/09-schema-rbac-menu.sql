-- ============================================================================
-- DONATTOUR DATABASE - RBAC MENU ACCESS (Role-Based Access Control)
-- ============================================================================
-- File: 09-schema-rbac-menu.sql
-- Description: Menambahkan pengaturan hak akses menu sidebar secara spesifik
--              ke dalam tabel employee_profiles.
-- ============================================================================

ALTER TABLE employee_profiles
ADD COLUMN IF NOT EXISTS accessible_menus JSONB DEFAULT '["DONATTOUR STORE", "DONATTOUR OTR", "DONATTOUR ONLINE", "DONATTOUR MANAGEMENT"]';

COMMENT ON COLUMN employee_profiles.accessible_menus IS 'Daftar nama grup menu Sidebar yang diperbolehkan diakses oleh user ini. Default: punya akses semua.';
