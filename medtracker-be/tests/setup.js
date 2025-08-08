
/**
 * Jest Test Setup
 * 
 * Global test configuration and utilities
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.PORT = '3002';

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

global.mockConsole = {
  silenceErrors: () => {
    console.error = jest.fn();
  },
  silenceLogs: () => {
    console.log = jest.fn();
  },
  restoreErrors: () => {
    console.error = originalConsoleError;
  },
  restoreLogs: () => {
    console.log = originalConsoleLog;
  },
  restoreAll: () => {
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  }
};

// Global test utilities
global.testUtils = {
  // Mock user data
  mockUser: {
    id: 'test-user-123',
    email: 'test@example.com',
    emailVerified: true,
    createdAt: new Date().toISOString(),
    lastSignIn: new Date().toISOString(),
    userMetadata: {
      firstName: 'Test',
      lastName: 'User',
      fullName: 'Test User'
    }
  },
  
  // Mock medicine data
  mockMedicine: {
    id: 'medicine-123',
    user_id: 'test-user-123',
    name: 'Test Medicine',
    dose: '10mg',
    schedule_type: 'interval',
    interval_minutes: 480, // 8 hours
    interval_days: null,
    meal_timing: null,
    instructions: 'Take with water',
    notes: 'Test notes',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  
  // Mock medicine log data
  mockMedicineLog: {
    id: 'log-123',
    user_id: 'test-user-123',
    medicine_id: 'medicine-123',
    taken_at: new Date().toISOString(),
    dosage_taken: '10mg',
    notes: 'Taken as scheduled',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  
  // Mock weight log data
  mockWeightLog: {
    id: 'weight-123',
    user_id: 'test-user-123',
    weight_kg: 70.5,
    logged_at: new Date().toISOString(),
    notes: 'Morning weight',
    body_fat_percentage: 15.2,
    muscle_mass: 35.8,
    unit: 'kg',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  
  // Generate JWT-like tokens for testing
  generateMockToken: (userId = 'test-user-123') => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({ 
      sub: userId, 
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600 
    })).toString('base64');
    const signature = 'mock-signature';
    return `${header}.${payload}.${signature}`;
  },
  
  // Mock Supabase responses
  mockSupabaseSuccess: (data) => ({ data, error: null }),
  mockSupabaseError: (message, code = 'GENERIC_ERROR') => ({
    data: null,
    error: { message, code }
  }),
  
  // Wait for async operations in tests
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Setup and teardown
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterAll(() => {
  // Restore console methods
  global.mockConsole.restoreAll();
});