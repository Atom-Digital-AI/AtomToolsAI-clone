import type { Express } from "express";
import { storage } from "./storage";
import { insertCmsPageSchema, updateCmsPageSchema } from "@shared/schema";
// Admin middleware function
const isAdmin = async (req: any, res: any, next: any) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Unauthorized - No session" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Forbidden - Admin access required" });
    }

    next();
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export function registerCmsRoutes(app: Express) {
  // Admin-only CMS routes
  
  // Get all CMS pages
  app.get("/api/cms/pages", isAdmin, async (req, res) => {
    try {
      const { type } = req.query;
      const pages = await storage.getCmsPages(type as string);
      res.json(pages);
    } catch (error) {
      console.error("Error fetching CMS pages:", error);
      res.status(500).json({ message: "Failed to fetch pages" });
    }
  });

  // Get single CMS page
  app.get("/api/cms/pages/:id", isAdmin, async (req, res) => {
    try {
      const page = await storage.getCmsPage(req.params.id);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      res.json(page);
    } catch (error) {
      console.error("Error fetching CMS page:", error);
      res.status(500).json({ message: "Failed to fetch page" });
    }
  });

  // Create new CMS page
  app.post("/api/cms/pages", isAdmin, async (req: any, res) => {
    try {
      const validatedData = insertCmsPageSchema.parse(req.body);
      const authorId = req.session.userId;
      
      const page = await storage.createCmsPage(authorId, validatedData);
      res.status(201).json(page);
    } catch (error: any) {
      console.error("Error creating CMS page:", error);
      res.status(400).json({ message: "Failed to create page", error: error?.message || "Unknown error" });
    }
  });

  // Update CMS page
  app.put("/api/cms/pages/:id", isAdmin, async (req, res) => {
    try {
      const validatedData = updateCmsPageSchema.parse(req.body);
      const page = await storage.updateCmsPage(req.params.id, validatedData);
      res.json(page);
    } catch (error: any) {
      console.error("Error updating CMS page:", error);
      res.status(400).json({ message: "Failed to update page", error: error?.message || "Unknown error" });
    }
  });

  // Publish CMS page
  app.post("/api/cms/pages/:id/publish", isAdmin, async (req, res) => {
    try {
      const page = await storage.publishCmsPage(req.params.id);
      res.json(page);
    } catch (error: any) {
      console.error("Error publishing CMS page:", error);
      res.status(400).json({ message: "Failed to publish page", error: error?.message || "Unknown error" });
    }
  });

  // Delete CMS page
  app.delete("/api/cms/pages/:id", isAdmin, async (req, res) => {
    try {
      const success = await storage.deleteCmsPage(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Page not found" });
      }
      res.json({ message: "Page deleted successfully" });
    } catch (error) {
      console.error("Error deleting CMS page:", error);
      res.status(500).json({ message: "Failed to delete page" });
    }
  });

  // Public routes for fetching published content
  
  // Get published page by slug
  app.get("/api/public/pages/:slug", async (req, res) => {
    try {
      const page = await storage.getCmsPageBySlug(req.params.slug);
      if (!page || page.status !== 'published') {
        return res.status(404).json({ message: "Page not found" });
      }
      res.json(page);
    } catch (error) {
      console.error("Error fetching public page:", error);
      res.status(500).json({ message: "Failed to fetch page" });
    }
  });

  // Get published pages by type
  app.get("/api/public/pages", async (req, res) => {
    try {
      const { type } = req.query;
      let pages = await storage.getCmsPages(type as string);
      
      // Filter to only published pages
      pages = pages.filter(page => page.status === 'published');
      
      res.json(pages);
    } catch (error) {
      console.error("Error fetching public pages:", error);
      res.status(500).json({ message: "Failed to fetch pages" });
    }
  });
}