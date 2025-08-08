import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { sessionMiddleware, requireAuth, authenticateUser } from "./auth";

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().min(10),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(sessionMiddleware);

  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await authenticateUser(email, password);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      res.json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email 
        } 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Could not log out" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user endpoint
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = (req as any).user;
    res.json({
      id: user.id,
      username: user.username,
      email: user.email
    });
  });

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
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: "Email already exists" 
        });
      }
      
      // Create new user
      const user = await storage.createUser(userData);
      
      // Auto-login after signup
      req.session.userId = user.id;
      
      res.json({ 
        success: true, 
        message: "Account created successfully",
        user: { id: user.id, username: user.username, email: user.email }
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
