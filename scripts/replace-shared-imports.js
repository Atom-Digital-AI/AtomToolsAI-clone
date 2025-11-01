#!/usr/bin/env node
/**
 * Replace @shared/* imports with relative paths for production
 * This avoids tsconfig path resolution issues with tsx
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function replaceImports() {
  // Find all TypeScript files in server directory
  const files = await glob('server/**/*.ts', { cwd: rootDir, absolute: true });
  
  let totalReplacements = 0;
  
  for (const file of files) {
    let content = readFileSync(file, 'utf-8');
    let replacements = 0;
    
    // Replace @shared/* imports with relative paths
    const regex = /from ['"]@shared\/(.*?)['"]/g;
    const newContent = content.replace(regex, (match, importPath) => {
      replacements++;
      
      // Calculate relative path from current file to shared directory
      const fileDir = dirname(file);
      const sharedDir = join(rootDir, 'shared');
      const relativePath = relative(fileDir, join(sharedDir, importPath));
      
      // Ensure path starts with ./ or ../
      const finalPath = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
      
      return `from "${finalPath}"`;
    });
    
    if (replacements > 0) {
      writeFileSync(file, newContent, 'utf-8');
      console.log(`✓ ${relative(rootDir, file)}: ${replacements} replacements`);
      totalReplacements += replacements;
    }
  }
  
  console.log(`\n✓ Total replacements: ${totalReplacements} across ${files.length} files`);
}

replaceImports().catch(console.error);

