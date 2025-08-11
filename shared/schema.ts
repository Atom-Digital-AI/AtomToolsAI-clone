import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, boolean, primaryKey, integer, jsonb } from "drizzle-orm/pg-core";
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

// Package Definitions - Categories of products/tools with tiers
export const packages = pgTable("packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // e.g., "Marketing Tools", "Analytics", "Automation"
  version: integer("version").default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Package Products - Many-to-many relationship between packages and products
export const packageProducts = pgTable("package_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  packageId: varchar("package_id").notNull().references(() => packages.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tiers - Pricing tiers within packages
export const tiers = pgTable("tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  packageId: varchar("package_id").notNull().references(() => packages.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  promotionalTag: text("promotional_tag"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tier Prices - Pricing options for each tier
export const tierPrices = pgTable("tier_prices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tierId: varchar("tier_id").notNull().references(() => tiers.id, { onDelete: "cascade" }),
  interval: varchar("interval").notNull(), // 'month', 'year', 'lifetime'
  amountMinor: integer("amount_minor").notNull(), // Amount in pence/cents
  currency: varchar("currency").default("GBP"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tier Limits - Product usage limits within each tier
export const tierLimits = pgTable("tier_limits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tierId: varchar("tier_id").notNull().references(() => tiers.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  includedInTier: boolean("included_in_tier").notNull().default(true),
  periodicity: varchar("periodicity").notNull(), // 'day', 'month', 'year', 'lifetime'
  quantity: integer("quantity"), // null means unlimited
  // Subfeatures stored as JSON
  subfeatures: jsonb("subfeatures").default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Products - Individual tools/services (now independent of packages)
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  shortDescription: text("short_description"),
  features: text("features").array().notNull().default(sql`'{}'::text[]`),
  // Pricing removed - now handled at tier level
  isActive: boolean("is_active").notNull().default(true),
  routePath: text("route_path").notNull().unique(), // e.g., "/app/tools/facebook-ads-connector"
  marketingPath: text("marketing_path"), // e.g., "/tools/facebook-ads-looker-studio-connector"
  iconName: text("icon_name"), // Lucide icon name
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  // Subfeatures that can be enabled/disabled in tiers
  availableSubfeatures: jsonb("available_subfeatures").default(sql`'{"bulk": true, "variations": true, "brand_guidelines": true}'::jsonb`),
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

// Tier schemas
export const insertTierSchema = createInsertSchema(tiers).pick({
  packageId: true,
  name: true,
  promotionalTag: true,
  isActive: true,
});

export const insertTierPriceSchema = createInsertSchema(tierPrices).pick({
  tierId: true,
  interval: true,
  amountMinor: true,
  currency: true,
});

export const insertTierLimitSchema = createInsertSchema(tierLimits).pick({
  tierId: true,
  productId: true,
  includedInTier: true,
  periodicity: true,
  quantity: true,
  subfeatures: true,
});

// Admin schemas
export const insertPackageSchema = createInsertSchema(packages).pick({
  name: true,
  description: true,
  category: true,
  version: true,
  isActive: true,
});

export const updatePackageSchema = insertPackageSchema.partial();

export const insertProductSchema = createInsertSchema(products).pick({
  name: true,
  description: true,
  shortDescription: true,
  features: true,
  isActive: true,
  routePath: true,
  marketingPath: true,
  iconName: true,
  tags: true,
  availableSubfeatures: true,
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
export type Tier = typeof tiers.$inferSelect;
export type InsertTier = z.infer<typeof insertTierSchema>;
export type TierPrice = typeof tierPrices.$inferSelect;
export type InsertTierPrice = z.infer<typeof insertTierPriceSchema>;
export type TierLimit = typeof tierLimits.$inferSelect;
export type InsertTierLimit = z.infer<typeof insertTierLimitSchema>;
export type PackageProduct = typeof packageProducts.$inferSelect;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type GuidelineProfile = typeof guidelineProfiles.$inferSelect;
export type InsertGuidelineProfile = z.infer<typeof insertGuidelineProfileSchema>;
export type UpdateGuidelineProfile = z.infer<typeof updateGuidelineProfileSchema>;

// Enhanced package type with tiers and products
export type PackageWithTiers = Package & {
  tiers: (Tier & {
    prices: TierPrice[];
    limits: (TierLimit & { product: Product })[];
  })[];
  products: Product[];
};

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(userSubscriptions),
  guidelineProfiles: many(guidelineProfiles),
}));

export const packagesRelations = relations(packages, ({ many }) => ({
  packageProducts: many(packageProducts),
  tiers: many(tiers),
}));

export const packageProductsRelations = relations(packageProducts, ({ one }) => ({
  package: one(packages, {
    fields: [packageProducts.packageId],
    references: [packages.id],
  }),
  product: one(products, {
    fields: [packageProducts.productId],
    references: [products.id],
  }),
}));

export const tiersRelations = relations(tiers, ({ one, many }) => ({
  package: one(packages, {
    fields: [tiers.packageId],
    references: [packages.id],
  }),
  prices: many(tierPrices),
  limits: many(tierLimits),
}));

export const tierPricesRelations = relations(tierPrices, ({ one }) => ({
  tier: one(tiers, {
    fields: [tierPrices.tierId],
    references: [tiers.id],
  }),
}));

export const tierLimitsRelations = relations(tierLimits, ({ one }) => ({
  tier: one(tiers, {
    fields: [tierLimits.tierId],
    references: [tiers.id],
  }),
  product: one(products, {
    fields: [tierLimits.productId],
    references: [products.id],
  }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  packageProducts: many(packageProducts),
  tierLimits: many(tierLimits),
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
