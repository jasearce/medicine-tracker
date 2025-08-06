# Schema Integration Guide

This guide explains how to integrate the Medicine Tracker backend with your existing database schema approach.

## 🔄 Schema Differences Summary

### Your Current Schema vs. Original Implementation

| Component | Your Schema | Original Schema | Status |
|-----------|-------------|-----------------|---------|
| **Medicines** | ✅ Excellent approach | Different but compatible | **Use updated routes** |
| **Medicine Logs** | ⚠️ Missing fields | More comprehensive | **Needs enhancement** |
| **Weight Logs** | ✅ Good foundation | Optional enhancements | **Use updated routes** |

## 📋 Required Changes

### 1. **Medicine Logs Table** - Critical Updates Needed

Your current schema:
```sql
CREATE TABLE medicine_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id uuid REFERENCES medicines(id),
  taken_at   timestamptz NOT NULL DEFAULT now()
);
```

**Required additions:**
```sql
-- Add user_id for RLS and direct user queries
ALTER TABLE medicine_logs 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add optional fields for enhanced functionality
ALTER TABLE medicine_logs 
ADD COLUMN dosage_taken TEXT,
ADD COLUMN notes TEXT,
ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Populate user_id from existing medicine records
UPDATE medicine_logs 
SET user_id = (
    SELECT m.user_id 
    FROM medicines m 
    WHERE m.id = medicine_logs.medicine_id
)
WHERE user_id IS NULL;

-- Make user_id NOT NULL
ALTER TABLE medicine_logs 
ALTER COLUMN user_id SET NOT NULL;
```

### 2. **Medicines Table** - Minor Enhancements

Your schema is excellent! Optional additions:
```sql
-- Add optional fields for full backend compatibility
ALTER TABLE medicines 
ADD COLUMN IF NOT EXISTS instructions TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
```

### 3. **Weight Logs Table** - Optional Enhancements

Your schema works perfectly! Optional additions:
```sql
-- Add optional fields for enhanced functionality
ALTER TABLE weight_logs 
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS body_fat_percentage DECIMAL(4,1),
ADD COLUMN IF NOT EXISTS muscle_mass DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS unit VARCHAR(10) DEFAULT 'kg',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
```

## 🔄 File Updates Required

### 1. Replace Route Files

**Replace these files with the updated versions:**

```bash
# Replace original routes with schema-compatible versions
cp routes/medicines-updated.js routes/medicines.js
cp routes/medicineLogs-updated.js routes/medicineLogs.js  
cp routes/weights-updated.js routes/weights.js
```

### 2. Update Server.js References

Your `server.js` should work as-is, but ensure these imports:
```javascript
const medicineRoutes = require('./routes/medicines');
const medicineLogRoutes = require('./routes/medicineLogs');
const weightRoutes = require('./routes/weights');
```

## 🔐 Row Level Security Setup

**Essential for data security:**

```sql
-- Enable RLS
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;

-- Medicines policies
CREATE POLICY "Users can manage own medicines" ON medicines 
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Medicine logs policies  
CREATE POLICY "Users can manage own medicine logs" ON medicine_logs 
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Weight logs policies
CREATE POLICY "Users can manage own weight logs" ON weight_logs 
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

## 📊 Schedule Type Mapping

### Your Interval-Based Approach

**Advantages:**
- More flexible than fixed daily/weekly schedules
- Supports complex medication timing (every X hours/days)
- Real-world medical accuracy

**API Usage Examples:**

```javascript
// Every 8 hours medication
{
  "name": "Antibiotic",
  "dose": "500mg",
  "scheduleType": "interval",
  "intervalMinutes": 480,  // 8 hours
  "intervalDays": null
}

// Every 12 hours for 7 days
{
  "name": "Pain Reliever", 
  "dose": "200mg",
  "scheduleType": "interval",
  "intervalMinutes": 720,  // 12 hours
  "intervalDays": 7
}

// Meal-based medication
{
  "name": "Vitamin D",
  "dose": "1000 IU", 
  "scheduleType": "meal_based",
  "mealTiming": ["before_meal", "with_meal"]
}
```

## 🚀 Step-by-Step Integration

### Step 1: Update Database Schema
```sql
-- Run the database-setup-updated.sql script
-- This adds missing fields and RLS policies
```

### Step 2: Replace Route Files
```bash
cd medtracker-be/routes/
mv medicines.js medicines-original.js
mv medicineLogs.js medicineLogs-original.js  
mv weights.js weights-original.js

cp medicines-updated.js medicines.js
cp medicineLogs-updated.js medicineLogs.js
cp weights-updated.js weights.js
```

### Step 3: Test the API
```bash
# Start the server
npm run dev

# Test endpoints
curl http://localhost:3001/health
curl -X GET http://localhost:3001/api/medicines \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🎯 Key Benefits of Your Schema Approach

### 1. **Interval-Based Scheduling**
- ✅ More medically accurate
- ✅ Supports complex timing (every 6 hours, every other day)
- ✅ Better adherence tracking
- ✅ Real-world flexibility

### 2. **Meal-Based Scheduling**  
- ✅ Natural for many medications
- ✅ Easy to understand and follow
- ✅ Flexible meal timing options

### 3. **Simplified Weight Tracking**
- ✅ Consistent kg storage
- ✅ Clean, simple schema
- ✅ Easy unit conversion in API

## 🔧 Updated Route Features

### Medicines Routes (`/api/medicines`)
- ✅ Full CRUD with interval/meal_based scheduling
- ✅ Next dose calculation for interval medications
- ✅ Search and filtering by schedule type
- ✅ Validation for both scheduling approaches

### Medicine Logs Routes (`/api/medicine-logs`)
- ✅ Simple logging with medicine_id + taken_at
- ✅ Adherence analytics for interval-based meds
- ✅ Duplicate prevention
- ✅ Optional dosage_taken and notes fields

### Weight Routes (`/api/weights`)
- ✅ kg-based storage with unit conversion
- ✅ Timeline and trend analysis
- ✅ Optional body composition tracking
- ✅ Flexible querying and filtering

## 🛡️ Security Considerations

1. **Row Level Security** - Essential for multi-user safety
2. **User ID Validation** - All operations verified against authenticated user
3. **Input Validation** - Comprehensive validation for all fields
4. **Medicine Ownership** - Users can only access their own medicines/logs

## 📱 Frontend Integration Examples

### Creating an Interval Medicine
```javascript
const createMedicine = async (medicineData) => {
  const response = await fetch('/api/medicines', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: "Blood Pressure Med",
      dose: "10mg",
      scheduleType: "interval", 
      intervalMinutes: 720, // Every 12 hours
      instructions: "Take with food"
    })
  });
  return response.json();
};
```

### Logging Medicine Intake
```javascript
const logMedicine = async (medicineId) => {
  const response = await fetch('/api/medicine-logs', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      medicineId: medicineId,
      takenAt: new Date().toISOString(),
      notes: "Taken with breakfast"
    })
  });
  return response.json();
};
```

## ✅ Validation Checklist

- [ ] Database schema updated with required fields
- [ ] RLS policies enabled and tested
- [ ] Route files replaced with updated versions
- [ ] Server starts without errors
- [ ] Health check endpoint responds
- [ ] Medicine CRUD operations work
- [ ] Medicine logging works
- [ ] Weight logging works
- [ ] Authentication middleware functioning
- [ ] User can only see their own data

Your schema approach is excellent and more medically accurate than the original design! The updated routes fully support your interval and meal-based scheduling while maintaining all the advanced features.