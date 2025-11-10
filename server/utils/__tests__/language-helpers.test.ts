/**
 * Tests for language-helpers.ts
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  getLanguageInstruction,
  getWebArticleStyleInstructions,
  getAntiFabricationInstructions
} from '../language-helpers';

describe('getLanguageInstruction', () => {
  test('should return instruction for English', () => {
    const result = getLanguageInstruction('en');
    assert.ok(result.includes('English'));
    assert.ok(result.length > 0);
  });

  test('should return instruction for Spanish', () => {
    const result = getLanguageInstruction('es');
    assert.ok(result.includes('Spanish'));
    assert.ok(result.length > 0);
  });

  test('should return instruction for French', () => {
    const result = getLanguageInstruction('fr');
    assert.ok(result.includes('French'));
    assert.ok(result.length > 0);
  });

  test('should handle unknown language codes', () => {
    const result = getLanguageInstruction('xx');
    assert.ok(typeof result === 'string');
    assert.ok(result.length > 0);
  });

  test('should handle empty string', () => {
    const result = getLanguageInstruction('');
    assert.ok(typeof result === 'string');
  });
});

describe('getWebArticleStyleInstructions', () => {
  test('should return web article style instructions', () => {
    const result = getWebArticleStyleInstructions();
    assert.ok(typeof result === 'string');
    assert.ok(result.length > 0);
    assert.ok(result.includes('web') || result.includes('article') || result.includes('style'));
  });

  test('should return consistent instructions', () => {
    const result1 = getWebArticleStyleInstructions();
    const result2 = getWebArticleStyleInstructions();
    assert.strictEqual(result1, result2);
  });
});

describe('getAntiFabricationInstructions', () => {
  test('should return anti-fabrication instructions', () => {
    const result = getAntiFabricationInstructions();
    assert.ok(typeof result === 'string');
    assert.ok(result.length > 0);
  });

  test('should include instructions about accuracy', () => {
    const result = getAntiFabricationInstructions();
    // Should mention something about accuracy, facts, or not making things up
    assert.ok(
      result.toLowerCase().includes('fact') ||
      result.toLowerCase().includes('accurate') ||
      result.toLowerCase().includes('truth') ||
      result.toLowerCase().includes('verify') ||
      result.toLowerCase().includes('source')
    );
  });

  test('should return consistent instructions', () => {
    const result1 = getAntiFabricationInstructions();
    const result2 = getAntiFabricationInstructions();
    assert.strictEqual(result1, result2);
  });
});

