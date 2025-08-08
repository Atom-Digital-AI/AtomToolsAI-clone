import { 
  type User, 
  type InsertUser,
  type Product,
  type InsertProduct,
  type UserSubscription,
  type InsertUserSubscription,
  type ProductWithSubscriptionStatus,
} from "@shared/schema";
import { users, products, userSubscriptions } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: string, password: string): Promise<void>;
  deleteUser(id: string): Promise<void>;
  
  // Product operations
  getAllProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductByPath(routePath: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  
  // Subscription operations
  getUserSubscriptions(userId: string): Promise<UserSubscription[]>;
  getProductsWithSubscriptionStatus(userId: string): Promise<ProductWithSubscriptionStatus[]>;
  isUserSubscribed(userId: string, productId: string): Promise<boolean>;
  subscribeUser(subscription: InsertUserSubscription): Promise<UserSubscription>;
  unsubscribeUser(userId: string, productId: string): Promise<boolean>;
  
  // Admin operations
  getAllUsersWithSubscriptions(): Promise<Array<User & { subscriptionCount: number }>>;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserPassword(id: string, password: string): Promise<void> {
    await db
      .update(users)
      .set({ password })
      .where(eq(users.id, id));
  }

  async deleteUser(id: string): Promise<void> {
    // Delete user subscriptions first (foreign key constraint)
    await db.delete(userSubscriptions).where(eq(userSubscriptions.userId, id));
    // Delete user
    await db.delete(users).where(eq(users.id, id));
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

  // Admin operations
  async getAllUsersWithSubscriptions(): Promise<Array<User & { subscriptionCount: number }>> {
    const allUsers = await db.select().from(users);
    const result = [];

    for (const user of allUsers) {
      const subs = await this.getUserSubscriptions(user.id);
      result.push({
        ...user,
        subscriptionCount: subs.length,
      });
    }

    return result;
  }
}

export const storage = new DatabaseStorage();
