/**
 * Mock authentication middleware for testing
 */

// Mock authenticated user for testing
let mockAuthenticatedUser = null;
let shouldAuthenticate = true;
let shouldAuthorize = true;
let requiredRole = null;

const authenticateToken = jest.fn((req, res, next) => {
  if (!shouldAuthenticate) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication token is required'
    });
  }
  
  // Mock user object from token
  req.user = mockAuthenticatedUser || global.testUtils.mockUser;
  req.token = 'mock-jwt-token';
  next();
});

const optionalAuth = jest.fn((req, res, next) => {
  // For optional auth, we always continue but may or may not set req.user
  if (shouldAuthenticate && mockAuthenticatedUser) {
    req.user = mockAuthenticatedUser;
    req.token = 'mock-jwt-token';
  }
  next();
});

const requireRole = jest.fn().mockImplementation((role) => {
  requiredRole = role;
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication Required',
        message: 'You must be logged in to access this resource.'
      });
    }
    
    if (!shouldAuthorize) {
      return res.status(403).json({
        error: 'Insufficient Permissions',
        message: `Access denied. Required role: ${role}`
      });
    }
    
    next();
  };
});

const requireOwnership = jest.fn().mockImplementation((userIdField = 'user_id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication Required',
        message: 'You must be logged in to access this resource.'
      });
    }
    
    if (!shouldAuthorize) {
      return res.status(403).json({
        error: 'Access Denied',
        message: 'You can only access your own resources.'
      });
    }
    
    // For POST/PUT/PATCH requests, automatically add user_id to body
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      req.body[userIdField] = req.user.id;
    }
    
    next();
  };
});

// Helper functions for tests
authenticateToken.mockAuthenticated = (user = global.testUtils?.mockUser) => {
  shouldAuthenticate = true;
  shouldAuthorize = true;
  mockAuthenticatedUser = user;
};

authenticateToken.mockUnauthenticated = () => {
  shouldAuthenticate = false;
  shouldAuthorize = false;
  mockAuthenticatedUser = null;
};

authenticateToken.mockUnauthorized = () => {
  shouldAuthenticate = true;
  shouldAuthorize = false;
};

authenticateToken.mockReset = () => {
  shouldAuthenticate = true;
  shouldAuthorize = true;
  mockAuthenticatedUser = null;
  requiredRole = null;
  
  // Clear all mock call history
  authenticateToken.mockClear();
  optionalAuth.mockClear();
  requireRole.mockClear();
  requireOwnership.mockClear();
};

// Additional helper to get current mock state
authenticateToken.getMockState = () => ({
  shouldAuthenticate,
  shouldAuthorize,
  mockAuthenticatedUser,
  requiredRole
});

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireOwnership
};
