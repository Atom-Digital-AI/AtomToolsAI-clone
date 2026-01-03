// Seed script for Admin tier - Creates an Admin package with unlimited access to all products
// Usage: npx tsx server/seed-admin-tier.ts [user-email]
// If user-email is provided, the user will be granted Admin tier access

import { db } from "./db";
import {
  packages,
  tiers,
  tierLimits,
  tierPrices,
  packageProducts,
  products,
  users,
  userTierSubscriptions,
} from "@shared/schema";
import { PRODUCT_IDS } from "@shared/schema";
import { eq, and } from "drizzle-orm";

// Fixed IDs for Admin package and tier (to ensure idempotency)
const ADMIN_PACKAGE_ID = "admin-package-00000000-0000-0000-0000-000000000001";
const ADMIN_TIER_ID = "admin-tier-00000000-0000-0000-0000-000000000001";

async function seedAdminTier(userEmail?: string) {
  console.log("Seeding Admin tier...\n");

  try {
    // Step 1: Create or update Admin package
    console.log("1. Creating Admin package...");
    const [existingPackage] = await db
      .select()
      .from(packages)
      .where(eq(packages.id, ADMIN_PACKAGE_ID));

    if (existingPackage) {
      await db
        .update(packages)
        .set({
          name: "Admin Package",
          description:
            "Full administrative access to all products and features",
          category: "Admin",
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(packages.id, ADMIN_PACKAGE_ID));
      console.log("   ✓ Admin package updated");
    } else {
      await db.insert(packages).values({
        id: ADMIN_PACKAGE_ID,
        name: "Admin Package",
        description:
          "Full administrative access to all products and features",
        category: "Admin",
        version: 1,
        isActive: true,
      });
      console.log("   ✓ Admin package created");
    }

    // Step 2: Create or update Admin tier
    console.log("2. Creating Admin tier...");
    const [existingTier] = await db
      .select()
      .from(tiers)
      .where(eq(tiers.id, ADMIN_TIER_ID));

    if (existingTier) {
      await db
        .update(tiers)
        .set({
          name: "Admin",
          promotionalTag: "Full Access",
          sortOrder: 0,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(tiers.id, ADMIN_TIER_ID));
      console.log("   ✓ Admin tier updated");
    } else {
      await db.insert(tiers).values({
        id: ADMIN_TIER_ID,
        packageId: ADMIN_PACKAGE_ID,
        name: "Admin",
        promotionalTag: "Full Access",
        sortOrder: 0,
        isActive: true,
      });
      console.log("   ✓ Admin tier created");
    }

    // Step 3: Create tier price (free for admin)
    console.log("3. Setting tier price...");
    const [existingPrice] = await db
      .select()
      .from(tierPrices)
      .where(eq(tierPrices.tierId, ADMIN_TIER_ID));

    if (!existingPrice) {
      await db.insert(tierPrices).values({
        tierId: ADMIN_TIER_ID,
        interval: "lifetime",
        amountMinor: 0, // Free
        currency: "GBP",
      });
      console.log("   ✓ Tier price created (free, lifetime)");
    } else {
      console.log("   ✓ Tier price already exists");
    }

    // Step 4: Get all products and create tier limits with unlimited access
    console.log("4. Creating tier limits for all products...");
    const allProducts = await db.select().from(products);

    for (const product of allProducts) {
      // Check if tier limit already exists
      const [existingLimit] = await db
        .select()
        .from(tierLimits)
        .where(
          and(
            eq(tierLimits.tierId, ADMIN_TIER_ID),
            eq(tierLimits.productId, product.id)
          )
        );

      // All subfeatures enabled
      const allSubfeatures = {
        bulk: true,
        variations: true,
        brand_guidelines: true,
        platforms: [
          "Facebook",
          "Instagram",
          "TikTok",
          "X",
          "YouTube",
          "LinkedIn",
          "Pinterest",
        ],
        max_formats_per_platform: null, // unlimited
      };

      if (existingLimit) {
        await db
          .update(tierLimits)
          .set({
            includedInTier: true,
            periodicity: "lifetime",
            quantity: null, // null = unlimited
            subfeatures: allSubfeatures,
          })
          .where(eq(tierLimits.id, existingLimit.id));
        console.log(`   ✓ Updated tier limit: ${product.name}`);
      } else {
        await db.insert(tierLimits).values({
          tierId: ADMIN_TIER_ID,
          productId: product.id,
          includedInTier: true,
          periodicity: "lifetime",
          quantity: null, // null = unlimited
          subfeatures: allSubfeatures,
        });
        console.log(`   ✓ Created tier limit: ${product.name}`);
      }

      // Also link product to package
      const [existingLink] = await db
        .select()
        .from(packageProducts)
        .where(
          and(
            eq(packageProducts.packageId, ADMIN_PACKAGE_ID),
            eq(packageProducts.productId, product.id)
          )
        );

      if (!existingLink) {
        await db.insert(packageProducts).values({
          packageId: ADMIN_PACKAGE_ID,
          productId: product.id,
        });
      }
    }

    console.log(`\n✅ Admin tier created with access to ${allProducts.length} products`);

    // Step 5: Grant access to user if email provided
    if (userEmail) {
      console.log(`\n5. Granting Admin tier access to: ${userEmail}`);

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, userEmail));

      if (!user) {
        console.log(`   ❌ User not found with email: ${userEmail}`);
        console.log("   Please register the user first, then run this script again.");
      } else {
        // Check if already subscribed
        const [existingSub] = await db
          .select()
          .from(userTierSubscriptions)
          .where(
            and(
              eq(userTierSubscriptions.userId, user.id),
              eq(userTierSubscriptions.tierId, ADMIN_TIER_ID)
            )
          );

        if (existingSub) {
          // Reactivate if deactivated
          await db
            .update(userTierSubscriptions)
            .set({
              isActive: true,
              expiresAt: null, // Never expires
              updatedAt: new Date(),
            })
            .where(eq(userTierSubscriptions.id, existingSub.id));
          console.log(`   ✓ Admin tier access reactivated for ${userEmail}`);
        } else {
          await db.insert(userTierSubscriptions).values({
            userId: user.id,
            tierId: ADMIN_TIER_ID,
            subscribedAt: new Date(),
            expiresAt: null, // Never expires
            isActive: true,
            paymentReference: "ADMIN_GRANT",
            currentUsage: {},
            lastResetAt: new Date(),
          });
          console.log(`   ✓ Admin tier access granted to ${userEmail}`);
        }

        // Also ensure user has isAdmin flag set
        if (!user.isAdmin) {
          await db
            .update(users)
            .set({ isAdmin: true, updatedAt: new Date() })
            .where(eq(users.id, user.id));
          console.log(`   ✓ User marked as admin`);
        }
      }
    }

    console.log("\n🎉 Admin tier setup complete!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding Admin tier:", error);
    process.exit(1);
  }
}

// Get user email from command line argument
const userEmail = process.argv[2];
seedAdminTier(userEmail);
