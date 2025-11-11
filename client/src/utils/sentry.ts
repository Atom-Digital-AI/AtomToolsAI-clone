import * as Sentry from "@sentry/react";

/**
 * Utility functions for Sentry error tracking
 */

/**
 * Capture an exception with additional context
 */
export function captureException(
  error: Error,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    level?: "fatal" | "error" | "warning" | "info" | "debug";
  }
) {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.error("Error (Sentry not configured):", error, context);
    return;
  }

  Sentry.captureException(error, {
    tags: context?.tags,
    extra: context?.extra,
    level: context?.level || "error",
  });
}

/**
 * Capture a message (non-error event)
 */
export function captureMessage(
  message: string,
  level: "fatal" | "error" | "warning" | "info" | "debug" = "info",
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  }
) {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.log(`[${level.toUpperCase()}]`, message, context);
    return;
  }

  Sentry.captureMessage(message, {
    level,
    tags: context?.tags,
    extra: context?.extra,
  });
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  level: "fatal" | "error" | "warning" | "info" | "debug" = "info",
  data?: Record<string, any>
) {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    return;
  }

  Sentry.addBreadcrumb({
    message,
    category: category || "default",
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set additional context/tags for the current scope
 */
export function setContext(name: string, context: Record<string, any>) {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    return;
  }

  Sentry.setContext(name, context);
}

/**
 * Set a tag for the current scope
 */
export function setTag(key: string, value: string) {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    return;
  }

  Sentry.setTag(key, value);
}

/**
 * Wrap an async function to automatically capture errors
 */
export function withErrorTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  }
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureException(error as Error, context);
      throw error;
    }
  }) as T;
}

