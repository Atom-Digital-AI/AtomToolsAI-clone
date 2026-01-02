import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { pool } from "./db";
import bcrypt from "bcryptjs";
import { env } from "./config";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

const PgSession = connectPgSimple(session);

// Create session store with error handling
const sessionStore = new PgSession({
  pool,
  tableName: 'sessions',
  createTableIfMissing: true,
  // Prune expired sessions every hour
  pruneSessionInterval: 60 * 60,
  // Log errors for debugging
  errorLog: (error: Error) => {
    console.error('[Session Store Error]', error.message);
  },
});

// Handle session store errors to prevent silent failures
sessionStore.on('error', (error: Error) => {
  console.error('[Session Store Connection Error]', error.message);
});

export const sessionMiddleware = session({
  store: sessionStore,
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: "connect.sid",
  cookie: {
    secure: env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 4 * 60 * 60 * 1000, // 4 hours (reduced from 24 for security)
    // Use 'lax' instead of 'strict' to allow sessions from email links
    // 'lax' still protects against CSRF for non-GET requests while allowing
    // top-level navigation from external sites (email verification, password reset)
    sameSite: 'lax',
  },
});

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  console.log("Auth check - Session ID:", req.sessionID, "User ID:", req.session.userId);
  
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized - No session user ID" });
  }

  try {
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.userId = undefined;
      return res.status(401).json({ message: "Unauthorized - User not found" });
    }

    // Check if email is verified for protected routes
    if (!user.isEmailVerified) {
      return res.status(403).json({ 
        message: "Email verification required",
        requiresVerification: true 
      });
    }

    // Check if profile is complete (first name, last name, company name)
    if (!user.isProfileComplete || !user.firstName || !user.lastName || !user.companyName) {
      return res.status(403).json({ 
        message: "Profile completion required",
        requiresProfileCompletion: true 
      });
    }

    (req as any).user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  // First require basic authentication
  await new Promise<void>((resolve, reject) => {
    requireAuth(req, res, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  // Check if user is admin
  const user = (req as any).user;
  if (!user?.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
};

export const authenticateUser = async (email: string, password: string) => {
  const user = await storage.getUserByEmail(email);
  if (!user) {
    return null;
  }
  
  // Check if user has a password (OAuth users might not have passwords)
  if (!user.password) {
    return null;
  }
  
  // Compare the provided password with the hashed password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return null;
  }
  
  return user;
};