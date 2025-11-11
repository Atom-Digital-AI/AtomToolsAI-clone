// Load environment variables from .env file (for local development)
// In production, environment variables are set directly by the platform
import "dotenv/config";

// IMPORTANT: Initialize LangSmith BEFORE any LangChain imports
// LangChain reads environment variables when the SDK is first imported,
// so we must set them before any LangChain modules are loaded
import "./utils/langsmith-config";

import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { expressIntegration } from "@sentry/node";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { logToolError, getErrorTypeFromError } from "./errorLogger";
import { env } from "./config";
import { apiLimiter } from "./rate-limit";
import { validateAndInitializeLangSmith } from "./utils/langsmith-config";

const app = express();

// Initialize Sentry BEFORE creating the Express app
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    integrations: [
      expressIntegration(),
      nodeProfilingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
    // Profiling
    profilesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
  });
}

// Trust proxy - REQUIRED when behind Railway/load balancers
// Set to 1 to trust only the first proxy (Railway's load balancer)
// This prevents X-Forwarded-For spoofing attacks
app.set("trust proxy", 1);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for Vite in dev
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: [
          "'self'",
          "https://api.openai.com",
          "https://api.anthropic.com",
          "https://api.cohere.ai",
          "https://*.sentry.io", // Sentry error tracking
        ],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: env.NODE_ENV === "production" ? [] : null,
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// CORS configuration
const ALLOWED_ORIGINS = [
  env.FRONTEND_URL,
  env.REPLIT_DOMAIN ? `https://${env.REPLIT_DOMAIN}` : null,
  env.NODE_ENV === "development" ? "http://localhost:5173" : null,
  env.NODE_ENV === "development" ? "http://localhost:5000" : null,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, server-to-server)
      if (!origin) return callback(null, true);

      if (ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked request from origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400, // 24 hours
  })
);

// Rate limiting for API routes
app.use("/api", apiLimiter);

// Body parsers with different limits
// Note: More specific routes must come before catch-all routes
app.use("/api/guideline-profiles/auto-populate-pdf", express.json({ limit: "15mb" })); // PDF upload (needs larger limit for base64)
app.use("/api/tools", express.json({ limit: "5mb" })); // AI tools
app.use("/api/admin", express.json({ limit: "1mb" })); // Admin operations
app.use("/api", express.json({ limit: "500kb" })); // General API
app.use(express.json({ limit: "100kb" })); // Default fallback

app.use(express.urlencoded({ extended: false, limit: "1mb" }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Validate LangSmith configuration during server startup
  await validateAndInitializeLangSmith().catch((error) => {
    console.error("Failed to validate LangSmith configuration:", error);
  });

  const server = await registerRoutes(app);

  app.use(
    async (err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Send to Sentry (if configured)
      if (env.SENTRY_DSN) {
        Sentry.captureException(err, {
          tags: {
            endpoint: `${req.method} ${req.path}`,
            statusCode: status,
          },
          user: {
            id: (req as any).user?.id,
            email: (req as any).user?.email,
          },
          extra: {
            body: req.body,
            query: req.query,
            params: req.params,
          },
        });
      }

      // Log error to database
      try {
        const user = (req as any).user;
        await logToolError({
          userId: user?.id,
          userEmail: user?.email,
          toolName: "system",
          errorType: getErrorTypeFromError(err),
          errorMessage: message,
          errorStack: err.stack,
          requestData: {
            body: req.body,
            query: req.query,
            params: req.params,
          },
          httpStatus: status,
          endpoint: `${req.method} ${req.path}`,
          req,
          status: "to_do", // New errors start as "to_do"
        });
      } catch (logError) {
        console.error("Failed to log error to database:", logError);
      }

      res.status(status).json({ message });
      console.error(`[Global Error Handler] ${req.method} ${req.path}:`, err);
    }
  );

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    }
  );
})();
