import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().min(10),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Contact form endpoint
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, message } = contactSchema.parse(req.body);
      
      // TODO: Implement email sending logic using nodemailer or similar
      // For now, we'll just log the message
      console.log("Contact form submission:", { name, email, message });
      
      res.json({ success: true, message: "Message received successfully" });
    } catch (error) {
      console.error("Contact form error:", error);
      res.status(400).json({ 
        success: false, 
        message: "Invalid form data" 
      });
    }
  });

  // User registration endpoint
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: "User already exists" 
        });
      }
      
      // Create new user
      const user = await storage.createUser(userData);
      
      res.json({ 
        success: true, 
        message: "Account created successfully",
        user: { id: user.id, username: user.username }
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(400).json({ 
        success: false, 
        message: "Failed to create account" 
      });
    }
  });

  // Google OAuth placeholder endpoint
  app.get("/api/auth/google", (req, res) => {
    // TODO: Implement Google OAuth flow
    res.status(501).json({ 
      success: false, 
      message: "Google OAuth not yet implemented" 
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
