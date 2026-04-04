-- ============================================================================
-- INSERT USER ADMIN PERTAMA
-- Jalankan ini di Supabase SQL Editor
-- ============================================================================

INSERT INTO users (username, password_hash, name, email, role, is_active)
VALUES ('admin', '1234', 'Admin Donattour', 'admin@donattour.com', 'admin', true);
