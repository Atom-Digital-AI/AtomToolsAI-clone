import { storage } from "../storage";
import { embeddingsService } from "./embeddings";
import { documentChunker, type ChunkResult } from "./chunking";
import type { InsertBrandEmbedding, BrandEmbedding, ToolType } from "@shared/schema";
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
   * This is the core RAG retrieval function
   * SECURITY: Requires userId to enforce tenant isolation
   */
  async retrieveRelevantContext(
    userId: string,
    profileId: string,
    query: string,
    limit: number = 5
  ): Promise<RetrievalResult[]> {
    // Step 1: Generate embedding for the query
    const queryEmbedding = await embeddingsService.generateQueryEmbedding(query);

    // Step 2: Search for similar embeddings in the database (with userId filtering for security)
    const results = await storage.searchSimilarEmbeddings(
      userId, // SECURITY: Enforce user ownership
      profileId,
      queryEmbedding,
      limit
    );

    // Step 3: Format results
    return results.map(result => ({
      chunk: result.chunkText,
      similarity: result.similarity,
      metadata: result.metadata as Record<string, any> | undefined,
      sourceType: result.sourceType,
    }));
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
    }
  ): Promise<string> {
    const limit = options?.limit || 5;
    const minSimilarity = options?.minSimilarity || 0.7; // Only include highly relevant chunks

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

    return `\n\nRELEVANT BRAND CONTEXT:\n${contextParts.join('\n\n')}\n`;
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
