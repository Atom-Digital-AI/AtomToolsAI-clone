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
  runCrawlJob(job.id, userId, homepageUrl, exclusionPatterns).catch((error) => {
    console.error(`Background crawl job ${job.id} failed:`, error);
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
 */
async function runCrawlJob(
  jobId: string,
  userId: string,
  homepageUrl: string,
  exclusionPatterns: string[]
): Promise<void> {
  // Update status to running
  await storage.updateCrawlJob(jobId, userId, {
    status: 'running',
    startedAt: new Date(),
  });

  // Run the crawler with progress updates
  const result = await crawlWebsiteWithEarlyExit(
    homepageUrl,
    250, // max pages
    exclusionPatterns,
    async (progress) => {
      // Update progress in database (as percentage)
      await storage.updateCrawlJob(jobId, userId, {
        progress: Math.round((progress.currentPage / 250) * 100),
      });
    }
  );

  // Update job with final results
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
