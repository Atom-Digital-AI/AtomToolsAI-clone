import * as dns from 'dns';
import * as net from 'net';
import { promisify } from 'util';

const dnsResolve4 = promisify(dns.resolve4);
const dnsResolve6 = promisify(dns.resolve6);

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
    'metadata.google.internal',
    'metadata.azure.com',
  ];

  const hostname = parsedUrl.hostname.toLowerCase();
  if (blockedHostnames.includes(hostname)) {
    throw new Error('Cannot crawl local or internal addresses.');
  }

  // Check if hostname is a literal IP address (IPv4 or IPv6)
  const ipVersion = net.isIP(hostname);
  if (ipVersion !== 0) {
    // It's a literal IP address - check if it's private
    if (ipVersion === 4 && isPrivateIPv4(hostname)) {
      throw new Error('Cannot crawl private or internal IP addresses.');
    }
    if (ipVersion === 6 && isPrivateIPv6(hostname)) {
      throw new Error('Cannot crawl private or internal IPv6 addresses.');
    }
    // Even if it's a public IP, we should reject literal IPs for security
    throw new Error('Please use domain names instead of IP addresses.');
  }

  // Resolve DNS to check for private IP ranges
  // IMPORTANT: Check BOTH IPv4 and IPv6 records in parallel to prevent bypass
  try {
    const [v4Result, v6Result] = await Promise.allSettled([
      dnsResolve4(hostname),
      dnsResolve6(hostname)
    ]);

    // Check if at least one resolution succeeded
    const hasV4 = v4Result.status === 'fulfilled' && v4Result.value.length > 0;
    const hasV6 = v6Result.status === 'fulfilled' && v6Result.value.length > 0;

    if (!hasV4 && !hasV6) {
      throw new Error('Domain not found. Please check the URL and try again.');
    }

    // Validate all IPv4 addresses if present
    if (hasV4) {
      for (const address of v4Result.value) {
        if (isPrivateIPv4(address)) {
          throw new Error('Cannot crawl private or internal IP addresses.');
        }
      }
    }

    // Validate all IPv6 addresses if present
    if (hasV6) {
      for (const address of v6Result.value) {
        if (isPrivateIPv6(address)) {
          throw new Error('Cannot crawl private or internal IPv6 addresses.');
        }
      }
    }
  } catch (error) {
    // If it's one of our custom errors, re-throw it
    if ((error as Error).message.includes('Cannot crawl') || 
        (error as Error).message.includes('Domain not found')) {
      throw error;
    }
    // For any other DNS errors, block the request
    throw new Error('Unable to resolve domain. Please check the URL and try again.');
  }

  return normalizedUrl;
}

/**
 * Checks if an IPv4 address is in a private range
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  
  if (parts.length !== 4) {
    return false;
  }
  
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
  
  // 0.0.0.0 - 0.255.255.255 (current network)
  if (parts[0] === 0) {
    return true;
  }
  
  return false;
}

/**
 * Checks if an IPv6 address is in a private/internal range
 */
function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  
  // ::1 (loopback)
  if (lower === '::1' || lower === '0000:0000:0000:0000:0000:0000:0000:0001') {
    return true;
  }
  
  // fe80::/10 (link-local)
  if (lower.startsWith('fe80:')) {
    return true;
  }
  
  // fc00::/7 (unique local addresses)
  if (lower.startsWith('fc') || lower.startsWith('fd')) {
    return true;
  }
  
  // ::ffff:0:0/96 (IPv4-mapped IPv6)
  if (lower.includes('::ffff:')) {
    const ipv4Part = lower.split('::ffff:')[1];
    if (ipv4Part) {
      // Extract IPv4 and check if it's private
      const ipv4Match = ipv4Part.match(/(\d+\.\d+\.\d+\.\d+)/);
      if (ipv4Match) {
        return isPrivateIPv4(ipv4Match[1]);
      }
    }
  }
  
  return false;
}
