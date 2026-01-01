/**
 * Vitest Test Setup File
 *
 * This file is loaded before each test file runs.
 * Use it to set up global test configuration, mocks, and utilities.
 */

import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent'; // Suppress logs during tests

// Mock Sentry to avoid side effects
vi.mock('@sentry/node', () => ({
  default: {
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    init: vi.fn(),
    setUser: vi.fn(),
    setTag: vi.fn(),
    setExtra: vi.fn(),
    addBreadcrumb: vi.fn(),
  },
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  init: vi.fn(),
  setUser: vi.fn(),
  setTag: vi.fn(),
  setExtra: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

// Mock pino for tests to avoid actual logging output
vi.mock('pino', () => {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(() => mockLogger),
    level: 'silent',
  };
  return {
    default: vi.fn(() => mockLogger),
  };
});

// Global test hooks
beforeAll(() => {
  // Setup before all tests
});

afterAll(() => {
  // Cleanup after all tests
});

afterEach(() => {
  // Reset mocks after each test
  vi.clearAllMocks();
});

// Extend expect with custom matchers if needed
// Example: expect.extend({ ... });

// Global test utilities
export const mockRequest = (overrides = {}) => ({
  headers: {},
  body: {},
  query: {},
  params: {},
  path: '/test',
  method: 'GET',
  ...overrides,
});

export const mockResponse = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  res.on = vi.fn().mockReturnValue(res);
  res.statusCode = 200;
  return res;
};

export const mockNext = () => vi.fn();
