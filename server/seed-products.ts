// Seed script for products - Run this to populate the products table
// Usage: npx tsx server/seed-products.ts

import { db } from "./db";
import { products } from "@shared/schema";
import { PRODUCT_IDS } from "@shared/schema";
import { eq } from "drizzle-orm";

const PRODUCTS_DATA = [
  {
    id: PRODUCT_IDS.SEO_META_GENERATOR,
    name: "SEO Meta Generator",
    description: "Generate clean, on-brand titles & metas at scale with AI-powered SEO optimization.",
    shortDescription: "Generate clean, on-brand titles & metas at scale.",
    features: [
      "Upload CSV or enter URLs",
      "Pick tone and style",
      "AI generates, you review",
      "Bulk processing",
      "Brand guideline compliance"
    ],
    routePath: "/app/tools/seo-meta-generator",
    marketingPath: "/tools/seo-meta-generator",
    iconName: "Search",
    tags: ["seo", "meta", "generator", "ai"],
    availableSubfeatures: {
      bulk: true,
      variations: true,
      brand_guidelines: true
    },
    isActive: true
  },
  {
    id: PRODUCT_IDS.GOOGLE_ADS_GENERATOR,
    name: "Google Ads Copy Generator",
    description: "High-performing headlines & descriptions in seconds. Create multiple ad variations with AI assistance.",
    shortDescription: "High-performing headlines & descriptions in seconds.",
    features: [
      "Enter product/keywords",
      "Set brand guidelines",
      "Export to Google Ads",
      "Multiple ad variations",
      "A/B testing suggestions"
    ],
    routePath: "/app/tools/google-ads-copy-generator",
    marketingPath: "/tools/google-ads-copy-generator",
    iconName: "FileText",
    tags: ["google-ads", "ad-copy", "generator", "ai"],
    availableSubfeatures: {
      bulk: true,
      variations: true,
      brand_guidelines: true
    },
    isActive: true
  },
  {
    id: PRODUCT_IDS.FACEBOOK_ADS_CONNECTOR,
    name: "Facebook Ads Looker Studio Connector Guide",
    description: "Complete guide to building your own Facebook Ads connector. No monthly fees or data storage costs.",
    shortDescription: "Build your own Facebook Ads connector with complete guide and source code.",
    features: [
      "Step-by-step instructions",
      "Complete source code included",
      "Full control & oversight",
      "No monthly fees",
      "Own your data"
    ],
    routePath: "/tools/facebook-ads-looker-studio-connector",
    marketingPath: "/tools/facebook-ads-looker-studio-connector",
    iconName: "Facebook",
    tags: ["facebook-ads", "connector", "guide", "looker-studio"],
    availableSubfeatures: {
      bulk: false,
      variations: false,
      brand_guidelines: false
    },
    isActive: true
  },
  {
    id: PRODUCT_IDS.SOCIAL_CONTENT_GENERATOR,
    name: "Social Content Generator",
    description: "Generate platform-specific social media content with wireframes for Facebook, Instagram, TikTok, X (Twitter), and YouTube.",
    shortDescription: "Generate platform-specific social media content with wireframes.",
    features: [
      "Multiple platform support",
      "Wireframe generation",
      "Platform-specific optimizations",
      "Brand guideline integration",
      "Bulk content creation"
    ],
    routePath: "/app/tools/social-content-generator",
    marketingPath: "/app/tools/social-content-generator",
    iconName: "Share2",
    tags: ["social-media", "content", "generator", "ai"],
    availableSubfeatures: {
      bulk: true,
      variations: true,
      brand_guidelines: true
    },
    isActive: true
  },
  {
    id: PRODUCT_IDS.CONTENT_WRITER_V2,
    name: "Content Writer v2",
    description: "Multi-stage AI article generation with concept selection, subtopic planning, and complete article assembly. Built with LangGraph for resumable workflows.",
    shortDescription: "Multi-stage AI article generation with concept selection and subtopic planning.",
    features: [
      "AI-generated article concepts",
      "Subtopic selection & planning",
      "Complete article assembly",
      "Resumable workflows",
      "Quality control integration"
    ],
    routePath: "/app/tools/content-writer-v2",
    marketingPath: "/app/tools/content-writer-v2",
    iconName: "PenTool",
    tags: ["content-writer", "article", "generator", "ai", "langgraph"],
    availableSubfeatures: {
      bulk: false,
      variations: true,
      brand_guidelines: true
    },
    isActive: true
  }
];

async function seedProducts() {
  console.log('Seeding products...');
  
  try {
    // Check existing products and update or insert
    for (const productData of PRODUCTS_DATA) {
      const [existing] = await db
        .select()
        .from(products)
        .where(eq(products.id, productData.id));

      if (existing) {
        // Update existing product
        await db
          .update(products)
          .set({
            name: productData.name,
            description: productData.description,
            shortDescription: productData.shortDescription,
            features: productData.features,
            routePath: productData.routePath,
            marketingPath: productData.marketingPath,
            iconName: productData.iconName,
            tags: productData.tags,
            availableSubfeatures: productData.availableSubfeatures,
            isActive: productData.isActive,
            updatedAt: new Date()
          })
          .where(eq(products.id, productData.id));
        console.log(`✓ Updated: ${productData.name}`);
      } else {
        // Insert new product
        await db.insert(products).values(productData);
        console.log(`✓ Created: ${productData.name}`);
      }
    }
    
    console.log(`\n✅ Successfully seeded ${PRODUCTS_DATA.length} products`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding products:', error);
    process.exit(1);
  }
}

seedProducts();

