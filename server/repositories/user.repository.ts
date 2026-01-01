import { eq } from "drizzle-orm";
import { db } from "../db";
import {
  users,
  userSubscriptions,
  userTierSubscriptions,
  guidelineProfiles,
  type User,
  type InsertUser,
  type CompleteProfile,
} from "@shared/schema";

/**
 * User Repository
 * Handles all user-related database operations
 */
export const userRepository = {
  /**
   * Get user by ID
   */
  async findById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  },

  /**
   * Get user by email
   */
  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  },

  /**
   * Get user by email verification token
   */
  async findByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.emailVerificationToken, token));
    return user || undefined;
  },

  /**
   * Create a new user
   */
  async create(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  },

  /**
   * Update user by ID
   */
  async update(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  },

  /**
   * Verify user email
   */
  async verifyEmail(id: string): Promise<void> {
    await db
      .update(users)
      .set({
        isEmailVerified: true,
        emailVerificationToken: null,
      })
      .where(eq(users.id, id));
  },

  /**
   * Update user password
   */
  async updatePassword(id: string, password: string): Promise<void> {
    await db.update(users).set({ password }).where(eq(users.id, id));
  },

  /**
   * Complete user profile
   */
  async completeProfile(id: string, profile: CompleteProfile): Promise<void> {
    await db
      .update(users)
      .set({
        firstName: profile.firstName,
        lastName: profile.lastName,
        companyName: profile.companyName,
        isProfileComplete: true,
      })
      .where(eq(users.id, id));
  },

  /**
   * Delete user and all associated data
   */
  async delete(id: string): Promise<boolean> {
    // Delete user tier subscriptions first (foreign key constraint)
    await db
      .delete(userTierSubscriptions)
      .where(eq(userTierSubscriptions.userId, id));
    // Delete user subscriptions (legacy)
    await db.delete(userSubscriptions).where(eq(userSubscriptions.userId, id));
    // Delete guideline profiles
    await db.delete(guidelineProfiles).where(eq(guidelineProfiles.userId, id));
    // Delete user
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  },

  /**
   * Check if user is an admin
   */
  async isAdmin(id: string): Promise<boolean> {
    const [user] = await db
      .select({ isAdmin: users.isAdmin })
      .from(users)
      .where(eq(users.id, id));
    return user?.isAdmin ?? false;
  },
};
