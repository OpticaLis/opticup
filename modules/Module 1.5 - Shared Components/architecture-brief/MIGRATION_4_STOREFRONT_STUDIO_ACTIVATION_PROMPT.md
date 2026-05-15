# Activation: Migration #4 — Storefront Studio → Hybrid+Navy

טען `opticup-strategic` ב-Full-Auto Pipeline mode.

**Brief:** `modules/Module 1.5 - Shared Components/architecture-brief/MIGRATION_4_STOREFRONT_STUDIO_BRIEF.md`

**Mission:** Re-skin all `storefront-*.html` production pages + their CSS to Hybrid+Navy. ZERO functional change. ZERO JS edits. ZERO DOM changes. Last of 4 production migrations — after this, all 4 are ready for batch merge to main.

**Deliverables:**
- All `storefront-*.html` files at repo root re-skinned (Pipeline enumerates exact list during pre-flight)
- Associated `css/storefront-*.css` files updated (rule-body token swaps only)
- Pre-commit git tags per file: `pre-migration-storefront-{stem}`
- `PRE_MIGRATION_BEHAVIOR.md` cataloging behaviors across all in-scope pages
- `TEST_REPORT.md` with localhost verification (main + 2 sub-pages minimum)
- Per-file commits + 1 retrospective commit
- EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md
- M1.5 CHANGELOG + DECISIONS_LOG entry
- OPEN_TASKS.md update (mark Migration #4 closed + note batch is ready for main-merge)

**Continuous-Run Mandate:**
- Run in ONE Claude Code chat.
- DO NOT ask Daniel anything.
- Status lines (one Hebrew line per file) only.
- Localhost-Tester MANDATORY on main + 2 sub-pages.

**Destructive Operations Envelope:**
- In-place file overwrites for each in-scope storefront-*.html
- Rule-body token updates in storefront-*.css files
- Additions only to variables.css (idempotent — already done by prior migrations)
- NO file deletes
- NO renames
- NO schema changes
- NO JS changes
- NO DOM structure changes
- NO touching M1 Inventory or other migrated pages
- NO touching the public storefront (separate repo + separate Vercel project)
- NO force-push, NO merge to main
- Anything outside envelope → STOP + escalate

**Pre-Flight Phase:**
1. List all `storefront-*.html` at repo root
2. For each, identify: dedicated CSS file (if exists), JS file dependencies, behavior patterns
3. Detect palette state per file:
   - Already-Slate (CRM-style) → Add Navy accent only
   - Legacy purple-deep → Full token replacement
4. Catalog interactive behaviors per file → PRE_MIGRATION_BEHAVIOR.md

**Migration Phase:**
For each file (per-file commit):
1. Create pre-commit git tag
2. Apply token swap per type (Slate-style vs. legacy-style)
3. Verify file still parses, integrity gate green
4. Commit

**Verification Phase (Localhost-Tester MANDATORY):**

For the main `storefront-studio.html` + 2 randomly-picked sub-pages on demo tenant:
- Page loads, 0 console errors
- CMS list/grid renders with demo data
- Edit existing item → editor opens
- "+" create new → form opens
- Media library shows images
- Navigation between storefront-* pages works
- Preview iframe loads `opticup-storefront-demo.vercel.app` correctly

If ANY behavior breaks → `git revert HEAD~1` for that file → STOP → escalate.

**Token Swap Map (same as prior migrations):**

| From | To |
|---|---|
| `#534AB7` purple | `#1e3a8a` Navy |
| `#EEEDFE` purple-soft | `#e6f1fb` |
| `#26215C` purple-deep (text) | `#0f172a` |
| `#26215C` purple-deep (bg) | `#1e3a8a` + white text |
| `#7F77DD` purple-mid | `#1e40af` |
| `linear-gradient(...)` | Solid Hybrid token |
| `#1F1F1E` text | `#0f172a` |
| `#5F5E5A` text-2 | `#475569` |
| Decorative multi-color (non-semantic) | `--text-secondary` or `--accent-soft` |
| Semantic (success/warning/danger/info) | KEEP |

For Slate-already-modern files: add Navy accent only (CRM-style), don't replace Slate.

**Success Criteria:**
1. All in-scope storefront-*.html files migrated per pre-flight list
2. `grep -i "26215c\|534ab7" storefront-*.html css/storefront-*.css` = 0 matches
3. `grep "1e3a8a" storefront-*.html css/storefront-*.css` ≥ 1 match per file that needed accent
4. All `<script>` and `<link>` tags preserved verbatim per file
5. DOM tag count within ±2% of original per file
6. Pre-commit git tags exist per file
7. Localhost verified for main + 2 sub-pages on demo tenant
8. Preview iframe integration with `opticup-storefront-demo.vercel.app` works
9. `npm run verify:integrity` exit 0
10. `npm run smoke` 7/7 PASS
11. Working tree clean
12. Pushed to `origin/develop` (NOT main)

**Closure:** End with ONE Hebrew summary:

> ✅ Migration #4 (Storefront Studio) CLOSED 🟢 — כל דפי storefront-* ב-Hybrid+Navy על develop. 4 migrations הושלמו. localhost נבדק. הבא: M1 Expansion (3 טבלאות מלאי חסרות) או batch merge ל-main.

Begin with pre-flight enumeration.
