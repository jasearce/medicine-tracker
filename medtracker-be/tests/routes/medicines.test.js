/**
 * Medicine Routes Tests
 * 
 * Comprehensive tests for medicine management endpoints including:
 * - CRUD operations for medicines
 * - Interval-based scheduling validation
 * - Meal-based scheduling validation  
 * - Next dose calculations
 * - Authentication and ownership validation
 */

const request = require('supertest');
const express = require('express');
const medicineRoutes = require('../../routes/medicines');

describe('Medicine Routes', () => {
  let app;
  
  beforeAll(() => {
    // Create Express app with medicine routes
    app = express();
    app.use(express.json());
    
    // Mock Supabase client on app.locals
    app.locals.supabase = mockSupabaseClient;
    
    // Mount medicine routes
    app.use('/api/medicines', medicineRoutes);
  });
  
  beforeEach(() => {
    // Reset mocks and set default authentication
    testUtils.resetSupabaseMocks();
    testUtils.mockAuthenticated();
  });
  
  describe('GET /api/medicines', () => {
    test('should get all medicines for authenticated user', async () => {
      const mockMedicines = [
        testUtils.createTestMedicine({
          name: 'Blood Pressure Med',
          schedule_type: 'interval',
          interval_minutes: 720
        }),
        testUtils.createTestMedicine({
          name: 'Vitamin D',
          schedule_type: 'meal_based',
          meal_timing: ['with_meal']
        })
      ];
      
      mockSupabaseClient.from().select().eq().order().mockResolvedValue({
        data: mockMedicines,
        error: null
      });
      
      const response = await request(app)
        .get('/api/medicines')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.message).toBe('Medicines retrieved successfully');
      expect(response.body.medicines).toHaveLength(2);
      expect(response.body.medicines[0].name).toBe('Blood Pressure Med');
      expect(response.body.medicines[1].schedule_type).toBe('meal_based');
      
      // Verify correct database query
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('medicines');
    });
    
    test('should handle empty medicine list', async () => {
      mockSupabaseClient.from().select().eq().order().mockResolvedValue({
        data: [],
        error: null
      });
      
      const response = await request(app)
        .get('/api/medicines')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.medicines).toHaveLength(0);
      expect(response.body.message).toBe('Medicines retrieved successfully');
    });
    
    test('should handle database error', async () => {
      mockSupabaseClient.from().select().eq().order().mockResolvedValue({
        data: null,
        error: { message: 'Database connection error' }
      });
      
      const response = await request(app)
        .get('/api/medicines')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);
      
      expect(response.body.error).toBe('Database Error');
    });
    
    test('should reject unauthenticated request', async () => {
      testUtils.mockUnauthenticated();
      
      const response = await request(app)
        .get('/api/medicines')
        .expect(401);
      
      expect(response.body.error).toBe('Unauthorized');
    });
  });
  
  describe('GET /api/medicines/:id', () => {
    test('should get specific medicine by ID', async () => {
      const mockMedicine = testUtils.createTestMedicine({
        id: 'medicine-123',
        name: 'Specific Medicine'
      });
      
      mockSupabaseClient.from().select().eq().single().mockResolvedValue({
        data: mockMedicine,
        error: null
      });
      
      const response = await request(app)
        .get('/api/medicines/medicine-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.medicine.name).toBe('Specific Medicine');
      expect(response.body.medicine.id).toBe('medicine-123');
    });
    
    test('should handle medicine not found', async () => {
      mockSupabaseClient.from().select().eq().single().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' }
      });
      
      const response = await request(app)
        .get('/api/medicines/nonexistent-id')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);
      
      expect(response.body.error).toBe('Medicine Not Found');
    });
    
    test('should calculate next dose for interval medicine', async () => {
      const mockMedicine = testUtils.createTestMedicine({
        schedule_type: 'interval',
        interval_minutes: 480 // 8 hours
      });
      
      // Mock recent log query
      mockSupabaseClient.from().select().eq().order().limit().mockResolvedValueOnce({
        data: mockMedicine,
        error: null
      }).mockResolvedValueOnce({
        data: [{
          taken_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() // 6 hours ago
        }],
        error: null
      });
      
      const response = await request(app)
        .get('/api/medicines/medicine-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.medicine.nextDoseTime).toBeDefined();
    });
  });
  
  describe('POST /api/medicines', () => {
    describe('Interval-based Medicine', () => {
      test('should create interval medicine successfully', async () => {
        const newMedicine = {
          name: 'Blood Pressure Med',
          dose: '10mg',
          scheduleType: 'interval',
          intervalMinutes: 720, // 12 hours
          instructions: 'Take with water',
          notes: 'Morning and evening'
        };
        
        const createdMedicine = {
          id: 'medicine-123',
          user_id: 'test-user-123',
          ...newMedicine,
          schedule_type: 'interval',
          interval_minutes: 720,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        mockSupabaseClient.from().insert().select().single().mockResolvedValue({
          data: createdMedicine,
          error: null
        });
        
        const response = await request(app)
          .post('/api/medicines')
          .set('Authorization', 'Bearer valid-token')
          .send(newMedicine)
          .expect(201);
        
        expect(response.body.message).toBe('Medicine created successfully');
        expect(response.body.medicine.name).toBe('Blood Pressure Med');
        expect(response.body.medicine.schedule_type).toBe('interval');
        expect(response.body.medicine.interval_minutes).toBe(720);
        
        // Verify database insertion
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('medicines');
      });
      
      test('should validate interval minutes for interval medicine', async () => {
        const response = await request(app)
          .post('/api/medicines')
          .set('Authorization', 'Bearer valid-token')
          .send({
            name: 'Test Medicine',
            dose: '10mg',
            scheduleType: 'interval'
            // Missing intervalMinutes
          })
          .expect(400);
        
        expect(response.body.error).toBe('Validation Error');
        expect(response.body.errors).toContain('Interval minutes are required for interval-based scheduling');
      });
      
      test('should reject invalid interval minutes', async () => {
        const response = await request(app)
          .post('/api/medicines')
          .set('Authorization', 'Bearer valid-token')
          .send({
            name: 'Test Medicine',
            dose: '10mg',
            scheduleType: 'interval',
            intervalMinutes: 0 // Invalid
          })
          .expect(400);
        
        expect(response.body.errors).toContain('Interval minutes must be between 1 and 43200 (30 days)');
      });
    });
    
    describe('Meal-based Medicine', () => {
      test('should create meal-based medicine successfully', async () => {
        const newMedicine = {
          name: 'Vitamin D',
          dose: '1000 IU',
          scheduleType: 'meal_based',
          mealTiming: ['before_meal', 'with_meal'],
          instructions: 'Take with breakfast'
        };
        
        const createdMedicine = {
          id: 'medicine-456',
          user_id: 'test-user-123',
          ...newMedicine,
          schedule_type: 'meal_based',
          meal_timing: ['before_meal', 'with_meal'],
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        mockSupabaseClient.from().insert().select().single().mockResolvedValue({
          data: createdMedicine,
          error: null
        });
        
        const response = await request(app)
          .post('/api/medicines')
          .set('Authorization', 'Bearer valid-token')
          .send(newMedicine)
          .expect(201);
        
        expect(response.body.medicine.schedule_type).toBe('meal_based');
        expect(response.body.medicine.meal_timing).toEqual(['before_meal', 'with_meal']);
      });
      
      test('should validate meal timing for meal-based medicine', async () => {
        const response = await request(app)
          .post('/api/medicines')
          .set('Authorization', 'Bearer valid-token')
          .send({
            name: 'Test Medicine',
            dose: '10mg',
            scheduleType: 'meal_based'
            // Missing mealTiming
          })
          .expect(400);
        
        expect(response.body.errors).toContain('Meal timing is required for meal-based scheduling');
      });
      
      test('should reject invalid meal timing values', async () => {
        const response = await request(app)
          .post('/api/medicines')
          .set('Authorization', 'Bearer valid-token')
          .send({
            name: 'Test Medicine',
            dose: '10mg',
            scheduleType: 'meal_based',
            mealTiming: ['invalid_timing']
          })
          .expect(400);
        
        expect(response.body.errors).toContain('Invalid meal timing values');
      });
    });
    
    describe('Common Validation', () => {
      test('should require medicine name', async () => {
        const response = await request(app)
          .post('/api/medicines')
          .set('Authorization', 'Bearer valid-token')
          .send({
            dose: '10mg',
            scheduleType: 'interval',
            intervalMinutes: 480
          })
          .expect(400);
        
        expect(response.body.errors).toContain('Medicine name is required');
      });
      
      test('should require dose information', async () => {
        const response = await request(app)
          .post('/api/medicines')
          .set('Authorization', 'Bearer valid-token')
          .send({
            name: 'Test Medicine',
            scheduleType: 'interval',
            intervalMinutes: 480
          })
          .expect(400);
        
        expect(response.body.errors).toContain('Dose information is required');
      });
      
      test('should validate name length', async () => {
        const response = await request(app)
          .post('/api/medicines')
          .set('Authorization', 'Bearer valid-token')
          .send({
            name: 'A', // Too short
            dose: '10mg',
            scheduleType: 'interval',
            intervalMinutes: 480
          })
          .expect(400);
        
        expect(response.body.errors).toContain('Medicine name must be at least 2 characters long');
      });
      
      test('should validate schedule type', async () => {
        const response = await request(app)
          .post('/api/medicines')
          .set('Authorization', 'Bearer valid-token')
          .send({
            name: 'Test Medicine',
            dose: '10mg',
            scheduleType: 'invalid_type'
          })
          .expect(400);
        
        expect(response.body.errors).toContain('Schedule type must be either "interval" or "meal_based"');
      });
    });
    
    test('should handle database creation error', async () => {
      mockSupabaseClient.from().insert().select().single().mockResolvedValue({
        data: null,
        error: { message: 'Database constraint violation' }
      });
      
      const response = await request(app)
        .post('/api/medicines')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Test Medicine',
          dose: '10mg',
          scheduleType: 'interval',
          intervalMinutes: 480
        })
        .expect(500);
      
      expect(response.body.error).toBe('Database Error');
    });
  });
  
  describe('PUT /api/medicines/:id', () => {
    test('should update medicine successfully', async () => {
      const updatedData = {
        name: 'Updated Medicine Name',
        dose: '20mg',
        instructions: 'Updated instructions'
      };
      
      const updatedMedicine = {
        id: 'medicine-123',
        user_id: 'test-user-123',
        ...updatedData,
        schedule_type: 'interval',
        interval_minutes: 480,
        active: true,
        updated_at: new Date().toISOString()
      };
      
      mockSupabaseClient.from().update().eq().select().single().mockResolvedValue({
        data: updatedMedicine,
        error: null
      });
      
      const response = await request(app)
        .put('/api/medicines/medicine-123')
        .set('Authorization', 'Bearer valid-token')
        .send(updatedData)
        .expect(200);
      
      expect(response.body.message).toBe('Medicine updated successfully');
      expect(response.body.medicine.name).toBe('Updated Medicine Name');
      expect(response.body.medicine.dose).toBe('20mg');
    });
    
    test('should handle medicine not found during update', async () => {
      mockSupabaseClient.from().update().eq().select().single().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' }
      });
      
      const response = await request(app)
        .put('/api/medicines/nonexistent-id')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Updated Name' })
        .expect(404);
      
      expect(response.body.error).toBe('Medicine Not Found');
    });
    
    test('should validate updated data', async () => {
      const response = await request(app)
        .put('/api/medicines/medicine-123')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: '', // Invalid empty name
          dose: '10mg'
        })
        .expect(400);
      
      expect(response.body.error).toBe('Validation Error');
    });
  });
  
  describe('DELETE /api/medicines/:id', () => {
    test('should delete medicine successfully', async () => {
      mockSupabaseClient.from().delete().eq().mockResolvedValue({
        error: null
      });
      
      const response = await request(app)
        .delete('/api/medicines/medicine-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.message).toBe('Medicine deleted successfully');
      
      // Verify correct deletion call
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('medicines');
    });
    
    test('should handle deletion error', async () => {
      mockSupabaseClient.from().delete().eq().mockResolvedValue({
        error: { message: 'Deletion failed' }
      });
      
      const response = await request(app)
        .delete('/api/medicines/medicine-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);
      
      expect(response.body.error).toBe('Database Error');
    });
  });
  
  describe('PATCH /api/medicines/:id/toggle', () => {
    test('should toggle medicine active status', async () => {
      const toggledMedicine = {
        id: 'medicine-123',
        user_id: 'test-user-123',
        name: 'Test Medicine',
        active: false, // Toggled to inactive
        updated_at: new Date().toISOString()
      };
      
      mockSupabaseClient.from().update().eq().select().single().mockResolvedValue({
        data: toggledMedicine,
        error: null
      });
      
      const response = await request(app)
        .patch('/api/medicines/medicine-123/toggle')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.message).toBe('Medicine status updated successfully');
      expect(response.body.medicine.active).toBe(false);
    });
  });
  
  describe('GET /api/medicines/active', () => {
    test('should get only active medicines', async () => {
      const activeMedicines = [
        testUtils.createTestMedicine({ active: true, name: 'Active Med 1' }),
        testUtils.createTestMedicine({ active: true, name: 'Active Med 2' })
      ];
      
      mockSupabaseClient.from().select().eq().order().mockResolvedValue({
        data: activeMedicines,
        error: null
      });
      
      const response = await request(app)
        .get('/api/medicines/active')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.medicines).toHaveLength(2);
      expect(response.body.medicines.every(med => med.active)).toBe(true);
    });
  });
  
  describe('Authorization & Ownership', () => {
    test('should ensure user can only access their own medicines', async () => {
      // The auth middleware should handle this, but test the integration
      const response = await request(app)
        .get('/api/medicines')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      // Verify that the query includes user_id filter
      expect(mockSupabaseClient.from().select().eq).toHaveBeenCalledWith('user_id', 'test-user-123');
    });
    
    test('should reject unauthorized access', async () => {
      testUtils.mockUnauthorized();
      
      const response = await request(app)
        .get('/api/medicines/medicine-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);
      
      expect(response.body.error).toBe('Access Denied');
    });
  });
});
