#!/usr/bin/env node
/**
 * Post-build script to transform @shared/* imports to relative paths
 * This is needed because esbuild marks @shared/* as external, but Node.js
 * doesn't understand TypeScript path aliases at runtime.
 */

import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  existsSync,
} from "fs";
import { join, dirname, relative, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = resolve(__dirname, "../dist");

function transformImports(content, filePath) {
  // Find all imports that need fixing - both @shared/* and shared/* (after esbuild)
  const importRegex = /from\s+['"](@?shared\/[^'"]+)['"]/g;
  const importAllRegex =
    /import\s+\*\s+as\s+\w+\s+from\s+['"](@?shared\/[^'"]+)['"]/g;
  const requireRegex = /require\(['"](@?shared\/[^'"]+)['"]\)/g;

  let modified = content;

  const transformPath = (importPath) => {
    // Remove @ prefix if present
    const cleanPath = importPath.replace(/^@/, "");

    // Extract the path part (e.g., "shared/schema" from "shared/schema.js")
    const pathMatch = cleanPath.match(/^shared\/(.+?)(\.(js|ts))?$/);
    if (!pathMatch) return importPath;

    const schemaPath = pathMatch[1];

    // Always use .js for production builds
    const jsPath = resolve(distDir, "shared", schemaPath + ".js");
    const relativePath = relative(dirname(filePath), jsPath);
    let normalizedPath = relativePath.replace(/\\/g, "/");

    // Ensure .js extension for ESM
    if (!normalizedPath.endsWith(".js")) {
      normalizedPath += ".js";
    }

    // Ensure it starts with ./ or ../ for relative paths
    if (!normalizedPath.startsWith("./") && !normalizedPath.startsWith("../")) {
      normalizedPath = "./" + normalizedPath;
    }

    return normalizedPath;
  };

  // Transform imports
  modified = modified.replace(importRegex, (match, importPath) => {
    const newPath = transformPath(importPath);
    return match.replace(importPath, newPath);
  });

  modified = modified.replace(importAllRegex, (match, importPath) => {
    const newPath = transformPath(importPath);
    return match.replace(importPath, newPath);
  });

  modified = modified.replace(requireRegex, (match, importPath) => {
    const newPath = transformPath(importPath);
    return match.replace(importPath, newPath);
  });

  return modified;
}

function processFile(filePath) {
  try {
    const content = readFileSync(filePath, "utf8");
    const transformed = transformImports(content, filePath);

    if (content !== transformed) {
      writeFileSync(filePath, transformed, "utf8");
      console.log(`✓ Fixed imports in ${filePath.replace(distDir, "dist")}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

function processDirectory(dir) {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (stat.isFile() && entry.endsWith(".js")) {
      processFile(fullPath);
    }
  }
}

// Start processing
console.log("Transforming @shared/* imports to relative paths...");
processDirectory(distDir);
console.log("Done!");
