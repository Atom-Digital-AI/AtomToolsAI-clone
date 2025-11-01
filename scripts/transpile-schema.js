#!/usr/bin/env node
/**
 * Transpile shared/schema.ts without bundling
 * This preserves drizzle-orm column builder objects
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const schemaPath = join(rootDir, 'shared/schema.ts');
const outputPath = join(rootDir, 'dist/shared/schema.js');

const code = readFileSync(schemaPath, 'utf8');

const result = ts.transpile(code, {
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ES2020,
  esModuleInterop: true,
  skipLibCheck: true,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
});

writeFileSync(outputPath, result, 'utf8');
console.log('✓ Transpiled schema.ts without bundling');

