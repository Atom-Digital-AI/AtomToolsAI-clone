import * as cheerio from 'cheerio';

/**
 * Extract main content from HTML and convert to markdown
 * Removes navigation, footers, sidebars, and other non-content elements
 */
export function htmlToMarkdown(html: string, url: string): { markdown: string; title: string } {
  const $ = cheerio.load(html);

  // Remove unwanted elements
  $('script, style, nav, header, footer, aside, .sidebar, .menu, .navigation, .footer, .header, [role="navigation"], [role="banner"], [role="complementary"]').remove();

  // Extract title
  const title = $('title').text() || $('h1').first().text() || 'Untitled';

  // Try to find main content area
  let mainContent = $('main, article, [role="main"], .content, .main-content, #content, #main').first();
  
  // If no main content area found, use body
  if (mainContent.length === 0) {
    mainContent = $('body');
  }

  let markdown = '';

  // Convert headings
  mainContent.find('h1, h2, h3, h4, h5, h6').each((_, elem) => {
    const tag = $(elem).prop('tagName')?.toLowerCase();
    const level = tag ? parseInt(tag.charAt(1)) : 1;
    const text = $(elem).text().trim();
    if (text) {
      markdown += `${'#'.repeat(level)} ${text}\n\n`;
    }
  });

  // Convert paragraphs
  mainContent.find('p').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text) {
      markdown += `${text}\n\n`;
    }
  });

  // Convert lists
  mainContent.find('ul').each((_, elem) => {
    $(elem).find('li').each((_, li) => {
      const text = $(li).text().trim();
      if (text) {
        markdown += `- ${text}\n`;
      }
    });
    markdown += '\n';
  });

  mainContent.find('ol').each((_, elem) => {
    $(elem).find('li').each((i, li) => {
      const text = $(li).text().trim();
      if (text) {
        markdown += `${i + 1}. ${text}\n`;
      }
    });
    markdown += '\n';
  });

  // Convert blockquotes
  mainContent.find('blockquote').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text) {
      markdown += `> ${text}\n\n`;
    }
  });

  // Convert links (preserve but simplify)
  mainContent.find('a').each((_, elem) => {
    const text = $(elem).text().trim();
    const href = $(elem).attr('href');
    if (text && href) {
      markdown += `[${text}](${href})\n`;
    }
  });

  // Clean up: remove extra newlines
  markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();

  // Add source attribution
  markdown = `# Source: ${url}\n\n${markdown}`;

  return {
    markdown,
    title: title.trim()
  };
}
