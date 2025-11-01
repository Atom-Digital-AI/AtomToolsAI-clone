#!/usr/bin/env node
/**
 * Replace @shared/* imports with relative paths in compiled server code
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const distServerDir = join(rootDir, 'dist', 'server');
const distSharedDir = join(rootDir, 'dist', 'shared');

console.log('Replacing @shared/* imports with relative paths...');

function replaceSharedImports(dir) {
  if (!existsSync(dir)) {
    console.log(`Directory ${dir} does not exist, skipping`);
    return;
  }
  
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      replaceSharedImports(filePath);
      continue;
    }
    
    if (!file.endsWith('.js')) continue;
    
    let content = readFileSync(filePath, 'utf-8');
    let modified = false;
    
    // Replace @shared/* imports with relative paths
    const sharedImportRegex = /from\s+['"]([@]?shared\/[^'"]+)['"]/g;
    
    content = content.replace(sharedImportRegex, (match, importPath) => {
      // Remove @shared/ or shared/ prefix
      const cleanPath = importPath.replace(/^[@]?shared\//, '');
      
      // Calculate relative path from current file to dist/shared
      const fileDir = dirname(filePath);
      const targetFile = join(distSharedDir, cleanPath);
      let relativePath = relative(fileDir, targetFile);
      
      // Ensure path starts with ./  or ../
      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }
      
      modified = true;
      return `from "${relativePath}"`;
    });
    
    if (modified) {
      writeFileSync(filePath, content, 'utf-8');
      console.log(`✓ ${relative(rootDir, filePath)}`);
    }
  }
}

try {
  replaceSharedImports(distServerDir);
  console.log('\nDone!');
} catch (error) {
  console.error('Error replacing imports:', error.message);
  process.exit(1);
}

