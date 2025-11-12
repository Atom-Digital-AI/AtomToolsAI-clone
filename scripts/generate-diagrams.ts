#!/usr/bin/env tsx
/**
 * Generate Dependency Diagrams
 * Creates Mermaid diagrams and JSON graphs for visualization
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

interface DiagramData {
  mermaid: string;
  json: any;
}

function loadAnalysisData() {
  const analysisDir = path.join(rootDir, 'docs', 'codebase-analysis');
  
  const dependencyGraph = JSON.parse(
    fs.readFileSync(path.join(analysisDir, 'dependency-graph.json'), 'utf-8')
  );
  
  const issues = JSON.parse(
    fs.readFileSync(path.join(analysisDir, 'issues-report.json'), 'utf-8')
  );
  
  const apiContracts = JSON.parse(
    fs.readFileSync(path.join(analysisDir, 'api-contracts.json'), 'utf-8')
  );
  
  return { dependencyGraph, issues, apiContracts };
}

function generateModuleDiagram(data: any): string {
  const modules = data.modules || {};
  let mermaid = 'graph TB\n';
  
  // Module nodes
  for (const [module, files] of Object.entries(modules)) {
    const fileCount = (files as string[]).length;
    mermaid += `  ${module}[${module}<br/>${fileCount} files]\n`;
  }
  
  // Dependencies between modules
  const moduleDeps = new Map<string, Set<string>>();
  
  for (const file of data.files || []) {
    const fileModule = file.module || 'other';
    if (!moduleDeps.has(fileModule)) {
      moduleDeps.set(fileModule, new Set());
    }
    
    for (const imp of file.imports || []) {
      if (imp.includes('@shared/')) {
        moduleDeps.get(fileModule)!.add('shared');
      } else if (imp.includes('@tools/')) {
        moduleDeps.get(fileModule)!.add('tools');
      } else if (imp.includes('@/')) {
        moduleDeps.get(fileModule)!.add('client');
      }
    }
  }
  
  for (const [from, toSet] of moduleDeps.entries()) {
    for (const to of toSet) {
      if (from !== to) {
        mermaid += `  ${from} --> ${to}\n`;
      }
    }
  }
  
  return mermaid;
}

function generateAPIDiagram(apiContracts: any): string {
  let mermaid = 'graph LR\n';
  
  const endpointsByModule = new Map<string, string[]>();
  
  for (const endpoint of apiContracts.endpoints || []) {
    const module = endpoint.file.includes('/tools/') ? 'tools' : 
                   endpoint.file.includes('/server/') ? 'server' : 'other';
    
    if (!endpointsByModule.has(module)) {
      endpointsByModule.set(module, []);
    }
    endpointsByModule.get(module)!.push(`${endpoint.method} ${endpoint.path}`);
  }
  
  mermaid += '  Client[Client] --> Server[Server API]\n';
  mermaid += '  Client --> Tools[Tools API]\n';
  mermaid += '  Server --> DB[(Database)]\n';
  mermaid += '  Tools --> DB\n';
  
  return mermaid;
}

function generateDatabaseDiagram(): string {
  // This would parse schema.ts to extract table relationships
  // For now, return a placeholder
  return `erDiagram
    users ||--o{ guideline_profiles : has
    users ||--o{ subscriptions : has
    users ||--o{ generated_content : creates
    guideline_profiles ||--o{ generated_content : used_in
    products ||--o{ subscriptions : subscribed_to
    tier_packages ||--o{ tier_subscriptions : subscribed_to`;
}

function generateToolDependencyDiagram(data: any): string {
  let mermaid = 'graph TB\n';
  
  const tools = new Set<string>();
  const toolDeps = new Map<string, Set<string>>();
  
  for (const file of data.files || []) {
    if (file.path.includes('/tools/headline-tools/')) {
      const toolMatch = file.path.match(/tools\/headline-tools\/([^/]+)/);
      if (toolMatch) {
        const tool = toolMatch[1];
        tools.add(tool);
        
        if (!toolDeps.has(tool)) {
          toolDeps.set(tool, new Set());
        }
        
        // Check for dependencies
        for (const imp of file.imports || []) {
          if (imp.includes('/component-tools/')) {
            const compMatch = imp.match(/component-tools\/([^/]+)/);
            if (compMatch) {
              toolDeps.get(tool)!.add(compMatch[1]);
            }
          }
          if (imp.includes('/support-tools/')) {
            const suppMatch = imp.match(/support-tools\/([^/]+)/);
            if (suppMatch) {
              toolDeps.get(tool)!.add(suppMatch[1]);
            }
          }
        }
      }
    }
  }
  
  for (const tool of tools) {
    mermaid += `  ${tool}[${tool}]\n`;
  }
  
  for (const [tool, deps] of toolDeps.entries()) {
    for (const dep of deps) {
      mermaid += `  ${tool} --> ${dep}\n`;
    }
  }
  
  return mermaid;
}

async function main() {
  console.log('Generating diagrams...');
  
  const { dependencyGraph, issues, apiContracts } = loadAnalysisData();
  
  const diagrams = {
    moduleLevel: {
      title: 'Module-Level Dependency Diagram',
      mermaid: generateModuleDiagram(dependencyGraph),
      description: 'High-level view of module dependencies',
    },
    apiLevel: {
      title: 'API Endpoint Diagram',
      mermaid: generateAPIDiagram(apiContracts),
      description: 'API endpoint structure and client-server relationships',
    },
    database: {
      title: 'Database Schema Diagram',
      mermaid: generateDatabaseDiagram(),
      description: 'Database table relationships',
    },
    toolDependencies: {
      title: 'Tool Dependency Diagram',
      mermaid: generateToolDependencyDiagram(dependencyGraph),
      description: 'Dependencies between tools and shared utilities',
    },
  };
  
  const outputDir = path.join(rootDir, 'docs', 'codebase-analysis');
  fs.mkdirSync(outputDir, { recursive: true });
  
  // Generate Mermaid markdown file
  let mermaidContent = '# Codebase Dependency Diagrams\n\n';
  
  for (const [key, diagram] of Object.entries(diagrams)) {
    mermaidContent += `## ${diagram.title}\n\n`;
    mermaidContent += `${diagram.description}\n\n`;
    mermaidContent += '```mermaid\n';
    mermaidContent += diagram.mermaid;
    mermaidContent += '\n```\n\n';
  }
  
  fs.writeFileSync(
    path.join(outputDir, 'diagrams.md'),
    mermaidContent
  );
  
  // Save JSON format
  fs.writeFileSync(
    path.join(outputDir, 'diagrams.json'),
    JSON.stringify(diagrams, null, 2)
  );
  
  console.log('Diagrams generated successfully!');
  console.log(`Saved to ${outputDir}/diagrams.md and diagrams.json`);
}

main().catch(console.error);

