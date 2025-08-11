import { 
  type User, 
  type InsertUser,
  type Product,
  type InsertProduct,
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
import { users, products, userSubscriptions, guidelineProfiles } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

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

  async deleteUser(id: string): Promise<void> {
    // Delete user subscriptions first (foreign key constraint)
    await db.delete(userSubscriptions).where(eq(userSubscriptions.userId, id));
    // Delete user
    await db.delete(users).where(eq(users.id, id));
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
}

export const storage = new DatabaseStorage();
