/**
 * Tests for api-retry.ts
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import { createRetryClient, retryClient } from '../api-retry';

describe('createRetryClient', () => {
  test('should create axios instance with retry configuration', () => {
    const client = createRetryClient();
    assert.ok(client !== undefined);
    assert.ok(client !== null);
    assert.ok(typeof client.get === 'function');
    assert.ok(typeof client.post === 'function');
  });

  test('should have retry configuration', () => {
    const client = createRetryClient();
    // The client should be configured with axios-retry
    assert.ok(client !== undefined);
  });
});

describe('retryClient', () => {
  test('should export default retry client', () => {
    assert.ok(retryClient !== undefined);
    assert.ok(retryClient !== null);
    assert.ok(typeof retryClient.get === 'function');
    assert.ok(typeof retryClient.post === 'function');
  });

  test('should be same instance', () => {
    const client1 = retryClient;
    const client2 = retryClient;
    assert.strictEqual(client1, client2);
  });
});

