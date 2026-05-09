# Pass 8 & 9: Audit Findings — .claude/ Skills + Root HTML Files

**Audit Date:** 2026-05-09  
**Scope:** READ-ONLY codebase audit

---

## Section A: .claude/ Directory Tree

```
.claude/
├── launch.json
├── scheduled_tasks.lock
├── settings.local.json
├── worktrees/
│   ├── jovial-lewin-b61073/     (Apr 24 — STALE)
│   └── pensive-tesla-4a5ab3/    (Apr 23 — STALE)
└── skills/
    ├── opticup-campaign-overseer/
    ├── opticup-executor/
    │   └── references/
    ├── opticup-guardian/
    │   └── references/
    ├── opticup-main-strategic/
    │   └── references/decisions/  (NEW as of May 9)
    ├── opticup-reviewer/
    ├── opticup-sentinel/
    │   └── references/missions/
    └── opticup-strategic/
        ├── references/
        └── test_write              (ORPHANED)
```

---

## Section B: Skills Inventory Table

| Skill | Lines | Commit | Date | Status | Notes |
|---|---|---|---|---|---|
| opticup-campaign-overseer | 352 | 9581f15 | 2026-05-04 22:30 | ✓ | No references/ |
| opticup-executor | 649 | 949d6e3 | 2026-05-06 21:35 | ✓ | 3 templates in references/ |
| opticup-guardian | 325 | de51684 | 2026-04-14 19:14 | ✓ | 4 ref docs |
| opticup-main-strategic | 543 | faa9de6 | 2026-05-06 19:43 | ✓ | decisions/ with 7 module files |
| opticup-reviewer | 231 | de51684 | 2026-04-14 19:14 | ✓ | No references/ |
| opticup-sentinel | 177 | de51684 | 2026-04-14 19:14 | ✓ | missions/ subfolder |
| opticup-strategic | 1008 | 949d6e3 | 2026-05-06 21:35 | ⚠️ | 5 pattern files; test_write orphan |

---

## Section C: opticup-main-strategic Reorg Check

**Status:** ✓ CLEAN & CONSISTENT

New structure (May 9):
- DECISIONS_LOG.md (9,431 bytes) — INDEX + Pattern Tracker
- references/decisions/ with modules: CROSS, M5, M6, M7, M8, M11, M12
- Pattern Recurrence Tracker (3-strike rule): P24, P25, P26 promoted
- Module Close Ceremony formalized & retroactively completed for M5–M12

Decisions logged in-flight per spec (line 5).

---

## Section D: Orphaned Files

| File | Path | Size | Date | Action |
|---|---|---|---|---|
| test_write | opticup-strategic/ | 0 bytes | 2026-04-29 21:30 | DELETE — test artifact |

---

## Section E: Root HTML Files

| File | Lines | Last Commit | Purpose | Inbound |
|---|---|---|---|---|
| index.html | 379 | 2026-05-02 09:34 | HOME ENTRY POINT | Direct load |
| landing.html | 62 | 2026-03-26 16:04 | Tenant slug form | error.html; js/shared.js |
| admin.html | 271 | 2026-03-26 14:58 | Platform admin | index.html footer |
| error.html | 48 | 2026-03-26 16:02 | Error display | js/shared.js (4 routes) |
| r.html | 29 | 2026-04-23 19:32 | CRM event redirect | External links |
| crm.html | 419 | 2026-05-04 20:58 | CRM leads | index.html grid |
| inventory.html | 1046 | 2026-05-06 12:25 | Inventory mgmt | index.html grid (LARGEST) |
| employees.html | 87 | 2026-04-27 17:03 | Staff mgmt | index.html grid |
| shipments.html | 304 | 2026-04-23 16:38 | Shipments | index.html grid |
| settings.html | 208 | 2026-04-23 16:38 | Tenant settings | index.html grid |
| suppliers-debt.html | 269 | 2026-04-23 16:38 | Supplier debt | index.html grid; alerts-badge |
| storefront-settings.html | 240 | 2026-04-27 11:02 | Storefront entry | index.html grid |
| storefront-blog.html | 377 | 2026-04-27 11:02 | Blog editor | Storefront nav (relative) |
| storefront-products.html | 151 | 2026-04-27 11:02 | Products editor | Storefront nav (relative) |
| storefront-content.html | 357 | 2026-04-27 11:02 | Content editor | Storefront nav (relative) |
| storefront-glossary.html | 165 | 2026-04-27 11:02 | Glossary editor | Storefront nav (relative) |
| storefront-landing-content.html | 150 | 2026-04-27 11:02 | Landing editor | Storefront nav (relative) |
| storefront-studio.html | 297 | 2026-04-27 15:07 | Studio/design | Storefront nav (relative) |

---

## Section F: Orphan HTML Check

**Result:** ✓ NO ORPHANS — All 18 files are reachable.

Entry points: index, landing, admin, r.html
Module grid: crm, inventory, employees, shipments, settings, suppliers-debt, storefront-settings
Storefront nav: 7 files linked via relative paths
Error path: error.html (js/shared.js guards)

---

## Section G: GitHub Pages Deployment Verdict

**CNAME:** app.opticalis.co.il  
**Config:** NO homepage field (defaults to `/`)  
**Routing:** Client-side SPA via JS (query params `?t=SLUG`)

**Hard-coded root path dependencies:**
- js/shared.js: `/landing.html`, `/error.html` (4 redirects)
- landing.html: `/?t=SLUG` redirect
- index.html footer: `/admin.html`

**Verdict:**

❌ **Cannot move ALL root HTML to pages/ without code changes:**
- Error pages hardcoded with `/` paths
- 6 JS/HTML updates required

✓ **Storefront files CAN move** to pages/storefront/:
- All relative paths
- Update 7 files' hrefs only
- No logic changes

**Recommendation:** Keep core at root (12 files); move storefront suite to pages/storefront/ + update hrefs.

---

## Section H: Surprises & Red Flags

### Green ✓
- All 7 skills committed & functional
- opticup-main-strategic reorg CLEAN (decisions in-flight)
- All 18 HTML files actively used (no dead code)
- Storefront modular (easy refactor candidate)
- SPA routing avoids GitHub Pages complexity

### Yellow ⚠️
- Worktrees STALE (Apr 23–24): `git worktree prune` needed
- opticup-strategic 1008 lines vs opticup-main-strategic 543: skill overlap unclear
- inventory.html 1046 lines (monolith candidate for M5–M7 split)
- r.html undocumented

### Red 🚩
- NONE

---

## Recommendations

**Now:**
1. Delete opticup-strategic/test_write
2. Run `git worktree prune` (clean stale branches)
3. Document r.html (public event register redirect)

**Next Phase:**
4. Refactor inventory.html (1046 lines → split into list/detail)
5. Move storefront to pages/storefront/ (7-file refactor, 4 hrefs each)

**Post-Phase-0:**
6. Clarify opticup-strategic vs opticup-main-strategic (consolidate?)

---

**Audit:** Complete ✓  
**Date:** 2026-05-09  
**Status:** Ready for review
