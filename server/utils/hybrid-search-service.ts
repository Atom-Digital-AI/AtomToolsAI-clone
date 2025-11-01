import { storage } from "../storage";
import { embeddingsService } from "./embeddings";
import type { BrandEmbedding } from "@shared/schema";
import "./langsmith-config";

/**
 * Hybrid Search Service
 * 
 * Combines multiple retrieval strategies for better results:
 * - Dense (vector/semantic search)
 * - Sparse (BM25/keyword search) 
 * - Full-text (PostgreSQL full-text search)
 * 
 * Article finding: "Hybrid search gave us 30-40% better retrieval.
 * Dense vectors catch semantic meaning but completely miss exact matches.
 * Sparse vectors (BM25) nail keywords but ignore context. You need both."
 */

export interface HybridSearchResult {
  id: string;
  chunk: string;
  metadata?: Record<string, any>;
  sourceType: string;
  userId: string;
  guidelineProfileId: string;
  scores: {
    vector: number;      // Cosine similarity (0-1)
    sparse: number;      // BM25 score (normalized 0-1)
    fullText: number;    // Full-text rank (normalized 0-1)
    combined: number;    // Weighted combination
  };
}

export interface HybridSearchParams {
  userId: string;
  guidelineProfileId: string;
  query: string;
  limit: number;
  weights?: {
    vector: number;     // Default: 0.5
    sparse: number;     // Default: 0.3
    fullText: number;   // Default: 0.2
  };
}

export class HybridSearchService {
  private enabled: boolean;
  private defaultWeights = {
    vector: 0.5,
    sparse: 0.3,
    fullText: 0.2,
  };

  constructor() {
    this.enabled = process.env.HYBRID_SEARCH_ENABLED === 'true';
    
    if (this.enabled) {
      console.log('[Hybrid Search] Service initialized');
    }
  }

  /**
   * Perform hybrid search combining vector, sparse, and full-text retrieval
   */
  async search(params: HybridSearchParams): Promise<HybridSearchResult[]> {
    const { userId, guidelineProfileId, query, limit } = params;
    const weights = { ...this.defaultWeights, ...params.weights };

    // Validate weights sum to 1.0
    const weightSum = weights.vector + weights.sparse + weights.fullText;
    if (Math.abs(weightSum - 1.0) > 0.01) {
      throw new Error(`Weights must sum to 1.0, got ${weightSum}`);
    }

    // If hybrid search is disabled, fall back to vector-only
    if (!this.enabled) {
      return this.vectorSearchOnly(userId, guidelineProfileId, query, limit);
    }

    const startTime = Date.now();

    try {
      // Retrieve more candidates from each method
      const candidateCount = limit * 3;

      // Execute all retrieval methods in parallel
      const [vectorResults, fullTextResults] = await Promise.all([
        this.vectorSearch(userId, guidelineProfileId, query, candidateCount),
        this.fullTextSearch(userId, guidelineProfileId, query, candidateCount),
      ]);

      // TODO: Add sparse (BM25) search when implemented
      // For now, we'll use a combination of vector + full-text

      // Combine using Reciprocal Rank Fusion
      const fused = this.reciprocalRankFusion([
        { results: vectorResults, weight: weights.vector + weights.sparse }, // Combine vector + sparse weight for now
        { results: fullTextResults, weight: weights.fullText },
      ]);

      // Take top results
      const topResults = fused.slice(0, limit);

      const duration = Date.now() - startTime;
      console.log(`[Hybrid Search] Completed in ${duration}ms, returned ${topResults.length} results`);

      return topResults;
    } catch (error) {
      console.error('[Hybrid Search] Error during search:', error);
      // Fallback to vector-only on error
      return this.vectorSearchOnly(userId, guidelineProfileId, query, limit);
    }
  }

  /**
   * Vector search (semantic/dense)
   */
  private async vectorSearch(
    userId: string,
    guidelineProfileId: string,
    query: string,
    limit: number
  ): Promise<HybridSearchResult[]> {
    // Generate query embedding
    const queryEmbedding = await embeddingsService.generateQueryEmbedding(query);

    // Search for similar embeddings
    const results = await storage.searchSimilarEmbeddings(
      userId,
      guidelineProfileId,
      queryEmbedding,
      limit
    );

    // Convert to HybridSearchResult format
    return results.map(result => ({
      id: result.id,
      chunk: result.chunkText,
      metadata: result.metadata as Record<string, any> | undefined,
      sourceType: result.sourceType,
      userId: result.userId,
      guidelineProfileId: result.guidelineProfileId,
      scores: {
        vector: result.similarity,
        sparse: 0,
        fullText: 0,
        combined: result.similarity,
      },
    }));
  }

  /**
   * Full-text search using PostgreSQL tsvector
   * Note: Requires chunk_tsv column to be added in migration
   */
  private async fullTextSearch(
    userId: string,
    guidelineProfileId: string,
    query: string,
    limit: number
  ): Promise<HybridSearchResult[]> {
    try {
      const results = await storage.fullTextSearchEmbeddings(
        userId,
        guidelineProfileId,
        query,
        limit
      );

      return results.map(result => ({
        id: result.id,
        chunk: result.chunkText,
        metadata: result.metadata as Record<string, any> | undefined,
        sourceType: result.sourceType,
        userId: result.userId,
        guidelineProfileId: result.guidelineProfileId,
        scores: {
          vector: 0,
          sparse: 0,
          fullText: result.rank,
          combined: result.rank,
        },
      }));
    } catch (error) {
      // If full-text search fails (e.g., column doesn't exist yet), return empty
      console.warn('[Hybrid Search] Full-text search not available:', error);
      return [];
    }
  }

  /**
   * Reciprocal Rank Fusion (RRF)
   * 
   * Combines multiple ranked lists by calculating:
   * score(d) = sum over all rankers r of: 1 / (k + rank_r(d))
   * 
   * where k is a constant (typically 60 from research)
   */
  private reciprocalRankFusion(
    rankedLists: Array<{ results: HybridSearchResult[]; weight: number }>,
    k: number = 60
  ): HybridSearchResult[] {
    const scoreMap = new Map<string, {
      result: HybridSearchResult;
      rrfScore: number;
    }>();

    // Calculate RRF scores for each result
    for (const { results, weight } of rankedLists) {
      results.forEach((result, rank) => {
        const rrfScore = weight / (k + rank + 1);
        
        const existing = scoreMap.get(result.id);
        if (existing) {
          // Combine scores and merge result data
          existing.rrfScore += rrfScore;
          existing.result.scores = this.mergeScores(existing.result.scores, result.scores);
        } else {
          scoreMap.set(result.id, {
            result: { ...result },
            rrfScore,
          });
        }
      });
    }

    // Sort by RRF score and update combined scores
    const sorted = Array.from(scoreMap.values())
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .map(({ result, rrfScore }) => ({
        ...result,
        scores: {
          ...result.scores,
          combined: rrfScore,
        },
      }));

    return sorted;
  }

  /**
   * Merge scores from multiple retrieval methods
   */
  private mergeScores(
    scores1: HybridSearchResult['scores'],
    scores2: HybridSearchResult['scores']
  ): HybridSearchResult['scores'] {
    return {
      vector: Math.max(scores1.vector, scores2.vector),
      sparse: Math.max(scores1.sparse, scores2.sparse),
      fullText: Math.max(scores1.fullText, scores2.fullText),
      combined: scores1.combined + scores2.combined,
    };
  }

  /**
   * Fallback to vector-only search
   */
  private async vectorSearchOnly(
    userId: string,
    guidelineProfileId: string,
    query: string,
    limit: number
  ): Promise<HybridSearchResult[]> {
    console.log('[Hybrid Search] Using vector-only fallback');
    return this.vectorSearch(userId, guidelineProfileId, query, limit);
  }

  /**
   * Get component results for debugging/analysis
   */
  async getComponentResults(params: {
    userId: string;
    guidelineProfileId: string;
    query: string;
    limit: number;
  }): Promise<{
    vector: HybridSearchResult[];
    fullText: HybridSearchResult[];
  }> {
    const { userId, guidelineProfileId, query, limit } = params;

    const [vector, fullText] = await Promise.all([
      this.vectorSearch(userId, guidelineProfileId, query, limit),
      this.fullTextSearch(userId, guidelineProfileId, query, limit),
    ]);

    return { vector, fullText };
  }

  /**
   * Calculate overlap between different retrieval methods
   * Useful for understanding complementarity
   */
  calculateOverlap(
    results1: HybridSearchResult[],
    results2: HybridSearchResult[]
  ): {
    overlap: number;       // Count of shared results
    overlapPercent: number; // Percentage of overlap
    uniqueToFirst: number;
    uniqueToSecond: number;
  } {
    const ids1 = new Set(results1.map(r => r.id));
    const ids2 = new Set(results2.map(r => r.id));

    const overlap = results1.filter(r => ids2.has(r.id)).length;
    const uniqueToFirst = results1.filter(r => !ids2.has(r.id)).length;
    const uniqueToSecond = results2.filter(r => !ids1.has(r.id)).length;
    const total = Math.max(results1.length, results2.length);
    const overlapPercent = total > 0 ? (overlap / total) * 100 : 0;

    return {
      overlap,
      overlapPercent,
      uniqueToFirst,
      uniqueToSecond,
    };
  }
}

// Singleton instance
export const hybridSearchService = new HybridSearchService();
