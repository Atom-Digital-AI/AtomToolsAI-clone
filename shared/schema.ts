import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, boolean, primaryKey, integer, jsonb, unique, vector, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
});

export const regulatoryGuidelineContentSchema = z.record(z.any());

export const guidelineContentSchema = z.union([
  brandGuidelineContentSchema,
  regulatoryGuidelineContentSchema,
  z.string(), // Backward compatibility for simple text
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
}).extend({
  content: guidelineContentSchema,
});

export const updateGuidelineProfileSchema = createInsertSchema(guidelineProfiles).pick({
  name: true,
  content: true,
}).extend({
  content: guidelineContentSchema,
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
  toolType: varchar("tool_type").notNull(), // 'seo-meta', 'google-ads', 'content-generator'
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
  toolType: varchar("tool_type").notNull(), // 'seo-meta', 'google-ads', 'content-generator'
  rating: varchar("rating").notNull(), // 'thumbs_up' or 'thumbs_down'
  feedbackText: text("feedback_text"), // Optional: only for thumbs down
  inputData: jsonb("input_data").notNull(), // The input that generated the content
  outputData: jsonb("output_data").notNull(), // The generated content being rated
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ContentFeedback = typeof contentFeedback.$inferSelect;
export type InsertContentFeedback = typeof contentFeedback.$inferInsert;

export const insertContentFeedbackSchema = createInsertSchema(contentFeedback).omit({
  id: true,
  createdAt: true,
});

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

export type ContentWriterSession = typeof contentWriterSessions.$inferSelect;
export type InsertContentWriterSession = typeof contentWriterSessions.$inferInsert;
export type ContentWriterConcept = typeof contentWriterConcepts.$inferSelect;
export type InsertContentWriterConcept = typeof contentWriterConcepts.$inferInsert;
export type ContentWriterSubtopic = typeof contentWriterSubtopics.$inferSelect;
export type InsertContentWriterSubtopic = typeof contentWriterSubtopics.$inferInsert;
export type ContentWriterDraft = typeof contentWriterDrafts.$inferSelect;
export type InsertContentWriterDraft = typeof contentWriterDrafts.$inferInsert;

export const insertContentWriterSessionSchema = createInsertSchema(contentWriterSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContentWriterConceptSchema = createInsertSchema(contentWriterConcepts).omit({
  id: true,
  createdAt: true,
});

export const insertContentWriterSubtopicSchema = createInsertSchema(contentWriterSubtopics).omit({
  id: true,
  createdAt: true,
});

export const insertContentWriterDraftSchema = createInsertSchema(contentWriterDrafts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = typeof errorLogs.$inferInsert;

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

export type BrandContextContent = typeof brandContextContent.$inferSelect;
export type InsertBrandContextContent = z.infer<typeof insertBrandContextContentSchema>;

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


