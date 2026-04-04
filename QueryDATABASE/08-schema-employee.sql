-- ============================================================================
-- DONATTOUR DATABASE - HR & EMPLOYEE MANAGEMENT SCHEMA
-- ============================================================================
-- File: 08-schema-employee.sql
-- Description: Tambahan data profil mendalam untuk karyawan (Mini HR System)
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- Informasi Keuangan & Gaji
    bank_name VARCHAR(50),
    bank_account VARCHAR(100),
    bank_account_name VARCHAR(150),
    
    -- Informasi Darurat
    emergency_contact_name VARCHAR(150),
    emergency_contact_phone VARCHAR(50),
    
    -- Employment Details
    employment_type VARCHAR(50) DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'otr_driver', 'freelance')),
    join_date DATE DEFAULT CURRENT_DATE,
    
    -- Notes HR
    internal_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger untuk updated_at
CREATE TRIGGER update_employee_profiles_updated_at BEFORE UPDATE ON employee_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE employee_profiles IS 'Tabel pelengkap untuk sistem HR menyimpan rekening dan info darurat karyawan.';
