import { db } from '../db';
import { errorLogs, langgraphThreads } from '@shared/schema';
import { lt, and, or, eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

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
    // Delete error logs older than 90 days (configurable based on requirements)
    const deletedErrors = await db.delete(errorLogs)
      .where(lt(errorLogs.createdAt, ninetyDaysAgo))
      .returning();

    logger.info(`[Data Retention] Deleted ${deletedErrors.length} old error logs`);

    // Delete completed/cancelled LangGraph threads older than 30 days
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
 * In production, consider using a proper job scheduler like node-cron or external cron
 */
export function scheduleDataRetention() {
  // Run once at startup
  cleanupOldData().catch(err => {
    logger.error('[Data Retention] Initial cleanup failed:', err);
  });

  // Schedule to run daily at 2 AM
  const DAILY_MS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    cleanupOldData().catch(err => {
      logger.error('[Data Retention] Scheduled cleanup failed:', err);
    });
  }, DAILY_MS);

  logger.info('[Data Retention] Scheduled daily cleanup job');
}
