import { z } from 'zod';

/**
 * Product routes validation schemas
 */

/**
 * Product ID parameter
 */
export const productIdParamsSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
});

/**
 * Tier ID parameter
 */
export const tierIdParamsSchema = z.object({
  tierId: z.string().min(1, 'Tier ID is required'),
});

/**
 * Create tier subscription request body
 */
export const createTierSubscriptionSchema = z.object({
  tierId: z.string().min(1, 'Tier ID is required'),
  paymentReference: z.string().optional(),
});

/**
 * Create subscription request body (legacy)
 */
export const createSubscriptionSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
});

/**
 * Contact form request body
 */
export const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please provide a valid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});
