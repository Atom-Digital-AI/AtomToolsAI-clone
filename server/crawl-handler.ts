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
  exclusionPatterns: string[] = [],
  inclusionPatterns: string[] = []
): Promise<string> {
  // Create the crawl job
  const job = await storage.createCrawlJob({
    userId,
    guidelineProfileId,
    homepageUrl,
    exclusionPatterns,
    inclusionPatterns,
  });

  // Start the crawl in the background (don't await)
  runCrawlJob(job.id, userId, homepageUrl, exclusionPatterns, inclusionPatterns).catch(async (error) => {
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
  exclusionPatterns: string[],
  inclusionPatterns: string[]
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
    inclusionPatterns,
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
  // Defensive check to ensure crawledPages is a valid array
  const crawledUrls = Array.isArray(result.crawledPages) 
    ? result.crawledPages.map(p => ({ url: p.url, title: p.title }))
    : [];
  
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
      crawledUrls,
    },
    completedAt: new Date(),
  });

  // Copy crawled URLs to the guideline profile for UI display with retry logic
  if (finalCheck.guidelineProfileId && crawledUrls.length > 0) {
    let retryCount = 0;
    const maxRetries = 3;
    let lastError: any;
    
    while (retryCount < maxRetries) {
      try {
        await storage.updateGuidelineProfile(finalCheck.guidelineProfileId, userId, {
          crawledUrls,
        });
        console.log(`✓ Updated guideline profile ${finalCheck.guidelineProfileId} with ${crawledUrls.length} crawled URLs`);
        break; // Success - exit retry loop
      } catch (error) {
        lastError = error;
        retryCount++;
        console.warn(`⚠️  Attempt ${retryCount}/${maxRetries} failed to update guideline profile ${finalCheck.guidelineProfileId}:`, error);
        
        if (retryCount < maxRetries) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }
    }
    
    if (retryCount === maxRetries) {
      // All retries exhausted - log critical error
      console.error(`🚨 CRITICAL: Failed to update guideline profile ${finalCheck.guidelineProfileId} after ${maxRetries} attempts`);
      console.error(`Last error:`, lastError);
      console.error(`Crawl job ${jobId} completed successfully. URLs are available in crawl job results (job.results.crawledUrls).`);
      console.error(`Manual intervention required: sync crawled_urls from crawl job to guideline profile.`);
    }
  }

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
