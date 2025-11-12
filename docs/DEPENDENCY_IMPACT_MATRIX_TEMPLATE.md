# Dependency Impact Matrix Template

## Purpose

This template ensures that every proposed change has its dependencies fully analyzed before implementation, preventing breaking changes.

## Usage

For each change in the fix plan, create an entry using this template.

---

## Change: [Change Name/ID]

### Change Description

- **File(s) to Modify:** `path/to/file.ts`
- **Type of Change:** [Refactor / Delete / Modify / Add]
- **Priority:** [P0 / P1 / P2 / P3]

### Dependency Analysis

#### Direct Dependents (Files that import this)

- `file1.ts` - Imports: `functionA`, `typeB`
- `file2.ts` - Imports: `classC`
- **Total:** X files

#### Indirect Dependents (Files that import direct dependents)

- `file3.ts` → imports `file1.ts` → imports target
- `file4.ts` → imports `file2.ts` → imports target
- **Total:** Y files

#### Test Files

- `__tests__/file1.test.ts` - Tests `functionA`
- `__tests__/file2.test.ts` - Tests `classC`
- **Total:** Z test files

#### API Consumers (Frontend Components)

- `client/src/components/ComponentA.tsx` - Uses API endpoint that calls this
- `client/src/pages/PageB.tsx` - Uses function from this file
- **Total:** W components

#### Database Dependencies

- Table: `table_name` - Used by this code
- Migrations: `migration_file.sql` - Affected by this change

#### External Service Dependencies

- Service: `OpenAI API` - Called by this code
- Service: `Database` - Queried by this code

### Impact Assessment

#### Breaking Changes

- [ ] Function signature changed
- [ ] Type definition changed
- [ ] API endpoint changed
- [ ] Database schema changed
- [ ] Import path changed
- [ ] Behavior changed (even if signature same)

#### Non-Breaking Changes

- [ ] Internal refactoring only
- [ ] Bug fix (same behavior, fixed)
- [ ] Performance improvement (same behavior)
- [ ] Documentation only

### Migration Path

#### If Breaking Change:

1. **Deprecation Period:**

   - Mark old code as deprecated
   - Add deprecation warnings
   - Timeline: X weeks

2. **New Implementation:**

   - Create new version alongside old
   - Update all direct dependents
   - Test thoroughly

3. **Removal:**
   - Remove old code after migration period
   - Verify no remaining references

#### If Non-Breaking:

- [ ] All tests pass
- [ ] No import errors
- [ ] No runtime errors
- [ ] API contracts unchanged

### Testing Requirements

#### Unit Tests

- [ ] Tests for modified code
- [ ] Tests for direct dependents
- [ ] Edge cases covered

#### Integration Tests

- [ ] API endpoint tests (if applicable)
- [ ] Database operation tests (if applicable)
- [ ] Service integration tests (if applicable)

#### Regression Tests

- [ ] Critical paths still work
- [ ] No performance degradation
- [ ] No new errors introduced

### Rollback Plan

#### If Change Fails:

1. **Immediate Rollback:**

   - Revert commit
   - Restore previous version
   - Verify system works

2. **Partial Rollback:**

   - Keep some changes
   - Revert problematic parts
   - Document what was kept

3. **Fix Forward:**
   - Identify issue
   - Create fix
   - Deploy fix

### Verification Checklist

Before implementing:

- [ ] All dependents identified
- [ ] Impact assessment complete
- [ ] Migration path defined
- [ ] Tests written/updated
- [ ] Rollback plan prepared
- [ ] Breaking changes documented
- [ ] Team notified (if major change)

After implementing:

- [ ] All tests pass
- [ ] No import errors
- [ ] No runtime errors
- [ ] API contracts verified
- [ ] Performance acceptable
- [ ] Documentation updated

---

## Example: Removing Duplicate Content Writer Graph

### Change Description

- **File(s) to Modify:**
  - `server/langgraph/content-writer-graph.ts` (DELETE)
  - `server/langgraph/nodes/*` (DELETE)
  - `server/routes.ts` (MODIFY - remove imports)
- **Type of Change:** Delete + Modify
- **Priority:** P1

### Dependency Analysis

#### Direct Dependents

- `server/routes.ts:25` - Imports: `contentWriterGraph`, `ContentWriterState`
- `server/routes.ts:3222` - Uses: `contentWriterGraph.invoke()`
- `server/routes.ts:3322` - Uses: `contentWriterGraph.invoke()`
- `server/routes.ts:3510` - Uses: `contentWriterGraph.invoke()`
- **Total:** 1 file, 4 usages

#### Indirect Dependents

- `client/src/pages/app/tools/content-writer-v2.tsx` - Calls API endpoint that uses graph
- `client/src/components/ContentWriterUI.tsx` - Displays content from graph
- **Total:** 2+ frontend files

#### Test Files

- None found (gap identified)
- **Total:** 0 test files (needs tests!)

#### API Consumers

- `POST /api/content-writer/sessions` - Creates graph session
- `POST /api/content-writer/invoke` - Invokes graph
- `GET /api/content-writer/sessions/:id` - Gets graph state
- **Total:** 3+ API endpoints

#### Database Dependencies

- Table: `content_writer_sessions` - Stores graph state
- Table: `langgraph_threads` - Tracks graph execution

#### External Service Dependencies

- Service: `OpenAI API` - Called by graph nodes
- Service: `LangGraph` - Graph execution framework

### Impact Assessment

#### Breaking Changes

- [x] Import path changed (old → new location)
- [x] Function signature may differ (need to verify)
- [ ] API endpoint changed (should remain same)
- [ ] Database schema changed (should remain same)

#### Non-Breaking Changes

- [ ] Internal refactoring only
- [ ] Bug fix (same behavior, fixed)
- [ ] Performance improvement (same behavior)

### Migration Path

1. **Verification Phase:**

   - Test new implementation thoroughly
   - Compare functionality with old
   - Verify API contracts match
   - Timeline: 1 week

2. **Update Phase:**

   - Update `server/routes.ts` imports
   - Update all API endpoints to use new graph
   - Test all endpoints
   - Timeline: 2-3 days

3. **Removal Phase:**
   - Remove old files
   - Verify no remaining references
   - Update documentation
   - Timeline: 1 day

### Testing Requirements

#### Unit Tests

- [ ] New graph implementation tests
- [ ] Node tests (if changed)
- [ ] State management tests

#### Integration Tests

- [ ] API endpoint tests
- [ ] End-to-end content generation flow
- [ ] Database operation tests

#### Regression Tests

- [ ] Content generation still works
- [ ] State persistence works
- [ ] Error handling works

### Rollback Plan

If new implementation fails:

1. Revert import changes in `server/routes.ts`
2. Restore old graph files
3. Verify system works
4. Investigate new implementation issues
5. Fix and retry

### Verification Checklist

Before implementing:

- [x] All dependents identified (routes.ts, API endpoints, frontend)
- [x] Impact assessment complete (breaking change - import paths)
- [x] Migration path defined (verify → update → remove)
- [ ] Tests written/updated (GAP - no tests exist)
- [x] Rollback plan prepared
- [x] Breaking changes documented
- [ ] Team notified (if major change)

After implementing:

- [ ] All tests pass
- [ ] No import errors
- [ ] No runtime errors
- [ ] API contracts verified
- [ ] Performance acceptable
- [ ] Documentation updated

---

## Automated Dependency Checking Script

```typescript
// scripts/check-dependencies.ts
// Run before making changes to verify all dependents are identified

import { execSync } from "child_process";
import * as fs from "fs";

function findDependents(targetFile: string): string[] {
  // Use grep/ripgrep to find all imports of target file
  const command = `rg --type ts --type tsx "from ['\"]${targetFile}"`;
  const output = execSync(command, { encoding: "utf-8" });
  return output.split("\n").filter(Boolean);
}

function checkBreakingChange(file: string, changeType: string): void {
  const dependents = findDependents(file);
  console.log(`Found ${dependents.length} dependents for ${file}`);

  if (changeType === "delete" && dependents.length > 0) {
    console.error("⚠️  BREAKING CHANGE: File has dependents!");
    console.log("Dependents:", dependents);
  }
}
```

---

## Integration with Fix Plan

Each fix in the plan should include:

1. Dependency Impact Matrix entry
2. Verification checklist completion
3. Test requirements defined
4. Rollback plan prepared

This ensures no change is made without full dependency consideration.
