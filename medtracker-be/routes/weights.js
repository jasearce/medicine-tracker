/**
 * Weight Tracking Routes
 * 
 * Handles all weight tracking and logging functionality including:
 * - Recording weight measurements with timestamps
 * - Retrieving weight history with filtering and sorting
 * - Updating weight entries for corrections
 * - Deleting incorrect weight entries
 * - Weight analytics and trend analysis
 * 
 * All routes require authentication and ensure users can only access their own weight data.
 * 
 * @module routes/weights
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

/**
 * Weight log validation helper
 * Validates weight log data according to business rules
 * 
 * @param {Object} weightData - Weight log data to validate
 * @returns {Object} - Validation result with errors array
 */
const validateWeightLog = (weightData) => {
    const errors = [];
    const { weight, unit, measuredAt, notes } = weightData;
    
    // Validate required fields
    if (!weight) {
        errors.push('Weight value is required');
    } else {
        const weightNum = parseFloat(weight);
        if (isNaN(weightNum)) {
            errors.push('Weight must be a valid number');
        } else if (weightNum <= 0) {
            errors.push('Weight must be greater than 0');
        } else if (weightNum > 1000) {
            errors.push('Weight must be less than 1000');
        }
    }
    
    // Validate unit
    const validUnits = ['kg', 'lbs', 'pounds'];
    if (!unit || !validUnits.includes(unit.toLowerCase())) {
        errors.push('Unit must be one of: kg, lbs, pounds');
    }
    
    // Validate timestamp
    if (measuredAt) {
        const measureDate = new Date(measuredAt);
        if (isNaN(measureDate.getTime())) {
            errors.push('Invalid measurement timestamp format');
        } else if (measureDate > new Date()) {
            errors.push('Cannot log weight for future dates');
        } else if (measureDate < new Date('1900-01-01')) {
            errors.push('Measurement date is too far in the past');
        }
    }
    
    // Validate optional fields
    if (notes && notes.length > 500) {
        errors.push('Notes must be less than 500 characters');
    }
    
    return { isValid: errors.length === 0, errors };
};

/**
 * Convert weight between units
 * 
 * @param {number} weight - Weight value to convert
 * @param {string} fromUnit - Source unit (kg, lbs, pounds)
 * @param {string} toUnit - Target unit (kg, lbs, pounds)
 * @returns {number} - Converted weight value
 */
const convertWeight = (weight, fromUnit, toUnit) => {
    const normalizedFromUnit = fromUnit.toLowerCase();
    const normalizedToUnit = toUnit.toLowerCase();
    
    // Convert to kg first
    let weightInKg;
    if (normalizedFromUnit === 'kg') {
        weightInKg = weight;
    } else if (normalizedFromUnit === 'lbs' || normalizedFromUnit === 'pounds') {
        weightInKg = weight * 0.453592; // 1 lb = 0.453592 kg
    } else {
        return weight; // Unknown unit, return as is
    }
    
    // Convert from kg to target unit
    if (normalizedToUnit === 'kg') {
        return weightInKg;
    } else if (normalizedToUnit === 'lbs' || normalizedToUnit === 'pounds') {
        return weightInKg * 2.20462; // 1 kg = 2.20462 lbs
    } else {
        return weightInKg; // Unknown target unit, return kg
    }
};

/**
 * GET /api/weights
 * 
 * Retrieve weight logs for the authenticated user
 * 
 * Query parameters:
 * - startDate: string (optional) - Filter logs from this date (YYYY-MM-DD)
 * - endDate: string (optional) - Filter logs until this date (YYYY-MM-DD)
 * - unit: string (optional) - Convert weights to this unit (kg, lbs, pounds)
 * - sortBy: string (optional) - Sort by field (measured_at, weight, created_at)
 * - sortOrder: string (optional) - Sort order (asc, desc)
 * - page: number (optional) - Page number for pagination
 * - limit: number (optional) - Items per page (max 100)
 * 
 * Response:
 * - 200: Weight logs retrieved successfully
 * - 401: Not authenticated
 * - 500: Server error
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const supabase = req.app.locals.supabase;
        const userId = req.user.id;
        
        // Parse query parameters
        const {
            startDate,
            endDate,
            unit,
            sortBy = 'measured_at',
            sortOrder = 'desc',
            page = 1,
            limit = 50
        } = req.query;
        
        // Validate pagination parameters
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
        const offset = (pageNum - 1) * limitNum;
        
        // Build query
        let query = supabase
            .from('weight_logs')
            .select('*')
            .eq('user_id', userId);
        
        // Apply date filters
        if (startDate) {
            const start = new Date(startDate);
            if (!isNaN(start.getTime())) {
                query = query.gte('measured_at', start.toISOString());
            }
        }
        
        if (endDate) {
            const end = new Date(endDate);
            if (!isNaN(end.getTime())) {
                // Set to end of day
                end.setHours(23, 59, 59, 999);
                query = query.lte('measured_at', end.toISOString());
            }
        }
        
        // Apply sorting
        const validSortFields = ['measured_at', 'weight', 'created_at'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'measured_at';
        const order = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
        
        query = query.order(sortField, { ascending: order === 'asc' });
        
        // Apply pagination
        query = query.range(offset, offset + limitNum - 1);
        
        const { data: weights, error } = await query;
        
        if (error) {
            console.error('Error fetching weight logs:', error);
            return res.status(500).json({
                error: 'Database Error',
                message: 'Failed to retrieve weight logs'
            });
        }
        
        // Convert units if requested
        let processedWeights = weights || [];
        if (unit && processedWeights.length > 0) {
            processedWeights = processedWeights.map(weight => ({
                ...weight,
                weight: convertWeight(weight.weight, weight.unit, unit),
                original_weight: weight.weight,
                original_unit: weight.unit,
                converted_unit: unit.toLowerCase()
            }));
        }
        
        // Get total count for pagination info
        let countQuery = supabase
            .from('weight_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
        
        if (startDate) {
            const start = new Date(startDate);
            if (!isNaN(start.getTime())) {
                countQuery = countQuery.gte('measured_at', start.toISOString());
            }
        }
        if (endDate) {
            const end = new Date(endDate);
            if (!isNaN(end.getTime())) {
                end.setHours(23, 59, 59, 999);
                countQuery = countQuery.lte('measured_at', end.toISOString());
            }
        }
        
        const { count: totalCount, error: countError } = await countQuery;
        
        if (countError) {
            console.error('Error counting weight logs:', countError);
        }
        
        res.status(200).json({
            message: 'Weight logs retrieved successfully',
            weights: processedWeights,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalCount || weights?.length || 0,
                totalPages: Math.ceil((totalCount || weights?.length || 0) / limitNum),
                hasNext: (pageNum * limitNum) < (totalCount || 0),
                hasPrev: pageNum > 1
            },
            ...(unit && { converted_to_unit: unit.toLowerCase() })
        });
        
    } catch (error) {
        console.error('Get weight logs route error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while retrieving weight logs'
        });
    }
});

/**
 * GET /api/weights/:id
 * 
 * Retrieve a specific weight log by ID
 * Ensures user can only access their own weight logs
 * 
 * Response:
 * - 200: Weight log retrieved successfully
 * - 401: Not authenticated
 * - 403: Access denied
 * - 404: Weight log not found
 * - 500: Server error
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const supabase = req.app.locals.supabase;
        const { id } = req.params;
        
        const { data: weight, error } = await supabase
            .from('weight_logs')
            .select('*')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    error: 'Weight Log Not Found',
                    message: 'The requested weight log does not exist or you do not have access to it'
                });
            }
            
            console.error('Error fetching weight log:', error);
            return res.status(500).json({
                error: 'Database Error',
                message: 'Failed to retrieve weight log'
            });
        }
        
        res.status(200).json({
            message: 'Weight log retrieved successfully',
            weight
        });
        
    } catch (error) {
        console.error('Get weight log route error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while retrieving weight log'
        });
    }
});

/**
 * POST /api/weights
 * 
 * Create a new weight log entry for the authenticated user
 * 
 * Request body:
 * - weight: number (required) - Weight value
 * - unit: string (required) - Weight unit (kg, lbs, pounds)
 * - measuredAt: string (optional) - ISO timestamp when weight was measured (defaults to now)
 * - notes: string (optional) - Additional notes about this measurement
 * - bodyFatPercentage: number (optional) - Body fat percentage if available
 * - muscleMass: number (optional) - Muscle mass if available
 * 
 * Response:
 * - 201: Weight log created successfully
 * - 400: Invalid input data
 * - 401: Not authenticated
 * - 500: Server error
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const supabase = req.app.locals.supabase;
        const userId = req.user.id;
        
        const { 
            weight, 
            unit, 
            measuredAt, 
            notes, 
            bodyFatPercentage, 
            muscleMass 
        } = req.body;
        
        // Use current time if no measurement time provided
        const measurementTime = measuredAt || new Date().toISOString();
        
        // Validate input data
        const validation = validateWeightLog({ 
            weight, 
            unit, 
            measuredAt: measurementTime, 
            notes 
        });
        
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Invalid weight log data provided',
                details: validation.errors
            });
        }
        
        // Validate optional body composition values
        if (bodyFatPercentage !== undefined) {
            const bfp = parseFloat(bodyFatPercentage);
            if (isNaN(bfp) || bfp < 0 || bfp > 100) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'Body fat percentage must be between 0 and 100'
                });
            }
        }
        
        if (muscleMass !== undefined) {
            const mm = parseFloat(muscleMass);
            if (isNaN(mm) || mm < 0) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'Muscle mass must be a positive number'
                });
            }
        }
        
        // Check for duplicate entries (same day)
        const measureDate = new Date(measurementTime);
        const dayStart = new Date(measureDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(measureDate);
        dayEnd.setHours(23, 59, 59, 999);
        
        const { data: duplicateCheck, error: duplicateError } = await supabase
            .from('weight_logs')
            .select('id, measured_at')
            .eq('user_id', userId)
            .gte('measured_at', dayStart.toISOString())
            .lte('measured_at', dayEnd.toISOString());
        
        if (duplicateError) {
            console.error('Error checking for duplicates:', duplicateError);
        } else if (duplicateCheck && duplicateCheck.length > 0) {
            // Warning but not blocking - user might want multiple measurements per day
            console.log(`User ${userId} already has ${duplicateCheck.length} weight log(s) for ${measureDate.toDateString()}`);
        }
        
        // Prepare weight log data
        const weightLogData = {
            user_id: userId,
            weight: parseFloat(weight),
            unit: unit.toLowerCase(),
            measured_at: measurementTime,
            notes: notes?.trim() || null,
            body_fat_percentage: bodyFatPercentage ? parseFloat(bodyFatPercentage) : null,
            muscle_mass: muscleMass ? parseFloat(muscleMass) : null,
            created_at: new Date().toISOString()
        };
        
        // Insert weight log into database
        const { data: weightLog, error } = await supabase
            .from('weight_logs')
            .insert([weightLogData])
            .select()
            .single();
        
        if (error) {
            console.error('Error creating weight log:', error);
            return res.status(500).json({
                error: 'Database Error',
                message: 'Failed to create weight log'
            });
        }
        
        res.status(201).json({
            message: 'Weight log created successfully',
            weight: weightLog
        });
        
    } catch (error) {
        console.error('Create weight log route error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while creating weight log'
        });
    }
});

/**
 * PUT /api/weights/:id
 * 
 * Update an existing weight log entry
 * Ensures user can only update their own weight logs
 * 
 * Request body: (all fields optional)
 * - weight: number - Updated weight value
 * - unit: string - Updated weight unit
 * - measuredAt: string - Updated measurement timestamp
 * - notes: string - Updated notes
 * - bodyFatPercentage: number - Updated body fat percentage
 * - muscleMass: number - Updated muscle mass
 * 
 * Response:
 * - 200: Weight log updated successfully
 * - 400: Invalid input data
 * - 401: Not authenticated
 * - 403: Access denied
 * - 404: Weight log not found
 * - 500: Server error
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const supabase = req.app.locals.supabase;
        const { id } = req.params;
        
        const { 
            weight, 
            unit, 
            measuredAt, 
            notes, 
            bodyFatPercentage, 
            muscleMass 
        } = req.body;
        
        // Validate if any data is provided to update
        const hasUpdateData = weight !== undefined || unit !== undefined || 
                             measuredAt !== undefined || notes !== undefined ||
                             bodyFatPercentage !== undefined || muscleMass !== undefined;
        
        if (!hasUpdateData) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'At least one field must be provided for update'
            });
        }
        
        // Validate updated data if core fields are provided
        if (weight !== undefined || unit !== undefined || measuredAt !== undefined) {
            const validation = validateWeightLog({
                weight: weight || 70, // Provide placeholder for validation
                unit: unit || 'kg',
                measuredAt: measuredAt || new Date().toISOString(),
                notes
            });
            
            if (!validation.isValid) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'Invalid weight log data provided',
                    details: validation.errors
                });
            }
        }
        
        // Validate optional body composition values
        if (bodyFatPercentage !== undefined && bodyFatPercentage !== null) {
            const bfp = parseFloat(bodyFatPercentage);
            if (isNaN(bfp) || bfp < 0 || bfp > 100) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'Body fat percentage must be between 0 and 100'
                });
            }
        }
        
        if (muscleMass !== undefined && muscleMass !== null) {
            const mm = parseFloat(muscleMass);
            if (isNaN(mm) || mm < 0) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'Muscle mass must be a positive number'
                });
            }
        }
        
        // Build update object with only provided fields
        const updateData = {
            updated_at: new Date().toISOString()
        };
        
        if (weight !== undefined) updateData.weight = parseFloat(weight);
        if (unit !== undefined) updateData.unit = unit.toLowerCase();
        if (measuredAt !== undefined) updateData.measured_at = new Date(measuredAt).toISOString();
        if (notes !== undefined) updateData.notes = notes?.trim() || null;
        if (bodyFatPercentage !== undefined) {
            updateData.body_fat_percentage = bodyFatPercentage ? parseFloat(bodyFatPercentage) : null;
        }
        if (muscleMass !== undefined) {
            updateData.muscle_mass = muscleMass ? parseFloat(muscleMass) : null;
        }
        
        // Update weight log in database
        const { data: weightLog, error } = await supabase
            .from('weight_logs')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', req.user.id)
            .select()
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    error: 'Weight Log Not Found',
                    message: 'The requested weight log does not exist or you do not have access to it'
                });
            }
            
            console.error('Error updating weight log:', error);
            return res.status(500).json({
                error: 'Database Error',
                message: 'Failed to update weight log'
            });
        }
        
        res.status(200).json({
            message: 'Weight log updated successfully',
            weight: weightLog
        });
        
    } catch (error) {
        console.error('Update weight log route error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while updating weight log'
        });
    }
});

/**
 * DELETE /api/weights/:id
 * 
 * Delete a weight log entry
 * Ensures user can only delete their own weight logs
 * 
 * Response:
 * - 200: Weight log deleted successfully
 * - 401: Not authenticated
 * - 403: Access denied
 * - 404: Weight log not found
 * - 500: Server error
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const supabase = req.app.locals.supabase;
        const { id } = req.params;
        
        // Delete weight log
        const { error } = await supabase
            .from('weight_logs')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id);
        
        if (error) {
            console.error('Error deleting weight log:', error);
            return res.status(500).json({
                error: 'Database Error',
                message: 'Failed to delete weight log'
            });
        }
        
        res.status(200).json({
            message: 'Weight log deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete weight log route error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while deleting weight log'
        });
    }
});

/**
 * GET /api/weights/analytics/trends
 * 
 * Get weight trend analytics for a specific period
 * 
 * Query parameters:
 * - startDate: string (optional) - Start date for analysis (YYYY-MM-DD)
 * - endDate: string (optional) - End date for analysis (YYYY-MM-DD)
 * - unit: string (optional) - Unit for weight display (kg, lbs, pounds)
 * - period: string (optional) - Analysis period: "week", "month", "3months", "6months", "year"
 * 
 * Response:
 * - 200: Weight trends retrieved successfully
 * - 401: Not authenticated
 * - 500: Server error
 */
router.get('/analytics/trends', authenticateToken, async (req, res) => {
    try {
        const supabase = req.app.locals.supabase;
        const userId = req.user.id;
        
        const { startDate, endDate, unit = 'kg', period = 'month' } = req.query;
        
        // Calculate date range based on period
        const now = new Date();
        let start, end;
        
        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
        } else {
            switch (period) {
                case 'week':
                    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                case '3months':
                    start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                    break;
                case '6months':
                    start = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
                    break;
                case 'year':
                    start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            }
            end = now;
        }
        
        // Get weight logs for the period
        const { data: weights, error } = await supabase
            .from('weight_logs')
            .select('*')
            .eq('user_id', userId)
            .gte('measured_at', start.toISOString())
            .lte('measured_at', end.toISOString())
            .order('measured_at', { ascending: true });
        
        if (error) {
            console.error('Error fetching weights for analytics:', error);
            return res.status(500).json({
                error: 'Database Error',
                message: 'Failed to retrieve weight data for analysis'
            });
        }
        
        if (!weights || weights.length === 0) {
            return res.status(200).json({
                message: 'No weight data found for the specified period',
                period: {
                    start: start.toISOString().split('T')[0],
                    end: end.toISOString().split('T')[0]
                },
                analytics: {
                    totalEntries: 0,
                    weightChange: 0,
                    averageWeight: 0,
                    trend: 'no_data'
                },
                timeline: []
            });
        }
        
        // Convert weights to requested unit
        const convertedWeights = weights.map(w => ({
            ...w,
            weight: convertWeight(w.weight, w.unit, unit),
            original_weight: w.weight,
            original_unit: w.unit
        }));
        
        // Calculate analytics
        const weightValues = convertedWeights.map(w => w.weight);
        const firstWeight = weightValues[0];
        const lastWeight = weightValues[weightValues.length - 1];
        const weightChange = lastWeight - firstWeight;
        const averageWeight = weightValues.reduce((sum, w) => sum + w, 0) / weightValues.length;
        
        // Calculate trend
        let trend = 'stable';
        if (Math.abs(weightChange) > 0.5) { // Threshold for significant change
            trend = weightChange > 0 ? 'increasing' : 'decreasing';
        }
        
        // Calculate weekly averages for smoother trend visualization
        const weeklyAverages = [];
        const weeklyGroups = {};
        
        convertedWeights.forEach(weight => {
            const date = new Date(weight.measured_at);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
            const weekKey = weekStart.toISOString().split('T')[0];
            
            if (!weeklyGroups[weekKey]) {
                weeklyGroups[weekKey] = [];
            }
            weeklyGroups[weekKey].push(weight.weight);
        });
        
        Object.keys(weeklyGroups).sort().forEach(weekKey => {
            const weights = weeklyGroups[weekKey];
            const average = weights.reduce((sum, w) => sum + w, 0) / weights.length;
            weeklyAverages.push({
                week: weekKey,
                averageWeight: parseFloat(average.toFixed(2)),
                entryCount: weights.length
            });
        });
        
        res.status(200).json({
            message: 'Weight trends retrieved successfully',
            period: {
                start: start.toISOString().split('T')[0],
                end: end.toISOString().split('T')[0],
                totalDays: Math.ceil((end - start) / (24 * 60 * 60 * 1000))
            },
            analytics: {
                totalEntries: weights.length,
                firstWeight: parseFloat(firstWeight.toFixed(2)),
                lastWeight: parseFloat(lastWeight.toFixed(2)),
                weightChange: parseFloat(weightChange.toFixed(2)),
                averageWeight: parseFloat(averageWeight.toFixed(2)),
                minWeight: parseFloat(Math.min(...weightValues).toFixed(2)),
                maxWeight: parseFloat(Math.max(...weightValues).toFixed(2)),
                trend: trend,
                unit: unit.toLowerCase()
            },
            timeline: convertedWeights.map(w => ({
                id: w.id,
                weight: parseFloat(w.weight.toFixed(2)),
                measuredAt: w.measured_at,
                notes: w.notes,
                bodyFatPercentage: w.body_fat_percentage,
                muscleMass: w.muscle_mass
            })),
            weeklyAverages
        });
        
    } catch (error) {
        console.error('Weight trends analytics route error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while calculating weight trends'
        });
    }
});

module.exports = router;