import crypto from 'crypto';

/**
 * Normalizes a URL for deduplication purposes
 * 
 * This function performs the following normalizations:
 * - Lowercases the hostname
 * - Removes default ports (:80 for http, :443 for https)
 * - Removes query parameters entirely
 * - Removes URL fragments (#section)
 * - Removes trailing slash (except for root /)
 * - Collapses consecutive slashes in path (// → /)
 * - Decodes percent encoding when safe (alphanumeric + -._~)
 * 
 * @param url - The URL to normalize
 * @returns Normalized URL suitable for deduplication
 * @throws Error if the URL is invalid
 */
export function normalizeUrlForDedup(url: string): string {
  try {
    // Add protocol if missing
    let urlToParse = url.trim();
    if (!urlToParse.match(/^https?:\/\//i)) {
      urlToParse = 'https://' + urlToParse;
    }

    const parsedUrl = new URL(urlToParse);
    
    // Lowercase the hostname
    const normalizedHost = parsedUrl.hostname.toLowerCase();
    
    // Remove default ports
    let port = parsedUrl.port;
    if ((parsedUrl.protocol === 'http:' && port === '80') ||
        (parsedUrl.protocol === 'https:' && port === '443')) {
      port = '';
    }
    
    // Collapse consecutive slashes in path
    let normalizedPath = parsedUrl.pathname.replace(/\/+/g, '/');
    
    // Decode safe percent encoding (alphanumeric + -._~)
    normalizedPath = normalizedPath.replace(/%([0-9A-Fa-f]{2})/g, (match, hex) => {
      const char = String.fromCharCode(parseInt(hex, 16));
      // Only decode if it's alphanumeric or one of: -._~
      if (/[A-Za-z0-9\-._~]/.test(char)) {
        return char;
      }
      return match;
    });
    
    // Remove trailing slash (except for root /)
    if (normalizedPath !== '/' && normalizedPath.endsWith('/')) {
      normalizedPath = normalizedPath.slice(0, -1);
    }
    
    // Construct normalized URL
    let normalizedUrl = `${parsedUrl.protocol}//${normalizedHost}`;
    if (port) {
      normalizedUrl += `:${port}`;
    }
    normalizedUrl += normalizedPath;
    
    return normalizedUrl;
  } catch (error) {
    throw new Error(`Invalid URL: ${url}`);
  }
}

/**
 * Strips common tracking parameters from a URL
 * 
 * Removes the following tracking parameters:
 * - utm_* (any parameter starting with utm_, case-insensitive)
 * - gclid (Google Click ID)
 * - fbclid (Facebook Click ID)
 * - ref (referrer)
 * - source
 * - campaign
 * - medium
 * 
 * @param url - The URL to clean
 * @returns URL with tracking parameters removed
 * @throws Error if the URL is invalid
 */
export function stripTrackingParams(url: string): string {
  try {
    const parsedUrl = new URL(url);
    
    // List of non-utm tracking parameters to remove
    const otherTrackingParams = ['gclid', 'fbclid', 'ref', 'source', 'campaign', 'medium'];
    
    // Collect all parameter keys that should be removed
    const keysToDelete: string[] = [];
    
    parsedUrl.searchParams.forEach((value, key) => {
      // Check if parameter starts with 'utm_' (case-insensitive)
      if (/^utm_/i.test(key)) {
        keysToDelete.push(key);
      }
      // Check if parameter is in the other tracking params list
      else if (otherTrackingParams.includes(key)) {
        keysToDelete.push(key);
      }
    });
    
    // Remove tracking parameters
    keysToDelete.forEach(key => {
      parsedUrl.searchParams.delete(key);
    });
    
    return parsedUrl.toString();
  } catch (error) {
    throw new Error(`Invalid URL: ${url}`);
  }
}

/**
 * Checks if two URLs are from the same site
 * 
 * Compares protocol and host (hostname + port) to determine if two URLs
 * are from the same site. This is a strict comparison where
 * both protocol and host must match exactly.
 * 
 * @param url1 - First URL to compare
 * @param url2 - Second URL to compare
 * @returns true if same site, false otherwise
 * @throws Error if either URL is invalid
 */
export function isSameSite(url1: string, url2: string): boolean {
  try {
    const parsed1 = new URL(url1);
    const parsed2 = new URL(url2);
    
    // Compare protocol and host (host includes port)
    return parsed1.protocol === parsed2.protocol &&
           parsed1.host === parsed2.host;
  } catch (error) {
    throw new Error(`Invalid URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates an MD5 hash of HTML content
 * 
 * Normalizes whitespace (collapses multiple spaces/newlines into single spaces)
 * before generating the hash to ensure consistent hashing regardless of
 * formatting differences.
 * 
 * @param html - The HTML content to hash
 * @returns Hexadecimal MD5 hash string
 */
export function generateContentHash(html: string): string {
  // Normalize whitespace: collapse multiple spaces/newlines into single space
  const normalizedHtml = html
    .replace(/\s+/g, ' ')  // Replace all whitespace sequences with a single space
    .trim();                // Remove leading/trailing whitespace
  
  // Generate MD5 hash
  const hash = crypto.createHash('md5');
  hash.update(normalizedHtml);
  
  return hash.digest('hex');
}
