import rateLimit from 'express-rate-limit';

// Strict rate limit for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  // Validate that we have a trustworthy IP
  validate: {
    trustProxy: true,
    xForwardedForHeader: true,
  },
});

// Moderate rate limit for general API endpoints
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: true,
    xForwardedForHeader: true,
  },
});

// Very strict for expensive AI operations
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'AI request rate limit exceeded. Please wait before trying again.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: true,
    xForwardedForHeader: true,
  },
});

// Strict for signup to prevent abuse
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 signups per hour per IP
  message: 'Too many accounts created from this IP. Please try again in an hour.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: true,
    xForwardedForHeader: true,
  },
});
