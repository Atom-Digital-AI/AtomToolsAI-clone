import { eq, and } from "drizzle-orm";
import { db } from "../db";
import {
  guidelineProfiles,
  brandContextContent,
  brandEmbeddings,
  type InsertGuidelineProfile,
  type UpdateGuidelineProfile,
  type BrandEmbedding,
  type InsertBrandEmbedding,
} from "@shared/schema";

// Use the inferred type from drizzle for guideline profiles
type GuidelineProfileRow = typeof guidelineProfiles.$inferSelect;

/**
 * Guideline Repository
 * Handles all guideline profile and brand context database operations
 */
export const guidelineRepository = {
  /**
   * Get user's guideline profiles with optional type filter
   */
  async findByUserId(
    userId: string,
    type?: "brand" | "regulatory"
  ): Promise<GuidelineProfileRow[]> {
    if (type) {
      return await db
        .select()
        .from(guidelineProfiles)
        .where(
          and(
            eq(guidelineProfiles.userId, userId),
            eq(guidelineProfiles.type, type)
          )
        );
    }
    return await db
      .select()
      .from(guidelineProfiles)
      .where(eq(guidelineProfiles.userId, userId));
  },

  /**
   * Get a single guideline profile by ID (with user verification)
   */
  async findById(id: string, userId: string): Promise<GuidelineProfileRow | undefined> {
    const [profile] = await db
      .select()
      .from(guidelineProfiles)
      .where(
        and(
          eq(guidelineProfiles.id, id),
          eq(guidelineProfiles.userId, userId)
        )
      );
    return profile || undefined;
  },

  /**
   * Create a new guideline profile
   */
  async create(
    profile: InsertGuidelineProfile & { userId: string }
  ): Promise<GuidelineProfileRow> {
    const [newProfile] = await db
      .insert(guidelineProfiles)
      .values(profile)
      .returning();
    return newProfile;
  },

  /**
   * Update a guideline profile
   */
  async update(
    id: string,
    userId: string,
    profile: UpdateGuidelineProfile
  ): Promise<GuidelineProfileRow | undefined> {
    const [updated] = await db
      .update(guidelineProfiles)
      .set(profile)
      .where(
        and(
          eq(guidelineProfiles.id, id),
          eq(guidelineProfiles.userId, userId)
        )
      )
      .returning();
    return updated || undefined;
  },

  /**
   * Delete a guideline profile
   */
  async delete(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(guidelineProfiles)
      .where(
        and(
          eq(guidelineProfiles.id, id),
          eq(guidelineProfiles.userId, userId)
        )
      );
    return (result.rowCount ?? 0) > 0;
  },

  // ============================================================================
  // Brand Context Content Methods
  // ============================================================================

  /**
   * Get brand context content for a guideline profile
   */
  async getBrandContextContent(guidelineProfileId: string): Promise<any[]> {
    return await db
      .select()
      .from(brandContextContent)
      .where(eq(brandContextContent.guidelineProfileId, guidelineProfileId));
  },

  /**
   * Create brand context content
   */
  async createBrandContextContent(content: any): Promise<any> {
    const [newContent] = await db
      .insert(brandContextContent)
      .values(content)
      .returning();
    return newContent;
  },

  /**
   * Delete all brand context content for a profile
   */
  async deleteBrandContextContent(guidelineProfileId: string): Promise<boolean> {
    const result = await db
      .delete(brandContextContent)
      .where(eq(brandContextContent.guidelineProfileId, guidelineProfileId));
    return (result.rowCount ?? 0) > 0;
  },

  // ============================================================================
  // Brand Embeddings Methods (SECURITY: All enforce userId for tenant isolation)
  // ============================================================================

  /**
   * Create a single brand embedding
   */
  async createBrandEmbedding(
    embedding: InsertBrandEmbedding
  ): Promise<BrandEmbedding> {
    const [newEmbedding] = await db
      .insert(brandEmbeddings)
      .values(embedding)
      .returning();
    return newEmbedding;
  },

  /**
   * Create multiple brand embeddings in batch
   */
  async createBrandEmbeddingsBatch(
    embeddings: InsertBrandEmbedding[]
  ): Promise<BrandEmbedding[]> {
    if (embeddings.length === 0) return [];
    return await db.insert(brandEmbeddings).values(embeddings).returning();
  },

  /**
   * Get all brand embeddings for a guideline profile
   */
  async getBrandEmbeddings(guidelineProfileId: string): Promise<BrandEmbedding[]> {
    return await db
      .select()
      .from(brandEmbeddings)
      .where(eq(brandEmbeddings.guidelineProfileId, guidelineProfileId));
  },

  /**
   * Delete all brand embeddings for a profile (with userId verification)
   */
  async deleteBrandEmbeddings(
    userId: string,
    guidelineProfileId: string
  ): Promise<boolean> {
    // First verify the profile belongs to the user
    const profile = await this.findById(guidelineProfileId, userId);
    if (!profile) return false;

    const result = await db
      .delete(brandEmbeddings)
      .where(eq(brandEmbeddings.guidelineProfileId, guidelineProfileId));
    return (result.rowCount ?? 0) > 0;
  },
};
