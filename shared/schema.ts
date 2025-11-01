import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, boolean, primaryKey, integer, jsonb, unique, vector, index, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tool Types - Centralized definition for all AI tools
export const TOOL_TYPES = ['seo-meta', 'google-ads', 'content-writer', 'social-content'] as const;
export type ToolType = typeof TOOL_TYPES[number];

// Product IDs - Centralized UUIDs for all products
export const PRODUCT_IDS = {
  SEO_META_GENERATOR: '531de90b-12ef-4169-b664-0d55428435a6',
  GOOGLE_ADS_GENERATOR: 'c5985990-e94e-49b3-a86c-3076fd9d6b3f',
  FACEBOOK_ADS_CONNECTOR: '9dfbe2c0-1128-4ec1-891b-899e1b28e097',
  SOCIAL_CONTENT_GENERATOR: '7a3c8f1e-9b2d-4e6a-8f7c-1d2e3f4a5b6c',
} as const;

// AI Model Names - Centralized model identifiers
export const AI_MODELS = {
  OPENAI: {
    GPT_4O_MINI: 'gpt-4o-mini',
    GPT_4_TURBO: 'gpt-4-turbo',
    GPT_4: 'gpt-4',
    GPT_3_5_TURBO: 'gpt-3.5-turbo',
  },
  ANTHROPIC: {
    CLAUDE_OPUS_4: 'claude-opus-4-20250514',
    CLAUDE_SONNET_4: 'claude-sonnet-4-20250514',
    CLAUDE_3_5_SONNET: 'claude-3-5-sonnet-20240620',
    CLAUDE_3_OPUS: 'claude-3-opus-20240229',
    CLAUDE_3_SONNET: 'claude-3-sonnet-20240229',
    CLAUDE_3_HAIKU: 'claude-3-haiku-20240307',
  },
  EMBEDDING: 'text-embedding-3-small',
} as const;

// Content Writer Status - Centralized status strings
export const CONTENT_STATUS = ['pending', 'processing', 'completed', 'failed'] as const;
export type ContentStatus = typeof CONTENT_STATUS[number];

// Brand Guidelines Types
export interface TargetAudience {
  gender?: string;
  age_range?: {
    from_age: number;
    to_age: number;
  };
  profession?: string;
  interests?: string[];
  other_keywords?: string[];
  geography?: string; // Target geographical area (e.g., "UK", "United States", "Europe", "Asia-Pacific")
}

export interface BrandContextUrls {
  home_page?: string;
  about_page?: string;
  service_pages?: string[]; // Up to 5 service/product pages
  blog_articles?: string[]; // Up to 20 blog articles/resources
}

export interface BrandGuidelineContent {
  domain_url?: string;
  color_palette?: string[];
  tone_of_voice?: string;
  style_preferences?: string;
  target_audience?: TargetAudience[];
  brand_personality?: string[];
  content_themes?: string[];
  visual_style?: string;
  language_style?: string;
  regulatory_guideline_id?: string; // Link to regulatory guideline profile
  temporary_regulatory_text?: string; // Temporary regulatory text (not saved as profile)
  context_urls?: BrandContextUrls; // URLs for brand context pages
  analyzed_pages?: string[]; // URLs of pages analyzed during auto-populate
  exclusion_patterns?: string[]; // URL patterns to exclude during auto-discovery (e.g., */page=*, */category/*)
  inclusion_patterns?: string[]; // URL patterns to include during auto-discovery - if set, only URLs matching these patterns will be crawled
}

export interface RegulatoryGuidelineContent {
  [key: string]: any; // Flexible structure for regulatory guidelines
}

export type GuidelineContent = BrandGuidelineContent | RegulatoryGuidelineContent | string;

// Zod Schemas for Brand Guidelines
export const targetAudienceSchema = z.object({
  gender: z.string().optional(),
  age_range: z.object({
    from_age: z.number().min(0).max(120),
    to_age: z.number().min(0).max(120),
  }).optional(),
  profession: z.string().optional(),
  interests: z.array(z.string()).optional(),
  other_keywords: z.array(z.string()).optional(),
  geography: z.string().optional(), // Target geographical area
});

export const brandContextUrlsSchema = z.object({
  home_page: z.string().url().optional().or(z.literal('')),
  about_page: z.string().url().optional().or(z.literal('')),
  service_pages: z.array(z.string().url()).max(5).optional(),
  blog_articles: z.array(z.string().url()).max(20).optional(),
});

export const brandGuidelineContentSchema = z.object({
  domain_url: z.string().url().optional().or(z.literal('')),
  color_palette: z.array(z.string()).optional(),
  tone_of_voice: z.string().optional(),
  style_preferences: z.string().optional(),
  target_audience: z.array(targetAudienceSchema).optional(),
  brand_personality: z.array(z.string()).optional(),
  content_themes: z.array(z.string()).optional(),
  visual_style: z.string().optional(),
  language_style: z.string().optional(),
  regulatory_guideline_id: z.string().optional(),
  temporary_regulatory_text: z.string().optional(),
  context_urls: brandContextUrlsSchema.optional(),
  analyzed_pages: z.array(z.string()).optional(),
  exclusion_patterns: z.array(z.string()).optional(),
  inclusion_patterns: z.array(z.string()).optional(),
});

export const regulatoryGuidelineContentSchema = z.record(z.any());

export const guidelineContentSchema = z.union([
  brandGuidelineContentSchema,
  regulatoryGuidelineContentSchema,
  z.string(), // Backward compatibility for simple text
]);

// PostgreSQL enums for page classification
export const pageClassificationEnum = pgEnum('page_classification', [
  'homepage',
  'product_category', 
  'product_detail',
  'blog',
  'help_docs',
  'legal',
  'contact_about',
  'navigation',
  'other'
]);

export const exclusionRuleTypeEnum = pgEnum('exclusion_rule_type', [
  'path_prefix',
  'glob',
  'regex'
]);

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
  emailVerificationTokenExpiry: timestamp("email_verification_token_expiry"),
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
  content: jsonb("content").notNull(), // Structured JSON for brand/regulatory guidelines
  crawledUrls: jsonb("crawled_urls"), // Cached crawl results: { url: string, title: string }[]
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Crawl Jobs - Stores background crawling jobs with progress tracking
export const crawlJobs = pgTable("crawl_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  guidelineProfileId: varchar("guideline_profile_id").references(() => guidelineProfiles.id, { onDelete: "cascade" }),
  homepageUrl: text("homepage_url").notNull(),
  exclusionPatterns: text("exclusion_patterns").array(), // URL patterns to exclude (e.g., */page=*, */category/*)
  inclusionPatterns: text("inclusion_patterns").array(), // URL patterns to include - if set, only URLs matching these patterns will be crawled
  status: text("status").notNull().default("pending"), // 'pending', 'running', 'completed', 'failed', 'cancelled'
  progress: integer("progress").notNull().default(0), // Current page number being crawled
  totalPages: integer("total_pages").notNull().default(250), // Max pages to crawl
  results: jsonb("results"), // Discovered pages: {home_page, about_page, service_pages[], blog_articles[], reachedLimit, totalPagesCrawled}
  error: text("error"), // Error message if failed
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Brand Context Content - Stores extracted markdown content from brand URLs
export const brandContextContent = pgTable("brand_context_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guidelineProfileId: varchar("guideline_profile_id").notNull().references(() => guidelineProfiles.id, { onDelete: "cascade" }),
  url: text("url").notNull(), // The original URL that was crawled
  urlType: text("url_type").notNull(), // 'home', 'about', 'service', 'blog'
  markdownContent: text("markdown_content").notNull(), // Extracted main content in markdown format
  pageTitle: text("page_title"), // Title of the page
  extractedAt: timestamp("extracted_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Brand Embeddings - Stores vector embeddings for RAG retrieval
export const brandEmbeddings = pgTable("brand_embeddings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // SECURITY: Direct user ownership for tenant isolation
  guidelineProfileId: varchar("guideline_profile_id").notNull().references(() => guidelineProfiles.id, { onDelete: "cascade" }),
  contextContentId: varchar("context_content_id").references(() => brandContextContent.id, { onDelete: "cascade" }), // Null for general profile embeddings
  sourceType: text("source_type").notNull(), // 'profile', 'context', 'pdf'
  chunkText: text("chunk_text").notNull(), // The actual text chunk that was embedded
  embedding: vector("embedding", { dimensions: 1536 }), // OpenAI text-embedding-3-small uses 1536 dimensions
  chunkIndex: integer("chunk_index").notNull().default(0), // Order of the chunk in the document
  metadata: jsonb("metadata"), // Additional metadata (page type, source URL, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  // HNSW index for fast similarity search using cosine distance
  index("embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
]);

// Pages - Stores individual crawled pages with full metadata
export const pages = pgTable("pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  crawlId: varchar("crawl_id").notNull().references(() => crawlJobs.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // For tenant isolation
  rawUrl: text("raw_url").notNull(), // Original URL as discovered
  normalizedUrl: text("normalized_url").notNull(), // Normalized for deduplication
  canonicalUrl: text("canonical_url"), // Canonical URL if present
  title: text("title"), // Page <title> tag
  metaDescription: text("meta_description"), // Meta description
  contentHash: text("content_hash"), // MD5 hash of content for duplicate detection
  htmlContent: text("html_content"), // Full HTML content
  httpStatus: integer("http_status"), // HTTP status code (200, 404, etc.)
  crawledAt: timestamp("crawled_at").defaultNow().notNull(),
});

// Page Reviews - User classification and tagging of crawled pages
export const pageReviews = pgTable("page_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pageId: varchar("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }).unique(), // One review per page
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // For tenant isolation
  classification: pageClassificationEnum("classification").notNull(), // Use enum
  description: varchar("description", { length: 200 }), // 200-char limit
  exclude: boolean("exclude").notNull().default(false), // Exclude from RAG processing
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Exclusion Rules - Smart URL pattern exclusions with samples
export const exclusionRules = pgTable("exclusion_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // For tenant isolation
  guidelineProfileId: varchar("guideline_profile_id").references(() => guidelineProfiles.id, { onDelete: "cascade" }), // Optional: link to brand
  ruleType: exclusionRuleTypeEnum("rule_type").notNull(), // Use enum
  pattern: text("pattern").notNull(), // The pattern to match
  sampleUrl: text("sample_url"), // Example URL that matched this rule
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
export const cmsNavigation: any = pgTable("cms_navigation", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  label: text("label").notNull(),
  url: text("url").notNull(),
  parentId: varchar("parent_id").references((): any => cmsNavigation.id),
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
}).extend({
  content: guidelineContentSchema,
});

export const updateGuidelineProfileSchema = createInsertSchema(guidelineProfiles).pick({
  name: true,
  content: true,
  crawledUrls: true,
}).extend({
  content: guidelineContentSchema,
}).partial();

// Crawl Job schemas
export const insertCrawlJobSchema = createInsertSchema(crawlJobs).pick({
  homepageUrl: true,
  exclusionPatterns: true,
  inclusionPatterns: true,
  guidelineProfileId: true,
}).extend({
  homepageUrl: z.string().url(),
  exclusionPatterns: z.array(z.string()).optional(),
  inclusionPatterns: z.array(z.string()).optional(),
  guidelineProfileId: z.string().optional(),
});

export const updateCrawlJobSchema = createInsertSchema(crawlJobs).pick({
  status: true,
  progress: true,
  results: true,
  error: true,
  startedAt: true,
  completedAt: true,
}).partial();

// Brand Context Content schemas
export const insertBrandContextContentSchema = createInsertSchema(brandContextContent).pick({
  guidelineProfileId: true,
  url: true,
  urlType: true,
  markdownContent: true,
  pageTitle: true,
});

// Brand Embeddings schemas
export const insertBrandEmbeddingSchema = createInsertSchema(brandEmbeddings).pick({
  userId: true, // SECURITY: Required for tenant isolation
  guidelineProfileId: true,
  contextContentId: true,
  sourceType: true,
  chunkText: true,
  embedding: true,
  chunkIndex: true,
  metadata: true,
});

export type InsertBrandEmbedding = z.infer<typeof insertBrandEmbeddingSchema>;
export type BrandEmbedding = typeof brandEmbeddings.$inferSelect;

// Page schemas
export const insertPageSchema = createInsertSchema(pages).pick({
  crawlId: true,
  userId: true,
  rawUrl: true,
  normalizedUrl: true,
  canonicalUrl: true,
  title: true,
  metaDescription: true,
  contentHash: true,
  htmlContent: true,
  httpStatus: true,
});

export const insertPageReviewSchema = createInsertSchema(pageReviews).pick({
  pageId: true,
  userId: true,
  classification: true,
  description: true,
  exclude: true,
}).extend({
  classification: z.enum(['homepage', 'product_category', 'product_detail', 'blog', 'help_docs', 'legal', 'contact_about', 'navigation', 'other']),
  description: z.string().max(200).optional(),
});

export const updatePageReviewSchema = insertPageReviewSchema.partial().pick({
  classification: true,
  description: true,
  exclude: true,
});

export const insertExclusionRuleSchema = createInsertSchema(exclusionRules).pick({
  userId: true,
  guidelineProfileId: true,
  ruleType: true,
  pattern: true,
  sampleUrl: true,
}).extend({
  ruleType: z.enum(['path_prefix', 'glob', 'regex']),
});

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

// Generated Content History
export const generatedContent = pgTable("generated_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  toolType: varchar("tool_type").notNull(), // See TOOL_TYPES for valid values
  title: varchar("title").notNull(),
  inputData: jsonb("input_data").notNull(), // Store the input parameters
  outputData: jsonb("output_data").notNull(), // Store the generated results
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type GeneratedContent = typeof generatedContent.$inferSelect;
export type InsertGeneratedContent = typeof generatedContent.$inferInsert;

// Content Feedback - for AI learning and improvement
export const contentFeedback = pgTable("content_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  guidelineProfileId: varchar("guideline_profile_id").references(() => guidelineProfiles.id), // Optional: associate with brand
  toolType: varchar("tool_type").notNull(), // See TOOL_TYPES for valid values
  rating: varchar("rating").notNull(), // 'thumbs_up' or 'thumbs_down'
  feedbackText: text("feedback_text"), // Optional: only for thumbs down
  inputData: jsonb("input_data").notNull(), // The input that generated the content
  outputData: jsonb("output_data").notNull(), // The generated content being rated
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ContentFeedback = typeof contentFeedback.$inferSelect;
export type InsertContentFeedback = typeof contentFeedback.$inferInsert;

export const insertContentFeedbackSchema = createInsertSchema(contentFeedback).omit(['id', 'createdAt']);

// Content Writer - Multi-stage article generation
export const contentWriterSessions = pgTable("content_writer_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  guidelineProfileId: varchar("guideline_profile_id").references(() => guidelineProfiles.id), // Optional: brand context
  topic: text("topic").notNull(), // Initial topic/keywords input
  status: varchar("status").notNull().default("concepts"), // concepts, subtopics, generating, completed, failed
  selectedConceptId: varchar("selected_concept_id"), // Which concept user chose
  objective: text("objective"), // User's objective for the article
  internalLinks: jsonb("internal_links").$type<string[]>(), // Links to include
  targetLength: integer("target_length"), // Word count target
  toneOfVoice: text("tone_of_voice"), // Custom tone
  language: varchar("language"), // Custom language
  useBrandGuidelines: boolean("use_brand_guidelines").default(false), // Whether to use brand guidelines
  selectedTargetAudiences: jsonb("selected_target_audiences").$type<"all" | "none" | number[]>(), // Target audience selection: "all", "none", or array of indices
  styleMatchingMethod: varchar("style_matching_method").default("continuous"), // 'continuous' (inject context throughout) or 'end-rewrite' (analyze and rewrite at end)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contentWriterConcepts = pgTable("content_writer_concepts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => contentWriterSessions.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  rankOrder: integer("rank_order").notNull(), // Display order (1-5, 1-10, etc.)
  userAction: varchar("user_action"), // chosen, saved, discarded, regenerated
  feedbackId: varchar("feedback_id").references(() => contentFeedback.id), // Link to feedback if provided
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contentWriterSubtopics = pgTable("content_writer_subtopics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => contentWriterSessions.id, { onDelete: 'cascade' }),
  parentConceptId: varchar("parent_concept_id").notNull().references(() => contentWriterConcepts.id),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  rankOrder: integer("rank_order").notNull(), // Display order
  isSelected: boolean("is_selected").default(false), // User selected for final article
  userAction: varchar("user_action"), // selected, saved, discarded
  feedbackId: varchar("feedback_id").references(() => contentFeedback.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contentWriterDrafts = pgTable("content_writer_drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => contentWriterSessions.id, { onDelete: 'cascade' }),
  mainBrief: text("main_brief"), // Content brief for main article
  subtopicBriefs: jsonb("subtopic_briefs").$type<{subtopicId: string, brief: string}[]>(), // Briefs for each subtopic
  subtopicContents: jsonb("subtopic_contents").$type<{subtopicId: string, content: string}[]>(), // Generated content per subtopic
  topAndTail: text("top_and_tail"), // Introduction and conclusion
  finalArticle: text("final_article"), // Assembled and reviewed final article
  metadata: jsonb("metadata"), // Additional metadata (word count, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// LangGraph Threads - Stores LangGraph execution threads for Content Writer
export const langgraphThreads = pgTable("langgraph_threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`), // thread_id
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionId: varchar("session_id").references(() => contentWriterSessions.id, { onDelete: 'cascade' }), // Link to content writer session
  status: varchar("status").notNull().default("active"), // active, paused, completed, failed, cancelled
  lastCheckpointId: varchar("last_checkpoint_id"),
  metadata: jsonb("metadata"), // Additional thread metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("langgraph_threads_user_id_idx").on(table.userId),
  sessionIdIdx: index("langgraph_threads_session_id_idx").on(table.sessionId),
  statusIdx: index("langgraph_threads_status_idx").on(table.status),
  createdAtIdx: index("langgraph_threads_created_at_idx").on(table.createdAt),
  statusCreatedAtIdx: index("langgraph_threads_status_created_at_idx").on(table.status, table.createdAt),
}));

// LangGraph Checkpoints - Stores checkpoint data for resume capability
export const langgraphCheckpoints = pgTable("langgraph_checkpoints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull().references(() => langgraphThreads.id, { onDelete: 'cascade' }),
  checkpointId: varchar("checkpoint_id").notNull(), // LangGraph checkpoint ID
  parentCheckpointId: varchar("parent_checkpoint_id"), // Parent checkpoint for history
  stateData: jsonb("state_data").notNull(), // Serialized graph state
  metadata: jsonb("metadata"), // Checkpoint metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  threadIdIdx: index("langgraph_checkpoints_thread_id_idx").on(table.threadId),
  checkpointIdIdx: index("langgraph_checkpoints_checkpoint_id_idx").on(table.checkpointId),
  threadCheckpointUnique: unique("thread_checkpoint_unique").on(table.threadId, table.checkpointId),
}));

export type LanggraphThread = typeof langgraphThreads.$inferSelect;
export type InsertLanggraphThread = typeof langgraphThreads.$inferInsert;
export type LanggraphCheckpoint = typeof langgraphCheckpoints.$inferSelect;
export type InsertLanggraphCheckpoint = typeof langgraphCheckpoints.$inferInsert;

export const insertLanggraphThreadSchema = createInsertSchema(langgraphThreads).omit(["id", "createdAt", "updatedAt"]);

export const insertLanggraphCheckpointSchema = createInsertSchema(langgraphCheckpoints).omit(["id", "createdAt"]);

export type ContentWriterSession = typeof contentWriterSessions.$inferSelect;
export type InsertContentWriterSession = typeof contentWriterSessions.$inferInsert;
export type ContentWriterConcept = typeof contentWriterConcepts.$inferSelect;
export type InsertContentWriterConcept = typeof contentWriterConcepts.$inferInsert;
export type ContentWriterSubtopic = typeof contentWriterSubtopics.$inferSelect;
export type InsertContentWriterSubtopic = typeof contentWriterSubtopics.$inferInsert;
export type ContentWriterDraft = typeof contentWriterDrafts.$inferSelect;
export type InsertContentWriterDraft = typeof contentWriterDrafts.$inferInsert;

export const insertContentWriterSessionSchema = createInsertSchema(contentWriterSessions).omit(["id", "createdAt", "updatedAt"]);

export const insertContentWriterConceptSchema = createInsertSchema(contentWriterConcepts).omit(["id", "createdAt"]);

export const insertContentWriterSubtopicSchema = createInsertSchema(contentWriterSubtopics).omit(["id", "createdAt"]);

export const insertContentWriterDraftSchema = createInsertSchema(contentWriterDrafts).omit(["id", "createdAt", "updatedAt"]);

// Error Log Status - Centralized status strings
export const ERROR_LOG_STATUS = ['to_do', 'investigated', 'fixed'] as const;
export type ErrorLogStatus = typeof ERROR_LOG_STATUS[number];

// Error logs table for tracking tool usage errors
export const errorLogs = pgTable("error_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  userEmail: varchar("user_email"),
  toolName: varchar("tool_name").notNull(),
  errorType: varchar("error_type").notNull(), // 'rate_limit', 'api_error', 'validation_error', etc.
  errorMessage: text("error_message").notNull(),
  errorStack: text("error_stack"),
  requestData: jsonb("request_data"), // The input data that caused the error
  httpStatus: integer("http_status"),
  endpoint: varchar("endpoint").notNull(),
  userAgent: varchar("user_agent"),
  ipAddress: varchar("ip_address"),
  responseHeaders: jsonb("response_headers"), // HTTP response headers from external API calls
  status: varchar("status").notNull().default("to_do"), // 'to_do', 'investigated', 'fixed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = typeof errorLogs.$inferInsert;

export const insertErrorLogSchema = createInsertSchema(errorLogs).omit(["id", "createdAt"]);

// Notifications table for in-app notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar("type").notNull(), // 'article_complete', 'system_message', etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedResourceType: varchar("related_resource_type"), // 'content_writer_draft', 'generated_content', etc.
  relatedResourceId: varchar("related_resource_id"), // ID of the related resource
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export const insertNotificationSchema = createInsertSchema(notifications).omit(["id", "createdAt"]);

// User notification preferences for email notifications
export const userNotificationPreferences = pgTable("user_notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  emailOnArticleComplete: boolean("email_on_article_complete").notNull().default(true),
  emailOnSystemMessages: boolean("email_on_system_messages").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserNotificationPreference = typeof userNotificationPreferences.$inferSelect;
export type InsertUserNotificationPreference = typeof userNotificationPreferences.$inferInsert;

export const insertUserNotificationPreferenceSchema = createInsertSchema(userNotificationPreferences).omit(['id', 'createdAt', 'updatedAt']);

// Ad Specs - Platform ad format specifications
export const adSpecs = pgTable("ad_specs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platform: varchar("platform", { length: 50 }).notNull(), // 'Facebook', 'Instagram', 'TikTok', 'X', 'YouTube'
  format: varchar("format", { length: 100 }).notNull(), // 'Feed Image Ad', 'Stories Ad', etc.
  specJson: jsonb("spec_json").notNull(), // Full spec including fields, media, limits
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  platformFormatIdx: index("ad_specs_platform_format_idx").on(table.platform, table.format),
  platformFormatVersionUnique: unique("platform_format_version_unique").on(table.platform, table.format, table.version),
}));

export type AdSpec = typeof adSpecs.$inferSelect;
export type InsertAdSpec = typeof adSpecs.$inferInsert;

export const insertAdSpecSchema = createInsertSchema(adSpecs).omit(['id', 'createdAt', 'updatedAt']);

// Social Content Sessions - Multi-stage social content generation
export const socialContentSessions = pgTable("social_content_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  guidelineProfileId: varchar("guideline_profile_id").references(() => guidelineProfiles.id), // Optional brand
  subject: text("subject").notNull(), // Main topic/description
  objective: text("objective"), // User's goal
  selectedPlatforms: jsonb("selected_platforms").$type<string[]>().notNull(), // ['Facebook', 'Instagram', ...]
  selectedFormats: jsonb("selected_formats").$type<Record<string, string[]>>().notNull(), // { 'Facebook': ['Feed Image Ad', ...], ... }
  scrapedUrlData: jsonb("scraped_url_data").$type<Array<{url: string, summary: string, keyPoints: string[]}>>(), // Session URL scraping results
  status: varchar("status").notNull().default("wireframes"), // 'wireframes', 'awaitApproval', 'approved', 'generating', 'completed', 'failed'
  useBrandGuidelines: boolean("use_brand_guidelines").default(false),
  selectedTargetAudiences: jsonb("selected_target_audiences").$type<"all" | "none" | number[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SocialContentSession = typeof socialContentSessions.$inferSelect;
export type InsertSocialContentSession = typeof socialContentSessions.$inferInsert;

export const insertSocialContentSessionSchema = createInsertSchema(socialContentSessions).omit(['id', 'createdAt', 'updatedAt']);

// Social Content Wireframes - Generated concepts per platform/format
export const socialContentWireframes = pgTable("social_content_wireframes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => socialContentSessions.id, { onDelete: 'cascade' }),
  platform: varchar("platform").notNull(),
  format: varchar("format").notNull(),
  adSpecId: varchar("ad_spec_id").references(() => adSpecs.id), // Link to spec used
  optionLabel: varchar("option_label").notNull(), // 'A', 'B', 'C'
  textFields: jsonb("text_fields").notNull(), // { 'Primary Text': { text: '...', charCount: 120, limit: 125 }, ... }
  ctaButton: varchar("cta_button"), // Selected CTA from enum
  mediaSpecs: jsonb("media_specs").notNull(), // Technical specs for media (aspect ratio, dimensions, etc.)
  mediaConcept: text("media_concept"), // Description of visual concept
  altText: text("alt_text"), // Accessibility text
  rationale: text("rationale"), // Why this concept works
  complianceChecks: jsonb("compliance_checks").$type<Array<{rule: string, passed: boolean, note?: string}>>(),
  brandAlignmentScore: integer("brand_alignment_score"), // 0-100
  isApproved: boolean("is_approved").default(false),
  userFeedback: text("user_feedback"), // If rejected, why?
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  sessionPlatformFormatIdx: index("wireframes_session_platform_format_idx").on(table.sessionId, table.platform, table.format),
}));

export type SocialContentWireframe = typeof socialContentWireframes.$inferSelect;
export type InsertSocialContentWireframe = typeof socialContentWireframes.$inferInsert;

export const insertSocialContentWireframeSchema = createInsertSchema(socialContentWireframes).omit(['id', 'createdAt']);

// AI Usage Logs - Track token usage and costs for all AI API calls
export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }),
  guidelineProfileId: varchar("guideline_profile_id").references(() => guidelineProfiles.id, { onDelete: 'set null' }),
  provider: varchar("provider", { length: 50 }).notNull(), // 'openai' or 'anthropic'
  model: varchar("model", { length: 100 }).notNull(), // e.g., 'gpt-4o-mini', 'claude-sonnet-4-20250514'
  endpoint: varchar("endpoint", { length: 255 }).notNull(), // API endpoint/feature e.g., 'seo-meta-generate', 'content-writer-concepts'
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 6 }).notNull().default('0'), // Cost in USD
  durationMs: integer("duration_ms").notNull().default(0), // Duration in milliseconds
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"), // Additional context like input/output summary
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// QC Agent Types
export const QC_AGENT_TYPES = ['proofreader', 'brand_guardian', 'fact_checker', 'regulatory'] as const;
export type QCAgentType = typeof QC_AGENT_TYPES[number];

export const QC_SEVERITY_LEVELS = ['critical', 'high', 'medium', 'low'] as const;
export type QCSeverity = typeof QC_SEVERITY_LEVELS[number];

// QC Issue and Change Types
export interface QCIssue {
  id: string;
  type: string;
  severity: QCSeverity;
  message: string;
  location?: { start: number; end: number; line?: number };
  affectedText?: string;
  suggestedFix?: string;
}

export interface QCChange {
  id: string;
  agentId: string;
  agentType: QCAgentType;
  type: string;
  severity: QCSeverity;
  original: string;
  suggested: string;
  reason: string;
  confidence: number;
  location?: { start: number; end: number };
  appliedAt?: string;
  rejectedAt?: string;
  conflictsWith?: string[];
}

export interface QCConflict {
  id: string;
  type: string;
  description: string;
  severity: QCSeverity;
  conflictingChanges: QCChange[];
  recommendation?: {
    preferredChangeId: string;
    reason: string;
  };
}

// QC Reports - Stores quality control analysis results
export const qcReports = pgTable("qc_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contentId: varchar("content_id"), // Link to generated content
  threadId: varchar("thread_id"), // Link to langgraph thread
  agentType: varchar("agent_type", { length: 50 }).notNull(), // 'proofreader', 'brand_guardian', 'fact_checker', 'regulatory'
  
  score: integer("score").notNull(), // 0-100
  issues: jsonb("issues").$type<QCIssue[]>(),
  suggestions: jsonb("suggestions").$type<QCChange[]>(),
  appliedChanges: jsonb("applied_changes").$type<QCChange[]>(),
  
  executionOrder: integer("execution_order"), // Order in which agent ran
  executionTimeMs: integer("execution_time_ms"),
  
  metadata: jsonb("metadata"), // Agent-specific metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("qc_reports_user_id_idx").on(table.userId),
  threadIdIdx: index("qc_reports_thread_id_idx").on(table.threadId),
  contentIdIdx: index("qc_reports_content_id_idx").on(table.contentId),
}));

// QC User Decisions - Stores user preferences for future conflict resolution
export const qcUserDecisions = pgTable("qc_user_decisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  guidelineProfileId: varchar("guideline_profile_id").references(() => guidelineProfiles.id, { onDelete: "cascade" }),
  
  conflictType: varchar("conflict_type", { length: 255 }).notNull(), // 'proofreader_vs_brand', 'regulatory_vs_fact', etc.
  conflictDescription: text("conflict_description").notNull(),
  
  // The conflicting suggestions
  option1: jsonb("option1").$type<QCChange>().notNull(),
  option2: jsonb("option2").$type<QCChange>().notNull(),
  
  selectedOption: integer("selected_option").notNull(), // 1 or 2
  applyToFuture: boolean("apply_to_future").notNull().default(false),
  
  // Pattern matching for future conflicts
  pattern: jsonb("pattern"), // { issueTypes: [], severities: [], agentPriority: {} }
  
  timesApplied: integer("times_applied").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastAppliedAt: timestamp("last_applied_at"),
}, (table) => ({
  userIdIdx: index("qc_user_decisions_user_id_idx").on(table.userId),
  guidelineProfileIdIdx: index("qc_user_decisions_guideline_profile_id_idx").on(table.guidelineProfileId),
}));

// QC Configurations - User/brand-specific QC preferences
export const qcConfigurations = pgTable("qc_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  guidelineProfileId: varchar("guideline_profile_id").references(() => guidelineProfiles.id, { onDelete: "cascade" }),
  toolType: varchar("tool_type", { length: 50 }), // 'google-ads', 'seo-meta', 'content-writer', null = global
  
  enabled: boolean("enabled").default(true),
  enabledAgents: jsonb("enabled_agents").$type<QCAgentType[]>().default(sql`'["proofreader", "brand_guardian", "fact_checker", "regulatory"]'::jsonb`),
  
  agentSettings: jsonb("agent_settings").$type<{
    proofreader?: { strictness: 'low' | 'medium' | 'high' };
    brand_guardian?: { enforceStyle: boolean };
    fact_checker?: { requireCitations: boolean };
    regulatory?: { selectedRulesetIds?: string[] };
  }>(),
  
  autoApplyThreshold: integer("auto_apply_threshold").default(90), // Auto-apply changes with confidence >= this
  conflictResolutionStrategy: varchar("conflict_resolution_strategy", { length: 50 }).default("human_review"), // 'human_review', 'learned_preferences', 'priority_based'
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userToolUnique: unique("user_tool_qc_config_unique").on(table.userId, table.guidelineProfileId, table.toolType),
  userIdIdx: index("qc_configurations_user_id_idx").on(table.userId),
}));

export type AiUsageLog = typeof aiUsageLogs.$inferSelect;
export type InsertAiUsageLog = typeof aiUsageLogs.$inferInsert;

export const insertAiUsageLogSchema = createInsertSchema(aiUsageLogs).omit(['id', 'createdAt']);

// QC Types
export type QCReport = typeof qcReports.$inferSelect;
export type InsertQCReport = typeof qcReports.$inferInsert;

export const insertQCReportSchema = createInsertSchema(qcReports).omit(['id', 'createdAt']);

export type QCUserDecision = typeof qcUserDecisions.$inferSelect;
export type InsertQCUserDecision = typeof qcUserDecisions.$inferInsert;

export const insertQCUserDecisionSchema = createInsertSchema(qcUserDecisions).omit({
  id: true,
  createdAt: true,
  lastAppliedAt: true,
});

export type QCConfiguration = typeof qcConfigurations.$inferSelect;
export type InsertQCConfiguration = typeof qcConfigurations.$inferInsert;

export const insertQCConfigurationSchema = createInsertSchema(qcConfigurations).omit(['id', 'createdAt', 'updatedAt']);

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

export type GuidelineProfile = Omit<typeof guidelineProfiles.$inferSelect, 'content'> & {
  content: GuidelineContent;
};
export type InsertGuidelineProfile = z.infer<typeof insertGuidelineProfileSchema>;
export type UpdateGuidelineProfile = z.infer<typeof updateGuidelineProfileSchema>;

export type CrawlJob = typeof crawlJobs.$inferSelect;
export type InsertCrawlJob = z.infer<typeof insertCrawlJobSchema>;
export type UpdateCrawlJob = z.infer<typeof updateCrawlJobSchema>;

export type BrandContextContent = typeof brandContextContent.$inferSelect;
export type InsertBrandContextContent = z.infer<typeof insertBrandContextContentSchema>;

export type Page = typeof pages.$inferSelect;
export type InsertPage = z.infer<typeof insertPageSchema>;

export type PageReview = typeof pageReviews.$inferSelect;
export type InsertPageReview = z.infer<typeof insertPageReviewSchema>;
export type UpdatePageReview = z.infer<typeof updatePageReviewSchema>;

export type ExclusionRule = typeof exclusionRules.$inferSelect;
export type InsertExclusionRule = z.infer<typeof insertExclusionRuleSchema>;

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

export const guidelineProfilesRelations = relations(guidelineProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [guidelineProfiles.userId],
    references: [users.id],
  }),
  contextContent: many(brandContextContent),
}));

export const brandContextContentRelations = relations(brandContextContent, ({ one }) => ({
  guidelineProfile: one(guidelineProfiles, {
    fields: [brandContextContent.guidelineProfileId],
    references: [guidelineProfiles.id],
  }),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
  crawlJob: one(crawlJobs, {
    fields: [pages.crawlId],
    references: [crawlJobs.id],
  }),
  user: one(users, {
    fields: [pages.userId],
    references: [users.id],
  }),
  review: one(pageReviews, {
    fields: [pages.id],
    references: [pageReviews.pageId],
  }),
}));

export const pageReviewsRelations = relations(pageReviews, ({ one }) => ({
  page: one(pages, {
    fields: [pageReviews.pageId],
    references: [pages.id],
  }),
  user: one(users, {
    fields: [pageReviews.userId],
    references: [users.id],
  }),
}));

export const exclusionRulesRelations = relations(exclusionRules, ({ one }) => ({
  user: one(users, {
    fields: [exclusionRules.userId],
    references: [users.id],
  }),
  guidelineProfile: one(guidelineProfiles, {
    fields: [exclusionRules.guidelineProfileId],
    references: [guidelineProfiles.id],
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

// Error Reports table - for admin error reporting
export const errorReports = pgTable("error_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportedBy: varchar("reported_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  errorTitle: text("error_title").notNull(),
  errorMessage: text("error_message").notNull(),
  errorContext: jsonb("error_context"), // Additional context like URL, user agent, etc.
  status: varchar("status").notNull().default('pending'), // pending, acknowledged, resolved
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ErrorReport = typeof errorReports.$inferSelect;
export type InsertErrorReport = typeof errorReports.$inferInsert;

export const insertErrorReportSchema = createInsertSchema(errorReports).pick({
  errorTitle: true,
  errorMessage: true,
  errorContext: true,
});

export const errorReportsRelations = relations(errorReports, ({ one }) => ({
  reportedByUser: one(users, {
    fields: [errorReports.reportedBy],
    references: [users.id],
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


