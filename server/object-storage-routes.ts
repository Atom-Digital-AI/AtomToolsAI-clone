import type { Express } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { requireAuth, requireAdmin } from "./auth";

export async function registerObjectStorageRoutes(app: Express) {
  const objectStorageService = new ObjectStorageService();

  // Endpoint to serve uploaded images
  app.get("/images/:imagePath(*)", async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving image:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Endpoint to get upload URL for images (admin only)
  app.post("/api/images/upload", requireAdmin, async (req, res) => {
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Endpoint to confirm image upload and get the final URL (admin only)
  app.put("/api/images/confirm", requireAdmin, async (req, res) => {
    try {
      const { uploadURL } = req.body;
      
      if (!uploadURL) {
        return res.status(400).json({ error: "Upload URL is required" });
      }

      // Convert the upload URL to our serving URL
      const imagePath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      
      res.json({ imagePath });
    } catch (error) {
      console.error("Error confirming image upload:", error);
      res.status(500).json({ error: "Failed to confirm upload" });
    }
  });
}