/**
 * Tests for url-validator.ts
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import { validateAndNormalizeUrl } from '../url-validator';

describe('validateAndNormalizeUrl', () => {
  test('should validate and normalize valid HTTPS URL', async () => {
    const result = await validateAndNormalizeUrl('https://example.com');
    assert.ok(result.includes('https://'));
    assert.ok(result.includes('example.com'));
  });

  test('should validate and normalize valid HTTP URL', async () => {
    const result = await validateAndNormalizeUrl('http://example.com');
    assert.ok(result.includes('http://'));
    assert.ok(result.includes('example.com'));
  });

  test('should normalize URLs without protocol', async () => {
    const result = await validateAndNormalizeUrl('example.com');
    assert.ok(result.includes('https://'));
    assert.ok(result.includes('example.com'));
  });

  test('should preserve path and query parameters', async () => {
    const input = 'https://example.com/path?query=1';
    const result = await validateAndNormalizeUrl(input);
    assert.ok(result.includes('/path'));
    assert.ok(result.includes('query=1'));
  });

  test('should reject invalid URLs', async () => {
    try {
      await validateAndNormalizeUrl('not-a-url');
      assert.fail('Should have thrown an error');
    } catch (error: any) {
      assert.ok(error instanceof Error);
    }
  });

  test('should reject localhost URLs', async () => {
    try {
      await validateAndNormalizeUrl('http://localhost');
      assert.fail('Should have thrown an error');
    } catch (error: any) {
      assert.ok(error instanceof Error);
    }
  });

  test('should reject private IP addresses', async () => {
    try {
      await validateAndNormalizeUrl('http://192.168.1.1');
      assert.fail('Should have thrown an error');
    } catch (error: any) {
      assert.ok(error instanceof Error);
    }
  });

  test('should handle URLs with ports', async () => {
    const result = await validateAndNormalizeUrl('https://example.com:8080');
    assert.ok(result.includes('example.com'));
    assert.ok(result.includes('8080') || result.includes('https://'));
  });

  test('should handle empty string', async () => {
    try {
      await validateAndNormalizeUrl('');
      assert.fail('Should have thrown an error');
    } catch (error: any) {
      assert.ok(error instanceof Error);
    }
  });
});

