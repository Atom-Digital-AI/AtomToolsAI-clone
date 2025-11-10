/**
 * Tests for format-guidelines.ts
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  formatBrandGuidelines,
  formatRegulatoryGuidelines,
  formatSelectedTargetAudiences,
  getRegulatoryGuidelineFromBrand
} from '../format-guidelines';
import type { BrandGuidelineContent, GuidelineContent } from '@shared/schema';

// Mock storage for getRegulatoryGuidelineFromBrand tests
class MockStorage {
  async getGuidelineProfile(id: string, userId: string) {
    if (id === 'regulatory-123') {
      return {
        id: 'regulatory-123',
        userId,
        content: {
          tone: 'Professional',
          voice: 'Authoritative',
          style: 'Formal'
        }
      };
    }
    return null;
  }
}

describe('formatBrandGuidelines', () => {
  test('should format complete brand guidelines', () => {
    const content: BrandGuidelineContent = {
      tone: 'Friendly and approachable',
      voice: 'Conversational',
      style: 'Modern and clean',
      values: ['Innovation', 'Quality'],
      targetAudiences: [
        { id: 1, name: 'Young Professionals' },
        { id: 2, name: 'Tech Enthusiasts' }
      ]
    };
    const result = formatBrandGuidelines(content);
    assert.ok(result.includes('Friendly and approachable'));
    assert.ok(result.includes('Conversational'));
    assert.ok(result.includes('Modern and clean'));
    assert.ok(result.includes('Innovation'));
    assert.ok(result.includes('Quality'));
  });

  test('should handle minimal brand guidelines', () => {
    const content: BrandGuidelineContent = {
      tone: 'Professional'
    };
    const result = formatBrandGuidelines(content);
    assert.ok(result.includes('Professional'));
    assert.ok(result.length > 0);
  });

  test('should format target audiences', () => {
    const content: BrandGuidelineContent = {
      tone: 'Friendly',
      targetAudiences: [
        { id: 1, name: 'Audience 1' },
        { id: 2, name: 'Audience 2' }
      ]
    };
    const result = formatBrandGuidelines(content);
    assert.ok(result.includes('Audience 1'));
    assert.ok(result.includes('Audience 2'));
  });

  test('should handle empty content', () => {
    const content: BrandGuidelineContent = {};
    const result = formatBrandGuidelines(content);
    assert.ok(typeof result === 'string');
  });
});

describe('formatRegulatoryGuidelines', () => {
  test('should format regulatory guidelines', () => {
    const content: GuidelineContent = {
      tone: 'Formal and compliant',
      voice: 'Authoritative',
      style: 'Legal'
    };
    const result = formatRegulatoryGuidelines(content);
    assert.ok(result.includes('Formal and compliant'));
    assert.ok(result.includes('Authoritative'));
    assert.ok(result.includes('Legal'));
  });

  test('should handle minimal regulatory content', () => {
    const content: GuidelineContent = {
      tone: 'Compliant'
    };
    const result = formatRegulatoryGuidelines(content);
    assert.ok(result.includes('Compliant'));
  });
});

describe('formatSelectedTargetAudiences', () => {
  test('should format "all" selection', () => {
    const result = formatSelectedTargetAudiences('all', []);
    assert.ok(result.includes('all'));
  });

  test('should format "none" selection', () => {
    const result = formatSelectedTargetAudiences('none', []);
    assert.ok(result.includes('none'));
  });

  test('should format array of audience IDs', () => {
    const audiences = [
      { id: 1, name: 'Audience 1' },
      { id: 2, name: 'Audience 2' },
      { id: 3, name: 'Audience 3' }
    ];
    const result = formatSelectedTargetAudiences([1, 2], audiences);
    assert.ok(result.includes('Audience 1'));
    assert.ok(result.includes('Audience 2'));
    assert.ok(!result.includes('Audience 3'));
  });

  test('should handle empty array selection', () => {
    const result = formatSelectedTargetAudiences([], []);
    assert.ok(typeof result === 'string');
  });

  test('should handle missing audiences in array', () => {
    const audiences = [
      { id: 1, name: 'Audience 1' }
    ];
    const result = formatSelectedTargetAudiences([1, 999], audiences);
    assert.ok(result.includes('Audience 1'));
  });
});

describe('getRegulatoryGuidelineFromBrand', () => {
  test('should return temporary regulatory text if present', async () => {
    const brandContent: BrandGuidelineContent = {
      tone: 'Friendly',
      temporary_regulatory_text: 'Temporary regulatory text'
    };
    const storage = new MockStorage();
    const result = await getRegulatoryGuidelineFromBrand(
      brandContent,
      'user-123',
      storage as any
    );
    assert.strictEqual(result, 'Temporary regulatory text');
  });

  test('should fetch regulatory guideline from storage if ID present', async () => {
    const brandContent: BrandGuidelineContent = {
      tone: 'Friendly',
      regulatory_guideline_id: 'regulatory-123'
    };
    const storage = new MockStorage();
    const result = await getRegulatoryGuidelineFromBrand(
      brandContent,
      'user-123',
      storage as any
    );
    assert.ok(result.includes('Professional'));
    assert.ok(result.includes('Authoritative'));
  });

  test('should prioritize temporary text over regulatory ID', async () => {
    const brandContent: BrandGuidelineContent = {
      tone: 'Friendly',
      temporary_regulatory_text: 'Temporary text',
      regulatory_guideline_id: 'regulatory-123'
    };
    const storage = new MockStorage();
    const result = await getRegulatoryGuidelineFromBrand(
      brandContent,
      'user-123',
      storage as any
    );
    assert.strictEqual(result, 'Temporary text');
  });

  test('should return empty string if no regulatory content', async () => {
    const brandContent: BrandGuidelineContent = {
      tone: 'Friendly'
    };
    const storage = new MockStorage();
    const result = await getRegulatoryGuidelineFromBrand(
      brandContent,
      'user-123',
      storage as any
    );
    assert.strictEqual(result, '');
  });

  test('should handle storage errors gracefully', async () => {
    const brandContent: BrandGuidelineContent = {
      tone: 'Friendly',
      regulatory_guideline_id: 'invalid-id'
    };
    const storage = new MockStorage();
    const result = await getRegulatoryGuidelineFromBrand(
      brandContent,
      'user-123',
      storage as any
    );
    assert.strictEqual(result, '');
  });
});

