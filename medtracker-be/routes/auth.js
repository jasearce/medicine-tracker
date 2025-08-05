/**
 * Authentication Routes
 * 
 * Handles all authentication-related endpoints including:
 * - User registration with email/password
 * - User login and session management  
 * - User logout and token invalidation
 * - User profile retrieval and updates
 * - Password reset functionality
 * 
 * All routes utilize Supabase Auth for secure authentication management.
 * 
 * @module routes/auth
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

/**
 * POST /api/auth/register
 * 
 * Register a new user account
 * 
 * Request body:
 * - email: string (required) - User's email address
 * - password: string (required) - User's password (min 6 characters)
 * - firstName: string (optional) - User's first name
 * - lastName: string (optional) - User's last name
 * 
 * Response:
 * - 201: User successfully created
 * - 400: Invalid input data
 * - 409: User already exists
 * - 500: Server error
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;
        const supabase = req.app.locals.supabase;
        
        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Email and password are required',
                details: {
                    email: !email ? 'Email is required' : null,
                    password: !password ? 'Password is required' : null
                }
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Please provide a valid email address'
            });
        }
        
        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Password must be at least 6 characters long'
            });
        }
        
        // Prepare user metadata
        const userMetadata = {};
        if (firstName) userMetadata.firstName = firstName.trim();
        if (lastName) userMetadata.lastName = lastName.trim();
        if (firstName || lastName) {
            userMetadata.fullName = `${firstName || ''} ${lastName || ''}`.trim();
        }
        
        // Attempt to create user with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email: email.toLowerCase().trim(),
            password: password,
            options: {
                data: userMetadata
            }
        });
        
        if (error) {
            console.error('Registration error:', error);
            
            // Handle specific Supabase errors
            if (error.message.includes('already registered')) {
                return res.status(409).json({
                    error: 'User Already Exists',
                    message: 'An account with this email address already exists. Please try logging in instead.'
                });
            }
            
            if (error.message.includes('password')) {
                return res.status(400).json({
                    error: 'Password Error',
                    message: error.message
                });
            }
            
            return res.status(400).json({
                error: 'Registration Failed',
                message: error.message || 'Failed to create user account'
            });
        }
        
        // Successful registration
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: data.user.id,
                email: data.user.email,
                emailVerified: data.user.email_confirmed_at !== null,
                createdAt: data.user.created_at,
                metadata: data.user.user_metadata || {}
            },
            session: data.session ? {
                accessToken: data.session.access_token,
                refreshToken: data.session.refresh_token,
                expiresIn: data.session.expires_in,
                expiresAt: data.session.expires_at
            } : null,
            requiresEmailVerification: !data.session
        });
        
    } catch (error) {
        console.error('Registration route error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred during registration'
        });
    }
});

/**
 * POST /api/auth/login
 * 
 * Authenticate user and create session
 * 
 * Request body:
 * - email: string (required) - User's email address
 * - password: string (required) - User's password
 * 
 * Response:
 * - 200: Login successful with session data
 * - 400: Invalid credentials or input
 * - 401: Authentication failed
 * - 500: Server error
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const supabase = req.app.locals.supabase;
        
        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Email and password are required'
            });
        }
        
        // Attempt authentication with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.toLowerCase().trim(),
            password: password
        });
        
        if (error) {
            console.error('Login error:', error);
            
            // Handle specific authentication errors
            if (error.message.includes('Invalid login credentials')) {
                return res.status(401).json({
                    error: 'Authentication Failed',
                    message: 'Invalid email or password. Please check your credentials and try again.'
                });
            }
            
            if (error.message.includes('Email not confirmed')) {
                return res.status(401).json({
                    error: 'Email Not Verified',
                    message: 'Please verify your email address before logging in.'
                });
            }
            
            return res.status(401).json({
                error: 'Login Failed',
                message: error.message || 'Authentication failed'
            });
        }
        
        // Successful login
        res.status(200).json({
            message: 'Login successful',
            user: {
                id: data.user.id,
                email: data.user.email,
                emailVerified: data.user.email_confirmed_at !== null,
                lastSignIn: data.user.last_sign_in_at,
                metadata: data.user.user_metadata || {}
            },
            session: {
                accessToken: data.session.access_token,
                refreshToken: data.session.refresh_token,
                expiresIn: data.session.expires_in,
                expiresAt: data.session.expires_at
            }
        });
        
    } catch (error) {
        console.error('Login route error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred during login'
        });
    }
});

/**
 * POST /api/auth/logout
 * 
 * Logout user and invalidate session
 * Requires authentication via Bearer token
 * 
 * Response:
 * - 200: Logout successful
 * - 401: Not authenticated
 * - 500: Server error
 */
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        const supabase = req.app.locals.supabase;
        
        // Logout with Supabase (invalidates the token)
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            console.error('Logout error:', error);
            return res.status(500).json({
                error: 'Logout Failed',
                message: 'Failed to logout user session'
            });
        }
        
        res.status(200).json({
            message: 'Logout successful'
        });
        
    } catch (error) {
        console.error('Logout route error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred during logout'
        });
    }
});

/**
 * GET /api/auth/user
 * 
 * Get current authenticated user's information
 * Requires authentication via Bearer token
 * 
 * Response:
 * - 200: User data retrieved successfully
 * - 401: Not authenticated
 * - 500: Server error
 */
router.get('/user', authenticateToken, async (req, res) => {
    try {
        // User information is already available from the authenticateToken middleware
        const user = req.user;
        
        res.status(200).json({
            message: 'User data retrieved successfully',
            user: {
                id: user.id,
                email: user.email,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt,
                lastSignIn: user.lastSignIn,
                metadata: user.userMetadata
            }
        });
        
    } catch (error) {
        console.error('Get user route error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while retrieving user data'
        });
    }
});

/**
 * PUT /api/auth/user
 * 
 * Update current authenticated user's profile
 * Requires authentication via Bearer token
 * 
 * Request body:
 * - firstName: string (optional) - User's first name
 * - lastName: string (optional) - User's last name
 * - metadata: object (optional) - Additional user metadata
 * 
 * Response:
 * - 200: Profile updated successfully
 * - 400: Invalid input data
 * - 401: Not authenticated
 * - 500: Server error
 */
router.put('/user', authenticateToken, async (req, res) => {
    try {
        const { firstName, lastName, metadata } = req.body;
        const supabase = req.app.locals.supabase;
        
        // Prepare updated user metadata
        const updatedMetadata = { ...req.user.userMetadata };
        
        if (firstName !== undefined) updatedMetadata.firstName = firstName?.trim() || null;
        if (lastName !== undefined) updatedMetadata.lastName = lastName?.trim() || null;
        
        // Update full name if first or last name changed
        if (firstName !== undefined || lastName !== undefined) {
            const newFirstName = updatedMetadata.firstName || '';
            const newLastName = updatedMetadata.lastName || '';
            updatedMetadata.fullName = `${newFirstName} ${newLastName}`.trim() || null;
        }
        
        // Add any additional metadata
        if (metadata && typeof metadata === 'object') {
            Object.assign(updatedMetadata, metadata);
        }
        
        // Update user with Supabase
        const { data, error } = await supabase.auth.updateUser({
            data: updatedMetadata
        });
        
        if (error) {
            console.error('Update user error:', error);
            return res.status(400).json({
                error: 'Update Failed',
                message: error.message || 'Failed to update user profile'
            });
        }
        
        res.status(200).json({
            message: 'Profile updated successfully',
            user: {
                id: data.user.id,
                email: data.user.email,
                emailVerified: data.user.email_confirmed_at !== null,
                metadata: data.user.user_metadata || {}
            }
        });
        
    } catch (error) {
        console.error('Update user route error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while updating profile'
        });
    }
});

/**
 * POST /api/auth/forgot-password
 * 
 * Send password reset email to user
 * 
 * Request body:
 * - email: string (required) - User's email address
 * 
 * Response:
 * - 200: Reset email sent (always returns success for security)
 * - 400: Invalid input
 * - 500: Server error
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const supabase = req.app.locals.supabase;
        
        if (!email) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Email address is required'
            });
        }
        
        // Send password reset email
        // Note: Supabase always returns success for security reasons, even if email doesn't exist
        const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
            redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password`
        });
        
        if (error) {
            console.error('Password reset error:', error);
            // Still return success to prevent email enumeration
        }
        
        res.status(200).json({
            message: 'If an account with that email exists, a password reset link has been sent.'
        });
        
    } catch (error) {
        console.error('Forgot password route error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while processing password reset request'
        });
    }
});

/**
 * POST /api/auth/reset-password
 * 
 * Reset user password with reset token
 * 
 * Request body:
 * - token: string (required) - Password reset token from email
 * - password: string (required) - New password
 * 
 * Response:
 * - 200: Password reset successful
 * - 400: Invalid token or password
 * - 500: Server error
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        const supabase = req.app.locals.supabase;
        
        if (!token || !password) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Reset token and new password are required'
            });
        }
        
        if (password.length < 6) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Password must be at least 6 characters long'
            });
        }
        
        // Verify session with token and update password
        const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'recovery'
        });
        
        if (error) {
            console.error('Password reset verification error:', error);
            return res.status(400).json({
                error: 'Invalid Reset Token',
                message: 'The password reset token is invalid or has expired. Please request a new reset link.'
            });
        }
        
        // Update password
        const { error: updateError } = await supabase.auth.updateUser({
            password: password
        });
        
        if (updateError) {
            console.error('Password update error:', updateError);
            return res.status(400).json({
                error: 'Password Update Failed',
                message: updateError.message || 'Failed to update password'
            });
        }
        
        res.status(200).json({
            message: 'Password reset successful. You can now log in with your new password.'
        });
        
    } catch (error) {
        console.error('Reset password route error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred while resetting password'
        });
    }
});

module.exports = router;