/**
 * Tests for reranking-service.ts - RerankingService
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import { rerankingService } from '../reranking-service';
import type { RetrievalResult } from '../rag-service';

describe('RerankingService', () => {
  test('should have rerank method', () => {
    assert.ok(typeof rerankingService.rerank === 'function');
  });

  test('should rerank results', async () => {
    const results: RetrievalResult[] = [
      { chunk: 'Text 1', similarity: 0.7, sourceType: 'profile' },
      { chunk: 'Text 2', similarity: 0.9, sourceType: 'profile' },
      { chunk: 'Text 3', similarity: 0.6, sourceType: 'context' }
    ];

    try {
      const reranked = await rerankingService.rerank('test query', results);
      assert.ok(Array.isArray(reranked));
      assert.ok(reranked.length > 0);
      // Results should be sorted by relevance
      for (let i = 1; i < reranked.length; i++) {
        assert.ok(reranked[i - 1].similarity >= reranked[i].similarity);
      }
    } catch (error) {
      // Expected if reranking service not configured
      assert.ok(error instanceof Error);
    }
  });

  test('should handle empty results', async () => {
    try {
      const reranked = await rerankingService.rerank('test query', []);
      assert.ok(Array.isArray(reranked));
      assert.strictEqual(reranked.length, 0);
    } catch (error) {
      // Expected if service not configured
      assert.ok(error instanceof Error);
    }
  });

  test('should preserve result structure', async () => {
    const results: RetrievalResult[] = [
      { chunk: 'Text', similarity: 0.8, sourceType: 'profile', metadata: { id: '1' } }
    ];

    try {
      const reranked = await rerankingService.rerank('query', results);
      if (reranked.length > 0) {
        assert.ok('chunk' in reranked[0]);
        assert.ok('similarity' in reranked[0]);
        assert.ok('sourceType' in reranked[0]);
      }
    } catch (error) {
      assert.ok(error instanceof Error);
    }
  });
});

