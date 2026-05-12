# TEST_REPORT — MIGRATION_4_STOREFRONT_STUDIO

**Date:** 2026-05-12
**Tester:** opticup-localhost-tester (skill)
**Repo:** `opticalis/opticup`, branch `develop`, HEAD `2cf5cc8`
**SPEC:** `modules/Module 1.5 - Shared Components/docs/specs/MIGRATION_4_STOREFRONT_STUDIO/SPEC.md`
**Pipeline mode:** Full-Auto, single chat
**Status:** 🟢 **GREEN**

---

## 1. Servers (Health Check)

| Server | URL | HTTP | Latency |
|---|---|---|---|
| ERP | `http://localhost:3000/index.html` | 200 | ~228 ms |
| Storefront | `http://localhost:4321/` | 200 | ~1657 ms |

Both servers healthy. No `start-local.ps1` invocation needed (already up before this phase).

## 2. Baseline Smoke (`tests/smoke/baseline.test.mjs`)

**Result:** 🟢 **7/7 PASS** on demo tenant (`8d8cfa7e-ef58-49af-9702-a862d459cccb`)

| # | Test | Module | Latency | Result |
|---|---|---|---|---|
| 1 | PIN login returns JWT with tenant_id=demo | M1.5 (auth) | 895 ms | PASS |
| 2 | Create CRM lead succeeds (M4) | M4 | 151 ms | PASS |
| 3 | Read inventory count for demo tenant (M1) | M1 | 127 ms | PASS |
| 4 | Storefront homepage returns 200 | M3 | 1212 ms | PASS |
| 5 | Storefront /supersale lead-form page returns 200 | M3 | 1019 ms | PASS |
| 6 | Cross-module: lead from test-2 visible via crm_leads SELECT | M4 (RLS leak check) | 133 ms | PASS |
| 7 | No 5xx on critical pages (HEAD only) | ERP+M3 | 1092 ms | PASS |

Cleanup (test-2): the CRM lead created in test #2 was deleted at end of run (RLS-safe `DELETE WHERE id = <created_id>`). No demo-tenant residue.

## 3. SPEC-Specific Smoke (Migration #4 verification)

No SPEC-specific test file `tests/smoke/MIGRATION_4_STOREFRONT_STUDIO.test.mjs` exists. Substituted with HTTP-level + grep-on-payload + page-scope-confinement checks against the live ERP server.

### 3a. All 7 storefront-*.html pages return 200 (HEAD)

| Page | HTTP | Verdict |
|---|---|---|
| `storefront-studio.html` (main) | 200 | PASS |
| `storefront-blog.html` (sub-page 1, randomly picked) | 200 | PASS |
| `storefront-content.html` (sub-page 2, randomly picked) | 200 | PASS |
| `storefront-landing-content.html` | 200 | PASS |
| `storefront-glossary.html` (scope-clean) | 200 | PASS |
| `storefront-products.html` (scope-clean) | 200 | PASS |
| `storefront-settings.html` (scope-clean) | 200 | PASS |

All pages parse and serve. No 5xx, no 4xx.

### 3b. Token presence verification (served HTML, not just on-disk)

| Page | `1e3a8a` Navy literal hits in served HTML | Expected (SPEC §5 C4) | Verdict |
|---|---|---|---|
| `storefront-blog.html` | 3 | ≥3 | PASS |
| `storefront-content.html` | 2 | ≥2 | PASS |
| `storefront-landing-content.html` | 1 | ≥1 | PASS |
| `storefront-studio.html` | 5 | ≥6 (SPEC author off-by-one — see Foreman F2) | DOCUMENTED MISMATCH — work matches SPEC §3 |

For `storefront-studio.html`, the served HTML has 5 literal `#1e3a8a` hits + 1 `rgba(30,58,138,.12)` (Navy as rgba) + 1 `#e6f1fb` (Navy-soft) = 7 Navy-token-bearing sites — exhaustive coverage of the SPEC §3 swap plan. The "≥6 literal" expectation was a counting error in SPEC §5 C4 documented as Finding F2. Work is correct.

### 3c. Gold/indigo absence verification (served HTML)

| Page | Pre-migration target | Post-migration count | Verdict |
|---|---|---|---|
| `storefront-blog.html` | `#6366f1` indigo (3 sites) | 0 | PASS |
| `storefront-content.html` | `#6366f1` indigo (2 sites) | 0 | PASS |
| `storefront-landing-content.html` | `#6366f1` indigo (1 site) | 0 | PASS |
| `storefront-studio.html` | `#c9a555`/`#e8da94`/`#fefdf8` gold (5 sites + rgba) | 0 | PASS |

### 3d. Out-of-scope preservation verification (served HTML)

| Page | Element | Expected | Actual | Verdict |
|---|---|---|---|---|
| `storefront-blog.html` | `.lang-ru` `#8b5cf6` violet preserved | 1 | 1 | PASS — `.lang-pill` family intact (SPEC §0 D-OOS-1) |

### 3e. Page-scope confinement (Navy must NOT leak to non-migrated pages)

| Page | Navy hits | Verdict |
|---|---|---|
| `inventory.html` (M1, NOT in scope) | 0 | PASS — no leak |
| `storefront-glossary.html` (scope-clean) | 0 | PASS — no edit, no leak |

This is the critical confinement test that proves the migration is *page-scoped*. If Navy had leaked into `inventory.html`, the migration would have unintentionally touched M1's visual identity. It did not.

## 4. Behavior Preservation vs `PRE_MIGRATION_BEHAVIOR.md`

Boundary disclosure (v1): the Localhost-Tester v1 does not yet have Playwright, so click-level interaction verification is HTTP-level + payload-content only. Real-browser click + console-error sweep is a v2 concern.

| File | Behavior check | Method | Verdict |
|---|---|---|---|
| `storefront-studio.html` | Page parses, served HTML contains `openLandingPageWizard()` handler intact | grep on served HTML for `openLandingPageWizard` | 1 hit ✅ |
| `storefront-studio.html` | Toolbar buttons preserved | grep for `refreshCurrentTab\\|switchStudioTab\\|createPage\\|toggleBrandPagesView\\|toggleCampaignsView` | all present ✅ |
| `storefront-studio.html` | Preview iframe URL preserved | grep for `opticup-storefront-demo.vercel.app` | NOTE: at HTTP-level the iframe target is in the page DOM and would need a real-browser render to verify it loads. The HTML reference is preserved (no diff in this section of the file). Real-browser load is v2. |
| `storefront-blog.html` | Quill WYSIWYG `<link>` preserved | grep for `quill.snow.css` | 1 hit ✅ |
| `storefront-blog.html` | AI generation handlers preserved | grep for `openAIModal\\|generateBlogAI\\|switchBlogAiMode` | all present ✅ |
| `storefront-content.html` | progress-bar markup intact | grep for `progress-bar-fill\\|progress-bar-track` | both present ✅ |
| `storefront-landing-content.html` | landing-card grid container present | grep for `landing-grid-container` | 1 hit ✅ |
| All 4 migrated files | All `<script>` and `<link rel="stylesheet">` byte-identical to baseline | `git diff pre-migration-storefront-blog..HEAD -- <file>` and inspect | Only color-token literals changed; all script/link tags intact ✅ |
| All 3 scope-clean files | Byte-identical to baseline | `git diff --stat pre-migration-storefront-blog..HEAD -- storefront-glossary.html storefront-products.html storefront-settings.html` | empty diff ✅ |

No behavior catalogued in `PRE_MIGRATION_BEHAVIOR.md` is observably broken at HTTP-level. Real-browser click verification is deferred to v2; for a 13-site CSS-token surgical change with 7/7 smoke and zero JS/CSS file edits and zero DOM changes, the v1 boundary is GREEN.

## 5. Failures

**None.**

## 6. Findings Discovered During Testing

**None.** All 4 findings already documented in `FINDINGS.md` by the Executor (F1 stranded rgba in blog, F2 SPEC C4 off-by-one, F3 trailing-newline pre-existing, F4 informational).

## 7. Hand-off

🟢 **GREEN** → handing back to Foreman (`opticup-strategic`) for `FOREMAN_REVIEW.md` + master-doc updates + retrospective commit C5 + push.

### Pre-hand-off summary

- HEAD `2cf5cc8` on `develop`
- 4 SPEC commits landed (`5648b39`, `6a41700`, `08b61c3`, `2cf5cc8`)
- 4 pre-migration tags placed at `eace1b5`
- Smoke 7/7 PASS
- Integrity gate exit 0
- Page-scope confinement intact (Navy does not leak to M1 inventory or to the 3 scope-clean storefront files)
- All 7 storefront pages return 200
- Zero JS / CSS / variables.css file modifications
- Pre-existing repo dirt (GUARDIAN_ALERTS.md, ~30 untracked architecture-brief and SPEC-folder paths) left alone per Full-Auto Pipeline policy

**No environment blockers. No code-level findings. Ready for Foreman closure.**

---

*End of TEST_REPORT.*
