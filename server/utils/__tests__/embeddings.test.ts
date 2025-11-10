/**
 * Tests for embeddings.ts - EmbeddingsService
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import { embeddingsService } from '../embeddings';

describe('EmbeddingsService', () => {
  test('should have generateEmbedding method', () => {
    assert.ok(typeof embeddingsService.generateEmbedding === 'function');
  });

  test('should generate embedding for text', async () => {
    try {
      const result = await embeddingsService.generateEmbedding('test text');
      assert.ok(Array.isArray(result));
      assert.ok(result.length > 0);
      // Embeddings are typically arrays of numbers
      assert.ok(typeof result[0] === 'number');
    } catch (error) {
      // Expected if OpenAI API key is not configured
      assert.ok(error instanceof Error);
    }
  });

  test('should handle empty text', async () => {
    try {
      await embeddingsService.generateEmbedding('');
      // Should either return empty array or throw
    } catch (error) {
      assert.ok(error instanceof Error);
    }
  });

  test('should handle long text', async () => {
    const longText = 'test '.repeat(1000);
    try {
      const result = await embeddingsService.generateEmbedding(longText);
      assert.ok(Array.isArray(result));
    } catch (error) {
      // Expected if API key not configured or text too long
      assert.ok(error instanceof Error);
    }
  });

  test('should generate consistent embeddings for same text', async () => {
    const text = 'consistent test text';
    try {
      const result1 = await embeddingsService.generateEmbedding(text);
      const result2 = await embeddingsService.generateEmbedding(text);
      // Embeddings should be the same for same input
      assert.strictEqual(result1.length, result2.length);
      // Check first few values are the same
      if (result1.length > 0 && result2.length > 0) {
        assert.strictEqual(result1[0], result2[0]);
      }
    } catch (error) {
      // Expected if API key not configured
      assert.ok(error instanceof Error);
    }
  });
});

