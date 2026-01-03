import axios from 'axios';
import * as cheerio from 'cheerio';

// User agent for AtomBot - used in both browser and fallback modes
export const ATOMBOT_USER_AGENT = 'Mozilla/5.0 (compatible; AtomBot/1.0)';

// Realistic browser user agents for rotation
const BROWSER_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

// Common browser headers to appear more legitimate
const BROWSER_HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

export interface FetchResult {
  html: string;
  statusCode: number;
  url: string;
}

export interface FetchOptions {
  timeout?: number;
  useStealthMode?: boolean;
  referer?: string;
}

// Playwright browser instance (lazy loaded)
let playwrightBrowser: any = null;
let playwrightAvailable: boolean | null = null;

/**
 * Check if Playwright is available and can launch a browser
 */
async function checkPlaywrightAvailable(): Promise<boolean> {
  if (playwrightAvailable !== null) {
    return playwrightAvailable;
  }

  try {
    const { chromium } = await import('playwright');

    // Check if PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH is set or browser is available
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

    if (executablePath) {
      console.log(`Using Playwright with custom executable: ${executablePath}`);
      playwrightAvailable = true;
      return true;
    }

    // Try to launch browser to check availability
    const browser = await chromium.launch({
      headless: true,
      timeout: 5000
    });
    await browser.close();
    playwrightAvailable = true;
    console.log('Playwright browser is available');
    return true;
  } catch (error) {
    console.log('Playwright browser not available, using fallback mode with enhanced headers');
    playwrightAvailable = false;
    return false;
  }
}

/**
 * Get or create a Playwright browser instance
 */
async function getPlaywrightBrowser(): Promise<any> {
  if (playwrightBrowser) {
    return playwrightBrowser;
  }

  const { chromium } = await import('playwright');
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

  playwrightBrowser = await chromium.launch({
    headless: true,
    executablePath: executablePath || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
  });

  return playwrightBrowser;
}

/**
 * Fetch a page using Playwright with stealth features
 */
async function fetchWithPlaywright(url: string, options: FetchOptions = {}): Promise<FetchResult> {
  const browser = await getPlaywrightBrowser();
  const context = await browser.newContext({
    userAgent: getRandomUserAgent(),
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  const page = await context.newPage();

  // Add stealth scripts to evade bot detection
  await page.addInitScript(() => {
    // Override navigator.webdriver
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });

    // Override chrome property
    (window as any).chrome = {
      runtime: {},
    };

    // Override permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters: any) =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
        : originalQuery(parameters);

    // Override plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });

    // Override languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
  });

  try {
    // Set referer if provided
    if (options.referer) {
      await page.setExtraHTTPHeaders({ 'Referer': options.referer });
    }

    // Add random delay to appear more human-like
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

    const response = await page.goto(url, {
      timeout: options.timeout || 30000,
      waitUntil: 'domcontentloaded',
    });

    const statusCode = response?.status() || 0;
    const html = await page.content();

    return {
      html,
      statusCode,
      url: page.url(),
    };
  } finally {
    await context.close();
  }
}

/**
 * Get a random browser user agent
 */
function getRandomUserAgent(): string {
  return BROWSER_USER_AGENTS[Math.floor(Math.random() * BROWSER_USER_AGENTS.length)];
}

/**
 * Fetch a page using Axios with browser-like headers (fallback mode)
 */
async function fetchWithAxios(url: string, options: FetchOptions = {}): Promise<FetchResult> {
  const https = await import('https');
  const agent = new https.default.Agent({
    rejectUnauthorized: false,
  });

  // Add random delay to appear more human-like
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 300));

  const userAgent = options.useStealthMode ? getRandomUserAgent() : ATOMBOT_USER_AGENT;

  const headers: Record<string, string> = {
    'User-Agent': userAgent,
    ...BROWSER_HEADERS,
  };

  if (options.referer) {
    headers['Referer'] = options.referer;
  }

  const response = await axios.get(url, {
    timeout: options.timeout || 10000,
    headers,
    httpsAgent: agent,
    maxRedirects: 5,
    validateStatus: () => true, // Don't throw on any status
  });

  return {
    html: response.data,
    statusCode: response.status,
    url: response.request?.res?.responseUrl || url,
  };
}

/**
 * Fetch a page with automatic selection of best available method
 * Uses Playwright with stealth when available, falls back to enhanced Axios
 */
export async function fetchPage(url: string, options: FetchOptions = {}): Promise<FetchResult> {
  const usePlaywright = await checkPlaywrightAvailable();

  if (usePlaywright && options.useStealthMode !== false) {
    try {
      return await fetchWithPlaywright(url, options);
    } catch (error) {
      console.warn(`Playwright fetch failed for ${url}, falling back to Axios:`, error);
      return await fetchWithAxios(url, options);
    }
  }

  return await fetchWithAxios(url, options);
}

/**
 * Check if a URL exists (returns 200)
 */
export async function checkUrlExists(url: string, timeout: number = 5000): Promise<boolean> {
  try {
    const https = await import('https');
    const agent = new https.default.Agent({
      rejectUnauthorized: false,
    });

    const response = await axios.head(url, {
      timeout,
      headers: {
        'User-Agent': ATOMBOT_USER_AGENT,
        ...BROWSER_HEADERS,
      },
      httpsAgent: agent,
      validateStatus: (status) => status === 200,
    });

    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Extract CSS from a page
 */
export async function fetchCss(cssUrl: string, timeout: number = 5000): Promise<string> {
  try {
    const https = await import('https');
    const agent = new https.default.Agent({
      rejectUnauthorized: false,
    });

    const response = await axios.get(cssUrl, {
      timeout,
      headers: {
        'User-Agent': ATOMBOT_USER_AGENT,
      },
      httpsAgent: agent,
    });

    return response.data;
  } catch {
    return '';
  }
}

/**
 * Close the browser instance (should be called on shutdown)
 */
export async function closeBrowser(): Promise<void> {
  if (playwrightBrowser) {
    await playwrightBrowser.close();
    playwrightBrowser = null;
  }
}

/**
 * Reset the Playwright availability check (for testing)
 */
export function resetPlaywrightCheck(): void {
  playwrightAvailable = null;
}
