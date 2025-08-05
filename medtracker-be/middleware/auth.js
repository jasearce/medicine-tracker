/**
 * Authentication Middleware
 * 
 * Provides middleware functions for:
 * - Verifying JWT tokens from Supabase Auth
 * - Extracting user information from requests
 * - Protecting routes that require authentication
 * 
 * @module middleware/auth
 */

/**
 * Middleware to verify Supabase JWT token and extract user information
 * 
 * This middleware:
 * 1. Extracts the Authorization header from the request
 * 2. Verifies the JWT token using Supabase client
 * 3. Adds user information to req.user for use in route handlers
 * 4. Handles various authentication error scenarios
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {Function} next - Express next middleware function
 */
const authenticateToken = async (req, res, next) => {
    try {
        // Get the supabase client from app locals
        const supabase = req.app.locals.supabase;
        
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        
        if (!token) {
            return res.status(401).json({
                error: 'Authentication Required',
                message: 'No access token provided. Please include a Bearer token in the Authorization header.'
            });
        }
        
        // Verify the token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error) {
            console.error('Token verification error:', error.message);
            return res.status(401).json({
                error: 'Invalid Token',
                message: 'The provided token is invalid or expired. Please log in again.'
            });
        }
        
        if (!user) {
            return res.status(401).json({
                error: 'User Not Found',
                message: 'No user associated with this token. Please log in again.'
            });
        }
        
        // Add user information to request object for use in route handlers
        req.user = {
            id: user.id,
            email: user.email,
            emailVerified: user.email_confirmed_at !== null,
            createdAt: user.created_at,
            lastSignIn: user.last_sign_in_at,
            userMetadata: user.user_metadata || {},
            appMetadata: user.app_metadata || {}
        };
        
        // Add the raw token for any additional Supabase operations
        req.token = token;
        
        // Continue to the next middleware/route handler
        next();
        
    } catch (error) {
        console.error('Authentication middleware error:', error);
        return res.status(500).json({
            error: 'Authentication Error',
            message: 'An error occurred while verifying authentication. Please try again.'
        });
    }
};

/**
 * Optional authentication middleware
 * 
 * Similar to authenticateToken but doesn't return an error if no token is provided.
 * Sets req.user if a valid token is present, otherwise continues without setting req.user.
 * Useful for endpoints that have different behavior for authenticated vs non-authenticated users.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const optionalAuth = async (req, res, next) => {
    try {
        const supabase = req.app.locals.supabase;
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        
        // If no token provided, continue without authentication
        if (!token) {
            return next();
        }
        
        // Try to verify the token
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        // If token is valid, add user to request
        if (!error && user) {
            req.user = {
                id: user.id,
                email: user.email,
                emailVerified: user.email_confirmed_at !== null,
                createdAt: user.created_at,
                lastSignIn: user.last_sign_in_at,
                userMetadata: user.user_metadata || {},
                appMetadata: user.app_metadata || {}
            };
            req.token = token;
        }
        
        // Continue regardless of authentication status
        next();
        
    } catch (error) {
        console.error('Optional auth middleware error:', error);
        // Continue without authentication on error
        next();
    }
};

/**
 * Middleware to check if user has specific permissions
 * 
 * This is a higher-order function that returns middleware to check for specific roles or permissions.
 * Currently implements basic role checking but can be extended for more complex permission systems.
 * 
 * @param {string|Array} requiredRole - Required role(s) for access
 * @returns {Function} Express middleware function
 */
const requireRole = (requiredRole) => {
    return (req, res, next) => {
        // Ensure user is authenticated first
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentication Required',
                message: 'You must be logged in to access this resource.'
            });
        }
        
        // Get user role from metadata (you might store this differently)
        const userRole = req.user.appMetadata.role || 'user';
        
        // Check if user has required role
        const hasRequiredRole = Array.isArray(requiredRole) 
            ? requiredRole.includes(userRole)
            : userRole === requiredRole;
        
        if (!hasRequiredRole) {
            return res.status(403).json({
                error: 'Insufficient Permissions',
                message: `Access denied. Required role: ${Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole}`
            });
        }
        
        next();
    };
};

/**
 * Middleware to validate that the authenticated user owns the resource
 * 
 * This middleware checks if the user_id in the request matches the authenticated user's ID.
 * Useful for ensuring users can only access their own data.
 * 
 * @param {string} userIdField - The field name containing the user ID (default: 'user_id')
 * @returns {Function} Express middleware function
 */
const requireOwnership = (userIdField = 'user_id') => {
    return async (req, res, next) => {
        try {
            // Ensure user is authenticated
            if (!req.user) {
                return res.status(401).json({
                    error: 'Authentication Required',
                    message: 'You must be logged in to access this resource.'
                });
            }
            
            // For requests with URL parameters (e.g., /medicines/:id)
            if (req.params.id) {
                const supabase = req.app.locals.supabase;
                
                // Determine the table name from the route
                let tableName;
                if (req.path.includes('/medicines')) tableName = 'medicines';
                else if (req.path.includes('/medicine-logs')) tableName = 'medicine_logs';
                else if (req.path.includes('/weights')) tableName = 'weight_logs';
                
                if (tableName) {
                    // Query the resource to check ownership
                    const { data, error } = await supabase
                        .from(tableName)
                        .select(userIdField)
                        .eq('id', req.params.id)
                        .single();
                    
                    if (error || !data) {
                        return res.status(404).json({
                            error: 'Resource Not Found',
                            message: 'The requested resource does not exist or you do not have access to it.'
                        });
                    }
                    
                    if (data[userIdField] !== req.user.id) {
                        return res.status(403).json({
                            error: 'Access Denied',
                            message: 'You can only access your own resources.'
                        });
                    }
                }
            }
            
            // For requests with body data, add user_id automatically
            if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
                req.body[userIdField] = req.user.id;
            }
            
            next();
            
        } catch (error) {
            console.error('Ownership validation error:', error);
            return res.status(500).json({
                error: 'Authorization Error',
                message: 'An error occurred while validating resource ownership.'
            });
        }
    };
};

module.exports = {
    authenticateToken,
    optionalAuth,
    requireRole,
    requireOwnership
};