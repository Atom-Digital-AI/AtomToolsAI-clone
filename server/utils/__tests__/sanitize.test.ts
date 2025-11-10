/**
 * Tests for sanitize.ts - Critical security functions
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  sanitizeHTML,
  sanitizeText,
  sanitizeForLogging,
  validateURL
} from '../sanitize';

describe('sanitizeHTML', () => {
  test('should remove script tags', () => {
    const input = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
    const result = sanitizeHTML(input);
    assert.ok(!result.includes('<script>'));
    assert.ok(!result.includes('alert'));
    assert.ok(result.includes('Hello'));
    assert.ok(result.includes('World'));
  });

  test('should remove event handlers', () => {
    const input = '<p onclick="alert(\'xss\')">Click me</p>';
    const result = sanitizeHTML(input);
    assert.ok(!result.includes('onclick'));
    assert.ok(result.includes('Click me'));
  });

  test('should allow safe HTML tags', () => {
    const input = '<p>Paragraph</p><strong>Bold</strong><em>Italic</em>';
    const result = sanitizeHTML(input);
    assert.ok(result.includes('<p>'));
    assert.ok(result.includes('<strong>'));
    assert.ok(result.includes('<em>'));
  });

  test('should allow safe attributes', () => {
    const input = '<a href="https://example.com" title="Link">Click</a>';
    const result = sanitizeHTML(input);
    assert.ok(result.includes('href'));
    assert.ok(result.includes('title'));
  });

  test('should remove dangerous attributes', () => {
    const input = '<a href="javascript:alert(1)">Link</a>';
    const result = sanitizeHTML(input);
    // DOMPurify should sanitize javascript: URLs
    assert.ok(!result.includes('javascript:'));
  });

  test('should handle empty string', () => {
    const result = sanitizeHTML('');
    assert.strictEqual(result, '');
  });

  test('should handle plain text', () => {
    const input = 'Just plain text';
    const result = sanitizeHTML(input);
    assert.ok(result.includes('Just plain text'));
  });

  test('should sanitize nested dangerous content', () => {
    const input = '<div><script>alert(1)</script><p>Safe</p></div>';
    const result = sanitizeHTML(input);
    assert.ok(!result.includes('<script>'));
    assert.ok(result.includes('Safe'));
  });
});

describe('sanitizeText', () => {
  test('should escape HTML entities', () => {
    const input = '<script>alert("xss")</script>';
    const result = sanitizeText(input);
    assert.ok(result.includes('&lt;'));
    assert.ok(result.includes('&gt;'));
    assert.ok(!result.includes('<script>'));
  });

  test('should escape quotes', () => {
    const input = 'Text with "quotes" and \'apostrophes\'';
    const result = sanitizeText(input);
    assert.ok(result.includes('&quot;'));
    assert.ok(result.includes('&#x27;'));
  });

  test('should escape ampersands', () => {
    const input = 'A & B & C';
    const result = sanitizeText(input);
    assert.ok(result.includes('&amp;'));
  });

  test('should escape slashes', () => {
    const input = 'Path/to/file';
    const result = sanitizeText(input);
    assert.ok(result.includes('&#x2F;'));
  });

  test('should handle empty string', () => {
    const result = sanitizeText('');
    assert.strictEqual(result, '');
  });

  test('should handle plain text without special characters', () => {
    const input = 'Just plain text';
    const result = sanitizeText(input);
    assert.strictEqual(result, 'Just plain text');
  });
});

describe('sanitizeForLogging', () => {
  test('should redact password fields', () => {
    const input = {
      username: 'user',
      password: 'secret123',
      email: 'user@example.com'
    };
    const result = sanitizeForLogging(input);
    assert.strictEqual(result.password, '[REDACTED]');
    assert.strictEqual(result.username, 'user');
    assert.strictEqual(result.email, 'user@example.com');
  });

  test('should redact token fields', () => {
    const input = {
      apiToken: 'abc123',
      accessToken: 'xyz789'
    };
    const result = sanitizeForLogging(input);
    assert.strictEqual(result.apiToken, '[REDACTED]');
    assert.strictEqual(result.accessToken, '[REDACTED]');
  });

  test('should redact case-insensitive sensitive fields', () => {
    const input = {
      PASSWORD: 'secret',
      Api_Key: 'key123',
      CreditCard: '1234-5678'
    };
    const result = sanitizeForLogging(input);
    assert.strictEqual(result.PASSWORD, '[REDACTED]');
    assert.strictEqual(result.Api_Key, '[REDACTED]');
    assert.strictEqual(result.CreditCard, '[REDACTED]');
  });

  test('should handle nested objects', () => {
    const input = {
      user: {
        name: 'John',
        password: 'secret',
        details: {
          email: 'john@example.com',
          token: 'abc123'
        }
      }
    };
    const result = sanitizeForLogging(input);
    assert.strictEqual(result.user.password, '[REDACTED]');
    assert.strictEqual(result.user.details.token, '[REDACTED]');
    assert.strictEqual(result.user.name, 'John');
    assert.strictEqual(result.user.details.email, 'john@example.com');
  });

  test('should handle arrays', () => {
    const input = [
      { name: 'User1', password: 'pass1' },
      { name: 'User2', password: 'pass2' }
    ];
    const result = sanitizeForLogging(input);
    assert.strictEqual(result[0].password, '[REDACTED]');
    assert.strictEqual(result[1].password, '[REDACTED]');
    assert.strictEqual(result[0].name, 'User1');
  });

  test('should handle null and undefined', () => {
    const input = {
      value: null,
      missing: undefined,
      password: 'secret'
    };
    const result = sanitizeForLogging(input);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.missing, undefined);
    assert.strictEqual(result.password, '[REDACTED]');
  });

  test('should handle non-objects', () => {
    assert.strictEqual(sanitizeForLogging('string'), 'string');
    assert.strictEqual(sanitizeForLogging(123), 123);
    assert.strictEqual(sanitizeForLogging(null), null);
  });

  test('should preserve non-sensitive fields', () => {
    const input = {
      username: 'user',
      email: 'user@example.com',
      name: 'John Doe',
      age: 30
    };
    const result = sanitizeForLogging(input);
    assert.strictEqual(result.username, 'user');
    assert.strictEqual(result.email, 'user@example.com');
    assert.strictEqual(result.name, 'John Doe');
    assert.strictEqual(result.age, 30);
  });
});

describe('validateURL', () => {
  test('should accept valid HTTPS URLs', () => {
    assert.strictEqual(validateURL('https://example.com'), true);
    assert.strictEqual(validateURL('https://example.com/path'), true);
    assert.strictEqual(validateURL('https://example.com:443/path?query=1'), true);
  });

  test('should accept valid HTTP URLs', () => {
    assert.strictEqual(validateURL('http://example.com'), true);
    assert.strictEqual(validateURL('http://example.com/path'), true);
  });

  test('should reject localhost', () => {
    assert.strictEqual(validateURL('http://localhost'), false);
    assert.strictEqual(validateURL('http://localhost:3000'), false);
    assert.strictEqual(validateURL('https://localhost/api'), false);
  });

  test('should reject 127.0.0.1', () => {
    assert.strictEqual(validateURL('http://127.0.0.1'), false);
    assert.strictEqual(validateURL('http://127.0.0.1:3000'), false);
  });

  test('should reject private IP ranges', () => {
    assert.strictEqual(validateURL('http://10.0.0.1'), false);
    assert.strictEqual(validateURL('http://172.16.0.1'), false);
    assert.strictEqual(validateURL('http://192.168.1.1'), false);
    assert.strictEqual(validateURL('http://169.254.1.1'), false);
  });

  test('should reject cloud metadata endpoints', () => {
    assert.strictEqual(validateURL('http://metadata.google.internal'), false);
    assert.strictEqual(validateURL('http://169.254.169.254'), false);
  });

  test('should reject non-HTTP protocols', () => {
    assert.strictEqual(validateURL('ftp://example.com'), false);
    assert.strictEqual(validateURL('file:///etc/passwd'), false);
    assert.strictEqual(validateURL('javascript:alert(1)'), false);
  });

  test('should reject invalid URLs', () => {
    assert.strictEqual(validateURL('not-a-url'), false);
    assert.strictEqual(validateURL(''), false);
    assert.strictEqual(validateURL('http://'), false);
  });

  test('should handle URLs with ports', () => {
    assert.strictEqual(validateURL('https://example.com:8080'), true);
    assert.strictEqual(validateURL('http://example.com:3000/path'), true);
  });

  test('should handle URLs with query strings and fragments', () => {
    assert.strictEqual(validateURL('https://example.com?q=test'), true);
    assert.strictEqual(validateURL('https://example.com#section'), true);
    assert.strictEqual(validateURL('https://example.com/path?q=test#section'), true);
  });
});

