/**
 * Test setup file
 * Runs before all tests
 */

// Mock environment variables for tests
process.env.FMP_API_KEY = process.env.FMP_API_KEY || 'test-fmp-key';
process.env.POLYGON_API_KEY = process.env.POLYGON_API_KEY || 'test-polygon-key';
