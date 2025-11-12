import { storage } from "../../../../../server/storage";
import { PRODUCT_IDS } from "@shared/schema";

/**
 * Social Content Access Control
 * Manages tier-based platform and format access
 */

const PLATFORMS = ['Facebook', 'Instagram', 'TikTok', 'X (Twitter)', 'YouTube'] as const;
type Platform = typeof PLATFORMS[number];

interface AccessControl {
  hasAccess: boolean;
  allowedPlatforms: Platform[];
  canUseBrandGuidelines: boolean;
  canUseVariations: boolean;
  maxFormatsPerPlatform: number;
  message?: string;
}

/**
 * Check user's access to social content generator
 */
export async function checkSocialContentAccess(userId: string): Promise<AccessControl> {
  const productId = PRODUCT_IDS.SOCIAL_CONTENT_GENERATOR;
  
  // Check basic product access
  const access = await storage.getUserProductAccess(userId, productId);
  
  if (!access.hasAccess) {
    return {
      hasAccess: false,
      allowedPlatforms: [],
      canUseBrandGuidelines: false,
      canUseVariations: false,
      maxFormatsPerPlatform: 0,
      message: "You don't have access to the Social Content Generator",
    };
  }
  
  // Get subfeatures from tier limit
  const subfeatures = (access.tierLimit?.subfeatures as any) || {};
  
  // Determine allowed platforms based on tier
  let allowedPlatforms: Platform[] = [...PLATFORMS]; // Default: all platforms
  
  if (subfeatures.platforms && Array.isArray(subfeatures.platforms)) {
    // If specific platforms are defined in tier, restrict to those
    allowedPlatforms = subfeatures.platforms.filter((p: string) =>
      PLATFORMS.includes(p as Platform)
    ) as Platform[];
  }
  
  // Get other permissions
  const canUseBrandGuidelines = subfeatures.brand_guidelines === true;
  const canUseVariations = subfeatures.variations === true;
  const maxFormatsPerPlatform = subfeatures.max_formats_per_platform || 10;
  
  return {
    hasAccess: true,
    allowedPlatforms,
    canUseBrandGuidelines,
    canUseVariations,
    maxFormatsPerPlatform,
  };
}

/**
 * Validate that requested platforms are allowed for user
 */
export async function validatePlatformAccess(
  userId: string,
  requestedPlatforms: string[]
): Promise<{ valid: boolean; deniedPlatforms: string[] }> {
  const access = await checkSocialContentAccess(userId);
  
  if (!access.hasAccess) {
    return {
      valid: false,
      deniedPlatforms: requestedPlatforms,
    };
  }
  
  const deniedPlatforms = requestedPlatforms.filter(
    p => !access.allowedPlatforms.includes(p as Platform)
  );
  
  return {
    valid: deniedPlatforms.length === 0,
    deniedPlatforms,
  };
}

/**
 * Check if user can generate variations (multiple wireframe options)
 */
export async function canGenerateVariations(userId: string): Promise<boolean> {
  const access = await checkSocialContentAccess(userId);
  return access.canUseVariations;
}

/**
 * Get maximum number of formats per platform for user
 */
export async function getMaxFormatsPerPlatform(userId: string): Promise<number> {
  const access = await checkSocialContentAccess(userId);
  return access.maxFormatsPerPlatform;
}
