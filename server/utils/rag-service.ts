import { storage } from "../storage";
import { embeddingsService } from "./embeddings";
import { documentChunker, type ChunkResult } from "./chunking";
import type { InsertBrandEmbedding, BrandEmbedding, ToolType } from "@shared/schema";
import { rerankingService } from "./reranking-service";
import { hybridSearchService } from "./hybrid-search-service";
import "./langsmith-config"; // Initialize LangSmith tracing if available

/**
 * RAG (Retrieval-Augmented Generation) Service
 * Provides semantic search and retrieval for brand guidelines and context
 * With optional LangSmith tracing for monitoring
 */

export interface RetrievalResult {
  chunk: string;
  similarity: number;
  metadata?: Record<string, any>;
  sourceType: string;
}

export class RAGService {
  /**
   * Process and store brand guidelines content
   * Chunks the content and generates embeddings
   * SECURITY: Requires userId for tenant isolation
   */
  async processAndStoreContent(
    userId: string,
    profileId: string,
    content: string,
    sourceType: 'profile' | 'context' | 'pdf',
    contextContentId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Step 1: Chunk the content
    const chunks = await documentChunker.chunkMarkdown(content, metadata);

    if (chunks.length === 0) {
      console.log('No chunks generated from content');
      return;
    }

    // Step 2: Generate embeddings for chunks (includes userId for security)
    const embeddingsData = await embeddingsService.generateChunkEmbeddings(
      chunks,
      userId, // SECURITY: Pass userId for tenant isolation
      profileId,
      sourceType,
      contextContentId
    );

    // Step 3: Store embeddings in database
    await storage.createBrandEmbeddingsBatch(embeddingsData);
    
    console.log(`Stored ${embeddingsData.length} embeddings for user ${userId}, profile ${profileId}`);
  }

  /**
   * Process multiple context pages and store embeddings
   * SECURITY: Requires userId for tenant isolation
   */
  async processMultipleContexts(
    userId: string,
    profileId: string,
    contexts: Array<{
      content: string;
      contextContentId: string;
      urlType: string;
      url: string;
    }>
  ): Promise<void> {
    const allEmbeddings: InsertBrandEmbedding[] = [];

    for (const context of contexts) {
      // Chunk each context
      const chunks = await documentChunker.chunkMarkdown(context.content, {
        urlType: context.urlType,
        url: context.url,
      });

      // Generate embeddings (includes userId for security)
      const embeddingsData = await embeddingsService.generateChunkEmbeddings(
        chunks,
        userId, // SECURITY: Pass userId for tenant isolation
        profileId,
        'context',
        context.contextContentId
      );

      allEmbeddings.push(...embeddingsData);
    }

    // Batch insert all embeddings
    if (allEmbeddings.length > 0) {
      await storage.createBrandEmbeddingsBatch(allEmbeddings);
      console.log(`Stored ${allEmbeddings.length} embeddings from ${contexts.length} contexts for user ${userId}`);
    }
  }

  /**
   * Retrieve relevant brand context chunks based on a query
   * This is the core RAG retrieval function with optional reranking and hybrid search
   * SECURITY: Requires userId to enforce tenant isolation
   * 
   * @param useHybridSearch - Use hybrid search (vector + full-text) if enabled
   * @param useReranking - Rerank results using Cohere Rerank API if enabled
   * @param initialRetrievalLimit - Number of candidates to retrieve before reranking
   */
  async retrieveRelevantContext(
    userId: string,
    profileId: string,
    query: string,
    limit: number = 5,
    options?: {
      useHybridSearch?: boolean;
      useReranking?: boolean;
      initialRetrievalLimit?: number;
    }
  ): Promise<RetrievalResult[]> {
    const useHybridSearch = options?.useHybridSearch ?? (process.env.HYBRID_SEARCH_ENABLED === 'true');
    const useReranking = options?.useReranking ?? (process.env.RERANKING_ENABLED === 'true');
    const initialRetrievalLimit = options?.initialRetrievalLimit ?? (useReranking ? 50 : limit);

    let results: RetrievalResult[] = [];

    // Step 1: Hybrid Search or Vector Search
    if (useHybridSearch && hybridSearchService) {
      try {
        const hybridResults = await hybridSearchService.search({
          userId,
          guidelineProfileId: profileId,
          query,
          limit: initialRetrievalLimit,
        });

        results = hybridResults.map(result => ({
          chunk: result.chunk,
          similarity: result.scores.combined,
          metadata: result.metadata,
          sourceType: result.sourceType,
        }));
      } catch (error) {
        console.warn('[RAG] Hybrid search failed, falling back to vector search:', error);
        // Fallback to vector search
        const queryEmbedding = await embeddingsService.generateQueryEmbedding(query);
        const vectorResults = await storage.searchSimilarEmbeddings(
          userId,
          profileId,
          queryEmbedding,
          initialRetrievalLimit
        );
        results = vectorResults.map(result => ({
          chunk: result.chunkText,
          similarity: result.similarity,
          metadata: result.metadata as Record<string, any> | undefined,
          sourceType: result.sourceType,
        }));
      }
    } else {
      // Step 1: Generate embedding for the query
      const queryEmbedding = await embeddingsService.generateQueryEmbedding(query);

      // Step 2: Search for similar embeddings in the database
      const vectorResults = await storage.searchSimilarEmbeddings(
        userId, // SECURITY: Enforce user ownership
        profileId,
        queryEmbedding,
        initialRetrievalLimit
      );

      results = vectorResults.map(result => ({
        chunk: result.chunkText,
        similarity: result.similarity,
        metadata: result.metadata as Record<string, any> | undefined,
        sourceType: result.sourceType,
      }));
    }

    // Step 2: Reranking (if enabled)
    if (useReranking && results.length > limit && rerankingService) {
      try {
        const isAvailable = await rerankingService.isAvailable();
        if (isAvailable) {
          // Extract documents for reranking
          const documents = results.map(r => r.chunk);
          const originalScores = results.map(r => r.similarity);

          // Rerank
          const reranked = await rerankingService.rerank({
            query,
            documents,
            topK: limit,
            originalScores,
          });

          // Map reranked results back to RetrievalResult format
          results = reranked.map(result => {
            const original = results[result.index];
            return {
              chunk: result.document,
              similarity: result.relevanceScore,
              metadata: original.metadata,
              sourceType: original.sourceType,
            };
          });
        }
      } catch (error) {
        console.warn('[RAG] Reranking failed, using original results:', error);
        // Fallback: just take top limit
        results = results.slice(0, limit);
      }
    } else {
      // No reranking: just take top limit
      results = results.slice(0, limit);
    }

    return results;
  }

  /**
   * Get formatted brand context for AI prompts
   * Retrieves relevant chunks and formats them for injection into prompts
   * SECURITY: Requires userId to enforce tenant isolation
   */
  async getBrandContextForPrompt(
    userId: string,
    profileId: string,
    query: string,
    options?: {
      limit?: number;
      minSimilarity?: number;
      matchStyle?: boolean;
    }
  ): Promise<string> {
    const limit = options?.limit || 5;
    const minSimilarity = options?.minSimilarity || 0.7; // Only include highly relevant chunks
    const matchStyle = options?.matchStyle ?? false; // Default to false if not specified

    const results = await this.retrieveRelevantContext(userId, profileId, query, limit);

    // Filter by similarity threshold
    const relevantResults = results.filter(r => r.similarity >= minSimilarity);

    if (relevantResults.length === 0) {
      return '';
    }

    // Format for prompt injection
    const contextParts = relevantResults.map((result, index) => {
      const source = result.metadata?.urlType || result.sourceType;
      return `[Context ${index + 1} - ${source}]:\n${result.chunk}`;
    });

    let contextPrompt = `\n\nRELEVANT BRAND CONTEXT:\n${contextParts.join('\n\n')}\n`;

    // Add style-matching instruction if requested
    if (matchStyle) {
      contextPrompt += `\nIMPORTANT: Write this content in the same style, tone, and language patterns as the brand context provided above. Match the writing style, vocabulary choices, sentence structure, and overall voice.\n`;
    }

    return contextPrompt;
  }

  /**
   * Delete all embeddings for a profile
   * Useful when updating/deleting guidelines
   * SECURITY: Requires userId to ensure only owner can delete
   */
  async deleteProfileEmbeddings(userId: string, profileId: string): Promise<void> {
    await storage.deleteBrandEmbeddings(userId, profileId);
    console.log(`Deleted all embeddings for user ${userId}, profile ${profileId}`);
  }

  /**
   * Re-index a profile's content
   * Deletes old embeddings and generates new ones
   * SECURITY: Requires userId for tenant isolation
   */
  async reindexProfile(
    userId: string,
    profileId: string,
    content: string,
    sourceType: 'profile' | 'context' | 'pdf',
    metadata?: Record<string, any>
  ): Promise<void> {
    // Delete old embeddings
    await this.deleteProfileEmbeddings(userId, profileId);

    // Generate new embeddings
    await this.processAndStoreContent(userId, profileId, content, sourceType, undefined, metadata);
    
    console.log(`Re-indexed profile ${profileId} for user ${userId}`);
  }

  /**
   * Retrieve and format user feedback for AI prompt enhancement
   * Retrieves recent feedback (both positive and negative) to help AI learn from past generations
   * SECURITY: Requires userId for tenant isolation
   */
  async retrieveUserFeedback(
    userId: string,
    toolType: ToolType,
    guidelineProfileId?: string,
    limit: number = 10
  ): Promise<string> {
    const feedback = await storage.getUserFeedback(userId, toolType, guidelineProfileId, limit);

    if (feedback.length === 0) {
      return '';
    }

    // Separate positive and negative feedback
    const positiveFeedback = feedback.filter(f => f.rating === 'thumbs_up');
    const negativeFeedback = feedback.filter(f => f.rating === 'thumbs_down');

    const feedbackParts: string[] = [];

    // Format negative feedback (what to improve)
    if (negativeFeedback.length > 0) {
      feedbackParts.push('AREAS TO IMPROVE (based on user feedback):');
      negativeFeedback.forEach((fb, index) => {
        if (fb.feedbackText) {
          feedbackParts.push(`${index + 1}. ${fb.feedbackText}`);
        }
      });
    }

    // Format positive feedback (what worked well)
    if (positiveFeedback.length > 0) {
      feedbackParts.push('\nWHAT WORKED WELL (based on positive feedback):');
      positiveFeedback.slice(0, 3).forEach((fb, index) => {
        const output = fb.outputData as any;
        if (output) {
          feedbackParts.push(`${index + 1}. User approved content similar to: "${JSON.stringify(output).substring(0, 150)}..."`);
        }
      });
    }

    if (feedbackParts.length === 0) {
      return '';
    }

    return `\n\nUSER LEARNING & PREFERENCES:\n${feedbackParts.join('\n')}\n`;
  }
}

// Singleton instance
export const ragService = new RAGService();
