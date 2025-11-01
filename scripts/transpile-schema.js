#!/usr/bin/env node
/**
 * Transpile schema.ts to JavaScript using esbuild WITHOUT bundling
 * This preserves drizzle-orm column builder methods correctly
 */

import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");
const schemaTsPath = join(rootDir, "shared/schema.ts");
const schemaJsPath = join(rootDir, "dist/shared/schema.js");
const distSharedDir = join(rootDir, "dist/shared");

// Ensure dist/shared directory exists
mkdirSync(distSharedDir, { recursive: true });

// Use esbuild without bundling to preserve drizzle-orm imports and column builder methods
// This approach transpiles TypeScript to JavaScript while keeping all imports intact
try {
  execSync(
    `npx esbuild "${schemaTsPath}" --format=esm --target=es2020 --outfile="${schemaJsPath}" --platform=node --bundle=false --keep-names --sourcemap`,
    { stdio: "inherit", cwd: rootDir }
  );

  console.log(
    "✓ Successfully transpiled schema.ts using esbuild (preserving all drizzle-orm column builder methods)"
  );
} catch (error) {
  console.error("❌ Error transpiling schema with esbuild:", error.message);
  process.exit(1);
}
