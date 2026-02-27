CREATE TABLE IF NOT EXISTS discount_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    percentage INTEGER NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: You may also need to set up RLS policies depending on your Supabase security settings,
-- allowing read access to public, and read/write access to Admin.
--
-- Example:
-- ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable read access for all users" ON discount_codes FOR SELECT USING (true);
-- CREATE POLICY "Enable insert/update/delete for authenticated" ON discount_codes FOR ALL USING (auth.role() = 'authenticated');
