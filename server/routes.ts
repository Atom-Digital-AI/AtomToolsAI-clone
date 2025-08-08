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
      console.log("Login successful for user:", user.id, "Session ID:", req.sessionID);
      
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
    console.log("POST logout - Session ID:", req.sessionID, "User ID:", req.session.userId);
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Could not log out" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/logout", (req, res) => {
    console.log("GET logout - Session ID:", req.sessionID, "User ID:", req.session.userId);
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.clearCookie("connect.sid");
      res.redirect("/");
    });
  });

  // Get current user endpoint
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = (req as any).user;
    console.log("User authenticated:", user.id, "Session ID:", req.sessionID);
    res.json({
      id: user.id,
      username: user.username,
      email: user.email
    });
  });

  // Change password endpoint
  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }

      // Get current user to verify password
      const user = await storage.getUser(userId);
      if (!user || user.password !== currentPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Update password
      await storage.updateUserPassword(userId, newPassword);
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Download account data endpoint
  app.get("/api/auth/account-data", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      
      // Get user data
      const user = await storage.getUser(userId);
      const subscriptions = await storage.getUserSubscriptions(userId);
      
      const accountData = {
        user: {
          id: user?.id,
          username: user?.username,
          email: user?.email,
          createdAt: user?.createdAt
        },
        subscriptions: subscriptions,
        exportDate: new Date().toISOString()
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="atomtools-account-data-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(accountData);
    } catch (error) {
      console.error("Download account data error:", error);
      res.status(500).json({ message: "Failed to export account data" });
    }
  });

  // Delete account endpoint
  app.delete("/api/auth/account", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ message: "Password confirmation is required" });
      }

      // Verify password
      const user = await storage.getUser(userId);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Password is incorrect" });
      }

      // Delete user and related data
      await storage.deleteUser(userId);
      
      // Destroy session
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destroy error:", err);
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Account deleted successfully" });
      });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Debug endpoint to check session status
  app.get("/api/debug/session", (req, res) => {
    res.json({
      sessionID: req.sessionID,
      userId: req.session.userId,
      hasSession: !!req.session,
      cookies: req.headers.cookie,
    });
  });

  // Product routes
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Get products with user subscription status
  app.get("/api/products/with-status", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const products = await storage.getProductsWithSubscriptionStatus(userId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products with status:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Subscription routes
  app.get("/api/subscriptions", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const subscriptions = await storage.getUserSubscriptions(userId);
      res.json(subscriptions);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  app.post("/api/subscriptions", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { productId } = req.body;

      if (!productId) {
        return res.status(400).json({ message: "Product ID is required" });
      }

      // Check if product exists
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Subscribe user
      const subscription = await storage.subscribeUser({ userId, productId });
      res.json(subscription);
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  app.delete("/api/subscriptions/:productId", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { productId } = req.params;

      const success = await storage.unsubscribeUser(userId, productId);
      if (success) {
        res.json({ message: "Unsubscribed successfully" });
      } else {
        res.status(404).json({ message: "Subscription not found" });
      }
    } catch (error) {
      console.error("Error removing subscription:", error);
      res.status(500).json({ message: "Failed to remove subscription" });
    }
  });

  // Check product access
  app.get("/api/products/:productId/access", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { productId } = req.params;

      const isSubscribed = await storage.isUserSubscribed(userId, productId);
      res.json({ hasAccess: isSubscribed });
    } catch (error) {
      console.error("Error checking product access:", error);
      res.status(500).json({ message: "Failed to check access" });
    }
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
