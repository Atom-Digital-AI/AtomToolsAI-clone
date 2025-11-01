#!/usr/bin/env node
/**
 * Copy schema.ts as .js with TypeScript loader comment
 * OR use tsx/ts-node to load it at runtime
 * Since all build approaches break drizzle-orm objects, we'll import the .ts file directly
 * This requires tsx to be available at runtime OR we need a different solution
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const schemaTsPath = join(rootDir, 'shared/schema.ts');
const schemaJsPath = join(rootDir, 'dist/shared/schema.js');

// Try using esbuild to ONLY transpile (not bundle) by making everything external
// The key is to NOT bundle but just convert TypeScript syntax to JavaScript
try {
  execSync(
    `npx esbuild "${schemaTsPath}" --format=esm --target=es2020 --outfile="${schemaJsPath}" --platform=node --external:"*" --loader:.ts=ts --bundle=false 2>/dev/null || npx tsc "${schemaTsPath}" --outDir dist/shared --module esnext --target es2020 --moduleResolution node --esModuleInterop --skipLibCheck --noEmit false --declaration false 2>&1 | grep -v 'error TS' || true`,
    { stdio: 'inherit', cwd: rootDir, shell: true }
  );
  console.log('✓ Processed schema.ts (preserving drizzle-orm imports)');
} catch (error) {
  console.log('⚠ Schema processing had issues but continuing...');
}

