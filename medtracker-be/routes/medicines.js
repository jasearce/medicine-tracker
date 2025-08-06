/**
 * Medicine Management Routes (Final Version)
 * 
 * Perfectly aligned with database-setup-final.sql schema:
 * - Uses 'dose' field (not 'dosage') 
 * - Uses 'active' field (not 'is_active')
 * - Supports interval-based scheduling (interval_minutes, interval_days)
 * - Supports meal-based scheduling (meal_timing array)
 * - Full validation matching database constraints
 * 
 * All routes require authentication and ensure users can only access their own medicines.
 * 
 * @module routes/medicines
 */

const express = require('express');
const { authenticateToken, requireOwnership } = require('../middleware/auth');
const router = express.Router();

/**
 * Medicine validation helper (Final Version)
 * Validates medicine data according to the final database schema
 * 
 * @param {Object} medicineData - Medicine data to validate
 * @returns {Object} - Validation result with errors array
 */
const validateMedicine = (medicineData) => {
    const errors = [];
    const { 
        name, 
        dose,
        scheduleType, 
        intervalMinutes, 
        intervalDays, 
        mealTiming, 
        instructions,
        notes
    } = medicineData;
    
    // Validate required fields
    if (!name || name.trim().length === 0) {
        errors.push('Medicine name is required');
    } else if (name.trim().length < 2) {
        errors.push('Medicine name must be at least 2 characters long');
    } else if (name.trim().length > 100) {
        errors.push('Medicine name must be less than 100 characters');
    }
    
    if (!dose || dose.trim().length === 0) {
        errors.push('Dose information is required');
    } else if (dose.trim().length > 50) {
        errors.push('Dose must be less than 50 characters');
    }
    
    // Validate schedule type
    const validScheduleTypes = ['interval', 'meal_based'];
    if (!scheduleType || !validScheduleTypes.includes(scheduleType)) {
        errors.push('Schedule type must be one of: interval, meal_based');
    }
    
    // Validate interval-based schedule
    if (scheduleType === 'interval') {
        if (!intervalMinutes || intervalMinutes <= 0) {
            errors.push('Interval minutes must be a positive number for interval-based schedules');
        } else if (intervalMinutes > 43200) { // 30 days in minutes
            errors.push('Interval minutes cannot exceed 30 days (43200 minutes)');
        }
        
        // interval_days is optional, but if provided should be positive
        if (intervalDays !== undefined && intervalDays !== null && intervalDays <= 0) {
            errors.push('Interval days must be a positive number if specified');
        }
    }
    
    // Validate meal-based schedule
    if (scheduleType === 'meal_based') {
        if (!mealTiming || !Array.isArray(mealTiming) || mealTiming.length === 0) {
            errors.push('Meal timing is required for meal-based schedules');
        } else {
            const validMealTimings = ['before_meal', 'after_meal', 'with_meal'];
            mealTiming.forEach((timing, index) => {
                if (!validMealTimings.includes(timing)) {
                    errors.push(`Invalid meal timing at position ${index + 1}. Must be one of: ${validMealTimings.join(', ')}`);
                }
            });
            
            // Check for maximum meal timings (database constraint)
            if (mealTiming.length > 5) {
                errors.push('Maximum 5 meal timings allowed');
            }
        }
    }
    
    // Validate optional fields
    if (instructions && instructions.length > 500) {
        errors.push('Instructions must be less than 500 characters');
    }
    
    if (notes && notes.length > 500) {
        errors.push('Notes must be less than 500 characters');
    }
    
    return { isValid: errors.length === 0, errors };
};

/**
 * GET /api/medicines
 * 
 * Retrieve all medicines for the authenticated user
 * 
 * Query parameters:
 * - search: string (optional) - Search by medicine name
 * - scheduleType: string (optional) - Filter by schedule type (interval, meal_based)
 * - active: boolean (optional) - Filter by active status
 * - sortBy: string (optional) - Sort by field (name, created_at, dose)
 * - sortOrder: string (optional) - Sort order (asc, desc)
 * - page: number (optional) - Page number for pagination
 * - limit: number (optional) - Items per page (max 100)
 * 
 * Response:
 * - 200: Medicines retrieved successfully
 * - 401: Not authenticated
 * - 500: Server error
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const supabase = req.app.locals.supabase;
        const userId = req.user.id;
        
        // Parse query parameters
        const {
            search,
            scheduleType,
            active,
            sortBy = 'created_at',
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
            .from('medicines')
            .select('*')
            .eq('user_id', userId);
        
        // Apply filters
        if (search) {
            query = query.ilike('name', `%${search}%`);
        }
        
        if (scheduleType) {
            query = query.eq('schedule_type', scheduleType);
        }
        
        if (active !== undefined) {
            query = query.eq('active', active === 'true');
        }
        
        // Apply sorting
        const validSortFields = ['name', 'created_at', 'dose', 'schedule_type'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
        const order = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
        
        query = query.order(sortField, { ascending: order === 'asc' });
        
        // Apply pagination
        query = query.range(offset, offset + limitNum - 1);
        
        const { data: medicines, error } = await query;
        
        if (error) {
            console.error('Error fetching medicines:', error);
            return res.status(500).json({
                error: 'Database Error',
                message: 'Failed to retrieve medicines'
            });
        }
        
        // Get total count for pagination info
        const { count: totalCount, error: countError } = await supabase
            .from('medicines')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
        
        if (countError) {
            console.error('Error counting medicines:', countError);
        }
        
        res.status(200).json({
            message: 'Medicines retrieved successfully',
            medicines: medicines || [],
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalCount || medicines?.length || 0,
                totalPages: Math.ceil((totalCount || medicines?.length || 0) / limitNum),
                hasNext: (pageNum * limitNum) < (totalCount || 0),
                hasPrev: pageNum > 1
            }
        });
        
    } catch (error) {
        console.error('Get medicines route error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while retrieving medicines'
        });
    }
});

/**
 * GET /api/medicines/:id
 * 
 * Retrieve a specific medicine by ID
 * Ensures user can only access their own medicines
 * 
 * Response:
 * - 200: Medicine retrieved successfully
 * - 401: Not authenticated
 * - 403: Access denied (not user's medicine)
 * - 404: Medicine not found
 * - 500: Server error
 */
router.get('/:id', authenticateToken, requireOwnership(), async (req, res) => {
    try {
        const supabase = req.app.locals.supabase;
        const { id } = req.params;
        
        const { data: medicine, error } = await supabase
            .from('medicines')
            .select('*')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    error: 'Medicine Not Found',
                    message: 'The requested medicine does not exist or you do not have access to it'
                });
            }
            
            console.error('Error fetching medicine:', error);
            return res.status(500).json({
                error: 'Database Error',
                message: 'Failed to retrieve medicine'
            });
        }
        
        res.status(200).json({
            message: 'Medicine retrieved successfully',
            medicine
        });
        
    } catch (error) {
        console.error('Get medicine route error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while retrieving medicine'
        });
    }
});

/**
 * POST /api/medicines
 * 
 * Create a new medicine for the authenticated user
 * 
 * Request body:
 * - name: string (required) - Medicine name
 * - dose: string (required) - Dose information (e.g., "10mg", "2 tablets")
 * - scheduleType: string (required) - Schedule type: "interval" or "meal_based"
 * - intervalMinutes: number (required for interval) - Minutes between doses
 * - intervalDays: number (optional for interval) - Days between cycles
 * - mealTiming: array (required for meal_based) - Array of meal timing strings
 * - instructions: string (optional) - Additional instructions
 * - notes: string (optional) - Personal notes about the medicine
 * 
 * Response:
 * - 201: Medicine created successfully
 * - 400: Invalid input data
 * - 401: Not authenticated
 * - 500: Server error
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const supabase = req.app.locals.supabase;
        const userId = req.user.id;
        
        const { 
            name, 
            dose, 
            scheduleType, 
            intervalMinutes, 
            intervalDays, 
            mealTiming, 
            instructions, 
            notes 
        } = req.body;
        
        // Validate input data
        const validation = validateMedicine(req.body);
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Invalid medicine data provided',
                details: validation.errors
            });
        }
        
        // Prepare medicine data according to final schema
        const medicineData = {
            user_id: userId,
            name: name.trim(),
            dose: dose.trim(),
            schedule_type: scheduleType,
            interval_minutes: scheduleType === 'interval' ? intervalMinutes : null,
            interval_days: scheduleType === 'interval' && intervalDays ? intervalDays : null,
            meal_timing: scheduleType === 'meal_based' ? mealTiming : null,
            instructions: instructions?.trim() || null,
            notes: notes?.trim() || null,
            active: true
            // created_at and updated_at are handled by database defaults
        };
        
        // Insert medicine into database
        const { data: medicine, error } = await supabase
            .from('medicines')
            .insert([medicineData])
            .select()
            .single();
        
        if (error) {
            console.error('Error creating medicine:', error);
            
            // Handle constraint violations
            if (error.code === '23514') { // Check constraint violation
                return res.status(400).json({
                    error: 'Constraint Violation',
                    message: 'The medicine data violates database constraints. Please check your input.',
                    details: error.message
                });
            }
            
            return res.status(500).json({
                error: 'Database Error',
                message: 'Failed to create medicine'
            });
        }
        
        res.status(201).json({
            message: 'Medicine created successfully',
            medicine
        });
        
    } catch (error) {
        console.error('Create medicine route error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while creating medicine'
        });
    }
});

/**
 * PUT /api/medicines/:id
 * 
 * Update an existing medicine
 * Ensures user can only update their own medicines
 * 
 * Request body: (all fields optional)
 * - name: string - Medicine name
 * - dose: string - Dose information
 * - scheduleType: string - Schedule type
 * - intervalMinutes: number - Minutes between doses
 * - intervalDays: number - Days between cycles
 * - mealTiming: array - Meal timing array
 * - instructions: string - Additional instructions
 * - notes: string - Personal notes
 * - active: boolean - Whether medicine is active
 * 
 * Response:
 * - 200: Medicine updated successfully
 * - 400: Invalid input data
 * - 401: Not authenticated
 * - 403: Access denied
 * - 404: Medicine not found
 * - 500: Server error
 */
router.put('/:id', authenticateToken, requireOwnership(), async (req, res) => {
    try {
        const supabase = req.app.locals.supabase;
        const { id } = req.params;
        
        const { 
            name, 
            dose, 
            scheduleType, 
            intervalMinutes, 
            intervalDays, 
            mealTiming, 
            instructions, 
            notes, 
            active 
        } = req.body;
        
        // If updating core medicine data, validate it
        if (name || dose || scheduleType || intervalMinutes || mealTiming) {
            const validation = validateMedicine({
                name: name || 'placeholder', // Provide placeholder for validation
                dose: dose || 'placeholder',
                scheduleType: scheduleType || 'interval',
                intervalMinutes: intervalMinutes || 60,
                mealTiming: mealTiming || ['before_meal']
            });
            
            if (!validation.isValid) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'Invalid medicine data provided',
                    details: validation.errors
                });
            }
        }
        
        // Build update object with only provided fields
        const updateData = {};
        
        if (name !== undefined) updateData.name = name.trim();
        if (dose !== undefined) updateData.dose = dose.trim();
        if (scheduleType !== undefined) updateData.schedule_type = scheduleType;
        if (intervalMinutes !== undefined) updateData.interval_minutes = intervalMinutes;
        if (intervalDays !== undefined) updateData.interval_days = intervalDays;
        if (mealTiming !== undefined) updateData.meal_timing = mealTiming;
        if (instructions !== undefined) updateData.instructions = instructions?.trim() || null;
        if (notes !== undefined) updateData.notes = notes?.trim() || null;
        if (active !== undefined) updateData.active = Boolean(active);
        
        // updated_at will be automatically set by trigger
        
        // Update medicine in database
        const { data: medicine, error } = await supabase
            .from('medicines')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', req.user.id)
            .select()
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    error: 'Medicine Not Found',
                    message: 'The requested medicine does not exist or you do not have access to it'
                });
            }
            
            console.error('Error updating medicine:', error);
            return res.status(500).json({
                error: 'Database Error',
                message: 'Failed to update medicine'
            });
        }
        
        res.status(200).json({
            message: 'Medicine updated successfully',
            medicine
        });
        
    } catch (error) {
        console.error('Update medicine route error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while updating medicine'
        });
    }
});

/**
 * DELETE /api/medicines/:id
 * 
 * Delete a medicine from user's collection
 * This will also delete all associated medicine logs (CASCADE)
 * Ensures user can only delete their own medicines
 * 
 * Response:
 * - 200: Medicine deleted successfully
 * - 401: Not authenticated
 * - 403: Access denied
 * - 404: Medicine not found
 * - 500: Server error
 */
router.delete('/:id', authenticateToken, requireOwnership(), async (req, res) => {
    try {
        const supabase = req.app.locals.supabase;
        const { id } = req.params;
        
        // Delete medicine (CASCADE will delete medicine logs automatically)
        const { error } = await supabase
            .from('medicines')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id);
        
        if (error) {
            console.error('Error deleting medicine:', error);
            return res.status(500).json({
                error: 'Database Error',
                message: 'Failed to delete medicine'
            });
        }
        
        res.status(200).json({
            message: 'Medicine deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete medicine route error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while deleting medicine'
        });
    }
});

/**
 * GET /api/medicines/:id/next-dose
 * 
 * Calculate when the next dose should be taken based on the medicine's schedule
 * 
 * Response:
 * - 200: Next dose time calculated successfully
 * - 401: Not authenticated
 * - 403: Access denied
 * - 404: Medicine not found
 * - 500: Server error
 */
router.get('/:id/next-dose', authenticateToken, requireOwnership(), async (req, res) => {
    try {
        const supabase = req.app.locals.supabase;
        const { id } = req.params;
        
        // Get medicine details
        const { data: medicine, error } = await supabase
            .from('medicines')
            .select('*')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();
        
        if (error || !medicine) {
            return res.status(404).json({
                error: 'Medicine Not Found',
                message: 'The requested medicine does not exist or you do not have access to it'
            });
        }
        
        // Get the last dose taken
        const { data: lastLog, error: logError } = await supabase
            .from('medicine_logs')
            .select('taken_at')
            .eq('medicine_id', id)
            .eq('user_id', req.user.id)
            .order('taken_at', { ascending: false })
            .limit(1)
            .single();
        
        if (logError && logError.code !== 'PGRST116') {
            console.error('Error fetching last dose:', logError);
        }
        
        let nextDoseInfo = {};
        
        if (medicine.schedule_type === 'interval' && medicine.interval_minutes) {
            if (lastLog) {
                // Calculate next dose based on last dose + interval
                const lastDose = new Date(lastLog.taken_at);
                const nextDose = new Date(lastDose.getTime() + (medicine.interval_minutes * 60 * 1000));
                
                nextDoseInfo = {
                    type: 'interval',
                    nextDoseAt: nextDose.toISOString(),
                    intervalMinutes: medicine.interval_minutes,
                    intervalDays: medicine.interval_days,
                    lastDoseAt: lastLog.taken_at,
                    isOverdue: nextDose < new Date()
                };
            } else {
                // No previous dose, can take now
                nextDoseInfo = {
                    type: 'interval',
                    nextDoseAt: new Date().toISOString(),
                    intervalMinutes: medicine.interval_minutes,
                    intervalDays: medicine.interval_days,
                    lastDoseAt: null,
                    isOverdue: false
                };
            }
        } else if (medicine.schedule_type === 'meal_based') {
            nextDoseInfo = {
                type: 'meal_based',
                mealTiming: medicine.meal_timing,
                instructions: 'Take as scheduled with meals',
                lastDoseAt: lastLog?.taken_at || null
            };
        }
        
        res.status(200).json({
            message: 'Next dose information retrieved successfully',
            medicine: {
                id: medicine.id,
                name: medicine.name,
                dose: medicine.dose,
                schedule_type: medicine.schedule_type
            },
            nextDose: nextDoseInfo
        });
        
    } catch (error) {
        console.error('Get next dose route error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while calculating next dose'
        });
    }
});

module.exports = router;