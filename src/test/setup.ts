// Test setup file
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: 'test.env' });

// Set test environment
process.env['NODE_ENV'] = 'test';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  // Uncomment to silence console.log during tests
  // log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Global test utilities
(global as any).testUtils = {
  // Add common test utilities here
  generateRandomEmail: () => `test-${Math.random().toString(36).substring(7)}@example.com`,
  generateRandomString: (length: number = 10) =>
    Math.random()
      .toString(36)
      .substring(2, 2 + length),
  generateRandomNumber: (min: number = 1, max: number = 1000) =>
    Math.floor(Math.random() * (max - min + 1)) + min
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Clean up after all tests
afterAll(() => {
  jest.restoreAllMocks();
});
