import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  normalizeUrlForDedup,
  stripTrackingParams,
  isSameSite,
  generateContentHash
} from '../url-normalizer';

describe('normalizeUrlForDedup', () => {
  test('handles query params - removes them entirely', () => {
    const input = 'example.com/page?id=1&ref=2';
    const expected = 'https://example.com/page';
    assert.strictEqual(normalizeUrlForDedup(input), expected);
  });

  test('handles fragments - removes them', () => {
    const input = 'example.com/page#section';
    const expected = 'https://example.com/page';
    assert.strictEqual(normalizeUrlForDedup(input), expected);
  });

  test('handles trailing slashes - removes them from non-root paths', () => {
    const input = 'example.com/path/';
    const expected = 'https://example.com/path';
    assert.strictEqual(normalizeUrlForDedup(input), expected);
  });

  test('preserves root slash', () => {
    const input = 'example.com/';
    const expected = 'https://example.com/';
    assert.strictEqual(normalizeUrlForDedup(input), expected);
  });

  test('collapses consecutive slashes in path', () => {
    const input = 'example.com//path///to';
    const expected = 'https://example.com/path/to';
    assert.strictEqual(normalizeUrlForDedup(input), expected);
  });

  test('lowercases hostname but preserves path case', () => {
    const input = 'Example.COM/Path';
    const expected = 'https://example.com/Path';
    assert.strictEqual(normalizeUrlForDedup(input), expected);
  });

  test('removes default port 443 for https', () => {
    const input = 'https://example.com:443/page';
    const expected = 'https://example.com/page';
    assert.strictEqual(normalizeUrlForDedup(input), expected);
  });

  test('removes default port 80 for http', () => {
    const input = 'http://example.com:80/page';
    const expected = 'http://example.com/page';
    assert.strictEqual(normalizeUrlForDedup(input), expected);
  });

  test('preserves non-default ports', () => {
    const input = 'https://example.com:8080/page';
    const expected = 'https://example.com:8080/page';
    assert.strictEqual(normalizeUrlForDedup(input), expected);
  });

  test('decodes safe percent encoding', () => {
    const input = 'example.com/path%2Dwith%2Dencoded%2Eparts';
    const expected = 'https://example.com/path-with-encoded.parts';
    assert.strictEqual(normalizeUrlForDedup(input), expected);
  });

  test('handles URL with protocol already specified', () => {
    const input = 'https://example.com/page?query=1#fragment';
    const expected = 'https://example.com/page';
    assert.strictEqual(normalizeUrlForDedup(input), expected);
  });

  test('throws error for invalid URL', () => {
    assert.throws(() => {
      normalizeUrlForDedup('not a valid url!!!');
    }, /Invalid URL/);
  });

  test('handles complex URL with all normalizations', () => {
    const input = 'Example.COM:443//path///to//page/?utm_source=test&id=5#section';
    const expected = 'https://example.com/path/to/page';
    assert.strictEqual(normalizeUrlForDedup(input), expected);
  });
});

describe('stripTrackingParams', () => {
  test('removes utm_source parameter', () => {
    const input = 'https://example.com/page?utm_source=google&id=5';
    const expected = 'https://example.com/page?id=5';
    assert.strictEqual(stripTrackingParams(input), expected);
  });

  test('removes gclid parameter', () => {
    const input = 'https://example.com/page?gclid=abc123&id=5';
    const expected = 'https://example.com/page?id=5';
    assert.strictEqual(stripTrackingParams(input), expected);
  });

  test('removes multiple tracking parameters', () => {
    const input = 'https://example.com/page?utm_campaign=test&fbclid=xyz&ref=home&id=5';
    const expected = 'https://example.com/page?id=5';
    assert.strictEqual(stripTrackingParams(input), expected);
  });

  test('removes all utm_* parameters', () => {
    const input = 'https://example.com/page?utm_source=google&utm_medium=cpc&utm_campaign=spring&utm_term=shoes&utm_content=textad&id=5';
    const expected = 'https://example.com/page?id=5';
    assert.strictEqual(stripTrackingParams(input), expected);
  });

  test('preserves non-tracking parameters intact', () => {
    const input = 'https://example.com/page?id=5&category=products&sort=asc';
    const expected = 'https://example.com/page?id=5&category=products&sort=asc';
    assert.strictEqual(stripTrackingParams(input), expected);
  });

  test('removes fbclid parameter', () => {
    const input = 'https://example.com/page?fbclid=IwAR123&page=2';
    const expected = 'https://example.com/page?page=2';
    assert.strictEqual(stripTrackingParams(input), expected);
  });

  test('handles URL with no tracking parameters', () => {
    const input = 'https://example.com/page?id=5';
    const expected = 'https://example.com/page?id=5';
    assert.strictEqual(stripTrackingParams(input), expected);
  });

  test('handles URL with only tracking parameters', () => {
    const input = 'https://example.com/page?utm_source=google&gclid=123';
    const expected = 'https://example.com/page';
    assert.strictEqual(stripTrackingParams(input), expected);
  });

  test('preserves URL structure when removing tracking params', () => {
    const input = 'https://example.com:8080/path/to/page?utm_source=test&id=5#section';
    const result = stripTrackingParams(input);
    assert.strictEqual(result, 'https://example.com:8080/path/to/page?id=5#section');
  });

  test('throws error for invalid URL', () => {
    assert.throws(() => {
      stripTrackingParams('invalid url');
    }, /Invalid URL/);
  });

  test('removes utm_id parameter', () => {
    const input = 'https://example.com/page?utm_id=12345&id=5';
    const expected = 'https://example.com/page?id=5';
    assert.strictEqual(stripTrackingParams(input), expected);
  });

  test('removes utm_referrer parameter', () => {
    const input = 'https://example.com/page?utm_referrer=google&id=5';
    const expected = 'https://example.com/page?id=5';
    assert.strictEqual(stripTrackingParams(input), expected);
  });

  test('removes mixed-case UTM_SOURCE parameter', () => {
    const input = 'https://example.com/page?UTM_SOURCE=google&id=5';
    const expected = 'https://example.com/page?id=5';
    assert.strictEqual(stripTrackingParams(input), expected);
  });

  test('removes mixed-case utm parameters (UTM_Medium)', () => {
    const input = 'https://example.com/page?UTM_Medium=email&id=5';
    const expected = 'https://example.com/page?id=5';
    assert.strictEqual(stripTrackingParams(input), expected);
  });

  test('preserves non-utm parameters while removing utm_* variants', () => {
    const input = 'https://example.com/page?utm_id=123&utm_cid=456&utm_referrer=ref&product=shoes&category=mens';
    const expected = 'https://example.com/page?product=shoes&category=mens';
    assert.strictEqual(stripTrackingParams(input), expected);
  });
});

describe('isSameSite', () => {
  test('returns true for same domain with different paths', () => {
    const url1 = 'https://example.com/page1';
    const url2 = 'https://example.com/page2';
    assert.strictEqual(isSameSite(url1, url2), true);
  });

  test('returns false for different domains', () => {
    const url1 = 'https://example.com/page';
    const url2 = 'https://other.com/page';
    assert.strictEqual(isSameSite(url1, url2), false);
  });

  test('returns false for different protocols', () => {
    const url1 = 'http://example.com/page';
    const url2 = 'https://example.com/page';
    assert.strictEqual(isSameSite(url1, url2), false);
  });

  test('returns false for different subdomains', () => {
    const url1 = 'https://www.example.com/page';
    const url2 = 'https://api.example.com/page';
    assert.strictEqual(isSameSite(url1, url2), false);
  });

  test('returns true for same site with different query parameters', () => {
    const url1 = 'https://example.com/page?id=1';
    const url2 = 'https://example.com/page?id=2';
    assert.strictEqual(isSameSite(url1, url2), true);
  });

  test('returns true for same site with different fragments', () => {
    const url1 = 'https://example.com/page#section1';
    const url2 = 'https://example.com/page#section2';
    assert.strictEqual(isSameSite(url1, url2), true);
  });

  test('returns true for same site with different ports (both specified)', () => {
    const url1 = 'https://example.com:8080/page';
    const url2 = 'https://example.com:8080/page2';
    assert.strictEqual(isSameSite(url1, url2), true);
  });

  test('returns false for same hostname but different ports', () => {
    const url1 = 'https://example.com:8080/page';
    const url2 = 'https://example.com:9090/page';
    assert.strictEqual(isSameSite(url1, url2), false);
  });

  test('throws error for invalid first URL', () => {
    assert.throws(() => {
      isSameSite('invalid url', 'https://example.com');
    }, /Invalid URL/);
  });

  test('throws error for invalid second URL', () => {
    assert.throws(() => {
      isSameSite('https://example.com', 'invalid url');
    }, /Invalid URL/);
  });
});

describe('generateContentHash', () => {
  test('generates consistent hash for same content', () => {
    const html = '<html><body>Hello World</body></html>';
    const hash1 = generateContentHash(html);
    const hash2 = generateContentHash(html);
    assert.strictEqual(hash1, hash2);
  });

  test('generates different hashes for different content', () => {
    const html1 = '<html><body>Hello World</body></html>';
    const html2 = '<html><body>Goodbye World</body></html>';
    const hash1 = generateContentHash(html1);
    const hash2 = generateContentHash(html2);
    assert.notStrictEqual(hash1, hash2);
  });

  test('normalizes whitespace - extra spaces', () => {
    const html1 = '<html><body>Hello    World</body></html>';
    const html2 = '<html><body>Hello World</body></html>';
    const hash1 = generateContentHash(html1);
    const hash2 = generateContentHash(html2);
    assert.strictEqual(hash1, hash2);
  });

  test('normalizes whitespace - newlines', () => {
    const html1 = '<html><body>Hello\n\nWorld</body></html>';
    const html2 = '<html><body>Hello World</body></html>';
    const hash1 = generateContentHash(html1);
    const hash2 = generateContentHash(html2);
    assert.strictEqual(hash1, hash2);
  });

  test('normalizes whitespace - tabs and mixed whitespace', () => {
    const html1 = '<html>\t<body>\t\tHello\t\t\tWorld</body></html>';
    const html2 = '<html> <body> Hello World</body></html>';
    const hash1 = generateContentHash(html1);
    const hash2 = generateContentHash(html2);
    assert.strictEqual(hash1, hash2);
  });

  test('generates MD5 hash in hexadecimal format', () => {
    const html = '<html><body>Test</body></html>';
    const hash = generateContentHash(html);
    // MD5 hash should be 32 characters (128 bits in hex)
    assert.strictEqual(hash.length, 32);
    // Should only contain hexadecimal characters
    assert.match(hash, /^[0-9a-f]{32}$/);
  });

  test('handles empty string', () => {
    const html = '';
    const hash = generateContentHash(html);
    assert.strictEqual(hash.length, 32);
    assert.match(hash, /^[0-9a-f]{32}$/);
  });

  test('handles leading and trailing whitespace', () => {
    const html1 = '  <html><body>Hello</body></html>  ';
    const html2 = '<html><body>Hello</body></html>';
    const hash1 = generateContentHash(html1);
    const hash2 = generateContentHash(html2);
    assert.strictEqual(hash1, hash2);
  });

  test('complex HTML normalization', () => {
    const html1 = `
      <html>
        <body>
          <h1>Title</h1>
          <p>Paragraph    with    spaces</p>
        </body>
      </html>
    `;
    const html2 = '<html> <body> <h1>Title</h1> <p>Paragraph with spaces</p> </body> </html>';
    const hash1 = generateContentHash(html1);
    const hash2 = generateContentHash(html2);
    assert.strictEqual(hash1, hash2);
  });
});
