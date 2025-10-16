import { OpenAIEmbeddings } from "@langchain/openai";
import type { ChunkResult } from "./chunking";
import type { InsertBrandEmbedding } from "@shared/schema";

/**
 * Embeddings service for generating vector embeddings using OpenAI
 * Uses text-embedding-3-small model (1536 dimensions) which is:
 * - Fast and cost-effective
 * - High quality for semantic search
 * - Compatible with pgvector
 */

export class EmbeddingsService {
  private embeddings: OpenAIEmbeddings;

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      modelName: "text-embedding-3-small", // 1536 dimensions
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const embedding = await this.embeddings.embedQuery(text);
    return embedding;
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings = await this.embeddings.embedDocuments(texts);
    return embeddings;
  }

  /**
   * Generate embeddings for chunks and prepare for database insertion
   */
  async generateChunkEmbeddings(
    chunks: ChunkResult[],
    guidelineProfileId: string,
    sourceType: 'profile' | 'context' | 'pdf',
    contextContentId?: string
  ): Promise<InsertBrandEmbedding[]> {
    // Extract texts from chunks
    const texts = chunks.map(chunk => chunk.text);
    
    // Generate embeddings in batch (more efficient)
    const embeddings = await this.generateEmbeddings(texts);
    
    // Prepare for database insertion
    return chunks.map((chunk, index) => ({
      guidelineProfileId,
      contextContentId: contextContentId || null,
      sourceType,
      chunkText: chunk.text,
      embedding: embeddings[index],
      chunkIndex: chunk.index,
      metadata: chunk.metadata || null,
    }));
  }

  /**
   * Generate embedding for a search query
   * Used for RAG retrieval to find similar chunks
   */
  async generateQueryEmbedding(query: string): Promise<number[]> {
    return await this.generateEmbedding(query);
  }
}

// Singleton instance
export const embeddingsService = new EmbeddingsService();
