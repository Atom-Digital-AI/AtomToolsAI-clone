// Load environment variables first
import 'dotenv/config';

import { storage } from "./storage";
import { db } from "./db";
import { tierLimits } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Script to create a Super Admin package with all products
 * Only accessible by: sean.bell@atom-digital.co.uk
 */
async function createSuperAdminPackage() {
  try {
    console.log("🚀 Creating Super Admin Package...\n");

    // Step 1: Find the user by email
    const userEmail = "sean.bell@atom-digital.co.uk";
    console.log(`📧 Looking up user: ${userEmail}`);
    const user = await storage.getUserByEmail(userEmail);

    if (!user) {
      throw new Error(`User with email ${userEmail} not found. Please ensure the user exists first.`);
    }

    console.log(`✅ Found user: ${user.email} (ID: ${user.id})\n`);

    // Step 2: Get all active products
    console.log("🔍 Fetching all active products...");
    const allProducts = await storage.getAllProducts();
    console.log(`✅ Found ${allProducts.length} active products\n`);

    if (allProducts.length === 0) {
      throw new Error("No active products found in the system.");
    }

    // Step 3: Check if Super Admin package already exists
    console.log("📦 Checking for existing Super Admin package...");
    const existingPackages = await storage.getAllPackages();
    const existingSuperAdminPackage = existingPackages.find(
      (pkg) => pkg.name.toLowerCase() === "super admin"
    );

    let packageId: string;

    if (existingSuperAdminPackage) {
      console.log(`⚠️  Super Admin package already exists (ID: ${existingSuperAdminPackage.id})`);
      console.log("   Updating existing package...\n");
      packageId = existingSuperAdminPackage.id;
    } else {
      // Step 4: Create the Super Admin package
      console.log("📦 Creating Super Admin package...");
      const newPackage = await storage.createPackage({
        name: "Super Admin",
        description: "Complete access to all tools and features. Exclusive package for super admin.",
        category: "Administration",
        isActive: true,
      });
      packageId = newPackage.id;
      console.log(`✅ Created package: ${newPackage.name} (ID: ${packageId})\n`);
    }

    // Step 5: Add all products to the package
    console.log("🔗 Adding all products to Super Admin package...");
    const existingPackageProducts = await storage.getPackageProducts(packageId);
    const existingProductIds = new Set(existingPackageProducts.map((p) => p.id));

    let addedCount = 0;
    for (const product of allProducts) {
      if (!existingProductIds.has(product.id)) {
        await storage.addProductToPackage(packageId, product.id);
        addedCount++;
        console.log(`   ✓ Added: ${product.name}`);
      } else {
        console.log(`   ⊘ Already added: ${product.name}`);
      }
    }
    console.log(`✅ Added ${addedCount} new products to package\n`);

    // Step 6: Check if Super Admin tier already exists
    console.log("🎚️  Checking for existing Super Admin tier...");
    const packageTiers = await storage.getTiersByPackage(packageId);
    let tierId: string;

    const existingTier = packageTiers.find((t) => t.name.toLowerCase() === "super admin access");

    if (existingTier) {
      console.log(`⚠️  Super Admin tier already exists (ID: ${existingTier.id})`);
      console.log("   Using existing tier...\n");
      tierId = existingTier.id;
    } else {
      // Step 7: Create the Super Admin tier
      console.log("🎚️  Creating Super Admin tier...");
      const newTier = await storage.createTier({
        packageId: packageId,
        name: "Super Admin Access",
        promotionalTag: "Full Access",
        sortOrder: 0,
        isActive: true,
      });
      tierId = newTier.id;
      console.log(`✅ Created tier: ${newTier.name} (ID: ${tierId})\n`);
    }

    // Step 8: Create tier limits for all products with unlimited access
    console.log("⚡ Setting up tier limits for all products...");
    const existingTierLimits = await db
      .select()
      .from(tierLimits)
      .where(eq(tierLimits.tierId, tierId));

    const existingProductIdsInTier = new Set(
      existingTierLimits.map((limit) => limit.productId)
    );

    let limitCount = 0;
    for (const product of allProducts) {
      if (!existingProductIdsInTier.has(product.id)) {
        // Create tier limit with unlimited access
        // quantity: null means unlimited
        // periodicity: 'lifetime' means no time-based restrictions
        // includedInTier: true
        // subfeatures: Enable all available subfeatures for each product
        const productSubfeatures = product.availableSubfeatures || {};
        const subfeatures: Record<string, any> = {};

        // Enable all available subfeatures
        if (productSubfeatures.bulk === true) {
          subfeatures.bulk = true;
        }
        if (productSubfeatures.variations === true) {
          subfeatures.variations = true;
        }
        if (productSubfeatures.brand_guidelines === true) {
          subfeatures.brand_guidelines = true;
        }

        // Add any other subfeatures that exist
        Object.keys(productSubfeatures).forEach((key) => {
          if (productSubfeatures[key] === true) {
            subfeatures[key] = true;
          }
        });

        await storage.createTierLimit({
          tierId: tierId,
          productId: product.id,
          includedInTier: true,
          periodicity: "lifetime",
          quantity: null, // null = unlimited
          subfeatures: subfeatures,
        });
        limitCount++;
        console.log(`   ✓ Configured unlimited access: ${product.name}`);
      } else {
        console.log(`   ⊘ Already configured: ${product.name}`);
      }
    }
    console.log(`✅ Configured ${limitCount} tier limits\n`);

    // Step 9: Subscribe the user to the tier
    console.log(`👤 Subscribing user ${user.email} to Super Admin tier...`);
    const subscription = await storage.subscribeTierUser({
      userId: user.id,
      tierId: tierId,
      isActive: true,
      expiresAt: null, // null = lifetime subscription
    });
    console.log(`✅ User subscribed successfully (Subscription ID: ${subscription.id})\n`);

    // Step 10: Summary
    console.log("=".repeat(60));
    console.log("✨ Super Admin Package Setup Complete! ✨");
    console.log("=".repeat(60));
    console.log(`📦 Package: Super Admin (ID: ${packageId})`);
    console.log(`🎚️  Tier: Super Admin Access (ID: ${tierId})`);
    console.log(`👤 User: ${user.email} (ID: ${user.id})`);
    console.log(`🔧 Products: ${allProducts.length} products with unlimited access`);
    console.log("=".repeat(60));

    // Verify access
    console.log("\n🔍 Verifying access to a few products...");
    const sampleProducts = allProducts.slice(0, Math.min(3, allProducts.length));
    for (const product of sampleProducts) {
      const access = await storage.getUserProductAccess(user.id, product.id);
      if (access.hasAccess) {
        console.log(`   ✅ Access verified: ${product.name}`);
      } else {
        console.log(`   ❌ Access failed: ${product.name}`);
      }
    }

    console.log("\n✅ All done! Super admin package is ready.");
  } catch (error) {
    console.error("\n❌ Error creating Super Admin package:");
    console.error(error);
    process.exit(1);
  }
}

export { createSuperAdminPackage };

// Run the script if this file is executed directly
// Check if we're running as a script (not imported as a module)
const isMainModule = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('create-super-admin-package.ts');

if (isMainModule || process.argv[1]?.includes('create-super-admin-package')) {
  createSuperAdminPackage()
    .then(() => {
      console.log("\n✅ Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Script failed:", error);
      process.exit(1);
    });
}

