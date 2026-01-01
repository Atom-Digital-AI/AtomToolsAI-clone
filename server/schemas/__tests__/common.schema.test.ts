import { describe, it, expect } from 'vitest';
import {
  uuidSchema,
  paginationSchema,
  idParamsSchema,
  toolTypeSchema,
} from '../common.schema';

describe('common.schema', () => {
  describe('uuidSchema', () => {
    it('accepts valid UUIDs', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(() => uuidSchema.parse(validUuid)).not.toThrow();
    });

    it('rejects invalid UUIDs', () => {
      expect(() => uuidSchema.parse('not-a-uuid')).toThrow();
      expect(() => uuidSchema.parse('')).toThrow();
      expect(() => uuidSchema.parse('12345')).toThrow();
    });
  });

  describe('paginationSchema', () => {
    it('parses valid pagination params', () => {
      const result = paginationSchema.parse({ limit: '50', offset: '10' });
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(10);
    });

    it('uses defaults when not provided', () => {
      const result = paginationSchema.parse({});
      expect(result.limit).toBe(100);
      expect(result.offset).toBe(0);
    });

    it('rejects invalid limit values', () => {
      expect(() => paginationSchema.parse({ limit: '0' })).toThrow();
      expect(() => paginationSchema.parse({ limit: '101' })).toThrow();
    });

    it('coerces string values to numbers', () => {
      const result = paginationSchema.parse({ limit: '25', offset: '5' });
      expect(typeof result.limit).toBe('number');
      expect(typeof result.offset).toBe('number');
    });
  });

  describe('idParamsSchema', () => {
    it('accepts valid UUID id', () => {
      const result = idParamsSchema.parse({ id: '123e4567-e89b-12d3-a456-426614174000' });
      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('rejects invalid id', () => {
      expect(() => idParamsSchema.parse({ id: 'invalid' })).toThrow();
    });
  });

  describe('toolTypeSchema', () => {
    it('accepts valid tool types', () => {
      expect(() => toolTypeSchema.parse('content-writer')).not.toThrow();
      expect(() => toolTypeSchema.parse('seo-meta-generator')).not.toThrow();
      expect(() => toolTypeSchema.parse('google-ads-copy')).not.toThrow();
      expect(() => toolTypeSchema.parse('social-content')).not.toThrow();
    });

    it('rejects invalid tool types', () => {
      expect(() => toolTypeSchema.parse('unknown-tool')).toThrow();
      expect(() => toolTypeSchema.parse('')).toThrow();
    });
  });
});
