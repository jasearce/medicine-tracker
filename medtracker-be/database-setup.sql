-- Medicine Tracker Database Schema
-- Execute this script in your Supabase SQL Editor to set up the required tables

-- ============================================================================
-- MEDICINES TABLE
-- Stores medicine information including name, dosage, and schedule details
-- ============================================================================

CREATE TABLE IF NOT EXISTS medicines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    dosage VARCHAR(50) NOT NULL,
    schedule_type VARCHAR(20) CHECK (schedule_type IN ('daily', 'weekly', 'as_needed')) NOT NULL,
    schedule_times JSONB DEFAULT '[]'::jsonb,
    instructions TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for medicines table
CREATE INDEX IF NOT EXISTS idx_medicines_user_id ON medicines(user_id);
CREATE INDEX IF NOT EXISTS idx_medicines_active ON medicines(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_medicines_schedule_type ON medicines(schedule_type);

-- ============================================================================
-- MEDICINE LOGS TABLE
-- Stores records of when medicines were actually taken
-- ============================================================================

CREATE TABLE IF NOT EXISTS medicine_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    medicine_id UUID REFERENCES medicines(id) ON DELETE CASCADE NOT NULL,
    taken_at TIMESTAMPTZ NOT NULL,
    dosage_taken VARCHAR(50),
    notes TEXT,
    scheduled_time VARCHAR(5), -- HH:MM format for adherence tracking
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for medicine_logs table
CREATE INDEX IF NOT EXISTS idx_medicine_logs_user_id ON medicine_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_medicine_logs_medicine_id ON medicine_logs(medicine_id);
CREATE INDEX IF NOT EXISTS idx_medicine_logs_taken_at ON medicine_logs(taken_at);
CREATE INDEX IF NOT EXISTS idx_medicine_logs_user_taken_at ON medicine_logs(user_id, taken_at);

-- ============================================================================
-- WEIGHT LOGS TABLE
-- Stores weight measurements and body composition data
-- ============================================================================

CREATE TABLE IF NOT EXISTS weight_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    weight DECIMAL(5,2) NOT NULL CHECK (weight > 0 AND weight <= 1000),
    unit VARCHAR(10) CHECK (unit IN ('kg', 'lbs', 'pounds')) NOT NULL,
    measured_at TIMESTAMPTZ NOT NULL,
    notes TEXT,
    body_fat_percentage DECIMAL(4,1) CHECK (body_fat_percentage >= 0 AND body_fat_percentage <= 100),
    muscle_mass DECIMAL(5,2) CHECK (muscle_mass >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for weight_logs table
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_id ON weight_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_logs_measured_at ON weight_logs(measured_at);
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_measured_at ON weight_logs(user_id, measured_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensure users can only access their own data
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- MEDICINES TABLE POLICIES
-- ============================================================================

-- Drop existing policies if they exist (for re-running script)
DROP POLICY IF EXISTS "Users can view own medicines" ON medicines;
DROP POLICY IF EXISTS "Users can insert own medicines" ON medicines;
DROP POLICY IF EXISTS "Users can update own medicines" ON medicines;
DROP POLICY IF EXISTS "Users can delete own medicines" ON medicines;

-- Create medicines policies
CREATE POLICY "Users can view own medicines" ON medicines 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own medicines" ON medicines 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own medicines" ON medicines 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own medicines" ON medicines 
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- MEDICINE LOGS TABLE POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own medicine logs" ON medicine_logs;
DROP POLICY IF EXISTS "Users can insert own medicine logs" ON medicine_logs;
DROP POLICY IF EXISTS "Users can update own medicine logs" ON medicine_logs;
DROP POLICY IF EXISTS "Users can delete own medicine logs" ON medicine_logs;

-- Create medicine logs policies
CREATE POLICY "Users can view own medicine logs" ON medicine_logs 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own medicine logs" ON medicine_logs 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own medicine logs" ON medicine_logs 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own medicine logs" ON medicine_logs 
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- WEIGHT LOGS TABLE POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own weight logs" ON weight_logs;
DROP POLICY IF EXISTS "Users can insert own weight logs" ON weight_logs;
DROP POLICY IF EXISTS "Users can update own weight logs" ON weight_logs;
DROP POLICY IF EXISTS "Users can delete own weight logs" ON weight_logs;

-- Create weight logs policies
CREATE POLICY "Users can view own weight logs" ON weight_logs 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight logs" ON weight_logs 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weight logs" ON weight_logs 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight logs" ON weight_logs 
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- OPTIONAL: CREATE SAMPLE DATA (for testing)
-- ============================================================================

-- Uncomment the following section if you want to create sample data for testing
-- Note: Replace 'your-user-id-here' with an actual user ID from auth.users

/*
-- Sample medicines
INSERT INTO medicines (user_id, name, dosage, schedule_type, schedule_times, instructions) VALUES
('your-user-id-here', 'Vitamin D', '1000 IU', 'daily', '["08:00"]', 'Take with breakfast'),
('your-user-id-here', 'Omega-3', '500mg', 'daily', '["20:00"]', 'Take with dinner'),
('your-user-id-here', 'Multivitamin', '1 tablet', 'daily', '["08:00"]', 'Take with breakfast'),
('your-user-id-here', 'Ibuprofen', '200mg', 'as_needed', '[]', 'Take as needed for pain');

-- Sample medicine logs
INSERT INTO medicine_logs (user_id, medicine_id, taken_at, dosage_taken, notes) VALUES
('your-user-id-here', (SELECT id FROM medicines WHERE name = 'Vitamin D' LIMIT 1), NOW() - INTERVAL '1 day', '1000 IU', 'Took with breakfast'),
('your-user-id-here', (SELECT id FROM medicines WHERE name = 'Omega-3' LIMIT 1), NOW() - INTERVAL '1 day', '500mg', 'Took with dinner');

-- Sample weight logs
INSERT INTO weight_logs (user_id, weight, unit, measured_at, notes) VALUES
('your-user-id-here', 70.5, 'kg', NOW() - INTERVAL '7 days', 'Morning weight'),
('your-user-id-here', 70.2, 'kg', NOW() - INTERVAL '5 days', 'Morning weight'),
('your-user-id-here', 70.0, 'kg', NOW() - INTERVAL '3 days', 'Morning weight'),
('your-user-id-here', 69.8, 'kg', NOW() - INTERVAL '1 day', 'Morning weight');
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables were created successfully
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('medicines', 'medicine_logs', 'weight_logs')
ORDER BY table_name, ordinal_position;

-- Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('medicines', 'medicine_logs', 'weight_logs');

-- Verify policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('medicines', 'medicine_logs', 'weight_logs');

-- Display success message
DO $$
BEGIN
    RAISE NOTICE 'Medicine Tracker database schema setup completed successfully!';
    RAISE NOTICE 'Tables created: medicines, medicine_logs, weight_logs';
    RAISE NOTICE 'Row Level Security enabled with appropriate policies';
    RAISE NOTICE 'Database is ready for the Medicine Tracker API';
END $$;