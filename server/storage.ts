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
  type Contact,
  type InsertContact,
  type GuidelineProfile,
  type InsertGuidelineProfile,
  type UpdateGuidelineProfile,
  type CompleteProfile,
  type ProductWithSubscriptionStatus
} from "@shared/schema";
import { users, products, packages, packageProducts, tiers, tierPrices, tierLimits, userSubscriptions, guidelineProfiles } from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: string, password: string): Promise<void>;
  verifyUserEmail(id: string): Promise<void>;
  completeUserProfile(id: string, profile: CompleteProfile): Promise<void>;
  deleteUser(id: string): Promise<void>;
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
  
  // Subscription operations
  getUserSubscriptions(userId: string): Promise<UserSubscription[]>;
  isUserSubscribed(userId: string, productId: string): Promise<boolean>;
  
  // Guideline Profile operations
  getUserGuidelineProfiles(userId: string, type?: 'brand' | 'regulatory'): Promise<GuidelineProfile[]>;
  getGuidelineProfile(id: string, userId: string): Promise<GuidelineProfile | undefined>;
  createGuidelineProfile(profile: InsertGuidelineProfile & { userId: string }): Promise<GuidelineProfile>;
  updateGuidelineProfile(id: string, userId: string, profile: UpdateGuidelineProfile): Promise<GuidelineProfile | undefined>;
  deleteGuidelineProfile(id: string, userId: string): Promise<boolean>;

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

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
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
    // Delete user subscriptions first (foreign key constraint)
    await db.delete(userSubscriptions).where(eq(userSubscriptions.userId, id));
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

  async getProductsWithSubscriptionStatus(userId: string): Promise<ProductWithSubscriptionStatus[]> {
    const allProducts = await this.getAllProducts();
    const userSubs = await this.getUserSubscriptions(userId);
    const subscribedProductIds = new Set(userSubs.map(sub => sub.productId));

    return allProducts.map(product => ({
      ...product,
      isSubscribed: subscribedProductIds.has(product.id),
    }));
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
      ? await db.select().from(tierPrices).where(sql`${tierPrices.tierId} = ANY(${tierIds})`)
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
          .where(sql`${tierLimits.tierId} = ANY(${tierIds})`)
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
    return await db.select().from(tiers).where(eq(tiers.packageId, packageId));
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
}

export const storage = new DatabaseStorage();
