import { storage } from './storage';
import { crawlWebsiteWithEarlyExit } from './utils/web-crawler';
import type { InsertCrawlJob } from '@shared/schema';

/**
 * Starts a background crawl job
 * Creates the job in the database and runs the crawl asynchronously
 */
export async function startBackgroundCrawl(
  userId: string,
  guidelineProfileId: string,
  homepageUrl: string,
  exclusionPatterns: string[] = []
): Promise<string> {
  // Create the crawl job
  const job = await storage.createCrawlJob({
    userId,
    guidelineProfileId,
    homepageUrl,
    exclusionPatterns,
  });

  // Start the crawl in the background (don't await)
  runCrawlJob(job.id, userId, homepageUrl, exclusionPatterns).catch(async (error) => {
    console.error(`Background crawl job ${job.id} failed:`, error);
    
    // Check if the job was cancelled (don't overwrite cancelled status with failed)
    const currentJob = await storage.getCrawlJob(job.id, userId);
    if (currentJob?.status === 'cancelled') {
      console.log(`Job ${job.id} was cancelled, not marking as failed`);
      return;
    }

    // Update job status to failed
    storage.updateCrawlJob(job.id, userId, {
      status: 'failed',
      error: error.message || 'Unknown error occurred',
      completedAt: new Date(),
    }).catch(console.error);
  });

  return job.id;
}

/**
 * Runs the actual crawl job
 * Updates progress in the database as it runs
 * Checks for cancellation periodically
 */
async function runCrawlJob(
  jobId: string,
  userId: string,
  homepageUrl: string,
  exclusionPatterns: string[]
): Promise<void> {
  // Check and transition to running atomically
  const preCheck = await storage.getCrawlJob(jobId, userId);
  if (preCheck?.status !== 'pending') {
    console.log(`Job ${jobId} is not pending (status: ${preCheck?.status}), skipping`);
    return; // Don't start if already cancelled or in unexpected state
  }

  // Immediately update to running (minimize race window)
  await storage.updateCrawlJob(jobId, userId, {
    status: 'running',
    startedAt: new Date(),
  });
  
  // Double-check status immediately after update
  const postRunningCheck = await storage.getCrawlJob(jobId, userId);
  if (postRunningCheck?.status !== 'running') {
    console.log(`Job ${jobId} was cancelled during startup, aborting`);
    return;
  }

  // Run the crawler with progress updates
  const result = await crawlWebsiteWithEarlyExit(
    homepageUrl,
    250, // max pages
    exclusionPatterns,
    async (progress) => {
      // Check if job has been cancelled
      const job = await storage.getCrawlJob(jobId, userId);
      if (job?.status === 'cancelled') {
        // Stop the crawl by throwing an error
        throw new Error('Crawl cancelled by user');
      }

      // Update progress in database (as percentage)
      await storage.updateCrawlJob(jobId, userId, {
        progress: Math.round((progress.currentPage / 250) * 100),
      });
    }
  );

  // Final atomic check and update - only update if still running
  const finalCheck = await storage.getCrawlJob(jobId, userId);
  if (finalCheck?.status !== 'running') {
    console.log(`Job ${jobId} status changed to ${finalCheck?.status}, not marking as completed`);
    return; // Don't update if status changed (cancelled, failed, etc.)
  }

  // Update job with final results (include all crawled URLs for manual tagging)
  await storage.updateCrawlJob(jobId, userId, {
    status: 'completed',
    progress: 100,
    results: {
      home_page: result.home_page,
      about_page: result.about_page,
      service_pages: result.service_pages,
      blog_articles: result.blog_articles,
      totalPagesCrawled: result.totalPagesCrawled,
      reachedLimit: result.reachedLimit,
      crawledUrls: result.crawledPages.map(p => ({ url: p.url, title: p.title })),
    },
    completedAt: new Date(),
  });

  // TODO: Send notification to user that crawl is complete
}

/**
 * Gets the status of a crawl job
 */
export async function getCrawlJobStatus(jobId: string, userId: string) {
  const job = await storage.getCrawlJob(jobId, userId);
  if (!job) {
    throw new Error('Crawl job not found');
  }

  const results = job.results as any;

  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    results: results || null,
    error: job.error,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  };
}

/**
 * Cancels a running crawl job
 */
export async function cancelCrawlJob(jobId: string, userId: string): Promise<boolean> {
  return await storage.cancelCrawlJob(jobId, userId);
}
