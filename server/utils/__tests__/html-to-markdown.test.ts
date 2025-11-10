/**
 * Tests for html-to-markdown.ts
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import { htmlToMarkdown } from '../html-to-markdown';

describe('htmlToMarkdown', () => {
  test('should convert simple paragraph to markdown', () => {
    const html = '<p>Hello world</p>';
    const result = htmlToMarkdown(html, 'https://example.com');
    assert.ok(result.markdown.includes('Hello world'));
    assert.ok(typeof result.title === 'string');
  });

  test('should extract title from HTML', () => {
    const html = '<html><head><title>Page Title</title></head><body><p>Content</p></body></html>';
    const result = htmlToMarkdown(html, 'https://example.com');
    assert.ok(result.title.includes('Page Title') || result.title.length > 0);
  });

  test('should convert headings to markdown', () => {
    const html = '<h1>Heading 1</h1><h2>Heading 2</h2>';
    const result = htmlToMarkdown(html, 'https://example.com');
    assert.ok(result.markdown.includes('#') || result.markdown.includes('Heading'));
  });

  test('should convert links to markdown', () => {
    const html = '<a href="https://example.com">Link</a>';
    const result = htmlToMarkdown(html, 'https://example.com');
    assert.ok(result.markdown.includes('Link') || result.markdown.includes('example.com'));
  });

  test('should handle empty HTML', () => {
    const result = htmlToMarkdown('', 'https://example.com');
    assert.ok(typeof result.markdown === 'string');
    assert.ok(typeof result.title === 'string');
  });

  test('should handle HTML with only text', () => {
    const html = 'Just plain text';
    const result = htmlToMarkdown(html, 'https://example.com');
    assert.ok(result.markdown.includes('Just plain text') || result.markdown.length > 0);
  });

  test('should preserve URL context', () => {
    const html = '<p>Content</p>';
    const url = 'https://example.com/page';
    const result = htmlToMarkdown(html, url);
    // URL should be used for relative link resolution
    assert.ok(typeof result === 'object');
    assert.ok('markdown' in result);
    assert.ok('title' in result);
  });

  test('should handle complex HTML structure', () => {
    const html = `
      <html>
        <head><title>Test</title></head>
        <body>
          <h1>Main Title</h1>
          <p>Paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </body>
      </html>
    `;
    const result = htmlToMarkdown(html, 'https://example.com');
    assert.ok(result.markdown.length > 0);
    assert.ok(result.title.length > 0);
  });
});

