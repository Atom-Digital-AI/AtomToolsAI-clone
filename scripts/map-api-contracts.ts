#!/usr/bin/env tsx
/**
 * API Contract Mapping Script
 * Extracts all API endpoints and maps client-server contracts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

interface APIEndpoint {
  method: string;
  path: string;
  handler: string;
  file: string;
  line: number;
  schema?: string;
  authRequired?: boolean;
  rateLimited?: boolean;
}

interface ClientAPICall {
  method: string;
  url: string;
  file: string;
  line: number;
  responseType?: string;
}

interface APIContract {
  endpoint: APIEndpoint;
  clientCalls: ClientAPICall[];
  schema?: {
    request?: string;
    response?: string;
  };
}

const endpoints: APIEndpoint[] = [];
const clientCalls: ClientAPICall[] = [];
const contracts: APIContract[] = [];

function findAllSourceFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  
  function walk(currentPath: string) {
    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.name === 'node_modules' || entry.name === 'dist' || 
            entry.name === 'build' || entry.name === '.git') {
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
      // Skip
    }
  }
  
  walk(dir);
  return files;
}

function extractServerEndpoints(files: string[]): void {
  for (const file of files) {
    if (!file.includes('/server/') && !file.includes('/tools/') && !file.includes('routes')) {
      continue;
    }
    
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(rootDir, file);
      const lines = content.split('\n');
      
      // Pattern 1: app.get/post/put/delete/patch('path', handler)
      const routePattern1 = /app\.(get|post|put|delete|patch)\s*\(['"]([^'"]+)['"]/g;
      let match;
      while ((match = routePattern1.exec(content)) !== null) {
        const beforeMatch = content.substring(0, match.index);
        const line = beforeMatch.split('\n').length;
        
        // Check if auth is required
        const handlerContext = content.substring(match.index, match.index + 500);
        const authRequired = handlerContext.includes('requireAuth') || 
                            handlerContext.includes('isAdmin') ||
                            handlerContext.includes('authenticateUser');
        
        // Check for rate limiting
        const rateLimited = handlerContext.includes('Limiter') || 
                           handlerContext.includes('rate-limit');
        
        // Try to find schema
        let schema: string | undefined;
        const schemaMatch = content.substring(Math.max(0, match.index - 200), match.index).match(/(\w+Schema|z\.object)/);
        if (schemaMatch) {
          schema = schemaMatch[1];
        }
        
        endpoints.push({
          method: match[1].toUpperCase(),
          path: match[2],
          handler: 'handler',
          file: relativePath,
          line,
          schema,
          authRequired,
          rateLimited,
        });
      }
      
      // Pattern 2: router.get/post/etc
      const routePattern2 = /router\.(get|post|put|delete|patch)\s*\(['"]([^'"]+)['"]/g;
      while ((match = routePattern2.exec(content)) !== null) {
        const beforeMatch = content.substring(0, match.index);
        const line = beforeMatch.split('\n').length;
        
        endpoints.push({
          method: match[1].toUpperCase(),
          path: match[2],
          handler: 'handler',
          file: relativePath,
          line,
        });
      }
    } catch (error) {
      // Skip
    }
  }
}

function extractClientCalls(files: string[]): void {
  for (const file of files) {
    if (!file.includes('/client/')) continue;
    
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(rootDir, file);
      const lines = content.split('\n');
      
      // Pattern 1: fetch('/api/...')
      const fetchPattern = /fetch\s*\(['"]([^'"]+)['"]/g;
      let match;
      while ((match = fetchPattern.exec(content)) !== null) {
        const beforeMatch = content.substring(0, match.index);
        const line = beforeMatch.split('\n').length;
        const url = match[1];
        
        // Determine method from context
        const context = content.substring(Math.max(0, match.index - 100), match.index);
        let method = 'GET';
        if (context.includes('method:') || context.includes('method:')) {
          const methodMatch = context.match(/method:\s*['"]([^'"]+)['"]/);
          if (methodMatch) method = methodMatch[1].toUpperCase();
        } else if (context.includes('POST') || context.includes('post')) {
          method = 'POST';
        } else if (context.includes('PUT') || context.includes('put')) {
          method = 'PUT';
        } else if (context.includes('DELETE') || context.includes('delete')) {
          method = 'DELETE';
        }
        
        if (url.startsWith('/api/') || url.startsWith('http')) {
          clientCalls.push({
            method,
            url,
            file: relativePath,
            line,
          });
        }
      }
      
      // Pattern 2: axios.get/post/etc('/api/...')
      const axiosPattern = /axios\.(get|post|put|delete|patch)\s*\(['"]([^'"]+)['"]/g;
      while ((match = axiosPattern.exec(content)) !== null) {
        const beforeMatch = content.substring(0, match.index);
        const line = beforeMatch.split('\n').length;
        
        clientCalls.push({
          method: match[1].toUpperCase(),
          url: match[2],
          file: relativePath,
          line,
        });
      }
    } catch (error) {
      // Skip
    }
  }
}

function matchContracts(): void {
  for (const endpoint of endpoints) {
    const matchingCalls = clientCalls.filter(call => {
      // Simple matching - could be improved
      const endpointPath = endpoint.path.replace(/:[^/]+/g, '[^/]+');
      const callPath = call.url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
      return callPath.match(new RegExp(`^${endpointPath}$`)) && 
             (call.method === endpoint.method || endpoint.method === 'GET');
    });
    
    contracts.push({
      endpoint,
      clientCalls: matchingCalls,
    });
  }
  
  // Find orphaned endpoints (no client calls)
  const orphanedEndpoints = endpoints.filter(e => {
    return !contracts.some(c => c.endpoint === e && c.clientCalls.length > 0);
  });
  
  // Find orphaned client calls (no matching endpoint)
  const orphanedCalls = clientCalls.filter(c => {
    return !contracts.some(contract => 
      contract.clientCalls.includes(c)
    );
  });
}

async function main() {
  console.log('Starting API contract mapping...');
  
  const serverFiles = findAllSourceFiles(path.join(rootDir, 'server'), ['ts', 'js']);
  const toolFiles = findAllSourceFiles(path.join(rootDir, 'tools'), ['ts', 'js']);
  const clientFiles = findAllSourceFiles(path.join(rootDir, 'client'), ['ts', 'tsx', 'js', 'jsx']);
  
  console.log(`Extracting server endpoints from ${serverFiles.length + toolFiles.length} files...`);
  extractServerEndpoints([...serverFiles, ...toolFiles]);
  
  console.log(`Extracting client API calls from ${clientFiles.length} files...`);
  extractClientCalls(clientFiles);
  
  console.log('Matching contracts...');
  matchContracts();
  
  const outputDir = path.join(rootDir, 'docs', 'codebase-analysis');
  fs.mkdirSync(outputDir, { recursive: true });
  
  const report = {
    summary: {
      totalEndpoints: endpoints.length,
      totalClientCalls: clientCalls.length,
      matchedContracts: contracts.filter(c => c.clientCalls.length > 0).length,
      orphanedEndpoints: endpoints.filter(e => {
        return !contracts.some(c => c.endpoint === e && c.clientCalls.length > 0);
      }).length,
      orphanedClientCalls: clientCalls.filter(c => {
        return !contracts.some(contract => contract.clientCalls.includes(c));
      }).length,
    },
    endpoints,
    clientCalls,
    contracts,
    orphanedEndpoints: endpoints.filter(e => {
      return !contracts.some(c => c.endpoint === e && c.clientCalls.length > 0);
    }),
    orphanedClientCalls: clientCalls.filter(c => {
      return !contracts.some(contract => contract.clientCalls.includes(c));
    }),
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'api-contracts.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log(`\nAPI contract mapping complete!`);
  console.log(`Total endpoints: ${endpoints.length}`);
  console.log(`Total client calls: ${clientCalls.length}`);
  console.log(`Matched contracts: ${contracts.filter(c => c.clientCalls.length > 0).length}`);
  console.log(`Orphaned endpoints: ${report.summary.orphanedEndpoints}`);
  console.log(`Orphaned client calls: ${report.summary.orphanedClientCalls}`);
  console.log(`\nResults saved to ${outputDir}/api-contracts.json`);
}

main().catch(console.error);

