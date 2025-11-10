import type { BrandGuidelineContent, GuidelineContent, GuidelineProfile } from "@shared/schema";
import type { IStorage } from "../../../../../server/storage";

/**
 * Fetches the regulatory guideline if the brand content has a regulatory_guideline_id or temporary_regulatory_text
 */
export async function getRegulatoryGuidelineFromBrand(
  brandContent: GuidelineContent,
  userId: string,
  storage: IStorage
): Promise<string> {
  if (typeof brandContent === 'object') {
    const brand = brandContent as BrandGuidelineContent;
    
    // Check for temporary regulatory text first (higher priority)
    if (brand.temporary_regulatory_text) {
      return brand.temporary_regulatory_text;
    }
    
    // Then check for attached regulatory guideline profile
    if (brand.regulatory_guideline_id) {
      try {
        const regulatory = await storage.getGuidelineProfile(brand.regulatory_guideline_id, userId);
        if (regulatory) {
          return formatRegulatoryGuidelines(regulatory.content);
        }
      } catch (error) {
        console.error("Failed to fetch attached regulatory guideline:", error);
      }
    }
  }
  return '';
}

/**
 * Formats structured brand guidelines into a comprehensive text format for AI prompts
 */
export function formatBrandGuidelines(content: GuidelineContent): string {
  // Handle legacy text format
  if (typeof content === 'string') {
    return content;
  }

  // Handle legacy_text format
  if (content && typeof content === 'object' && 'legacy_text' in content) {
    return (content as any).legacy_text;
  }

  // Handle structured brand guidelines
  const brandContent = content as BrandGuidelineContent;
  const sections: string[] = [];

  if (brandContent.domain_url) {
    sections.push(`**Brand Website**: ${brandContent.domain_url}`);
  }

  if (brandContent.tone_of_voice) {
    sections.push(`**Tone of Voice**: ${brandContent.tone_of_voice}`);
  }

  if (brandContent.style_preferences) {
    sections.push(`**Style Preferences**: ${brandContent.style_preferences}`);
  }

  if (brandContent.color_palette && brandContent.color_palette.length > 0) {
    sections.push(`**Brand Colors**: ${brandContent.color_palette.join(', ')}`);
  }

  if (brandContent.visual_style) {
    sections.push(`**Visual Style**: ${brandContent.visual_style}`);
  }

  if (brandContent.brand_personality && brandContent.brand_personality.length > 0) {
    sections.push(`**Brand Personality**: ${brandContent.brand_personality.join(', ')}`);
  }

  if (brandContent.language_style) {
    sections.push(`**Language Style**: ${brandContent.language_style}`);
  }

  if (brandContent.content_themes && brandContent.content_themes.length > 0) {
    sections.push(`**Content Themes**: ${brandContent.content_themes.join(', ')}`);
  }

  if (brandContent.target_audience && brandContent.target_audience.length > 0) {
    const audienceDescriptions = brandContent.target_audience.map(audience => {
      const parts: string[] = [];
      
      if (audience.gender) parts.push(`${audience.gender}`);
      if (audience.age_range) {
        const { from_age, to_age } = audience.age_range;
        const ageRange = from_age && to_age 
          ? `${from_age}-${to_age} years old`
          : from_age 
            ? `${from_age}+ years old`
            : to_age 
              ? `up to ${to_age} years old`
              : '';
        if (ageRange) parts.push(ageRange);
      }
      if (audience.profession) parts.push(audience.profession);
      if (audience.interests && audience.interests.length > 0) {
        parts.push(`interested in: ${audience.interests.join(', ')}`);
      }
      if (audience.other_keywords && audience.other_keywords.length > 0) {
        parts.push(audience.other_keywords.join(', '));
      }
      
      return parts.length > 0 ? parts.join('; ') : 'General audience';
    });

    sections.push(`**Target Audience**: ${audienceDescriptions.join(' | ')}`);
  }

  return sections.length > 0 ? sections.join('\n') : '';
}

/**
 * Formats ONLY the selected target audiences from brand guidelines for AI prompts
 * @param content - The brand guideline content
 * @param selectedTargetAudiences - "all" | "none" | number[] (indices of selected audiences)
 * @returns Formatted target audience text for AI prompts
 */
export function formatSelectedTargetAudiences(
  content: GuidelineContent,
  selectedTargetAudiences: "all" | "none" | number[] | null | undefined
): string {
  // Handle "none" or null/undefined
  if (!selectedTargetAudiences || selectedTargetAudiences === "none") {
    return "**Target Audience**: General audience (no specific targeting)";
  }

  // Handle legacy text format - can't extract specific audiences
  if (typeof content === 'string') {
    return "**Target Audience**: General audience";
  }

  const brandContent = content as BrandGuidelineContent;
  
  // Check if brand has target audiences defined
  if (!brandContent.target_audience || brandContent.target_audience.length === 0) {
    return "**Target Audience**: General audience (no brand audiences defined)";
  }

  // Handle "all" - format all audiences
  if (selectedTargetAudiences === "all") {
    const audienceDescriptions = brandContent.target_audience.map(audience => {
      const parts: string[] = [];
      
      if (audience.geography) parts.push(`Geography: ${audience.geography}`);
      if (audience.gender) parts.push(`${audience.gender}`);
      if (audience.age_range) {
        const { from_age, to_age } = audience.age_range;
        const ageRange = from_age && to_age 
          ? `${from_age}-${to_age} years old`
          : from_age 
            ? `${from_age}+ years old`
            : to_age 
              ? `up to ${to_age} years old`
              : '';
        if (ageRange) parts.push(ageRange);
      }
      if (audience.profession) parts.push(audience.profession);
      if (audience.interests && audience.interests.length > 0) {
        parts.push(`interested in: ${audience.interests.join(', ')}`);
      }
      if (audience.other_keywords && audience.other_keywords.length > 0) {
        parts.push(audience.other_keywords.join(', '));
      }
      
      return parts.length > 0 ? parts.join('; ') : 'General audience';
    });

    return `**Target Audience**: ${audienceDescriptions.join(' | ')}`;
  }

  // Handle array of indices - format only selected audiences
  if (Array.isArray(selectedTargetAudiences)) {
    const selectedAudiences = selectedTargetAudiences
      .filter(index => index >= 0 && index < brandContent.target_audience!.length)
      .map(index => brandContent.target_audience![index]);

    if (selectedAudiences.length === 0) {
      return "**Target Audience**: General audience (no valid audiences selected)";
    }

    const audienceDescriptions = selectedAudiences.map(audience => {
      const parts: string[] = [];
      
      if (audience.geography) parts.push(`Geography: ${audience.geography}`);
      if (audience.gender) parts.push(`${audience.gender}`);
      if (audience.age_range) {
        const { from_age, to_age } = audience.age_range;
        const ageRange = from_age && to_age 
          ? `${from_age}-${to_age} years old`
          : from_age 
            ? `${from_age}+ years old`
            : to_age 
              ? `up to ${to_age} years old`
              : '';
        if (ageRange) parts.push(ageRange);
      }
      if (audience.profession) parts.push(audience.profession);
      if (audience.interests && audience.interests.length > 0) {
        parts.push(`interested in: ${audience.interests.join(', ')}`);
      }
      if (audience.other_keywords && audience.other_keywords.length > 0) {
        parts.push(audience.other_keywords.join(', '));
      }
      
      return parts.length > 0 ? parts.join('; ') : 'General audience';
    });

    return `**Target Audience**: ${audienceDescriptions.join(' | ')}`;
  }

  return "**Target Audience**: General audience";
}

/**
 * Formats regulatory guidelines (currently just passes through text)
 */
export function formatRegulatoryGuidelines(content: GuidelineContent): string {
  if (typeof content === 'string') {
    return content;
  }

  if (content && typeof content === 'object' && 'legacy_text' in content) {
    return (content as any).legacy_text;
  }

  // For regulatory guidelines, we might want to handle structured data differently in the future
  // For now, just return empty string if it's not text
  return '';
}
