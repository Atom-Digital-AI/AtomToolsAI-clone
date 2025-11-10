# Tool Reorganization Status

## Overview
This document tracks the progress of reorganizing tools into headline-tools, component-tools, and support-tools structure.

## Completed Tasks

### Directory Structure
- ✅ Created tools/ directory with headline-tools/, component-tools/, and support-tools/ subdirectories
- ✅ Created client/, server/, shared/, prompts/, and tests/ subdirectories for each tool
- ✅ Created test subdirectories (unit/, integration/, regression/, scripts/) for each tool

### Prompt Extraction
- ✅ Created prompt-loader utility in tools/shared/prompt-loader.ts
- ✅ Extracted SEO Meta Generator prompts
- ✅ Extracted Google Ads Copy Generator prompts
- ✅ Extracted Concept Generator prompt
- ✅ Extracted Subtopic Generator prompt
- ✅ Extracted Outline Builder prompts (main-brief, subtopic-brief)
- ✅ Extracted Article Generator prompts (subtopic-content, intro-conclusion)
- ✅ Extracted Brand Guardian prompt
- ✅ Extracted Brand Analyzer prompt
- ✅ Extracted Wireframe Generator prompt

### File Movement
- ✅ Moved SEO Meta Generator client files
- ✅ Moved Google Ads Copy Generator client files
- ✅ Moved Content Writer v2 client files
- ✅ Moved Social Content Generator client files
- ✅ Moved Facebook Ads Connector client files
- ✅ Moved Content Writer v2 server files (langgraph graph and nodes)
- ✅ Moved Social Content Generator server files (routes, langgraph, validators)
- ✅ Moved component tool files (concept-generator, subtopic-generator, article-generator, guardians, url-scraper, wireframe-generator)
- ✅ Moved support tool files (brand-guideline-creator, context-generator, quality-control)

### Route Registration
- ✅ Created SEO Meta Generator route file
- ✅ Updated server/routes.ts to import and register SEO Meta routes
- ✅ Updated client/src/App.tsx to import tool pages from new locations

### Configuration Updates
- ✅ Updated tsconfig.json with @tools/* path alias
- ✅ Updated vite.config.ts with @tools alias

### Test Structure
- ✅ Created test file templates for SEO Meta Generator (unit, integration, regression)

## In Progress

### Import Fixes
- ⏳ Fixing relative imports within moved files
- ⏳ Updating cross-tool dependencies

## Remaining Tasks

### Prompt Extraction
- ⏳ Extract remaining prompts from:
  - Fact Checker
  - Proofreader
  - Regulatory Guardian
  - URL Scraper
  - PDF Brand Analyzer
  - Other component and support tools

### Route Files
- ⏳ Create route files for:
  - Google Ads Copy Generator
  - Content Writer v2
  - Social Content Generator (update existing)
  - Facebook Ads Connector
  - Brand Guideline Creator
  - Context Generator
  - Quality Control

### Import Updates
- ⏳ Update all imports in moved client files
- ⏳ Update all imports in moved server files
- ⏳ Update component tool imports
- ⏳ Update support tool imports
- ⏳ Fix test file imports

### Code Updates
- ⏳ Update moved files to use prompt loader instead of hardcoded prompts
- ⏳ Update server/index.ts if needed
- ⏳ Update shared/schema.ts if needed

### Test Files
- ⏳ Create comprehensive test files for all tools
- ⏳ Create unit tests for every function
- ⏳ Create integration tests
- ⏳ Create regression tests
- ⏳ Set up test infrastructure (Jest/Vitest configuration)

### Verification
- ⏳ Test all headline tools
- ⏳ Test all component tools
- ⏳ Test all support tools
- ⏳ Verify backward compatibility

## Notes

- The old route handlers in server/routes.ts are kept for backward compatibility during migration
- Some imports may need adjustment based on final file locations
- Test files are placeholders and need to be filled with actual test logic
- Prompt extraction is ongoing - more prompts need to be extracted from remaining files

