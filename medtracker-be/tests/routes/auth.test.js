/**
 * Authentication Routes Tests
 * 
 * Comprehensive tests for all auth endpoints including:
 * - User registration with validation
 * - User login and session management
 * - User logout and token invalidation
 * - User profile retrieval and updates
 * - Password reset functionality
 */

const request = require('supertest');
const express = require('express');
const authRoutes = require('../../routes/auth');

describe('Authentication Routes', () => {
  let app;
  
  beforeAll(() => {
    // Create Express app with auth routes
    app = express();
    app.use(express.json());
    
    // Mock Supabase client on app.locals
    app.locals.supabase = mockSupabaseClient;
    
    // Mount auth routes
    app.use('/api/auth', authRoutes);
  });
  
  beforeEach(() => {
    // Reset all mocks before each test
    testUtils.resetSupabaseMocks();
  });
  
  describe('POST /api/auth/register', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    };
    
    describe('Successful Registration', () => {
      test('should register user with all fields', async () => {
        // Mock successful Supabase response
        mockSupabaseClient.auth.signUp.mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
              email_confirmed_at: null,
              created_at: '2024-01-01T00:00:00Z',
              user_metadata: {
                firstName: 'Test',
                lastName: 'User',
                fullName: 'Test User'
              }
            },
            session: null
          },
          error: null
        });
        
        const response = await request(app)
          .post('/api/auth/register')
          .send(validRegistrationData)
          .expect(201);
        
        expect(response.body.message).toBe('User registered successfully');
        expect(response.body.user.email).toBe('test@example.com');
        expect(response.body.user.metadata.firstName).toBe('Test');
        expect(response.body.requiresEmailVerification).toBe(true);
        
        // Verify Supabase was called correctly
        expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          options: {
            data: {
              firstName: 'Test',
              lastName: 'User',
              fullName: 'Test User'
            }
          }
        });
      });
      
      test('should register user with minimal fields', async () => {
        mockSupabaseClient.auth.signUp.mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              email: 'minimal@example.com',
              email_confirmed_at: null,
              created_at: '2024-01-01T00:00:00Z',
              user_metadata: {}
            },
            session: null
          },
          error: null
        });
        
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'minimal@example.com',
            password: 'password123'
          })
          .expect(201);
        
        expect(response.body.user.email).toBe('minimal@example.com');
        expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
          email: 'minimal@example.com',
          password: 'password123',
          options: { data: {} }
        });
      });
      
      test('should handle registration with session', async () => {
        mockSupabaseClient.auth.signUp.mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
              email_confirmed_at: '2024-01-01T00:00:00Z',
              created_at: '2024-01-01T00:00:00Z',
              user_metadata: {}
            },
            session: {
              access_token: 'access-token',
              refresh_token: 'refresh-token',
              expires_in: 3600,
              expires_at: 1234567890
            }
          },
          error: null
        });
        
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'password123'
          })
          .expect(201);
        
        expect(response.body.session.accessToken).toBe('access-token');
        expect(response.body.requiresEmailVerification).toBe(false);
      });
    });
    
    describe('Validation Errors', () => {
      test('should reject missing email', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            password: 'password123'
          })
          .expect(400);
        
        expect(response.body.error).toBe('Validation Error');
        expect(response.body.message).toBe('Email and password are required');
        expect(response.body.details.email).toBe('Email is required');
      });
      
      test('should reject missing password', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com'
          })
          .expect(400);
        
        expect(response.body.error).toBe('Validation Error');
        expect(response.body.details.password).toBe('Password is required');
      });
      
      test('should reject invalid email format', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'invalid-email',
            password: 'password123'
          })
          .expect(400);
        
        expect(response.body.error).toBe('Validation Error');
        expect(response.body.message).toBe('Please provide a valid email address');
      });
      
      test('should reject weak password', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: '123'
          })
          .expect(400);
        
        expect(response.body.error).toBe('Validation Error');
        expect(response.body.message).toBe('Password must be at least 6 characters long');
      });
    });
    
    describe('Supabase Errors', () => {
      test('should handle user already exists', async () => {
        mockSupabaseClient.auth.signUp.mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'User already registered' }
        });
        
        const response = await request(app)
          .post('/api/auth/register')
          .send(validRegistrationData)
          .expect(409);
        
        expect(response.body.error).toBe('User Already Exists');
        expect(response.body.message).toContain('already exists');
      });
      
      test('should handle password error from Supabase', async () => {
        mockSupabaseClient.auth.signUp.mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'password should contain at least 8 characters' }
        });
        
        const response = await request(app)
          .post('/api/auth/register')
          .send(validRegistrationData)
          .expect(400);
        
        expect(response.body.error).toBe('Password Error');
      });
      
      test('should handle generic Supabase error', async () => {
        mockSupabaseClient.auth.signUp.mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Some other error' }
        });
        
        const response = await request(app)
          .post('/api/auth/register')
          .send(validRegistrationData)
          .expect(400);
        
        expect(response.body.error).toBe('Registration Failed');
      });
    });
  });
  
  describe('POST /api/auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'password123'
    };
    
    describe('Successful Login', () => {
      test('should login user with valid credentials', async () => {
        mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
              email_confirmed_at: '2024-01-01T00:00:00Z',
              last_sign_in_at: '2024-01-01T12:00:00Z',
              user_metadata: {
                firstName: 'Test',
                lastName: 'User'
              }
            },
            session: {
              access_token: 'access-token',
              refresh_token: 'refresh-token',
              expires_in: 3600,
              expires_at: 1234567890
            }
          },
          error: null
        });
        
        const response = await request(app)
          .post('/api/auth/login')
          .send(validLoginData)
          .expect(200);
        
        expect(response.body.message).toBe('Login successful');
        expect(response.body.user.email).toBe('test@example.com');
        expect(response.body.session.accessToken).toBe('access-token');
        
        expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        });
      });
    });
    
    describe('Validation Errors', () => {
      test('should reject missing email', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({ password: 'password123' })
          .expect(400);
        
        expect(response.body.error).toBe('Validation Error');
        expect(response.body.message).toBe('Email and password are required');
      });
      
      test('should reject missing password', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({ email: 'test@example.com' })
          .expect(400);
        
        expect(response.body.error).toBe('Validation Error');
      });
    });
    
    describe('Authentication Errors', () => {
      test('should handle invalid credentials', async () => {
        mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials' }
        });
        
        const response = await request(app)
          .post('/api/auth/login')
          .send(validLoginData)
          .expect(401);
        
        expect(response.body.error).toBe('Authentication Failed');
        expect(response.body.message).toContain('Invalid email or password');
      });
      
      test('should handle unverified email', async () => {
        mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Email not confirmed' }
        });
        
        const response = await request(app)
          .post('/api/auth/login')
          .send(validLoginData)
          .expect(401);
        
        expect(response.body.error).toBe('Email Not Verified');
        expect(response.body.message).toContain('verify your email');
      });
    });
  });
  
  describe('POST /api/auth/logout', () => {
    test('should logout authenticated user', async () => {
      // Mock authentication
      testUtils.mockAuthenticated();
      
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null
      });
      
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.message).toBe('Logout successful');
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });
    
    test('should reject unauthenticated logout', async () => {
      testUtils.mockUnauthenticated();
      
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);
      
      expect(response.body.error).toBe('Unauthorized');
    });
    
    test('should handle logout error', async () => {
      testUtils.mockAuthenticated();
      
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: { message: 'Logout failed' }
      });
      
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);
      
      expect(response.body.error).toBe('Logout Failed');
    });
  });
  
  describe('GET /api/auth/user', () => {
    test('should get authenticated user data', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z',
        lastSignIn: '2024-01-01T12:00:00Z',
        userMetadata: {
          firstName: 'Test',
          lastName: 'User'
        }
      };
      
      testUtils.mockAuthenticated(mockUser);
      
      const response = await request(app)
        .get('/api/auth/user')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.message).toBe('User data retrieved successfully');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.metadata.firstName).toBe('Test');
    });
    
    test('should reject unauthenticated request', async () => {
      testUtils.mockUnauthenticated();
      
      const response = await request(app)
        .get('/api/auth/user')
        .expect(401);
      
      expect(response.body.error).toBe('Unauthorized');
    });
  });
  
  describe('PUT /api/auth/user', () => {
    test('should update user profile', async () => {
      testUtils.mockAuthenticated();
      
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            email_confirmed_at: '2024-01-01T00:00:00Z',
            user_metadata: {
              firstName: 'Updated',
              lastName: 'Name',
              fullName: 'Updated Name'
            }
          }
        },
        error: null
      });
      
      const response = await request(app)
        .put('/api/auth/user')
        .set('Authorization', 'Bearer valid-token')
        .send({
          firstName: 'Updated',
          lastName: 'Name'
        })
        .expect(200);
      
      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.user.metadata.firstName).toBe('Updated');
      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firstName: 'Updated',
          lastName: 'Name',
          fullName: 'Updated Name'
        })
      });
    });
    
    test('should handle update error', async () => {
      testUtils.mockAuthenticated();
      
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' }
      });
      
      const response = await request(app)
        .put('/api/auth/user')
        .set('Authorization', 'Bearer valid-token')
        .send({ firstName: 'Updated' })
        .expect(400);
      
      expect(response.body.error).toBe('Update Failed');
    });
  });
  
  describe('POST /api/auth/forgot-password', () => {
    test('should send password reset email', async () => {
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        error: null
      });
      
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);
      
      expect(response.body.message).toContain('password reset link has been sent');
      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        { redirectTo: expect.stringContaining('reset-password') }
      );
    });
    
    test('should reject missing email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);
      
      expect(response.body.error).toBe('Validation Error');
      expect(response.body.message).toBe('Email address is required');
    });
    
    test('should return success even on Supabase error (security)', async () => {
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        error: { message: 'User not found' }
      });
      
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);
      
      expect(response.body.message).toContain('password reset link has been sent');
    });
  });
  
  describe('POST /api/auth/reset-password', () => {
    test('should reset password with valid token', async () => {
      mockSupabaseClient.auth.verifyOtp.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });
      
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        error: null
      });
      
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-reset-token',
          password: 'newpassword123'
        })
        .expect(200);
      
      expect(response.body.message).toContain('Password reset successful');
      expect(mockSupabaseClient.auth.verifyOtp).toHaveBeenCalledWith({
        token_hash: 'valid-reset-token',
        type: 'recovery'
      });
      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        password: 'newpassword123'
      });
    });
    
    test('should reject missing token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ password: 'newpassword123' })
        .expect(400);
      
      expect(response.body.error).toBe('Validation Error');
      expect(response.body.message).toBe('Reset token and new password are required');
    });
    
    test('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-token',
          password: '123'
        })
        .expect(400);
      
      expect(response.body.error).toBe('Validation Error');
      expect(response.body.message).toBe('Password must be at least 6 characters long');
    });
    
    test('should handle invalid token', async () => {
      mockSupabaseClient.auth.verifyOtp.mockResolvedValue({
        data: null,
        error: { message: 'Invalid token' }
      });
      
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'newpassword123'
        })
        .expect(400);
      
      expect(response.body.error).toBe('Invalid Reset Token');
    });
    
    test('should handle password update error', async () => {
      mockSupabaseClient.auth.verifyOtp.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });
      
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        error: { message: 'Password update failed' }
      });
      
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-token',
          password: 'newpassword123'
        })
        .expect(400);
      
      expect(response.body.error).toBe('Password Update Failed');
    });
  });
});
