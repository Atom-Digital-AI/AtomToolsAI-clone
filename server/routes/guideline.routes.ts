import { Router } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import {
  insertGuidelineProfileSchema,
  updateGuidelineProfileSchema,
} from "@shared/schema";
import { analyzeBrandGuidelines } from "../utils/brand-analyzer";

const router = Router();

/**
 * Get user's guideline profiles
 */
router.get("/", requireAuth, async (req: any, res) => {
  try {
    const type = req.query.type as "brand" | "regulatory" | undefined;
    const profiles = await storage.getUserGuidelineProfiles(
      req.user.id,
      type
    );
    res.json(profiles);
  } catch (error) {
    console.error("Error fetching guideline profiles:", error);
    res.status(500).json({ message: "Failed to fetch guideline profiles" });
  }
});

/**
 * Get single guideline profile by ID
 */
router.get("/:id", requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    const profile = await storage.getGuidelineProfile(id, req.user.id);

    if (!profile) {
      return res.status(404).json({ message: "Guideline profile not found" });
    }

    res.json(profile);
  } catch (error) {
    console.error("Error fetching guideline profile:", error);
    res.status(500).json({ message: "Failed to fetch guideline profile" });
  }
});

/**
 * Create new guideline profile
 */
router.post("/", requireAuth, async (req: any, res) => {
  try {
    const profileData = insertGuidelineProfileSchema.parse(req.body);
    const profile = await storage.createGuidelineProfile({
      ...profileData,
      userId: req.user.id,
    });
    res.json(profile);
  } catch (error) {
    console.error("Error creating guideline profile:", error);
    res.status(400).json({ message: "Failed to create guideline profile" });
  }
});

/**
 * Update guideline profile
 */
router.put("/:id", requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    const profileData = updateGuidelineProfileSchema.parse(req.body);
    const profile = await storage.updateGuidelineProfile(
      id,
      req.user.id,
      profileData
    );

    if (!profile) {
      return res.status(404).json({ message: "Guideline profile not found" });
    }

    res.json(profile);
  } catch (error) {
    console.error("Error updating guideline profile:", error);
    res.status(400).json({ message: "Failed to update guideline profile" });
  }
});

/**
 * Delete guideline profile
 */
router.delete("/:id", requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    const deleted = await storage.deleteGuidelineProfile(id, req.user.id);

    if (!deleted) {
      return res
        .status(404)
        .json({ message: "Guideline profile not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting guideline profile:", error);
    res.status(500).json({ message: "Failed to delete guideline profile" });
  }
});

/**
 * Auto-populate brand guidelines from website
 */
router.post("/auto-populate", requireAuth, async (req: any, res) => {
  try {
    const { domainUrl } = req.body;
    const userId = req.user.id;

    if (!domainUrl || typeof domainUrl !== "string") {
      return res.status(400).json({
        message:
          "Domain URL is required. Please provide a valid website URL (e.g., https://example.com)",
      });
    }

    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({
        message:
          "Auto-populate feature is not configured. Please add ANTHROPIC_API_KEY to enable this feature.",
      });
    }

    // analyzeBrandGuidelines will validate and normalize the URL internally
    const guidelines = await analyzeBrandGuidelines(domainUrl, userId);
    res.json(guidelines);
  } catch (error) {
    console.error("Error auto-populating brand guidelines:", error);
    const errorMessage =
      (error as any)?.message || "Failed to analyze website";

    // Return appropriate status code based on error type
    const statusCode =
      errorMessage.includes("Invalid URL") ||
      errorMessage.includes("Cannot crawl") ||
      errorMessage.includes("Domain not found") ||
      errorMessage.includes("Only HTTPS")
        ? 400
        : 500;

    res.status(statusCode).json({ message: errorMessage });
  }
});

/**
 * Auto-populate brand guidelines from PDF upload
 */
router.post("/auto-populate-pdf", requireAuth, async (req: any, res) => {
  try {
    const { pdfBase64 } = req.body;
    const userId = req.user.id;

    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return res.status(400).json({
        message: "PDF data is required. Please upload a valid PDF file.",
      });
    }

    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({
        message:
          "PDF upload feature is not configured. Please add ANTHROPIC_API_KEY to enable this feature.",
      });
    }

    // Server-side validation: Decode base64 and verify PDF signature
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = Buffer.from(pdfBase64, "base64");
    } catch (error) {
      return res.status(400).json({
        message: "Invalid PDF data. The file appears to be corrupted.",
      });
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (pdfBuffer.length > maxSize) {
      return res.status(413).json({
        message: `PDF file is too large (${(
          pdfBuffer.length /
          1024 /
          1024
        ).toFixed(1)}MB). Maximum size is 10MB.`,
      });
    }

    // Validate PDF signature (PDFs start with "%PDF-")
    const pdfSignature = pdfBuffer.slice(0, 5).toString("ascii");
    if (pdfSignature !== "%PDF-") {
      return res.status(400).json({
        message: "Invalid file type. Only PDF files are accepted.",
      });
    }

    // Import the PDF analyzer
    const { analyzePdfForBrandGuidelines } = await import(
      "../utils/pdf-brand-analyzer"
    );

    const guidelines = await analyzePdfForBrandGuidelines(
      pdfBase64,
      userId
    );
    res.json(guidelines);
  } catch (error) {
    console.error("Error analyzing PDF brand guidelines:", error);
    const errorMessage = (error as any)?.message || "Failed to analyze PDF";

    // Return appropriate status code based on error type
    const statusCode =
      errorMessage.includes("Invalid") ||
      errorMessage.includes("corrupted") ||
      errorMessage.includes("too large")
        ? 400
        : 500;

    res.status(statusCode).json({ message: errorMessage });
  }
});

/**
 * Discover context pages from homepage URL with intelligent crawling
 */
router.post("/discover-context-pages", requireAuth, async (req: any, res) => {
  try {
    const { homepageUrl } = req.body;
    const userId = req.user.id;

    if (!homepageUrl || typeof homepageUrl !== "string") {
      return res.status(400).json({
        message: "Homepage URL is required",
      });
    }

    // Import the web crawler utility
    const { discoverContextPages } = await import("../utils/web-crawler");
    const { validateAndNormalizeUrl } = await import("../utils/url-validator");

    // Validate and normalize the URL
    const validatedUrl = await validateAndNormalizeUrl(homepageUrl);

    // Discover and categorize pages with intelligent crawling (up to 250 pages, early exit)
    const result = await discoverContextPages(validatedUrl);

    // Return result without crawledPages in response (keep it server-side if needed)
    // Frontend will cache the result for fallback scenarios
    res.json({
      home_page: result.home_page,
      about_page: result.about_page,
      service_pages: result.service_pages,
      blog_articles: result.blog_articles,
      totalPagesCrawled: result.totalPagesCrawled,
      reachedLimit: result.reachedLimit,
    });
  } catch (error) {
    console.error("Error discovering context pages:", error);
    const errorMessage =
      (error as any)?.message || "Failed to discover context pages";

    // Return appropriate status code based on error type
    const statusCode =
      errorMessage.includes("Invalid URL") ||
      errorMessage.includes("Cannot crawl") ||
      errorMessage.includes("Domain not found") ||
      errorMessage.includes("Only HTTPS")
        ? 400
        : 500;

    res.status(statusCode).json({ message: errorMessage });
  }
});

/**
 * Fallback: Find service pages by URL pattern from initial crawl
 */
router.post("/find-services-by-pattern", requireAuth, async (req: any, res) => {
  try {
    const { exampleServiceUrl, homepageUrl } = req.body;
    const userId = req.user.id;

    if (!exampleServiceUrl || typeof exampleServiceUrl !== "string") {
      return res.status(400).json({
        message: "Example service page URL is required",
      });
    }

    if (!homepageUrl || typeof homepageUrl !== "string") {
      return res.status(400).json({
        message: "Homepage URL is required",
      });
    }

    // Import the web crawler utility
    const { findServicePagesByPattern, crawlWebsiteWithEarlyExit } =
      await import("../utils/web-crawler");
    const { validateAndNormalizeUrl } = await import("../utils/url-validator");

    // Validate URLs
    const validatedHomepage = await validateAndNormalizeUrl(homepageUrl);
    const validatedExample = await validateAndNormalizeUrl(exampleServiceUrl);

    // Re-crawl the site (this should be fast if called immediately after initial crawl due to caching)
    // In a production scenario, you'd cache this on the server or in a database
    const result = await crawlWebsiteWithEarlyExit(validatedHomepage, 250);

    // Find service pages matching the pattern
    const servicePages = findServicePagesByPattern(
      validatedExample,
      result.crawledPages,
      10
    );

    res.json({ service_pages: servicePages });
  } catch (error) {
    console.error("Error finding service pages by pattern:", error);
    const errorMessage =
      (error as any)?.message || "Failed to find service pages";
    res.status(500).json({ message: errorMessage });
  }
});

/**
 * Fallback: Extract blog posts from blog home page with pagination
 */
router.post("/extract-blog-posts", requireAuth, async (req: any, res) => {
  try {
    const { blogHomeUrl } = req.body;
    const userId = req.user.id;

    if (!blogHomeUrl || typeof blogHomeUrl !== "string") {
      return res.status(400).json({
        message: "Blog home page URL is required",
      });
    }

    // Import the web crawler utility
    const { extractBlogPostsFromPage } = await import("../utils/web-crawler");
    const { validateAndNormalizeUrl } = await import("../utils/url-validator");

    // Validate URL
    const validatedUrl = await validateAndNormalizeUrl(blogHomeUrl);

    // Extract blog posts with pagination
    const blogPosts = await extractBlogPostsFromPage(validatedUrl, 20, 5);

    res.json({ blog_articles: blogPosts });
  } catch (error) {
    console.error("Error extracting blog posts:", error);
    const errorMessage =
      (error as any)?.message || "Failed to extract blog posts";
    res.status(500).json({ message: errorMessage });
  }
});

/**
 * Get existing extracted context for a profile
 */
router.get("/:id/extracted-context", requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;

    // Verify the guideline profile belongs to the user
    const profile = await storage.getGuidelineProfile(id, req.user.id);
    if (!profile) {
      return res
        .status(404)
        .json({ message: "Guideline profile not found" });
    }

    // Get all extracted context content
    const contextContent = await storage.getBrandContextContent(id);

    // Group by URL type and get metadata
    const groupedContent = {
      home: contextContent.find((c) => c.urlType === "home"),
      about: contextContent.find((c) => c.urlType === "about"),
      services: contextContent.filter((c) => c.urlType === "service"),
      blogs: contextContent.filter((c) => c.urlType === "blog"),
      totalPages: contextContent.length,
      extractedAt:
        contextContent.length > 0 ? contextContent[0].extractedAt : null,
    };

    res.json(groupedContent);
  } catch (error) {
    console.error("Error fetching extracted context:", error);
    res.status(500).json({ message: "Failed to fetch extracted context" });
  }
});

/**
 * Extract and save brand context from URLs
 */
router.post("/:id/extract-context", requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { contextUrls } = req.body;

    // Verify the guideline profile belongs to the user
    const profile = await storage.getGuidelineProfile(id, req.user.id);
    if (!profile) {
      return res
        .status(404)
        .json({ message: "Guideline profile not found" });
    }

    // Import utilities
    const { validateAndNormalizeUrl } = await import("../utils/url-validator");
    const { htmlToMarkdown } = await import("../utils/html-to-markdown");
    const axios = (await import("axios")).default;

    // Delete existing context content and embeddings for this profile
    await storage.deleteBrandContextContent(id);
    await storage.deleteBrandEmbeddings(req.user.id, id); // SECURITY: Pass userId for tenant isolation

    const urlsToProcess: Array<{ url: string; type: string }> = [];

    // Collect all URLs to process
    if (contextUrls?.home_page) {
      urlsToProcess.push({ url: contextUrls.home_page, type: "home" });
    }
    if (contextUrls?.about_page) {
      urlsToProcess.push({ url: contextUrls.about_page, type: "about" });
    }
    if (contextUrls?.service_pages) {
      contextUrls.service_pages.forEach((url: string) => {
        if (url) urlsToProcess.push({ url, type: "service" });
      });
    }
    if (contextUrls?.blog_articles) {
      contextUrls.blog_articles.forEach((url: string) => {
        if (url) urlsToProcess.push({ url, type: "blog" });
      });
    }

    const results = [];
    const errors = [];

    // Process each URL
    for (const { url, type } of urlsToProcess) {
      try {
        // Validate URL (security check)
        const validatedUrl = await validateAndNormalizeUrl(url);

        // Fetch page content
        const response = await axios.get(validatedUrl, {
          timeout: 10000,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; BrandContextBot/1.0)",
          },
        });

        // Convert HTML to markdown
        const { markdown, title } = htmlToMarkdown(
          response.data,
          validatedUrl
        );

        // Save to database
        await storage.createBrandContextContent({
          guidelineProfileId: id,
          url: validatedUrl,
          urlType: type,
          markdownContent: markdown,
          pageTitle: title,
        });

        results.push({ url: validatedUrl, type, title, success: true });
      } catch (error: any) {
        console.error(`Error processing ${url}:`, error.message);
        errors.push({ url, type, error: error.message });
      }
    }

    // Generate embeddings for the extracted context (async, don't wait)
    if (results.length > 0) {
      const { ragService } = await import("../utils/rag-service");
      const contextContents = await storage.getBrandContextContent(id);

      // Process embeddings in background (includes userId for security)
      ragService
        .processMultipleContexts(
          req.user.id, // SECURITY: Pass userId for tenant isolation
          id,
          contextContents.map((ctx) => ({
            content: ctx.markdownContent,
            contextContentId: ctx.id,
            urlType: ctx.urlType,
            url: ctx.url,
          }))
        )
        .catch((err) => console.error("Error generating embeddings:", err));
    }

    res.json({
      success: true,
      processed: results.length,
      failed: errors.length,
      results,
      errors,
    });
  } catch (error) {
    console.error("Error extracting brand context:", error);
    res.status(500).json({ message: "Failed to extract brand context" });
  }
});

export default router;
