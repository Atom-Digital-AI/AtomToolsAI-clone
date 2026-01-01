import { Router } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth";

const router = Router();

/**
 * Get user tier subscriptions with full details
 */
router.get("/tier-subscriptions", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const subscriptions = await storage.getUserTierSubscriptionsWithDetails(
      userId
    );
    res.json(subscriptions);
  } catch (error) {
    console.error("Error fetching tier subscriptions:", error);
    res.status(500).json({ message: "Failed to fetch tier subscriptions" });
  }
});

/**
 * Get usage statistics for the authenticated user
 */
router.get("/usage-stats", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    // Get user's tier subscriptions
    const tierSubs = await storage.getUserTierSubscriptions(userId);
    const activeTierSub = tierSubs.find((sub) => sub.isActive === true);

    if (!activeTierSub) {
      return res.json({ usageStats: [], hasActiveTier: false });
    }

    // Get all products accessible in this tier
    const products = await storage.getProductsForTier(activeTierSub.tierId);

    const usageStats = await Promise.all(
      products.map(async (product) => {
        const accessInfo = await storage.getUserProductAccess(
          userId,
          product.id
        );
        const currentUsage = await storage.getUserProductUsage(
          userId,
          product.id
        );

        return {
          productId: product.id,
          productName: product.name,
          currentUsage: currentUsage || 0,
          limit: accessInfo.tierLimit?.quantity || 0,
          period: accessInfo.tierLimit?.periodicity || "monthly",
          subfeatures: accessInfo.tierLimit?.subfeatures || {},
          remaining: Math.max(
            0,
            (accessInfo.tierLimit?.quantity || 0) - (currentUsage || 0)
          ),
        };
      })
    );

    res.json({
      usageStats,
      hasActiveTier: true,
      tierName: activeTierSub.tierName,
      tierId: activeTierSub.tierId,
    });
  } catch (error) {
    console.error("Error fetching usage stats:", error);
    res.status(500).json({ message: "Failed to fetch usage statistics" });
  }
});

/**
 * Get user notification preferences
 */
router.get(
  "/notification-preferences",
  requireAuth,
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      const preferences = await storage.getUserNotificationPreferences(
        userId
      );

      res.json({
        preferences: preferences || {
          emailOnArticleComplete: true,
          emailOnSystemMessages: true,
        },
      });
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch notification preferences" });
    }
  }
);

/**
 * Update user notification preferences
 */
router.patch(
  "/notification-preferences",
  requireAuth,
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { emailOnArticleComplete, emailOnSystemMessages } = req.body;

      const preferences = await storage.upsertUserNotificationPreferences(
        userId,
        {
          emailOnArticleComplete,
          emailOnSystemMessages,
        }
      );

      res.json({ preferences });
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res
        .status(500)
        .json({ message: "Failed to update notification preferences" });
    }
  }
);

/**
 * Get notifications for the authenticated user
 */
router.get("/notifications", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const notificationsData = await storage.getUserNotifications(
      userId,
      limit
    );
    const unreadCount = await storage.getUnreadNotificationCount(userId);

    res.json({ notifications: notificationsData, unreadCount });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

/**
 * Mark notification as read
 */
router.patch(
  "/notifications/:id/read",
  requireAuth,
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const success = await storage.markNotificationAsRead(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res
        .status(500)
        .json({ message: "Failed to mark notification as read" });
    }
  }
);

/**
 * Mark all notifications as read
 */
router.patch(
  "/notifications/read-all",
  requireAuth,
  async (req: any, res) => {
    try {
      const userId = req.user.id;

      const success = await storage.markAllNotificationsAsRead(userId);
      res.json({ success });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res
        .status(500)
        .json({ message: "Failed to mark all notifications as read" });
    }
  }
);

/**
 * Delete notification
 */
router.delete("/notifications/:id", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const success = await storage.deleteNotification(id, userId);
    if (!success) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ message: "Failed to delete notification" });
  }
});

/**
 * Debug endpoint to check session status
 */
router.get("/debug/session", (req, res) => {
  res.json({
    sessionID: req.sessionID,
    userId: req.session.userId,
    hasSession: !!req.session,
    cookies: req.headers.cookie,
  });
});

export default router;
