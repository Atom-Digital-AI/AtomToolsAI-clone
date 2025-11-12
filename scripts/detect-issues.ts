#!/usr/bin/env tsx
/**
 * Issue Detection Script
 * Detects duplications, inconsistencies, redundancies, and bugs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

interface Issue {
  type: 'duplication' | 'inconsistency' | 'redundancy' | 'bug' | 'type-safety' | 'architecture';
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line?: number;
  description: string;
  suggestion?: string;
}

const issues: Issue[] = [];

function findAllSourceFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  
  function walk(currentPath: string) {
    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
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
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  walk(dir);
  return files;
}

function detectAnyTypes(filePath: string, content: string): void {
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    // Check for explicit any types
    if (line.includes(': any') && !line.includes('//')) {
      // Skip common patterns that are acceptable
      if (!line.includes('Record<string, any>') && 
          !line.includes('any[]') &&
          !line.includes('any,') &&
          !line.includes('any)')) {
        issues.push({
          type: 'type-safety',
          severity: 'medium',
          file: path.relative(rootDir, filePath),
          line: index + 1,
          description: `Explicit 'any' type found: ${line.trim().substring(0, 80)}`,
          suggestion: 'Replace with proper TypeScript type',
        });
      }
    }
  });
}

function detectDuplicateFunctions(files: string[]): void {
  const functionMap = new Map<string, { file: string; line: number }[]>();
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const functionPattern = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
      const matches = [...content.matchAll(functionPattern)];
      
      for (const match of matches) {
        const funcName = match[1];
        const beforeMatch = content.substring(0, match.index || 0);
        const line = beforeMatch.split('\n').length;
        
        if (!functionMap.has(funcName)) {
          functionMap.set(funcName, []);
        }
        functionMap.get(funcName)!.push({ file, line });
      }
    } catch (error) {
      // Skip files we can't read
    }
  }
  
  // Find functions that appear in multiple files
  for (const [funcName, locations] of functionMap.entries()) {
    if (locations.length > 1) {
      // Check if they're in different modules (potential duplication)
      const modules = new Set(locations.map(l => {
        if (l.file.includes('/server/')) return 'server';
        if (l.file.includes('/client/')) return 'client';
        if (l.file.includes('/tools/')) return 'tools';
        return 'other';
      }));
      
      if (modules.size > 1 || locations.length > 2) {
        issues.push({
          type: 'duplication',
          severity: 'high',
          file: locations[0].file,
          line: locations[0].line,
          description: `Function '${funcName}' appears in ${locations.length} locations: ${locations.map(l => `${path.relative(rootDir, l.file)}:${l.line}`).join(', ')}`,
          suggestion: 'Consider extracting to shared utility if functionality is identical',
        });
      }
    }
  }
}

function detectOldVsNewImplementations(): void {
  // Check for old implementations that might have new versions
  const oldPatterns = [
    { old: 'server/langgraph/content-writer-graph.ts', new: 'tools/headline-tools/content-writer-v2/server/langgraph/content-writer-graph.ts' },
    { old: 'server/social-content-routes.ts', new: 'tools/headline-tools/social-content-generator/server/social-content-routes.ts' },
  ];
  
  for (const pattern of oldPatterns) {
    const oldPath = path.join(rootDir, pattern.old);
    const newPath = path.join(rootDir, pattern.new);
    
    if (fs.existsSync(oldPath) && fs.existsSync(newPath)) {
      issues.push({
        type: 'redundancy',
        severity: 'high',
        file: pattern.old,
        description: `Old implementation exists alongside new implementation at ${pattern.new}`,
        suggestion: 'Remove old implementation after verifying new one works correctly',
      });
    }
  }
}

function detectInconsistentNaming(files: string[]): void {
  const namingIssues: Issue[] = [];
  
  for (const file of files) {
    const relativePath = path.relative(rootDir, file);
    const fileName = path.basename(file);
    
    // Check for inconsistent file naming
    if (fileName.includes('_') && !fileName.startsWith('_')) {
      // Mix of snake_case and kebab-case
      const hasKebab = fileName.includes('-');
      if (hasKebab) {
        namingIssues.push({
          type: 'inconsistency',
          severity: 'low',
          file: relativePath,
          description: `File name mixes naming conventions: ${fileName}`,
          suggestion: 'Use consistent naming (prefer kebab-case for files)',
        });
      }
    }
  }
  
  issues.push(...namingIssues);
}

function detectArchitectureViolations(files: string[]): void {
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(rootDir, file);
      
      // Check for client importing server code
      if (file.includes('/client/')) {
        if (content.includes("from '../server/") || content.includes("from '../../server/")) {
          issues.push({
            type: 'architecture',
            severity: 'high',
            file: relativePath,
            description: 'Client code importing from server directory',
            suggestion: 'Client should only communicate with server via API',
          });
        }
      }
      
      // Check for tools importing from other tools directly
      if (file.includes('/tools/headline-tools/')) {
        const otherToolPattern = /from\s+['"]\.\.\/\.\.\/headline-tools\//;
        if (otherToolPattern.test(content)) {
          issues.push({
            type: 'architecture',
            severity: 'medium',
            file: relativePath,
            description: 'Tool importing directly from another tool',
            suggestion: 'Extract shared functionality to tools/shared/',
          });
        }
      }
      
      // Check for server importing client code
      if (file.includes('/server/')) {
        if (content.includes("from '../client/") || content.includes("from '../../client/")) {
          issues.push({
            type: 'architecture',
            severity: 'high',
            file: relativePath,
            description: 'Server code importing from client directory',
            suggestion: 'Server should not depend on client code',
          });
        }
      }
    } catch (error) {
      // Skip files we can't read
    }
  }
}

function detectMissingErrorHandling(files: string[]): void {
  for (const file of files) {
    if (!file.includes('/server/')) continue;
    
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(rootDir, file);
      const lines = content.split('\n');
      
      // Check for async functions without try-catch
      let inAsyncFunction = false;
      let asyncFunctionName = '';
      let braceCount = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.match(/async\s+(?:function|\(|=>)/)) {
          inAsyncFunction = true;
          const match = line.match(/(?:function\s+)?(\w+)/);
          if (match) asyncFunctionName = match[1];
          braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
        } else if (inAsyncFunction) {
          braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
          
          if (braceCount < 0) {
            // Function ended, check if it had try-catch
            const functionContent = lines.slice(
              Math.max(0, i - 50),
              i
            ).join('\n');
            
            if (!functionContent.includes('try') && functionContent.includes('await')) {
              issues.push({
                type: 'bug',
                severity: 'medium',
                file: relativePath,
                line: i,
                description: `Async function '${asyncFunctionName}' may be missing error handling`,
                suggestion: 'Add try-catch blocks for async operations',
              });
            }
            
            inAsyncFunction = false;
            asyncFunctionName = '';
            braceCount = 0;
          }
        }
      }
    } catch (error) {
      // Skip files we can't read
    }
  }
}

function detectUnusedExports(): void {
  // This would require a more sophisticated analysis
  // For now, we'll flag exports that look unused based on naming
  // This is a simplified check
}

async function main() {
  console.log('Starting issue detection...');
  
  const sourceFiles = [
    ...findAllSourceFiles(path.join(rootDir, 'server'), ['ts', 'js']),
    ...findAllSourceFiles(path.join(rootDir, 'client'), ['ts', 'tsx', 'js', 'jsx']),
    ...findAllSourceFiles(path.join(rootDir, 'tools'), ['ts', 'tsx', 'js', 'jsx']),
  ];
  
  console.log(`Analyzing ${sourceFiles.length} files...`);
  
  // Run all detection functions
  console.log('Detecting any types...');
  for (const file of sourceFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      detectAnyTypes(file, content);
    } catch (error) {
      // Skip
    }
  }
  
  console.log('Detecting duplicate functions...');
  detectDuplicateFunctions(sourceFiles);
  
  console.log('Detecting old vs new implementations...');
  detectOldVsNewImplementations();
  
  console.log('Detecting naming inconsistencies...');
  detectInconsistentNaming(sourceFiles);
  
  console.log('Detecting architecture violations...');
  detectArchitectureViolations(sourceFiles);
  
  console.log('Detecting missing error handling...');
  detectMissingErrorHandling(sourceFiles);
  
  // Categorize issues
  const categorized = {
    critical: issues.filter(i => i.severity === 'critical'),
    high: issues.filter(i => i.severity === 'high'),
    medium: issues.filter(i => i.severity === 'medium'),
    low: issues.filter(i => i.severity === 'low'),
  };
  
  const byType = {
    duplication: issues.filter(i => i.type === 'duplication'),
    inconsistency: issues.filter(i => i.type === 'inconsistency'),
    redundancy: issues.filter(i => i.type === 'redundancy'),
    bug: issues.filter(i => i.type === 'bug'),
    'type-safety': issues.filter(i => i.type === 'type-safety'),
    architecture: issues.filter(i => i.type === 'architecture'),
  };
  
  // Save results
  const outputDir = path.join(rootDir, 'docs', 'codebase-analysis');
  fs.mkdirSync(outputDir, { recursive: true });
  
  const report = {
    summary: {
      totalIssues: issues.length,
      bySeverity: {
        critical: categorized.critical.length,
        high: categorized.high.length,
        medium: categorized.medium.length,
        low: categorized.low.length,
      },
      byType: {
        duplication: byType.duplication.length,
        inconsistency: byType.inconsistency.length,
        redundancy: byType.redundancy.length,
        bug: byType.bug.length,
        'type-safety': byType['type-safety'].length,
        architecture: byType.architecture.length,
      },
    },
    issues: issues,
    categorized: categorized,
    byType: byType,
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'issues-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log(`\nIssue detection complete!`);
  console.log(`Total issues found: ${issues.length}`);
  console.log(`  Critical: ${categorized.critical.length}`);
  console.log(`  High: ${categorized.high.length}`);
  console.log(`  Medium: ${categorized.medium.length}`);
  console.log(`  Low: ${categorized.low.length}`);
  console.log(`\nResults saved to ${outputDir}/issues-report.json`);
}

main().catch(console.error);

