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
  crawledUrls: string[];
}

interface CategorizedPages {
  home_page: string;
  about_page: string;
  service_pages: string[];
  blog_articles: string[];
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
 * Discovers and categorizes context pages from a homepage URL
 */
export async function discoverContextPages(homepageUrl: string): Promise<CategorizedPages> {
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
