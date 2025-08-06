-- Medicine Tracker Database Schema - Complete Setup
-- Execute this script in your Supabase SQL Editor for a fresh installation
-- Supports interval-based and meal-based scheduling approach

-- ============================================================================
-- MEDICINES TABLE
-- Stores medicine information with interval and meal-based scheduling support
-- ============================================================================

CREATE TABLE medicines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 100),
    dose TEXT NOT NULL CHECK (length(dose) >= 1 AND length(dose) <= 50),
    schedule_type TEXT NOT NULL CHECK (schedule_type IN ('interval', 'meal_based')),
    
    -- Interval-based scheduling fields
    interval_minutes INTEGER CHECK (interval_minutes > 0 AND interval_minutes <= 43200), -- Max 30 days
    interval_days INTEGER CHECK (interval_days > 0),
    
    -- Meal-based scheduling field
    meal_timing TEXT[] CHECK (array_length(meal_timing, 1) <= 5), -- Max 5 meal timings
    
    -- Optional fields
    instructions TEXT CHECK (length(instructions) <= 500),
    notes TEXT CHECK (length(notes) <= 500),
    active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints for scheduling validation
ALTER TABLE medicines 
ADD CONSTRAINT medicines_interval_check 
CHECK (
    schedule_type != 'interval' OR 
    (interval_minutes IS NOT NULL AND interval_minutes > 0)
);

-- Create indexes for medicines table
CREATE INDEX idx_medicines_user_id ON medicines(user_id);
CREATE INDEX idx_medicines_active ON medicines(user_id, active);
CREATE INDEX idx_medicines_schedule_type ON medicines(schedule_type);
CREATE INDEX idx_medicines_name ON medicines(user_id, name);

-- ============================================================================
-- MEDICINE LOGS TABLE  
-- Stores records of when medicines were actually taken
-- ============================================================================

CREATE TABLE medicine_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    medicine_id UUID REFERENCES medicines(id) ON DELETE CASCADE NOT NULL,
    taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Optional fields for enhanced tracking
    dosage_taken TEXT CHECK (length(dosage_taken) <= 100),
    notes TEXT CHECK (length(notes) <= 500),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for medicine_logs table
CREATE INDEX idx_medicine_logs_user_id ON medicine_logs(user_id);
CREATE INDEX idx_medicine_logs_medicine_id ON medicine_logs(medicine_id);
CREATE INDEX idx_medicine_logs_taken_at ON medicine_logs(taken_at);
CREATE INDEX idx_medicine_logs_user_taken_at ON medicine_logs(user_id, taken_at);
CREATE INDEX idx_medicine_logs_user_medicine ON medicine_logs(user_id, medicine_id);

-- ============================================================================
-- WEIGHT LOGS TABLE
-- Stores weight measurements with optional body composition data
-- ============================================================================

CREATE TABLE weight_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    weight_kg DECIMAL(5,2) NOT NULL CHECK (weight_kg > 0 AND weight_kg <= 1000),
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Optional enhancement fields
    notes TEXT CHECK (length(notes) <= 500),
    body_fat_percentage DECIMAL(4,1) CHECK (body_fat_percentage >= 0 AND body_fat_percentage <= 100),
    muscle_mass DECIMAL(5,2) CHECK (muscle_mass >= 0),
    unit VARCHAR(10) DEFAULT 'kg' CHECK (unit IN ('kg', 'lbs', 'pounds')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for weight_logs table
CREATE INDEX idx_weight_logs_user_id ON weight_logs(user_id);
CREATE INDEX idx_weight_logs_logged_at ON weight_logs(logged_at);
CREATE INDEX idx_weight_logs_user_logged_at ON weight_logs(user_id, logged_at);

-- ============================================================================
-- HELPER FUNCTIONS FOR VALIDATION
-- ============================================================================

-- Function to validate meal timing values
CREATE OR REPLACE FUNCTION validate_meal_timing(timing text[])
RETURNS boolean AS $$
BEGIN
    -- Return true if array is null or empty (for non-meal-based schedules)
    IF timing IS NULL OR array_length(timing, 1) IS NULL THEN
        RETURN true;
    END IF;
    
    -- Check if all values in the array are valid meal timing options
    RETURN (
        SELECT bool_and(timing_value = ANY(ARRAY['before_meal', 'after_meal', 'with_meal']))
        FROM unnest(timing) AS timing_value
    );
END;
$$ LANGUAGE plpgsql;

-- Add meal timing validation constraint
ALTER TABLE medicines 
ADD CONSTRAINT medicines_meal_timing_check 
CHECK (
    schedule_type != 'meal_based' OR 
    (meal_timing IS NOT NULL AND 
     array_length(meal_timing, 1) > 0 AND 
     validate_meal_timing(meal_timing))
);

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

CREATE POLICY "Users can view own weight logs" ON weight_logs 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight logs" ON weight_logs 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weight logs" ON weight_logs 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight logs" ON weight_logs 
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGER FUNCTIONS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic updated_at management
CREATE TRIGGER update_medicines_updated_at 
    BEFORE UPDATE ON medicines 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medicine_logs_updated_at 
    BEFORE UPDATE ON medicine_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weight_logs_updated_at 
    BEFORE UPDATE ON weight_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA (OPTIONAL - Uncomment to create test data)
-- ============================================================================

/*
-- Note: Replace 'your-user-id-here' with an actual user ID from auth.users after registration

-- Sample interval-based medicines
INSERT INTO medicines (user_id, name, dose, schedule_type, interval_minutes, instructions) VALUES
('your-user-id-here', 'Blood Pressure Medication', '10mg', 'interval', 720, 'Take every 12 hours with food'),
('your-user-id-here', 'Antibiotic', '500mg', 'interval', 480, 'Take every 8 hours'),
('your-user-id-here', 'Pain Relief', '200mg', 'interval', 360, 'Take every 6 hours as needed');

-- Sample meal-based medicines
INSERT INTO medicines (user_id, name, dose, schedule_type, meal_timing, instructions) VALUES
('your-user-id-here', 'Vitamin D', '1000 IU', 'meal_based', ARRAY['with_meal'], 'Take with breakfast'),
('your-user-id-here', 'Digestive Enzyme', '1 capsule', 'meal_based', ARRAY['before_meal'], 'Take 30 minutes before meals'),
('your-user-id-here', 'Probiotics', '1 tablet', 'meal_based', ARRAY['after_meal'], 'Take after dinner');

-- Sample medicine logs
INSERT INTO medicine_logs (user_id, medicine_id, taken_at, dosage_taken, notes) VALUES
('your-user-id-here', (SELECT id FROM medicines WHERE name = 'Vitamin D' LIMIT 1), NOW() - INTERVAL '1 day', '1000 IU', 'Took with breakfast'),
('your-user-id-here', (SELECT id FROM medicines WHERE name = 'Blood Pressure Medication' LIMIT 1), NOW() - INTERVAL '12 hours', '10mg', 'Evening dose'),
('your-user-id-here', (SELECT id FROM medicines WHERE name = 'Antibiotic' LIMIT 1), NOW() - INTERVAL '8 hours', '500mg', 'Course day 3');

-- Sample weight logs
INSERT INTO weight_logs (user_id, weight_kg, logged_at, notes, unit) VALUES
('your-user-id-here', 70.5, NOW() - INTERVAL '7 days', 'Morning weight after workout', 'kg'),
('your-user-id-here', 70.2, NOW() - INTERVAL '5 days', 'Morning weight', 'kg'),
('your-user-id-here', 70.0, NOW() - INTERVAL '3 days', 'Morning weight - good progress', 'kg'),
('your-user-id-here', 69.8, NOW() - INTERVAL '1 day', 'Morning weight', 'kg');
*/

-- ============================================================================
-- VERIFICATION AND TESTING QUERIES
-- ============================================================================

-- Verify table structures
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('medicines', 'medicine_logs', 'weight_logs')
ORDER BY table_name, ordinal_position;

-- Verify constraints
SELECT 
    table_name,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name IN ('medicines', 'medicine_logs', 'weight_logs')
ORDER BY table_name, constraint_type;

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
WHERE tablename IN ('medicines', 'medicine_logs', 'weight_logs')
ORDER BY tablename, policyname;

-- Verify indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('medicines', 'medicine_logs', 'weight_logs')
ORDER BY tablename, indexname;

-- Test meal timing validation function
SELECT validate_meal_timing(ARRAY['before_meal', 'with_meal']) AS valid_timing;
SELECT validate_meal_timing(ARRAY['invalid_timing']) AS invalid_timing;
SELECT validate_meal_timing(NULL) AS null_timing;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 Medicine Tracker Database Setup Complete!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Tables created successfully:';
    RAISE NOTICE '   - medicines (with interval & meal-based scheduling)';
    RAISE NOTICE '   - medicine_logs (with user tracking)';
    RAISE NOTICE '   - weight_logs (with kg storage & unit conversion)';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Security configured:';
    RAISE NOTICE '   - Row Level Security (RLS) enabled';
    RAISE NOTICE '   - User isolation policies active';
    RAISE NOTICE '   - Proper foreign key constraints';
    RAISE NOTICE '';
    RAISE NOTICE '⚡ Performance optimized:';
    RAISE NOTICE '   - Strategic indexes created';
    RAISE NOTICE '   - Automatic timestamp updates';
    RAISE NOTICE '   - Constraint validation functions';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your Medicine Tracker API is ready to use!';
    RAISE NOTICE '   - Supports interval-based scheduling (every X hours/days)';
    RAISE NOTICE '   - Supports meal-based scheduling (before/with/after meals)';
    RAISE NOTICE '   - Weight tracking with unit conversion';
    RAISE NOTICE '   - Complete audit trail with timestamps';
    RAISE NOTICE '';
    RAISE NOTICE '📚 Next steps:';
    RAISE NOTICE '   1. Update your backend routes (use *-updated.js versions)';
    RAISE NOTICE '   2. Create a .env file with your Supabase credentials';
    RAISE NOTICE '   3. Start your API server: npm run dev';
    RAISE NOTICE '   4. Test with: curl http://localhost:3001/health';
END $$;