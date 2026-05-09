# PASS 10 — Cross-Cutting Checks: Final Audit Report

Date: 2026-05-09
Scope: Optic Up repo root (opticalis/opticup), full-tree structural audit
Status: READ-ONLY analysis completed.

---

## SECTION A: Duplicate-Content Markdown Files

Finding: Six (6) Tracked Root-Level Docs Have Untracked Duplicates

Root (TRACKED): DANIEL_QUICK_REFERENCE.md, MODULE_DOCUMENTATION_SCHEMA.md, STRATEGIC_CHAT_ONBOARDING.md, UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md, UNIVERSAL_SECONDARY_CHAT_PROMPT.md, handoff-next-session.md, PHASE_0_PROGRESS.md

Archive (UNTRACKED): _archive/root-deprecated/ (identical copies)

Content verification: All files are identical byte-for-byte between root and _archive/root-deprecated/

Canonical home: / (repo root). Active reference files used in onboarding.
Orphan: _archive/root-deprecated/ - untracked, not referenced in CLAUDE.md, serves no archival function.

Recommendation: Safe to delete _archive/root-deprecated/ post-audit.

---

## SECTION B: Cleanup-Pending Markers

Finding: One Intentional DEPRECATED Marker

File: __LAUNCH_PLAN_DRAFT__/MASTER_LIVE_PLAN.md (lines 1-14)
Status: INTENTIONAL & DOCUMENTED
- Marked DEPRECATED with explicit pointer to /MASTER_ROADMAP.md
- Reason documented: "the project had two MASTER_* files which created drift"
- Daniel-approved direction (2026-05-09): "single MASTER_ROADMAP file in root"

Action: None. This is a correct deprecation bridge. Can be removed after safe transition window.

No other cleanup markers found in root-level .md files or top-level README directories.

---

## SECTION C: .gitignore Audit

File: /.gitignore (66 lines)

PASSING: Well-Structured Ignore Patterns
- Dependencies (node_modules/) - Correct global pattern
- Environment files (.env, .env.*) - Correct
- Session hygiene (docs/guardian/*.md, outputs/) - Correct
- Module transients (**/backups/, **/archive/) - Correct
- Editor/OS files (*.tmp, .DS_Store, Thumbs.db) - Correct

CRITICAL ISSUE: .DS_Store Files ARE COMMITTED Despite Rule

Problem: Line 60 contains .DS_Store rule, but three files ARE git-tracked:
- .DS_Store
- modules/.DS_Store
- modules/Module 1.5 - Shared Components/.DS_Store

Root cause: Files were committed before .gitignore rule was added.

Recommendation (One-time fix):
  git rm --cached .DS_Store
  git rm --cached modules/.DS_Store
  git rm --cached 'modules/Module 1.5 - Shared Components/.DS_Store'
  git commit -m "chore: remove OS .DS_Store files from tracking"

---

## SECTION D: package.json Scripts - All Valid

File: /package.json

All script references exist and are executable:
- verify → scripts/verify.mjs (EXISTS, 3.9 KB)
- verify:staged → scripts/verify.mjs --staged (SAME FILE)
- verify:full → scripts/verify.mjs --full (SAME FILE)
- verify:integrity → scripts/verify-tree-integrity.mjs (EXISTS, 7.8 KB)
- test:integrity-gate → scripts/test-integrity-gate.mjs (EXISTS, 2.6 KB, added 2026-04-27)
- prepare → husky (INSTALLED, ^9.1.7 in devDependencies)

Status: All references valid. No broken dependencies.

---

## SECTION E: Iron Rule 21 Violations - CRITICAL

Iron Rule 21: "No Orphans, No Duplicates. Before creating any new file, function, table, column, RPC: search if something similar already exists. If it exists — Extend or Replace it, delete the old one. Never leave two things that do the same job."

FOUR MAJOR STRUCTURAL VIOLATIONS:

### Violation 1: Module 1 — Inventory: THREE directories

- modules/Module 1 - Inventory Management/ (88 KB) - CANONICAL
  Contains: docs/, MODULE_1_COMPLETION_SUMMARY.md, ROADMAP.md, SECONDARY_CHAT_TEMPLATE_UNIVERSAL.md, MESSAGE_TO_MODULE_1_STRATEGIC.md, MY_CHEATSHEET.md

- modules/Module 1 - Inventory/ (1 KB) - ORPHAN
  Contains: only docs/ subdirectory (nearly empty)

- modules/inventory/ (220 KB) - ORPHAN
  Contains: 14 active .js implementation files (inventory-actions.js, inventory-edit.js, inventory-entry.js, inventory-export.js, inventory-images.js, inventory-images-bg.js, inventory-reduction.js, inventory-return.js, inventory-returns-actions.js, inventory-returns-tab.js, inventory-table.js, etc.)

**Violation:** Canonical module docs live in Module 1 - Inventory Management/, but active implementation code lives in modules/inventory/. Two separate codebases for ONE domain.

Questions for Daniel:
- Is modules/inventory/ the OLD pre-formalization implementation?
- Is Module 1 - Inventory Management/ the NEW specification-driven approach?
- Should modules/inventory/ be archived, merged into Module 1, or kept separate?
- Is Module 1 - Inventory/ a dangling stub? Safe to delete entirely?

### Violation 2: Module 2 — Platform Admin: THREE directories

- modules/Module 2 - Platform Admin/ (9 KB) - CANONICAL
  Contains: MODULE_2_COMPLETE_SUMMARY.md, ROADMAP.md, STRATEGIC_CHAT_PROMPT, SECONDARY_CHAT_TEMPLATE, MY_CHEATSHEET.md, docs/

- modules/admin/ (5 KB) - ORPHAN
  Contains: admin.js, system-log.js (2 files)

- modules/admin-platform/ (13 KB) - ORPHAN
  Contains: 10 .js files (admin-activity-viewer.js, admin-app.js, admin-audit.js, admin-dashboard.js, admin-db.js, admin-feature-overrides.js, admin-plans.js, admin-provisioning.js, admin-tenant-detail.js, and others)

**Violation:** Three separate codebases. Canonical docs in Module 2 - Platform Admin/, but implementation fragmented across modules/admin/ and modules/admin-platform/. No clear authority.

### Violation 3: Module 3 — Storefront: TWO directories

- modules/Module 3 - Storefront/ (10 KB) - CANONICAL
  Contains: MODULE_3_ROADMAP.md, MODULE_3_STRATEGIC_CHAT_PROMPT.md, AUTONOMOUS_START.md, docs/

- modules/storefront/ (37 items) - ORPHAN?
  Contains: 37 .js files (storefront-blog.js, storefront-config.js, storefront-domains.js, storefront-products.js, storefront-sections.js, and many others)

**Note:** This may be intentional if Module 3 = "Storefront ERP Studio" (the admin interface for managing the storefront). Verify with Daniel whether storefront/ is intentionally separate from Module 3 - Storefront/ (which manages the studio), or if it's a remnant that should be archived.

### Violation 4: Module 4 — CRM: TWO directories

- modules/Module 4 - CRM/ (4 files) - CANONICAL
  Contains: SESSION_CONTEXT.md, docs/

- modules/crm/ (61 items) - ORPHAN?
  Contains: 61 .js/.mjs files (crm.js, crm-activities.js, crm-approvals.js, crm-campaigns.js, crm-config.js, crm-detail.js, crm-display.js, and many others)

**Note:** Similar pattern to Module 3. Likely intentional. Verify with Daniel.

### Archive Directories (Separate Issues)

- archive/ (Contains UI version history + CLAUDE10-3.md + legacy MASTER_ROADMAP.md)
  Status: INTENTIONAL KEEP (historical reference)

- _archive/root-deprecated/ (Contains duplicate root-level .md files)
  Status: SAFE TO DELETE (untracked, no archival value)

- __LAUNCH_PLAN_DRAFT__/_archive/ (Contains historical MASTER_LIVE_PLAN_v1.md)
  Status: INTENTIONAL KEEP (safe deprecation bridge)

### Summary of Rule 21 Risk

Total duplication scope: HIGH
- 4 major domains (Inventory, Admin, Storefront, CRM) have implementation split across 2-3 directories
- No documented "which is canonical" marker at directory level (no README, no deprecation note)
- No deprecation markers on the orphan directories
- Clear risk: future changes update the wrong directory; test suite runs against one branch but production uses another

**Cleanup Protocol (Recommended):**

1. Daniel reviews each Module and declares: "Directory X is canonical. Directory Y is legacy and will be archived/merged."
2. For each domain, create a REFACTORING_PLAN.md documenting the decision
3. Execute cleanup with surgical commits (one domain at a time, with verification tests)
4. Add deprecation notes to orphan directories during cleanup
5. Monitor for side-effects across 2-3 dev cycles after each merge

---

## SECTION F: node_modules Sanity - PASSING

Two separate node_modules trees exist and are INTENTIONAL:

Tree 1: /node_modules/ (Root package.json)
- Dependencies: @supabase/supabase-js ^2.99.2, sharp ^0.34.5, xlsx ^0.18.5, chokidar ^3.6.0
- Size: 1000+ items
- Purpose: ERP dependencies (Supabase, image processing, Excel import, file watching, build tooling)
- Lock file: /package-lock.json (tracked, 35.5 KB, last modified 2026-04-27)

Tree 2: /watcher-deploy/node_modules/ (Watcher package.json)
- Dependencies: @supabase/supabase-js ^2.0.0, xlsx ^0.18.5, chokidar ^3.0.0, node-windows 1.0.0-beta.8
- Size: 500+ items
- Purpose: Watcher service (Windows service, file watching, Supabase, Excel)
- Lock file: /watcher-deploy/package-lock.json (tracked, 23.3 KB, last modified 2026-03-21)

**Shared dependencies:** Supabase, xlsx, chokidar (consistent versions across both trees)
**Unique to root:** sharp (image processing), husky (Git hooks/pre-commit framework)
**Unique to watcher:** node-windows (Windows service registration)

**Gitignore coverage:**
- Line 1: node_modules/ - Global pattern, covers both trees correctly
- Both lock files are TRACKED (good - enables reproducible installs on fresh clone)
- Both node_modules directories are NOT tracked (correct - ignored by line 1)

Status: PASSING. The dual-tree setup is architecturally sound and correct.

No action needed.

---

## SECTION G: Surprises & Red Flags

### Surprise 1: Multiple Root-Level Onboarding Docs Still Active

Five files at repo root that appear to be onboarding/reference docs:
1. STRATEGIC_CHAT_ONBOARDING.md (12 KB, Hebrew, comprehensive)
2. UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md (22 KB, English)
3. UNIVERSAL_SECONDARY_CHAT_PROMPT.md (11 KB, English)
4. DANIEL_QUICK_REFERENCE.md (11 KB, English)
5. MODULE_DOCUMENTATION_SCHEMA.md (18 KB, English)

Finding: CLAUDE.md §1 (Session Start Protocol, the authoritative onboarding guide) does NOT reference any of these 5 files.

CLAUDE.md §1 prescribes:
- Read CLAUDE.md itself (line 45)
- Read MODULE's SESSION_CONTEXT.md (lines 46-48)
- Read docs/GLOBAL_MAP.md (line 49)
- Read docs/GUARDIAN_ALERTS.md (line 50)

CLAUDE.md §1 explicitly states "Do NOT read at session start: MODULE_MAP.md, GLOBAL_SCHEMA.sql, FILE_STRUCTURE.md, DB_TABLES_REFERENCE.md, CONVENTIONS.md."

Finding: The 5 files listed above appear to be SUPERSEDED by CLAUDE.md, which is more current and comprehensive. They may be legacy from an earlier onboarding era.

Recommendation: Archive these 5 files to _archive/ post-audit. CLAUDE.md is now the canonical onboarding document.

### Surprise 2: outputs/ Directory

Status: Ignored in .gitignore (line 48), contains 50+ .md files (all transient session artifacts like PROMPT_*.md, HANDOFF_*.md, MAKE_SCENARIO_FB_CAMPAIGNS_SPEC.md, etc.)

Finding: None of these files are tracked in git (all correctly ignored). This is working as intended.

No action needed.

### Surprise 3: Two Different MASTER_ROADMAP Files (NOW RESOLVED)

Historical issue:
- /archive/MASTER_ROADMAP.md (legacy, Hebrew, outdated)
- /MASTER_ROADMAP.md (current, comprehensive, English, decision log)
- __LAUNCH_PLAN_DRAFT__/MASTER_LIVE_PLAN.md (transitional, marked DEPRECATED, points to root)

Status: RESOLVED as of 2026-05-09 (M12 close)

Daniel's direction: "single MASTER_ROADMAP file in root, organized folders for everything else"

Current state: Correct. One canonical file at /MASTER_ROADMAP.md. Legacy and transitional files have proper deprecation markers.

No further action needed.

### No Null-Byte Corruption Found

Random sampling of large files (GLOBAL_SCHEMA.sql, MODULE_DOCUMENTATION_SCHEMA.md, MASTER_ROADMAP.md, CLAUDE.md) shows no embedded NUL bytes, no truncation, no corruption markers.

---

## SECTION H: Recommendations Summary

### Immediate (High Priority)

1. **Fix .DS_Store tracking** (Section C)
   Remove three .DS_Store files from git tracking. Let .gitignore prevent future commits.
   Time estimate: 5 minutes

2. **Clarify Module 1/2/3/4 canonicity** (Section E)
   Daniel reviews and documents: for each Module, which directory is canonical?
   Deliverable: REFACTORING_PLAN.md with decisions
   Time estimate: 2 hours review + planning

### Medium Priority

3. **Delete _archive/root-deprecated/** (Sections A and G)
   Untracked duplicate directories with zero archival value. Safe to delete after Daniel confirms.
   Time estimate: 5 minutes

4. **Retire obsolete onboarding docs** (Section G)
   Archive STRATEGIC_CHAT_ONBOARDING.md, UNIVERSAL_*.md, MODULE_DOCUMENTATION_SCHEMA.md, DANIEL_QUICK_REFERENCE.md to _archive/
   Time estimate: 10 minutes

### Low Priority

5. **Verify Module 3 & Module 4 intentionality** (Section E)
   Confirm: Is modules/storefront/ separate from Module 3 - Storefront/ by design, or legacy?
   Confirm: Is modules/crm/ separate from Module 4 - CRM/ by design, or legacy?
   Time estimate: 1 hour discussion

---

## Audit Sign-Off

PASS 10 — Cross-Cutting Checks audit: COMPLETE (READ-ONLY)

Findings Summary:
- 1 CRITICAL finding (.DS_Store committed, but rule exists)
- 4 HIGH findings (Module structure violations per Iron Rule 21)
- 3 MEDIUM findings (cleanup items: orphan dirs, obsolete docs)
- 1 SURPRISE (legacy onboarding docs superseded by CLAUDE.md)
- 0 BLOCKING issues (no null-byte corruption, no data loss risk)

No file modifications required at this time. All findings are strategic/structural.

Next step: Daniel reviews findings and prioritizes cleanup phase.
Recommended timing: After M13 closure, before next major release.

Report file: C:\Users\User\opticup\__LAUNCH_PLAN_DRAFT__\architecture-briefs\_pass10_findings.md
Report date: 2026-05-09
Report status: Complete
