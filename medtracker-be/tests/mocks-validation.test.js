/**
 * Mock Validation Test
 * 
 * Tests to verify that our __mocks__ directory structure works correctly
 * and that Supabase mocking is properly configured.
 */

const { createClient } = require('@supabase/supabase-js');

describe('Mock Structure Validation', () => {
  let supabaseClient;
  
  beforeEach(() => {
    // Create a Supabase client (which should use our mock)
    supabaseClient = createClient('https://test.supabase.co', 'test-key');
  });
  
  describe('Supabase Mock Integration', () => {
    test('should use mocked createClient from __mocks__ directory', () => {
      expect(createClient).toBeDefined();
      expect(jest.isMockFunction(createClient)).toBe(true);
      expect(supabaseClient).toBeDefined();
    });
    
    test('should have mocked auth methods', () => {
      expect(supabaseClient.auth).toBeDefined();
      expect(jest.isMockFunction(supabaseClient.auth.getUser)).toBe(true);
      expect(jest.isMockFunction(supabaseClient.auth.signUp)).toBe(true);
      expect(jest.isMockFunction(supabaseClient.auth.signInWithPassword)).toBe(true);
    });
    
    test('should have mocked database methods', () => {
      expect(supabaseClient.from).toBeDefined();
      expect(jest.isMockFunction(supabaseClient.from)).toBe(true);
      
      const queryBuilder = supabaseClient.from('test_table');
      expect(jest.isMockFunction(queryBuilder.select)).toBe(true);
      expect(jest.isMockFunction(queryBuilder.insert)).toBe(true);
      expect(jest.isMockFunction(queryBuilder.update)).toBe(true);
      expect(jest.isMockFunction(queryBuilder.delete)).toBe(true);
    });
    
    test('should support method chaining', () => {
      const query = supabaseClient
        .from('medicines')
        .select('*')
        .eq('user_id', 'test-123')
        .order('created_at')
        .limit(10);
      
      // Should not throw an error
      expect(query).toBeDefined();
      
      // Verify that chaining methods were called
      expect(supabaseClient.from).toHaveBeenCalledWith('medicines');
    });
    
    test('should have additional Supabase features', () => {
      // RPC methods
      expect(jest.isMockFunction(supabaseClient.rpc)).toBe(true);
      
      // Storage methods
      expect(supabaseClient.storage).toBeDefined();
      expect(jest.isMockFunction(supabaseClient.storage.from)).toBe(true);
      
      // Realtime methods
      expect(jest.isMockFunction(supabaseClient.channel)).toBe(true);
    });
  });
  
  describe('Mock Reset Functionality', () => {
    test('should reset mocks using testUtils.resetSupabaseMocks', () => {
      // Make some calls to mock functions
      supabaseClient.auth.getUser();
      supabaseClient.from('test').select('*');
      
      // Verify calls were made
      expect(supabaseClient.auth.getUser).toHaveBeenCalled();
      expect(supabaseClient.from).toHaveBeenCalled();
      
      // Reset mocks
      testUtils.resetSupabaseMocks();
      
      // Verify calls were cleared
      expect(supabaseClient.auth.getUser).not.toHaveBeenCalled();
      expect(supabaseClient.from).not.toHaveBeenCalled();
    });
    
    test('should maintain mock functionality after reset', () => {
      testUtils.resetSupabaseMocks();
      
      // Should still be able to use mocked methods
      const queryBuilder = supabaseClient.from('test_table');
      expect(queryBuilder.select).toBeDefined();
      expect(jest.isMockFunction(queryBuilder.select)).toBe(true);
    });
  });
  
  describe('Mock Response Simulation', () => {
    test('should simulate successful database responses', async () => {
      const mockData = [{ id: '1', name: 'Test Medicine' }];
      
      // Configure mock to return specific data
      const queryBuilder = supabaseClient.from('medicines');
      queryBuilder.select.mockResolvedValue({
        data: mockData,
        error: null
      });
      
      // Execute query
      const result = await queryBuilder.select('*');
      
      // Verify response
      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
    });
    
    test('should simulate database errors', async () => {
      const mockError = {
        message: 'Table not found',
        code: 'PGRST116'
      };
      
      // Configure mock to return an error
      const queryBuilder = supabaseClient.from('invalid_table');
      queryBuilder.select.mockResolvedValue({
        data: null,
        error: mockError
      });
      
      // Execute query
      const result = await queryBuilder.select('*');
      
      // Verify error response
      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });
    
    test('should simulate authentication responses', async () => {
      const mockUser = {
        id: 'test-user-123',
        email: 'test@example.com',
        email_verified: true
      };
      
      // Configure auth mock
      supabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });
      
      // Execute auth call
      const result = await supabaseClient.auth.getUser();
      
      // Verify response
      expect(result.data.user).toEqual(mockUser);
      expect(result.error).toBeNull();
    });
  });
  
  describe('Global Mock Utilities', () => {
    test('should have testUtils available globally', () => {
      expect(testUtils).toBeDefined();
      expect(testUtils.mockSupabaseSuccess).toBeDefined();
      expect(testUtils.mockSupabaseError).toBeDefined();
      expect(testUtils.resetSupabaseMocks).toBeDefined();
    });
    
    test('should have mockSupabaseClient available globally', () => {
      expect(mockSupabaseClient).toBeDefined();
      expect(mockSupabaseClient.auth).toBeDefined();
      expect(mockSupabaseClient.from).toBeDefined();
    });
    
    test('should create standardized mock responses', () => {
      const mockData = [{ id: '1', name: 'Test' }];
      const successResponse = testUtils.mockSupabaseSuccess(mockData);
      
      expect(successResponse.data).toBe(mockData);
      expect(successResponse.error).toBeNull();
      expect(successResponse.status).toBe(200);
      
      const errorResponse = testUtils.mockSupabaseError('Test error', 'TEST_CODE');
      expect(errorResponse.data).toBeNull();
      expect(errorResponse.error.message).toBe('Test error');
      expect(errorResponse.error.code).toBe('TEST_CODE');
    });
  });
});

// Additional test to verify the mock file export structure
describe('Mock File Export Structure', () => {
  test('should export correct structure from mock file', () => {
    // Import the mock file directly
    const mockModule = require('./__mocks__/@supabase/supabase-js');
    
    expect(mockModule.createClient).toBeDefined();
    expect(mockModule.mockSupabaseClient).toBeDefined();
    expect(mockModule.resetAllMocks).toBeDefined();
    
    expect(jest.isMockFunction(mockModule.createClient)).toBe(true);
  });
});
