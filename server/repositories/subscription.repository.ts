import { eq, and, sql } from "drizzle-orm";
import { db } from "../db";
import {
  userSubscriptions,
  userTierSubscriptions,
  tiers,
  tierLimits,
  packages,
  generatedContent,
  type UserSubscription,
  type InsertUserSubscription,
  type UserTierSubscription,
  type InsertUserTierSubscription,
  type TierLimit,
} from "@shared/schema";

/**
 * Subscription Repository
 * Handles all subscription and tier-related database operations
 */
export const subscriptionRepository = {
  // ============================================================================
  // Legacy Subscription Methods (backward compatibility)
  // ============================================================================

  /**
   * Get user's legacy subscriptions
   */
  async findUserSubscriptions(userId: string): Promise<UserSubscription[]> {
    return await db
      .select()
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.isActive, true)
        )
      );
  },

  /**
   * Check if user is subscribed to a product (legacy)
   */
  async isUserSubscribed(userId: string, productId: string): Promise<boolean> {
    const [subscription] = await db
      .select()
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.productId, productId),
          eq(userSubscriptions.isActive, true)
        )
      );
    return !!subscription;
  },

  /**
   * Subscribe user to a product (legacy)
   */
  async subscribeUser(
    subscription: InsertUserSubscription
  ): Promise<UserSubscription> {
    // Check if already subscribed
    const existing = await db
      .select()
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.userId, subscription.userId),
          eq(userSubscriptions.productId, subscription.productId)
        )
      );

    if (existing.length > 0) {
      // Reactivate if exists
      const [updated] = await db
        .update(userSubscriptions)
        .set({ isActive: true, subscribedAt: new Date() })
        .where(
          and(
            eq(userSubscriptions.userId, subscription.userId),
            eq(userSubscriptions.productId, subscription.productId)
          )
        )
        .returning();
      return updated;
    } else {
      // Create new subscription
      const [newSubscription] = await db
        .insert(userSubscriptions)
        .values(subscription)
        .returning();
      return newSubscription;
    }
  },

  /**
   * Unsubscribe user from a product (legacy)
   */
  async unsubscribeUser(userId: string, productId: string): Promise<boolean> {
    const result = await db
      .update(userSubscriptions)
      .set({ isActive: false })
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.productId, productId)
        )
      );
    return (result.rowCount ?? 0) > 0;
  },

  // ============================================================================
  // Tier-based Subscription Methods
  // ============================================================================

  /**
   * Get user's tier subscriptions
   */
  async findUserTierSubscriptions(userId: string): Promise<any[]> {
    return await db
      .select({
        id: userTierSubscriptions.id,
        userId: userTierSubscriptions.userId,
        tierId: userTierSubscriptions.tierId,
        subscribedAt: userTierSubscriptions.subscribedAt,
        expiresAt: userTierSubscriptions.expiresAt,
        isActive: userTierSubscriptions.isActive,
        paymentReference: userTierSubscriptions.paymentReference,
        currentUsage: userTierSubscriptions.currentUsage,
        lastResetAt: userTierSubscriptions.lastResetAt,
        createdAt: userTierSubscriptions.createdAt,
        updatedAt: userTierSubscriptions.updatedAt,
        tierName: tiers.name,
        packageId: tiers.packageId,
      })
      .from(userTierSubscriptions)
      .leftJoin(tiers, eq(userTierSubscriptions.tierId, tiers.id))
      .where(
        and(
          eq(userTierSubscriptions.userId, userId),
          eq(userTierSubscriptions.isActive, true)
        )
      );
  },

  /**
   * Get user's tier subscriptions with full details
   */
  async findUserTierSubscriptionsWithDetails(userId: string): Promise<any[]> {
    return await db
      .select({
        id: userTierSubscriptions.id,
        userId: userTierSubscriptions.userId,
        tierId: userTierSubscriptions.tierId,
        subscribedAt: userTierSubscriptions.subscribedAt,
        expiresAt: userTierSubscriptions.expiresAt,
        isActive: userTierSubscriptions.isActive,
        paymentReference: userTierSubscriptions.paymentReference,
        currentUsage: userTierSubscriptions.currentUsage,
        lastResetAt: userTierSubscriptions.lastResetAt,
        tier: {
          id: tiers.id,
          name: tiers.name,
          promotionalTag: tiers.promotionalTag,
          package: {
            id: packages.id,
            name: packages.name,
            description: packages.description,
            category: packages.category,
          },
        } as any,
      })
      .from(userTierSubscriptions)
      .leftJoin(tiers, eq(userTierSubscriptions.tierId, tiers.id))
      .leftJoin(packages, eq(tiers.packageId, packages.id))
      .where(
        and(
          eq(userTierSubscriptions.userId, userId),
          eq(userTierSubscriptions.isActive, true)
        )
      );
  },

  /**
   * Check if user is subscribed to a tier
   */
  async isUserSubscribedToTier(userId: string, tierId: string): Promise<boolean> {
    const [subscription] = await db
      .select()
      .from(userTierSubscriptions)
      .where(
        and(
          eq(userTierSubscriptions.userId, userId),
          eq(userTierSubscriptions.tierId, tierId),
          eq(userTierSubscriptions.isActive, true)
        )
      );
    return !!subscription;
  },

  /**
   * Subscribe user to a tier
   */
  async subscribeTierUser(
    subscription: InsertUserTierSubscription
  ): Promise<UserTierSubscription> {
    const [newSub] = await db
      .insert(userTierSubscriptions)
      .values({
        ...subscription,
        subscribedAt: new Date(),
        isActive: true,
        currentUsage: {},
        lastResetAt: new Date(),
      })
      .returning();
    return newSub;
  },

  /**
   * Unsubscribe user from a tier
   */
  async unsubscribeTierUser(userId: string, tierId: string): Promise<boolean> {
    const result = await db
      .update(userTierSubscriptions)
      .set({ isActive: false })
      .where(
        and(
          eq(userTierSubscriptions.userId, userId),
          eq(userTierSubscriptions.tierId, tierId)
        )
      );
    return (result.rowCount ?? 0) > 0;
  },

  /**
   * Get user's product access through tier subscriptions
   */
  async getUserProductAccess(
    userId: string,
    productId: string
  ): Promise<{
    hasAccess: boolean;
    tierSubscription?: any;
    tierLimit?: TierLimit;
  }> {
    // Get active tier subscriptions
    const tierSubs = await this.findUserTierSubscriptions(userId);

    for (const tierSub of tierSubs) {
      // Check if this tier includes the product
      const [limit] = await db
        .select()
        .from(tierLimits)
        .where(
          and(
            eq(tierLimits.tierId, tierSub.tierId),
            eq(tierLimits.productId, productId)
          )
        );

      if (limit) {
        return {
          hasAccess: true,
          tierSubscription: tierSub,
          tierLimit: limit,
        };
      }
    }

    return { hasAccess: false };
  },

  /**
   * Check tier usage for a product
   */
  async checkTierUsage(
    userId: string,
    productId: string
  ): Promise<{ canUse: boolean; currentUsage: number; limit: number | null }> {
    const access = await this.getUserProductAccess(userId, productId);

    if (!access.hasAccess || !access.tierLimit) {
      return { canUse: false, currentUsage: 0, limit: null };
    }

    const tierSub = access.tierSubscription;
    const currentUsage = (tierSub.currentUsage as any)?.[productId] || 0;
    const limit = access.tierLimit.quantity;

    // Unlimited if limit is null or -1
    if (limit === null || limit === -1) {
      return { canUse: true, currentUsage, limit: null };
    }

    return {
      canUse: currentUsage < limit,
      currentUsage,
      limit,
    };
  },

  /**
   * Increment usage for a product
   */
  async incrementUsage(
    userId: string,
    productId: string,
    periodicity: string
  ): Promise<void> {
    const tierSubs = await this.findUserTierSubscriptions(userId);

    for (const tierSub of tierSubs) {
      const [limit] = await db
        .select()
        .from(tierLimits)
        .where(
          and(
            eq(tierLimits.tierId, tierSub.tierId),
            eq(tierLimits.productId, productId)
          )
        );

      if (limit) {
        const currentUsage = (tierSub.currentUsage as any) || {};
        currentUsage[productId] = (currentUsage[productId] || 0) + 1;

        await db
          .update(userTierSubscriptions)
          .set({ currentUsage })
          .where(eq(userTierSubscriptions.id, tierSub.id));

        break;
      }
    }
  },

  /**
   * Get user's product usage count
   */
  async getUserProductUsage(userId: string, productId: string): Promise<number> {
    // Map productId to toolType
    const toolTypeMap: Record<string, string> = {
      "c5985990-e94e-49b3-a86c-3076fd9d6b3f": "google-ads",
      "531de90b-12ef-4169-b664-0d55428435a6": "seo-meta",
      "e8f73a2d-5c4e-4b1f-8a9d-3e7f2a1b4c6d": "facebook-ads",
    };

    const toolType = toolTypeMap[productId];
    if (!toolType) return 0;

    // Count usage in the current billing period
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(generatedContent)
      .where(
        and(
          eq(generatedContent.userId, userId),
          eq(generatedContent.toolType, toolType),
          sql`${generatedContent.createdAt} >= ${startOfMonth}`
        )
      );

    return result?.count || 0;
  },
};
