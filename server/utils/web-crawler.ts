import axios from 'axios';
import * as cheerio from 'cheerio';

interface CrawledPage {
  url: string;
  html: string;
  css: string[];
  title: string;
}

interface CrawlResult {
  pages: CrawledPage[];
  domain: string;
}

/**
 * Crawls a website and extracts HTML and CSS from up to maxPages
 */
export async function crawlWebsite(startUrl: string, maxPages: number = 5): Promise<CrawlResult> {
  const domain = new URL(startUrl).origin;
  const visitedUrls = new Set<string>();
  const pagesToCrawl: string[] = [startUrl];
  const crawledPages: CrawledPage[] = [];

  while (crawledPages.length < maxPages && pagesToCrawl.length > 0) {
    const currentUrl = pagesToCrawl.shift()!;
    
    if (visitedUrls.has(currentUrl)) {
      continue;
    }

    try {
      visitedUrls.add(currentUrl);
      const page = await fetchPage(currentUrl, domain);
      crawledPages.push(page);

      // Extract more URLs to crawl from this page
      const newUrls = extractUrls(page.html, domain, currentUrl);
      for (const url of newUrls) {
        if (!visitedUrls.has(url) && !pagesToCrawl.includes(url)) {
          pagesToCrawl.push(url);
        }
      }
    } catch (error) {
      console.error(`Error crawling ${currentUrl}:`, error);
      // Continue with next URL
    }
  }

  return {
    pages: crawledPages,
    domain
  };
}

/**
 * Fetches a single page and extracts HTML and CSS
 */
async function fetchPage(url: string, domain: string): Promise<CrawledPage> {
  const response = await axios.get(url, {
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; BrandGuidelineBot/1.0)'
    }
  });

  const html = response.data;
  const $ = cheerio.load(html);
  
  // Extract CSS links
  const cssUrls: string[] = [];
  $('link[rel="stylesheet"]').each((_, elem) => {
    const href = $(elem).attr('href');
    if (href) {
      const absoluteUrl = new URL(href, url).href;
      cssUrls.push(absoluteUrl);
    }
  });

  // Fetch CSS content
  const cssContents = await Promise.all(
    cssUrls.slice(0, 3).map(async (cssUrl) => {
      try {
        const cssResponse = await axios.get(cssUrl, { timeout: 5000 });
        return cssResponse.data;
      } catch {
        return '';
      }
    })
  );

  // Extract inline styles
  const inlineStyles: string[] = [];
  $('style').each((_, elem) => {
    inlineStyles.push($(elem).html() || '');
  });

  const title = $('title').text() || '';

  return {
    url,
    html: $.html(),
    css: [...cssContents, ...inlineStyles].filter(Boolean),
    title
  };
}

/**
 * Extracts internal URLs from HTML
 */
function extractUrls(html: string, domain: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const urls: string[] = [];

  $('a[href]').each((_, elem) => {
    const href = $(elem).attr('href');
    if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
      try {
        const absoluteUrl = new URL(href, baseUrl).href;
        const urlObj = new URL(absoluteUrl);
        
        // Only include URLs from the same domain
        if (urlObj.origin === domain) {
          urls.push(absoluteUrl);
        }
      } catch {
        // Invalid URL, skip
      }
    }
  });

  return urls;
}
