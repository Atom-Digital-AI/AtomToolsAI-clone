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
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.userId = undefined;
      return res.status(401).json({ message: "Unauthorized" });
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