import { Router } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { validate } from "../middleware/validate";
import { getLogger } from "../logging/logger";
import {
  productIdParamsSchema,
  tierIdParamsSchema,
  createTierSubscriptionSchema,
  createSubscriptionSchema,
  contactFormSchema,
} from "../schemas";

const router = Router();
const log = getLogger({ module: 'product.routes' });

/**
 * Get all products
 */
router.get("/products", async (req, res) => {
  try {
    const products = await storage.getAllProducts();
    res.json(products);
  } catch (error) {
    log.error({ error }, "Error fetching products");
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

/**
 * Get products with user subscription status
 */
router.get("/products/with-status", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const products = await storage.getProductsWithSubscriptionStatus(userId);
    res.json(products);
  } catch (error) {
    log.error({ error }, "Error fetching products with status");
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

/**
 * Check product access (tier-based)
 */
router.get(
  "/products/:productId/access",
  requireAuth,
  validate({ params: productIdParamsSchema }),
  async (req, res) => {
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
        subfeatures: accessInfo.tierLimit?.subfeatures || {},
      });
    } catch (error) {
      log.error({ error }, "Error checking product access");
      res.status(500).json({ message: "Failed to check access" });
    }
  }
);

/**
 * Get all packages
 */
router.get("/packages", async (req: any, res) => {
  try {
    const packages = await storage.getAllPackagesWithTiers();
    res.json(packages);
  } catch (error) {
    log.error({ error }, "Error fetching packages");
    res.status(500).json({ message: "Failed to fetch packages" });
  }
});

/**
 * Get tier subscriptions
 */
router.get("/tier-subscriptions", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const tierSubscriptions = await storage.getUserTierSubscriptions(userId);
    res.json(tierSubscriptions);
  } catch (error) {
    log.error({ error }, "Error fetching tier subscriptions");
    res.status(500).json({ message: "Failed to fetch tier subscriptions" });
  }
});

/**
 * Subscribe to tier
 */
router.post(
  "/tier-subscriptions",
  requireAuth,
  validate({ body: createTierSubscriptionSchema }),
  async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { tierId, paymentReference } = req.body;

      // Check if tier exists
      const tier = await storage.getTier(tierId);
      if (!tier) {
        return res.status(404).json({ message: "Tier not found" });
      }

      // Subscribe user
      const subscription = await storage.subscribeTierUser({
        userId,
        tierId,
        paymentReference,
      });
      res.json(subscription);
    } catch (error) {
      log.error({ error }, "Error creating tier subscription");
      res.status(500).json({ message: "Failed to create tier subscription" });
    }
  }
);

/**
 * Unsubscribe from tier
 */
router.delete(
  "/tier-subscriptions/:tierId",
  requireAuth,
  validate({ params: tierIdParamsSchema }),
  async (req, res) => {
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
      log.error({ error }, "Error removing tier subscription");
      res.status(500).json({ message: "Failed to remove tier subscription" });
    }
  }
);

/**
 * Legacy subscription endpoint (backward compatibility) - Get subscriptions
 */
router.get("/subscriptions", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const subscriptions = await storage.getUserSubscriptions(userId);
    res.json(subscriptions);
  } catch (error) {
    log.error({ error }, "Error fetching subscriptions");
    res.status(500).json({ message: "Failed to fetch subscriptions" });
  }
});

/**
 * Legacy subscription endpoint (backward compatibility) - Create subscription
 */
router.post(
  "/subscriptions",
  requireAuth,
  validate({ body: createSubscriptionSchema }),
  async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { productId } = req.body;

      // Check if product exists
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Subscribe user
      const subscription = await storage.subscribeUser({ userId, productId });
      res.json(subscription);
    } catch (error) {
      log.error({ error }, "Error creating subscription");
      res.status(500).json({ message: "Failed to create subscription" });
    }
  }
);

/**
 * Legacy subscription endpoint (backward compatibility) - Delete subscription
 */
router.delete(
  "/subscriptions/:productId",
  requireAuth,
  validate({ params: productIdParamsSchema }),
  async (req, res) => {
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
      log.error({ error }, "Error removing subscription");
      res.status(500).json({ message: "Failed to remove subscription" });
    }
  }
);

/**
 * Contact form endpoint
 */
router.post(
  "/contact",
  validate({ body: contactFormSchema }),
  async (req, res) => {
    try {
      const { name, email, message } = req.body;

      // TODO: Implement email sending logic using nodemailer or similar
      log.info({ name, email }, "Contact form submission received");

      res.json({ success: true, message: "Message received successfully" });
    } catch (error) {
      log.error({ error }, "Contact form error");
      res.status(400).json({
        success: false,
        message: "Invalid form data",
      });
    }
  }
);

export default router;
