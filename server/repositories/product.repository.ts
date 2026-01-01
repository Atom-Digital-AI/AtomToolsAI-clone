import { eq } from "drizzle-orm";
import { db } from "../db";
import {
  products,
  packages,
  tiers,
  tierLimits,
  tierPrices,
  packageProducts,
  type Product,
  type InsertProduct,
  type Package,
  type Tier,
  type TierLimit,
} from "@shared/schema";

/**
 * Product Repository
 * Handles all product and package-related database operations
 */
export const productRepository = {
  /**
   * Get all active products
   */
  async findAll(): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.isActive, true));
  },

  /**
   * Get product by ID
   */
  async findById(id: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id));
    return product || undefined;
  },

  /**
   * Get product by route path
   */
  async findByPath(routePath: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.routePath, routePath));
    return product || undefined;
  },

  /**
   * Create a new product
   */
  async create(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  },

  /**
   * Update product
   */
  async update(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updatedProduct] = await db
      .update(products)
      .set(product)
      .where(eq(products.id, id))
      .returning();
    return updatedProduct || undefined;
  },

  /**
   * Soft delete product (set isActive to false)
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .update(products)
      .set({ isActive: false })
      .where(eq(products.id, id));
    return (result.rowCount ?? 0) > 0;
  },

  /**
   * Get all packages
   */
  async findAllPackages(): Promise<Package[]> {
    return await db.select().from(packages);
  },

  /**
   * Get package by ID
   */
  async findPackageById(id: string): Promise<Package | undefined> {
    const [pkg] = await db.select().from(packages).where(eq(packages.id, id));
    return pkg || undefined;
  },

  /**
   * Get tier by ID
   */
  async findTierById(id: string): Promise<Tier | undefined> {
    const [tier] = await db.select().from(tiers).where(eq(tiers.id, id));
    return tier || undefined;
  },

  /**
   * Get Free tier (for auto-assigning new users)
   */
  async findFreeTier(): Promise<Tier | undefined> {
    const [tier] = await db
      .select()
      .from(tiers)
      .where(eq(tiers.name, "Free"));
    return tier || undefined;
  },

  /**
   * Get tier limit for a product
   */
  async findTierLimit(tierId: string, productId: string): Promise<TierLimit | undefined> {
    const [limit] = await db
      .select()
      .from(tierLimits)
      .where(
        eq(tierLimits.tierId, tierId) && eq(tierLimits.productId, productId)
      );
    return limit || undefined;
  },

  /**
   * Get all products for a tier (via package)
   */
  async findProductsForTier(tierId: string): Promise<Product[]> {
    // Get the tier to find its package
    const [tier] = await db.select().from(tiers).where(eq(tiers.id, tierId));
    if (!tier) return [];

    // Get all products for this package through package_products table
    const packageProductsQuery = await db
      .select({
        product: products,
      })
      .from(packageProducts)
      .innerJoin(products, eq(packageProducts.productId, products.id))
      .where(eq(packageProducts.packageId, tier.packageId));

    return packageProductsQuery.map((p: any) => p.product);
  },

  /**
   * Get all packages with their tiers, prices, and limits
   */
  async findAllPackagesWithTiers(): Promise<any[]> {
    const allPackages = await db
      .select()
      .from(packages)
      .where(eq(packages.isActive, true));

    const packagesWithTiers = await Promise.all(
      allPackages.map(async (pkg) => {
        const pkgTiers = await db
          .select()
          .from(tiers)
          .where(eq(tiers.packageId, pkg.id));

        const tiersWithDetails = await Promise.all(
          pkgTiers.map(async (tier) => {
            const prices = await db
              .select()
              .from(tierPrices)
              .where(eq(tierPrices.tierId, tier.id));

            const limits = await db
              .select()
              .from(tierLimits)
              .where(eq(tierLimits.tierId, tier.id));

            return {
              ...tier,
              prices,
              limits,
            };
          })
        );

        // Get products for this package
        const pkgProducts = await db
          .select({ product: products })
          .from(packageProducts)
          .innerJoin(products, eq(packageProducts.productId, products.id))
          .where(eq(packageProducts.packageId, pkg.id));

        return {
          ...pkg,
          tiers: tiersWithDetails,
          products: pkgProducts.map((p: any) => p.product),
        };
      })
    );

    return packagesWithTiers;
  },
};
