/**
 * Jest Configuration for Medicine Tracker Backend
 * 
 * Comprehensive testing configuration with coverage reporting,
 * environment setup, and optimized test execution
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup-improved.js'],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/fixtures/',
    '/tests/helpers/'
  ],
  
  // Coverage configuration
  collectCoverage: false, // Enable with --coverage flag
  collectCoverageFrom: [
    'routes/**/*.js',
    'middleware/**/*.js',
    'server.js',
    '!routes/**/index.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  
  coverageDirectory: 'coverage',
  
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Module resolution
  moduleFileExtensions: ['js', 'json'],
  
  // Transform configuration (if needed for ES6+ features)
  transform: {},
  
  // Timeout for tests (30 seconds)
  testTimeout: 30000,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Globals that should be available in tests
  globals: {
    'testUtils': true,
    'mockSupabaseClient': true,
    'mockConsole': true
  },
  
  // Module name mapping (for path aliases if needed)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@routes/(.*)$': '<rootDir>/routes/$1',
    '^@middleware/(.*)$': '<rootDir>/middleware/$1'
  },
  
  // Mock directory locations
  roots: ['<rootDir>/tests', '<rootDir>'],
  modulePaths: ['<rootDir>/tests'],
  
  // Detect open handles (useful for debugging async issues)
  detectOpenHandles: true,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Reporters for different output formats
  reporters: [
    'default'
    // Note: Custom reporters like 'jest-html-reporters' require additional installation
    // To add HTML reporting, run: npm install --save-dev jest-html-reporters
    // Then uncomment the following:
    // ['jest-html-reporters', {
    //   'publicPath': './coverage/html-report',
    //   'filename': 'report.html',
    //   'openReport': false
    // }]
  ]
};
