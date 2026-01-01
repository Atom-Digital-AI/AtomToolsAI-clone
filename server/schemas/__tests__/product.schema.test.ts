import { describe, it, expect } from 'vitest';
import {
  productIdParamsSchema,
  tierIdParamsSchema,
  createTierSubscriptionSchema,
  contactFormSchema,
} from '../product.schema';

describe('product.schema', () => {
  describe('productIdParamsSchema', () => {
    it('accepts valid product ID', () => {
      const result = productIdParamsSchema.parse({ productId: 'prod-123' });
      expect(result.productId).toBe('prod-123');
    });

    it('rejects empty product ID', () => {
      expect(() => productIdParamsSchema.parse({ productId: '' })).toThrow();
    });
  });

  describe('tierIdParamsSchema', () => {
    it('accepts valid tier ID', () => {
      const result = tierIdParamsSchema.parse({ tierId: 'tier-456' });
      expect(result.tierId).toBe('tier-456');
    });

    it('rejects empty tier ID', () => {
      expect(() => tierIdParamsSchema.parse({ tierId: '' })).toThrow();
    });
  });

  describe('createTierSubscriptionSchema', () => {
    it('accepts valid subscription data', () => {
      const validData = {
        tierId: 'tier-123',
      };
      const result = createTierSubscriptionSchema.parse(validData);
      expect(result.tierId).toBe('tier-123');
    });

    it('accepts optional payment reference', () => {
      const validData = {
        tierId: 'tier-123',
        paymentReference: 'pay-456',
      };
      const result = createTierSubscriptionSchema.parse(validData);
      expect(result.paymentReference).toBe('pay-456');
    });

    it('rejects missing tier ID', () => {
      expect(() => createTierSubscriptionSchema.parse({})).toThrow();
    });
  });

  describe('contactFormSchema', () => {
    it('accepts valid contact form data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello, I have a question about your services.',
      };
      const result = contactFormSchema.parse(validData);
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
    });

    it('rejects invalid email', () => {
      const invalidData = {
        name: 'John',
        email: 'not-an-email',
        message: 'Test message here.',
      };
      expect(() => contactFormSchema.parse(invalidData)).toThrow();
    });

    it('rejects name shorter than 2 characters', () => {
      const invalidData = {
        name: 'J',
        email: 'john@example.com',
        message: 'Test message here.',
      };
      expect(() => contactFormSchema.parse(invalidData)).toThrow();
    });

    it('rejects message shorter than 10 characters', () => {
      const invalidData = {
        name: 'John',
        email: 'john@example.com',
        message: 'Hi',
      };
      expect(() => contactFormSchema.parse(invalidData)).toThrow();
    });
  });
});
