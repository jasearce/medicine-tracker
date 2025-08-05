/**
 * Medicine Tracker Backend Server
 * 
 * A comprehensive Express.js server that provides:
 * - User authentication using Supabase Auth
 * - CRUD operations for medicines with dosage and schedule management
 * - Medicine intake logging with timestamps
 * - Weight tracking with historical data
 * 
 * @author Medicine Tracker Team
 * @version 1.0.0
 */

// Import required dependencies
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Import route modules
const authRoutes = require('./routes/auth');
const medicineRoutes = require('./routes/medicines');
const medicineLogRoutes = require('./routes/medicineLogs');
const weightRoutes = require('./routes/weights');

// Initialize Express application
const app = express();

// Get configuration from environment variables
const PORT = process.env.PORT || 3001;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   - SUPABASE_URL');
    console.error('   - SUPABASE_ANON_KEY');
    console.error('');
    console.error('Please create a .env file with these variables.');
    console.error('See .env.example for reference.');
    process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Make supabase client available throughout the app
app.locals.supabase = supabase;

// Middleware Configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] // Replace with your production frontend URL
        : ['http://localhost:3000', 'http://127.0.0.1:3000'], // Development origins
    credentials: true
}));

app.use(express.json({ limit: '10mb' })); // Parse JSON bodies with size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
            database: 'connected', // Could add actual health checks here
            auth: 'available'
        }
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/medicine-logs', medicineLogRoutes);
app.use('/api/weights', weightRoutes);

// Root endpoint with API information
app.get('/', (req, res) => {
    res.json({
        message: 'Medicine Tracker API',
        version: '1.0.0',
        documentation: '/api/docs', // Could add Swagger docs here
        endpoints: {
            auth: '/api/auth',
            medicines: '/api/medicines',
            medicineLogs: '/api/medicine-logs',
            weights: '/api/weights',
            health: '/health'
        }
    });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        availableRoutes: [
            'GET /',
            'GET /health',
            'POST /api/auth/register',
            'POST /api/auth/login',
            'POST /api/auth/logout',
            'GET /api/auth/user',
            'GET /api/medicines',
            'POST /api/medicines',
            'PUT /api/medicines/:id',
            'DELETE /api/medicines/:id',
            'GET /api/medicine-logs',
            'POST /api/medicine-logs',
            'GET /api/weights',
            'POST /api/weights',
            'PUT /api/weights/:id',
            'DELETE /api/weights/:id'
        ]
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('❌ Global Error Handler:', error);
    
    // Handle different types of errors
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            message: error.message,
            details: error.details || null
        });
    }
    
    if (error.name === 'UnauthorizedError') {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required'
        });
    }
    
    // Default error response
    res.status(error.status || 500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' 
            ? error.message 
            : 'Something went wrong',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('🔄 SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🔄 SIGINT received, shutting down gracefully...');
    process.exit(0);
});

// Start the server
app.listen(PORT, () => {
    console.log('🚀 Medicine Tracker API Server Started');
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    console.log(`📚 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🏥 Database: Connected to Supabase`);
    console.log('─'.repeat(50));
});

// Export app for testing
module.exports = app;
