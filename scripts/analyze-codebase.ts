#!/usr/bin/env tsx
/**
 * Comprehensive Codebase Analysis Script
 * Analyzes dependencies, generates maps, and identifies issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

interface FileInfo {
  path: string;
  relativePath: string;
  type: 'ts' | 'tsx' | 'js' | 'jsx' | 'py';
  module: 'server' | 'client' | 'tools' | 'shared' | 'python' | 'other';
  imports: ImportInfo[];
  exports: string[];
  functions: FunctionInfo[];
  classes: ClassInfo[];
  components?: ComponentInfo[];
}

interface ImportInfo {
  source: string;
  type: 'relative' | 'absolute' | 'alias' | 'external' | 'package';
  resolved?: string;
  names: string[];
}

interface FunctionInfo {
  name: string;
  line: number;
  isExported: boolean;
  isAsync: boolean;
  calls: string[];
}

interface ClassInfo {
  name: string;
  line: number;
  isExported: boolean;
  methods: string[];
}

interface ComponentInfo {
  name: string;
  line: number;
  props: string[];
  usesHooks: string[];
}

interface DependencyGraph {
  files: Map<string, FileInfo>;
  modules: Map<string, string[]>;
  circularDependencies: string[][];
  apiEndpoints: APIEndpoint[];
  databaseTables: string[];
}

interface APIEndpoint {
  method: string;
  path: string;
  handler: string;
  file: string;
  schema?: string;
}

const dependencyGraph: DependencyGraph = {
  files: new Map(),
  modules: new Map(),
  circularDependencies: [],
  apiEndpoints: [],
  databaseTables: [],
};

// Patterns for extracting information
const IMPORT_PATTERN = /import\s+(?:(?:\*\s+as\s+(\w+))|(?:\{([^}]+)\})|(?:(\w+))|(?:\s*(\w+)\s*,\s*\{([^}]+)\}))\s+from\s+['"]([^'"]+)['"]/g;
const EXPORT_PATTERN = /export\s+(?:default\s+)?(?:function|const|class|interface|type|enum)\s+(\w+)/g;
const FUNCTION_PATTERN = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
const CLASS_PATTERN = /(?:export\s+)?class\s+(\w+)/g;
const ROUTE_PATTERN = /app\.(get|post|put|delete|patch)\s*\(['"]([^'"]+)['"]/g;
const COMPONENT_PATTERN = /(?:export\s+)?(?:default\s+)?function\s+(\w+)\s*\(/g;

function getModuleType(filePath: string): FileInfo['module'] {
  if (filePath.includes('/server/')) return 'server';
  if (filePath.includes('/client/')) return 'client';
  if (filePath.includes('/tools/')) return 'tools';
  if (filePath.includes('/shared/')) return 'shared';
  if (filePath.includes('Ad Copy Generator App')) return 'python';
  return 'other';
}

function resolveImport(importPath: string | undefined, fromFile: string): ImportInfo {
  if (!importPath) {
    return {
      source: 'unknown',
      type: 'external',
      names: [],
    };
  }
  
  const relativePath = path.dirname(fromFile);
  
  if (importPath.startsWith('@shared/')) {
    return {
      source: importPath,
      type: 'alias',
      resolved: path.resolve(rootDir, 'shared', importPath.replace('@shared/', '')),
      names: [],
    };
  }
  
  if (importPath.startsWith('@tools/')) {
    return {
      source: importPath,
      type: 'alias',
      resolved: path.resolve(rootDir, 'tools', importPath.replace('@tools/', '')),
      names: [],
    };
  }
  
  if (importPath.startsWith('@/')) {
    return {
      source: importPath,
      type: 'alias',
      resolved: path.resolve(rootDir, 'client/src', importPath.replace('@/', '')),
      names: [],
    };
  }
  
  if (importPath.startsWith('.')) {
    const resolved = path.resolve(relativePath, importPath);
    return {
      source: importPath,
      type: 'relative',
      resolved: resolved.endsWith('.ts') || resolved.endsWith('.tsx') ? resolved : `${resolved}.ts`,
      names: [],
    };
  }
  
  // External package
  return {
    source: importPath,
    type: 'package',
    names: [],
  };
}

function analyzeFile(filePath: string): FileInfo | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(rootDir, filePath);
    const ext = path.extname(filePath).slice(1) as FileInfo['type'];
    const module = getModuleType(filePath);
    
    const fileInfo: FileInfo = {
      path: filePath,
      relativePath,
      type: ext,
      module,
      imports: [],
      exports: [],
      functions: [],
      classes: [],
    };
    
    // Extract imports
    const importMatches = [...content.matchAll(IMPORT_PATTERN)];
    for (const match of importMatches) {
      if (match[1]) {
        const importInfo = resolveImport(match[1], filePath);
        fileInfo.imports.push(importInfo);
      }
    }
    
    // Extract exports
    const exportMatches = [...content.matchAll(EXPORT_PATTERN)];
    for (const match of exportMatches) {
      if (match[1]) fileInfo.exports.push(match[1]);
    }
    
    // Extract functions
    const functionMatches = [...content.matchAll(FUNCTION_PATTERN)];
    let lineNumber = 1;
    for (const match of functionMatches) {
      const beforeMatch = content.substring(0, match.index || 0);
      lineNumber = beforeMatch.split('\n').length;
      fileInfo.functions.push({
        name: match[1],
        line: lineNumber,
        isExported: content.substring(0, match.index || 0).includes('export'),
        isAsync: match[0].includes('async'),
        calls: [],
      });
    }
    
    // Extract classes
    const classMatches = [...content.matchAll(CLASS_PATTERN)];
    for (const match of classMatches) {
      const beforeMatch = content.substring(0, match.index || 0);
      lineNumber = beforeMatch.split('\n').length;
      fileInfo.classes.push({
        name: match[1],
        line: lineNumber,
        isExported: content.substring(0, match.index || 0).includes('export'),
        methods: [],
      });
    }
    
    // Extract API routes
    if (filePath.includes('routes.ts') || filePath.includes('routes.js')) {
      const routeMatches = [...content.matchAll(ROUTE_PATTERN)];
      for (const match of routeMatches) {
        dependencyGraph.apiEndpoints.push({
          method: match[1].toUpperCase(),
          path: match[2],
          handler: 'unknown',
          file: relativePath,
        });
      }
    }
    
    // Extract React components
    if (ext === 'tsx') {
      const componentMatches = [...content.matchAll(COMPONENT_PATTERN)];
      fileInfo.components = componentMatches.map(match => ({
        name: match[1],
        line: content.substring(0, match.index || 0).split('\n').length,
        props: [],
        usesHooks: [],
      }));
    }
    
    return fileInfo;
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error);
    return null;
  }
}

function findAllSourceFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  
  function walk(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      // Skip node_modules, dist, build, .git
      if (entry.name === 'node_modules' || entry.name === 'dist' || 
          entry.name === 'build' || entry.name === '.git' ||
          entry.name === '.next' || entry.name.startsWith('.')) {
        continue;
      }
      
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).slice(1);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  walk(dir);
  return files;
}

function detectCircularDependencies(): void {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[][] = [];
  
  function dfs(file: string, path: string[]): void {
    if (recursionStack.has(file)) {
      const cycleStart = path.indexOf(file);
      cycles.push([...path.slice(cycleStart), file]);
      return;
    }
    
    if (visited.has(file)) return;
    
    visited.add(file);
    recursionStack.add(file);
    
    const fileInfo = dependencyGraph.files.get(file);
    if (fileInfo) {
      for (const imp of fileInfo.imports) {
        if (imp.resolved && fs.existsSync(imp.resolved)) {
          const targetFile = imp.resolved;
          if (dependencyGraph.files.has(targetFile)) {
            dfs(targetFile, [...path, file]);
          }
        }
      }
    }
    
    recursionStack.delete(file);
  }
  
  for (const file of dependencyGraph.files.keys()) {
    if (!visited.has(file)) {
      dfs(file, []);
    }
  }
  
  dependencyGraph.circularDependencies = cycles;
}

function extractDatabaseTables(): void {
  const schemaFile = path.join(rootDir, 'shared', 'schema.ts');
  if (fs.existsSync(schemaFile)) {
    const content = fs.readFileSync(schemaFile, 'utf-8');
    const tablePattern = /export\s+const\s+(\w+)\s*=\s*pgTable/g;
    const matches = [...content.matchAll(tablePattern)];
    dependencyGraph.databaseTables = matches.map(m => m[1]);
  }
}

async function main() {
  console.log('Starting codebase analysis...');
  
  // Find all source files
  const sourceFiles = [
    ...findAllSourceFiles(path.join(rootDir, 'server'), ['ts', 'js']),
    ...findAllSourceFiles(path.join(rootDir, 'client'), ['ts', 'tsx', 'js', 'jsx']),
    ...findAllSourceFiles(path.join(rootDir, 'tools'), ['ts', 'tsx', 'js', 'jsx']),
    ...findAllSourceFiles(path.join(rootDir, 'shared'), ['ts', 'js']),
  ];
  
  console.log(`Found ${sourceFiles.length} source files`);
  
  // Analyze each file
  for (const file of sourceFiles) {
    const info = analyzeFile(file);
    if (info) {
      dependencyGraph.files.set(file, info);
      
      // Group by module
      if (!dependencyGraph.modules.has(info.module)) {
        dependencyGraph.modules.set(info.module, []);
      }
      dependencyGraph.modules.get(info.module)!.push(file);
    }
  }
  
  // Detect circular dependencies
  console.log('Detecting circular dependencies...');
  detectCircularDependencies();
  
  // Extract database tables
  extractDatabaseTables();
  
  // Generate reports
  const outputDir = path.join(rootDir, 'docs', 'codebase-analysis');
  fs.mkdirSync(outputDir, { recursive: true });
  
  // Save dependency graph as JSON
  const graphData = {
    files: Array.from(dependencyGraph.files.entries()).map(([path, info]) => ({
      path: info.relativePath,
      module: info.module,
      imports: info.imports.map(i => i.source),
      exports: info.exports,
      functions: info.functions.map(f => f.name),
      classes: info.classes.map(c => c.name),
    })),
    modules: Object.fromEntries(dependencyGraph.modules),
    circularDependencies: dependencyGraph.circularDependencies,
    apiEndpoints: dependencyGraph.apiEndpoints,
    databaseTables: dependencyGraph.databaseTables,
    stats: {
      totalFiles: dependencyGraph.files.size,
      totalImports: Array.from(dependencyGraph.files.values()).reduce((sum, f) => sum + f.imports.length, 0),
      totalExports: Array.from(dependencyGraph.files.values()).reduce((sum, f) => sum + f.exports.length, 0),
      totalFunctions: Array.from(dependencyGraph.files.values()).reduce((sum, f) => sum + f.functions.length, 0),
      totalClasses: Array.from(dependencyGraph.files.values()).reduce((sum, f) => sum + f.classes.length, 0),
      totalAPIEndpoints: dependencyGraph.apiEndpoints.length,
      totalDatabaseTables: dependencyGraph.databaseTables.length,
      circularDependencyCount: dependencyGraph.circularDependencies.length,
    },
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'dependency-graph.json'),
    JSON.stringify(graphData, null, 2)
  );
  
  console.log(`Analysis complete! Results saved to ${outputDir}`);
  console.log(`Stats:`, graphData.stats);
}

main().catch(console.error);

