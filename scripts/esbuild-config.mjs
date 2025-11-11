#!/usr/bin/env node
/**
 * esbuild configuration for server bundling
 * Marks server directory imports from tools as external
 */

import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

async function buildServer() {
  try {
    await build({
      entryPoints: [resolve(rootDir, 'server/index.ts')],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outdir: resolve(rootDir, 'dist'),
      packages: 'external',
      external: [
        'drizzle-orm',
        'drizzle-zod',
        'zod',
      ],
      plugins: [
        {
          name: 'resolve-relative-imports',
          setup(build) {
            // Resolve all relative imports that might need special handling
            build.onResolve({ filter: /^\.\.?\/.*/ }, (args) => {
              try {
                // First, try standard resolution from the importing file's directory
                let resolvedPath = resolve(args.resolveDir, args.path);
                
                // Helper function to try different file extensions and directory variants
                const tryResolve = (basePath) => {
                  // If it's a directory, try index.ts
                  if (existsSync(basePath) && !basePath.match(/\.(ts|js|json)$/)) {
                    const indexPath = join(basePath, 'index.ts');
                    if (existsSync(indexPath)) {
                      return indexPath;
                    }
                    const dirNamePath = basePath + '.ts';
                    if (existsSync(dirNamePath)) {
                      return dirNamePath;
                    }
                  }
                  
                  // If file exists as-is, return it
                  if (existsSync(basePath)) {
                    return basePath;
                  }
                  
                  // Try adding .ts extension
                  if (!basePath.match(/\.(ts|js|json)$/)) {
                    const withTs = basePath + '.ts';
                    if (existsSync(withTs)) {
                      return withTs;
                    }
                  }
                  
                  return null;
                };
                
                // Try resolving from the importing file's directory
                const resolved = tryResolve(resolvedPath);
                if (resolved) {
                  return { path: resolved };
                }
                
                // If not found, try alternative resolution strategies
                const cleanPath = args.path.replace(/^(\.\.\/)+/, '');
                
                // Strategy 1: Try from project root
                const fromRoot = resolve(rootDir, cleanPath);
                const rootResolved = tryResolve(fromRoot);
                if (rootResolved) {
                  return { path: rootResolved };
                }
                
                // Strategy 2: If path contains 'shared' or 'tools', try from tools directory
                if (cleanPath.includes('shared/') || cleanPath.includes('tools/')) {
                  // Try from tools directory
                  const toolsDir = join(rootDir, 'tools');
                  const fromTools = resolve(toolsDir, cleanPath.replace(/^tools\//, ''));
                  const toolsResolved = tryResolve(fromTools);
                  if (toolsResolved) {
                    return { path: toolsResolved };
                  }
                  
                  // Try with 'tools/' prefix if not present
                  if (!cleanPath.startsWith('tools/')) {
                    const withToolsPrefix = resolve(toolsDir, cleanPath);
                    const withToolsResolved = tryResolve(withToolsPrefix);
                    if (withToolsResolved) {
                      return { path: withToolsResolved };
                    }
                  }
                }
                
                // Strategy 3: Try from server directory if path contains 'server/'
                if (cleanPath.includes('server/')) {
                  const serverDir = join(rootDir, 'server');
                  const fromServer = resolve(serverDir, cleanPath.replace(/^server\//, ''));
                  const serverResolved = tryResolve(fromServer);
                  if (serverResolved) {
                    return { path: serverResolved };
                  }
                }
              } catch (e) {
                // If resolution fails, let esbuild handle it
              }
              
              return null;
            });
          },
        },
      ],
    });
    console.log('✓ Server build completed');
  } catch (error) {
    console.error('✗ Server build failed:', error);
    process.exit(1);
  }
}

buildServer();

