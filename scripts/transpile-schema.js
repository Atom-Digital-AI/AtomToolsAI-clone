#!/usr/bin/env node
/**
 * Transpile schema.ts to JavaScript using TypeScript compiler
 * This preserves drizzle-orm imports correctly without bundling
 */

import { mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const schemaTsPath = join(rootDir, 'shared/schema.ts');
const schemaJsPath = join(rootDir, 'dist/shared/schema.js');
const distSharedDir = join(rootDir, 'dist/shared');

// Ensure dist/shared directory exists
mkdirSync(distSharedDir, { recursive: true });

// Use TypeScript compiler with proper module resolution
try {
  // Create a minimal tsconfig just for schema transpilation
  const tsConfigPath = join(rootDir, 'tsconfig.schema.build.json');
  const tsConfig = {
    compilerOptions: {
      outDir: distSharedDir,
      rootDir: join(rootDir, 'shared'),
      module: 'ESNext',
      target: 'ES2020',
      moduleResolution: 'bundler',
      esModuleInterop: true,
      skipLibCheck: true,
      declaration: false,
      noEmit: false,
      allowImportingTsExtensions: false,
      resolveJsonModule: true,
      allowSyntheticDefaultImports: true
    },
    include: ['shared/schema.ts']
  };
  
  writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));
  
  // Transpile using tsc with isolatedModules to preserve drizzle-orm objects
  execSync(
    `npx tsc --project "${tsConfigPath}" --isolatedModules false`,
    { stdio: 'pipe', cwd: rootDir }
  );
  
  // Clean up temp config
  try {
    unlinkSync(tsConfigPath);
  } catch (e) {
    // Ignore cleanup errors
  }
  
  // Rename the output file if needed (tsc might output to different location)
  const tscOutputPath = join(distSharedDir, 'schema.js');
  if (require('fs').existsSync(tscOutputPath) && tscOutputPath !== schemaJsPath) {
    require('fs').renameSync(tscOutputPath, schemaJsPath);
  }
  
  console.log('✓ Processed schema.ts using TypeScript compiler (preserving drizzle-orm imports)');
} catch (error) {
  console.error('⚠ Error transpiling schema with tsc:', error.message);
  // Fallback: try esbuild with transformations disabled
  try {
    execSync(
      `npx esbuild "${schemaTsPath}" --format=esm --target=es2020 --outfile="${schemaJsPath}" --platform=node --bundle=false --keep-names --preserve-symlinks`,
      { stdio: 'inherit', cwd: rootDir }
    );
    console.log('✓ Processed schema.ts using esbuild fallback');
  } catch (fallbackError) {
    console.error('⚠ All schema transpilation methods failed');
  }
}

