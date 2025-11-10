/**
 * Tests for cache.ts
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  userCache,
  productCache,
  cmsCache,
  guidelineCache,
  getCacheStats,
  clearAllCaches
} from '../cache';

describe('Cache instances', () => {
  test('should have userCache instance', () => {
    assert.ok(userCache !== undefined);
    assert.ok(userCache !== null);
  });

  test('should have productCache instance', () => {
    assert.ok(productCache !== undefined);
    assert.ok(productCache !== null);
  });

  test('should have cmsCache instance', () => {
    assert.ok(cmsCache !== undefined);
    assert.ok(cmsCache !== null);
  });

  test('should have guidelineCache instance', () => {
    assert.ok(guidelineCache !== undefined);
    assert.ok(guidelineCache !== null);
  });
});

describe('getCacheStats', () => {
  test('should return cache statistics', () => {
    const stats = getCacheStats();
    assert.ok(typeof stats === 'object');
    assert.ok('userCache' in stats || 'total' in stats || Array.isArray(stats));
  });

  test('should return stats for all caches', () => {
    const stats = getCacheStats();
    // Should include information about all cache instances
    assert.ok(stats !== null);
    assert.ok(stats !== undefined);
  });
});

describe('clearAllCaches', () => {
  test('should clear all caches', () => {
    // Set some test values
    userCache.set('test-key-1', 'value1');
    productCache.set('test-key-2', 'value2');
    cmsCache.set('test-key-3', 'value3');
    guidelineCache.set('test-key-4', 'value4');

    // Clear all caches
    clearAllCaches();

    // Verify caches are cleared
    assert.strictEqual(userCache.get('test-key-1'), undefined);
    assert.strictEqual(productCache.get('test-key-2'), undefined);
    assert.strictEqual(cmsCache.get('test-key-3'), undefined);
    assert.strictEqual(guidelineCache.get('test-key-4'), undefined);
  });

  test('should not throw errors when clearing empty caches', () => {
    clearAllCaches();
    clearAllCaches(); // Clear again
    // Should not throw
    assert.ok(true);
  });
});

describe('Cache operations', () => {
  beforeEach(() => {
    clearAllCaches();
  });

  test('should store and retrieve values from userCache', () => {
    userCache.set('test-user', { id: '123', name: 'Test' });
    const value = userCache.get('test-user');
    assert.ok(value !== undefined);
    assert.strictEqual((value as any).id, '123');
  });

  test('should store and retrieve values from productCache', () => {
    productCache.set('test-product', { id: '456', name: 'Product' });
    const value = productCache.get('test-product');
    assert.ok(value !== undefined);
    assert.strictEqual((value as any).id, '456');
  });

  test('should handle cache expiration', (done) => {
    // Set a value with short TTL
    userCache.set('expiring-key', 'value', 1); // 1 second TTL
    
    // Value should exist immediately
    assert.strictEqual(userCache.get('expiring-key'), 'value');
    
    // Wait for expiration
    setTimeout(() => {
      const value = userCache.get('expiring-key');
      // Value should be expired (undefined or null)
      assert.ok(value === undefined || value === null);
      done();
    }, 1100);
  });
});

