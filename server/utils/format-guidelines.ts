import type { BrandGuidelineContent, GuidelineContent } from "@shared/schema";

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
