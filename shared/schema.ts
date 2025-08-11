import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, boolean, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").unique(),
  email: text("email").notNull().unique(),
  password: text("password"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  companyName: text("company_name"),
  profileImageUrl: text("profile_image_url"),
  googleId: text("google_id").unique(),
  isAdmin: boolean("is_admin").notNull().default(false),
  isProfileComplete: boolean("is_profile_complete").notNull().default(false),
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Package Definitions - Categories of products/tools
export const packages = pgTable("packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // e.g., "Marketing Tools", "Analytics", "Automation"
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Products - Individual tools/services within packages
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  packageId: varchar("package_id").notNull().references(() => packages.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  shortDescription: text("short_description"),
  features: text("features").array().notNull().default(sql`'{}'::text[]`),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("GBP"),
  billingType: text("billing_type").notNull().default("one-time"), // "one-time", "monthly", "yearly"
  isActive: boolean("is_active").notNull().default(true),
  routePath: text("route_path").notNull().unique(), // e.g., "/app/tools/facebook-ads-connector"
  marketingPath: text("marketing_path"), // e.g., "/tools/facebook-ads-looker-studio-connector"
  iconName: text("icon_name"), // Lucide icon name
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User Subscriptions - Track which products users have access to
export const userSubscriptions = pgTable("user_subscriptions", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // For timed subscriptions
  isActive: boolean("is_active").notNull().default(true),
  paymentReference: text("payment_reference"), // Reference to payment/order
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.productId] }),
}));

export const guidelineProfiles = pgTable("guideline_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'brand' or 'regulatory'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  isEmailVerified: true,
  emailVerificationToken: true,
}).extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
}).partial({
  isEmailVerified: true,
  emailVerificationToken: true,
});

export const completeProfileSchema = createInsertSchema(users).pick({
  firstName: true,
  lastName: true,
  companyName: true,
}).extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"), 
  companyName: z.string().min(1, "Company name is required"),
});

export const insertContactSchema = createInsertSchema(contacts).pick({
  name: true,
  email: true,
  message: true,
});

export const insertGuidelineProfileSchema = createInsertSchema(guidelineProfiles).pick({
  name: true,
  type: true,
  content: true,
});

export const updateGuidelineProfileSchema = createInsertSchema(guidelineProfiles).pick({
  name: true,
  content: true,
}).partial();

// Admin schemas
export const insertPackageSchema = createInsertSchema(packages).pick({
  name: true,
  description: true,
  category: true,
  isActive: true,
});

export const updatePackageSchema = insertPackageSchema.partial();

export const insertProductSchema = createInsertSchema(products).pick({
  packageId: true,
  name: true,
  description: true,
  shortDescription: true,
  features: true,
  price: true,
  currency: true,
  billingType: true,
  isActive: true,
  routePath: true,
  marketingPath: true,
  iconName: true,
  tags: true,
});

export const updateProductSchema = insertProductSchema.partial();

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type CompleteProfile = z.infer<typeof completeProfileSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Package = typeof packages.$inferSelect;
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type UpdatePackage = z.infer<typeof updatePackageSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type GuidelineProfile = typeof guidelineProfiles.$inferSelect;
export type InsertGuidelineProfile = z.infer<typeof insertGuidelineProfileSchema>;
export type UpdateGuidelineProfile = z.infer<typeof updateGuidelineProfileSchema>;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(userSubscriptions),
  guidelineProfiles: many(guidelineProfiles),
}));

export const packagesRelations = relations(packages, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  package: one(packages, {
    fields: [products.packageId],
    references: [packages.id],
  }),
  subscriptions: many(userSubscriptions),
}));

export const guidelineProfilesRelations = relations(guidelineProfiles, ({ one }) => ({
  user: one(users, {
    fields: [guidelineProfiles.userId],
    references: [users.id],
  }),
}));

export const userSubscriptionsRelations = relations(userSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [userSubscriptions.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [userSubscriptions.productId],
    references: [products.id],
  }),
}));

// Additional admin schemas
export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).pick({
  userId: true,
  productId: true,
  expiresAt: true,
  paymentReference: true,
});

// Extended types for joins
export type UserWithSubscriptions = User & {
  subscriptions: (UserSubscription & { product: Product })[];
};

export type ProductWithSubscriptionStatus = Product & {
  isSubscribed: boolean;
};

export type ProductWithPackage = Product & {
  package: Package;
};

export type PackageWithProducts = Package & {
  products: Product[];
};

export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
