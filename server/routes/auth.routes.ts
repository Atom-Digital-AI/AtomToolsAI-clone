import { Router } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { z } from "zod";
import { storage } from "../storage";
import { db } from "../db";
import { users, insertUserSchema, completeProfileSchema } from "@shared/schema";
import { requireAuth, authenticateUser } from "../auth";
import { sendVerificationEmail } from "../email";
import { authLimiter, signupLimiter } from "../rate-limit";
import { getLogger } from "../logging/logger";

const router = Router();
const log = getLogger({ module: 'auth.routes' });

/**
 * Login endpoint
 */
router.post("/login", authLimiter, async (req, res) => {
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

    // SECURITY: Regenerate session ID after successful authentication
    req.session.regenerate((err) => {
      if (err) {
        log.error({ error: err }, "Session regeneration error");
        return res.status(500).json({ message: "Login failed" });
      }

      req.session.userId = user.id;
      log.info({ userId: user.id, sessionId: req.sessionID }, "Login successful");

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
        },
      });
    });
  } catch (error) {
    log.error({ error }, "Login error");
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * Logout endpoint (POST)
 */
router.post("/logout", (req, res) => {
  log.debug({ sessionId: req.sessionID, userId: req.session.userId }, "POST logout");
  req.session.destroy((err) => {
    if (err) {
      log.error({ error: err }, "Logout error");
      return res.status(500).json({ message: "Could not log out" });
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully" });
  });
});

/**
 * Logout endpoint (GET) - for redirect compatibility
 */
router.get("/logout", (req, res) => {
  log.debug({ sessionId: req.sessionID, userId: req.session.userId }, "GET logout");
  req.session.destroy((err) => {
    if (err) {
      log.error({ error: err }, "Logout error");
    }
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});

/**
 * Get current user endpoint
 */
router.get("/me", requireAuth, async (req, res) => {
  const user = (req as any).user;
  log.debug({ userId: user.id, sessionId: req.sessionID }, "User authenticated");
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
    updatedAt: user.updatedAt,
  });
});

/**
 * Update profile endpoint
 */
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { firstName, lastName, email } = req.body;

    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    await storage.updateUser(userId, updateData);
    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    log.error({ error }, "Update profile error");
    res.status(500).json({ message: "Failed to update profile" });
  }
});

/**
 * Change password endpoint
 */
router.post(
  "/change-password",
  authLimiter,
  requireAuth,
  async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          message: "Current password and new password are required",
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          message: "New password must be at least 8 characters long",
        });
      }

      // Get current user to verify password
      const user = await storage.getUser(userId);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid user" });
      }

      // SECURITY FIX: Use bcrypt.compare instead of direct comparison
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isPasswordValid) {
        return res
          .status(401)
          .json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await storage.updateUserPassword(userId, hashedNewPassword);
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      log.error({ error }, "Change password error");
      res.status(500).json({ message: "Failed to change password" });
    }
  }
);

/**
 * Download account data endpoint
 */
router.get("/account-data", requireAuth, async (req, res) => {
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
    log.error({ error }, "Download account data error");
    res.status(500).json({ message: "Failed to export account data" });
  }
});

/**
 * Delete account endpoint
 */
router.delete("/account", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    // Delete user account and all associated data
    const success = await storage.deleteUser(userId);

    if (success) {
      // Clear the session after successful deletion
      req.session.destroy((err) => {
        if (err) {
          log.error({ error: err }, "Session clear error after account deletion");
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Account deleted successfully" });
      });
    } else {
      res.status(404).json({ message: "User account not found" });
    }
  } catch (error) {
    log.error({ error }, "Error deleting user account");
    res.status(500).json({ message: "Failed to delete account" });
  }
});

/**
 * User registration endpoint
 */
router.post("/signup", signupLimiter, async (req, res) => {
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

    // Automatically assign Free tier to new users
    try {
      const freeTier = await storage.getFreeTier();
      if (freeTier) {
        await storage.subscribeTierUser({
          userId: user.id,
          tierId: freeTier.id,
          isActive: true,
        });
        log.info({ userId: user.id }, "Assigned Free tier to new user");
      } else {
        log.warn("Free tier not found - new user will have no tier subscription");
      }
    } catch (tierError) {
      log.error({ error: tierError }, "Failed to assign Free tier to new user");
      // Continue anyway - user is created, they just won't have a tier subscription yet
    }

    // Send verification email
    const emailResult = await sendVerificationEmail(
      user.email,
      verificationToken
    );

    if (!emailResult.success) {
      log.error({ error: emailResult.error }, "Failed to send verification email");
    }

    res.json({
      success: true,
      message:
        "Account created successfully. Please check your email to verify your account.",
      requiresVerification: true,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    log.error({ error }, "Signup error");
    res.status(400).json({
      success: false,
      message: "Failed to create account",
    });
  }
});

/**
 * Email verification endpoint
 */
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
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
    log.error({ error }, "Email verification error");
    res.status(400).json({
      success: false,
      message: "Failed to verify email",
    });
  }
});

/**
 * Resend verification email endpoint
 */
router.post("/resend-verification", async (req, res) => {
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
    await db
      .update(users)
      .set({ emailVerificationToken: verificationToken })
      .where(eq(users.id, user.id));

    // Send verification email
    const emailResult = await sendVerificationEmail(
      user.email,
      verificationToken
    );

    if (!emailResult.success) {
      log.error({ error: emailResult.error }, "Failed to send verification email");
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
    log.error({ error }, "Resend verification error");
    res.status(500).json({
      success: false,
      message: "Failed to resend verification email",
    });
  }
});

/**
 * Complete profile endpoint
 */
router.post("/complete-profile", async (req, res) => {
  try {
    // Validate request body with Zod schema
    const profileData = completeProfileSchema.parse(req.body);

    // Get user from session
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const userId = req.session.userId;

    // Complete the user's profile
    await storage.completeUserProfile(userId, profileData);

    res.json({
      success: true,
      message: "Profile completed successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors,
      });
    }
    log.error({ error }, "Complete profile error");
    res.status(500).json({
      success: false,
      message: "Failed to complete profile",
    });
  }
});

export default router;
