/**
 * Jest Test Setup (Improved Version)
 * 
 * Global test configuration and utilities for Medicine Tracker Backend
 * Includes Supabase mocking, authentication helpers, and comprehensive test data
 */

// Set test environment variables before any imports
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key-for-testing-only';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.PORT = '3002';

// Validate critical environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  throw new Error(`Missing required test environment variables: ${missingVars.join(', ')}`);
}

// Mock console methods to reduce noise in tests
const originalConsole = {
  error: console.error,
  log: console.log,
  warn: console.warn,
  info: console.info
};

global.mockConsole = {
  silenceErrors: () => { console.error = jest.fn(); },
  silenceLogs: () => { console.log = jest.fn(); },
  silenceWarns: () => { console.warn = jest.fn(); },
  silenceInfo: () => { console.info = jest.fn(); },
  silenceAll: () => {
    console.error = jest.fn();
    console.log = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
  },
  restoreErrors: () => { console.error = originalConsole.error; },
  restoreLogs: () => { console.log = originalConsole.log; },
  restoreWarns: () => { console.warn = originalConsole.warn; },
  restoreInfo: () => { console.info = originalConsole.info; },
  restoreAll: () => {
    console.error = originalConsole.error;
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
  }
};

// Import the mock Supabase client from the dedicated mock file
const { mockSupabaseClient, resetAllMocks } = require('./__mocks__/@supabase/supabase-js');

// Enable automatic mocking of @supabase/supabase-js
// Jest will automatically use our mock file in __mocks__/@supabase/supabase-js.js
jest.mock('@supabase/supabase-js');

// Enable automatic mocking of authentication middleware
// Jest will automatically use our mock file in __mocks__/middleware/auth.js
jest.mock('../middleware/auth');

// Global test utilities
global.testUtils = {
  // Mock user data
  mockUser: {
    id: 'test-user-123',
    email: 'test@example.com',
    emailVerified: true,
    createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
    lastSignIn: new Date('2024-01-01T12:00:00Z').toISOString(),
    userMetadata: {
      firstName: 'Test',
      lastName: 'User',
      fullName: 'Test User'
    },
    appMetadata: {
      role: 'user'
    }
  },
  
  // Mock medicine data (interval-based)
  mockMedicineInterval: {
    id: 'medicine-interval-123',
    user_id: 'test-user-123',
    name: 'Blood Pressure Medication',
    dose: '10mg',
    schedule_type: 'interval',
    interval_minutes: 720, // 12 hours
    interval_days: null,
    meal_timing: null,
    instructions: 'Take with water',
    notes: 'Morning and evening doses',
    active: true,
    created_at: new Date('2024-01-01T00:00:00Z').toISOString(),
    updated_at: new Date('2024-01-01T00:00:00Z').toISOString()
  },
  
  // Mock medicine data (meal-based)
  mockMedicineMeal: {
    id: 'medicine-meal-123',
    user_id: 'test-user-123',
    name: 'Vitamin D',
    dose: '1000 IU',
    schedule_type: 'meal_based',
    interval_minutes: null,
    interval_days: null,
    meal_timing: ['with_meal'],
    instructions: 'Take with breakfast',
    notes: 'Daily vitamin supplement',
    active: true,
    created_at: new Date('2024-01-01T00:00:00Z').toISOString(),
    updated_at: new Date('2024-01-01T00:00:00Z').toISOString()
  },
  
  // Mock medicine log data
  mockMedicineLog: {
    id: 'log-123',
    user_id: 'test-user-123',
    medicine_id: 'medicine-interval-123',
    taken_at: new Date('2024-01-01T08:00:00Z').toISOString(),
    dosage_taken: '10mg',
    notes: 'Taken as scheduled',
    created_at: new Date('2024-01-01T08:00:00Z').toISOString(),
    updated_at: new Date('2024-01-01T08:00:00Z').toISOString()
  },
  
  // Mock weight log data
  mockWeightLog: {
    id: 'weight-123',
    user_id: 'test-user-123',
    weight_kg: 70.5,
    logged_at: new Date('2024-01-01T07:00:00Z').toISOString(),
    notes: 'Morning weight after workout',
    body_fat_percentage: 15.2,
    muscle_mass: 35.8,
    unit: 'kg',
    created_at: new Date('2024-01-01T07:00:00Z').toISOString(),
    updated_at: new Date('2024-01-01T07:00:00Z').toISOString()
  },
  
  // Generate realistic JWT-like tokens for testing
  generateMockToken: (userId = 'test-user-123', email = 'test@example.com') => {
    const header = Buffer.from(JSON.stringify({ 
      alg: 'HS256', 
      typ: 'JWT' 
    })).toString('base64url');
    
    const payload = Buffer.from(JSON.stringify({ 
      sub: userId,
      email: email,
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      iat: Math.floor(Date.now() / 1000),
      iss: 'https://test.supabase.co/auth/v1'
    })).toString('base64url');
    
    const signature = 'mock-signature-for-testing';
    return `${header}.${payload}.${signature}`;
  },
  
  // Generate invalid token for testing authentication failures
  generateInvalidToken: () => 'invalid.jwt.token',
  
  // Generate expired token for testing token expiration
  generateExpiredToken: (userId = 'test-user-123') => {
    const header = Buffer.from(JSON.stringify({ 
      alg: 'HS256', 
      typ: 'JWT' 
    })).toString('base64url');
    
    const payload = Buffer.from(JSON.stringify({ 
      sub: userId,
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago (expired)
    })).toString('base64url');
    
    return `${header}.${payload}.expired-signature`;
  },
  
  // Mock Supabase responses
  mockSupabaseSuccess: (data, count = null) => ({ 
    data, 
    error: null, 
    count,
    status: 200,
    statusText: 'OK'
  }),
  
  mockSupabaseError: (message, code = 'GENERIC_ERROR', status = 400) => ({
    data: null,
    error: { 
      message, 
      code,
      details: null,
      hint: null
    },
    count: null,
    status,
    statusText: 'Error'
  }),
  
  // Common Supabase error responses
  mockSupabaseNotFound: () => ({
    data: null,
    error: {
      message: 'No rows found',
      code: 'PGRST116',
      details: null,
      hint: null
    }
  }),
  
  mockSupabaseUnauthorized: () => ({
    data: null,
    error: {
      message: 'Invalid JWT',
      code: 'INVALID_JWT',
      details: null,
      hint: null
    }
  }),
  
  // Utility functions
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Reset all Supabase mocks (delegates to the dedicated mock file)
  resetSupabaseMocks: () => {
    resetAllMocks();
  },
  
  // Helper to create test request headers
  createAuthHeaders: (token = null) => {
    const mockToken = token || global.testUtils.generateMockToken();
    return {
      'Authorization': `Bearer ${mockToken}`,
      'Content-Type': 'application/json'
    };
  },
  
  // Helper to create medicine test data with variations
  createTestMedicine: (overrides = {}) => ({
    ...global.testUtils.mockMedicineInterval,
    ...overrides,
    id: `medicine-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),
  
  // Helper to create medicine log test data
  createTestMedicineLog: (overrides = {}) => ({
    ...global.testUtils.mockMedicineLog,
    ...overrides,
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    taken_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),
  
  // Helper to create weight log test data
  createTestWeightLog: (overrides = {}) => ({
    ...global.testUtils.mockWeightLog,
    ...overrides,
    id: `weight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    logged_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),

  // Authentication test utilities
  mockAuthenticated: (user = null) => {
    const authMock = require('../middleware/auth');
    authMock.authenticateToken.mockAuthenticated(user || global.testUtils.mockUser);
  },

  mockUnauthenticated: () => {
    const authMock = require('../middleware/auth');
    authMock.authenticateToken.mockUnauthenticated();
  },

  mockUnauthorized: () => {
    const authMock = require('../middleware/auth');
    authMock.authenticateToken.mockUnauthorized();
  },

  resetAuthMocks: () => {
    const authMock = require('../middleware/auth');
    authMock.authenticateToken.mockReset();
  }
};

// Expose the mock Supabase client globally for tests
global.mockSupabaseClient = mockSupabaseClient;

// Setup and teardown hooks
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset Supabase mocks to clean state
  global.testUtils.resetSupabaseMocks();
  
  // Reset auth mocks to clean state
  global.testUtils.resetAuthMocks();
  
  // Silence console output by default (tests can override)
  global.mockConsole.silenceAll();
});

afterEach(() => {
  // Restore console methods after each test
  global.mockConsole.restoreAll();
});

afterAll(() => {
  // Final cleanup
  global.mockConsole.restoreAll();
  jest.restoreAllMocks();
});

// Export for direct importing if needed
module.exports = {
  testUtils: global.testUtils,
  mockSupabaseClient: global.mockSupabaseClient,
  mockConsole: global.mockConsole
};
