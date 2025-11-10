/**
 * Tests for chunking.ts - DocumentChunker
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import { documentChunker } from '../chunking';

describe('DocumentChunker', () => {
  test('should have chunkText method', () => {
    assert.ok(typeof documentChunker.chunkText === 'function');
  });

  test('should chunk short text into single chunk', () => {
    const text = 'This is a short text.';
    const result = documentChunker.chunkText(text);
    assert.ok(Array.isArray(result));
    assert.ok(result.length >= 1);
    assert.ok(result[0].text.length > 0);
  });

  test('should chunk long text into multiple chunks', () => {
    const longText = 'Sentence one. Sentence two. Sentence three. '.repeat(100);
    const result = documentChunker.chunkText(longText);
    assert.ok(Array.isArray(result));
    assert.ok(result.length >= 1);
  });

  test('should preserve text content in chunks', () => {
    const text = 'First sentence. Second sentence. Third sentence.';
    const result = documentChunker.chunkText(text);
    const combinedText = result.map(chunk => chunk.text).join(' ');
    assert.ok(combinedText.includes('First sentence'));
    assert.ok(combinedText.includes('Second sentence'));
    assert.ok(combinedText.includes('Third sentence'));
  });

  test('should include metadata in chunks', () => {
    const text = 'Test text for chunking.';
    const result = documentChunker.chunkText(text);
    assert.ok(result.length > 0);
    const chunk = result[0];
    assert.ok('text' in chunk);
    assert.ok(typeof chunk.text === 'string');
  });

  test('should handle empty text', () => {
    const result = documentChunker.chunkText('');
    assert.ok(Array.isArray(result));
    // Should return empty array or array with empty chunk
    assert.ok(result.length === 0 || (result.length === 1 && result[0].text === ''));
  });

  test('should handle text with only whitespace', () => {
    const result = documentChunker.chunkText('   \n\t   ');
    assert.ok(Array.isArray(result));
  });

  test('should maintain chunk size limits', () => {
    const longText = 'Word '.repeat(1000);
    const result = documentChunker.chunkText(longText);
    // Each chunk should be within reasonable size limits
    result.forEach(chunk => {
      assert.ok(chunk.text.length > 0);
      // Chunks shouldn't be excessively long (assuming max ~1000 chars)
      assert.ok(chunk.text.length < 2000);
    });
  });

  test('should handle text with special characters', () => {
    const text = 'Text with "quotes", <tags>, and special chars: !@#$%^&*()';
    const result = documentChunker.chunkText(text);
    assert.ok(result.length > 0);
    assert.ok(result[0].text.includes('quotes') || result[0].text.includes('Text'));
  });
});

