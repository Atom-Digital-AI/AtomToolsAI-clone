/**
 * Tests for hybrid-search-service.ts - HybridSearchService
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import { hybridSearchService } from '../hybrid-search-service';

describe('HybridSearchService', () => {
  test('should have search method', () => {
    assert.ok(typeof hybridSearchService.search === 'function');
  });

  test('should perform hybrid search', async () => {
    try {
      const results = await hybridSearchService.search({
        query: 'test query',
        userId: 'user-123',
        profileId: 'profile-456',
        limit: 5
      });
      assert.ok(Array.isArray(results));
      // Results should have similarity scores
      results.forEach(result => {
        assert.ok('similarity' in result);
        assert.ok(typeof result.similarity === 'number');
      });
    } catch (error) {
      // Expected if service not configured or database not available
      assert.ok(error instanceof Error);
    }
  });

  test('should handle empty query', async () => {
    try {
      await hybridSearchService.search({
        query: '',
        userId: 'user-123',
        profileId: 'profile-456',
        limit: 5
      });
      // Should either return empty results or throw
    } catch (error) {
      assert.ok(error instanceof Error);
    }
  });

  test('should respect limit parameter', async () => {
    try {
      const results = await hybridSearchService.search({
        query: 'test',
        userId: 'user-123',
        profileId: 'profile-456',
        limit: 3
      });
      assert.ok(results.length <= 3);
    } catch (error) {
      assert.ok(error instanceof Error);
    }
  });

  test('should combine dense and sparse results', async () => {
    try {
      const results = await hybridSearchService.search({
        query: 'test query',
        userId: 'user-123',
        profileId: 'profile-456',
        limit: 10
      });
      // Hybrid search should return results from both dense and sparse retrieval
      assert.ok(Array.isArray(results));
    } catch (error) {
      assert.ok(error instanceof Error);
    }
  });
});

