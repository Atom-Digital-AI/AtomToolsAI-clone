import axios from 'axios';
import * as cheerio from 'cheerio';
import { isSameSite } from './url-normalizer';

interface CrawledPage {
  url: string;
  html: string;
  css: string[];
  title: string;
  canonicalUrl?: string;
}

interface CrawlResult {
  pages: CrawledPage[];
  domain: string;
  crawledUrls: string[];
}

interface CategorizedPages {
  home_page: string;
  about_page: string;
  service_pages: string[];
  blog_articles: string[];
}

interface CategorizedPagesWithCache extends CategorizedPages {
  crawledPages: CrawledPage[];
  totalPagesCrawled: number;
  reachedLimit: boolean;
}

/**
 * Checks if all required fields are populated
 */
function checkAllFieldsFound(categorized: CategorizedPages): boolean {
  return (
    categorized.home_page !== '' &&
    categorized.about_page !== '' &&
    categorized.service_pages.length >= 10 &&
    categorized.blog_articles.length >= 20
  );
}

/**
 * Incrementally categorize a single page
 */
function categorizeSinglePage(
  page: CrawledPage,
  categorized: CategorizedPages,
  homepageUrl: string,
  serviceKeywords: string[],
  blogKeywords: string[]
): void {
  const url = page.url.toLowerCase();
  const title = page.title.toLowerCase();
  const urlPath = new URL(page.url).pathname.toLowerCase();

  // Skip homepage
  if (page.url === homepageUrl || urlPath === '/' || urlPath === '') {
    return;
  }

  // Skip if already set as about page
  if (page.url === categorized.about_page) {
    return;
  }

  // Check if it's a blog/article page
  const isBlogIndexOrCategory = 
    urlPath.endsWith('/blog') || 
    urlPath.endsWith('/blog/') || 
    urlPath === '/blog' ||
    urlPath.includes('/category/') ||
    urlPath.includes('/categories/') ||
    urlPath.includes('/tag/') ||
    urlPath.includes('/tags/');
  
  if (!isBlogIndexOrCategory && categorized.blog_articles.length < 20 && blogKeywords.some(keyword => 
    urlPath.includes(keyword) || title.includes(keyword)
  )) {
    categorized.blog_articles.push(page.url);
    return;
  }

  // Check if it's a service/product page
  if (categorized.service_pages.length < 10 && serviceKeywords.some(keyword => 
    urlPath.includes(keyword) || title.includes(keyword)
  )) {
    categorized.service_pages.push(page.url);
    return;
  }
}

/**
 * Checks if a URL matches any exclusion pattern
 * Supports wildcards like: star-slash-page=star, star-slash-category-slash-star, etc.
 */
function matchesExclusionPattern(url: string, patterns: string[]): boolean {
  if (!patterns || patterns.length === 0) return false;
  
  for (const pattern of patterns) {
    // Convert pattern to regex: * becomes .*
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
      .replace(/\*/g, '.*'); // Convert * to .*
    
    const regex = new RegExp('^' + regexPattern + '$', 'i');
    if (regex.test(url)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if a URL matches any inclusion pattern
 * If inclusionPatterns is empty, all URLs are included by default
 */
function matchesInclusionPattern(url: string, patterns: string[]): boolean {
  if (!patterns || patterns.length === 0) return true; // Include all if no patterns set
  
  for (const pattern of patterns) {
    // Convert pattern to regex: * becomes .*
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
      .replace(/\*/g, '.*'); // Convert * to .*
    
    const regex = new RegExp('^' + regexPattern + '$', 'i');
    if (regex.test(url)) {
      return true;
    }
  }
  return false;
}

/**
 * Progress callback type for crawling updates
 */
export type CrawlProgressCallback = (progress: {
  currentPage: number;
  totalPages: number;
  currentUrl: string;
  foundSoFar: {
    aboutPage: boolean;
    servicePages: number;
    blogArticles: number;
  };
}) => void | Promise<void>;

/**
 * Crawls a website with intelligent early exit
 * Stops when all fields are found OR maxPages is reached
 */
export async function crawlWebsiteWithEarlyExit(
  startUrl: string,
  maxPages: number = 250,
  exclusionPatterns: string[] = [],
  inclusionPatterns: string[] = [],
  onProgress?: CrawlProgressCallback
): Promise<CategorizedPagesWithCache> {
  const domain = new URL(startUrl).origin;
  const visitedUrls = new Set<string>();
  const pagesToCrawl: string[] = [startUrl];
  const crawledPages: CrawledPage[] = [];

  const categorized: CategorizedPages = {
    home_page: startUrl,
    about_page: '',
    service_pages: [],
    blog_articles: []
  };

  const serviceKeywords = ['service', 'product', 'solution', 'offering', 'what-we-do', 'feature', 'plan', 'pricing'];
  const blogKeywords = ['blog', 'article', 'news', 'resource', 'insight', 'post', 'guide', 'learn'];

  let homepageHtml = '';
  let aboutPageChecked = false;

  while (crawledPages.length < maxPages && pagesToCrawl.length > 0) {
    const currentUrl = pagesToCrawl.shift()!;
    
    if (visitedUrls.has(currentUrl)) {
      continue;
    }

    // Check exclusion patterns
    if (matchesExclusionPattern(currentUrl, exclusionPatterns)) {
      console.log(`Skipping excluded URL: ${currentUrl}`);
      visitedUrls.add(currentUrl);
      continue;
    }

    // Check inclusion patterns
    if (!matchesInclusionPattern(currentUrl, inclusionPatterns)) {
      console.log(`Skipping URL not matching inclusion patterns: ${currentUrl}`);
      visitedUrls.add(currentUrl);
      continue;
    }

    try {
      visitedUrls.add(currentUrl);
      console.log(`Crawling page ${crawledPages.length + 1}/${maxPages}: ${currentUrl}`);
      const page = await fetchPage(currentUrl, domain);
      crawledPages.push(page);

      // Report progress if callback provided
      if (onProgress) {
        await onProgress({
          currentPage: crawledPages.length,
          totalPages: maxPages,
          currentUrl,
          foundSoFar: {
            aboutPage: !!categorized.about_page,
            servicePages: categorized.service_pages.length,
            blogArticles: categorized.blog_articles.length
          }
        });
      }

      // Save homepage HTML for about page discovery
      if (currentUrl === startUrl) {
        homepageHtml = page.html;
      }

      // Run about page discovery after we have the homepage
      if (!aboutPageChecked && homepageHtml) {
        categorized.about_page = await findAboutPageUrl(domain, homepageHtml, startUrl);
        aboutPageChecked = true;
      }

      // Incrementally categorize this page
      categorizeSinglePage(page, categorized, startUrl, serviceKeywords, blogKeywords);

      // Check if all fields are found
      if (checkAllFieldsFound(categorized)) {
        console.log(`✓ All fields found after ${crawledPages.length} pages. Stopping early.`);
        return {
          ...categorized,
          crawledPages,
          totalPagesCrawled: crawledPages.length,
          reachedLimit: false
        };
      }

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

  console.log(`Crawled ${crawledPages.length} pages from ${domain}`);
  console.log(`Fields status: about=${!!categorized.about_page}, services=${categorized.service_pages.length}/10, blogs=${categorized.blog_articles.length}/20`);
  
  return {
    ...categorized,
    crawledPages,
    totalPagesCrawled: crawledPages.length,
    reachedLimit: crawledPages.length >= maxPages
  };
}

/**
 * OLD: Crawls a website and extracts HTML and CSS from up to maxPages
 * @deprecated Use crawlWebsiteWithEarlyExit instead
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
      console.log(`Crawling page ${crawledPages.length + 1}/${maxPages}: ${currentUrl}`);
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

  console.log(`Successfully crawled ${crawledPages.length} pages from ${domain}`);
  
  return {
    pages: crawledPages,
    domain,
    crawledUrls: crawledPages.map(page => page.url)
  };
}

/**
 * Fetches a single page and extracts HTML and CSS
 */
async function fetchPage(url: string, domain: string): Promise<CrawledPage> {
  const https = await import('https');
  const agent = new https.default.Agent({
    rejectUnauthorized: false, // Allow self-signed or invalid SSL certificates
  });
  
  const response = await axios.get(url, {
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; BrandGuidelineBot/1.0)'
    },
    httpsAgent: agent
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
        const cssResponse = await axios.get(cssUrl, { 
          timeout: 5000,
          httpsAgent: agent
        });
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

  // Extract canonical URL if present (case-insensitive rel attribute)
  let canonicalUrl: string | undefined;
  const canonicalLink = $('link').filter((_, el) => {
    const rel = $(el).attr('rel');
    return rel?.toLowerCase() === 'canonical';
  }).first().attr('href');

  if (canonicalLink) {
    try {
      const absoluteCanonicalUrl = new URL(canonicalLink, url).href;
      // Only use canonical if it's same-site
      if (isSameSite(url, absoluteCanonicalUrl)) {
        canonicalUrl = absoluteCanonicalUrl;
      }
    } catch {
      // Invalid canonical URL, ignore
    }
  }

  return {
    url,
    html: $.html(),
    css: [...cssContents, ...inlineStyles].filter(Boolean),
    title,
    canonicalUrl
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

/**
 * Checks if a URL returns 200 status
 */
async function checkUrlExists(url: string): Promise<boolean> {
  try {
    const https = await import('https');
    const agent = new https.default.Agent({
      rejectUnauthorized: false,
    });
    
    const response = await axios.head(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BrandGuidelineBot/1.0)'
      },
      httpsAgent: agent,
      validateStatus: (status) => status === 200
    });
    
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Extracts navigation links with their text from HTML
 */
function extractNavigationLinks(html: string, baseUrl: string): Array<{ url: string; text: string }> {
  const $ = cheerio.load(html);
  const links: Array<{ url: string; text: string }> = [];
  
  // Extract links from nav, header, and footer elements
  $('nav a, header a, footer a').each((_, elem) => {
    const href = $(elem).attr('href');
    const text = $(elem).text().trim().toLowerCase();
    
    if (href && text) {
      try {
        const absoluteUrl = new URL(href, baseUrl).href;
        links.push({ url: absoluteUrl, text });
      } catch {
        // Invalid URL, skip
      }
    }
  });
  
  return links;
}

/**
 * Finds the about page URL using a 4-step fallback approach
 */
async function findAboutPageUrl(domain: string, homepageHtml: string, baseUrl: string): Promise<string> {
  // Step 1: Try domain/about
  console.log('Trying /about...');
  const aboutUrl = `${domain}/about`;
  if (await checkUrlExists(aboutUrl)) {
    console.log('Found about page at /about');
    return aboutUrl;
  }
  
  // Step 2: Try domain/about-us
  console.log('Trying /about-us...');
  const aboutUsUrl = `${domain}/about-us`;
  if (await checkUrlExists(aboutUsUrl)) {
    console.log('Found about page at /about-us');
    return aboutUsUrl;
  }
  
  // Extract navigation links from homepage
  const navLinks = extractNavigationLinks(homepageHtml, baseUrl);
  
  // Step 3: Check main navigation (nav/header) for "About" or "About Us" links
  console.log('Checking main navigation...');
  const $ = cheerio.load(homepageHtml);
  const mainNavLinks: Array<{ url: string; text: string }> = [];
  
  $('nav a, header a').each((_, elem) => {
    const href = $(elem).attr('href');
    const text = $(elem).text().trim().toLowerCase();
    
    if (href && text) {
      try {
        const absoluteUrl = new URL(href, baseUrl).href;
        mainNavLinks.push({ url: absoluteUrl, text });
      } catch {
        // Invalid URL, skip
      }
    }
  });
  
  for (const link of mainNavLinks) {
    if (link.text === 'about' || link.text === 'about us') {
      console.log(`Found about page in main navigation: ${link.url}`);
      return link.url;
    }
  }
  
  // Step 4: Check footer navigation for "About" or "About Us" links
  console.log('Checking footer navigation...');
  const footerLinks: Array<{ url: string; text: string }> = [];
  
  $('footer a').each((_, elem) => {
    const href = $(elem).attr('href');
    const text = $(elem).text().trim().toLowerCase();
    
    if (href && text) {
      try {
        const absoluteUrl = new URL(href, baseUrl).href;
        footerLinks.push({ url: absoluteUrl, text });
      } catch {
        // Invalid URL, skip
      }
    }
  });
  
  for (const link of footerLinks) {
    if (link.text === 'about' || link.text === 'about us') {
      console.log(`Found about page in footer: ${link.url}`);
      return link.url;
    }
  }
  
  console.log('No about page found through fallback methods');
  return '';
}

/**
 * Categorizes crawled pages into home, about, services, and blog pages
 */
export async function categorizePages(pages: CrawledPage[], homepageUrl: string): Promise<CategorizedPages> {
  const categorized: CategorizedPages = {
    home_page: homepageUrl,
    about_page: '',
    service_pages: [],
    blog_articles: []
  };

  const domain = new URL(homepageUrl).origin;
  
  // Find the homepage in crawled pages to get its HTML
  const homepageCrawled = pages.find(p => p.url === homepageUrl);
  
  // Use the new 4-step fallback logic to find about page
  if (homepageCrawled) {
    categorized.about_page = await findAboutPageUrl(domain, homepageCrawled.html, homepageUrl);
  }

  // Keywords for categorization
  const serviceKeywords = ['service', 'product', 'solution', 'offering', 'what-we-do', 'feature', 'plan', 'pricing'];
  const blogKeywords = ['blog', 'article', 'news', 'resource', 'insight', 'post', 'guide', 'learn'];

  // Categorize other pages
  for (const page of pages) {
    const url = page.url.toLowerCase();
    const title = page.title.toLowerCase();
    const urlPath = new URL(page.url).pathname.toLowerCase();

    // Skip homepage
    if (page.url === homepageUrl || urlPath === '/' || urlPath === '') {
      continue;
    }

    // Skip if already set as about page
    if (page.url === categorized.about_page) {
      continue;
    }

    // Check if it's a blog/article page
    // Exclude index/category pages that end with /blog, /blog/, contain /category/, or /tag/
    const isBlogIndexOrCategory = 
      urlPath.endsWith('/blog') || 
      urlPath.endsWith('/blog/') || 
      urlPath === '/blog' ||
      urlPath.includes('/category/') ||
      urlPath.includes('/categories/') ||
      urlPath.includes('/tag/') ||
      urlPath.includes('/tags/');
    
    if (!isBlogIndexOrCategory && blogKeywords.some(keyword => 
      urlPath.includes(keyword) || title.includes(keyword)
    )) {
      if (categorized.blog_articles.length < 20) {
        categorized.blog_articles.push(page.url);
      }
      continue;
    }

    // Check if it's a service/product page
    if (serviceKeywords.some(keyword => 
      urlPath.includes(keyword) || title.includes(keyword)
    )) {
      if (categorized.service_pages.length < 10) {
        categorized.service_pages.push(page.url);
      }
      continue;
    }
  }

  return categorized;
}

/**
 * Extracts URL pattern from a service page URL
 * Example: https://example.com/services/web-design -> /services/
 */
function extractUrlPattern(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    if (pathParts.length >= 2) {
      // Return the base path (e.g., /services/)
      return `/${pathParts[0]}/`;
    } else if (pathParts.length === 1) {
      // Single segment, look for pages at root level
      return '/';
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Finds service pages matching the URL pattern of the example URL
 */
export function findServicePagesByPattern(
  exampleServiceUrl: string,
  cachedPages: CrawledPage[],
  limit: number = 10
): string[] {
  const pattern = extractUrlPattern(exampleServiceUrl);
  if (!pattern) {
    console.log('Could not extract URL pattern from example URL');
    return [];
  }

  console.log(`Looking for service pages matching pattern: ${pattern}`);
  
  const matchingPages: string[] = [];
  
  for (const page of cachedPages) {
    if (matchingPages.length >= limit) {
      break;
    }
    
    try {
      const urlObj = new URL(page.url);
      const path = urlObj.pathname;
      
      // Check if URL starts with the pattern and has additional segments
      if (pattern === '/') {
        // Root level pattern - look for single segment paths
        const pathParts = path.split('/').filter(Boolean);
        if (pathParts.length === 1 && !path.endsWith('.html') && !path.endsWith('.php')) {
          matchingPages.push(page.url);
        }
      } else {
        // Specific pattern like /services/
        if (path.startsWith(pattern) && path !== pattern && path !== pattern.slice(0, -1)) {
          matchingPages.push(page.url);
        }
      }
    } catch {
      // Invalid URL, skip
    }
  }
  
  console.log(`Found ${matchingPages.length} service pages matching pattern ${pattern}`);
  return matchingPages;
}

/**
 * Extracts blog post links from a blog home page, including pagination
 */
export async function extractBlogPostsFromPage(
  blogHomeUrl: string,
  limit: number = 20,
  maxPaginationPages: number = 5
): Promise<string[]> {
  const blogPosts: string[] = [];
  const visitedPages = new Set<string>();
  const pagesToVisit: string[] = [blogHomeUrl];
  
  const domain = new URL(blogHomeUrl).origin;
  const blogKeywords = ['blog', 'article', 'news', 'resource', 'insight', 'post', 'guide', 'learn'];

  while (pagesToVisit.length > 0 && visitedPages.size < maxPaginationPages && blogPosts.length < limit) {
    const currentUrl = pagesToVisit.shift()!;
    
    if (visitedPages.has(currentUrl)) {
      continue;
    }
    
    visitedPages.add(currentUrl);
    console.log(`Extracting blog posts from: ${currentUrl}`);
    
    try {
      const https = await import('https');
      const agent = new https.default.Agent({
        rejectUnauthorized: false,
      });
      
      const response = await axios.get(currentUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BrandGuidelineBot/1.0)'
        },
        httpsAgent: agent
      });
      
      const $ = cheerio.load(response.data);
      
      // Extract all links from the page
      $('a[href]').each((_, elem) => {
        const href = $(elem).attr('href');
        if (!href) return;
        
        try {
          const absoluteUrl = new URL(href, currentUrl).href;
          const urlObj = new URL(absoluteUrl);
          
          // Only include URLs from the same domain
          if (urlObj.origin !== domain) return;
          
          const urlPath = urlObj.pathname.toLowerCase();
          
          // Check if it's a blog post (not index, category, tag, or pagination)
          const isBlogIndexOrCategory = 
            urlPath.endsWith('/blog') || 
            urlPath.endsWith('/blog/') || 
            urlPath === '/blog' ||
            urlPath.includes('/category/') ||
            urlPath.includes('/categories/') ||
            urlPath.includes('/tag/') ||
            urlPath.includes('/tags/') ||
            urlPath.includes('/page/') ||
            urlPath.includes('/author/');
          
          // Check if it looks like a blog post
          const looksLikeBlogPost = blogKeywords.some(keyword => urlPath.includes(keyword));
          
          if (looksLikeBlogPost && !isBlogIndexOrCategory && !blogPosts.includes(absoluteUrl)) {
            blogPosts.push(absoluteUrl);
          }
        } catch {
          // Invalid URL, skip
        }
      });
      
      // Look for pagination links if we need more posts
      if (blogPosts.length < limit && visitedPages.size < maxPaginationPages) {
        $('a[href]').each((_, elem) => {
          const href = $(elem).attr('href');
          const text = $(elem).text().trim().toLowerCase();
          
          if (!href) return;
          
          try {
            const absoluteUrl = new URL(href, currentUrl).href;
            const urlObj = new URL(absoluteUrl);
            
            // Only include URLs from the same domain
            if (urlObj.origin !== domain) return;
            
            const urlPath = urlObj.pathname.toLowerCase();
            
            // Check if it's a pagination link
            const isPaginationLink = 
              text.includes('next') ||
              text.includes('older') ||
              /page\s*\d+/.test(text) ||
              /\d+/.test(text) ||
              urlPath.includes('/page/') ||
              urlObj.searchParams.has('page') ||
              urlObj.searchParams.has('paged');
            
            if (isPaginationLink && !visitedPages.has(absoluteUrl) && !pagesToVisit.includes(absoluteUrl)) {
              pagesToVisit.push(absoluteUrl);
            }
          } catch {
            // Invalid URL, skip
          }
        });
      }
    } catch (error) {
      console.error(`Error extracting blog posts from ${currentUrl}:`, error);
    }
  }
  
  console.log(`Extracted ${blogPosts.length} blog posts from ${visitedPages.size} pages`);
  return blogPosts.slice(0, limit);
}

/**
 * NEW: Discovers and categorizes context pages from a homepage URL
 * Uses intelligent crawling with early exit
 */
export async function discoverContextPages(homepageUrl: string): Promise<CategorizedPagesWithCache> {
  // Use new crawler with early exit at 250 pages
  const result = await crawlWebsiteWithEarlyExit(homepageUrl, 250);
  
  if (result.totalPagesCrawled === 0) {
    throw new Error("Unable to crawl any pages from the provided URL");
  }

  console.log(`Discovered context pages:`, {
    total: result.totalPagesCrawled,
    about: result.about_page ? 1 : 0,
    services: result.service_pages.length,
    blogs: result.blog_articles.length,
    reachedLimit: result.reachedLimit
  });

  return result;
}

/**
 * OLD: Discovers and categorizes context pages from a homepage URL
 * @deprecated Use new discoverContextPages instead
 */
export async function discoverContextPagesOld(homepageUrl: string): Promise<CategorizedPages> {
  // Crawl more pages for better discovery (up to 30 pages)
  const crawlResult = await crawlWebsite(homepageUrl, 30);
  
  if (crawlResult.pages.length === 0) {
    throw new Error("Unable to crawl any pages from the provided URL");
  }

  const categorized = await categorizePages(crawlResult.pages, homepageUrl);
  
  console.log(`Discovered context pages:`, {
    total: crawlResult.pages.length,
    about: categorized.about_page ? 1 : 0,
    services: categorized.service_pages.length,
    blogs: categorized.blog_articles.length
  });

  return categorized;
}
