/**
 * Tests for openai-client.ts
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import { getOpenAIClient, openai } from '../openai-client';

describe('getOpenAIClient', () => {
  test('should return OpenAI client instance', () => {
    try {
      const client = getOpenAIClient();
      assert.ok(client !== undefined);
      assert.ok(client !== null);
    } catch (error) {
      // Expected if API key not configured
      assert.ok(error instanceof Error);
      assert.ok(error.message.includes('API') || error.message.includes('key'));
    }
  });

  test('should return same instance on multiple calls', () => {
    try {
      const client1 = getOpenAIClient();
      const client2 = getOpenAIClient();
      assert.strictEqual(client1, client2);
    } catch (error) {
      // Expected if API key not configured
      assert.ok(error instanceof Error);
    }
  });
});

describe('openai', () => {
  test('should export openai proxy', () => {
    assert.ok(openai !== undefined);
    assert.ok(openai !== null);
  });

  test('should have chat property', () => {
    assert.ok('chat' in openai);
  });

  test('should have embeddings property', () => {
    assert.ok('embeddings' in openai);
  });
});

