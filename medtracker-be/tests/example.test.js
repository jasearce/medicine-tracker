/**
 * Example Test File
 * 
 * Demonstrates how to use the improved test setup for testing
 * Medicine Tracker API endpoints with proper mocking
 */

const request = require('supertest');
const express = require('express');

// Example of how to test a route (you'll replace this with your actual routes)
describe('Example Tests - Setup Validation', () => {
  let app;
  
  beforeAll(() => {
    // Create a simple Express app for testing
    app = express();
    app.use(express.json());
    
    // Mock route for testing
    app.get('/test/user', (req, res) => {
      res.json({ message: 'Test endpoint', user: testUtils.mockUser });
    });
    
    app.get('/test/auth', (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }
      
      const token = authHeader.split(' ')[1];
      if (token === 'invalid.jwt.token') {
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      res.json({ message: 'Authenticated', token });
    });
  });
  
  describe('Test Setup Validation', () => {
    test('should have testUtils available globally', () => {
      expect(testUtils).toBeDefined();
      expect(testUtils.mockUser).toBeDefined();
      expect(testUtils.generateMockToken).toBeFunction();
    });
    
    test('should have mockSupabaseClient available', () => {
      expect(mockSupabaseClient).toBeDefined();
      expect(mockSupabaseClient.auth).toBeDefined();
      expect(mockSupabaseClient.from).toBeFunction();
    });
    
    test('should have console mocking utilities', () => {
      expect(mockConsole).toBeDefined();
      expect(mockConsole.silenceAll).toBeFunction();
      expect(mockConsole.restoreAll).toBeFunction();
    });
  });
  
  describe('Mock Data Validation', () => {
    test('should have valid mock user data', () => {
      const user = testUtils.mockUser;
      expect(user.id).toBe('test-user-123');
      expect(user.email).toBe('test@example.com');
      expect(user.userMetadata.firstName).toBe('Test');
    });
    
    test('should have valid mock medicine data', () => {
      const medicine = testUtils.mockMedicineInterval;
      expect(medicine.schedule_type).toBe('interval');
      expect(medicine.interval_minutes).toBe(720);
      expect(medicine.meal_timing).toBeNull();
      
      const mealMedicine = testUtils.mockMedicineMeal;
      expect(mealMedicine.schedule_type).toBe('meal_based');
      expect(mealMedicine.meal_timing).toEqual(['with_meal']);
      expect(mealMedicine.interval_minutes).toBeNull();
    });
    
    test('should create unique test data with helpers', () => {
      const medicine1 = testUtils.createTestMedicine();
      const medicine2 = testUtils.createTestMedicine();
      
      expect(medicine1.id).not.toBe(medicine2.id);
      expect(medicine1.name).toBe(testUtils.mockMedicineInterval.name);
    });
  });
  
  describe('Token Generation', () => {
    test('should generate valid mock tokens', () => {
      const token = testUtils.generateMockToken();
      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3); // header.payload.signature
    });
    
    test('should generate tokens with custom user data', () => {
      const customUserId = 'custom-user-456';
      const customEmail = 'custom@example.com';
      const token = testUtils.generateMockToken(customUserId, customEmail);
      
      // Decode payload to verify
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64url').toString()
      );
      expect(payload.sub).toBe(customUserId);
      expect(payload.email).toBe(customEmail);
    });
    
    test('should generate expired tokens', () => {
      const expiredToken = testUtils.generateExpiredToken();
      const payload = JSON.parse(
        Buffer.from(expiredToken.split('.')[1], 'base64url').toString()
      );
      expect(payload.exp).toBeLessThan(Math.floor(Date.now() / 1000));
    });
  });
  
  describe('Supabase Mocking', () => {
    test('should mock successful Supabase responses', () => {
      const mockData = [testUtils.mockMedicineInterval];
      const response = testUtils.mockSupabaseSuccess(mockData);
      
      expect(response.data).toBe(mockData);
      expect(response.error).toBeNull();
    });
    
    test('should mock Supabase errors', () => {
      const response = testUtils.mockSupabaseError('Test error', 'TEST_ERROR');
      
      expect(response.data).toBeNull();
      expect(response.error.message).toBe('Test error');
      expect(response.error.code).toBe('TEST_ERROR');
    });
    
    test('should reset Supabase mocks', () => {
      // Make some calls to mock functions
      mockSupabaseClient.from('test').select('*');
      mockSupabaseClient.auth.getUser();
      
      expect(mockSupabaseClient.from).toHaveBeenCalled();
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
      
      // Reset mocks
      testUtils.resetSupabaseMocks();
      
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
      expect(mockSupabaseClient.auth.getUser).not.toHaveBeenCalled();
    });
  });
  
  describe('HTTP Request Testing', () => {
    test('should make GET request to test endpoint', async () => {
      const response = await request(app)
        .get('/test/user')
        .expect(200);
      
      expect(response.body.message).toBe('Test endpoint');
      expect(response.body.user.id).toBe('test-user-123');
    });
    
    test('should handle authentication with valid token', async () => {
      const token = testUtils.generateMockToken();
      const headers = testUtils.createAuthHeaders(token);
      
      const response = await request(app)
        .get('/test/auth')
        .set(headers)
        .expect(200);
      
      expect(response.body.message).toBe('Authenticated');
    });
    
    test('should reject requests without token', async () => {
      const response = await request(app)
        .get('/test/auth')
        .expect(401);
      
      expect(response.body.error).toBe('No token provided');
    });
    
    test('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/test/auth')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);
      
      expect(response.body.error).toBe('Invalid token');
    });
  });
  
  describe('Console Mocking', () => {
    test('should silence and restore console methods', () => {
      // First restore console to get the original reference
      mockConsole.restoreAll();
      const originalError = console.error;
      
      // Silence errors
      mockConsole.silenceErrors();
      expect(console.error).not.toBe(originalError);
      expect(jest.isMockFunction(console.error)).toBe(true);
      
      // Test that errors are silenced
      console.error('This should be silenced');
      expect(console.error).toHaveBeenCalledWith('This should be silenced');
      
      // Restore errors
      mockConsole.restoreErrors();
      expect(console.error).toBe(originalError);
      expect(jest.isMockFunction(console.error)).toBe(false);
    });
  });
  
  describe('Utility Functions', () => {
    test('should have sleep utility', async () => {
      const start = Date.now();
      await testUtils.sleep(100);
      const end = Date.now();
      
      expect(end - start).toBeGreaterThanOrEqual(90); // Allow some tolerance
    });
    
    test('should create auth headers helper', () => {
      const headers = testUtils.createAuthHeaders();
      
      expect(headers.Authorization).toMatch(/^Bearer /);
      expect(headers['Content-Type']).toBe('application/json');
    });
  });
});

// Extend Jest matchers for better testing experience
expect.extend({
  toBeFunction(received) {
    const pass = typeof received === 'function';
    if (pass) {
      return {
        message: () => `expected ${received} not to be a function`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a function`,
        pass: false,
      };
    }
  }
});
