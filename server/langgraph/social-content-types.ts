import { z } from "zod";

// Platform and format types
export const PLATFORMS = ['Facebook', 'Instagram', 'TikTok', 'X (Twitter)', 'YouTube'] as const;
export type Platform = typeof PLATFORMS[number];

// Wireframe option for each platform/format combination
export interface WireframeOption {
  id: string;
  platform: Platform;
  format: string;
  optionLabel: 'A' | 'B' | 'C';
  textFields: Record<string, {
    text: string;
    charCount: number;
    limit: number | string;
    passed: boolean;
  }>;
  ctaButton?: string;
  mediaSpecs: {
    type: string;
    aspectRatio: string;
    dimensions?: string;
    duration?: string;
    fileTypes?: string[];
    maxSizeMB?: number | string;
    notes?: string;
  };
  mediaConcept: string;
  altText?: string;
  rationale: string;
  complianceChecks: Array<{
    rule: string;
    passed: boolean;
    note?: string;
  }>;
  brandAlignmentScore?: number;
}

// Scraped URL data
export interface ScrapedUrl {
  url: string;
  summary: string;
  keyPoints: string[];
  title?: string;
}

// Social Content Generator State
export interface SocialContentState {
  // Session identifiers
  sessionId?: string;
  userId: string;
  threadId?: string;
  
  // Input parameters
  subject: string;
  objective?: string;
  urls?: string[];
  selectedPlatforms: Platform[];
  selectedFormats: Record<Platform, string[]>; // { 'Facebook': ['Feed Image Ad', 'Stories Ad'], ... }
  
  // Brand guidelines
  guidelineProfileId?: string;
  useBrandGuidelines: boolean;
  selectedTargetAudiences?: "all" | "none" | number[];
  
  // Scraped URL data (session-scoped)
  scrapedUrlData?: ScrapedUrl[];
  
  // Wireframes (3 options per platform/format)
  wireframes: WireframeOption[];
  approvedWireframeIds: string[]; // User-selected wireframe IDs
  
  // Workflow metadata
  metadata: {
    currentStep?: 'intake' | 'scraping' | 'wireframes' | 'awaitApproval' | 'approved' | 'completed';
    totalFormats?: number; // Total number of platform?format combinations
    generatedFormats?: number; // Number of formats that have wireframes
    approvedFormats?: number; // Number of formats with approved wireframes
    startedAt?: string;
    completedAt?: string;
    [key: string]: any;
  };
  
  // Errors
  errors: Array<{
    step: string;
    message: string;
    timestamp: string;
  }>;
  
  status?: 'pending' | 'processing' | 'completed' | 'failed';
}

// Zod schemas for validation
export const scrapedUrlSchema = z.object({
  url: z.string().url(),
  summary: z.string(),
  keyPoints: z.array(z.string()),
  title: z.string().optional(),
});

export const wireframeOptionSchema = z.object({
  id: z.string(),
  platform: z.enum(PLATFORMS),
  format: z.string(),
  optionLabel: z.enum(['A', 'B', 'C']),
  textFields: z.record(z.object({
    text: z.string(),
    charCount: z.number(),
    limit: z.union([z.number(), z.string()]),
    passed: z.boolean(),
  })),
  ctaButton: z.string().optional(),
  mediaSpecs: z.object({
    type: z.string(),
    aspectRatio: z.string(),
    dimensions: z.string().optional(),
    duration: z.string().optional(),
    fileTypes: z.array(z.string()).optional(),
    maxSizeMB: z.union([z.number(), z.string()]).optional(),
    notes: z.string().optional(),
  }),
  mediaConcept: z.string(),
  altText: z.string().optional(),
  rationale: z.string(),
  complianceChecks: z.array(z.object({
    rule: z.string(),
    passed: z.boolean(),
    note: z.string().optional(),
  })),
  brandAlignmentScore: z.number().optional(),
});

export const socialContentStateSchema = z.object({
  sessionId: z.string().optional(),
  userId: z.string(),
  threadId: z.string().optional(),
  
  subject: z.string(),
  objective: z.string().optional(),
  urls: z.array(z.string().url()).optional(),
  selectedPlatforms: z.array(z.enum(PLATFORMS)),
  selectedFormats: z.record(z.enum(PLATFORMS), z.array(z.string())),
  
  guidelineProfileId: z.string().optional(),
  useBrandGuidelines: z.boolean(),
  selectedTargetAudiences: z.union([
    z.literal("all"),
    z.literal("none"),
    z.array(z.number()),
  ]).optional(),
  
  scrapedUrlData: z.array(scrapedUrlSchema).optional(),
  
  wireframes: z.array(wireframeOptionSchema),
  approvedWireframeIds: z.array(z.string()),
  
  metadata: z.object({
    currentStep: z.enum(['intake', 'scraping', 'wireframes', 'awaitApproval', 'approved', 'completed']).optional(),
    totalFormats: z.number().optional(),
    generatedFormats: z.number().optional(),
    approvedFormats: z.number().optional(),
    startedAt: z.string().optional(),
    completedAt: z.string().optional(),
  }).catchall(z.any()),
  
  errors: z.array(z.object({
    step: z.string(),
    message: z.string(),
    timestamp: z.string(),
  })),
  
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
});

export type ValidatedSocialContentState = z.infer<typeof socialContentStateSchema>;

// Helper to calculate total platform?format combinations
export function calculateTotalFormats(selectedFormats: Record<string, string[]>): number {
  return Object.values(selectedFormats).reduce((total, formats) => total + formats.length, 0);
}

// Helper to group wireframes by platform and format
export function groupWireframesByPlatformFormat(wireframes: WireframeOption[]): Record<string, Record<string, WireframeOption[]>> {
  const grouped: Record<string, Record<string, WireframeOption[]>> = {};
  
  for (const wireframe of wireframes) {
    if (!grouped[wireframe.platform]) {
      grouped[wireframe.platform] = {};
    }
    if (!grouped[wireframe.platform][wireframe.format]) {
      grouped[wireframe.platform][wireframe.format] = [];
    }
    grouped[wireframe.platform][wireframe.format].push(wireframe);
  }
  
  return grouped;
}
