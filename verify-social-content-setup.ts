/**
 * Social Content Generator Setup Verification
 * 
 * Run with: npx tsx verify-social-content-setup.ts
 * 
 * This script checks if all components are properly set up
 */

import { db } from "./server/db";
import { adSpecs, products, socialContentSessions, socialContentWireframes } from "@shared/schema";
import { PRODUCT_IDS } from "@shared/schema";
import { eq } from "drizzle-orm";

let checks = 0;
let passed = 0;
let failed = 0;

async function check(name: string, fn: () => Promise<boolean>) {
  checks++;
  try {
    const result = await fn();
    if (result) {
      console.log(`? ${name}`);
      passed++;
    } else {
      console.error(`? ${name}`);
      failed++;
    }
  } catch (error) {
    console.error(`? ${name} - Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    failed++;
  }
}

async function main() {
  console.log('\n=== Social Content Generator Setup Verification ===\n');
  
  // Check 1: Database connection
  await check('Database connection', async () => {
    try {
      await db.execute('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  });
  
  // Check 2: adSpecs table exists and has data
  await check('Ad specs table exists with data', async () => {
    const specs = await db.select().from(adSpecs).limit(1);
    return specs.length > 0;
  });
  
  // Check 3: Correct number of ad specs (49)
  await check('All 49 ad specs seeded', async () => {
    const count = await db.select().from(adSpecs);
    console.log(`    Found ${count.length} ad specs`);
    return count.length === 49;
  });
  
  // Check 4: socialContentSessions table exists
  await check('Social content sessions table exists', async () => {
    try {
      await db.select().from(socialContentSessions).limit(1);
      return true;
    } catch (error) {
      return false;
    }
  });
  
  // Check 5: socialContentWireframes table exists
  await check('Social content wireframes table exists', async () => {
    try {
      await db.select().from(socialContentWireframes).limit(1);
      return true;
    } catch (error) {
      return false;
    }
  });
  
  // Check 6: Product ID exists in schema
  await check('SOCIAL_CONTENT_GENERATOR product ID defined', async () => {
    return PRODUCT_IDS.SOCIAL_CONTENT_GENERATOR === '7a3c8f1e-9b2d-4e6a-8f7c-1d2e3f4a5b6c';
  });
  
  // Check 7: Platform coverage
  await check('All 5 platforms covered in ad specs', async () => {
    const specs = await db.select().from(adSpecs);
    const platforms = new Set(specs.map(s => s.platform));
    const expectedPlatforms = ['Facebook', 'Instagram', 'TikTok', 'X (Twitter)', 'YouTube'];
    return expectedPlatforms.every(p => platforms.has(p));
  });
  
  // Check 8: Environment variables
  await check('ANTHROPIC_API_KEY set', async () => {
    return !!process.env.ANTHROPIC_API_KEY;
  });
  
  await check('DATABASE_URL set', async () => {
    return !!process.env.DATABASE_URL;
  });
  
  // Check 9: File existence checks
  await check('LangGraph workflow file exists', async () => {
    try {
      await import('./server/langgraph/social-content-graph');
      return true;
    } catch {
      return false;
    }
  });
  
  await check('API routes file exists', async () => {
    try {
      await import('./server/social-content-routes');
      return true;
    } catch {
      return false;
    }
  });
  
  await check('Validation utilities exist', async () => {
    try {
      await import('./server/utils/ad-spec-validator');
      return true;
    } catch {
      return false;
    }
  });
  
  await check('React UI component exists', async () => {
    const fs = await import('fs');
    const path = './client/src/pages/app/tools/social-content-generator.tsx';
    return fs.existsSync(path);
  });
  
  // Summary
  console.log('\n=== Verification Summary ===');
  console.log(`Total Checks: ${checks}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('\n? All checks passed! Social Content Generator is ready to use.');
    console.log('\nNext steps:');
    console.log('1. Ensure you have a product with ID: 7a3c8f1e-9b2d-4e6a-8f7c-1d2e3f4a5b6c');
    console.log('2. Create tier subscriptions with platform access');
    console.log('3. Navigate to /app/tools/social-content-generator');
    process.exit(0);
  } else {
    console.log(`\n? ${failed} check(s) failed. Please review the errors above.`);
    console.log('\nCommon fixes:');
    if (failed > 0) {
      console.log('- Run: npx tsx server/seed-ad-specs.ts');
      console.log('- Check DATABASE_URL and ANTHROPIC_API_KEY in env');
      console.log('- Restart the application');
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error during verification:', error);
  process.exit(1);
});
