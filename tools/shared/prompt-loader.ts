import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Loads a prompt from a markdown file and optionally injects variables
 * @param toolPath - Path to the tool directory (e.g., 'tools/headline-tools/seo-meta-generator')
 * @param promptName - Name of the prompt file without extension (e.g., 'seo-generation')
 * @param variables - Optional object with variables to inject into the prompt using {{variableName}} syntax
 * @returns The prompt content with variables replaced
 */
export async function loadPrompt(
  toolPath: string,
  promptName: string,
  variables?: Record<string, string | number | boolean>
): Promise<string> {
  const promptPath = join(toolPath, 'prompts', `${promptName}.md`);
  
  try {
    let content = await readFile(promptPath, 'utf-8');
    
    // Replace variables if provided
    if (variables) {
      for (const [key, value] of Object.entries(variables)) {
        // Handle {{variable}} syntax
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        content = content.replace(regex, String(value));
        
        // Handle {{#if variable}}...{{/if}} blocks
        const ifRegex = new RegExp(`\\{\\{#if\\s+${key}\\}\\}([\\s\\S]*?)\\{\\{/if\\}\\}`, 'g');
        if (value) {
          content = content.replace(ifRegex, '$1');
        } else {
          content = content.replace(ifRegex, '');
        }
      }
      
      // Remove any remaining {{#if}} blocks that weren't matched
      content = content.replace(/\{\{#if\s+\w+\}\}[\s\S]*?\{\{\/if\}\}/g, '');
    }
    
    return content.trim();
  } catch (error) {
    throw new Error(`Failed to load prompt from ${promptPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Loads a prompt synchronously (for use in non-async contexts)
 * Note: This reads from the file system synchronously, use sparingly
 */
export function loadPromptSync(
  toolPath: string,
  promptName: string,
  variables?: Record<string, string | number | boolean>
): string {
  const { readFileSync } = require('fs');
  const { join } = require('path');
  
  const promptPath = join(toolPath, 'prompts', `${promptName}.md`);
  
  try {
    let content = readFileSync(promptPath, 'utf-8');
    
    // Replace variables if provided
    if (variables) {
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        content = content.replace(regex, String(value));
      }
    }
    
    return content.trim();
  } catch (error) {
    throw new Error(`Failed to load prompt from ${promptPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

