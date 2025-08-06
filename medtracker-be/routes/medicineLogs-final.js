/**
 * Medicine Log Routes (Final Version)
 * 
 * Perfectly aligned with database-setup-final.sql schema:
 * - Uses complete medicine_logs table with all fields
 * - Supports dosage_taken and notes fields  
 * - Automatic user_id population and validation
 * - Full RLS security implementation
 * 
 * All routes require authentication and ensure users can only access their own medicine logs.
 * 
 * @module routes/medicineLogs
 */

const express = require('express');
const { authenticateToken, requireOwnership } = require('../middleware/auth');
const router = express.Router();

/**
 * Medicine log validation helper (Final Version)
 * Validates medicine log data according to final database schema
 * 
 * @param {Object} logData - Medicine log data to validate
 * @returns {Object} - Validation result with errors array
 */
const validateMedicineLog = (logData) => {
    const errors = [];
    const { medicineId, takenAt, dosageTaken, notes } = logData;
    
    // Validate required fields
    if (!medicineId) {
        errors.push('Medicine ID is required');
    }
    
    // Validate timestamp
    if (takenAt) {
        const takenDate = new Date(takenAt);
        if (isNaN(takenDate.getTime())) {
            errors.push('Invalid timestamp format');
        } else if (takenDate > new Date()) {
            errors.push('Cannot log medicine for future dates');
        } else if (takenDate < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)) {
            errors.push('Cannot log medicine older than 1 year');
        }
    }
    
    // Validate optional fields according to database constraints
    if (dosageTaken && dosageTaken.length > 100) {
        errors.push('Dosage taken must be less than 100 characters');
    }
    
    if (notes && notes.length > 500) {
        errors.push('Notes must be less than 500 characters');
    }
    
    return { isValid: errors.length === 0, errors };
};

/**
 * GET /api/medicine-logs
 * 
 * Retrieve medicine logs for the authenticated user
 * 
 * Query parameters:
 * - medicineId: string (optional) - Filter by specific medicine
 * - startDate: string (optional) - Filter logs from this date (YYYY-MM-DD)
 * - endDate: string (optional) - Filter logs until this date (YYYY-MM-DD)
 * - sortBy: string (optional) - Sort by field (taken_at, created_at)
 * - sortOrder: string (optional) - Sort order (asc, desc)
 * - page: number (optional) - Page number for pagination
 * - limit: number (optional) - Items per page (max 100)
 * 
 * Response:
 * - 200: Medicine logs retrieved successfully
 * - 401: Not authenticated
 * - 500: Server error
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const supabase = req.app.locals.supabase;
        const userId = req.user.id;
        
        // Parse query parameters
        const {
            medicineId,
            startDate,
            endDate,
            sortBy = 'taken_at',
            sortOrder = 'desc',
            page = 1,
            limit = 50
        } = req.query;
        
        // Validate pagination parameters
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
        const offset = (pageNum - 1) * limitNum;
        
        // Build query with medicine details joined
        let query = supabase
            .from('medicine_logs')
            .select(`
                *,
                medicines (
                    id,
                    name,
                    dose,
                    schedule_type,
                    interval_minutes,
                    interval_days,
                    meal_timing
                )
            `)
            .eq('user_id', userId);
        
        // Apply filters
        if (medicineId) {
            query = query.eq('medicine_id', medicineId);
        }
        
        if (startDate) {
            const start = new Date(startDate);
            if (!isNaN(start.getTime())) {
                query = query.gte('taken_at', start.toISOString());
            }
        }
        
        if (endDate) {
            const end = new Date(endDate);
            if (!isNaN(end.getTime())) {
                // Set to end of day
                end.setHours(23, 59, 59, 999);
                query = query.lte('taken_at', end.toISOString());
            }
        }
        
        // Apply sorting
        const validSortFields = ['taken_at', 'created_at'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'taken_at';
        const order = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
        
        query = query.order(sortField, { ascending: order === 'asc' });
        
        // Apply pagination
        query = query.range(offset, offset + limitNum - 1);
        
        const { data: logs, error } = await query;
        
        if (error) {
            console.error('Error fetching medicine logs:', error);
            return res.status(500).json({
                error: 'Database Error',
                message: 'Failed to retrieve medicine logs'
            });
        }
        
        // Get total count for pagination info
        let countQuery = supabase
            .from('medicine_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
        
        if (medicineId) countQuery = countQuery.eq('medicine_id', medicineId);
        if (startDate) {
            const start = new Date(startDate);
            if (!isNaN(start.getTime())) {
                countQuery = countQuery.gte('taken_at', start.toISOString());
            }
        }
        if (endDate) {
            const end = new Date(endDate);
            if (!isNaN(end.getTime())) {
                end.setHours(23, 59, 59, 999);
                countQuery = countQuery.lte('taken_at', end.toISOString());
            }
        }
        
        const { count: totalCount, error: countError } = await countQuery;
        
        if (countError) {
            console.error('Error counting medicine logs:', countError);
        }
        
        res.status(200).json({
            message: 'Medicine logs retrieved successfully',
            logs: logs || [],
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalCount || logs?.length || 0,
                totalPages: Math.ceil((totalCount || logs?.length || 0) / limitNum),
                hasNext: (pageNum * limitNum) < (totalCount || 0),
                hasPrev: pageNum > 1
            }
        });
        
    } catch (error) {
        console.error('Get medicine logs route error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while retrieving medicine logs'
        });
    }
});

/**
 * GET /api/medicine-logs/:id
 * 
 * Retrieve a specific medicine log by ID
 * Ensures user can only access their own medicine logs
 * 
 * Response:
 * - 200: Medicine log retrieved successfully
 * - 401: Not authenticated
 * - 403: Access denied
 * - 404: Medicine log not found
 * - 500: Server error
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const supabase = req.app.locals.supabase;
        const { id } = req.params;
        
        const { data: log, error } = await supabase
            .from('medicine_logs')
            .select(`
                *,
                medicines (
                    id,
                    name,
                    dose,
                    schedule_type,
                    interval_minutes,
                    interval_days,
                    meal_timing
                )
            `)
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    error: 'Medicine Log Not Found',
                    message: 'The requested medicine log does not exist or you do not have access to it'
                });
            }
            
            console.error('Error fetching medicine log:', error);
            return res.status(500).json({
                error: 'Database Error',
                message: 'Failed to retrieve medicine log'
            });
        }
        
        res.status(200).json({
            message: 'Medicine log retrieved successfully',
            log
        });
        
    } catch (error) {
        console.error('Get medicine log route error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while retrieving medicine log'
        });
    }
});

/**
 * POST /api/medicine-logs
 * 
 * Log a medicine intake for the authenticated user
 * 
 * Request body:
 * - medicineId: string (required) - ID of the medicine taken
 * - takenAt: string (optional) - ISO timestamp when medicine was taken (defaults to now)
 * - dosageTaken: string (optional) - Actual dosage taken (if different from prescribed)
 * - notes: string (optional) - Additional notes about this intake
 * 
 * Response:
 * - 201: Medicine log created successfully
 * - 400: Invalid input data
 * - 401: Not authenticated
 * - 404: Medicine not found
 * - 409: Duplicate entry detected
 * - 500: Server error
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const supabase = req.app.locals.supabase;
        const userId = req.user.id;
        
        const { medicineId, takenAt, dosageTaken, notes } = req.body;
        
        // Use current time if no timestamp provided
        const logTime = takenAt || new Date().toISOString();
        
        // Validate input data
        const validation = validateMedicineLog({ medicineId, takenAt: logTime, dosageTaken, notes });
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Invalid medicine log data provided',
                details: validation.errors
            });
        }
        
        // Verify the medicine exists and belongs to the user
        const { data: medicine, error: medicineError } = await supabase
            .from('medicines')
            .select('id, name, dose')
            .eq('id', medicineId)
            .eq('user_id', userId)
            .single();
        
        if (medicineError || !medicine) {
            return res.status(404).json({
                error: 'Medicine Not Found',
                message: 'The specified medicine does not exist or you do not have access to it'
            });
        }
        
        // Check for duplicate logs (same medicine within 5 minutes) - safety check
        const takenDate = new Date(logTime);
        const fiveMinutesBefore = new Date(takenDate.getTime() - 5 * 60 * 1000);
        const fiveMinutesAfter = new Date(takenDate.getTime() + 5 * 60 * 1000);
        
        const { data: duplicateCheck, error: duplicateError } = await supabase
            .from('medicine_logs')
            .select('id')
            .eq('user_id', userId)
            .eq('medicine_id', medicineId)
            .gte('taken_at', fiveMinutesBefore.toISOString())
            .lte('taken_at', fiveMinutesAfter.toISOString());
        
        if (duplicateError) {
            console.error('Error checking for duplicates:', duplicateError);
        } else if (duplicateCheck && duplicateCheck.length > 0) {
            return res.status(409).json({
                error: 'Duplicate Entry',
                message: 'A similar medicine log already exists within 5 minutes of this time. Please check your entries.',
                duplicateCount: duplicateCheck.length
            });
        }
        
        // Prepare medicine log data for final schema
        const logData = {
            user_id: userId,
            medicine_id: medicineId,
            taken_at: takenDate.toISOString(),
            dosage_taken: dosageTaken?.trim() || null,
            notes: notes?.trim() || null
            // created_at and updated_at are handled by database defaults
        };
        
        // Insert medicine log into database
        const { data: log, error } = await supabase
            .from('medicine_logs')
            .insert([logData])
            .select(`
                *,
                medicines (
                    id,
                    name,
                    dose,
                    schedule_type
                )
            `)
            .single();
        
        if (error) {
            console.error('Error creating medicine log:', error);
            
            // Handle constraint violations
            if (error.code === '23514') { // Check constraint violation
                return res.status(400).json({
                    error: 'Constraint Violation',
                    message: 'The medicine log data violates database constraints.',
                    details: error.message
                });
            }
            
            return res.status(500).json({
                error: 'Database Error',
                message: 'Failed to create medicine log'
            });
        }
        
        res.status(201).json({
            message: 'Medicine log created successfully',
            log
        });
        
    } catch (error) {
        console.error('Create medicine log route error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while creating medicine log'
        });
    }
});

/**
 * PUT /api/medicine-logs/:id
 * 
 * Update an existing medicine log
 * Ensures user can only update their own medicine logs
 * 
 * Request body: (all fields optional)
 * - takenAt: string - Updated timestamp when medicine was taken
 * - dosageTaken: string - Updated dosage taken
 * - notes: string - Updated notes
 * 
 * Response:
 * - 200: Medicine log updated successfully
 * - 400: Invalid input data
 * - 401: Not authenticated
 * - 403: Access denied
 * - 404: Medicine log not found
 * - 500: Server error
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const supabase = req.app.locals.supabase;
        const { id } = req.params;
        const { takenAt, dosageTaken, notes } = req.body;
        
        // Validate if any data is provided to update
        if (!takenAt && !dosageTaken && notes === undefined) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'At least one field must be provided for update'
            });
        }
        
        // Validate updated data if provided
        if (takenAt || dosageTaken || notes) {
            const validation = validateMedicineLog({
                medicineId: 'placeholder', // We don't validate medicine ID on updates
                takenAt: takenAt || new Date().toISOString(),
                dosageTaken,
                notes
            });
            
            if (!validation.isValid) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'Invalid medicine log data provided',
                    details: validation.errors
                });
            }
        }
        
        // Build update object with only provided fields
        const updateData = {};
        
        if (takenAt !== undefined) {
            updateData.taken_at = new Date(takenAt).toISOString();
        }
        if (dosageTaken !== undefined) {
            updateData.dosage_taken = dosageTaken?.trim() || null;
        }
        if (notes !== undefined) {
            updateData.notes = notes?.trim() || null;
        }
        
        // updated_at will be automatically set by trigger
        
        // Update medicine log in database
        const { data: log, error } = await supabase
            .from('medicine_logs')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', req.user.id)
            .select(`
                *,
                medicines (
                    id,
                    name,
                    dose,
                    schedule_type
                )
            `)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    error: 'Medicine Log Not Found',
                    message: 'The requested medicine log does not exist or you do not have access to it'
                });
            }
            
            console.error('Error updating medicine log:', error);
            return res.status(500).json({
                error: 'Database Error',
                message: 'Failed to update medicine log'
            });
        }
        
        res.status(200).json({
            message: 'Medicine log updated successfully',
            log
        });
        
    } catch (error) {
        console.error('Update medicine log route error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while updating medicine log'
        });
    }
});

/**
 * DELETE /api/medicine-logs/:id
 * 
 * Delete a medicine log entry
 * Ensures user can only delete their own medicine logs
 * 
 * Response:
 * - 200: Medicine log deleted successfully
 * - 401: Not authenticated
 * - 403: Access denied
 * - 404: Medicine log not found
 * - 500: Server error
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const supabase = req.app.locals.supabase;
        const { id } = req.params;
        
        // Delete medicine log
        const { error } = await supabase
            .from('medicine_logs')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id);
        
        if (error) {
            console.error('Error deleting medicine log:', error);
            return res.status(500).json({
                error: 'Database Error',
                message: 'Failed to delete medicine log'
            });
        }
        
        res.status(200).json({
            message: 'Medicine log deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete medicine log route error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while deleting medicine log'
        });
    }
});

/**
 * GET /api/medicine-logs/analytics/adherence
 * 
 * Get adherence analytics for interval-based medicines
 * 
 * Query parameters:
 * - medicineId: string (optional) - Filter by specific medicine
 * - startDate: string (optional) - Start date for analysis (YYYY-MM-DD)
 * - endDate: string (optional) - End date for analysis (YYYY-MM-DD)
 * - period: string (optional) - Analysis period: "week", "month", "year" (default: "week")
 * 
 * Response:
 * - 200: Adherence analytics retrieved successfully
 * - 401: Not authenticated
 * - 500: Server error
 */
router.get('/analytics/adherence', authenticateToken, async (req, res) => {
    try {
        const supabase = req.app.locals.supabase;
        const userId = req.user.id;
        
        const { medicineId, startDate, endDate, period = 'week' } = req.query;
        
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
                case 'year':
                    start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            }
            end = now;
        }
        
        // Get medicine logs for the period
        let logsQuery = supabase
            .from('medicine_logs')
            .select(`
                *,
                medicines (
                    id,
                    name,
                    schedule_type,
                    interval_minutes,
                    interval_days,
                    meal_timing
                )
            `)
            .eq('user_id', userId)
            .gte('taken_at', start.toISOString())
            .lte('taken_at', end.toISOString())
            .order('taken_at', { ascending: true });
        
        if (medicineId) {
            logsQuery = logsQuery.eq('medicine_id', medicineId);
        }
        
        const { data: logs, error } = await logsQuery;
        
        if (error) {
            console.error('Error fetching logs for analytics:', error);
            return res.status(500).json({
                error: 'Database Error',
                message: 'Failed to retrieve adherence data'
            });
        }
        
        // Calculate adherence statistics
        const medicineStats = {};
        const dailyStats = {};
        
        logs.forEach(log => {
            const medicineKey = log.medicine_id;
            const dayKey = log.taken_at.split('T')[0];
            
            if (!medicineStats[medicineKey]) {
                medicineStats[medicineKey] = {
                    medicineId: log.medicine_id,
                    medicineName: log.medicines.name,
                    scheduleType: log.medicines.schedule_type,
                    intervalMinutes: log.medicines.interval_minutes,
                    totalTaken: 0,
                    daysActive: new Set()
                };
            }
            
            medicineStats[medicineKey].totalTaken++;
            medicineStats[medicineKey].daysActive.add(dayKey);
            
            if (!dailyStats[dayKey]) {
                dailyStats[dayKey] = 0;
            }
            dailyStats[dayKey]++;
        });
        
        // Calculate adherence rates for interval-based medicines
        const analytics = Object.values(medicineStats).map(stat => {
            const daysActive = stat.daysActive.size;
            const totalDays = Math.ceil((end - start) / (24 * 60 * 60 * 1000));
            
            let adherenceRate = 0;
            let expectedDoses = 0;
            
            if (stat.scheduleType === 'interval' && stat.intervalMinutes) {
                // Calculate expected doses based on interval
                const totalMinutes = (end - start) / (1000 * 60);
                expectedDoses = Math.floor(totalMinutes / stat.intervalMinutes);
                adherenceRate = expectedDoses > 0 ? ((stat.totalTaken / expectedDoses) * 100) : 0;
            } else if (stat.scheduleType === 'meal_based') {
                // For meal-based, estimate 3 meals per day
                expectedDoses = totalDays * 3;
                adherenceRate = expectedDoses > 0 ? ((stat.totalTaken / expectedDoses) * 100) : 0;
            }
            
            return {
                medicineId: stat.medicineId,
                medicineName: stat.medicineName,
                scheduleType: stat.scheduleType,
                intervalMinutes: stat.intervalMinutes,
                totalTaken: stat.totalTaken,
                expectedDoses: Math.round(expectedDoses),
                daysActive: daysActive,
                totalDays: totalDays,
                adherenceRate: Math.min(100, adherenceRate).toFixed(1)
            };
        });
        
        res.status(200).json({
            message: 'Adherence analytics retrieved successfully',
            period: {
                start: start.toISOString().split('T')[0],
                end: end.toISOString().split('T')[0],
                totalDays: Math.ceil((end - start) / (24 * 60 * 60 * 1000))
            },
            analytics,
            dailyStats: Object.keys(dailyStats).map(date => ({
                date,
                totalMedicinesTaken: dailyStats[date]
            })).sort((a, b) => a.date.localeCompare(b.date))
        });
        
    } catch (error) {
        console.error('Adherence analytics route error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while calculating adherence analytics'
        });
    }
});

module.exports = router;