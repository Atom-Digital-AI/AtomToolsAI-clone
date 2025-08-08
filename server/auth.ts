import session from "express-session";
import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "development-secret-key",
  resave: false,
  saveUninitialized: false,
  name: "atomtools.sid",
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: "lax",
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

    (req as any).user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const authenticateUser = async (email: string, password: string) => {
  const user = await storage.getUserByEmail(email);
  if (!user || user.password !== password) {
    return null;
  }
  return user;
};