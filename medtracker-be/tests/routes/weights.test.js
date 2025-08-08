/**
 * Weight Logs Routes Tests
 * 
 * Comprehensive tests for weight tracking endpoints including:
 * - CRUD operations for weight logs
 * - Body composition metrics (body fat, muscle mass)
 * - Unit conversion (kg, lbs)
 * - Trend analytics and statistics
 * - Time-based filtering and queries
 * - Authentication and ownership validation
 */

const request = require('supertest');
const express = require('express');
const weightsRoutes = require('../../routes/weights');

describe('Weight Logs Routes', () => {
  let app;
  
  beforeAll(() => {
    // Create Express app with weights routes
    app = express();
    app.use(express.json());
    
    // Mock Supabase client on app.locals
    app.locals.supabase = mockSupabaseClient;
    
    // Mount weights routes
    app.use('/api/weights', weightsRoutes);
  });
  
  beforeEach(() => {
    // Reset mocks and set default authentication
    testUtils.resetSupabaseMocks();
    testUtils.mockAuthenticated();
  });
  
  describe('GET /api/weights', () => {
    test('should get all weight logs for authenticated user', async () => {
      const mockWeights = [
        testUtils.createTestWeightLog({
          weight_kg: 70.5,
          body_fat_percentage: 15.2,
          muscle_mass: 35.8,
          unit: 'kg'
        }),
        testUtils.createTestWeightLog({
          weight_kg: 69.8,
          body_fat_percentage: 14.9,
          muscle_mass: 36.1,
          unit: 'kg'
        })
      ];
      
      mockSupabaseClient.from().select().eq().order().mockResolvedValue({
        data: mockWeights,
        error: null
      });
      
      const response = await request(app)
        .get('/api/weights')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.message).toBe('Weight logs retrieved successfully');
      expect(response.body.weights).toHaveLength(2);
      expect(response.body.weights[0].weight_kg).toBe(70.5);
      expect(response.body.weights[0].body_fat_percentage).toBe(15.2);
      expect(response.body.weights[1].muscle_mass).toBe(36.1);
      
      // Verify correct database query
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('weight_logs');
    });
    
    test('should filter weight logs by date range', async () => {
      const mockWeights = [testUtils.createTestWeightLog()];
      
      mockSupabaseClient.from().select().eq().gte().lte().order().mockResolvedValue({
        data: mockWeights,
        error: null
      });
      
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      
      const response = await request(app)
        .get(`/api/weights?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.weights).toHaveLength(1);
      // Verify date filtering was applied
      expect(mockSupabaseClient.from().select().eq().gte).toHaveBeenCalledWith('logged_at', startDate);
      expect(mockSupabaseClient.from().select().eq().gte().lte).toHaveBeenCalledWith('logged_at', endDate);
    });
    
    test('should handle pagination', async () => {
      const mockWeights = Array.from({ length: 25 }, () => testUtils.createTestWeightLog());
      
      mockSupabaseClient.from().select().eq().order().range().mockResolvedValue({
        data: mockWeights.slice(0, 20),
        error: null
      });
      
      const response = await request(app)
        .get('/api/weights?page=1&limit=20')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.weights).toHaveLength(20);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 20,
        hasMore: true
      });
    });
    
    test('should handle empty weight logs list', async () => {
      mockSupabaseClient.from().select().eq().order().mockResolvedValue({
        data: [],
        error: null
      });
      
      const response = await request(app)
        .get('/api/weights')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.weights).toHaveLength(0);
      expect(response.body.message).toBe('Weight logs retrieved successfully');
    });
    
    test('should handle database error', async () => {
      mockSupabaseClient.from().select().eq().order().mockResolvedValue({
        data: null,
        error: { message: 'Database connection error' }
      });
      
      const response = await request(app)
        .get('/api/weights')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);
      
      expect(response.body.error).toBe('Database Error');
    });
    
    test('should reject unauthenticated request', async () => {
      testUtils.mockUnauthenticated();
      
      const response = await request(app)
        .get('/api/weights')
        .expect(401);
      
      expect(response.body.error).toBe('Unauthorized');
    });
  });
  
  describe('GET /api/weights/:id', () => {
    test('should get specific weight log by ID', async () => {
      const mockWeight = testUtils.createTestWeightLog({
        id: 'weight-123',
        weight_kg: 72.3,
        notes: 'Morning weight after workout'
      });
      
      mockSupabaseClient.from().select().eq().single().mockResolvedValue({
        data: mockWeight,
        error: null
      });
      
      const response = await request(app)
        .get('/api/weights/weight-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.weight.id).toBe('weight-123');
      expect(response.body.weight.weight_kg).toBe(72.3);
      expect(response.body.weight.notes).toBe('Morning weight after workout');
    });
    
    test('should handle weight log not found', async () => {
      mockSupabaseClient.from().select().eq().single().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' }
      });
      
      const response = await request(app)
        .get('/api/weights/nonexistent-id')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);
      
      expect(response.body.error).toBe('Weight Log Not Found');
    });
  });
  
  describe('POST /api/weights', () => {
    test('should create weight log with all metrics', async () => {
      const newWeight = {
        weightKg: 71.2,
        loggedAt: '2024-01-01T07:00:00Z',
        notes: 'Morning weight',
        bodyFatPercentage: 16.5,
        muscleMass: 34.8,
        unit: 'kg'
      };
      
      const createdWeight = {
        id: 'weight-123',
        user_id: 'test-user-123',
        weight_kg: 71.2,
        logged_at: '2024-01-01T07:00:00Z',
        notes: 'Morning weight',
        body_fat_percentage: 16.5,
        muscle_mass: 34.8,
        unit: 'kg',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      mockSupabaseClient.from().insert().select().single().mockResolvedValue({
        data: createdWeight,
        error: null
      });
      
      const response = await request(app)
        .post('/api/weights')
        .set('Authorization', 'Bearer valid-token')
        .send(newWeight)
        .expect(201);
      
      expect(response.body.message).toBe('Weight log created successfully');
      expect(response.body.weight.weight_kg).toBe(71.2);
      expect(response.body.weight.body_fat_percentage).toBe(16.5);
      expect(response.body.weight.muscle_mass).toBe(34.8);
      expect(response.body.weight.user_id).toBe('test-user-123');
      
      // Verify database insertion
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('weight_logs');
    });
    
    test('should create weight log with minimal data', async () => {
      const newWeight = {
        weightKg: 70.0
        // Only required field provided
      };
      
      const createdWeight = {
        id: 'weight-123',
        user_id: 'test-user-123',
        weight_kg: 70.0,
        logged_at: expect.any(String),
        unit: 'kg',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      mockSupabaseClient.from().insert().select().single().mockResolvedValue({
        data: createdWeight,
        error: null
      });
      
      const response = await request(app)
        .post('/api/weights')
        .set('Authorization', 'Bearer valid-token')
        .send(newWeight)
        .expect(201);
      
      expect(response.body.weight.weight_kg).toBe(70.0);
      expect(response.body.weight.logged_at).toBeDefined();
      expect(response.body.weight.unit).toBe('kg');
    });
    
    test('should handle pounds unit conversion', async () => {
      const newWeight = {
        weightKg: 154.3, // This should be in lbs but named weightKg
        unit: 'lbs'
      };
      
      const createdWeight = {
        id: 'weight-123',
        user_id: 'test-user-123',
        weight_kg: 70.0, // Converted to kg
        unit: 'lbs',
        logged_at: expect.any(String),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      mockSupabaseClient.from().insert().select().single().mockResolvedValue({
        data: createdWeight,
        error: null
      });
      
      const response = await request(app)
        .post('/api/weights')
        .set('Authorization', 'Bearer valid-token')
        .send(newWeight)
        .expect(201);
      
      expect(response.body.weight.unit).toBe('lbs');
      // Should store converted kg value in database
      expect(response.body.weight.weight_kg).toBe(70.0);
    });
    
    test('should require weight value', async () => {
      const response = await request(app)
        .post('/api/weights')
        .set('Authorization', 'Bearer valid-token')
        .send({
          notes: 'Weight log without weight value'
        })
        .expect(400);
      
      expect(response.body.error).toBe('Validation Error');
      expect(response.body.errors).toContain('Weight value is required');
    });
    
    test('should validate weight range', async () => {
      const response = await request(app)
        .post('/api/weights')
        .set('Authorization', 'Bearer valid-token')
        .send({
          weightKg: 0 // Invalid weight
        })
        .expect(400);
      
      expect(response.body.errors).toContain('Weight must be between 1 and 1000 kg');
    });
    
    test('should validate body fat percentage range', async () => {
      const response = await request(app)
        .post('/api/weights')
        .set('Authorization', 'Bearer valid-token')
        .send({
          weightKg: 70.0,
          bodyFatPercentage: 150 // Invalid percentage
        })
        .expect(400);
      
      expect(response.body.errors).toContain('Body fat percentage must be between 0 and 100');
    });
    
    test('should validate muscle mass range', async () => {
      const response = await request(app)
        .post('/api/weights')
        .set('Authorization', 'Bearer valid-token')
        .send({
          weightKg: 70.0,
          muscleMass: -5 // Invalid muscle mass
        })
        .expect(400);
      
      expect(response.body.errors).toContain('Muscle mass must be a positive number');
    });
    
    test('should validate unit values', async () => {
      const response = await request(app)
        .post('/api/weights')
        .set('Authorization', 'Bearer valid-token')
        .send({
          weightKg: 70.0,
          unit: 'invalid_unit'
        })
        .expect(400);
      
      expect(response.body.errors).toContain('Unit must be either "kg", "lbs", or "pounds"');
    });
    
    test('should validate timestamp format', async () => {
      const response = await request(app)
        .post('/api/weights')
        .set('Authorization', 'Bearer valid-token')
        .send({
          weightKg: 70.0,
          loggedAt: 'invalid-date'
        })
        .expect(400);
      
      expect(response.body.errors).toContain('Invalid logged_at timestamp format');
    });
    
    test('should handle database creation error', async () => {
      mockSupabaseClient.from().insert().select().single().mockResolvedValue({
        data: null,
        error: { message: 'Database constraint violation' }
      });
      
      const response = await request(app)
        .post('/api/weights')
        .set('Authorization', 'Bearer valid-token')
        .send({
          weightKg: 70.0
        })
        .expect(500);
      
      expect(response.body.error).toBe('Database Error');
    });
  });
  
  describe('PUT /api/weights/:id', () => {
    test('should update weight log successfully', async () => {
      const updatedData = {
        weightKg: 69.5,
        notes: 'Updated weight measurement',
        bodyFatPercentage: 15.8
      };
      
      const updatedWeight = {
        id: 'weight-123',
        user_id: 'test-user-123',
        weight_kg: 69.5,
        notes: 'Updated weight measurement',
        body_fat_percentage: 15.8,
        updated_at: new Date().toISOString()
      };
      
      mockSupabaseClient.from().update().eq().select().single().mockResolvedValue({
        data: updatedWeight,
        error: null
      });
      
      const response = await request(app)
        .put('/api/weights/weight-123')
        .set('Authorization', 'Bearer valid-token')
        .send(updatedData)
        .expect(200);
      
      expect(response.body.message).toBe('Weight log updated successfully');
      expect(response.body.weight.weight_kg).toBe(69.5);
      expect(response.body.weight.notes).toBe('Updated weight measurement');
      expect(response.body.weight.body_fat_percentage).toBe(15.8);
    });
    
    test('should handle weight log not found during update', async () => {
      mockSupabaseClient.from().update().eq().select().single().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' }
      });
      
      const response = await request(app)
        .put('/api/weights/nonexistent-id')
        .set('Authorization', 'Bearer valid-token')
        .send({ weightKg: 70.0 })
        .expect(404);
      
      expect(response.body.error).toBe('Weight Log Not Found');
    });
    
    test('should validate updated data', async () => {
      const response = await request(app)
        .put('/api/weights/weight-123')
        .set('Authorization', 'Bearer valid-token')
        .send({
          weightKg: 1500, // Invalid weight (too high)
          bodyFatPercentage: 200 // Invalid percentage
        })
        .expect(400);
      
      expect(response.body.error).toBe('Validation Error');
      expect(response.body.errors).toContain('Weight must be between 1 and 1000 kg');
    });
  });
  
  describe('DELETE /api/weights/:id', () => {
    test('should delete weight log successfully', async () => {
      mockSupabaseClient.from().delete().eq().mockResolvedValue({
        error: null
      });
      
      const response = await request(app)
        .delete('/api/weights/weight-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.message).toBe('Weight log deleted successfully');
      
      // Verify correct deletion call
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('weight_logs');
    });
    
    test('should handle deletion error', async () => {
      mockSupabaseClient.from().delete().eq().mockResolvedValue({
        error: { message: 'Deletion failed' }
      });
      
      const response = await request(app)
        .delete('/api/weights/weight-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);
      
      expect(response.body.error).toBe('Database Error');
    });
  });
  
  describe('GET /api/weights/analytics/trends', () => {
    test('should calculate weight trends', async () => {
      const mockWeights = Array.from({ length: 30 }, (_, i) => 
        testUtils.createTestWeightLog({
          weight_kg: 70 + (i * 0.1), // Gradual weight change
          logged_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
        })
      );
      
      mockSupabaseClient.from().select().eq().gte().order().mockResolvedValue({
        data: mockWeights,
        error: null
      });
      
      const response = await request(app)
        .get('/api/weights/analytics/trends?period=monthly')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.trends).toBeDefined();
      expect(response.body.trends.period).toBe('monthly');
      expect(response.body.trends.totalEntries).toBe(30);
      expect(response.body.trends.averageWeight).toBeCloseTo(71.45, 1);
      expect(response.body.trends.weightChange).toBeDefined();
      expect(response.body.trends.trend).toBeDefined(); // 'increasing', 'decreasing', or 'stable'
    });
    
    test('should calculate weekly trends', async () => {
      const mockWeights = Array.from({ length: 7 }, (_, i) => 
        testUtils.createTestWeightLog({
          weight_kg: 70,
          logged_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
        })
      );
      
      mockSupabaseClient.from().select().eq().gte().order().mockResolvedValue({
        data: mockWeights,
        error: null
      });
      
      const response = await request(app)
        .get('/api/weights/analytics/trends?period=weekly')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.trends.period).toBe('weekly');
      expect(response.body.trends.totalEntries).toBe(7);
    });
    
    test('should handle trends with no data', async () => {
      mockSupabaseClient.from().select().eq().gte().order().mockResolvedValue({
        data: [],
        error: null
      });
      
      const response = await request(app)
        .get('/api/weights/analytics/trends?period=weekly')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.trends.totalEntries).toBe(0);
      expect(response.body.trends.averageWeight).toBe(0);
      expect(response.body.trends.trend).toBe('no_data');
    });
  });
  
  describe('GET /api/weights/analytics/stats', () => {
    test('should calculate comprehensive weight statistics', async () => {
      const mockWeights = [
        testUtils.createTestWeightLog({ weight_kg: 68.5 }),
        testUtils.createTestWeightLog({ weight_kg: 70.0 }),
        testUtils.createTestWeightLog({ weight_kg: 71.5 }),
        testUtils.createTestWeightLog({ weight_kg: 69.8 }),
        testUtils.createTestWeightLog({ weight_kg: 70.2 })
      ];
      
      mockSupabaseClient.from().select().eq().gte().order().mockResolvedValue({
        data: mockWeights,
        error: null
      });
      
      const response = await request(app)
        .get('/api/weights/analytics/stats?period=monthly')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.current).toBe(70.2);
      expect(response.body.stats.minimum).toBe(68.5);
      expect(response.body.stats.maximum).toBe(71.5);
      expect(response.body.stats.average).toBeCloseTo(70.0, 1);
      expect(response.body.stats.totalEntries).toBe(5);
      expect(response.body.stats.period).toBe('monthly');
    });
  });
  
  describe('GET /api/weights/latest', () => {
    test('should get latest weight entry', async () => {
      const latestWeight = testUtils.createTestWeightLog({
        weight_kg: 70.5,
        logged_at: new Date().toISOString()
      });
      
      mockSupabaseClient.from().select().eq().order().limit().single().mockResolvedValue({
        data: latestWeight,
        error: null
      });
      
      const response = await request(app)
        .get('/api/weights/latest')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.weight.weight_kg).toBe(70.5);
      expect(response.body.message).toBe('Latest weight retrieved successfully');
    });
    
    test('should handle no weight entries', async () => {
      mockSupabaseClient.from().select().eq().order().limit().single().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' }
      });
      
      const response = await request(app)
        .get('/api/weights/latest')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);
      
      expect(response.body.error).toBe('No Weight Entries Found');
    });
  });
  
  describe('Authorization & Ownership', () => {
    test('should ensure user can only access their own weight logs', async () => {
      const response = await request(app)
        .get('/api/weights')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      // Verify that the query includes user_id filter
      expect(mockSupabaseClient.from().select().eq).toHaveBeenCalledWith('user_id', 'test-user-123');
    });
    
    test('should reject unauthorized access', async () => {
      testUtils.mockUnauthorized();
      
      const response = await request(app)
        .get('/api/weights/weight-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);
      
      expect(response.body.error).toBe('Access Denied');
    });
    
    test('should automatically set user_id on creation', async () => {
      mockSupabaseClient.from().insert().select().single().mockResolvedValue({
        data: testUtils.createTestWeightLog(),
        error: null
      });
      
      const response = await request(app)
        .post('/api/weights')
        .set('Authorization', 'Bearer valid-token')
        .send({ weightKg: 70.0 })
        .expect(201);
      
      expect(response.body.weight.user_id).toBe('test-user-123');
    });
  });
});
