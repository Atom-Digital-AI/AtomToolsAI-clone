import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { eq, isNull, and } from 'drizzle-orm';
import { db } from '../db';
import { apiKeys } from '../../shared/schema';
import { getLogger, setContextUserId } from '../logging/logger';

// Extend Express Request type to include API key info
declare global {
  namespace Express {
    interface Request {
      apiKey?: {
        id: string;
        userId: string;
        name: string;
        scopes: string[] | null;
        rateLimit: number | null;
      };
    }
  }
}

/**
 * Hash an API key using SHA-256
 */
function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * API Key Authentication Middleware
 *
 * Authenticates requests using an API key passed in the X-API-Key header.
 * If no API key is provided, the request continues to session-based auth.
 * If an invalid or expired API key is provided, returns 401.
 *
 * @example
 * ```typescript
 * // Apply to all API routes
 * app.use('/api', apiKeyAuth);
 *
 * // Or apply to specific routes
 * router.get('/data', apiKeyAuth, (req, res) => {
 *   if (req.apiKey) {
 *     // Request was authenticated via API key
 *   }
 * });
 * ```
 */
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const log = getLogger({ middleware: 'apiKeyAuth' });

  // Get API key from header
  const apiKeyHeader = req.headers['x-api-key'] as string;

  // If no API key provided, fall through to session auth
  if (!apiKeyHeader) {
    return next();
  }

  try {
    // Hash the provided key
    const keyHash = hashApiKey(apiKeyHeader);
    const keyPrefix = apiKeyHeader.substring(0, 8);

    // Look up the key in the database
    const result = await db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.keyHash, keyHash),
          isNull(apiKeys.revokedAt)
        )
      )
      .limit(1);

    const apiKeyRecord = result[0];

    // Key not found or revoked
    if (!apiKeyRecord) {
      log.warn({ keyPrefix }, 'Invalid API key attempt');
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid or revoked API key',
        },
      });
    }

    // Check if key has expired
    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
      log.warn({ keyId: apiKeyRecord.id }, 'Expired API key attempt');
      return res.status(401).json({
        success: false,
        error: {
          code: 'EXPIRED_API_KEY',
          message: 'API key has expired',
        },
      });
    }

    // Attach API key info to request
    req.apiKey = {
      id: apiKeyRecord.id,
      userId: apiKeyRecord.userId,
      name: apiKeyRecord.name,
      scopes: apiKeyRecord.scopes,
      rateLimit: apiKeyRecord.rateLimit,
    };

    // Set user in request for compatibility with session auth
    (req as any).user = { id: apiKeyRecord.userId };

    // Set user ID in logging context
    setContextUserId(parseInt(apiKeyRecord.userId, 10));

    // Update last used timestamp (fire and forget)
    db.update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, apiKeyRecord.id))
      .catch((err) => {
        log.error({ error: err }, 'Failed to update API key last used timestamp');
      });

    log.info({ keyId: apiKeyRecord.id, keyName: apiKeyRecord.name }, 'API key authenticated');
    next();
  } catch (error) {
    log.error({ error }, 'API key authentication error');
    next(error);
  }
}

/**
 * Require specific scopes for API key access
 *
 * @example
 * ```typescript
 * router.post('/admin/users', apiKeyAuth, requireScopes(['admin']), handler);
 * router.get('/data', apiKeyAuth, requireScopes(['read']), handler);
 * ```
 */
export function requireScopes(requiredScopes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const log = getLogger({ middleware: 'requireScopes' });

    // If no API key, allow session auth to handle
    if (!req.apiKey) {
      return next();
    }

    const keyScopes = req.apiKey.scopes || [];

    // Check if key has all required scopes
    const hasAllScopes = requiredScopes.every((scope) => keyScopes.includes(scope));

    if (!hasAllScopes) {
      log.warn({
        keyId: req.apiKey.id,
        requiredScopes,
        actualScopes: keyScopes,
      }, 'Insufficient API key scopes');

      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_SCOPES',
          message: `API key requires scopes: ${requiredScopes.join(', ')}`,
        },
      });
    }

    next();
  };
}

/**
 * Generate a new API key
 * Returns the plain text key (only shown once) and the key prefix
 */
export function generateApiKey(): { key: string; keyHash: string; keyPrefix: string } {
  // Generate a random key: atk_ prefix + 32 random hex chars
  const randomBytes = createHash('sha256')
    .update(Date.now().toString() + Math.random().toString())
    .digest('hex')
    .substring(0, 32);

  const key = `atk_${randomBytes}`;
  const keyHash = hashApiKey(key);
  const keyPrefix = key.substring(0, 8);

  return { key, keyHash, keyPrefix };
}
