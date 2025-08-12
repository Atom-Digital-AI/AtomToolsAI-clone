import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import path from "path";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema, insertGuidelineProfileSchema, updateGuidelineProfileSchema, completeProfileSchema } from "@shared/schema";
import { sessionMiddleware, requireAuth, authenticateUser } from "./auth";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";
import OpenAI from "openai";
import axios from "axios";
import * as cheerio from "cheerio";
import { sendVerificationEmail } from "./email";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { getGoogleAuthUrl, verifyGoogleToken } from "./oauth";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Utility functions from original Python app
async function fetchUrlContent(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // Remove script and style elements
    $('script, style').remove();
    
    // Extract text from various content elements
    const texts: string[] = [];
    $('p, h1, h2, h3, h4, h5, h6, div, span').each((i: number, elem: any) => {
      const text = $(elem).text().trim();
      if (text && text.length > 10) {
        texts.push(text);
      }
    });
    
    return texts.join(' ').trim();
  } catch (error) {
    console.error(`Error fetching URL ${url}:`, error);
    return null;
  }
}

function detectLanguage(text: string): string {
  // Simple language detection - could be enhanced with langdetect library
  // For now, default to English
  return 'en';
}

function getLanguagePrompt(languageCode: string): string {
  const languagePrompts: { [key: string]: string } = {
    'en': "Write in English.",
    'de': "Write in German (Deutsch).",
    'fr': "Write in French (Français).",
    'es': "Write in Spanish (Español).",
    'it': "Write in Italian (Italiano).",
    'pt': "Write in Portuguese (Português).",
    'nl': "Write in Dutch (Nederlands).",
    'pl': "Write in Polish (Polski).",
    'ru': "Write in Russian (Русский).",
    'ja': "Write in Japanese (日本語).",
    'ko': "Write in Korean (한국어).",
    'zh': "Write in Chinese (中文).",
    'ar': "Write in Arabic (العربية).",
    'hi': "Write in Hindi (हिन्दी).",
    'tr': "Write in Turkish (Türkçe).",
    'sv': "Write in Swedish (Svenska).",
    'da': "Write in Danish (Dansk).",
    'no': "Write in Norwegian (Norsk).",
    'fi': "Write in Finnish (Suomi)."
  };
  
  return languagePrompts[languageCode] || "Write in English.";
}

function getToneInstruction(tone: string): string {
  if (!tone) return "";
  return `TONE OF VOICE: ${tone} - Ensure the copy reflects this tone throughout all headlines and descriptions.`;
}

function getCaseInstruction(caseType: string): string {
  if (caseType === 'title') {
    return "Use Title Case formatting (capitalize the first letter of each major word)";
  }
  return "Use sentence case formatting (capitalize only the first letter and proper nouns)";
}

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
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      const user = await authenticateUser(email, password);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      console.log(
        "Login successful for user:",
        user.id,
        "Session ID:",
        req.sessionID
      );

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    console.log(
      "POST logout - Session ID:",
      req.sessionID,
      "User ID:",
      req.session.userId
    );
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Could not log out" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  // Delete account endpoint
  app.delete("/api/auth/account", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      
      // Delete user account and all associated data
      const success = await storage.deleteUser(userId);
      
      if (success) {
        // Clear the session after successful deletion
        req.session.destroy((err) => {
          if (err) {
            console.error("Session clear error after account deletion:", err);
          }
          res.clearCookie("connect.sid");
          res.json({ message: "Account deleted successfully" });
        });
      } else {
        res.status(404).json({ message: "User account not found" });
      }
    } catch (error) {
      console.error("Error deleting user account:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  app.get("/api/auth/logout", (req, res) => {
    console.log(
      "GET logout - Session ID:",
      req.sessionID,
      "User ID:",
      req.session.userId
    );
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
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      companyName: user.companyName,
      isEmailVerified: user.isEmailVerified,
      isProfileComplete: user.isProfileComplete,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  });

  // Change password endpoint
  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res
          .status(400)
          .json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ message: "New password must be at least 6 characters long" });
      }

      // Get current user to verify password
      const user = await storage.getUser(userId);
      if (!user || user.password !== currentPassword) {
        return res
          .status(401)
          .json({ message: "Current password is incorrect" });
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
          email: user?.email,
          firstName: user?.firstName,
          lastName: user?.lastName,
          createdAt: user?.createdAt,
        },
        subscriptions: subscriptions,
        exportDate: new Date().toISOString(),
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="atomtools-account-data-${
          new Date().toISOString().split("T")[0]
        }.json"`
      );
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
        return res
          .status(400)
          .json({ message: "Password confirmation is required" });
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
  // Get tier subscriptions
  app.get("/api/tier-subscriptions", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const tierSubscriptions = await storage.getUserTierSubscriptions(userId);
      res.json(tierSubscriptions);
    } catch (error) {
      console.error("Error fetching tier subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch tier subscriptions" });
    }
  });

  // Get user tier subscriptions with full details
  app.get("/api/user/tier-subscriptions", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const subscriptions = await storage.getUserTierSubscriptionsWithDetails(userId);
      res.json(subscriptions);
    } catch (error) {
      console.error("Error fetching tier subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch tier subscriptions" });
    }
  });

  // Subscribe to tier
  app.post("/api/tier-subscriptions", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { tierId, paymentReference } = req.body;

      if (!tierId) {
        return res.status(400).json({ message: "Tier ID is required" });
      }

      // Check if tier exists
      const tier = await storage.getTier(tierId);
      if (!tier) {
        return res.status(404).json({ message: "Tier not found" });
      }

      // Subscribe user
      const subscription = await storage.subscribeTierUser({ 
        userId, 
        tierId, 
        paymentReference 
      });
      res.json(subscription);
    } catch (error) {
      console.error("Error creating tier subscription:", error);
      res.status(500).json({ message: "Failed to create tier subscription" });
    }
  });

  // Unsubscribe from tier
  app.delete("/api/tier-subscriptions/:tierId", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { tierId } = req.params;

      const success = await storage.unsubscribeTierUser(userId, tierId);
      if (success) {
        res.json({ message: "Unsubscribed successfully" });
      } else {
        res.status(404).json({ message: "Tier subscription not found" });
      }
    } catch (error) {
      console.error("Error removing tier subscription:", error);
      res.status(500).json({ message: "Failed to remove tier subscription" });
    }
  });

  // Legacy subscription endpoint (backward compatibility)
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

  // Check product access (tier-based)
  app.get("/api/products/:productId/access", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { productId } = req.params;

      const accessInfo = await storage.getUserProductAccess(userId, productId);
      const usageInfo = await storage.checkTierUsage(userId, productId);
      
      res.json({ 
        hasAccess: accessInfo.hasAccess,
        canUse: usageInfo.canUse,
        currentUsage: usageInfo.currentUsage,
        limit: usageInfo.limit,
        tierSubscription: accessInfo.tierSubscription,
        tierLimit: accessInfo.tierLimit,
        subfeatures: accessInfo.tierLimit?.subfeatures || {}
      });
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
        message: "Invalid form data",
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
          message: "Email already exists",
        });
      }

      // Hash the password before storing
      const hashedPassword = await bcrypt.hash(userData.password!, 12);
      
      // Generate verification token
      const verificationToken = nanoid(32);
      
      // Create new user with hashed password and verification token
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        emailVerificationToken: verificationToken,
        isEmailVerified: false,
      });

      // Send verification email
      const emailResult = await sendVerificationEmail(user.email, verificationToken);
      
      if (!emailResult.success) {
        console.error("Failed to send verification email:", emailResult.error);
      }

      res.json({
        success: true,
        message: "Account created successfully. Please check your email to verify your account.",
        requiresVerification: true,
        user: { id: user.id, email: user.email },
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(400).json({
        success: false,
        message: "Failed to create account",
      });
    }
  });

  // Email verification endpoint
  app.get("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({
          success: false,
          message: "Invalid verification token",
        });
      }

      // Find user by verification token
      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired verification token",
        });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({
          success: false,
          message: "Email is already verified",
        });
      }

      // Verify the user's email
      await storage.verifyUserEmail(user.id);

      // Auto-login after verification
      req.session.userId = user.id;

      res.json({
        success: true,
        message: "Email verified successfully",
        user: { id: user.id, email: user.email },
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(400).json({
        success: false,
        message: "Failed to verify email",
      });
    }
  });

  // Resend verification email endpoint
  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({
          success: false,
          message: "Email is already verified",
        });
      }

      // Generate new verification token
      const verificationToken = nanoid(32);
      await db.update(users).set({ emailVerificationToken: verificationToken }).where(eq(users.id, user.id));

      // Send verification email
      const emailResult = await sendVerificationEmail(user.email, verificationToken);
      
      if (!emailResult.success) {
        console.error("Failed to send verification email:", emailResult.error);
        return res.status(500).json({
          success: false,
          message: "Failed to send verification email",
        });
      }

      res.json({
        success: true,
        message: "Verification email sent successfully",
      });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to resend verification email",
      });
    }
  });

  // Google OAuth initiation endpoint
  app.get("/api/auth/google", (req, res) => {
    try {
      const authUrl = getGoogleAuthUrl();
      res.redirect(authUrl);
    } catch (error) {
      console.error("Google OAuth initiation error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to initiate Google authentication",
      });
    }
  });

  // Google OAuth callback endpoint
  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code } = req.query;

      if (!code || typeof code !== 'string') {
        return res.status(400).json({
          success: false,
          message: "No authorization code provided",
        });
      }

      // Verify the Google OAuth token and get user info
      const googleUser = await verifyGoogleToken(code);

      if (!googleUser.email) {
        return res.redirect("/login?error=oauth_no_email");
      }

      // Check if user already exists
      let user = await storage.getUserByEmail(googleUser.email);

      if (user) {
        // User exists, update their info from Google and log them in
        user = await storage.updateUserFromGoogle(user.id, {
          firstName: googleUser.firstName,
          lastName: googleUser.lastName,
          profileImageUrl: googleUser.profileImageUrl,
          isEmailVerified: true, // Google emails are always verified
        });
      } else {
        // Create new user from Google OAuth
        user = await storage.createUserFromGoogle({
          email: googleUser.email,
          firstName: googleUser.firstName,
          lastName: googleUser.lastName,
          profileImageUrl: googleUser.profileImageUrl,
          isEmailVerified: true, // Google emails are always verified
          googleId: googleUser.id,
        });
      }

      // Log the user in
      req.session.userId = user.id;

      // Check if user needs to complete profile
      if (!user.companyName) {
        // Redirect to profile completion page
        res.redirect("/complete-profile");
      } else {
        // Redirect to app
        res.redirect("/app");
      }
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      res.redirect("/login?error=oauth_failed");
    }
  });

  // EXACT ORIGINAL PYTHON LOGIC - SEO Meta Generator
  app.post("/api/tools/seo-meta/generate", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const productId = "531de90b-12ef-4169-b664-0d55428435a6"; // SEO Meta Generator product ID
      
      const {
        url,
        targetKeywords,
        brandName,
        sellingPoints = "",
        numVariations = 3,
        contentType = 'both',
        caseType = "sentence",
        brandGuidelines = "",
        regulatoryGuidelines = ""
      } = req.body;

      // Check user's product access and tier limits
      const accessInfo = await storage.getUserProductAccess(userId, productId);
      if (!accessInfo.hasAccess) {
        return res.status(403).json({
          message: "Access denied. This feature requires an active subscription."
        });
      }

      // Check subfeature permissions
      const subfeatures = accessInfo.tierLimit?.subfeatures as any || {};
      
      // Validate brand guidelines usage
      if (brandGuidelines && !subfeatures.brand_guidelines) {
        return res.status(403).json({
          message: "Brand guidelines feature is not available in your current plan."
        });
      }
      
      // Validate variations usage  
      if (numVariations > 1 && !subfeatures.variations) {
        return res.status(403).json({
          message: "Multiple variations feature is not available in your current plan."
        });
      }

      if (!url && !targetKeywords) {
        return res.status(400).json({
          message: "Either URL or target keywords are required"
        });
      }

      // Detect language from available text
      const contentForDetection = `${targetKeywords} ${brandName} ${sellingPoints}`;
      const detectedLang = detectLanguage(contentForDetection);
      const languageInstruction = getLanguagePrompt(detectedLang);
      const caseInstruction = getCaseInstruction(caseType);

      // Build prompt that instructs OpenAI to visit the URL directly
      const prompt = `
        Generate ${contentType === 'titles' ? 'only SEO-optimized page titles' : contentType === 'descriptions' ? 'only meta descriptions' : 'both SEO-optimized page titles and meta descriptions'} based on the following:

        ${url ? `WEBSITE URL: ${url}
        Please visit this URL, analyze the website content, and use that context to inform your SEO content creation.` : ''}

        TARGET KEYWORDS: ${targetKeywords}
        BRAND NAME: ${brandName}
        SELLING POINTS: ${sellingPoints}
        LANGUAGE: ${languageInstruction}
        
        ${brandGuidelines ? `🚨 CRITICAL BRAND GUIDELINES - MUST BE FOLLOWED: ${brandGuidelines}` : ''}
        ${regulatoryGuidelines ? `🚨 CRITICAL REGULATORY COMPLIANCE - MUST BE FOLLOWED: ${regulatoryGuidelines}` : ''}

        Generate ${numVariations} variations.

        Requirements:
        - Titles: 50-60 characters (aim for at least 35 characters - 70% of limit)
        - Descriptions: 150-160 characters (aim for at least 105 characters - 70% of limit), compelling and informative
        - Include main keyword if it fits, otherwise use complete brand name "${brandName}"
        - For keywords: use complete keyword phrase if it fits, otherwise use a shorter, grammatically correct version
        - Use proper grammar with country abbreviations capitalized (UK, US, EU, etc.)
        - ${caseInstruction} while preserving proper nouns and technical terms
        - Optimize for search intent

        Negative Prompts: EM-Dashes, Partial brand names, poor grammar.

        Approach this logically, step by step.

        CRITICAL PRE-OUTPUT REVIEW CHECKLIST:
        1. ✅ All brand guidelines have been strictly followed
        2. ✅ All regulatory requirements have been met  
        3. ✅ Content adheres to all formatting and character requirements
        4. ✅ No negative prompts appear in the content
        
        Before outputting, thoroughly review your results against ALL instructions provided, with special emphasis on brand and regulatory compliance.

        Format your response as JSON:
        {
            "titles": ["Title 1", "Title 2", "Title 3"],
            "descriptions": ["Description 1", "Description 2", "Description 3"]
        }
        `.trim();

      // Using gpt-4o-mini as requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {"role": "system", "content": "You are an expert SEO copywriter."},
          {"role": "user", "content": prompt}
        ],
        max_tokens: 1000,
        temperature: 0.8
      });

      const content = response.choices[0].message.content?.trim() || "";
      
      // Parse JSON response (exact Python logic)
      let result = null;
      if (content.includes('{') && content.includes('}')) {
        const start = content.indexOf('{');
        const end = content.lastIndexOf('}') + 1;
        const jsonStr = content.substring(start, end);
        try {
          const parsed = JSON.parse(jsonStr);
          
          if (contentType === 'titles' && parsed.titles) {
            result = { titles: parsed.titles, descriptions: [] };
          } else if (contentType === 'descriptions' && parsed.descriptions) {
            result = { titles: [], descriptions: parsed.descriptions };
          } else if (contentType === 'both') {
            result = {
              titles: parsed.titles || [],
              descriptions: parsed.descriptions || []
            };
          }
        } catch (e) {
          console.error("Failed to parse SEO response:", e);
        }
      }

      if (!result) {
        return res.status(500).json({ message: "Failed to generate SEO content" });
      }

      res.json(result);
    } catch (error) {
      console.error("SEO generation error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // EXACT ORIGINAL PYTHON LOGIC - Google Ads Copy Generator
  app.post("/api/tools/google-ads/generate", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const productId = "c5985990-e94e-49b3-a86c-3076fd9d6b3f"; // Google Ads Copy Generator product ID
      
      const {
        url,
        targetKeywords,
        brandName,
        sellingPoints = "",
        caseType = "sentence",
        brandGuidelines = "",
        regulatoryGuidelines = "",
        numVariations = 1
      } = req.body;

      // Check user's product access and tier limits
      const accessInfo = await storage.getUserProductAccess(userId, productId);
      if (!accessInfo.hasAccess) {
        return res.status(403).json({
          message: "Access denied. This feature requires an active subscription."
        });
      }

      // Check subfeature permissions
      const subfeatures = accessInfo.tierLimit?.subfeatures as any || {};
      
      // Validate brand guidelines usage
      if (brandGuidelines && !subfeatures.brand_guidelines) {
        return res.status(403).json({
          message: "Brand guidelines feature is not available in your current plan."
        });
      }
      
      // Validate variations usage
      if (numVariations > 1 && !subfeatures.variations) {
        return res.status(403).json({
          message: "Multiple variations feature is not available in your current plan."
        });
      }

      if (!url && !targetKeywords) {
        return res.status(400).json({
          message: "Either URL or target keywords are required"
        });
      }

      // Detect language from available text
      const contentForDetection = `${targetKeywords} ${brandName} ${sellingPoints}`;
      const detectedLang = detectLanguage(contentForDetection);
      const languageInstruction = getLanguagePrompt(detectedLang);
      const caseInstruction = getCaseInstruction(caseType);

      // Build prompt that instructs OpenAI to visit the URL directly
      const prompt = `
        Based on the following requirements, generate compelling Google Ads copy:

        ${url ? `WEBSITE URL: ${url}
        Please visit this URL, analyze the website content, and use that context to inform your ad creation.` : ''}

        TARGET KEYWORDS: ${targetKeywords}
        BRAND NAME: ${brandName}
        SELLING POINTS: ${sellingPoints || "None"}
        ${languageInstruction}
        
        ${brandGuidelines ? `🚨 CRITICAL BRAND GUIDELINES - MUST BE FOLLOWED: ${brandGuidelines}` : ''}
        ${regulatoryGuidelines ? `🚨 CRITICAL REGULATORY COMPLIANCE - MUST BE FOLLOWED: ${regulatoryGuidelines}` : ''}

        Generate Google Ads copy with EXACTLY this format:
        - 3 headlines, each maximum 30 characters (aim for at least 21 characters - 70% of limit)
        - 2 descriptions, each maximum 90 characters (aim for at least 63 characters - 70% of limit)

        CRITICAL FORMATTING RULES:
        - ${caseInstruction}
        - Keep country abbreviations capitalized (UK, US, EU, etc.) regardless of text case
        - Include main keyword if it fits, otherwise use complete brand name "${brandName}"
        - For keywords: use complete keyword phrase if it fits, otherwise use a shorter, grammatically correct version
        - Preserve proper nouns and technical terms in their correct case

        Make the headlines diverse:
        - Headline 1: Include main keyword if it fits, otherwise use complete brand name
        - Headline 2: Focus on selling points or benefits
        - Headline 3: Include call to action or complete brand name

        Make the descriptions compelling:
        - Description 1: Highlight main benefit with keyword
        - Description 2: Add urgency or call to action

        Negative Prompts: EM-Dashes, Partial brand names, poor grammar.

        Approach this logically, step by step.

        CRITICAL PRE-OUTPUT REVIEW CHECKLIST:
        1. ✅ All brand guidelines have been strictly followed
        2. ✅ All regulatory requirements have been met  
        3. ✅ Content adheres to all formatting and character requirements
        4. ✅ No negative prompts appear in the content
        
        Before outputting, thoroughly review your results against ALL instructions provided, with special emphasis on brand and regulatory compliance.

        Format your response as JSON with arrays:
        {
            "headlines": ["First headline", "Second headline", "Third headline"],
            "descriptions": ["First description", "Second description"]
        }
        `.trim();

      // Using gpt-4o-mini as requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {"role": "system", "content": "You are an expert copywriter specializing in Google Ads."},
          {"role": "user", "content": prompt}
        ],
        max_tokens: 1000,
        temperature: 0.7
      });

      const content = response.choices[0].message.content?.trim() || "";
      
      // Parse JSON response to extract headlines and descriptions arrays
      let result = null;
      if (content.includes('{') && content.includes('}')) {
        const start = content.indexOf('{');
        const end = content.lastIndexOf('}') + 1;
        const jsonStr = content.substring(start, end);
        try {
          const parsed = JSON.parse(jsonStr);
          
          // Ensure we have headlines and descriptions arrays
          if (parsed.headlines && Array.isArray(parsed.headlines) && 
              parsed.descriptions && Array.isArray(parsed.descriptions)) {
            result = {
              headlines: parsed.headlines.slice(0, 3), // Ensure max 3 headlines
              descriptions: parsed.descriptions.slice(0, 2), // Ensure max 2 descriptions
            };
          } else {
            console.error("Invalid response format - missing headlines or descriptions arrays");
            return res.status(500).json({ message: "Invalid response format from AI" });
          }
        } catch (e) {
          console.error("Failed to parse ad copy response:", e);
          return res.status(500).json({ message: "Failed to parse AI response" });
        }
      } else {
        console.error("No valid JSON found in response");
        return res.status(500).json({ message: "No valid response from AI" });
      }

      res.json(result);
    } catch (error) {
      console.error("Ad copy generation error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Guideline Profile Management Endpoints
  
  // Get user's guideline profiles
  app.get("/api/guideline-profiles", requireAuth, async (req: any, res) => {
    try {
      const type = req.query.type as 'brand' | 'regulatory' | undefined;
      const profiles = await storage.getUserGuidelineProfiles(req.user.id, type);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching guideline profiles:", error);
      res.status(500).json({ message: "Failed to fetch guideline profiles" });
    }
  });

  // Create new guideline profile
  app.post("/api/guideline-profiles", requireAuth, async (req: any, res) => {
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

  // Update guideline profile
  app.put("/api/guideline-profiles/:id", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const profileData = updateGuidelineProfileSchema.parse(req.body);
      const profile = await storage.updateGuidelineProfile(id, req.user.id, profileData);
      
      if (!profile) {
        return res.status(404).json({ message: "Guideline profile not found" });
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error updating guideline profile:", error);
      res.status(400).json({ message: "Failed to update guideline profile" });
    }
  });

  // Delete guideline profile
  app.delete("/api/guideline-profiles/:id", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteGuidelineProfile(id, req.user.id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Guideline profile not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting guideline profile:", error);
      res.status(500).json({ message: "Failed to delete guideline profile" });
    }
  });

  // Public packages endpoint for pricing page
  app.get("/api/packages", async (req: any, res) => {
    try {
      const packages = await storage.getAllPackagesWithTiers();
      // Filter to only active packages for public consumption
      const activePackages = packages.filter(pkg => pkg.isActive);
      res.json(activePackages);
    } catch (error) {
      console.error("Error fetching public packages:", error);
      res.status(500).json({ message: "Failed to fetch packages" });
    }
  });

  // Complete profile route (must be after login but before requireAuth)
  app.post("/api/auth/complete-profile", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const validation = completeProfileSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid profile data",
          errors: validation.error.errors
        });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.isEmailVerified) {
        return res.status(403).json({ message: "Email verification required" });
      }

      await storage.completeUserProfile(req.session.userId, validation.data);
      
      res.json({ message: "Profile completed successfully" });
    } catch (error) {
      console.error("Complete profile error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin middleware
  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const isAdmin = await storage.isUserAdmin(req.user.id);
    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    next();
  };

  // Admin routes
  app.get("/api/admin/stats", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  // Admin package routes with tier support
  app.get("/api/admin/packages", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const packages = await storage.getAllPackagesWithTiers();
      res.json(packages);
    } catch (error) {
      console.error("Error fetching packages:", error);
      res.status(500).json({ message: "Failed to fetch packages" });
    }
  });

  app.get("/api/admin/packages/:id", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const packageData = await storage.getPackageWithTiers(req.params.id);
      if (!packageData) {
        return res.status(404).json({ message: "Package not found" });
      }
      res.json(packageData);
    } catch (error) {
      console.error("Error fetching package:", error);
      res.status(500).json({ message: "Failed to fetch package" });
    }
  });

  app.post("/api/admin/packages", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const packageData = req.body;
      const newPackage = await storage.createPackage(packageData);
      res.json(newPackage);
    } catch (error) {
      console.error("Error creating package:", error);
      res.status(500).json({ message: "Failed to create package" });
    }
  });

  app.post("/api/admin/packages/with-tiers", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { package: packageData, productIds, tiers } = req.body;
      
      // Create the package
      const newPackage = await storage.createPackage(packageData);
      
      // Add products to package
      for (const productId of productIds) {
        await storage.addProductToPackage(newPackage.id, productId);
      }
      
      // Create tiers with pricing and limits
      for (let index = 0; index < tiers.length; index++) {
        const tierData = tiers[index];
        const tier = await storage.createTier({
          packageId: newPackage.id,
          name: tierData.name,
          promotionalTag: tierData.promotionalTag,
          sortOrder: index,
          isActive: tierData.isActive,
        });
        
        // Add tier prices
        for (const priceData of tierData.prices) {
          await storage.createTierPrice({
            tierId: tier.id,
            interval: priceData.interval,
            amountMinor: priceData.amountMinor,
            currency: priceData.currency,
          });
        }
        
        // Add tier limits
        for (const limitData of tierData.limits) {
          await storage.createTierLimit({
            tierId: tier.id,
            productId: limitData.productId,
            includedInTier: limitData.includedInTier,
            periodicity: limitData.periodicity,
            quantity: limitData.quantity,
            subfeatures: limitData.subfeatures,
          });
        }
      }
      
      // Return the complete package with tiers
      const completePackage = await storage.getPackageWithTiers(newPackage.id);
      res.status(201).json(completePackage);
    } catch (error) {
      console.error("Error creating package with tiers:", error);
      res.status(500).json({ message: "Failed to create package with tiers" });
    }
  });

  app.put("/api/admin/packages/:id", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const packageId = req.params.id;
      const packageData = req.body;
      
      // Update basic package info
      const updatedPackage = await storage.updatePackage(packageId, packageData);
      if (!updatedPackage) {
        return res.status(404).json({ message: "Package not found" });
      }
      
      // Return the complete package with tiers
      const completePackage = await storage.getPackageWithTiers(packageId);
      res.json(completePackage);
    } catch (error) {
      console.error("Error updating package:", error);
      res.status(500).json({ message: "Failed to update package" });
    }
  });

  app.put("/api/admin/packages/with-tiers/:id", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const packageId = req.params.id;
      const { package: packageData, productIds, tiers } = req.body;
      
      // Update basic package info
      const updatedPackage = await storage.updatePackage(packageId, packageData);
      if (!updatedPackage) {
        return res.status(404).json({ message: "Package not found" });
      }
      
      // Remove existing package-product relationships and re-add them
      const existingProducts = await storage.getPackageProducts(packageId);
      for (const product of existingProducts) {
        await storage.removeProductFromPackage(packageId, product.id);
      }
      
      // Add new products to package
      for (const productId of productIds) {
        await storage.addProductToPackage(packageId, productId);
      }
      
      // Delete existing tiers and their associated data
      await storage.deletePackageTiers(packageId);
      
      // Create new tiers with pricing and limits
      for (let index = 0; index < tiers.length; index++) {
        const tierData = tiers[index];
        const tier = await storage.createTier({
          packageId: packageId,
          name: tierData.name,
          promotionalTag: tierData.promotionalTag,
          sortOrder: index,
          isActive: tierData.isActive,
        });
        
        // Add tier prices
        for (const priceData of tierData.prices) {
          await storage.createTierPrice({
            tierId: tier.id,
            interval: priceData.interval,
            amountMinor: priceData.amountMinor,
            currency: priceData.currency,
          });
        }
        
        // Add tier limits
        for (const limitData of tierData.limits) {
          await storage.createTierLimit({
            tierId: tier.id,
            productId: limitData.productId,
            includedInTier: limitData.includedInTier,
            periodicity: limitData.periodicity,
            quantity: limitData.quantity,
            subfeatures: limitData.subfeatures,
          });
        }
      }
      
      // Return the complete package with tiers
      const completePackage = await storage.getPackageWithTiers(packageId);
      res.json(completePackage);
    } catch (error) {
      console.error("Error updating package with tiers:", error);
      res.status(500).json({ message: "Failed to update package with tiers" });
    }
  });

  app.delete("/api/admin/packages/:id", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const success = await storage.deletePackage(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Package not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting package:", error);
      res.status(500).json({ message: "Failed to delete package" });
    }
  });

  app.get("/api/admin/products", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const products = await storage.getProductsWithPackages();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/admin/products", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const product = await storage.createProduct(req.body);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.get("/api/admin/products/:id", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const product = await storage.getProductWithPackage(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.put("/api/admin/products/:id", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const product = await storage.updateProduct(req.params.id, req.body);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/admin/products/:id", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const success = await storage.deleteProduct(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  app.get("/api/admin/users", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put("/api/admin/users/:id", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const user = await storage.updateUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.put("/api/admin/users/:id/admin", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { isAdmin } = req.body;
      await storage.updateUserAdminStatus(req.params.id, isAdmin);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user admin status:", error);
      res.status(500).json({ message: "Failed to update user admin status" });
    }
  });

  app.delete("/api/admin/users/:id", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const success = await storage.deleteUser(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Serve attached assets (videos, images, etc.)
  app.use('/attached_assets', express.static(path.resolve(process.cwd(), 'attached_assets')));

  // Register CMS routes
  const { registerCmsRoutes } = await import("./cms-routes");
  const { registerObjectStorageRoutes } = await import("./object-storage-routes");
  registerCmsRoutes(app);
  registerObjectStorageRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
