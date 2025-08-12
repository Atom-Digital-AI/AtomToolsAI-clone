import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, boolean, primaryKey, integer, jsonb, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  sortOrder: integer("sort_order").default(0),
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

// Products - Individual tools/services (independent of packages, linked via package_products)
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  shortDescription: text("short_description"),
  features: text("features").array().notNull().default(sql`'{}'::text[]`),
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

// User Tier Subscriptions - Track which package tiers users have access to
export const userTierSubscriptions = pgTable("user_tier_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tierId: varchar("tier_id").notNull().references(() => tiers.id, { onDelete: "cascade" }),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // For timed subscriptions
  isActive: boolean("is_active").notNull().default(true),
  paymentReference: text("payment_reference"), // Reference to payment/order
  // Usage tracking for tier limits
  currentUsage: jsonb("current_usage").default(sql`'{}'::jsonb`), // { "productId": { "monthly": 5, "daily": 1 } }
  lastResetAt: timestamp("last_reset_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userTierUnique: unique().on(table.userId, table.tierId),
}));

// Legacy table for backward compatibility - will be migrated
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

// CMS Pages - For managing static pages and blog content
export const cmsPages = pgTable("cms_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(), // URL path like "/about" or "/blog/post-title"
  type: varchar("type").notNull(), // 'static', 'blog', 'resource'
  status: varchar("status").notNull().default("draft"), // 'draft', 'published', 'archived'
  content: text("content").notNull(), // Main content in HTML
  excerpt: text("excerpt"), // Short description for listings
  featuredImage: text("featured_image"), // URL to featured image
  authorId: varchar("author_id").references(() => users.id),
  
  // SEO Fields
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  canonicalUrl: text("canonical_url"),
  robotsMeta: text("robots_meta").default("index,follow"),
  
  // Open Graph fields
  ogTitle: text("og_title"),
  ogDescription: text("og_description"),
  ogImage: text("og_image"),
  ogType: text("og_type").default("article"),
  
  // Twitter Card fields
  twitterCard: text("twitter_card").default("summary_large_image"),
  twitterTitle: text("twitter_title"),
  twitterDescription: text("twitter_description"),
  twitterImage: text("twitter_image"),
  
  // Publishing
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// CMS Navigation - For managing site navigation
export const cmsNavigation = pgTable("cms_navigation", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  label: text("label").notNull(),
  url: text("url").notNull(),
  parentId: varchar("parent_id").references(() => cmsNavigation.id),
  sortOrder: integer("sort_order").default(0),
  isExternal: boolean("is_external").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

// CMS Page schemas
export const insertCmsPageSchema = createInsertSchema(cmsPages).pick({
  title: true,
  slug: true,
  type: true,
  status: true,
  content: true,
  excerpt: true,
  featuredImage: true,
  metaTitle: true,
  metaDescription: true,
  canonicalUrl: true,
  robotsMeta: true,
  ogTitle: true,
  ogDescription: true,
  ogImage: true,
  ogType: true,
  twitterCard: true,
  twitterTitle: true,
  twitterDescription: true,
  twitterImage: true,
}).extend({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required").regex(/^\/[a-z0-9-\/]*$/, "Slug must start with / and contain only lowercase letters, numbers, and hyphens"),
  type: z.enum(["static", "blog", "resource"]),
  status: z.enum(["draft", "published", "archived"]),
  content: z.string().min(1, "Content is required"),
}).partial({
  excerpt: true,
  featuredImage: true,
  metaTitle: true,
  metaDescription: true,
  canonicalUrl: true,
  robotsMeta: true,
  ogTitle: true,
  ogDescription: true,
  ogImage: true,
  ogType: true,
  twitterCard: true,
  twitterTitle: true,
  twitterDescription: true,
  twitterImage: true,
});

export const updateCmsPageSchema = insertCmsPageSchema.partial();

// Tier schemas
export const insertTierSchema = createInsertSchema(tiers).pick({
  packageId: true,
  name: true,
  promotionalTag: true,
  sortOrder: true,
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

// Content Generation Requests
export const contentRequests = pgTable("content_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").notNull().unique(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  wordCount: integer("word_count").notNull(),
  primaryKeyword: varchar("primary_keyword").notNull(),
  secondaryKeywords: jsonb("secondary_keywords").$type<string[]>().default([]),
  internalLinks: jsonb("internal_links").$type<string[]>().default([]),
  externalLinks: jsonb("external_links").$type<string[]>().default([]),
  additionalInstructions: text("additional_instructions"),
  status: varchar("status").notNull().default("pending"), // pending, completed, failed
  generatedContent: text("generated_content"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export type ContentRequest = typeof contentRequests.$inferSelect;
export type InsertContentRequest = typeof contentRequests.$inferInsert;

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
export type InsertUserSubscription = typeof userSubscriptions.$inferInsert;

// Tier subscription types
export type UserTierSubscription = typeof userTierSubscriptions.$inferSelect;
export type InsertUserTierSubscription = typeof userTierSubscriptions.$inferInsert;

export type GuidelineProfile = typeof guidelineProfiles.$inferSelect;
export type InsertGuidelineProfile = z.infer<typeof insertGuidelineProfileSchema>;
export type UpdateGuidelineProfile = z.infer<typeof updateGuidelineProfileSchema>;

// CMS Types
export type CmsPage = typeof cmsPages.$inferSelect;
export type InsertCmsPage = z.infer<typeof insertCmsPageSchema>;
export type UpdateCmsPage = z.infer<typeof updateCmsPageSchema>;
export type CmsNavigation = typeof cmsNavigation.$inferSelect;

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
  tierSubscriptions: many(userTierSubscriptions),
  guidelineProfiles: many(guidelineProfiles),
  cmsPages: many(cmsPages),
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
  userSubscriptions: many(userTierSubscriptions),
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

export const cmsPagesRelations = relations(cmsPages, ({ one }) => ({
  author: one(users, {
    fields: [cmsPages.authorId],
    references: [users.id],
  }),
}));

export const cmsNavigationRelations = relations(cmsNavigation, ({ one, many }) => ({
  parent: one(cmsNavigation, {
    fields: [cmsNavigation.parentId],
    references: [cmsNavigation.id],
  }),
  children: many(cmsNavigation),
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

export const userTierSubscriptionsRelations = relations(userTierSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [userTierSubscriptions.userId],
    references: [users.id],
  }),
  tier: one(tiers, {
    fields: [userTierSubscriptions.tierId],
    references: [tiers.id],
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


