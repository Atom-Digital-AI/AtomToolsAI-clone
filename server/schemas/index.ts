/**
 * Shared validation schemas for API endpoints
 *
 * This module exports Zod schemas for validating request bodies, query parameters,
 * and path parameters across all API routes.
 */

// Common schemas
export * from './common.schema';

// Content route schemas
export * from './content.schema';

// Guideline route schemas
export * from './guideline.schema';

// Product route schemas
export * from './product.schema';

// Admin route schemas
export * from './admin.schema';
