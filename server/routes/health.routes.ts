import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";

const router = Router();

/**
 * Health check endpoint (for Railway and monitoring)
 * Checks database and session store connectivity
 */
router.get("/health", async (req, res) => {
  const checks: Record<string, { status: string; latency?: number }> = {};

  // Check database
  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    checks.database = { status: "ok", latency: Date.now() - start };
  } catch (error) {
    checks.database = { status: "error" };
    return res.status(503).json({
      status: "unhealthy",
      checks,
      timestamp: new Date().toISOString(),
    });
  }

  // Check session store
  try {
    const start = Date.now();
    await db.execute(sql`SELECT COUNT(*) FROM sessions LIMIT 1`);
    checks.sessionStore = { status: "ok", latency: Date.now() - start };
  } catch (error) {
    checks.sessionStore = { status: "error" };
  }

  const allHealthy = Object.values(checks).every((c) => c.status === "ok");

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    checks,
  });
});

/**
 * Lightweight liveness check (doesn't test dependencies)
 */
router.get("/health/live", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
