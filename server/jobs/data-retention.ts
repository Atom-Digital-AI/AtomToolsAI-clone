import { db } from '../db';
import { errorLogs, langgraphThreads } from '@shared/schema';
import { lt, and, or, eq, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

/**
 * Cleanup stuck threads that have been "active" or "paused" for too long
 * Marks them as "timed_out" to prevent resource leaks
 */
export async function cleanupStuckThreads() {
  const now = new Date();
  // Mark threads as timed out if they've been active/paused for more than 2 hours
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  logger.info('[Thread Timeout] Starting stuck thread cleanup');

  try {
    // Find and update stuck threads
    const stuckThreads = await db.update(langgraphThreads)
      .set({
        status: 'failed',
        metadata: sql`
          CASE
            WHEN metadata IS NULL THEN '{"timedOut": true, "timeoutReason": "Thread stuck in active/paused state for > 2 hours"}'::jsonb
            ELSE metadata || '{"timedOut": true, "timeoutReason": "Thread stuck in active/paused state for > 2 hours"}'::jsonb
          END
        ` as any
      })
      .where(
        and(
          lt(langgraphThreads.updatedAt, twoHoursAgo),
          or(
            eq(langgraphThreads.status, 'active'),
            eq(langgraphThreads.status, 'paused')
          )
        )
      )
      .returning();

    if (stuckThreads.length > 0) {
      logger.warn(`[Thread Timeout] Marked ${stuckThreads.length} stuck threads as failed (timed out)`);
      stuckThreads.forEach(thread => {
        logger.warn(`[Thread Timeout] Thread ${thread.id} timed out (last updated: ${thread.updatedAt})`);
      });
    } else {
      logger.info('[Thread Timeout] No stuck threads found');
    }

    return {
      success: true,
      timedOutThreads: stuckThreads.length,
    };
  } catch (error) {
    logger.error('[Thread Timeout] Stuck thread cleanup failed:', error);
    throw error;
  }
}

/**
 * Data retention job to comply with GDPR storage limitation principle
 * Run this daily via cron or scheduled job
 */
export async function cleanupOldData() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  logger.info('[Data Retention] Starting cleanup job');

  try {
    // First, cleanup stuck threads (run this before deleting old data)
    await cleanupStuckThreads();

    // Delete error logs older than 90 days (configurable based on requirements)
    const deletedErrors = await db.delete(errorLogs)
      .where(lt(errorLogs.createdAt, ninetyDaysAgo))
      .returning();

    logger.info(`[Data Retention] Deleted ${deletedErrors.length} old error logs`);

    // Delete completed/cancelled/failed LangGraph threads older than 30 days
    const deletedThreads = await db.delete(langgraphThreads)
      .where(
        and(
          lt(langgraphThreads.updatedAt, thirtyDaysAgo),
          or(
            eq(langgraphThreads.status, 'completed'),
            eq(langgraphThreads.status, 'cancelled'),
            eq(langgraphThreads.status, 'failed')
          )
        )
      )
      .returning();

    logger.info(`[Data Retention] Deleted ${deletedThreads.length} old LangGraph threads`);

    // Clean up expired sessions (connect-pg-simple handles this automatically, but double-check)
    await db.execute(`
      DELETE FROM sessions 
      WHERE expire < NOW()
    `);

    logger.info('[Data Retention] Cleanup job completed successfully');

    return {
      success: true,
      deletedErrors: deletedErrors.length,
      deletedThreads: deletedThreads.length,
    };
  } catch (error) {
    logger.error('[Data Retention] Cleanup job failed:', error);
    throw error;
  }
}

/**
 * Run data retention cleanup at startup and schedule for daily execution
 * Also run stuck thread cleanup more frequently (hourly)
 * In production, consider using a proper job scheduler like node-cron or external cron
 */
export function scheduleDataRetention() {
  // Run cleanup once at startup
  cleanupOldData().catch(err => {
    logger.error('[Data Retention] Initial cleanup failed:', err);
  });

  // Schedule full cleanup to run daily
  const DAILY_MS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    cleanupOldData().catch(err => {
      logger.error('[Data Retention] Scheduled cleanup failed:', err);
    });
  }, DAILY_MS);

  // Schedule stuck thread cleanup to run every hour (more frequent)
  const HOURLY_MS = 60 * 60 * 1000;
  setInterval(() => {
    cleanupStuckThreads().catch(err => {
      logger.error('[Thread Timeout] Hourly stuck thread cleanup failed:', err);
    });
  }, HOURLY_MS);

  logger.info('[Data Retention] Scheduled daily cleanup job and hourly stuck thread check');
}
