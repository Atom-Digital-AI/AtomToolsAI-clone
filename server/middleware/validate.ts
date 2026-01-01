import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { getLogger } from '../logging/logger';

/**
 * Validation schemas for request parts
 */
export interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Validation error response format
 */
interface ValidationErrorResponse {
  success: false;
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    details: Array<{
      path: string;
      message: string;
    }>;
  };
}

/**
 * Validation Middleware Factory
 *
 * Creates middleware that validates request body, query, and params
 * against provided Zod schemas.
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 * import { validate } from '../middleware/validate';
 *
 * const createUserSchema = {
 *   body: z.object({
 *     email: z.string().email(),
 *     name: z.string().min(1),
 *   }),
 * };
 *
 * router.post('/users', validate(createUserSchema), (req, res) => {
 *   // req.body is now typed and validated
 * });
 * ```
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    const log = getLogger({ middleware: 'validate' });
    const errors: Array<{ path: string; message: string }> = [];

    try {
      // Validate body
      if (schemas.body) {
        const result = schemas.body.safeParse(req.body);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error, 'body'));
        } else {
          req.body = result.data;
        }
      }

      // Validate query
      if (schemas.query) {
        const result = schemas.query.safeParse(req.query);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error, 'query'));
        } else {
          req.query = result.data;
        }
      }

      // Validate params
      if (schemas.params) {
        const result = schemas.params.safeParse(req.params);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error, 'params'));
        } else {
          req.params = result.data;
        }
      }

      // If any errors, return 400
      if (errors.length > 0) {
        log.warn({ errors, path: req.path }, 'Validation failed');

        const response: ValidationErrorResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: errors,
          },
        };

        return res.status(400).json(response);
      }

      next();
    } catch (error) {
      // Unexpected error during validation
      log.error({ error }, 'Validation middleware error');
      next(error);
    }
  };
}

/**
 * Format Zod errors into a consistent structure
 */
function formatZodErrors(
  error: ZodError,
  prefix: string
): Array<{ path: string; message: string }> {
  return error.errors.map((e) => ({
    path: prefix + (e.path.length > 0 ? '.' + e.path.join('.') : ''),
    message: e.message,
  }));
}

/**
 * Async validation middleware for cases where validation needs async operations
 */
export function validateAsync(schemas: ValidationSchemas) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const log = getLogger({ middleware: 'validateAsync' });
    const errors: Array<{ path: string; message: string }> = [];

    try {
      // Validate body
      if (schemas.body) {
        const result = await schemas.body.safeParseAsync(req.body);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error, 'body'));
        } else {
          req.body = result.data;
        }
      }

      // Validate query
      if (schemas.query) {
        const result = await schemas.query.safeParseAsync(req.query);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error, 'query'));
        } else {
          req.query = result.data;
        }
      }

      // Validate params
      if (schemas.params) {
        const result = await schemas.params.safeParseAsync(req.params);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error, 'params'));
        } else {
          req.params = result.data;
        }
      }

      if (errors.length > 0) {
        log.warn({ errors, path: req.path }, 'Validation failed');

        const response: ValidationErrorResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: errors,
          },
        };

        return res.status(400).json(response);
      }

      next();
    } catch (error) {
      log.error({ error }, 'Async validation middleware error');
      next(error);
    }
  };
}
