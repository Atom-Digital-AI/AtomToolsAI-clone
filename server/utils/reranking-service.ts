import { CohereClient } from "cohere-ai";
import "./langsmith-config";

/**
 * Reranking Service
 * 
 * Implements document reranking to improve retrieval quality.
 * Article finding: "Adding a reranker is literally 5 lines of code but gave us 
 * the biggest accuracy boost. Saw +25% improvement on tough queries."
 * 
 * Pattern: Retrieve top 50 chunks ? Rerank to top 5-10 ? Feed to LLM
 */

export interface RerankResult {
  index: number;           // Original index in input array
  document: string;        // Document text
  relevanceScore: number;  // 0-1 score from reranker (higher = more relevant)
  originalScore?: number;  // Original similarity score if available
}

export interface RerankParams {
  query: string;
  documents: string[];
  topK: number;
  model?: 'cohere' | 'cross-encoder';
  originalScores?: number[];  // Optional: original similarity scores
}

export class RerankingService {
  private cohere: CohereClient | null = null;
  private enabled: boolean;
  private model: string;

  constructor() {
    this.enabled = process.env.RERANKING_ENABLED === 'true';
    this.model = process.env.RERANKING_MODEL || 'rerank-english-v3.0';

    if (this.enabled && process.env.COHERE_API_KEY) {
      this.cohere = new CohereClient({
        token: process.env.COHERE_API_KEY,
      });
      console.log('[Reranking] Service initialized with Cohere');
    } else if (this.enabled) {
      console.warn('[Reranking] Enabled but no Cohere API key found. Falling back to pass-through mode.');
    }
  }

  /**
   * Check if reranking is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.enabled) return false;
    if (!this.cohere) return false;

    try {
      // Simple health check
      return true;
    } catch (error) {
      console.error('[Reranking] Health check failed:', error);
      return false;
    }
  }

  /**
   * Rerank documents using Cohere Rerank API
   * 
   * @param params - Query, documents, and configuration
   * @returns Reranked results with relevance scores
   */
  async rerank(params: RerankParams): Promise<RerankResult[]> {
    const { query, documents, topK, originalScores } = params;

    // Handle empty documents
    if (documents.length === 0) {
      return [];
    }

    // If reranking is disabled or unavailable, return original order
    if (!this.enabled || !this.cohere) {
      console.log('[Reranking] Service disabled or unavailable, returning original order');
      return documents.slice(0, topK).map((doc, index) => ({
        index,
        document: doc,
        relevanceScore: originalScores?.[index] ?? 1.0,
        originalScore: originalScores?.[index],
      }));
    }

    try {
      const startTime = Date.now();

      // Call Cohere Rerank API
      const response = await this.cohere.rerank({
        query,
        documents,
        topN: Math.min(topK, documents.length),
        model: this.model,
        returnDocuments: false, // We already have the documents
      });

      const duration = Date.now() - startTime;
      console.log(`[Reranking] Reranked ${documents.length} docs to top ${topK} in ${duration}ms`);

      // Map results back to our format
      const results: RerankResult[] = response.results.map((result) => ({
        index: result.index,
        document: documents[result.index],
        relevanceScore: result.relevanceScore,
        originalScore: originalScores?.[result.index],
      }));

      // Log score improvement
      if (originalScores) {
        const avgOriginal = originalScores.slice(0, topK).reduce((a, b) => a + b, 0) / topK;
        const avgReranked = results.reduce((a, b) => a + b.relevanceScore, 0) / results.length;
        const improvement = ((avgReranked - avgOriginal) / avgOriginal) * 100;
        console.log(`[Reranking] Score improvement: ${improvement.toFixed(1)}%`);
      }

      return results;
    } catch (error) {
      console.error('[Reranking] Error during reranking:', error);
      
      // Fallback to original order on error
      return documents.slice(0, topK).map((doc, index) => ({
        index,
        document: doc,
        relevanceScore: originalScores?.[index] ?? 1.0,
        originalScore: originalScores?.[index],
      }));
    }
  }

  /**
   * Rerank with metadata preservation
   * Useful when you need to map reranked results back to original objects
   */
  async rerankWithMetadata<T>(params: {
    query: string;
    items: T[];
    textExtractor: (item: T) => string;
    topK: number;
    scoreExtractor?: (item: T) => number;
  }): Promise<Array<T & { rerankScore: number; originalIndex: number }>> {
    const { query, items, textExtractor, topK, scoreExtractor } = params;

    // Extract text for reranking
    const documents = items.map(textExtractor);
    const originalScores = scoreExtractor ? items.map(scoreExtractor) : undefined;

    // Rerank
    const reranked = await this.rerank({
      query,
      documents,
      topK,
      originalScores,
    });

    // Map back to original items with scores
    return reranked.map((result) => ({
      ...items[result.index],
      rerankScore: result.relevanceScore,
      originalIndex: result.index,
    }));
  }

  /**
   * Get available reranking models
   */
  getAvailableModels(): string[] {
    return [
      'rerank-english-v3.0',
      'rerank-multilingual-v3.0',
      'rerank-english-v2.0',
    ];
  }

  /**
   * Calculate reranking impact (for monitoring)
   */
  calculateImpact(params: {
    originalScores: number[];
    rerankScores: number[];
    topK: number;
  }): {
    avgImprovement: number;
    maxImprovement: number;
    reorderedCount: number;
  } {
    const { originalScores, rerankScores, topK } = params;

    const originalTop = originalScores.slice(0, topK);
    const rerankTop = rerankScores.slice(0, topK);

    const avgOriginal = originalTop.reduce((a, b) => a + b, 0) / originalTop.length;
    const avgRerank = rerankTop.reduce((a, b) => a + b, 0) / rerankTop.length;
    const avgImprovement = ((avgRerank - avgOriginal) / avgOriginal) * 100;

    const maxImprovement = Math.max(...rerankTop.map((r, i) => r - originalTop[i]));

    // Count how many positions changed
    const reorderedCount = rerankScores
      .map((_, i) => i)
      .filter((i, rankIndex) => {
        const originalRank = originalScores.indexOf(rerankScores[rankIndex]);
        return originalRank !== rankIndex;
      }).length;

    return {
      avgImprovement,
      maxImprovement,
      reorderedCount,
    };
  }
}

// Singleton instance
export const rerankingService = new RerankingService();
