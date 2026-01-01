import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';
import { requestContext, getLogger } from '../logging/logger';

/**
 * Correlation ID Middleware
 *
 * Assigns a unique correlation ID to each request for distributed tracing.
 * - Uses existing X-Correlation-ID header if provided (for service-to-service calls)
 * - Generates a new ID if none exists
 * - Sets the correlation ID in the response header
 * - Logs request start and completion with timing
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
  // Use existing correlation ID or generate new one
  const correlationId = (req.headers['x-correlation-id'] as string) || nanoid();

  // Set correlation ID in response header for client tracing
  res.setHeader('x-correlation-id', correlationId);

  // Run the rest of the request in the context with correlation ID
  requestContext.run(
    {
      correlationId,
      path: req.path,
      method: req.method,
    },
    () => {
      const log = getLogger({ path: req.path, method: req.method });
      const startTime = Date.now();

      // Only log API requests (skip static assets)
      if (req.path.startsWith('/api')) {
        log.info({
          query: Object.keys(req.query).length > 0 ? req.query : undefined,
        }, 'Request started');
      }

      // Log when response finishes
      res.on('finish', () => {
        const durationMs = Date.now() - startTime;

        if (req.path.startsWith('/api')) {
          const logData = {
            status: res.statusCode,
            durationMs,
          };

          if (res.statusCode >= 400) {
            log.warn(logData, 'Request completed with error');
          } else {
            log.info(logData, 'Request completed');
          }
        }
      });

      next();
    }
  );
}
