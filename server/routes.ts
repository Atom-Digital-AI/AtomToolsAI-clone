/**
 * Routes Entry Point
 *
 * This file re-exports from the modular routes directory for backward compatibility.
 * The actual route implementations are in server/routes/*.routes.ts
 *
 * Route modules:
 * - health.routes.ts    - Health check endpoints
 * - auth.routes.ts      - Authentication (login, logout, signup, etc.)
 * - user.routes.ts      - User profile and preferences
 * - product.routes.ts   - Products, subscriptions, tiers
 * - guideline.routes.ts - Brand guideline profiles
 * - content.routes.ts   - Content generation and LangGraph workflows
 * - admin.routes.ts     - Admin operations and metrics
 * - cms.routes.ts       - Crawling, QC, and page management
 */
export { registerRoutes } from "./routes/index";
