import type { Express } from "express";
import { createServer, type Server } from "http";
import { sessionMiddleware } from "../auth";

// Import modular route handlers
import healthRoutes from "./health.routes";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import productRoutes from "./product.routes";
import guidelineRoutes from "./guideline.routes";
import contentRoutes from "./content.routes";
import adminRoutes from "./admin.routes";
import cmsRoutes from "./cms.routes";

// Import external tool routes (already modularized)
import { registerSeoMetaRoutes } from "../../tools/headline-tools/seo-meta-generator/server/routes";
import { registerGoogleAdsRoutes } from "../../tools/headline-tools/google-ads-copy-generator/server/routes";
import { registerContentWriterRoutes } from "../../tools/headline-tools/content-writer-v2/server/routes";
import { registerSocialContentRoutes } from "../social-content-routes";
import { registerSocialContentRoutesNew } from "../../tools/headline-tools/social-content-generator/server/social-content-routes";

/**
 * Register all routes on the Express app
 * This is the main entry point for route registration
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware - required for authentication
  app.use(sessionMiddleware);

  // Health check routes (no auth required)
  app.use(healthRoutes);

  // Auth routes - /api/auth/*
  app.use("/api/auth", authRoutes);

  // User routes - /api/user/* and /api/notifications (also /api/debug/session)
  app.use("/api/user", userRoutes);
  // Notifications are also accessible at /api/notifications for legacy support
  app.use("/api", userRoutes);

  // Product routes - /api/products, /api/subscriptions, /api/tier-subscriptions, etc.
  app.use("/api", productRoutes);

  // Guideline routes - /api/guideline-profiles/*
  app.use("/api/guideline-profiles", guidelineRoutes);

  // Content routes - /api/generated-content, /api/content-feedback, /api/content-writer, /api/langgraph
  app.use("/api", contentRoutes);

  // Admin routes - /api/admin/*
  app.use("/api/admin", adminRoutes);

  // CMS routes - /api/crawl/*, /api/qc/*, /api/crawls/*, /api/pages/*
  app.use("/api", cmsRoutes);

  // External tool routes (already modularized in tools/ directory)
  registerSeoMetaRoutes(app);
  registerGoogleAdsRoutes(app);
  registerContentWriterRoutes(app);

  // Social content routes (legacy + new)
  registerSocialContentRoutes(app);
  registerSocialContentRoutesNew(app);

  // Create and return HTTP server
  const httpServer = createServer(app);
  return httpServer;
}

// Re-export for backward compatibility if needed
export { healthRoutes, authRoutes, userRoutes, productRoutes, guidelineRoutes, contentRoutes, adminRoutes, cmsRoutes };
