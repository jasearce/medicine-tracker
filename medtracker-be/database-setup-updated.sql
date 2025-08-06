-- Medicine Tracker Database Schema (Updated for Existing Schema)
-- Execute this script in your Supabase SQL Editor to update your existing tables

-- ============================================================================
-- UPDATE MEDICINES TABLE
-- Add missing fields to support full backend functionality
-- ============================================================================

-- Add missing columns to existing medicines table
ALTER TABLE medicines 
ADD COLUMN IF NOT EXISTS instructions TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update the schedule_type constraint to match your approach
ALTER TABLE medicines 
DROP CONSTRAINT IF EXISTS medicines_schedule_type_check;

ALTER TABLE medicines 
ADD CONSTRAINT medicines_schedule_type_check 
CHECK (schedule_type IN ('interval', 'meal_based'));

-- Rename 'dose' to 'dosage' for consistency (optional)
-- ALTER TABLE medicines RENAME COLUMN dose TO dosage;

-- Rename 'active' to 'is_active' for consistency (optional)
-- ALTER TABLE medicines RENAME COLUMN active TO is_active;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_medicines_user_id ON medicines(user_id);
CREATE INDEX IF NOT EXISTS idx_medicines_active ON medicines(user_id, active);
CREATE INDEX IF NOT EXISTS idx_medicines_schedule_type ON medicines(schedule_type);

-- ============================================================================
-- UPDATE MEDICINE_LOGS TABLE
-- Add missing fields for full functionality
-- ============================================================================

-- Add missing columns to existing medicine_logs table
ALTER TABLE medicine_logs 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS dosage_taken TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing records to set user_id based on medicine's user_id
UPDATE medicine_logs 
SET user_id = (
    SELECT m.user_id 
    FROM medicines m 
    WHERE m.id = medicine_logs.medicine_id
)
WHERE user_id IS NULL;

-- Make user_id NOT NULL after populating it
ALTER TABLE medicine_logs 
ALTER COLUMN user_id SET NOT NULL;

-- Create indexes for medicine_logs table
CREATE INDEX IF NOT EXISTS idx_medicine_logs_user_id ON medicine_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_medicine_logs_medicine_id ON medicine_logs(medicine_id);
CREATE INDEX IF NOT EXISTS idx_medicine_logs_taken_at ON medicine_logs(taken_at);
CREATE INDEX IF NOT EXISTS idx_medicine_logs_user_taken_at ON medicine_logs(user_id, taken_at);

-- ============================================================================
-- UPDATE WEIGHT_LOGS TABLE
-- Add optional fields for enhanced functionality
-- ============================================================================

-- Add optional columns to weight_logs table
ALTER TABLE weight_logs 
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS body_fat_percentage DECIMAL(4,1) CHECK (body_fat_percentage >= 0 AND body_fat_percentage <= 100),
ADD COLUMN IF NOT EXISTS muscle_mass DECIMAL(5,2) CHECK (muscle_mass >= 0),
ADD COLUMN IF NOT EXISTS unit VARCHAR(10) DEFAULT 'kg' CHECK (unit IN ('kg', 'lbs', 'pounds')),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Rename logged_at to measured_at for consistency (optional)
-- ALTER TABLE weight_logs RENAME COLUMN logged_at TO measured_at;

-- Create indexes for weight_logs table
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_id ON weight_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_logs_logged_at ON weight_logs(logged_at);
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_logged_at ON weight_logs(user_id, logged_at);

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
-- HELPER FUNCTIONS FOR MEAL-BASED SCHEDULING
-- ============================================================================

-- Function to validate meal timing values
CREATE OR REPLACE FUNCTION validate_meal_timing(timing text[])
RETURNS boolean AS $$
BEGIN
    -- Check if all values in the array are valid meal timing options
    RETURN (
        SELECT bool_and(timing_value = ANY(ARRAY['before_meal', 'after_meal', 'with_meal']))
        FROM unnest(timing) AS timing_value
    );
END;
$$ LANGUAGE plpgsql;

-- Add constraint to ensure meal_timing contains valid values
ALTER TABLE medicines 
DROP CONSTRAINT IF EXISTS medicines_meal_timing_check;

ALTER TABLE medicines 
ADD CONSTRAINT medicines_meal_timing_check 
CHECK (
    schedule_type != 'meal_based' OR 
    (meal_timing IS NOT NULL AND validate_meal_timing(meal_timing))
);

-- Add constraint to ensure interval fields are set for interval type
ALTER TABLE medicines 
DROP CONSTRAINT IF EXISTS medicines_interval_check;

ALTER TABLE medicines 
ADD CONSTRAINT medicines_interval_check 
CHECK (
    schedule_type != 'interval' OR 
    (interval_minutes IS NOT NULL AND interval_minutes > 0)
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table structures
\d medicines;
\d medicine_logs;
\d weight_logs;

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
    cmd
FROM pg_policies 
WHERE tablename IN ('medicines', 'medicine_logs', 'weight_logs');

-- Display success message
DO $$
BEGIN
    RAISE NOTICE 'Medicine Tracker database schema updated successfully!';
    RAISE NOTICE 'Tables updated: medicines, medicine_logs, weight_logs';
    RAISE NOTICE 'Row Level Security enabled with appropriate policies';
    RAISE NOTICE 'Schema now supports interval and meal-based scheduling';
    RAISE NOTICE 'Database is ready for the updated Medicine Tracker API';
END $$;