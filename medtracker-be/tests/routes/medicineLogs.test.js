/**
 * Medicine Logs Routes Tests
 * 
 * Comprehensive tests for medicine logging endpoints including:
 * - CRUD operations for medicine intake logs
 * - Dose tracking and validation
 * - Adherence analytics and statistics
 * - Time-based filtering and queries
 * - Authentication and ownership validation
 */

const request = require('supertest');
const express = require('express');
const medicineLogsRoutes = require('../../routes/medicineLogs');

describe('Medicine Logs Routes', () => {
  let app;
  
  beforeAll(() => {
    // Create Express app with medicine logs routes
    app = express();
    app.use(express.json());
    
    // Mock Supabase client on app.locals
    app.locals.supabase = mockSupabaseClient;
    
    // Mount medicine logs routes
    app.use('/api/medicine-logs', medicineLogsRoutes);
  });
  
  beforeEach(() => {
    // Reset mocks and set default authentication
    testUtils.resetSupabaseMocks();
    testUtils.mockAuthenticated();
  });
  
  describe('GET /api/medicine-logs', () => {
    test('should get all medicine logs for authenticated user', async () => {
      const mockLogs = [
        testUtils.createTestMedicineLog({
          medicine_id: 'medicine-123',
          dosage_taken: '10mg',
          notes: 'Taken as scheduled'
        }),
        testUtils.createTestMedicineLog({
          medicine_id: 'medicine-456',
          dosage_taken: '5mg',
          notes: 'Taken with breakfast'
        })
      ];
      
      mockSupabaseClient.from().select().eq().order().mockResolvedValue({
        data: mockLogs,
        error: null
      });
      
      const response = await request(app)
        .get('/api/medicine-logs')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.message).toBe('Medicine logs retrieved successfully');
      expect(response.body.logs).toHaveLength(2);
      expect(response.body.logs[0].dosage_taken).toBe('10mg');
      expect(response.body.logs[1].notes).toBe('Taken with breakfast');
      
      // Verify correct database query
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('medicine_logs');
    });
    
    test('should get logs with medicine details when including medicine info', async () => {
      const mockLogsWithMedicine = [
        {
          ...testUtils.createTestMedicineLog(),
          medicines: {
            id: 'medicine-123',
            name: 'Blood Pressure Med',
            dose: '10mg'
          }
        }
      ];
      
      mockSupabaseClient.from().select().eq().order().mockResolvedValue({
        data: mockLogsWithMedicine,
        error: null
      });
      
      const response = await request(app)
        .get('/api/medicine-logs?include=medicine')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.logs[0].medicines).toBeDefined();
      expect(response.body.logs[0].medicines.name).toBe('Blood Pressure Med');
    });
    
    test('should filter logs by date range', async () => {
      const mockLogs = [testUtils.createTestMedicineLog()];
      
      mockSupabaseClient.from().select().eq().gte().lte().order().mockResolvedValue({
        data: mockLogs,
        error: null
      });
      
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      
      const response = await request(app)
        .get(`/api/medicine-logs?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.logs).toHaveLength(1);
      // Verify date filtering was applied
      expect(mockSupabaseClient.from().select().eq().gte).toHaveBeenCalledWith('taken_at', startDate);
      expect(mockSupabaseClient.from().select().eq().gte().lte).toHaveBeenCalledWith('taken_at', endDate);
    });
    
    test('should filter logs by medicine ID', async () => {
      const mockLogs = [testUtils.createTestMedicineLog({ medicine_id: 'medicine-123' })];
      
      mockSupabaseClient.from().select().eq().order().mockResolvedValue({
        data: mockLogs,
        error: null
      });
      
      const response = await request(app)
        .get('/api/medicine-logs?medicineId=medicine-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.logs).toHaveLength(1);
      expect(response.body.logs[0].medicine_id).toBe('medicine-123');
    });
    
    test('should handle pagination', async () => {
      const mockLogs = Array.from({ length: 25 }, () => testUtils.createTestMedicineLog());
      
      mockSupabaseClient.from().select().eq().order().range().mockResolvedValue({
        data: mockLogs.slice(0, 20),
        error: null
      });
      
      const response = await request(app)
        .get('/api/medicine-logs?page=1&limit=20')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.logs).toHaveLength(20);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 20,
        hasMore: true
      });
    });
    
    test('should handle empty logs list', async () => {
      mockSupabaseClient.from().select().eq().order().mockResolvedValue({
        data: [],
        error: null
      });
      
      const response = await request(app)
        .get('/api/medicine-logs')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.logs).toHaveLength(0);
      expect(response.body.message).toBe('Medicine logs retrieved successfully');
    });
    
    test('should reject unauthenticated request', async () => {
      testUtils.mockUnauthenticated();
      
      const response = await request(app)
        .get('/api/medicine-logs')
        .expect(401);
      
      expect(response.body.error).toBe('Unauthorized');
    });
  });
  
  describe('GET /api/medicine-logs/:id', () => {
    test('should get specific medicine log by ID', async () => {
      const mockLog = testUtils.createTestMedicineLog({
        id: 'log-123',
        medicine_id: 'medicine-123',
        dosage_taken: '10mg',
        notes: 'Taken with water'
      });
      
      mockSupabaseClient.from().select().eq().single().mockResolvedValue({
        data: mockLog,
        error: null
      });
      
      const response = await request(app)
        .get('/api/medicine-logs/log-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.log.id).toBe('log-123');
      expect(response.body.log.dosage_taken).toBe('10mg');
      expect(response.body.log.notes).toBe('Taken with water');
    });
    
    test('should handle log not found', async () => {
      mockSupabaseClient.from().select().eq().single().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' }
      });
      
      const response = await request(app)
        .get('/api/medicine-logs/nonexistent-id')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);
      
      expect(response.body.error).toBe('Medicine Log Not Found');
    });
  });
  
  describe('POST /api/medicine-logs', () => {
    test('should create medicine log successfully', async () => {
      const newLog = {
        medicineId: 'medicine-123',
        takenAt: '2024-01-01T08:00:00Z',
        dosageTaken: '10mg',
        notes: 'Taken with breakfast'
      };
      
      const createdLog = {
        id: 'log-123',
        user_id: 'test-user-123',
        medicine_id: 'medicine-123',
        taken_at: '2024-01-01T08:00:00Z',
        dosage_taken: '10mg',
        notes: 'Taken with breakfast',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Mock medicine existence check
      mockSupabaseClient.from().select().eq().single().mockResolvedValueOnce({
        data: { id: 'medicine-123', name: 'Test Medicine' },
        error: null
      });
      
      // Mock log creation
      mockSupabaseClient.from().insert().select().single().mockResolvedValue({
        data: createdLog,
        error: null
      });
      
      const response = await request(app)
        .post('/api/medicine-logs')
        .set('Authorization', 'Bearer valid-token')
        .send(newLog)
        .expect(201);
      
      expect(response.body.message).toBe('Medicine log created successfully');
      expect(response.body.log.medicine_id).toBe('medicine-123');
      expect(response.body.log.dosage_taken).toBe('10mg');
      expect(response.body.log.user_id).toBe('test-user-123');
      
      // Verify database calls
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('medicines');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('medicine_logs');
    });
    
    test('should create log with current timestamp if not provided', async () => {
      const newLog = {
        medicineId: 'medicine-123',
        dosageTaken: '10mg'
        // No takenAt provided
      };
      
      mockSupabaseClient.from().select().eq().single().mockResolvedValueOnce({
        data: { id: 'medicine-123' },
        error: null
      });
      
      mockSupabaseClient.from().insert().select().single().mockResolvedValue({
        data: {
          ...testUtils.createTestMedicineLog(),
          taken_at: expect.any(String)
        },
        error: null
      });
      
      const response = await request(app)
        .post('/api/medicine-logs')
        .set('Authorization', 'Bearer valid-token')
        .send(newLog)
        .expect(201);
      
      expect(response.body.log.taken_at).toBeDefined();
    });
    
    test('should require medicine ID', async () => {
      const response = await request(app)
        .post('/api/medicine-logs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          dosageTaken: '10mg'
          // Missing medicineId
        })
        .expect(400);
      
      expect(response.body.error).toBe('Validation Error');
      expect(response.body.errors).toContain('Medicine ID is required');
    });
    
    test('should validate medicine exists', async () => {
      mockSupabaseClient.from().select().eq().single().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' }
      });
      
      const response = await request(app)
        .post('/api/medicine-logs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          medicineId: 'nonexistent-medicine',
          dosageTaken: '10mg'
        })
        .expect(404);
      
      expect(response.body.error).toBe('Medicine Not Found');
    });
    
    test('should validate dosage taken format', async () => {
      const response = await request(app)
        .post('/api/medicine-logs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          medicineId: 'medicine-123',
          dosageTaken: '' // Empty dosage
        })
        .expect(400);
      
      expect(response.body.errors).toContain('Dosage taken cannot be empty');
    });
    
    test('should validate taken_at timestamp format', async () => {
      const response = await request(app)
        .post('/api/medicine-logs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          medicineId: 'medicine-123',
          dosageTaken: '10mg',
          takenAt: 'invalid-date'
        })
        .expect(400);
      
      expect(response.body.errors).toContain('Invalid taken_at timestamp format');
    });
    
    test('should prevent duplicate logs within 1 minute', async () => {
      // Mock medicine exists
      mockSupabaseClient.from().select().eq().single().mockResolvedValueOnce({
        data: { id: 'medicine-123' },
        error: null
      });
      
      // Mock duplicate check - found recent log
      const recentTime = new Date();
      mockSupabaseClient.from().select().eq().gte().lte().mockResolvedValue({
        data: [{
          id: 'existing-log',
          taken_at: recentTime.toISOString()
        }],
        error: null
      });
      
      const response = await request(app)
        .post('/api/medicine-logs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          medicineId: 'medicine-123',
          dosageTaken: '10mg',
          takenAt: recentTime.toISOString()
        })
        .expect(409);
      
      expect(response.body.error).toBe('Duplicate Log Entry');
      expect(response.body.message).toContain('within 1 minute');
    });
    
    test('should handle database creation error', async () => {
      mockSupabaseClient.from().select().eq().single().mockResolvedValueOnce({
        data: { id: 'medicine-123' },
        error: null
      });
      
      mockSupabaseClient.from().select().eq().gte().lte().mockResolvedValue({
        data: [], // No duplicates
        error: null
      });
      
      mockSupabaseClient.from().insert().select().single().mockResolvedValue({
        data: null,
        error: { message: 'Database constraint violation' }
      });
      
      const response = await request(app)
        .post('/api/medicine-logs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          medicineId: 'medicine-123',
          dosageTaken: '10mg'
        })
        .expect(500);
      
      expect(response.body.error).toBe('Database Error');
    });
  });
  
  describe('PUT /api/medicine-logs/:id', () => {
    test('should update medicine log successfully', async () => {
      const updatedData = {
        dosageTaken: '15mg',
        notes: 'Updated notes',
        takenAt: '2024-01-01T09:00:00Z'
      };
      
      const updatedLog = {
        id: 'log-123',
        user_id: 'test-user-123',
        medicine_id: 'medicine-123',
        dosage_taken: '15mg',
        notes: 'Updated notes',
        taken_at: '2024-01-01T09:00:00Z',
        updated_at: new Date().toISOString()
      };
      
      mockSupabaseClient.from().update().eq().select().single().mockResolvedValue({
        data: updatedLog,
        error: null
      });
      
      const response = await request(app)
        .put('/api/medicine-logs/log-123')
        .set('Authorization', 'Bearer valid-token')
        .send(updatedData)
        .expect(200);
      
      expect(response.body.message).toBe('Medicine log updated successfully');
      expect(response.body.log.dosage_taken).toBe('15mg');
      expect(response.body.log.notes).toBe('Updated notes');
    });
    
    test('should handle log not found during update', async () => {
      mockSupabaseClient.from().update().eq().select().single().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' }
      });
      
      const response = await request(app)
        .put('/api/medicine-logs/nonexistent-id')
        .set('Authorization', 'Bearer valid-token')
        .send({ dosageTaken: '10mg' })
        .expect(404);
      
      expect(response.body.error).toBe('Medicine Log Not Found');
    });
    
    test('should validate updated data', async () => {
      const response = await request(app)
        .put('/api/medicine-logs/log-123')
        .set('Authorization', 'Bearer valid-token')
        .send({
          dosageTaken: '', // Invalid empty dosage
          takenAt: 'invalid-date'
        })
        .expect(400);
      
      expect(response.body.error).toBe('Validation Error');
      expect(response.body.errors).toContain('Dosage taken cannot be empty');
    });
  });
  
  describe('DELETE /api/medicine-logs/:id', () => {
    test('should delete medicine log successfully', async () => {
      mockSupabaseClient.from().delete().eq().mockResolvedValue({
        error: null
      });
      
      const response = await request(app)
        .delete('/api/medicine-logs/log-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.message).toBe('Medicine log deleted successfully');
      
      // Verify correct deletion call
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('medicine_logs');
    });
    
    test('should handle deletion error', async () => {
      mockSupabaseClient.from().delete().eq().mockResolvedValue({
        error: { message: 'Deletion failed' }
      });
      
      const response = await request(app)
        .delete('/api/medicine-logs/log-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);
      
      expect(response.body.error).toBe('Database Error');
    });
  });
  
  describe('GET /api/medicine-logs/analytics/adherence', () => {
    test('should calculate adherence statistics', async () => {
      const mockLogs = Array.from({ length: 14 }, (_, i) => 
        testUtils.createTestMedicineLog({
          taken_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
        })
      );
      
      // Mock logs query
      mockSupabaseClient.from().select().eq().gte().order().mockResolvedValue({
        data: mockLogs,
        error: null
      });
      
      // Mock medicines query
      mockSupabaseClient.from().select().eq().mockResolvedValue({
        data: [
          testUtils.createTestMedicine({
            schedule_type: 'interval',
            interval_minutes: 1440 // Daily
          })
        ],
        error: null
      });
      
      const response = await request(app)
        .get('/api/medicine-logs/analytics/adherence?days=14')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.adherence).toBeDefined();
      expect(response.body.adherence.totalExpected).toBeGreaterThan(0);
      expect(response.body.adherence.totalTaken).toBe(14);
      expect(response.body.adherence.percentage).toBeGreaterThan(0);
      expect(response.body.adherence.days).toBe(14);
    });
    
    test('should handle adherence calculation with no logs', async () => {
      mockSupabaseClient.from().select().eq().gte().order().mockResolvedValue({
        data: [],
        error: null
      });
      
      mockSupabaseClient.from().select().eq().mockResolvedValue({
        data: [],
        error: null
      });
      
      const response = await request(app)
        .get('/api/medicine-logs/analytics/adherence?days=7')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.adherence.totalTaken).toBe(0);
      expect(response.body.adherence.percentage).toBe(0);
    });
  });
  
  describe('GET /api/medicine-logs/analytics/trends', () => {
    test('should get daily intake trends', async () => {
      const mockLogs = Array.from({ length: 30 }, (_, i) => 
        testUtils.createTestMedicineLog({
          taken_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
        })
      );
      
      mockSupabaseClient.from().select().eq().gte().order().mockResolvedValue({
        data: mockLogs,
        error: null
      });
      
      const response = await request(app)
        .get('/api/medicine-logs/analytics/trends?period=monthly')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.trends).toBeDefined();
      expect(response.body.trends.daily).toBeDefined();
      expect(response.body.trends.period).toBe('monthly');
      expect(Array.isArray(response.body.trends.data)).toBe(true);
    });
  });
  
  describe('Authorization & Ownership', () => {
    test('should ensure user can only access their own logs', async () => {
      const response = await request(app)
        .get('/api/medicine-logs')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      // Verify that the query includes user_id filter
      expect(mockSupabaseClient.from().select().eq).toHaveBeenCalledWith('user_id', 'test-user-123');
    });
    
    test('should reject unauthorized access', async () => {
      testUtils.mockUnauthorized();
      
      const response = await request(app)
        .get('/api/medicine-logs/log-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);
      
      expect(response.body.error).toBe('Access Denied');
    });
    
    test('should ensure user can only log for their own medicines', async () => {
      // Mock medicine check returning unauthorized
      testUtils.mockUnauthorized();
      
      const response = await request(app)
        .post('/api/medicine-logs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          medicineId: 'other-user-medicine',
          dosageTaken: '10mg'
        })
        .expect(403);
      
      expect(response.body.error).toBe('Access Denied');
    });
  });
});
