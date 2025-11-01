/**
 * RAG Storage Extensions
 * 
 * Additional storage methods for enhanced RAG features:
 * - Full-text search
 * - Hybrid search support
 * - RAG monitoring/logging
 * 
 * Add these methods to the Storage class in storage.ts
 */

import { db } from "./db";
import { brandEmbeddings, type BrandEmbedding } from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";

/**
 * Full-text search using PostgreSQL tsvector
 * Requires migration 001_add_fulltext_search.sql to be run first
 */
export async function fullTextSearchEmbeddings(
  userId: string,
  guidelineProfileId: string,
  query: string,
  limit: number = 10
): Promise<Array<BrandEmbedding & { rank: number }>> {
  try {
    // Use websearch_to_tsquery for better query parsing
    // It handles phrases, AND/OR logic, and quote operators
    const results = await db
      .select({
        id: brandEmbeddings.id,
        userId: brandEmbeddings.userId,
        guidelineProfileId: brandEmbeddings.guidelineProfileId,
        contextContentId: brandEmbeddings.contextContentId,
        sourceType: brandEmbeddings.sourceType,
        chunkText: brandEmbeddings.chunkText,
        embedding: brandEmbeddings.embedding,
        chunkIndex: brandEmbeddings.chunkIndex,
        metadata: brandEmbeddings.metadata,
        createdAt: brandEmbeddings.createdAt,
        // ts_rank_cd returns a float, we normalize to 0-1 by dividing by max rank
        rank: sql<number>`ts_rank_cd(chunk_tsv, websearch_to_tsquery('english', ${query}), 32)`,
      })
      .from(brandEmbeddings)
      .where(and(
        eq(brandEmbeddings.userId, userId),
        eq(brandEmbeddings.guidelineProfileId, guidelineProfileId),
        sql`chunk_tsv @@ websearch_to_tsquery('english', ${query})`
      ))
      .orderBy(desc(sql`ts_rank_cd(chunk_tsv, websearch_to_tsquery('english', ${query}), 32)`))
      .limit(limit);

    // Normalize ranks to 0-1 scale
    const maxRank = results.length > 0 ? results[0].rank : 1;
    return results.map(r => ({
      ...r,
      rank: r.rank / maxRank,
    }));
  } catch (error) {
    // If column doesn't exist yet, return empty
    console.error('[Storage] Full-text search error:', error);
    return [];
  }
}

/**
 * BM25-style search (alternative to ts_rank_cd)
 * Uses the bm25_score function from migration
 */
export async function bm25SearchEmbeddings(
  userId: string,
  guidelineProfileId: string,
  query: string,
  limit: number = 10,
  k1: number = 1.2,  // BM25 k1 parameter (term frequency saturation)
  b: number = 0.75   // BM25 b parameter (length normalization)
): Promise<Array<BrandEmbedding & { score: number }>> {
  try {
    const results = await db
      .select({
        id: brandEmbeddings.id,
        userId: brandEmbeddings.userId,
        guidelineProfileId: brandEmbeddings.guidelineProfileId,
        contextContentId: brandEmbeddings.contextContentId,
        sourceType: brandEmbeddings.sourceType,
        chunkText: brandEmbeddings.chunkText,
        embedding: brandEmbeddings.embedding,
        chunkIndex: brandEmbeddings.chunkIndex,
        metadata: brandEmbeddings.metadata,
        createdAt: brandEmbeddings.createdAt,
        score: sql<number>`bm25_score(chunk_tsv, websearch_to_tsquery('english', ${query}), ${k1}, ${b})`,
      })
      .from(brandEmbeddings)
      .where(and(
        eq(brandEmbeddings.userId, userId),
        eq(brandEmbeddings.guidelineProfileId, guidelineProfileId),
        sql`chunk_tsv @@ websearch_to_tsquery('english', ${query})`
      ))
      .orderBy(desc(sql`bm25_score(chunk_tsv, websearch_to_tsquery('english', ${query}), ${k1}, ${b})`))
      .limit(limit);

    return results;
  } catch (error) {
    console.error('[Storage] BM25 search error:', error);
    return [];
  }
}

/**
 * Combined vector + full-text search in a single query
 * More efficient than separate queries when both are needed
 */
export async function hybridSearchEmbeddings(
  userId: string,
  guidelineProfileId: string,
  queryEmbedding: number[],
  queryText: string,
  limit: number = 10,
  vectorWeight: number = 0.7,
  textWeight: number = 0.3
): Promise<Array<BrandEmbedding & { vectorScore: number; textScore: number; combinedScore: number }>> {
  try {
    const results = await db
      .select({
        id: brandEmbeddings.id,
        userId: brandEmbeddings.userId,
        guidelineProfileId: brandEmbeddings.guidelineProfileId,
        contextContentId: brandEmbeddings.contextContentId,
        sourceType: brandEmbeddings.sourceType,
        chunkText: brandEmbeddings.chunkText,
        embedding: brandEmbeddings.embedding,
        chunkIndex: brandEmbeddings.chunkIndex,
        metadata: brandEmbeddings.metadata,
        createdAt: brandEmbeddings.createdAt,
        // Vector similarity (cosine distance, normalized to similarity)
        vectorScore: sql<number>`1 - (embedding <=> ${queryEmbedding}::vector)`,
        // Text rank (normalized)
        textScore: sql<number>`ts_rank_cd(chunk_tsv, websearch_to_tsquery('english', ${queryText}), 32)`,
      })
      .from(brandEmbeddings)
      .where(and(
        eq(brandEmbeddings.userId, userId),
        eq(brandEmbeddings.guidelineProfileId, guidelineProfileId)
      ))
      .orderBy(
        desc(
          sql`(${vectorWeight} * (1 - (embedding <=> ${queryEmbedding}::vector))) + 
              (${textWeight} * ts_rank_cd(chunk_tsv, websearch_to_tsquery('english', ${queryText}), 32))`
        )
      )
      .limit(limit);

    return results.map(r => ({
      ...r,
      combinedScore: vectorWeight * r.vectorScore + textWeight * r.textScore,
    }));
  } catch (error) {
    console.error('[Storage] Hybrid search error:', error);
    return [];
  }
}

// Export as methods to add to IStorage interface in storage.ts:
/*
  // Full-text and Hybrid Search operations
  fullTextSearchEmbeddings(userId: string, guidelineProfileId: string, query: string, limit?: number): Promise<Array<BrandEmbedding & { rank: number }>>;
  bm25SearchEmbeddings(userId: string, guidelineProfileId: string, query: string, limit?: number, k1?: number, b?: number): Promise<Array<BrandEmbedding & { score: number }>>;
  hybridSearchEmbeddings(userId: string, guidelineProfileId: string, queryEmbedding: number[], queryText: string, limit?: number, vectorWeight?: number, textWeight?: number): Promise<Array<BrandEmbedding & { vectorScore: number; textScore: number; combinedScore: number }>>;
*/
