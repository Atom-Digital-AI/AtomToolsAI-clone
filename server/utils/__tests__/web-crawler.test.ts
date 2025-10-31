import { describe, test } from 'node:test';
import assert from 'node:assert';
import * as cheerio from 'cheerio';
import { isSameSite } from '../url-normalizer';

/**
 * Helper function to extract canonical URL from HTML
 * This mirrors the logic in fetchPage function
 */
function extractCanonicalUrl(html: string, pageUrl: string): string | undefined {
  const $ = cheerio.load(html);
  
  let canonicalUrl: string | undefined;
  const canonicalLink = $('link').filter((_, el) => {
    const rel = $(el).attr('rel');
    return rel?.toLowerCase() === 'canonical';
  }).first().attr('href');

  if (canonicalLink) {
    try {
      const absoluteCanonicalUrl = new URL(canonicalLink, pageUrl).href;
      // Only use canonical if it's same-site
      if (isSameSite(pageUrl, absoluteCanonicalUrl)) {
        canonicalUrl = absoluteCanonicalUrl;
      }
    } catch {
      // Invalid canonical URL, ignore
    }
  }
  
  return canonicalUrl;
}

describe('web-crawler canonical URL extraction', () => {
  test('extracts same-site canonical URL correctly', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <link rel="canonical" href="https://example.com/canonical-page" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractCanonicalUrl(html, 'https://example.com/test-page');
    assert.strictEqual(result, 'https://example.com/canonical-page');
  });

  test('ignores cross-site canonical URL', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <link rel="canonical" href="https://different-domain.com/page" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractCanonicalUrl(html, 'https://example.com/test-page');
    assert.strictEqual(result, undefined);
  });

  test('converts relative canonical URL to absolute', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <link rel="canonical" href="/relative-canonical" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractCanonicalUrl(html, 'https://example.com/test-page');
    assert.strictEqual(result, 'https://example.com/relative-canonical');
  });

  test('handles page without canonical tag', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractCanonicalUrl(html, 'https://example.com/test-page');
    assert.strictEqual(result, undefined);
  });

  test('uses first canonical tag when multiple exist', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <link rel="canonical" href="https://example.com/first-canonical" />
          <link rel="canonical" href="https://example.com/second-canonical" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractCanonicalUrl(html, 'https://example.com/test-page');
    assert.strictEqual(result, 'https://example.com/first-canonical');
  });

  test('handles invalid canonical URL gracefully', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <link rel="canonical" href="not a valid url!!!" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractCanonicalUrl(html, 'https://example.com/test-page');
    // Invalid URLs are treated as relative paths and percent-encoded
    assert.strictEqual(result, 'https://example.com/not%20a%20valid%20url!!!');
  });

  test('handles canonical URL with different protocol (cross-site)', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <link rel="canonical" href="http://example.com/page" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractCanonicalUrl(html, 'https://example.com/test-page');
    // Different protocol (https vs http) means different site
    assert.strictEqual(result, undefined);
  });

  test('handles canonical URL with subdomain (cross-site)', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <link rel="canonical" href="https://www.example.com/page" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractCanonicalUrl(html, 'https://example.com/test-page');
    // Different subdomain means different site
    assert.strictEqual(result, undefined);
  });

  test('handles canonical URL with query parameters and fragments', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <link rel="canonical" href="https://example.com/page?id=123&ref=test#section" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractCanonicalUrl(html, 'https://example.com/test-page');
    assert.strictEqual(result, 'https://example.com/page?id=123&ref=test#section');
  });

  test('handles empty canonical href attribute', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <link rel="canonical" href="" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractCanonicalUrl(html, 'https://example.com/test-page');
    // Empty href attribute returns undefined (not extracted by cheerio)
    assert.strictEqual(result, undefined);
  });

  test('handles canonical URL with port number (same-site)', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <link rel="canonical" href="https://example.com:8080/canonical" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractCanonicalUrl(html, 'https://example.com:8080/test-page');
    assert.strictEqual(result, 'https://example.com:8080/canonical');
  });

  test('handles canonical URL with different port (cross-site)', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <link rel="canonical" href="https://example.com:9090/canonical" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractCanonicalUrl(html, 'https://example.com:8080/test-page');
    // Different port means different site
    assert.strictEqual(result, undefined);
  });

  test('handles relative path canonical URL', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <link rel="canonical" href="../other-page" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractCanonicalUrl(html, 'https://example.com/blog/article');
    assert.strictEqual(result, 'https://example.com/other-page');
  });

  test('handles protocol-relative canonical URL', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <link rel="canonical" href="//example.com/canonical" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractCanonicalUrl(html, 'https://example.com/test-page');
    assert.strictEqual(result, 'https://example.com/canonical');
  });

  test('case-insensitive rel attribute matching', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <link rel="CANONICAL" href="https://example.com/canonical" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractCanonicalUrl(html, 'https://example.com/test-page');
    // Cheerio's selector is case-insensitive for rel attribute
    assert.strictEqual(result, 'https://example.com/canonical');
  });

  test('ignores canonical link without href attribute', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <link rel="canonical" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractCanonicalUrl(html, 'https://example.com/test-page');
    assert.strictEqual(result, undefined);
  });

  test('handles canonical URL with trailing slash', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <link rel="canonical" href="https://example.com/page/" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractCanonicalUrl(html, 'https://example.com/test-page');
    assert.strictEqual(result, 'https://example.com/page/');
  });

  test('handles canonical URL with hash fragment only', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <link rel="canonical" href="#section" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractCanonicalUrl(html, 'https://example.com/test-page');
    // Hash-only URL resolves to the current page with hash (same site)
    assert.strictEqual(result, 'https://example.com/test-page#section');
  });
});
