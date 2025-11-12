import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

const window = new JSDOM("").window;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DOMPurify = createDOMPurify(window as any);

const SENSITIVE_FIELDS = [
  "password",
  "token",
  "secret",
  "apikey",
  "api_key",
  "creditcard",
  "credit_card",
  "ssn",
  "cvv",
  "pin",
  "authorization",
  "auth",
];

/**
 * Sanitize HTML content for safe display
 */
export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "b",
      "i",
      "em",
      "strong",
      "a",
      "p",
      "br",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "blockquote",
      "code",
      "pre",
    ],
    ALLOWED_ATTR: ["href", "title", "target", "rel"],
  });
}

/**
 * Escape text for safe HTML display
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Sanitize objects for logging - redact sensitive fields
 */
export function sanitizeForLogging(obj: any): any {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForLogging(item));
  }

  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Redact sensitive fields
    if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Validate URL to prevent SSRF attacks
 */
export function validateURL(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Block localhost, private IPs, and metadata endpoints
    const hostname = parsed.hostname.toLowerCase();

    // Block localhost
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1"
    ) {
      return false;
    }

    // Block private IP ranges
    const privateIPPatterns = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./, // Link-local
    ];

    if (privateIPPatterns.some((pattern) => pattern.test(hostname))) {
      return false;
    }

    // Block cloud metadata endpoints
    if (
      hostname.includes("metadata.google.internal") ||
      hostname === "169.254.169.254"
    ) {
      return false;
    }

    // Only allow HTTP/HTTPS
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
