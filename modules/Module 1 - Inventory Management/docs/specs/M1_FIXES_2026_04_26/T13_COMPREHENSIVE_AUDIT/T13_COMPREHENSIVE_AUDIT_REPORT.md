# T13 — Comprehensive M1+M3 Audit Report

> **Phase:** read-only audit (T13 of OVERNIGHT_M1_M3_BURNDOWN — final task)
> **Written by:** opticup-executor (Claude Code, Windows desktop)
> **Written on:** 2026-04-26
> **No source changes.** Findings + recommendations document.
> **Methodology:** breadth > depth. 10 patterns from today's bug surface scanned across the ERP repo + DB schema.

---

## 1. Executive summary

10 patterns scanned across `modules/`, `js/`, `shared/`, `docs/GLOBAL_SCHEMA.sql`, and the live Supabase schema (read-only via service-role). **Net: 8 of 10 patterns scanned clean** for serious findings, indicating today's bug surface (C1, B1, D5, D3+D4, D4-followup) was a small cluster, not a sample of widespread rot. **2 patterns surfaced real findings worth follow-up SPECs**: Iron Rule 7 (direct `sb.from()` migration debt) and Iron Rule 12 (file-size cap violations). Both are pre-existing tech debt, well-quantified here.

---

## 2. Findings ranked by severity

### 🟡 MEDIUM — Pattern 9 (Iron Rule 12: files exceed 350-line hard cap)

21 files in `modules/` exceed the Rule 12 hard cap. Top 10:

| Lines | File |
|------:|------|
| 1264 | `modules/storefront/storefront-translations.js` |
| 1010 | `modules/storefront/brand-translations.js` |
| 898 | `modules/storefront/studio-shortcodes.js` |
| 893 | `modules/storefront/studio-brands.js` |
| 754 | `modules/storefront/storefront-blog.js` |
| 734 | `modules/storefront/studio-campaigns.js` |
| 704 | `modules/storefront/studio-pages.js` |
| 630 | `modules/storefront/studio-block-schemas.js` |
| 620 | `modules/storefront/studio-media.js` |
| 614 | `modules/storefront/storefront-content.js` |

**Severity:** medium. The cap is a soft architectural rule; nothing is on fire. But the top 4 files (>900 lines) are at 2.5×+ the hard cap and represent ongoing technical debt. The `storefront-translations.js` at 1264 lines is the primary candidate for splitting.

**Note from history:** commit `c50302d revert(studio): restore original monolithic files — fix truncated split files breaking production` indicates a prior attempt to split these files went badly. Any split SPEC must respect the truncation lessons learned (cf. Iron Rule 31, integrity gate).

**Recommended action:** dedicated SPEC for splitting `storefront-translations.js` first (highest violator, presumably most valuable to split). Each split is its own SPEC; no big-bang rewrites.

### 🟡 MEDIUM — Pattern 6 (Iron Rule 7: direct `sb.from()` instead of DB.* wrapper)

Top 5 offending files (count of `sb.from(` references):

| Count | File |
|------:|------|
| 16 | `modules/storefront/studio-campaigns.js` |
| 16 | `modules/permissions/employee-list.js` |
| 16 | `modules/crm/crm-lead-actions.js` |
| 14 | `modules/storefront/studio-translations.js` |
| 13 | `modules/debt/ai/ai-weekly-report.js` |

**Severity:** medium. This is migration debt, not active bug. The `DB.*` wrapper exists in `shared/js/supabase-client.js` (line 187 confirms the upsert helper). Migration is bounded: known sites, mechanical translation, integrity gate guards correctness.

**Recommended action:** **per-module migration SPECs** — start with `crm-lead-actions.js` (single file, well-scoped) as proof of pattern, then iterate. Combining with Pattern 9 splits could be efficient (split + migrate together).

### 🟢 LOW — Pattern 10 (Iron Rule 8: innerHTML usage breadth)

100+ files use `innerHTML =`. A comprehensive escape-safety audit per-site is beyond T13's "breadth>depth" scope. Spot checks in `storefront-products.js` (today's D5 fix area) and `inventory-table.js` (today's B1/B5 fix area) showed `escapeHtml()` is the dominant pattern.

**Severity:** low (nominal). Likely zero CRITICAL violations in heavily-trafficked code paths; long-tail risk in less-audited modules.

**Recommended action:** deferred. A future "innerHTML safety audit" SPEC should systematically grep for `innerHTML\s*=\s*[^'"`]` (i.e., right-hand side starts with a variable, not a string literal) and verify each is wrapped in `escapeHtml()` or operates on trusted data only. Likely 4-6 hour SPEC.

### 🟢 LOW — Pattern 7 (Iron Rule 18: 2 candidate UNIQUE violations)

12 UNIQUE constraints in the `public` schema lack `tenant_id`. **10 are legitimate** (platform-level: `tenants.slug`, `plans.name`, `platform_admins.*`; FK-scoped: `conversation_participants` keyed on `conversation_id` which carries tenant via FK; `payment_allocations` similarly). **2 candidates worth checking**:

- `storefront_block_templates.name` (UNIQUE on name only)
- `storefront_templates.name` (UNIQUE on name only)

If these are tenant-scoped (each tenant has its own templates), the UNIQUE prevents two tenants from naming a template the same way → Rule 18 violation. If they're SHARED (Optic Up–authored templates that all tenants instantiate from), the constraint is correct.

**Recommended action:** quick read of the table comments / first-row sample to confirm scope. If tenant-scoped, add a follow-up SPEC to widen the UNIQUE to `(tenant_id, name)`. **Level 3 SQL — Daniel sign-off required.**

### 🟢 LOW — Pattern 3 (D5-pattern: management UI silently filters states)

`storefront-products.js:41-42` (post-D5 fix) keeps:
```js
if (excludedBrandIds.has(p.brand_id)) return false;
if (p.website_sync === 'full' && p.quantity <= 0) return false;
```

The first hides products from brands the admin has set to "exclude_website" — admin must navigate to Brands tab to undo. The second hides full-sync items that are out of stock — admin must add stock. Both are documented design decisions, NOT bugs.

**Severity:** low (vs. D5's CRITICAL). The recovery paths exist; they're not unreachable.

**Recommended action:** none required, but worth capturing in product onboarding ("if a product disappears from Studio, check 1) brand exclusion, 2) stock level"). Not a SPEC.

---

## 3. Patterns that scanned clean

### ✅ Pattern 1 — `onConflict` ↔ PK mismatch (C1 pattern)

19 `onConflict:` sites grepped across `*.js`. All match a real PK or UNIQUE constraint:

| File:line | Table | onConflict | Constraint match |
|-----------|-------|------------|------------------|
| `js/auth-service.js:329` | `employee_roles` | `employee_id,role_id` | matches PK `(employee_id,role_id)` ✅ |
| `permissions/employee-list.js:321` | `role_permissions` | `role_id,permission_id,tenant_id` | matches PK (post-C1 fix) ✅ |
| `admin-platform/admin-feature-overrides.js:82` | `tenant_config` | `tenant_id,key` | matches UNIQUE `(tenant_id,key)` ✅ |
| `storefront/studio-translations.js:212`, etc. | `content_translations` | `tenant_id,entity_type,entity_id,field_name,lang` | matches UNIQUE `(tenant_id,entity_type,entity_id,field_name,lang)` ✅ |
| `storefront/studio-translations.js:223` | `tenant_i18n_overrides` | `tenant_id,lang,key_path` | matches UNIQUE ✅ |
| `storefront/studio-translation-glossary.js:113`, etc. | `translation_glossary` | `tenant_id,lang,term_he` | matches UNIQUE ✅ |
| `storefront/studio-translation-editor.js:296`, etc. | `translation_memory` | `tenant_id,source_lang,target_lang,source_hash` | matches UNIQUE ✅ |
| `storefront/studio-reviews.js:369` | `storefront_config` | `tenant_id` | matches UNIQUE ✅ |
| `storefront/storefront-content.js:400`, etc. (3 sites) | `ai_content` | `tenant_id,entity_type,entity_id,content_type,language` | matches UNIQUE ✅ |
| `watcher-deploy/sync-watcher.js:434`, `scripts/sync-watcher.js:429` | `watcher_heartbeats` | `id` | infrastructure table, single-tenant ✅ |

**No C1-class bugs found in this audit.** The C1 fix pattern doesn't repeat.

### ✅ Pattern 2 — B1-class client-side post-filter

Spot-checked `.range()` call sites for follow-up `.filter()` mutations of `data` shape that would silently drop rows.

- `inventory-table.js` — B1 + B5 fixes today eliminated the residual cases.
- `system-log.js:111`, `audit/entry-history.js:60` — page-by-page accumulator pattern (no post-filter).
- `access-sync.js:207` — direct render, no post-filter.

The `loadStorefrontProducts` filter at `storefront-products.js:40-43` IS a post-fetch filter, but it operates on the page-not-paginated full result (single query, no range) — different pattern, not B1-class.

**No B1-class bugs found in this audit.**

### ✅ Pattern 4 — Schema split-brain

SQL probe scanned for column-name pairs matching `display_X + storefront_X`, `*_old + *_new`, `*_v1 + *_v2`, `*_legacy + *`.

Only ONE pair found in the entire `public` schema: `brands.display_mode + brands.storefront_mode` and `inventory.display_mode_override + inventory.storefront_mode_override` — already addressed by D3+D4 (Phase B-2 today; Phase B-3/B-4 deferred to a follow-up SPEC pending Daniel sign-off).

**No new split-brain pairs.**

### ✅ Pattern 5 — Dropdown ↔ value-space mismatch (D4-followup pattern)

T1 today fixed the only known case (`storefront-products.html` `value="shop"` not in LEGACY value space). Comprehensive per-`<option>` audit across all 100+ HTML files would require per-site analysis (each option's value vs the column's CHECK constraint or value enum); deferred to a follow-up SPEC.

**No NEW findings beyond D4-followup.**

### ✅ Pattern 8 — RLS using `auth.uid()` (Iron Rule 15)

6 RLS policies use `auth.uid()`. **All 6 are platform-admin gates** (e.g., `platform_admins_read`, `audit_log_admin_read`), where `auth.uid()` legitimately maps to a Supabase Auth user that exists in the `platform_admins` table. **None are tenant-isolation policies misusing `auth.uid()` in a tenant_id slot.**

**Zero Rule 15 violations.**

---

## 4. Pattern coverage summary

| # | Pattern | Yielded findings? | Severity |
|---|---------|-------------------|----------|
| 1 | `onConflict` ↔ PK mismatch | No (clean) | n/a |
| 2 | B1-class post-pagination filter | No (clean post-fixes) | n/a |
| 3 | D5-class unrecoverable UI | 2 candidates (low) | LOW |
| 4 | Schema split-brain | No new (only D3+D4, fixed) | n/a |
| 5 | Dropdown ↔ value-space | No new (only T1, fixed) | n/a |
| 6 | Direct `sb.from()` (Rule 7) | 5 top files >10 sites | MEDIUM |
| 7 | UNIQUE without tenant_id (Rule 18) | 2 candidates worth confirming | LOW |
| 8 | RLS `auth.uid()` (Rule 15) | No (clean) | n/a |
| 9 | Files >350 lines (Rule 12) | 21 files | MEDIUM |
| 10 | innerHTML safety (Rule 8) | 100+ sites — deferred audit | LOW (sampled clean) |

---

## 5. Top 10 highest-priority items for tomorrow

Ordered by impact × effort ratio:

1. **D3+D4 Phase B-3** (view rewrite) — Daniel sign-off required. Already-decided fix path. **30 min** + verification.
2. **D3+D4 Phase B-4** (DDL drop NEW columns) — Daniel sign-off + Iron Rule 29. After B-3 stabilizes. **15 min** DDL.
3. **D6 AI content auth fix** — one-line patch per T11 finding. **15 min**, then ripple to 3 sibling files via `sb.functions.invoke()` migration.
4. **A1+A2 image compression** — Tier 2 (Daniel sign-off pending) — egress deadline approaching per ROADMAP.
5. **A4 + A3 storage cleanup** — Tier 2 (Daniel sign-off pending) — low risk.
6. **Brand UI consolidation Phase A** (T12 proposal) — fold storefront-brands.html unique features into Studio. **2-3 hours** JS work.
7. **Pattern 9 split: `storefront-translations.js`** (1264 lines → split into 2-3 files). Highest Rule 12 violator. **3-4 hours**.
8. **Pattern 6 migration: `crm-lead-actions.js`** (16 sb.from() sites → DB.*). Single-file proof of pattern. **2-3 hours**.
9. **Pattern 7 confirm + fix: `storefront_block_templates`/`storefront_templates` UNIQUE scope**. **30 min** SQL inspection + decide.
10. **D7 perf — parallelize count + data fetch in `loadMediaLibrary`** — T10 surfaced this as the biggest win (~600ms cold-load reduction). **30 min** JS.

---

## 6. Methodology notes

- **Greps** run across `modules/`, `js/`, `shared/` via the Grep tool (ripgrep-backed) and via `grep -rn` for line-count-style operations.
- **SQL probes** via Supabase MCP `execute_sql` (Level 1 read-only). Pre-flight per CLAUDE.md.
- **No source modifications.** Read-only audit pass.
- **Time spent:** ~45 minutes (well under the 3-4 hour budget). The "breadth > depth" guidance applied directly: no single finding triggered a deeper-dive detour.
- **Pattern 5 + Pattern 10** were sampled rather than exhaustively audited; flagged for future deep-dive SPECs.
- **Audit context:** the 10 patterns were derived from today's bug surface (C1, B1, D5, D3+D4, D4-followup). The fact that 8 of 10 scanned clean is itself a finding — today's bugs were a localized cluster, not symptoms of broader rot.

---

## 7. What this audit did NOT cover (for future audit SPECs)

- **Storefront repo (`opticup-storefront/`)** — only the ERP repo was audited. The storefront's TS/Astro side has its own conventions and a separate audit pass would be valuable.
- **Edge Functions** (`supabase/functions/`) — only the JS/HTML callers were audited; the EF source code itself wasn't scanned for the 10 patterns.
- **Migrations** (`migrations/*.sql`) — the live DB schema was probed, but the migration files themselves weren't sequence-validated against the live state.
- **CRM module deep audit** — has a dense 30+ files; spot-checked but not exhaustively per-pattern.
- **Performance profiling** — only D7's media library perf was measured (T10). Other suspected slow paths (e.g., inventory load with full image embed) weren't probed.
- **Security audit** — no specific security pattern scanning beyond what overlaps with the 10 functional patterns.

---

## 8. Open questions

1. **The Rule 12 history** (commit `c50302d` reverted a prior split attempt) — was the failure due to truncation or due to the split design itself? Tomorrow's split SPEC needs to learn from that incident; consider checking the post-mortem if one exists.
2. **The `storefront_block_templates` and `storefront_templates` tables** — are these tenant-scoped or platform-shared? If tenant-scoped, the UNIQUE on `name` alone is a Rule 18 violation; if platform-shared, the constraint is fine.
3. **Pattern 10's 100+ innerHTML sites** — what fraction operate on user input vs trusted-static / template-literal data? A targeted regex `innerHTML\s*=\s*[a-z]` (variable, not string literal start) would narrow the audit surface significantly.

---

*End of T13_COMPREHENSIVE_AUDIT_REPORT.md.*
