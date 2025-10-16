import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

/**
 * Chunking service for splitting documents into semantic chunks for RAG
 * Uses RecursiveCharacterTextSplitter which intelligently splits by:
 * 1. Paragraphs (\n\n)
 * 2. Sentences (\n)
 * 3. Words (space)
 * This preserves context better than fixed-size chunks
 */

export interface ChunkResult {
  text: string;
  index: number;
  metadata?: Record<string, any>;
}

export class DocumentChunker {
  private splitter: RecursiveCharacterTextSplitter;

  constructor(options?: {
    chunkSize?: number;
    chunkOverlap?: number;
  }) {
    // Default settings optimized for brand guidelines
    // 1000 chars ≈ 200-250 tokens, good for embedding models
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: options?.chunkSize || 1000,
      chunkOverlap: options?.chunkOverlap || 200,
      separators: ["\n\n", "\n", ". ", " ", ""],
    });
  }

  /**
   * Split markdown content into semantic chunks
   */
  async chunkMarkdown(
    markdown: string,
    metadata?: Record<string, any>
  ): Promise<ChunkResult[]> {
    const chunks = await this.splitter.createDocuments([markdown]);
    
    return chunks.map((chunk, index) => ({
      text: chunk.pageContent,
      index,
      metadata: {
        ...metadata,
        ...chunk.metadata,
      },
    }));
  }

  /**
   * Split PDF text into semantic chunks
   */
  async chunkPdf(
    pdfText: string,
    metadata?: Record<string, any>
  ): Promise<ChunkResult[]> {
    // Same chunking strategy as markdown
    return this.chunkMarkdown(pdfText, metadata);
  }

  /**
   * Split multiple documents and maintain source tracking
   */
  async chunkMultiple(
    documents: Array<{
      content: string;
      sourceType: string;
      sourceId?: string;
      metadata?: Record<string, any>;
    }>
  ): Promise<ChunkResult[]> {
    const allChunks: ChunkResult[] = [];
    let globalIndex = 0;

    for (const doc of documents) {
      const chunks = await this.chunkMarkdown(doc.content, {
        sourceType: doc.sourceType,
        sourceId: doc.sourceId,
        ...doc.metadata,
      });

      // Assign global indices
      for (const chunk of chunks) {
        allChunks.push({
          ...chunk,
          index: globalIndex++,
        });
      }
    }

    return allChunks;
  }
}

// Singleton instance
export const documentChunker = new DocumentChunker();
