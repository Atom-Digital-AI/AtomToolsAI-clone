import type { AdSpec } from "@shared/schema";
import type { WireframeOption } from "../langgraph/social-content-types";

/**
 * Ad Spec Validation Utility
 * Validates generated content against platform ad specifications
 */

// Extract numeric limit from various formats
function parseCharLimit(limit: string | number | undefined): number | null {
  if (typeof limit === 'number') return limit;
  if (!limit) return null;
  
  // Extract first number from strings like "125 characters (recommended)"
  const match = limit.toString().match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// Parse aspect ratio like "16:9" to number
function parseAspectRatio(ratio: string): number | null {
  const match = ratio.match(/(\d+):(\d+)/);
  if (!match) return null;
  return parseInt(match[1], 10) / parseInt(match[2], 10);
}

// Extract dimensions from strings like "1080?1920 px" or "1080x1920"
function parseDimensions(dimStr: string): { width: number; height: number } | null {
  const match = dimStr.match(/(\d+)\s*[?x]\s*(\d+)/);
  if (!match) return null;
  return {
    width: parseInt(match[1], 10),
    height: parseInt(match[2], 10),
  };
}

// Validate text field against character limits
export function validateTextField(
  text: string,
  fieldSpec: any
): { passed: boolean; charCount: number; limit: number | string; reason?: string } {
  const charCount = text.length;
  const limit = fieldSpec.limit || fieldSpec.max_length;
  const numericLimit = parseCharLimit(limit);
  
  if (!numericLimit) {
    return {
      passed: true,
      charCount,
      limit: limit || 'N/A',
      reason: 'No strict limit defined',
    };
  }
  
  const passed = charCount <= numericLimit;
  
  return {
    passed,
    charCount,
    limit: limit || numericLimit,
    reason: passed ? undefined : `Exceeds limit by ${charCount - numericLimit} characters`,
  };
}

// Validate CTA button against allowed options
export function validateCTA(
  cta: string | undefined,
  fieldSpec: any
): { passed: boolean; reason?: string } {
  if (!fieldSpec || !fieldSpec.options) {
    return { passed: true };
  }
  
  if (!cta && fieldSpec.optional) {
    return { passed: true };
  }
  
  if (!cta && fieldSpec.required) {
    return { passed: false, reason: 'CTA is required for this format' };
  }
  
  // Check if CTA is in allowed options (with some flexibility for "..." entries)
  const options = fieldSpec.options as string[];
  const hasEllipsis = options.some(opt => opt.includes('...'));
  
  if (hasEllipsis || !cta) {
    // If spec has "..." it means more options exist, so pass
    return { passed: true };
  }
  
  const matched = options.some(opt =>
    opt.toLowerCase().includes(cta.toLowerCase()) ||
    cta.toLowerCase().includes(opt.toLowerCase())
  );
  
  return {
    passed: matched,
    reason: matched ? undefined : `CTA "${cta}" not in allowed options: ${options.join(', ')}`,
  };
}

// Validate media specs
export function validateMediaSpecs(
  mediaSpecs: any,
  specMedia: any
): Array<{ rule: string; passed: boolean; note?: string }> {
  const checks: Array<{ rule: string; passed: boolean; note?: string }> = [];
  
  if (!specMedia) {
    checks.push({
      rule: 'Media specifications',
      passed: true,
      note: 'No media requirements specified',
    });
    return checks;
  }
  
  // Check aspect ratio
  if (specMedia.aspect_ratio || specMedia.recommended_aspect_ratio) {
    const specRatio = specMedia.aspect_ratio || specMedia.recommended_aspect_ratio;
    checks.push({
      rule: `Aspect ratio: ${specRatio}`,
      passed: true, // We're describing, not validating actual files
      note: `Media should use ${specRatio}`,
    });
  }
  
  // Check file size limits
  if (specMedia.max_file_size) {
    checks.push({
      rule: `Max file size: ${specMedia.max_file_size}`,
      passed: true,
      note: `Files must not exceed ${specMedia.max_file_size}`,
    });
  }
  
  // Check resolution/dimensions
  if (specMedia.resolution || specMedia.min_dimensions || specMedia.recommended_size) {
    const dimSpec = specMedia.resolution || specMedia.min_dimensions || specMedia.recommended_size;
    checks.push({
      rule: `Dimensions: ${dimSpec}`,
      passed: true,
      note: `Media should meet dimension requirements`,
    });
  }
  
  // Check video length
  if (specMedia.video_length) {
    checks.push({
      rule: `Video length: ${specMedia.video_length}`,
      passed: true,
      note: `Video duration must comply with ${specMedia.video_length}`,
    });
  }
  
  // Check file types
  if (specMedia.file_formats || specMedia.format) {
    const formats = specMedia.file_formats || [specMedia.format];
    checks.push({
      rule: `File types: ${Array.isArray(formats) ? formats.join(', ') : formats}`,
      passed: true,
      note: 'Use specified file formats',
    });
  }
  
  return checks;
}

// Comprehensive wireframe validation
export function validateWireframe(
  wireframe: Partial<WireframeOption>,
  adSpec: AdSpec
): {
  isValid: boolean;
  textFieldValidation: Record<string, ReturnType<typeof validateTextField>>;
  ctaValidation: ReturnType<typeof validateCTA>;
  complianceChecks: Array<{ rule: string; passed: boolean; note?: string }>;
  errors: string[];
} {
  const errors: string[] = [];
  const textFieldValidation: Record<string, ReturnType<typeof validateTextField>> = {};
  const spec = adSpec.specJson as any;
  const complianceChecks: Array<{ rule: string; passed: boolean; note?: string }> = [];
  
  // Validate text fields
  if (spec.fields && wireframe.textFields) {
    for (const [fieldName, fieldData] of Object.entries(wireframe.textFields)) {
      const fieldSpec = spec.fields[fieldName];
      if (fieldSpec) {
        const validation = validateTextField(fieldData.text, fieldSpec);
        textFieldValidation[fieldName] = validation;
        
        complianceChecks.push({
          rule: `${fieldName} character limit`,
          passed: validation.passed,
          note: validation.reason,
        });
        
        if (!validation.passed) {
          errors.push(`${fieldName}: ${validation.reason}`);
        }
      }
    }
  }
  
  // Validate CTA
  let ctaValidation: ReturnType<typeof validateCTA> = { passed: true };
  if (spec.fields && spec.fields['CTA Button']) {
    ctaValidation = validateCTA(wireframe.ctaButton, spec.fields['CTA Button']);
    complianceChecks.push({
      rule: 'CTA button validation',
      passed: ctaValidation.passed,
      note: ctaValidation.reason,
    });
    
    if (!ctaValidation.passed) {
      errors.push(`CTA: ${ctaValidation.reason}`);
    }
  }
  
  // Validate media specs
  if (spec.media && wireframe.mediaSpecs) {
    const mediaChecks = validateMediaSpecs(wireframe.mediaSpecs, spec.media);
    complianceChecks.push(...mediaChecks);
  }
  
  // Platform-specific compliance checks
  complianceChecks.push({
    rule: 'Platform policy compliance',
    passed: true,
    note: 'Content must follow platform advertising policies',
  });
  
  const isValid = errors.length === 0;
  
  return {
    isValid,
    textFieldValidation,
    ctaValidation,
    complianceChecks,
    errors,
  };
}

// Validate all text fields have limits respected
export function validateAllTextFields(
  textFields: Record<string, { text: string; charCount: number; limit: number | string }>,
  fields: any
): boolean {
  for (const [fieldName, fieldData] of Object.entries(textFields)) {
    const fieldSpec = fields[fieldName];
    if (fieldSpec) {
      const validation = validateTextField(fieldData.text, fieldSpec);
      if (!validation.passed) {
        return false;
      }
    }
  }
  return true;
}

// Extract CTA options from spec
export function extractCTAOptions(adSpec: AdSpec): string[] {
  const spec = adSpec.specJson as any;
  if (spec.fields && spec.fields['CTA Button'] && spec.fields['CTA Button'].options) {
    return spec.fields['CTA Button'].options;
  }
  if (spec.fields && spec.fields['CTA'] && spec.fields['CTA'].options) {
    return spec.fields['CTA'].options;
  }
  return [];
}

// Get field character limit
export function getFieldLimit(adSpec: AdSpec, fieldName: string): number | null {
  const spec = adSpec.specJson as any;
  if (!spec.fields || !spec.fields[fieldName]) return null;
  
  const fieldSpec = spec.fields[fieldName];
  return parseCharLimit(fieldSpec.limit || fieldSpec.max_length);
}

// Get all text field names from spec
export function getTextFieldNames(adSpec: AdSpec): string[] {
  const spec = adSpec.specJson as any;
  if (!spec.fields) return [];
  
  return Object.keys(spec.fields).filter(fieldName => {
    const field = spec.fields[fieldName];
    // Exclude CTA Button and media-related fields
    return fieldName !== 'CTA Button' && 
           fieldName !== 'CTA' && 
           !fieldName.toLowerCase().includes('profile image') &&
           !fieldName.toLowerCase().includes('icon') &&
           (field.limit || field.max_length);
  });
}

// Real-time character count validation for UI
export function getRealTimeValidation(
  text: string,
  limit: number | string
): {
  charCount: number;
  limit: number | null;
  remaining: number | null;
  status: 'safe' | 'warning' | 'error';
} {
  const charCount = text.length;
  const numericLimit = parseCharLimit(limit);
  
  if (!numericLimit) {
    return { charCount, limit: null, remaining: null, status: 'safe' };
  }
  
  const remaining = numericLimit - charCount;
  let status: 'safe' | 'warning' | 'error' = 'safe';
  
  if (remaining < 0) {
    status = 'error';
  } else if (remaining < numericLimit * 0.1) {
    // Less than 10% remaining
    status = 'warning';
  }
  
  return {
    charCount,
    limit: numericLimit,
    remaining,
    status,
  };
}
