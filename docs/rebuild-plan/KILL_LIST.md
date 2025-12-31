# Kill List: Files to Delete

This document lists files and directories that should be removed from the repository as they are redundant, outdated, or don't belong.

---

## Priority 1: Security Risk / Sensitive Data

**DELETE IMMEDIATELY** - These contain sensitive data that should never be in git:

| File | Reason |
|------|--------|
| `cookies.txt` | Session cookies - security risk |
| `new_cookies.txt` | Session cookies - security risk |
| `.env` | Environment variables (should be in .gitignore) |

---

## Priority 2: IDE/Platform-Specific & Replit (Not Needed)

| File/Directory | Reason |
|----------------|--------|
| `.cursor/` | Cursor IDE workspace config |
| `.cursorignore` | Cursor IDE ignore file |
| `.replit` | Replit configuration - migrating away from Replit |
| `replit.md` | Replit documentation - migrating away from Replit |

**Database Note**: The existing Neon database is Replit-owned. Create your own Neon account at [neon.tech](https://neon.tech) with EU (Frankfurt) region. Do NOT use the Replit-provisioned database.

---

## Priority 3: Separate Project (Doesn't Belong)

**The entire `Ad Copy Generator App/` directory is a separate Python application** that was accidentally committed to this repo.

| Directory | Size | Reason |
|-----------|------|--------|
| `Ad Copy Generator App/` | ~50+ files | Completely separate Python app, not part of AtomToolsAI |

---

## Priority 4: Temporary/Debug Files

| File | Reason |
|------|--------|
| `railway_build_logs.txt` | Debug logs - not needed in repo |
| `railway_deploy_logs.txt` | Debug logs - not needed in repo |
| `railway_logs.txt` | Debug logs - not needed in repo |
| `no_dashboard_redirect.png` | Debug screenshot - 64KB |
| `server/oauth.ts.bak` | Backup file |
| `BUG_ANALYSIS.md` | Temporary analysis - addressed |
| `HYPOTHESIS_TESTING.md` | Temporary analysis |

---

## Priority 5: Attached Assets (Consider Moving)

**The `attached_assets/` directory (50+ files, ~10MB+) contains:**
- Screenshots from development
- Video recordings
- Pasted prompts
- Generated images

**Recommendation**: Either move to external storage (S3/Cloudinary) or delete if not needed for documentation.

| Count | Type | Action |
|-------|------|--------|
| 35+ | `.png` screenshots | Delete or move to external |
| 1 | `.mov` video (large) | Delete |
| 1 | `.mp4` video (large) | Delete |
| 5+ | `.txt` pasted prompts | Delete |

---

## Priority 6: Bloated Documentation (Superseded by LEAN_PLAN.md)

The following docs in `docs/rebuild-plan/` are superseded by the lean plan:

| File | Lines | Reason |
|------|-------|--------|
| `00-MASTER_PLAN.md` | 874 | Replaced by LEAN_PLAN.md |
| `01-SUPABASE_MIGRATION.md` | ~1100 | Not using Supabase - using Neon instead |
| `02-LOGGING_INFRASTRUCTURE.md` | ~1400 | Covered in LEAN_PLAN.md |
| `03-AGENT_INTERFACE_SPEC.md` | ~1800 | Over-engineered agent system |
| `prompts/PHASE1_01_SUPABASE_SETUP.md` | | Covered in lean plan |
| `prompts/PHASE1_02_STRUCTURED_LOGGING.md` | | Covered in lean plan |
| `prompts/PHASE1_03_API_KEY_AUTH.md` | | Covered in lean plan |
| `prompts/PHASE1_04_VALIDATION_MIDDLEWARE.md` | | Covered in lean plan |
| `prompts/PHASE2_01_AGENT_INTERFACE.md` | | Over-engineered |
| `prompts/PHASE2_02_AGENT_REGISTRY.md` | | Over-engineered |
| `prompts/PHASE3_ORCHESTRATION_OVERVIEW.md` | | Keep LangGraph instead |
| `prompts/PHASE4_MODULARIZATION_OVERVIEW.md` | | Some useful, mostly covered |
| `VALIDATION_CHECKLIST.md` | | Over-detailed |

**Keep**: `README.md`, `LEAN_PLAN.md`, `TEST_STRATEGY.md`

---

## Priority 7: Old Analysis/Reports (One-Time Use)

These were useful during analysis but are now outdated:

| File | Reason |
|------|--------|
| `docs/ANALYSIS_SUMMARY_0bmRS.md` | One-time analysis |
| `docs/BUGS_REPORT_DETAILED.md` | Issues addressed |
| `docs/CODEBASE_ANALYSIS_COMPREHENSIVE.md` | Superseded |
| `docs/CODEBASE_REVIEW_SUMMARY.md` | Superseded |
| `docs/COMPREHENSIVE_SECURITY_AUDIT_PROMPT.md` | One-time use |
| `docs/COMPREHENSIVE_SECURITY_AUDIT_REPORT.md` | Addressed |
| `docs/DEPENDENCY_DIAGRAMS.md` | Can regenerate |
| `docs/DEPENDENCY_IMPACT_MATRIX_TEMPLATE.md` | Template, not needed |
| `docs/ENV_CONFIGURATION_CHECK.md` | One-time check |
| `docs/FIX_PLAN_UNIFIED.md` | Superseded by lean plan |
| `docs/FIX_PROGRESS.md` | Progress tracked elsewhere |
| `docs/FIX_VOTE_COUNT_MIGRATION.md` | Issue fixed |
| `docs/FUNCTIONAL_INTEGRITY_ENHANCEMENT_SUMMARY.md` | Completed |
| `docs/IMPLEMENTATION_ACTION_PLAN.md` | Superseded |
| `docs/IMPLEMENTATION_COMPLETE.md` | Historical |
| `docs/MERGED_ARTIFACTS_SUMMARY.md` | One-time merge |
| `docs/PLAN_COMPARISON_ANALYSIS.md` | Superseded |
| `docs/RAILWAY_LOGS_SUMMARY.md` | Debug logs |
| `docs/RLS_FIX_GUIDE.md` | Issue fixed |
| `docs/SECURITY_FIXES_SUMMARY.md` | Completed |
| `docs/SECURITY_UPDATES_README.md` | Completed |
| `docs/TEST_COVERAGE_ANALYSIS.md` | Superseded by TEST_STRATEGY.md |
| `docs/TEST_IMPLEMENTATION_SUMMARY.md` | Superseded |
| `docs/TEST_SUITE_DESIGN.md` | Superseded by TEST_STRATEGY.md |
| `docs/WORKTREE_COMPARISON_AND_SCORING.md` | Historical |
| `docs/WORKTREE_QUICK_SUMMARY.md` | Historical |
| `docs/admin-error-reporting.md` | Small, keep if useful |
| `docs/inconsistencies-report.md` | Issues addressed |
| `docs/codebase-analysis/COMPREHENSIVE_ANALYSIS_REPORT.md` | Superseded |

**Consider Keeping** (still useful):
- `docs/DEPLOYMENT_CHECKLIST.md`
- `docs/QC_IMPLEMENTATION_STATUS.md`
- `docs/QC_INTEGRATION_GUIDE.md`
- `docs/RAG_*.md` (RAG documentation)
- `docs/SOCIAL_CONTENT_SETUP.md`

---

## Deletion Script

```bash
#!/bin/bash
# Run from repository root

# Priority 1: Security
rm -f cookies.txt new_cookies.txt

# Priority 2: IDE configs (keep .gitignore in these)
rm -rf .cursor/
rm -f .cursorignore .replit replit.md

# Priority 3: Separate project
rm -rf "Ad Copy Generator App/"

# Priority 4: Temp/debug files
rm -f railway_build_logs.txt railway_deploy_logs.txt railway_logs.txt
rm -f no_dashboard_redirect.png
rm -f server/oauth.ts.bak
rm -f BUG_ANALYSIS.md HYPOTHESIS_TESTING.md

# Priority 5: Attached assets (optional - review first)
# rm -rf attached_assets/

# Priority 6: Bloated rebuild docs
rm -f docs/rebuild-plan/00-MASTER_PLAN.md
rm -f docs/rebuild-plan/01-SUPABASE_MIGRATION.md
rm -f docs/rebuild-plan/02-LOGGING_INFRASTRUCTURE.md
rm -f docs/rebuild-plan/03-AGENT_INTERFACE_SPEC.md
rm -f docs/rebuild-plan/VALIDATION_CHECKLIST.md
rm -rf docs/rebuild-plan/prompts/

# Priority 7: Old analysis docs (optional - review first)
# rm -f docs/ANALYSIS_SUMMARY_0bmRS.md
# rm -f docs/BUGS_REPORT_DETAILED.md
# ... etc
```

---

## Git Commands

After deletion, update .gitignore to prevent these from being re-added:

```gitignore
# Add to .gitignore
cookies.txt
*.cookies
*.bak
*_logs.txt
attached_assets/
.cursor/
.replit
replit.md
```

Then commit:

```bash
git add -A
git commit -m "chore: remove redundant files and old documentation

- Remove IDE-specific configs (.cursor, .replit)
- Remove sensitive files (cookies, .env)
- Remove separate Ad Copy Generator project
- Remove debug logs and temporary files
- Remove superseded bloated documentation
"
```

---

## Summary

| Priority | Count | Est. Size | Action |
|----------|-------|-----------|--------|
| P1 Security | 3 | <1KB | Delete immediately |
| P2 IDE | 4 | <10KB | Delete |
| P3 Separate Project | 1 dir | ~500KB | Delete |
| P4 Temp/Debug | 7 | ~100KB | Delete |
| P5 Assets | 50+ | ~10MB+ | Review, likely delete |
| P6 Bloated Docs | 13 | ~200KB | Delete |
| P7 Old Analysis | 25+ | ~150KB | Review, likely delete |

**Total estimated cleanup: ~11MB+**

---

*Document Version: 1.0*
*Created: December 2025*
