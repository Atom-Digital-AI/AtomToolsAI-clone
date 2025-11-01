import { describe, test } from 'node:test';
import assert from 'node:assert';
import type { RetrievalResult } from '../rag-service';

/**
 * Regression Test Suite for RAG System
 * 
 * This test suite contains a "golden dataset" of real user queries
 * and expected retrieval results. It should be run on every commit
 * to ensure accuracy improvements don't regress.
 * 
 * Golden Dataset Format:
 * - Real user queries from production logs
 * - Expected minimum similarity scores
 * - Expected chunks to be retrieved
 * - Expected source types
 */

interface GoldenTestCase {
  id: string;
  description: string;
  query: string;
  context?: {
    brandName?: string;
    toolType?: string;
    domain?: string;
  };
  expected: {
    minSimilarity: number;
    minResults: number;
    expectedChunks?: string[]; // Keywords that should appear in results
    expectedSourceTypes?: string[];
  };
}

// Golden dataset - replace with real queries from production
const GOLDEN_DATASET: GoldenTestCase[] = [
  {
    id: 'golden-001',
    description: 'Simple brand guideline query',
    query: 'brand colors and typography',
    context: {
      brandName: 'Acme Corp',
      toolType: 'seo'
    },
    expected: {
      minSimilarity: 0.7,
      minResults: 2,
      expectedChunks: ['color', 'typography', 'brand'],
      expectedSourceTypes: ['profile']
    }
  },
  {
    id: 'golden-002',
    description: 'Abbreviation query (SEO)',
    query: 'SEO meta content',
    context: {
      toolType: 'seo'
    },
    expected: {
      minSimilarity: 0.65,
      minResults: 3,
      expectedChunks: ['meta', 'title', 'description'],
      expectedSourceTypes: ['profile', 'context']
    }
  },
  {
    id: 'golden-003',
    description: 'Tax form abbreviation (1099)',
    query: '1099 deadline',
    context: {},
    expected: {
      minSimilarity: 0.6,
      minResults: 1,
      expectedChunks: ['1099', 'deadline', 'form'],
      expectedSourceTypes: ['profile']
    }
  },
  {
    id: 'golden-004',
    description: 'Ambiguous query requiring context',
    query: 'deadline',
    context: {
      brandName: 'Acme Corp',
      toolType: 'seo'
    },
    expected: {
      minSimilarity: 0.65,
      minResults: 1,
      expectedChunks: ['deadline'],
      expectedSourceTypes: ['profile', 'context']
    }
  },
  {
    id: 'golden-005',
    description: 'Content style query',
    query: 'writing style and tone',
    context: {
      brandName: 'Acme Corp'
    },
    expected: {
      minSimilarity: 0.7,
      minResults: 2,
      expectedChunks: ['style', 'tone', 'voice', 'writing'],
      expectedSourceTypes: ['profile']
    }
  },
  {
    id: 'golden-006',
    description: 'Very short query',
    query: 'CTA',
    context: {
      toolType: 'seo'
    },
    expected: {
      minSimilarity: 0.5,
      minResults: 1,
      expectedChunks: ['call to action', 'CTA', 'button'],
      expectedSourceTypes: ['profile', 'context']
    }
  },
  {
    id: 'golden-007',
    description: 'Complex multi-topic query',
    query: 'brand guidelines for social media content and email campaigns',
    context: {
      brandName: 'Acme Corp'
    },
    expected: {
      minSimilarity: 0.65,
      minResults: 3,
      expectedChunks: ['brand', 'guidelines', 'social', 'email'],
      expectedSourceTypes: ['profile', 'context']
    }
  },
  {
    id: 'golden-008',
    description: 'Query with special characters',
    query: 'content guidelines for 2024-2025',
    context: {},
    expected: {
      minSimilarity: 0.6,
      minResults: 1,
      expectedChunks: ['guidelines', 'content'],
      expectedSourceTypes: ['profile']
    }
  },
];

// Mock RAG service for testing (replace with actual service)
class MockRAGService {
  async retrieveRelevantContext(
    userId: string,
    profileId: string,
    query: string,
    limit: number = 5
  ): Promise<RetrievalResult[]> {
    // Mock implementation - should be replaced with actual service
    // This simulates retrieval results
    const mockResults: RetrievalResult[] = [];

    // Simple keyword matching for testing
    const queryLower = query.toLowerCase();
    if (queryLower.includes('color') || queryLower.includes('typography')) {
      mockResults.push({
        chunk: 'Brand colors: Primary blue (#0066CC), Secondary gray (#666666)',
        similarity: 0.85,
        sourceType: 'profile',
        metadata: { section: 'branding' }
      });
      mockResults.push({
        chunk: 'Typography: Use Roboto for headings, Open Sans for body text',
        similarity: 0.80,
        sourceType: 'profile',
        metadata: { section: 'typography' }
      });
    }

    if (queryLower.includes('seo') || queryLower.includes('meta')) {
      mockResults.push({
        chunk: 'SEO meta tags should include target keywords and brand name',
        similarity: 0.75,
        sourceType: 'profile',
        metadata: { section: 'seo' }
      });
      mockResults.push({
        chunk: 'Meta descriptions should be 150-160 characters and compelling',
        similarity: 0.72,
        sourceType: 'context',
        metadata: { url: 'https://example.com/seo-guide' }
      });
    }

    if (queryLower.includes('1099')) {
      mockResults.push({
        chunk: 'IRS Form 1099 deadline is January 31st for most forms',
        similarity: 0.70,
        sourceType: 'profile',
        metadata: { section: 'tax' }
      });
    }

    if (queryLower.includes('deadline')) {
      mockResults.push({
        chunk: 'Important deadlines: Form 1099 due January 31st',
        similarity: 0.68,
        sourceType: 'profile',
        metadata: { section: 'tax' }
      });
    }

    if (queryLower.includes('style') || queryLower.includes('tone')) {
      mockResults.push({
        chunk: 'Writing style: Professional yet approachable, use active voice',
        similarity: 0.82,
        sourceType: 'profile',
        metadata: { section: 'style' }
      });
      mockResults.push({
        chunk: 'Tone guidelines: Be helpful, clear, and concise',
        similarity: 0.78,
        sourceType: 'profile',
        metadata: { section: 'tone' }
      });
    }

    if (queryLower.includes('cta') || queryLower.includes('call to action')) {
      mockResults.push({
        chunk: 'Call-to-action buttons should use action verbs like "Get Started"',
        similarity: 0.73,
        sourceType: 'profile',
        metadata: { section: 'cta' }
      });
    }

    // Sort by similarity and limit
    return mockResults
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }
}

describe('RAG Regression Tests', () => {
  let ragService: MockRAGService;
  const TEST_USER_ID = 'test-user-123';
  const TEST_PROFILE_ID = 'test-profile-456';

  beforeEach(() => {
    ragService = new MockRAGService();
  });

  describe('Golden Dataset Tests', () => {
    GOLDEN_DATASET.forEach(testCase => {
      test(`Golden Test: ${testCase.id} - ${testCase.description}`, async () => {
        const results = await ragService.retrieveRelevantContext(
          TEST_USER_ID,
          TEST_PROFILE_ID,
          testCase.query,
          testCase.expected.minResults + 5 // Retrieve more to test filtering
        );

        // Check minimum number of results
        assert.ok(
          results.length >= testCase.expected.minResults,
          `Expected at least ${testCase.expected.minResults} results, got ${results.length}`
        );

        // Check minimum similarity scores
        results.forEach((result, index) => {
          assert.ok(
            result.similarity >= testCase.expected.minSimilarity,
            `Result ${index} has similarity ${result.similarity}, expected >= ${testCase.expected.minSimilarity}`
          );
        });

        // Check expected chunks (keywords should appear)
        if (testCase.expected.expectedChunks) {
          const allChunkText = results.map(r => r.chunk.toLowerCase()).join(' ');
          testCase.expected.expectedChunks.forEach(expectedKeyword => {
            assert.ok(
              allChunkText.includes(expectedKeyword.toLowerCase()),
              `Expected keyword "${expectedKeyword}" not found in results`
            );
          });
        }

        // Check expected source types
        if (testCase.expected.expectedSourceTypes) {
          const sourceTypes = new Set(results.map(r => r.sourceType));
          const hasExpectedType = testCase.expected.expectedSourceTypes.some(
            type => sourceTypes.has(type)
          );
          assert.ok(
            hasExpectedType,
            `Expected at least one result from types: ${testCase.expected.expectedSourceTypes.join(', ')}`
          );
        }
      });
    });
  });

  describe('Accuracy Metrics', () => {
    test('should maintain or improve average similarity scores', async () => {
      const allResults: RetrievalResult[] = [];

      for (const testCase of GOLDEN_DATASET) {
        const results = await ragService.retrieveRelevantContext(
          TEST_USER_ID,
          TEST_PROFILE_ID,
          testCase.query,
          5
        );
        allResults.push(...results);
      }

      const avgSimilarity = allResults.reduce((sum, r) => sum + r.similarity, 0) / allResults.length;

      // Baseline: average similarity should be >= 0.7
      assert.ok(
        avgSimilarity >= 0.7,
        `Average similarity ${avgSimilarity.toFixed(3)} is below baseline of 0.7`
      );
    });

    test('should maintain top-1 accuracy', async () => {
      let top1Accurate = 0;

      for (const testCase of GOLDEN_DATASET) {
        const results = await ragService.retrieveRelevantContext(
          TEST_USER_ID,
          TEST_PROFILE_ID,
          testCase.query,
          1
        );

        if (results.length > 0 && results[0].similarity >= testCase.expected.minSimilarity) {
          top1Accurate++;
        }
      }

      const top1Accuracy = top1Accurate / GOLDEN_DATASET.length;

      // Baseline: top-1 accuracy should be >= 80%
      assert.ok(
        top1Accuracy >= 0.8,
        `Top-1 accuracy ${(top1Accuracy * 100).toFixed(1)}% is below baseline of 80%`
      );
    });

    test('should maintain top-5 recall', async () => {
      let relevantFound = 0;
      let totalExpected = 0;

      for (const testCase of GOLDEN_DATASET) {
        const results = await ragService.retrieveRelevantContext(
          TEST_USER_ID,
          TEST_PROFILE_ID,
          testCase.query,
          5
        );

        totalExpected += testCase.expected.minResults;

        // Check if we found enough relevant results
        const relevantResults = results.filter(
          r => r.similarity >= testCase.expected.minSimilarity
        );
        if (relevantResults.length >= testCase.expected.minResults) {
          relevantFound += testCase.expected.minResults;
        } else {
          relevantFound += relevantResults.length;
        }
      }

      const recall = relevantFound / totalExpected;

      // Baseline: recall should be >= 85%
      assert.ok(
        recall >= 0.85,
        `Recall ${(recall * 100).toFixed(1)}% is below baseline of 85%`
      );
    });
  });

  describe('Regression Detection', () => {
    test('should detect significant accuracy degradation', async () => {
      // Compare against baseline metrics
      const baseline = {
        avgSimilarity: 0.75,
        top1Accuracy: 0.85,
        recall: 0.90
      };

      const allResults: RetrievalResult[] = [];
      let top1Accurate = 0;
      let relevantFound = 0;
      let totalExpected = 0;

      for (const testCase of GOLDEN_DATASET) {
        const results = await ragService.retrieveRelevantContext(
          TEST_USER_ID,
          TEST_PROFILE_ID,
          testCase.query,
          5
        );
        allResults.push(...results);

        // Top-1 accuracy
        if (results.length > 0 && results[0].similarity >= testCase.expected.minSimilarity) {
          top1Accurate++;
        }

        // Recall
        totalExpected += testCase.expected.minResults;
        const relevantResults = results.filter(
          r => r.similarity >= testCase.expected.minSimilarity
        );
        relevantFound += Math.min(relevantResults.length, testCase.expected.minResults);
      }

      const current = {
        avgSimilarity: allResults.reduce((sum, r) => sum + r.similarity, 0) / allResults.length,
        top1Accuracy: top1Accurate / GOLDEN_DATASET.length,
        recall: relevantFound / totalExpected
      };

      // Check for significant degradation (>10% drop)
      const similarityDrop = (baseline.avgSimilarity - current.avgSimilarity) / baseline.avgSimilarity;
      const accuracyDrop = (baseline.top1Accuracy - current.top1Accuracy) / baseline.top1Accuracy;
      const recallDrop = (baseline.recall - current.recall) / baseline.recall;

      assert.ok(
        similarityDrop < 0.10,
        `Similarity dropped by ${(similarityDrop * 100).toFixed(1)}%, exceeds 10% threshold`
      );

      assert.ok(
        accuracyDrop < 0.10,
        `Top-1 accuracy dropped by ${(accuracyDrop * 100).toFixed(1)}%, exceeds 10% threshold`
      );

      assert.ok(
        recallDrop < 0.10,
        `Recall dropped by ${(recallDrop * 100).toFixed(1)}%, exceeds 10% threshold`
      );
    });
  });

  describe('Performance Regression', () => {
    test('should maintain retrieval latency', async () => {
      const latencies: number[] = [];

      for (const testCase of GOLDEN_DATASET) {
        const startTime = Date.now();
        
        await ragService.retrieveRelevantContext(
          TEST_USER_ID,
          TEST_PROFILE_ID,
          testCase.query,
          5
        );

        latencies.push(Date.now() - startTime);
      }

      const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
      const p95Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];

      // Baseline: average latency <200ms, p95 <500ms
      assert.ok(
        avgLatency < 200,
        `Average latency ${avgLatency}ms exceeds baseline of 200ms`
      );

      assert.ok(
        p95Latency < 500,
        `P95 latency ${p95Latency}ms exceeds baseline of 500ms`
      );
    });
  });
});
