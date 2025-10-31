import { describe, test } from 'node:test';
import assert from 'node:assert';
import * as cheerio from 'cheerio';
import { isSameSite, generateContentHash } from '../url-normalizer';

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

/**
 * Helper function to extract meta description from HTML
 * This mirrors the logic in fetchPage function
 */
function extractMetaDescription(html: string): string | undefined {
  const $ = cheerio.load(html);
  
  let metaDescription: string | undefined;
  const metaDesc = $('meta').filter((_, el) => {
    const name = $(el).attr('name');
    return name?.toLowerCase() === 'description';
  }).first().attr('content')?.trim();

  if (metaDesc) {
    metaDescription = metaDesc;
  } else {
    // Fallback to og:description
    const ogDesc = $('meta[property="og:description"]').attr('content')?.trim();
    if (ogDesc) {
      metaDescription = ogDesc;
    }
  }
  
  return metaDescription;
}

describe('web-crawler meta description extraction', () => {
  test('extracts meta description correctly', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <meta name="description" content="This is a test page description" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractMetaDescription(html);
    assert.strictEqual(result, 'This is a test page description');
  });

  test('uses og:description as fallback when meta description is not present', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <meta property="og:description" content="This is an Open Graph description" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractMetaDescription(html);
    assert.strictEqual(result, 'This is an Open Graph description');
  });

  test('prefers meta description over og:description when both exist', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <meta name="description" content="Standard meta description" />
          <meta property="og:description" content="Open Graph description" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractMetaDescription(html);
    assert.strictEqual(result, 'Standard meta description');
  });

  test('returns undefined when no description is present', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractMetaDescription(html);
    assert.strictEqual(result, undefined);
  });

  test('trims leading and trailing whitespace from meta description', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <meta name="description" content="  This has whitespace  " />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractMetaDescription(html);
    assert.strictEqual(result, 'This has whitespace');
  });

  test('handles case-insensitive name attribute (NAME="Description")', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <meta NAME="Description" content="Case insensitive test" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractMetaDescription(html);
    assert.strictEqual(result, 'Case insensitive test');
  });

  test('handles case-insensitive name attribute (name="DESCRIPTION")', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <meta name="DESCRIPTION" content="Uppercase description" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractMetaDescription(html);
    assert.strictEqual(result, 'Uppercase description');
  });

  test('returns undefined for empty content attribute', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <meta name="description" content="" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractMetaDescription(html);
    assert.strictEqual(result, undefined);
  });

  test('returns undefined for whitespace-only content attribute', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <meta name="description" content="   " />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractMetaDescription(html);
    assert.strictEqual(result, undefined);
  });

  test('uses first meta description when multiple exist', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <meta name="description" content="First description" />
          <meta name="description" content="Second description" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractMetaDescription(html);
    assert.strictEqual(result, 'First description');
  });

  test('handles meta description without content attribute', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <meta name="description" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractMetaDescription(html);
    assert.strictEqual(result, undefined);
  });

  test('trims whitespace from og:description fallback', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <meta property="og:description" content="  OG description with spaces  " />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractMetaDescription(html);
    assert.strictEqual(result, 'OG description with spaces');
  });

  test('returns undefined for empty og:description content', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <meta property="og:description" content="" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractMetaDescription(html);
    assert.strictEqual(result, undefined);
  });

  test('handles long meta description', () => {
    const longDesc = 'A'.repeat(500);
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <meta name="description" content="${longDesc}" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractMetaDescription(html);
    assert.strictEqual(result, longDesc);
  });

  test('handles meta description with special characters', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <meta name="description" content="Special &amp; characters &lt;test&gt; &quot;quotes&quot;" />
        </head>
        <body>Test content</body>
      </html>
    `;
    
    const result = extractMetaDescription(html);
    assert.strictEqual(result, 'Special & characters <test> "quotes"');
  });
});

describe('web-crawler content hash generation', () => {
  test('same HTML produces same hash', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Test</title></head>
        <body><p>Hello World</p></body>
      </html>
    `;
    
    const hash1 = generateContentHash(html);
    const hash2 = generateContentHash(html);
    
    assert.strictEqual(hash1, hash2);
  });

  test('different HTML produces different hash', () => {
    const html1 = `
      <!DOCTYPE html>
      <html>
        <head><title>Test 1</title></head>
        <body><p>Content 1</p></body>
      </html>
    `;
    
    const html2 = `
      <!DOCTYPE html>
      <html>
        <head><title>Test 2</title></head>
        <body><p>Content 2</p></body>
      </html>
    `;
    
    const hash1 = generateContentHash(html1);
    const hash2 = generateContentHash(html2);
    
    assert.notStrictEqual(hash1, hash2);
  });

  test('whitespace differences produce same hash (normalized)', () => {
    const html1 = `<html> <head> <title>Test</title> </head> <body> <p>Hello</p> </body> </html>`;
    const html2 = `<html>    <head>
    
    <title>Test</title>
    
    </head>    <body>
    <p>Hello</p>
    </body>    </html>`;
    
    const hash1 = generateContentHash(html1);
    const hash2 = generateContentHash(html2);
    
    assert.strictEqual(hash1, hash2);
  });

  test('hash is MD5 hexadecimal string (32 characters)', () => {
    const html = '<html><body>Test</body></html>';
    const hash = generateContentHash(html);
    
    // MD5 hash should be 32 hex characters
    assert.strictEqual(hash.length, 32);
    assert.match(hash, /^[a-f0-9]{32}$/);
  });

  test('empty HTML produces valid hash', () => {
    const html = '';
    const hash = generateContentHash(html);
    
    assert.strictEqual(hash.length, 32);
    assert.match(hash, /^[a-f0-9]{32}$/);
  });

  test('HTML with only whitespace produces same hash as empty', () => {
    const html1 = '';
    const html2 = '   \n\n\t  ';
    
    const hash1 = generateContentHash(html1);
    const hash2 = generateContentHash(html2);
    
    assert.strictEqual(hash1, hash2);
  });

  test('multiple consecutive spaces normalized to single space', () => {
    const html1 = '<p>Hello     World</p>';
    const html2 = '<p>Hello World</p>';
    
    const hash1 = generateContentHash(html1);
    const hash2 = generateContentHash(html2);
    
    assert.strictEqual(hash1, hash2);
  });

  test('newlines and tabs normalized to single space', () => {
    const html1 = '<p>Hello\n\t\nWorld</p>';
    const html2 = '<p>Hello World</p>';
    
    const hash1 = generateContentHash(html1);
    const hash2 = generateContentHash(html2);
    
    assert.strictEqual(hash1, hash2);
  });

  test('different content order produces different hash', () => {
    const html1 = '<div><p>First</p><p>Second</p></div>';
    const html2 = '<div><p>Second</p><p>First</p></div>';
    
    const hash1 = generateContentHash(html1);
    const hash2 = generateContentHash(html2);
    
    assert.notStrictEqual(hash1, hash2);
  });

  test('case sensitivity in content produces different hash', () => {
    const html1 = '<p>Hello World</p>';
    const html2 = '<p>hello world</p>';
    
    const hash1 = generateContentHash(html1);
    const hash2 = generateContentHash(html2);
    
    assert.notStrictEqual(hash1, hash2);
  });
});
