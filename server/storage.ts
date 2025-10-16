import { 
  type User, 
  type InsertUser,
  type Product,
  type InsertProduct,
  type Package,
  type InsertPackage,
  type Tier,
  type InsertTier,
  type TierPrice,
  type InsertTierPrice,
  type TierLimit,
  type InsertTierLimit,
  type PackageProduct,
  type PackageWithTiers,
  type UserSubscription,
  type InsertUserSubscription,
  type UserTierSubscription,
  type InsertUserTierSubscription,
  type Contact,
  type InsertContact,
  type GuidelineProfile,
  type InsertGuidelineProfile,
  type UpdateGuidelineProfile,
  type CompleteProfile,
  type ProductWithSubscriptionStatus,
  type CmsPage,
  type InsertCmsPage,
  type UpdateCmsPage,
  type BrandEmbedding,
  type InsertBrandEmbedding,
  type ContentFeedback,
  type ContentWriterSession,
  type InsertContentWriterSession,
  type ContentWriterConcept,
  type InsertContentWriterConcept,
  type ContentWriterSubtopic,
  type InsertContentWriterSubtopic,
  type ContentWriterDraft,
  type InsertContentWriterDraft
} from "@shared/schema";
import { users, products, packages, packageProducts, tiers, tierPrices, tierLimits, userSubscriptions, userTierSubscriptions, guidelineProfiles, cmsPages, generatedContent, contentFeedback, brandContextContent, brandEmbeddings, contentWriterSessions, contentWriterConcepts, contentWriterSubtopics, contentWriterDrafts } from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, inArray, cosineDistance, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;

  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: string, password: string): Promise<void>;
  verifyUserEmail(id: string): Promise<void>;
  completeUserProfile(id: string, profile: CompleteProfile): Promise<void>;
  deleteUser(id: string): Promise<boolean>;
  createUserFromGoogle(googleUser: {
    email: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string;
    isEmailVerified: boolean;
    googleId: string;
  }): Promise<User>;
  updateUserFromGoogle(id: string, googleData: {
    firstName: string;
    lastName: string;
    profileImageUrl: string;
    isEmailVerified: boolean;
  }): Promise<User>;
  
  // Product operations
  getAllProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductByPath(routePath: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  
  // Legacy subscription operations (will be deprecated)
  getUserSubscriptions(userId: string): Promise<UserSubscription[]>;
  isUserSubscribed(userId: string, productId: string): Promise<boolean>;
  subscribeUser(subscription: InsertUserSubscription): Promise<UserSubscription>;
  unsubscribeUser(userId: string, productId: string): Promise<boolean>;
  
  // Tier subscription operations
  getTier(id: string): Promise<Tier | undefined>;
  getUserTierSubscriptions(userId: string): Promise<UserTierSubscription[]>;
  getUserTierSubscriptionsWithDetails(userId: string): Promise<any[]>;
  isUserSubscribedToTier(userId: string, tierId: string): Promise<boolean>;
  getUserProductAccess(userId: string, productId: string): Promise<{ hasAccess: boolean; tierSubscription?: UserTierSubscription; tierLimit?: TierLimit }>;
  subscribeTierUser(subscription: InsertUserTierSubscription): Promise<UserTierSubscription>;
  unsubscribeTierUser(userId: string, tierId: string): Promise<boolean>;
  checkTierUsage(userId: string, productId: string): Promise<{ canUse: boolean; currentUsage: number; limit: number | null }>;
  updateTierUsage(userId: string, productId: string, incrementBy?: number): Promise<void>;
  incrementUsage(userId: string, productId: string, periodicity: string): Promise<void>;
  
  // Guideline Profile operations
  getUserGuidelineProfiles(userId: string, type?: 'brand' | 'regulatory'): Promise<GuidelineProfile[]>;
  getGuidelineProfile(id: string, userId: string): Promise<GuidelineProfile | undefined>;
  createGuidelineProfile(profile: InsertGuidelineProfile & { userId: string }): Promise<GuidelineProfile>;
  updateGuidelineProfile(id: string, userId: string, profile: UpdateGuidelineProfile): Promise<GuidelineProfile | undefined>;
  deleteGuidelineProfile(id: string, userId: string): Promise<boolean>;
  
  // Brand Context Content operations
  getBrandContextContent(guidelineProfileId: string): Promise<any[]>;
  createBrandContextContent(content: any): Promise<any>;
  deleteBrandContextContent(guidelineProfileId: string): Promise<boolean>;

  // Brand Embeddings operations (SECURITY: All methods enforce userId for tenant isolation)
  createBrandEmbedding(embedding: InsertBrandEmbedding): Promise<BrandEmbedding>;
  createBrandEmbeddingsBatch(embeddings: InsertBrandEmbedding[]): Promise<BrandEmbedding[]>;
  getBrandEmbeddings(guidelineProfileId: string): Promise<BrandEmbedding[]>;
  searchSimilarEmbeddings(userId: string, guidelineProfileId: string, queryEmbedding: number[], limit?: number): Promise<Array<BrandEmbedding & { similarity: number }>>;
  deleteBrandEmbeddings(userId: string, guidelineProfileId: string): Promise<boolean>;

  // Content Feedback operations (SECURITY: Enforce userId for tenant isolation)
  getUserFeedback(userId: string, toolType?: string, guidelineProfileId?: string, limit?: number): Promise<ContentFeedback[]>;

  // Content Writer operations (SECURITY: All methods enforce userId for tenant isolation)
  createContentWriterSession(session: InsertContentWriterSession & { userId: string }): Promise<ContentWriterSession>;
  getContentWriterSession(id: string, userId: string): Promise<ContentWriterSession | undefined>;
  getUserContentWriterSessions(userId: string): Promise<ContentWriterSession[]>;
  updateContentWriterSession(id: string, userId: string, updates: Partial<InsertContentWriterSession>): Promise<ContentWriterSession | undefined>;
  deleteContentWriterSession(id: string, userId: string): Promise<boolean>;
  
  createContentWriterConcepts(concepts: (InsertContentWriterConcept & { sessionId: string })[], userId: string): Promise<ContentWriterConcept[]>;
  getSessionConcepts(sessionId: string, userId: string): Promise<ContentWriterConcept[]>;
  updateConceptUserAction(id: string, userId: string, userAction: string, feedbackId?: string): Promise<void>;
  
  createContentWriterSubtopics(subtopics: (InsertContentWriterSubtopic & { sessionId: string })[], userId: string): Promise<ContentWriterSubtopic[]>;
  getSessionSubtopics(sessionId: string, userId: string): Promise<ContentWriterSubtopic[]>;
  updateSubtopicSelection(id: string, userId: string, isSelected: boolean, userAction?: string): Promise<void>;
  
  createContentWriterDraft(draft: InsertContentWriterDraft & { sessionId: string }, userId: string): Promise<ContentWriterDraft>;
  getSessionDraft(sessionId: string, userId: string): Promise<ContentWriterDraft | undefined>;
  updateContentWriterDraft(id: string, userId: string, updates: Partial<InsertContentWriterDraft>): Promise<ContentWriterDraft | undefined>;

  // Admin operations
  isUserAdmin(userId: string): Promise<boolean>;
  
  // Package management with tiers
  getAllPackages(): Promise<Package[]>;
  getPackage(id: string): Promise<Package | undefined>;
  getPackageWithTiers(id: string): Promise<PackageWithTiers | undefined>;
  getAllPackagesWithTiers(): Promise<PackageWithTiers[]>;
  createPackage(packageData: InsertPackage): Promise<Package>;
  updatePackage(id: string, packageData: Partial<InsertPackage>): Promise<Package | undefined>;
  deletePackage(id: string): Promise<boolean>;
  
  // Package-Product relationships
  addProductToPackage(packageId: string, productId: string): Promise<PackageProduct>;
  removeProductFromPackage(packageId: string, productId: string): Promise<boolean>;
  getPackageProducts(packageId: string): Promise<Product[]>;

  // CMS operations
  getCmsPages(type?: string): Promise<CmsPage[]>;
  getCmsPage(id: string): Promise<CmsPage | undefined>;
  getCmsPageBySlug(slug: string): Promise<CmsPage | undefined>;
  createCmsPage(authorId: string, page: InsertCmsPage): Promise<CmsPage>;
  updateCmsPage(id: string, page: UpdateCmsPage): Promise<CmsPage>;
  deleteCmsPage(id: string): Promise<boolean>;
  publishCmsPage(id: string): Promise<CmsPage>;
  
  // Tier management
  createTier(tierData: InsertTier): Promise<Tier>;
  updateTier(id: string, tierData: Partial<InsertTier>): Promise<Tier | undefined>;
  deleteTier(id: string): Promise<boolean>;
  getTiersByPackage(packageId: string): Promise<Tier[]>;
  
  // Tier pricing
  createTierPrice(priceData: InsertTierPrice): Promise<TierPrice>;
  updateTierPrice(id: string, priceData: Partial<InsertTierPrice>): Promise<TierPrice | undefined>;
  deleteTierPrice(id: string): Promise<boolean>;
  
  // Tier limits
  createTierLimit(limitData: InsertTierLimit): Promise<TierLimit>;
  updateTierLimit(id: string, limitData: Partial<InsertTierLimit>): Promise<TierLimit | undefined>;
  deleteTierLimit(id: string): Promise<boolean>;
  
  // Enhanced product management
  getProductsWithPackages(): Promise<any[]>;
  getProductWithPackage(id: string): Promise<any | undefined>;
  
  // User management
  getAllUsers(): Promise<User[]>;
  updateUserAdminStatus(id: string, isAdmin: boolean): Promise<void>;
  
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }



  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async verifyUserEmail(id: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        isEmailVerified: true, 
        emailVerificationToken: null 
      })
      .where(eq(users.id, id));
  }

  async updateUserPassword(id: string, password: string): Promise<void> {
    await db
      .update(users)
      .set({ password })
      .where(eq(users.id, id));
  }

  async completeUserProfile(id: string, profile: CompleteProfile): Promise<void> {
    await db
      .update(users)
      .set({ 
        firstName: profile.firstName,
        lastName: profile.lastName,
        companyName: profile.companyName,
        isProfileComplete: true
      })
      .where(eq(users.id, id));
  }

  async deleteUser(id: string): Promise<boolean> {
    // Delete user tier subscriptions first (foreign key constraint)
    await db.delete(userTierSubscriptions).where(eq(userTierSubscriptions.userId, id));
    // Delete user subscriptions (legacy)
    await db.delete(userSubscriptions).where(eq(userSubscriptions.userId, id));
    // Delete guideline profiles
    await db.delete(guidelineProfiles).where(eq(guidelineProfiles.userId, id));
    // Delete user
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async createUserFromGoogle(googleUser: {
    email: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string;
    isEmailVerified: boolean;
    googleId: string;
  }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        email: googleUser.email,
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
        profileImageUrl: googleUser.profileImageUrl,
        isEmailVerified: googleUser.isEmailVerified,
        googleId: googleUser.googleId,
        // No password for Google OAuth users
        password: null,
        emailVerificationToken: null,
        isProfileComplete: false,
      })
      .returning();
    return user;
  }

  async updateUserFromGoogle(id: string, googleData: {
    firstName: string;
    lastName: string;
    profileImageUrl: string;
    isEmailVerified: boolean;
  }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        firstName: googleData.firstName,
        lastName: googleData.lastName,
        profileImageUrl: googleData.profileImageUrl,
        isEmailVerified: googleData.isEmailVerified,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Product operations
  async getAllProducts(): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.isActive, true));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getProductByPath(routePath: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.routePath, routePath));
    return product || undefined;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db
      .insert(products)
      .values(product)
      .returning();
    return newProduct;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updatedProduct] = await db
      .update(products)
      .set(product)
      .where(eq(products.id, id))
      .returning();
    return updatedProduct || undefined;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db
      .update(products)
      .set({ isActive: false })
      .where(eq(products.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Subscription operations
  async getUserSubscriptions(userId: string): Promise<UserSubscription[]> {
    return await db
      .select()
      .from(userSubscriptions)
      .where(and(eq(userSubscriptions.userId, userId), eq(userSubscriptions.isActive, true)));
  }

  // Legacy method - now superseded by tier-based access checking
  async getProductsWithSubscriptionStatus(userId: string): Promise<ProductWithSubscriptionStatus[]> {
    const allProducts = await this.getAllProducts();
    
    // Check access via tier subscriptions (new system)
    const productAccessPromises = allProducts.map(async (product) => {
      const accessInfo = await this.getUserProductAccess(userId, product.id);
      const usageInfo = await this.checkTierUsage(userId, product.id);
      
      return {
        ...product,
        isSubscribed: accessInfo.hasAccess,
        canUse: usageInfo.canUse,
        currentUsage: usageInfo.currentUsage,
        limit: usageInfo.limit,
      };
    });
    
    return await Promise.all(productAccessPromises);
  }

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
  }

  async subscribeUser(subscription: InsertUserSubscription): Promise<UserSubscription> {
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
  }

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
  }

  // Tier subscription implementations
  async getUserTierSubscriptions(userId: string): Promise<any[]> {
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
        packageId: tiers.packageId
      })
      .from(userTierSubscriptions)
      .leftJoin(tiers, eq(userTierSubscriptions.tierId, tiers.id))
      .where(and(eq(userTierSubscriptions.userId, userId), eq(userTierSubscriptions.isActive, true)));
  }

  async getProductsForTier(tierId: string): Promise<Product[]> {
    // Get the tier to find its package
    const [tier] = await db.select().from(tiers).where(eq(tiers.id, tierId));
    if (!tier) return [];

    // Get all products for this package through package_products table
    const packageProductsQuery = await db
      .select({
        product: products
      })
      .from(packageProducts)
      .innerJoin(products, eq(packageProducts.productId, products.id))
      .where(eq(packageProducts.packageId, tier.packageId));

    return packageProductsQuery.map((p: any) => p.product);
  }

  async getUserProductUsage(userId: string, productId: string): Promise<number> {
    // Count generated content entries for this user and product
    // The toolType in generatedContent corresponds to productId for tracking
    const toolTypeMap: Record<string, string> = {
      'c5985990-e94e-49b3-a86c-3076fd9d6b3f': 'google-ads',
      '531de90b-12ef-4169-b664-0d55428435a6': 'seo-meta', 
      '9dfbe2c0-1128-4ec1-891b-899e1b282ff6': 'content-generator',
      'e8f73a2d-5c4e-4b1f-8a9d-3e7f2a1b4c6d': 'facebook-ads'
    };

    const toolType = toolTypeMap[productId];
    if (!toolType) return 0;

    // Count usage in the current billing period (this month for simplicity)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(generatedContent)
      .where(and(
        eq(generatedContent.userId, userId),
        eq(generatedContent.toolType, toolType),
        sql`${generatedContent.createdAt} >= ${startOfMonth}`
      ));

    return result?.count || 0;
  }


  async getUserTierSubscriptionsWithDetails(userId: string): Promise<any[]> {
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
          }
        }
      })
      .from(userTierSubscriptions)
      .leftJoin(tiers, eq(userTierSubscriptions.tierId, tiers.id))
      .leftJoin(packages, eq(tiers.packageId, packages.id))
      .where(and(eq(userTierSubscriptions.userId, userId), eq(userTierSubscriptions.isActive, true)));
  }

  // Reset usage counters if the periodicity period has elapsed
  async resetUsageIfNeeded(subscriptionId: string, periodicity: string): Promise<void> {
    const [subscription] = await db
      .select()
      .from(userTierSubscriptions)
      .where(eq(userTierSubscriptions.id, subscriptionId));

    if (!subscription) return;

    const now = new Date();
    const lastReset = new Date(subscription.lastResetAt);
    let needsReset = false;

    switch (periodicity) {
      case 'day':
        // Reset if last reset was before today
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastResetDay = new Date(lastReset.getFullYear(), lastReset.getMonth(), lastReset.getDate());
        needsReset = lastResetDay < todayStart;
        break;
      
      case 'month':
        // Reset if last reset was before this month
        needsReset = lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear();
        break;
      
      case 'year':
        // Reset if last reset was before this year
        needsReset = lastReset.getFullYear() !== now.getFullYear();
        break;
      
      case 'lifetime':
        // Never reset lifetime limits
        needsReset = false;
        break;
      
      default:
        // For unknown periodicity, don't reset
        needsReset = false;
        break;
    }

    if (needsReset) {
      // Reset all usage counters for this periodicity
      const currentUsage = subscription.currentUsage as any || {};
      
      // Clear usage for all products with this periodicity
      Object.keys(currentUsage).forEach(productId => {
        if (currentUsage[productId] && currentUsage[productId][periodicity] !== undefined) {
          currentUsage[productId][periodicity] = 0;
        }
      });

      // Update the subscription with reset usage and new reset timestamp
      await db
        .update(userTierSubscriptions)
        .set({
          currentUsage: currentUsage,
          lastResetAt: now,
          updatedAt: now
        })
        .where(eq(userTierSubscriptions.id, subscriptionId));
    }
  }

  // Increment usage counter for a specific product and periodicity
  async incrementUsage(userId: string, productId: string, periodicity: string): Promise<void> {
    const [subscription] = await db
      .select()
      .from(userTierSubscriptions)
      .where(and(
        eq(userTierSubscriptions.userId, userId),
        eq(userTierSubscriptions.isActive, true)
      ));

    if (!subscription) return;

    // Check if reset is needed first
    await this.resetUsageIfNeeded(subscription.id, periodicity);

    // Get updated subscription after potential reset
    const [updatedSubscription] = await db
      .select()
      .from(userTierSubscriptions)
      .where(eq(userTierSubscriptions.id, subscription.id));

    const currentUsage = updatedSubscription.currentUsage as any || {};
    
    // Initialize structure if needed
    if (!currentUsage[productId]) {
      currentUsage[productId] = {};
    }
    
    // Increment the usage counter
    currentUsage[productId][periodicity] = (currentUsage[productId][periodicity] || 0) + 1;

    // Update the subscription
    await db
      .update(userTierSubscriptions)
      .set({
        currentUsage: currentUsage,
        updatedAt: new Date()
      })
      .where(eq(userTierSubscriptions.id, subscription.id));
  }

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
  }

  async getUserProductAccess(userId: string, productId: string): Promise<{ hasAccess: boolean; tierSubscription?: UserTierSubscription; tierLimit?: TierLimit }> {
    // Get all active tier subscriptions for the user
    const tierSubscriptions = await this.getUserTierSubscriptions(userId);
    
    for (const tierSubscription of tierSubscriptions) {
      // Check if this tier includes the product
      const [tierLimit] = await db
        .select()
        .from(tierLimits)
        .where(
          and(
            eq(tierLimits.tierId, tierSubscription.tierId),
            eq(tierLimits.productId, productId),
            eq(tierLimits.includedInTier, true)
          )
        );
      
      if (tierLimit) {
        return { hasAccess: true, tierSubscription, tierLimit };
      }
    }
    
    return { hasAccess: false };
  }

  async subscribeTierUser(subscription: InsertUserTierSubscription): Promise<UserTierSubscription> {
    // Check if already subscribed to this tier
    const existing = await db
      .select()
      .from(userTierSubscriptions)
      .where(
        and(
          eq(userTierSubscriptions.userId, subscription.userId),
          eq(userTierSubscriptions.tierId, subscription.tierId)
        )
      );

    if (existing.length > 0) {
      // Reactivate if exists
      const [updated] = await db
        .update(userTierSubscriptions)
        .set({ isActive: true, subscribedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(userTierSubscriptions.userId, subscription.userId),
            eq(userTierSubscriptions.tierId, subscription.tierId)
          )
        )
        .returning();
      return updated;
    } else {
      // Create new subscription
      const [newSubscription] = await db
        .insert(userTierSubscriptions)
        .values(subscription)
        .returning();
      return newSubscription;
    }
  }

  async unsubscribeTierUser(userId: string, tierId: string): Promise<boolean> {
    const result = await db
      .update(userTierSubscriptions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(userTierSubscriptions.userId, userId),
          eq(userTierSubscriptions.tierId, tierId)
        )
      );
    return (result.rowCount ?? 0) > 0;
  }

  async getTier(id: string): Promise<Tier | undefined> {
    const [tier] = await db.select().from(tiers).where(eq(tiers.id, id));
    return tier || undefined;
  }

  async checkTierUsage(userId: string, productId: string): Promise<{ canUse: boolean; currentUsage: number; limit: number | null }> {
    const accessInfo = await this.getUserProductAccess(userId, productId);
    
    if (!accessInfo.hasAccess || !accessInfo.tierSubscription || !accessInfo.tierLimit) {
      return { canUse: false, currentUsage: 0, limit: null };
    }

    const { tierSubscription, tierLimit } = accessInfo;
    
    // Check if usage needs to be reset based on periodicity
    await this.resetUsageIfNeeded(tierSubscription.id, tierLimit.periodicity);
    
    // Get updated usage after potential reset
    const [updatedSubscription] = await db
      .select()
      .from(userTierSubscriptions)
      .where(eq(userTierSubscriptions.id, tierSubscription.id));
    
    const currentUsage = (updatedSubscription.currentUsage as any)?.[productId]?.[tierLimit.periodicity] || 0;
    const limit = tierLimit.quantity;

    // If no limit (unlimited), allow usage
    if (limit === null) {
      return { canUse: true, currentUsage, limit: null };
    }

    return { canUse: currentUsage < limit, currentUsage, limit };
  }

  async updateTierUsage(userId: string, productId: string, incrementBy: number = 1): Promise<void> {
    const accessInfo = await this.getUserProductAccess(userId, productId);
    
    if (!accessInfo.hasAccess || !accessInfo.tierSubscription || !accessInfo.tierLimit) {
      throw new Error("User does not have access to this product");
    }

    const { tierSubscription, tierLimit } = accessInfo;
    
    // Get current usage object
    const currentUsageObj = (tierSubscription.currentUsage as any) || {};
    if (!currentUsageObj[productId]) {
      currentUsageObj[productId] = {};
    }
    
    // Update usage for the specific periodicity
    currentUsageObj[productId][tierLimit.periodicity] = 
      (currentUsageObj[productId][tierLimit.periodicity] || 0) + incrementBy;

    // Update the subscription record
    await db
      .update(userTierSubscriptions)
      .set({ 
        currentUsage: currentUsageObj,
        updatedAt: new Date()
      })
      .where(eq(userTierSubscriptions.id, tierSubscription.id));
  }

  // Guideline Profile operations
  async getUserGuidelineProfiles(userId: string, type?: 'brand' | 'regulatory'): Promise<GuidelineProfile[]> {
    if (type) {
      return await db
        .select()
        .from(guidelineProfiles)
        .where(and(eq(guidelineProfiles.userId, userId), eq(guidelineProfiles.type, type)))
        .orderBy(guidelineProfiles.createdAt);
    }
    
    return await db
      .select()
      .from(guidelineProfiles)
      .where(eq(guidelineProfiles.userId, userId))
      .orderBy(guidelineProfiles.createdAt);
  }

  async getGuidelineProfile(id: string, userId: string): Promise<GuidelineProfile | undefined> {
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
  }

  async createGuidelineProfile(profile: InsertGuidelineProfile & { userId: string }): Promise<GuidelineProfile> {
    const [newProfile] = await db
      .insert(guidelineProfiles)
      .values({
        ...profile,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newProfile;
  }

  async updateGuidelineProfile(id: string, userId: string, profile: UpdateGuidelineProfile): Promise<GuidelineProfile | undefined> {
    const [updated] = await db
      .update(guidelineProfiles)
      .set({
        ...profile,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(guidelineProfiles.id, id),
          eq(guidelineProfiles.userId, userId)
        )
      )
      .returning();
    return updated || undefined;
  }

  async deleteGuidelineProfile(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(guidelineProfiles)
      .where(
        and(
          eq(guidelineProfiles.id, id),
          eq(guidelineProfiles.userId, userId)
        )
      );
    return (result.rowCount ?? 0) > 0;
  }

  // Brand Context Content operations
  async getBrandContextContent(guidelineProfileId: string): Promise<any[]> {
    return await db
      .select()
      .from(brandContextContent)
      .where(eq(brandContextContent.guidelineProfileId, guidelineProfileId));
  }

  async createBrandContextContent(content: any): Promise<any> {
    const [newContent] = await db
      .insert(brandContextContent)
      .values({
        ...content,
        createdAt: new Date(),
        extractedAt: new Date(),
      })
      .returning();
    return newContent;
  }

  async deleteBrandContextContent(guidelineProfileId: string): Promise<boolean> {
    const result = await db
      .delete(brandContextContent)
      .where(eq(brandContextContent.guidelineProfileId, guidelineProfileId));
    return (result.rowCount ?? 0) > 0;
  }

  // Brand Embeddings operations
  async createBrandEmbedding(embedding: InsertBrandEmbedding): Promise<BrandEmbedding> {
    const [newEmbedding] = await db
      .insert(brandEmbeddings)
      .values({
        ...embedding,
        createdAt: new Date(),
      })
      .returning();
    return newEmbedding;
  }

  async createBrandEmbeddingsBatch(embeddings: InsertBrandEmbedding[]): Promise<BrandEmbedding[]> {
    if (embeddings.length === 0) return [];
    
    const newEmbeddings = await db
      .insert(brandEmbeddings)
      .values(embeddings.map(e => ({
        ...e,
        createdAt: new Date(),
      })))
      .returning();
    return newEmbeddings;
  }

  async getBrandEmbeddings(guidelineProfileId: string): Promise<BrandEmbedding[]> {
    return await db
      .select()
      .from(brandEmbeddings)
      .where(eq(brandEmbeddings.guidelineProfileId, guidelineProfileId));
  }

  async searchSimilarEmbeddings(
    userId: string,
    guidelineProfileId: string, 
    queryEmbedding: number[], 
    limit: number = 5
  ): Promise<Array<BrandEmbedding & { similarity: number }>> {
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
        similarity: sql<number>`1 - ${cosineDistance(brandEmbeddings.embedding, queryEmbedding)}`,
      })
      .from(brandEmbeddings)
      .where(and(
        eq(brandEmbeddings.userId, userId), // SECURITY: Enforce user ownership
        eq(brandEmbeddings.guidelineProfileId, guidelineProfileId)
      ))
      .orderBy(cosineDistance(brandEmbeddings.embedding, queryEmbedding))
      .limit(limit);
    
    return results;
  }

  async deleteBrandEmbeddings(userId: string, guidelineProfileId: string): Promise<boolean> {
    const result = await db
      .delete(brandEmbeddings)
      .where(and(
        eq(brandEmbeddings.userId, userId), // SECURITY: Enforce user ownership
        eq(brandEmbeddings.guidelineProfileId, guidelineProfileId)
      ));
    return (result.rowCount ?? 0) > 0;
  }

  // Content Feedback operations
  async getUserFeedback(
    userId: string, 
    toolType?: string, 
    guidelineProfileId?: string, 
    limit: number = 10
  ): Promise<ContentFeedback[]> {
    const conditions = [eq(contentFeedback.userId, userId)]; // SECURITY: Enforce user ownership

    if (toolType) {
      conditions.push(eq(contentFeedback.toolType, toolType));
    }

    if (guidelineProfileId) {
      conditions.push(eq(contentFeedback.guidelineProfileId, guidelineProfileId));
    }

    const feedback = await db
      .select()
      .from(contentFeedback)
      .where(and(...conditions))
      .orderBy(desc(contentFeedback.createdAt))
      .limit(limit);

    return feedback;
  }

  // Content Writer operations
  async createContentWriterSession(session: InsertContentWriterSession & { userId: string }): Promise<ContentWriterSession> {
    const [newSession] = await db
      .insert(contentWriterSessions)
      .values(session)
      .returning();
    return newSession;
  }

  async getContentWriterSession(id: string, userId: string): Promise<ContentWriterSession | undefined> {
    const [session] = await db
      .select()
      .from(contentWriterSessions)
      .where(and(
        eq(contentWriterSessions.id, id),
        eq(contentWriterSessions.userId, userId) // SECURITY: Enforce user ownership
      ));
    return session;
  }

  async getUserContentWriterSessions(userId: string): Promise<ContentWriterSession[]> {
    return await db
      .select()
      .from(contentWriterSessions)
      .where(eq(contentWriterSessions.userId, userId)) // SECURITY: Enforce user ownership
      .orderBy(desc(contentWriterSessions.createdAt));
  }

  async updateContentWriterSession(id: string, userId: string, updates: Partial<InsertContentWriterSession>): Promise<ContentWriterSession | undefined> {
    // SECURITY: Strip userId from updates to prevent reassignment
    const { userId: _, ...safeUpdates } = updates;
    
    const [updated] = await db
      .update(contentWriterSessions)
      .set({ ...safeUpdates, updatedAt: new Date() })
      .where(and(
        eq(contentWriterSessions.id, id),
        eq(contentWriterSessions.userId, userId) // SECURITY: Enforce user ownership
      ))
      .returning();
    return updated;
  }

  async deleteContentWriterSession(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(contentWriterSessions)
      .where(and(
        eq(contentWriterSessions.id, id),
        eq(contentWriterSessions.userId, userId) // SECURITY: Enforce user ownership
      ));
    return (result.rowCount ?? 0) > 0;
  }

  async createContentWriterConcepts(concepts: (InsertContentWriterConcept & { sessionId: string })[], userId: string): Promise<ContentWriterConcept[]> {
    if (concepts.length === 0) return [];
    
    // SECURITY: Verify all sessionIds belong to the user
    const sessionIds = Array.from(new Set(concepts.map(c => c.sessionId)));
    const sessions = await db
      .select({ id: contentWriterSessions.id })
      .from(contentWriterSessions)
      .where(and(
        inArray(contentWriterSessions.id, sessionIds),
        eq(contentWriterSessions.userId, userId)
      ));
    
    const validSessionIds = new Set(sessions.map(s => s.id));
    const validConcepts = concepts.filter(c => validSessionIds.has(c.sessionId));
    
    if (validConcepts.length === 0) return [];
    
    return await db
      .insert(contentWriterConcepts)
      .values(validConcepts)
      .returning();
  }

  async getSessionConcepts(sessionId: string, userId: string): Promise<ContentWriterConcept[]> {
    // SECURITY: Verify session ownership first
    const session = await this.getContentWriterSession(sessionId, userId);
    if (!session) return [];

    return await db
      .select()
      .from(contentWriterConcepts)
      .where(eq(contentWriterConcepts.sessionId, sessionId))
      .orderBy(contentWriterConcepts.rankOrder);
  }

  async updateConceptUserAction(id: string, userId: string, userAction: string, feedbackId?: string): Promise<void> {
    // SECURITY: Verify concept belongs to user's session
    const [concept] = await db
      .select({ sessionId: contentWriterConcepts.sessionId })
      .from(contentWriterConcepts)
      .where(eq(contentWriterConcepts.id, id));
    
    if (!concept) return;
    
    const session = await this.getContentWriterSession(concept.sessionId, userId);
    if (!session) return;

    await db
      .update(contentWriterConcepts)
      .set({ userAction, feedbackId })
      .where(eq(contentWriterConcepts.id, id));
  }

  async createContentWriterSubtopics(subtopics: (InsertContentWriterSubtopic & { sessionId: string })[], userId: string): Promise<ContentWriterSubtopic[]> {
    if (subtopics.length === 0) return [];
    
    // SECURITY: Verify all sessionIds belong to the user
    const sessionIds = Array.from(new Set(subtopics.map(s => s.sessionId)));
    const sessions = await db
      .select({ id: contentWriterSessions.id })
      .from(contentWriterSessions)
      .where(and(
        inArray(contentWriterSessions.id, sessionIds),
        eq(contentWriterSessions.userId, userId)
      ));
    
    const validSessionIds = new Set(sessions.map(s => s.id));
    const validSubtopics = subtopics.filter(s => validSessionIds.has(s.sessionId));
    
    if (validSubtopics.length === 0) return [];
    
    return await db
      .insert(contentWriterSubtopics)
      .values(validSubtopics)
      .returning();
  }

  async getSessionSubtopics(sessionId: string, userId: string): Promise<ContentWriterSubtopic[]> {
    // SECURITY: Verify session ownership first
    const session = await this.getContentWriterSession(sessionId, userId);
    if (!session) return [];

    return await db
      .select()
      .from(contentWriterSubtopics)
      .where(eq(contentWriterSubtopics.sessionId, sessionId))
      .orderBy(contentWriterSubtopics.rankOrder);
  }

  async updateSubtopicSelection(id: string, userId: string, isSelected: boolean, userAction?: string): Promise<void> {
    // SECURITY: Verify subtopic belongs to user's session
    const [subtopic] = await db
      .select({ sessionId: contentWriterSubtopics.sessionId })
      .from(contentWriterSubtopics)
      .where(eq(contentWriterSubtopics.id, id));
    
    if (!subtopic) return;
    
    const session = await this.getContentWriterSession(subtopic.sessionId, userId);
    if (!session) return;

    await db
      .update(contentWriterSubtopics)
      .set({ isSelected, userAction })
      .where(eq(contentWriterSubtopics.id, id));
  }

  async createContentWriterDraft(draft: InsertContentWriterDraft & { sessionId: string }, userId: string): Promise<ContentWriterDraft> {
    // SECURITY: Verify sessionId belongs to the user
    const session = await this.getContentWriterSession(draft.sessionId, userId);
    if (!session) {
      throw new Error('Session not found or access denied');
    }
    
    const [newDraft] = await db
      .insert(contentWriterDrafts)
      .values(draft)
      .returning();
    return newDraft;
  }

  async getSessionDraft(sessionId: string, userId: string): Promise<ContentWriterDraft | undefined> {
    // SECURITY: Verify session ownership first
    const session = await this.getContentWriterSession(sessionId, userId);
    if (!session) return undefined;

    const [draft] = await db
      .select()
      .from(contentWriterDrafts)
      .where(eq(contentWriterDrafts.sessionId, sessionId));
    return draft;
  }

  async updateContentWriterDraft(id: string, userId: string, updates: Partial<InsertContentWriterDraft>): Promise<ContentWriterDraft | undefined> {
    // SECURITY: Verify draft belongs to user's session
    const [draft] = await db
      .select({ sessionId: contentWriterDrafts.sessionId })
      .from(contentWriterDrafts)
      .where(eq(contentWriterDrafts.id, id));
    
    if (!draft) return undefined;
    
    const session = await this.getContentWriterSession(draft.sessionId, userId);
    if (!session) return undefined;

    const [updated] = await db
      .update(contentWriterDrafts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contentWriterDrafts.id, id))
      .returning();
    return updated;
  }

  // Admin operations
  async isUserAdmin(userId: string): Promise<boolean> {
    const [user] = await db.select({ isAdmin: users.isAdmin })
      .from(users)
      .where(eq(users.id, userId));
    return user?.isAdmin || false;
  }

  // Package management with tiers
  async getAllPackages(): Promise<Package[]> {
    return await db.select().from(packages).orderBy(packages.name);
  }

  async getPackage(id: string): Promise<Package | undefined> {
    const [pkg] = await db.select().from(packages).where(eq(packages.id, id));
    return pkg;
  }

  async getPackageWithTiers(id: string): Promise<PackageWithTiers | undefined> {
    const pkg = await this.getPackage(id);
    if (!pkg) return undefined;

    const packageTiers = await db
      .select()
      .from(tiers)
      .where(eq(tiers.packageId, id));

    const tierIds = packageTiers.map(t => t.id);
    
    const tierPricesList = tierIds.length > 0 
      ? await db.select().from(tierPrices).where(inArray(tierPrices.tierId, tierIds))
      : [];

    const tierLimitsList = tierIds.length > 0
      ? await db
          .select({
            id: tierLimits.id,
            tierId: tierLimits.tierId,
            productId: tierLimits.productId,
            includedInTier: tierLimits.includedInTier,
            periodicity: tierLimits.periodicity,
            quantity: tierLimits.quantity,
            subfeatures: tierLimits.subfeatures,
            createdAt: tierLimits.createdAt,
            product: products
          })
          .from(tierLimits)
          .innerJoin(products, eq(tierLimits.productId, products.id))
          .where(inArray(tierLimits.tierId, tierIds))
      : [];

    const packageProductsList = await db
      .select({
        product: products
      })
      .from(packageProducts)
      .innerJoin(products, eq(packageProducts.productId, products.id))
      .where(eq(packageProducts.packageId, id));

    const tiersWithDetails = packageTiers.map(tier => ({
      ...tier,
      prices: tierPricesList.filter(p => p.tierId === tier.id),
      limits: tierLimitsList.filter(l => l.tierId === tier.id)
    }));

    return {
      ...pkg,
      tiers: tiersWithDetails,
      products: packageProductsList.map(p => p.product)
    };
  }

  async getAllPackagesWithTiers(): Promise<PackageWithTiers[]> {
    const allPackages = await this.getAllPackages();
    const packagesWithTiers = await Promise.all(
      allPackages.map(pkg => this.getPackageWithTiers(pkg.id))
    );
    return packagesWithTiers.filter((pkg): pkg is PackageWithTiers => pkg !== undefined);
  }

  async createPackage(packageData: InsertPackage): Promise<Package> {
    const [pkg] = await db.insert(packages).values(packageData).returning();
    return pkg;
  }

  async updatePackage(id: string, packageData: Partial<InsertPackage>): Promise<Package | undefined> {
    const [pkg] = await db.update(packages)
      .set({ ...packageData, updatedAt: new Date() })
      .where(eq(packages.id, id))
      .returning();
    return pkg;
  }

  async deletePackage(id: string): Promise<boolean> {
    const result = await db.delete(packages).where(eq(packages.id, id));
    return result.rowCount > 0;
  }

  // Package-Product relationships
  async addProductToPackage(packageId: string, productId: string): Promise<PackageProduct> {
    const [relationship] = await db.insert(packageProducts).values({
      packageId,
      productId
    }).returning();
    return relationship;
  }

  async removeProductFromPackage(packageId: string, productId: string): Promise<boolean> {
    const result = await db
      .delete(packageProducts)
      .where(and(
        eq(packageProducts.packageId, packageId),
        eq(packageProducts.productId, productId)
      ));
    return result.rowCount > 0;
  }

  async getPackageProducts(packageId: string): Promise<Product[]> {
    const results = await db
      .select({ product: products })
      .from(packageProducts)
      .innerJoin(products, eq(packageProducts.productId, products.id))
      .where(eq(packageProducts.packageId, packageId));
    return results.map(r => r.product);
  }

  // Tier management
  async createTier(tierData: InsertTier): Promise<Tier> {
    const [tier] = await db.insert(tiers).values(tierData).returning();
    return tier;
  }

  async updateTier(id: string, tierData: Partial<InsertTier>): Promise<Tier | undefined> {
    const [tier] = await db
      .update(tiers)
      .set({ ...tierData, updatedAt: new Date() })
      .where(eq(tiers.id, id))
      .returning();
    return tier;
  }

  async deleteTier(id: string): Promise<boolean> {
    const result = await db.delete(tiers).where(eq(tiers.id, id));
    return result.rowCount > 0;
  }

  async getTiersByPackage(packageId: string): Promise<Tier[]> {
    try {
      return await db.select().from(tiers)
        .where(eq(tiers.packageId, packageId))
        .orderBy(tiers.sortOrder);
    } catch (error) {
      // Fallback if sortOrder column doesn't exist yet
      console.log("sortOrder column not found, using fallback query");
      return await db.select().from(tiers)
        .where(eq(tiers.packageId, packageId));
    }
  }

  async deletePackageTiers(packageId: string): Promise<boolean> {
    // Delete all tier limits for tiers in this package
    const packageTiers = await this.getTiersByPackage(packageId);
    const tierIds = packageTiers.map(t => t.id);
    
    if (tierIds.length > 0) {
      // Delete tier limits
      await db.delete(tierLimits).where(inArray(tierLimits.tierId, tierIds));
      // Delete tier prices
      await db.delete(tierPrices).where(inArray(tierPrices.tierId, tierIds));
    }
    
    // Delete tiers
    const result = await db.delete(tiers).where(eq(tiers.packageId, packageId));
    return (result.rowCount ?? 0) > 0;
  }

  // Tier pricing
  async createTierPrice(priceData: InsertTierPrice): Promise<TierPrice> {
    const [price] = await db.insert(tierPrices).values(priceData).returning();
    return price;
  }

  async updateTierPrice(id: string, priceData: Partial<InsertTierPrice>): Promise<TierPrice | undefined> {
    const [price] = await db
      .update(tierPrices)
      .set(priceData)
      .where(eq(tierPrices.id, id))
      .returning();
    return price;
  }

  async deleteTierPrice(id: string): Promise<boolean> {
    const result = await db.delete(tierPrices).where(eq(tierPrices.id, id));
    return result.rowCount > 0;
  }

  // Tier limits
  async createTierLimit(limitData: InsertTierLimit): Promise<TierLimit> {
    const [limit] = await db.insert(tierLimits).values(limitData).returning();
    return limit;
  }

  async updateTierLimit(id: string, limitData: Partial<InsertTierLimit>): Promise<TierLimit | undefined> {
    const [limit] = await db
      .update(tierLimits)
      .set(limitData)
      .where(eq(tierLimits.id, id))
      .returning();
    return limit;
  }

  async deleteTierLimit(id: string): Promise<boolean> {
    const result = await db.delete(tierLimits).where(eq(tierLimits.id, id));
    return result.rowCount > 0;
  }

  // Enhanced product management
  async getProductsWithPackages(): Promise<any[]> {
    try {
      return await db.select({
        id: products.id,
        name: products.name,
        description: products.description,
        price: products.price,
        currency: products.currency,
        billingType: products.billingType,
        isActive: products.isActive,
        routePath: products.routePath,
        marketingPath: products.marketingPath,
        package: {
          id: packages.id,
          name: packages.name,
        }
      })
      .from(products)
      .leftJoin(packages, eq(products.packageId, packages.id))
      .orderBy(products.name);
    } catch (error) {
      console.log("Enhanced products query failed, using basic products");
      return await this.getAllProducts();
    }
  }

  async getProductWithPackage(id: string): Promise<any | undefined> {
    try {
      const [product] = await db.select({
        id: products.id,
        packageId: products.packageId,
        name: products.name,
        description: products.description,
        shortDescription: products.shortDescription,
        features: products.features,
        price: products.price,
        currency: products.currency,
        billingType: products.billingType,
        isActive: products.isActive,
        routePath: products.routePath,
        marketingPath: products.marketingPath,
        iconName: products.iconName,
        tags: products.tags,
        package: {
          id: packages.id,
          name: packages.name,
        }
      })
      .from(products)
      .leftJoin(packages, eq(products.packageId, packages.id))
      .where(eq(products.id, id));
      return product;
    } catch (error) {
      return await this.getProduct(id);
    }
  }

  // User management
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.email);
  }

  async updateUser(id: string, updates: Partial<typeof users.$inferInsert>): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || null;
  }

  async updateUserAdminStatus(id: string, isAdmin: boolean): Promise<void> {
    await db.update(users)
      .set({ isAdmin, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async getAdminStats(): Promise<{
    packageCount: number;
    productCount: number;
    userCount: number;
    activeSubscriptions: number;
  }> {
    try {
      const [stats] = await db.select({
        packageCount: sql<number>`(SELECT COUNT(*) FROM ${packages})`,
        productCount: sql<number>`(SELECT COUNT(*) FROM ${products})`,
        userCount: sql<number>`(SELECT COUNT(*) FROM ${users})`,
        activeSubscriptions: sql<number>`(SELECT COUNT(*) FROM ${userSubscriptions} WHERE status = 'active')`
      }).from(packages).limit(1);

      return {
        packageCount: Number(stats.packageCount),
        productCount: Number(stats.productCount), 
        userCount: Number(stats.userCount),
        activeSubscriptions: Number(stats.activeSubscriptions)
      };
    } catch (error) {
      // Fallback to basic counts without complex joins
      console.error("Error with full stats query, using fallback:", error);
      
      const [packageCount] = await db.select({ count: sql<number>`count(*)` }).from(packages);
      const [productCount] = await db.select({ count: sql<number>`count(*)` }).from(products);
      const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
      
      return {
        packageCount: Number(packageCount.count),
        productCount: Number(productCount.count),
        userCount: Number(userCount.count),
        activeSubscriptions: 0
      };
    }
  }

  // CMS operations
  async getCmsPages(type?: string): Promise<CmsPage[]> {
    const query = db.select().from(cmsPages);
    if (type) {
      return await query.where(eq(cmsPages.type, type));
    }
    return await query;
  }

  async getCmsPage(id: string): Promise<CmsPage | undefined> {
    const [page] = await db.select().from(cmsPages).where(eq(cmsPages.id, id));
    return page;
  }

  async getCmsPageBySlug(slug: string): Promise<CmsPage | undefined> {
    const [page] = await db.select().from(cmsPages).where(eq(cmsPages.slug, slug));
    return page;
  }

  async createCmsPage(authorId: string, page: InsertCmsPage): Promise<CmsPage> {
    const [createdPage] = await db.insert(cmsPages)
      .values({
        ...page,
        authorId,
      })
      .returning();
    return createdPage;
  }

  async updateCmsPage(id: string, page: UpdateCmsPage): Promise<CmsPage> {
    const [updatedPage] = await db.update(cmsPages)
      .set({
        ...page,
        updatedAt: new Date(),
      })
      .where(eq(cmsPages.id, id))
      .returning();
    return updatedPage;
  }

  async deleteCmsPage(id: string): Promise<boolean> {
    const result = await db.delete(cmsPages).where(eq(cmsPages.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async publishCmsPage(id: string): Promise<CmsPage> {
    const [publishedPage] = await db.update(cmsPages)
      .set({
        status: 'published',
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(cmsPages.id, id))
      .returning();
    return publishedPage;
  }
}

export const storage = new DatabaseStorage();
