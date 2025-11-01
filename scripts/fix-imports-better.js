#!/usr/bin/env node
/**
 * Add .js extensions to all relative imports for ESM compatibility
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const distServerDir = join(rootDir, 'dist', 'server');
const distSharedDir = join(rootDir, 'dist', 'shared');

console.log('Adding .js extensions to imports...');

function addJsExtensions(dir) {
  if (!existsSync(dir)) {
    console.log(`Directory ${dir} does not exist, skipping`);
    return;
  }
  
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      addJsExtensions(filePath);
      continue;
    }
    
    if (extname(file) !== '.js') continue;
    
    let content = readFileSync(filePath, 'utf-8');
    let modified = false;
    
    // Add .js extension to relative imports that don't have an extension
    // Match: from './file' or from '../file' but not './file.js' or './file.json'
    content = content.replace(
      /from\s+['"](\.\.?\/[^'"]+?)(?<!\.js|\.json)['"]/g,
      (match, importPath) => {
        modified = true;
        return `from "${importPath}.js"`;
      }
    );
    
    // Fix side-effect imports: import "./file" -> import "./file.js"
    content = content.replace(
      /import\s+['"](\.\.?\/[^'"]+?)(?<!\.js|\.json)['"]/g,
      (match, importPath) => {
        modified = true;
        return `import "${importPath}.js"`;
      }
    );
    
    // Also fix import() dynamic imports
    content = content.replace(
      /import\s*\(\s*['"](\.\.?\/[^'"]+?)(?<!\.js|\.json)['"]\s*\)/g,
      (match, importPath) => {
        modified = true;
        return `import("${importPath}.js")`;
      }
    );
    
    if (modified) {
      writeFileSync(filePath, content, 'utf-8');
      console.log(`✓ Fixed ${filePath}`);
    }
  }
}

try {
  addJsExtensions(distServerDir);
  if (existsSync(distSharedDir)) {
    addJsExtensions(distSharedDir);
  }
  console.log('\nDone!');
} catch (error) {
  console.error('Error fixing imports:', error.message);
  process.exit(1);
}

