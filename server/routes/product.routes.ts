import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requireAuth } from "../auth";

const router = Router();

// Contact form schema
const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().min(10),
});

/**
 * Get all products
 */
router.get("/products", async (req, res) => {
  try {
    const products = await storage.getAllProducts();
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
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
    console.error("Error fetching products with status:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

/**
 * Check product access (tier-based)
 */
router.get("/products/:productId/access", requireAuth, async (req, res) => {
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
    console.error("Error checking product access:", error);
    res.status(500).json({ message: "Failed to check access" });
  }
});

/**
 * Get all packages
 */
router.get("/packages", async (req: any, res) => {
  try {
    const packages = await storage.getAllPackagesWithTiers();
    res.json(packages);
  } catch (error) {
    console.error("Error fetching packages:", error);
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
    console.error("Error fetching tier subscriptions:", error);
    res.status(500).json({ message: "Failed to fetch tier subscriptions" });
  }
});

/**
 * Subscribe to tier
 */
router.post("/tier-subscriptions", requireAuth, async (req, res) => {
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
      paymentReference,
    });
    res.json(subscription);
  } catch (error) {
    console.error("Error creating tier subscription:", error);
    res.status(500).json({ message: "Failed to create tier subscription" });
  }
});

/**
 * Unsubscribe from tier
 */
router.delete(
  "/tier-subscriptions/:tierId",
  requireAuth,
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
      console.error("Error removing tier subscription:", error);
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
    console.error("Error fetching subscriptions:", error);
    res.status(500).json({ message: "Failed to fetch subscriptions" });
  }
});

/**
 * Legacy subscription endpoint (backward compatibility) - Create subscription
 */
router.post("/subscriptions", requireAuth, async (req, res) => {
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

/**
 * Legacy subscription endpoint (backward compatibility) - Delete subscription
 */
router.delete("/subscriptions/:productId", requireAuth, async (req, res) => {
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

/**
 * Contact form endpoint
 */
router.post("/contact", async (req, res) => {
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

export default router;
