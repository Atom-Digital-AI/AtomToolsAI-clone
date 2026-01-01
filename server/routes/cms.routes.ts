import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { updatePageReviewSchema } from "@shared/schema";
import {
  startBackgroundCrawl,
  getCrawlJobStatus,
  cancelCrawlJob,
} from "../crawl-handler";
import { getLogger } from "../logging/logger";

const router = Router();
const log = getLogger({ module: 'cms.routes' });

// ============================================================================
// Crawl Job Routes
// ============================================================================

/**
 * Start a new crawl job
 */
router.post("/crawl/start", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const {
      guidelineProfileId,
      homepageUrl,
      exclusionPatterns,
      inclusionPatterns,
    } = req.body;

    // Validate inputs
    if (!homepageUrl) {
      return res.status(400).json({ message: "Homepage URL is required" });
    }

    // Validate URL format
    try {
      new URL(homepageUrl);
    } catch {
      return res.status(400).json({ message: "Invalid URL format" });
    }

    // Start the background crawl
    const jobId = await startBackgroundCrawl(
      userId,
      guidelineProfileId || null,
      homepageUrl,
      exclusionPatterns || [],
      inclusionPatterns || []
    );

    res.json({ jobId, message: "Crawl job started successfully" });
  } catch (error) {
    log.error({ error }, "Error starting crawl job");
    res.status(500).json({ message: "Failed to start crawl job" });
  }
});

/**
 * Get crawl job status
 */
router.get("/crawl/:jobId/status", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;

    const status = await getCrawlJobStatus(jobId, userId);
    res.json(status);
  } catch (error: any) {
    log.error({ error }, "Error getting crawl job status");
    if (error.message === "Crawl job not found") {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to get crawl job status" });
  }
});

/**
 * Cancel a crawl job
 */
router.post("/crawl/:jobId/cancel", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;

    const success = await cancelCrawlJob(jobId, userId);
    if (success) {
      res.json({ message: "Crawl job cancelled successfully" });
    } else {
      res.status(400).json({
        message:
          "Unable to cancel crawl job. It may have already completed or been cancelled.",
      });
    }
  } catch (error) {
    log.error({ error }, "Error cancelling crawl job");
    res.status(500).json({ message: "Failed to cancel crawl job" });
  }
});

// ============================================================================
// QC (Quality Control) Routes
// ============================================================================

/**
 * Get QC configuration
 */
router.get("/qc/config", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { guidelineProfileId, toolType } = req.query;

    const config = await storage.getQCConfiguration(
      userId,
      guidelineProfileId || undefined,
      toolType || undefined
    );

    if (config) {
      res.json(config);
    } else {
      // Return default configuration
      res.json({
        enabled: false,
        enabledAgents: [
          "proofreader",
          "brand_guardian",
          "fact_checker",
          "regulatory",
        ],
        autoApplyThreshold: 90,
        conflictResolutionStrategy: "human_review",
      });
    }
  } catch (error) {
    log.error({ error }, "Error getting QC configuration");
    res.status(500).json({ message: "Failed to get QC configuration" });
  }
});

/**
 * Create or update QC configuration
 */
router.post("/qc/config", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const {
      guidelineProfileId,
      toolType,
      enabled,
      enabledAgents,
      autoApplyThreshold,
      conflictResolutionStrategy,
      agentSettings,
    } = req.body;

    // Check if config exists
    const existing = await storage.getQCConfiguration(
      userId,
      guidelineProfileId,
      toolType
    );

    let config;
    if (existing) {
      // Update existing
      config = await storage.updateQCConfiguration(existing.id, userId, {
        enabled,
        enabledAgents,
        autoApplyThreshold,
        conflictResolutionStrategy,
        agentSettings,
      });
    } else {
      // Create new
      config = await storage.createQCConfiguration({
        userId,
        guidelineProfileId: guidelineProfileId || undefined,
        toolType: toolType || undefined,
        enabled,
        enabledAgents,
        autoApplyThreshold,
        conflictResolutionStrategy,
        agentSettings,
      });
    }

    res.json(config);
  } catch (error) {
    log.error({ error }, "Error saving QC configuration");
    res.status(500).json({ message: "Failed to save QC configuration" });
  }
});

/**
 * Get QC reports for a thread
 */
router.get("/qc/reports/:threadId", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { threadId } = req.params;

    const reports = await storage.getQCReportsByThread(threadId, userId);
    res.json(reports);
  } catch (error) {
    log.error({ error }, "Error getting QC reports");
    res.status(500).json({ message: "Failed to get QC reports" });
  }
});

/**
 * Save user's conflict resolution decision
 */
router.post("/qc/decisions", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const {
      guidelineProfileId,
      conflictType,
      conflictDescription,
      option1,
      option2,
      selectedOption,
      applyToFuture,
      pattern,
    } = req.body;

    const decision = await storage.createQCUserDecision({
      userId,
      guidelineProfileId: guidelineProfileId || undefined,
      conflictType,
      conflictDescription,
      option1,
      option2,
      selectedOption,
      applyToFuture,
      pattern: pattern || null,
    });

    res.json(decision);
  } catch (error) {
    log.error({ error }, "Error saving QC decision");
    res.status(500).json({ message: "Failed to save QC decision" });
  }
});

/**
 * Get user's saved QC decisions
 */
router.get("/qc/decisions", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { guidelineProfileId, conflictType, applyToFuture } = req.query;

    const filters: any = {};
    if (conflictType) filters.conflictType = conflictType;
    if (applyToFuture !== undefined)
      filters.applyToFuture = applyToFuture === "true";

    const decisions = await storage.getQCUserDecisions(
      userId,
      guidelineProfileId || undefined,
      filters
    );

    res.json(decisions);
  } catch (error) {
    log.error({ error }, "Error getting QC decisions");
    res.status(500).json({ message: "Failed to get QC decisions" });
  }
});

// ============================================================================
// Page Review Routes
// ============================================================================

/**
 * Get pages for a crawl with optional filters and pagination
 */
router.get("/crawls/:id/pages", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const crawlId = req.params.id;

    // Verify crawl belongs to user
    const crawl = await storage.getCrawlJob(crawlId, userId);
    if (!crawl) {
      return res.status(404).json({ message: "Crawl not found" });
    }

    // Get all pages with reviews
    const pagesWithReviews = await storage.getPageReviews(crawlId, userId);

    // Apply filters
    let filteredPages = pagesWithReviews;

    const { search, classification, exclude, page, limit } = req.query;

    // Filter by search query (URL, title, description)
    if (search && typeof search === "string") {
      const searchLower = search.toLowerCase();
      filteredPages = filteredPages.filter(
        (p: any) =>
          p.rawUrl.toLowerCase().includes(searchLower) ||
          p.title?.toLowerCase().includes(searchLower) ||
          p.metaDescription?.toLowerCase().includes(searchLower) ||
          p.review?.description?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by classification
    if (classification && typeof classification === "string") {
      filteredPages = filteredPages.filter(
        (p: any) => p.review?.classification === classification
      );
    }

    // Filter by exclude flag
    if (exclude !== undefined) {
      const excludeValue = exclude === "true";
      filteredPages = filteredPages.filter(
        (p: any) => p.review?.exclude === excludeValue
      );
    }

    // Get total count before pagination
    const totalCount = filteredPages.length;

    // Apply pagination
    const pageNum = page ? parseInt(page as string, 10) : 1;
    const pageLimit = limit ? parseInt(limit as string, 10) : 50;
    const offset = (pageNum - 1) * pageLimit;

    const paginatedPages = filteredPages.slice(offset, offset + pageLimit);

    res.json({
      pages: paginatedPages,
      total: totalCount,
      page: pageNum,
      limit: pageLimit,
      totalPages: Math.ceil(totalCount / pageLimit),
    });
  } catch (error) {
    log.error({ error }, "Error getting crawl pages");
    res.status(500).json({ message: "Failed to get crawl pages" });
  }
});

/**
 * Create or update page review
 */
router.patch("/pages/:id/review", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const pageId = req.params.id;

    // Validate using shared schema
    const validatedData = updatePageReviewSchema.parse(req.body);

    // Ensure at least one field is provided
    if (Object.keys(validatedData).length === 0) {
      return res
        .status(400)
        .json({ message: "At least one field must be provided" });
    }

    // Verify page belongs to user
    const page = await storage.getPageById(pageId, userId);
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    // Check if review exists
    const existingReview = await storage.getPageReview(pageId, userId);

    if (existingReview) {
      // Update existing review
      const updated = await storage.updatePageReview(
        existingReview.id,
        userId,
        validatedData
      );
      return res.json(updated);
    } else {
      // Create new review - ensure required fields
      if (!validatedData.classification) {
        return res
          .status(400)
          .json({ message: "Classification is required for new review" });
      }

      const created = await storage.createPageReview({
        pageId,
        userId,
        classification: validatedData.classification,
        description: validatedData.description,
        exclude: validatedData.exclude ?? false,
      });
      return res.json(created);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors,
      });
    }
    log.error({ error }, "Error updating page review");
    res.status(500).json({ message: "Failed to update page review" });
  }
});

export default router;
