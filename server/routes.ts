import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { sessionMiddleware, requireAuth, authenticateUser } from "./auth";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";
import OpenAI from "openai";
import axios from "axios";
import * as cheerio from "cheerio";
import { sendVerificationEmail } from "./email";
import { nanoid } from "nanoid";

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
          username: user.username,
          email: user.email,
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
          username: user?.username,
          email: user?.email,
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
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
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

  // Google OAuth placeholder endpoint
  app.get("/api/auth/google", (req, res) => {
    // TODO: Implement Google OAuth flow
    res.status(501).json({
      success: false,
      message: "Google OAuth not yet implemented",
    });
  });

  // EXACT ORIGINAL PYTHON LOGIC - SEO Meta Generator
  app.post("/api/tools/seo-meta/generate", requireAuth, async (req, res) => {
    try {
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
      const {
        url,
        targetKeywords,
        brandName,
        sellingPoints = "",
        caseType = "sentence",
        brandGuidelines = "",
        regulatoryGuidelines = ""
      } = req.body;

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

  const httpServer = createServer(app);
  return httpServer;
}
