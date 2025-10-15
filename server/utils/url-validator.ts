import * as dns from 'dns';
import { promisify } from 'util';

const dnsResolve = promisify(dns.resolve4);

/**
 * Validates and normalizes a URL for safe crawling
 * Prevents SSRF attacks by blocking internal IPs and private networks
 */
export async function validateAndNormalizeUrl(url: string): Promise<string> {
  // Normalize URL - add https if no protocol
  let normalizedUrl = url.trim();
  if (!normalizedUrl.match(/^https?:\/\//i)) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  // Parse and validate URL structure
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizedUrl);
  } catch (error) {
    throw new Error('Invalid URL format. Please provide a valid domain URL.');
  }

  // Only allow https protocol
  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed for security reasons.');
  }

  // Block localhost and common internal hostnames
  const blockedHostnames = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    'metadata.google.internal',
    '169.254.169.254', // AWS/GCP metadata
    'metadata.azure.com',
  ];

  const hostname = parsedUrl.hostname.toLowerCase();
  if (blockedHostnames.includes(hostname)) {
    throw new Error('Cannot crawl local or internal addresses.');
  }

  // Resolve DNS to check for private IP ranges
  try {
    const addresses = await dnsResolve(parsedUrl.hostname);
    
    for (const address of addresses) {
      if (isPrivateIP(address)) {
        throw new Error('Cannot crawl private or internal IP addresses.');
      }
    }
  } catch (error) {
    if ((error as any).code === 'ENOTFOUND') {
      throw new Error('Domain not found. Please check the URL and try again.');
    }
    // Re-throw if it's our custom error
    if ((error as Error).message.includes('private or internal')) {
      throw error;
    }
    // For other DNS errors, log but continue
    console.warn('DNS resolution warning:', error);
  }

  return normalizedUrl;
}

/**
 * Checks if an IP address is in a private range
 */
function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  
  // 10.0.0.0 - 10.255.255.255
  if (parts[0] === 10) {
    return true;
  }
  
  // 172.16.0.0 - 172.31.255.255
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
    return true;
  }
  
  // 192.168.0.0 - 192.168.255.255
  if (parts[0] === 192 && parts[1] === 168) {
    return true;
  }
  
  // 127.0.0.0 - 127.255.255.255 (loopback)
  if (parts[0] === 127) {
    return true;
  }
  
  // 169.254.0.0 - 169.254.255.255 (link-local)
  if (parts[0] === 169 && parts[1] === 254) {
    return true;
  }
  
  return false;
}
