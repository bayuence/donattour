/**
 * Jest Setup File
 *
 * Runs before all tests
 * Setup global test utilities and mocks
 */

// Mock environment variables for tests
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/donattour_test'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:3000'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'
process.env.LOG_LEVEL = 'warn'

// Extend Jest matchers
import '@testing-library/jest-dom'

// Mock logger to reduce noise in tests
jest.mock('@/lib/utils/logger', () => ({
  apiLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  dbLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}))
