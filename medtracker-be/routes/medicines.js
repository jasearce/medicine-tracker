/**
 * Medicine Management Routes
 * 
 * Handles all medicine-related CRUD operations including:
 * - Creating new medicines with dosage and schedule information
 * - Retrieving user's medicine list with filtering and sorting
 * - Updating medicine details, dosage, and schedule
 * - Deleting medicines from user's collection
 * - Managing medicine schedules (daily/weekly with specific times)
 * 
 * All routes require authentication and ensure users can only access their own medicines.
 * 
 * @module routes/medicines
 */

const express = require('express');
const { authenticateToken, requireOwnership } = require('../middleware/auth');
const router = express.Router();

/**
 * Medicine validation helper
 * Validates medicine data according to business rules
 * 
 * @param {Object} medicineData - Medicine data to validate
 * @returns {Object} - Validation result with errors array
 */
const validateMedicine = (medicineData) => {
    const errors = [];
    const { name, dosage, scheduleType, scheduleTimes, instructions } = medicineData;
    
    // Validate required fields
    if (!name || name.trim().length === 0) {
        errors.push('Medicine name is required');
    } else if (name.trim().length < 2) {
        errors.push('Medicine name must be at least 2 characters long');
    } else if (name.trim().length > 100) {
        errors.push('Medicine name must be less than 100 characters');
    }
    
    if (!dosage || dosage.trim().length === 0) {
        errors.push('Dosage information is required');
    } else if (dosage.trim().length > 50) {
        errors.push('Dosage must be less than 50 characters');
    }
    
    // Validate schedule type
    const validScheduleTypes = ['daily', 'weekly', 'as_needed'];
    if (!scheduleType || !validScheduleTypes.includes(scheduleType)) {
        errors.push('Schedule type must be one of: daily, weekly, as_needed');
    }
    
    // Validate schedule times for daily and weekly schedules
    if (scheduleType === 'daily' || scheduleType === 'weekly') {
        if (!scheduleTimes || !Array.isArray(scheduleTimes) || scheduleTimes.length === 0) {
            errors.push('Schedule times are required for daily and weekly schedules');
        } else {
            // Validate time format (HH:MM)
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            scheduleTimes.forEach((time, index) => {
                if (!timeRegex.test(time)) {
                    errors.push(`Invalid time format at position ${index + 1}. Use HH:MM format (24-hour)`);
                }
            });
            
            // Check for maximum times per day
            if (scheduleTimes.length > 10) {
                errors.push('Maximum 10 times per day allowed');
            }
        }
    }
    
    // Validate optional fields
    if (instructions && instructions.length > 500) {
        errors.push('Instructions must be less than 500 characters');
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
 * - scheduleType: string (optional) - Filter by schedule type
 * - sortBy: string (optional) - Sort by field (name, createdAt, dosage)
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
        
        // Apply sorting
        const validSortFields = ['name', 'created_at', 'dosage', 'schedule_type'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
        const order = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
        
        query = query.order(sortField, { ascending: order === 'asc' });
        
        // Apply pagination
        query = query.range(offset, offset + limitNum - 1);
        
        const { data: medicines, error, count } = await query;
        
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
 * - dosage: string (required) - Dosage information (e.g., "10mg", "2 tablets")
 * - scheduleType: string (required) - Schedule type: "daily", "weekly", or "as_needed"
 * - scheduleTimes: array (required for daily/weekly) - Array of time strings in HH:MM format
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
        
        const { name, dosage, scheduleType, scheduleTimes, instructions, notes } = req.body;
        
        // Validate input data
        const validation = validateMedicine(req.body);
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Invalid medicine data provided',
                details: validation.errors
            });
        }
        
        // Prepare medicine data
        const medicineData = {
            user_id: userId,
            name: name.trim(),
            dosage: dosage.trim(),
            schedule_type: scheduleType,
            schedule_times: scheduleType === 'as_needed' ? [] : scheduleTimes,
            instructions: instructions?.trim() || null,
            notes: notes?.trim() || null,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Insert medicine into database
        const { data: medicine, error } = await supabase
            .from('medicines')
            .insert([medicineData])
            .select()
            .single();
        
        if (error) {
            console.error('Error creating medicine:', error);
            
            // Handle duplicate name constraint (if exists)
            if (error.code === '23505' && error.message.includes('name')) {
                return res.status(409).json({
                    error: 'Medicine Already Exists',
                    message: 'A medicine with this name already exists in your collection'
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
 * - dosage: string - Dosage information
 * - scheduleType: string - Schedule type
 * - scheduleTimes: array - Schedule times
 * - instructions: string - Additional instructions
 * - notes: string - Personal notes
 * - isActive: boolean - Whether medicine is active
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
        
        const { name, dosage, scheduleType, scheduleTimes, instructions, notes, isActive } = req.body;
        
        // If updating core medicine data, validate it
        if (name || dosage || scheduleType || scheduleTimes) {
            const validation = validateMedicine({
                name: name || 'placeholder', // Provide placeholder for validation
                dosage: dosage || 'placeholder',
                scheduleType: scheduleType || 'daily',
                scheduleTimes: scheduleTimes || ['08:00']
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
        const updateData = {
            updated_at: new Date().toISOString()
        };
        
        if (name !== undefined) updateData.name = name.trim();
        if (dosage !== undefined) updateData.dosage = dosage.trim();
        if (scheduleType !== undefined) updateData.schedule_type = scheduleType;
        if (scheduleTimes !== undefined) updateData.schedule_times = scheduleType === 'as_needed' ? [] : scheduleTimes;
        if (instructions !== undefined) updateData.instructions = instructions?.trim() || null;
        if (notes !== undefined) updateData.notes = notes?.trim() || null;
        if (isActive !== undefined) updateData.is_active = Boolean(isActive);
        
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
 * This will also delete all associated medicine logs
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
        
        // Delete medicine (this should cascade delete medicine logs if foreign key is set up properly)
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
 * GET /api/medicines/:id/schedule
 * 
 * Get today's schedule for a specific medicine
 * Returns when the medicine should be taken today based on its schedule
 * 
 * Response:
 * - 200: Schedule retrieved successfully
 * - 401: Not authenticated
 * - 403: Access denied
 * - 404: Medicine not found
 * - 500: Server error
 */
router.get('/:id/schedule', authenticateToken, requireOwnership(), async (req, res) => {
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
        
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        let schedule = [];
        
        if (medicine.schedule_type === 'daily') {
            // For daily medicines, return all scheduled times for today
            schedule = medicine.schedule_times.map(time => ({
                time: time,
                scheduled_for: `${todayStr}T${time}:00.000Z`
            }));
        } else if (medicine.schedule_type === 'weekly') {
            // For weekly medicines, check if today matches the scheduled day
            const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
            
            // This is a simplified implementation
            // You might want to store specific days in the database
            if (medicine.schedule_times && medicine.schedule_times.length > 0) {
                schedule = medicine.schedule_times.map(time => ({
                    time: time,
                    scheduled_for: `${todayStr}T${time}:00.000Z`
                }));
            }
        } else if (medicine.schedule_type === 'as_needed') {
            // As needed medicines have no fixed schedule
            schedule = [{
                time: 'as_needed',
                scheduled_for: null,
                note: 'Take as needed'
            }];
        }
        
        res.status(200).json({
            message: 'Medicine schedule retrieved successfully',
            medicine: {
                id: medicine.id,
                name: medicine.name,
                dosage: medicine.dosage,
                schedule_type: medicine.schedule_type
            },
            today: todayStr,
            schedule
        });
        
    } catch (error) {
        console.error('Get medicine schedule route error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while retrieving medicine schedule'
        });
    }
});

module.exports = router;