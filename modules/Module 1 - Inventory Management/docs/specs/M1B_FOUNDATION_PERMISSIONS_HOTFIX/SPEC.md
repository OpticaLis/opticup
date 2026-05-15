# SPEC — M1B_FOUNDATION_PERMISSIONS_HOTFIX

**Author:** opticup-strategic (Module Strategist + Foreman)
**Date:** 2026-05-15
**Brief:** `modules/Module 1 - Inventory Management/architecture-brief/M1B_FOUNDATION_PERMISSIONS_HOTFIX_BRIEF.md` (v1, 2026-05-15)
**Pipeline:** Full Auto Pipeline (single chat — Foreman → Executor → Reviewer → Foreman review)
**Branch:** `develop` only. Daniel-only merge to `main` after 🟢 close + Daniel manual click-through PASSes.
**Iron Rule 32 §7:** `None.` (implicit-forbid of every destructive op listed in Iron Rule 32 §1-§7 for this SPEC's run.)
**Classification (per §0 baselines below):** **Scenario B** — keys exist on both tenants but ZERO role_permissions assignments. Fix = INSERT 18 role_permissions rows (9 per tenant × 2 tenants) per role-tier matrix.

---

## §0 — Pre-Authoring Reality Check (Phase A diagnose — all 7 probes pinned)

### 0.A — Tenant & function baselines

| Fact | Value | Source |
|---|---|---|
| Demo tenant_id | `8d8cfa7e-ef58-49af-9702-a862d459cccb` | live tenants.slug='demo' |
| Prizma tenant_id | `6ad0781b-37f0-47a9-92e3-be9ed1477e1c` | live tenants.slug='prizma' |
| Active tenants in scope | 2 (demo + prizma) | live tenants table |
| `is_user_authorized_for(...)` function | **DOES NOT EXIST** (only `is_platform_super_admin` does) | A5 probe |
| Permission gating mechanism | Pure client-side `hasPermission(key)` via `sessionStorage[SK.PERMS]` cache populated at login from `role_permissions` table | `js/auth-service.js:65-89, 285-289` |
| `LEGACY_ROLE_MAP` | `{admin:'ceo', manager:'manager', employee:'worker'}` | `js/auth-service.js:21` |

### 0.B — Probe results (Phase A, all 7)

| # | Probe | Expected | Actual | Verdict |
|---|---|---|---|---|
| A1 | `permissions` rows for the 3 keys (× both tenants) | 6 rows (3 keys × 2 tenants) | **6 rows present** (lens.inventory.view + lens.designs.manage + lens.pricing.manage × demo+prizma) | ✅ keys exist — **Scenario A ruled out** |
| A2 | `role_permissions` rows for the 3 keys (any role, any tenant) | ≥1 row per key | **0 rows total** on either tenant | 🔴 **Scenario B confirmed** |
| A3 | `employees` row for `daniel@prizma-optic.co.il` | 1 row (demo) + 1 row (prizma) | **0 rows** — `employees.email IS NULL` for every active employee on both tenants; Daniel auths via PIN, not by email | Brief §2 A3 framing was wrong-axis — real-user smoke uses PIN-mint via pin-auth EF, NOT email lookup. Adapted below. |
| A4 | Sanity — existing `lens.%`/`platform.%`/`inventory.%`/`purchasing.%` in role_permissions on demo | Some hits | **inventory.{view,edit,delete,export,reduce}** + **purchasing.{view,create,edit,delete,approve}** present; **no `lens.*`**; no `platform.*` | Permission infrastructure intact — only the lens.* assignments are missing |
| A5 | `is_user_authorized_for` function in DB | Brief assumed exists | **DOES NOT EXIST** — only `is_platform_super_admin` is defined | Confirms Foundation D10 finding; gating is pure client-side hasPermission() |
| A6 | Screen-side gate code (typo / wrong-key audit) | 3 files calling `hasPermission()` with the 3 keys | `modules/lens-inventory/lens-inventory-main.js:38` → `hasPermission('lens.inventory.view')` ✅<br>`modules/lens-active-designs/lens-active-designs-main.js:26` → `hasPermission('lens.designs.manage')` ✅<br>`modules/lens-pricing/lens-pricing-main.js:28` → `hasPermission('lens.pricing.manage')` ✅ | All 3 use exact-matching keys — **Scenario C ruled out** |
| A7 | Comparison — `lens-catalog-admin` permission gate | Different infra | Uses `is_platform_super_admin` RPC + Supabase Auth (Platform Admin pattern), NOT `hasPermission()` | Phase 1A unaffected — orthogonal gate; this SPEC does not touch it |

**Classification: Scenario B.** Permission keys exist on both tenants but no role has them assigned. The Foundation SPEC's Block 1 successfully seeded `permissions` table (6 rows) but never seeded `role_permissions` (0 rows). The Foundation smoke at 9/9 PASS ran in JWT-direct context with implicit full-permission and never exercised the real client-side `hasPermission()` lookup against the populated cache — the central discipline gap this SPEC closes.

### 0.C — Live role taxonomy (verified for matrix construction)

Roles in `roles` table (per-tenant rows, identical 5-role taxonomy):

| role_id | name_he | demo perm_count (pre-fix) | Matrix view (this SPEC's grant) |
|---|---|---|---|
| `ceo` | מנכ"ל | 56 | lens.inventory.view + lens.designs.manage + lens.pricing.manage |
| `manager` | מנהל | 55 | lens.inventory.view + lens.designs.manage + lens.pricing.manage |
| `team_lead` | ראש צוות | 46 | lens.inventory.view |
| `viewer` | צופה | 17 | lens.inventory.view |
| `worker` | עובד | 17 | lens.inventory.view |

Rationale (per Brief §2 Phase B taxonomy):
- `lens.inventory.view` — daily ops view-only key → ALL 5 roles. Matches the pattern of `inventory.view` already present for all 5 roles per A4.
- `lens.designs.manage` — config-tier admin action → ceo + manager only.
- `lens.pricing.manage` — money-touching admin action → ceo + manager only.

**Matrix totals:** 3+3+1+1+1 = 9 rows per tenant × 2 tenants = **18 INSERTs**.

### 0.D — Inner-call arity audit (harvested pattern)

This SPEC introduces NO new RPCs and modifies NO function bodies. Inner-call arity check is N/A for this Pipeline. Recorded for retrospective consistency.

### 0.E — Smoke-touched schema audit (harvested pattern)

Tables exercised by Phase C smoke (read-only, plus the role_permissions writes):

| Table | Touched How | Notes |
|---|---|---|
| `role_permissions` | INSERT 18 rows (Phase B); SELECT (Phase C smoke) | The only write target this SPEC owns |
| `permissions` | SELECT only — confirm 6 lens.* rows intact post-migration | No writes |
| `employees` | SELECT only — pin-auth EF flow | No writes |
| `employee_roles` | SELECT only — role_id lookup | No writes |
| `roles` | SELECT only — taxonomy probe + name_he display | No writes |
| `tenants` | SELECT only — tenant_id resolution | No writes |
| `sessions` | INSERT (pin-auth EF side-effect during JWT mint) | Smoke artifact; cleanup not required (M1A-DEBT-04 lineage — sessions naturally expire in 8h) |

11-table audit clean. No surprise tables.

### 0.F — Concurrent-Pipeline orthogonality envelope (harvested)

This Pipeline runs while these prior Pipelines may be in close-out / Reviewer / Foreman states:
- M1_LENS_PHASE_1B_FOUNDATION (🟢 closed; the SPEC that shipped the bug)
- M1B0_PURCHASE_ORDER_SCHEMA (🟢 closing)
- M1A_OPERATIONS_RPCS_FIX (🟢 closed)

**Touch envelope (this SPEC owns):**
- `role_permissions` table — 18 new rows scoped by `(role_id, permission_id, tenant_id)` 3-tuple
- `modules/Module 1 - Inventory Management/docs/specs/M1B_FOUNDATION_PERMISSIONS_HOTFIX/*` — new SPEC folder

**Touch envelope (this SPEC does NOT own, must NOT modify):**
- All Module 1 production code (HTML, JS files) — pure data fix; no code changes expected
- `permissions` table — already correctly seeded by Foundation
- All other modules' code paths (M4 CRM, storefront, etc.)
- `decisions/M1.md`, `MASTER_ROADMAP.md`, `CLAUDE.md`, `OPEN_TASKS.md`, `TECH_DEBT.md` beyond standard SESSION_CONTEXT update
- `lens-catalog-admin` Phase 1A code or its gate (orthogonal `is_platform_super_admin` chain)

No collisions expected.

### 0.G — Runtime semantics rehearsal (per SKILL.md §5.3)

This SPEC's only mutation is `INSERT INTO role_permissions (role_id, permission_id, granted, tenant_id) VALUES (...)`. Behavior cases rehearsed:

1. **Anon caller hitting role_permissions** — RLS on `role_permissions` already enforces tenant_id-JWT-claim isolation (canonical 2-policy pattern). Anon caller (no JWT) → 0 rows visible. Not relevant — this SPEC's writes happen via MCP `apply_migration` (service_role) only.
2. **Authenticated caller, wrong tenant** — JWT-claim USING clause excludes cross-tenant rows. ✅
3. **Authenticated caller, correct tenant, role from JWT** — `getEffectivePermissions` query: `SELECT permission_id FROM role_permissions WHERE role_id IN (...) AND granted=true AND tenant_id=<tid>` → after migration returns the 3 lens.* keys for ceo/manager-tier; 1 lens.* key for team_lead/viewer/worker. ✅
4. **Existing rows collision** — PK on `role_permissions` is `(role_id, permission_id, tenant_id)` (per Phase 1A pattern). New 18 rows are guaranteed-distinct per the matrix. Migration uses `INSERT … ON CONFLICT (role_id, permission_id, tenant_id) DO NOTHING` for idempotency (Iron Rule 21 — extends a future re-run with no error).

Pin: Runtime semantics rehearsed — yes — evidence above.

### 0.H — Cross-Reference Check (Step 1.5 — Rule 21 enforcement)

This SPEC adds NO new names — no new tables, columns, RPCs, T-constants, FIELD_MAP entries, files. It only INSERTs into the existing `role_permissions` table using existing `permissions.id` and `roles.id` values.

Sweep clean: **0 collisions / 0 new names introduced.** Cross-Reference Check completed 2026-05-15 against GLOBAL_SCHEMA + GLOBAL_MAP + DB_TABLES_REFERENCE + module MAPs: 0 collisions / 0 new names.

### 0.I — Status-column semantics probe (per SKILL.md §5.3 from SECURITY_HOTFIX_3 P-AUTHOR-1)

N/A — this SPEC does not add or modify any RLS policy filtering by a `status`-like column. Recorded for retrospective consistency.

---

## §1 — Purpose

Real users on demo (and post-merge, on prizma) hit `localhost:3000/lens-inventory.html?t=demo` and receive the static-HTML message **"אין הרשאה למסך זה (lens.inventory.view)"** because the Foundation SPEC seeded the 6 `permissions` rows but never seeded any `role_permissions` assignments. The Foundation Pipeline's 9/9 smoke ran in JWT-direct context with implicit full permissions and never exercised the real client-side `hasPermission()` cache lookup, so the gap shipped silently. This SPEC fixes the bug (inserts 18 role_permissions rows per the role-tier matrix below) AND closes the discipline gap (introduces UI-level smoke that exercises the full PIN→JWT→DB-permissions→cache→hasPermission chain).

---

## §2 — Scope

### In scope

**Phase B — Seed role_permissions (Scenario-B fix).** Insert 18 rows into `public.role_permissions` per matrix:

| role_id × permission_id | demo (8d8cfa7e-…) | prizma (6ad0781b-…) |
|---|---|---|
| `ceo` × `lens.inventory.view` | INSERT, granted=true | INSERT, granted=true |
| `ceo` × `lens.designs.manage` | INSERT, granted=true | INSERT, granted=true |
| `ceo` × `lens.pricing.manage` | INSERT, granted=true | INSERT, granted=true |
| `manager` × `lens.inventory.view` | INSERT, granted=true | INSERT, granted=true |
| `manager` × `lens.designs.manage` | INSERT, granted=true | INSERT, granted=true |
| `manager` × `lens.pricing.manage` | INSERT, granted=true | INSERT, granted=true |
| `team_lead` × `lens.inventory.view` | INSERT, granted=true | INSERT, granted=true |
| `viewer` × `lens.inventory.view` | INSERT, granted=true | INSERT, granted=true |
| `worker` × `lens.inventory.view` | INSERT, granted=true | INSERT, granted=true |

= 9 rows per tenant × 2 tenants = **18 INSERTs total**. Single migration applies to both tenants in one `apply_migration` call (one MCP migration block emits 18 INSERTs).

Migration uses `INSERT ... ON CONFLICT (role_id, permission_id, tenant_id) DO NOTHING` for idempotency (in the event of partial prior runs or rollback-recovery). Iron Rule 21 — extends existing infra; does not duplicate.

**Phase C — UI-level smoke (NEW DISCIPLINE).** For demo tenant, verify the full real-user permission chain end-to-end:

1. **Server-side correctness smoke (5 sub-cases):** For each of the 5 roles, replicate the exact `getEffectivePermissions` SQL query and confirm the post-migration row set. Expected: `ceo` returns 3 lens.* keys; `manager` returns 3; `team_lead`/`viewer`/`worker` returns 1 (`lens.inventory.view` only).

2. **JWT-mint via pin-auth EF (positive — manager-tier real-user equivalent):** POST to `pin-auth` EF with `{pin:"12345", slug:"demo"}` (PIN 12345 = "עובד בדיקה" → role_id `ceo`). Confirm response payload includes a valid JWT and (if EF returns permissions) lens.inventory.view + lens.designs.manage + lens.pricing.manage are all set true. If EF returns only the JWT, supplement with a SQL probe replicating `getEffectivePermissions` for the returned employee_id → expect 59 keys (56 baseline + 3 lens.*).

3. **JWT-mint via pin-auth EF (negative — worker-tier rejection equivalent):** POST to `pin-auth` EF with `{pin:"090001", slug:"demo"}` (PIN 090001 = "מחשב ראשי (דמו)" → role_id `worker`). Confirm getEffectivePermissions equivalent returns 18 keys total: `lens.inventory.view` IS present; `lens.designs.manage` + `lens.pricing.manage` are NOT.

4. **Static HTML negation check:** confirm all 3 screen HTML files still contain the access-gate div + matching key in the rejection message (proves the negative-test path renders the right error for worker-tier when they try to enter `lens-pricing.html`).

5. **Server-side row count proof (final):** post-migration `SELECT count(*) FROM role_permissions WHERE permission_id LIKE 'lens.%'` → expect 18 (9 demo + 9 prizma). Iron Rule 31 integrity gate clean.

**Fallback note (per Brief §2 Phase C / Open Q1):** Playwright/Puppeteer NOT in package.json (verified live below in 0.J probe). The Brief's fetch+parse alternative against `localhost:3000/lens-inventory.html` won't catch the bug class because the access-gate div is always present in the static HTML (toggled by JS at runtime). The smoke approach above (server-side correctness + pin-auth JWT mint + simulated permission query) is the closest-to-real check achievable without a headless browser. The Foreman_review logs a follow-up proposal to promote Playwright UI smoke to mandatory in a future infrastructure SPEC.

### 0.J — Playwright presence probe (executor verifies in pre-flight)

```
grep -rn "playwright\|@playwright" package.json package-lock.json 2>/dev/null
```
Expected: 0 hits (consistent with Foundation TEST_REPORT smoke #9 — "live-browser final-mile deferred to Daniel manual QA"). If executor finds a hit, escalate — Playwright introduction is out-of-scope.

**Phase D — Production application (prizma).** Same single migration block (Phase B) applies to prizma in the same apply_migration call. Verified in §3 Success Criterion #5.

### Out of scope (explicit anti-creep — Brief §3 verbatim)

- **No screen logic changes.** No HTML/JS edits — pure data fix.
- **No new permission infrastructure.** Reuse `permissions` + `role_permissions` + client-side `hasPermission()`.
- **No new permission categories** beyond the 3 named.
- **No retroactive Phase 1A permission audit** (e.g., Phase 1A `platform.*` keys, `lens-catalog-admin` gate).
- **No Playwright/test-infra introduction** unless Daniel explicitly approves mid-Pipeline.
- **No `is_user_authorized_for` RPC introduction** (Foundation D10 confirmed unnecessary; per CLAUDE.md Iron Rule 21, do not invent what already works).
- **No JS framework changes** in the 3 screens.
- **No mockup / decisions/M1.md / Phase 1 Brief / Foundation SPEC modifications.**
- **No CLAUDE.md / MASTER_ROADMAP / OPEN_TASKS / TECH_DEBT modifications** beyond standard `SESSION_CONTEXT.md` Module-1 update.
- **No Procurement Pipeline work.** Held until this SPEC closes 🟢 + Daniel manual click-through PASSes.
- **No Prizma data writes beyond the 9 role_permissions rows** for the matrix.
- **No `main` branch modifications.** Daniel-only merge.

---

## §3 — Success Criteria (measurable, each pinned to expected value)

| # | Criterion | Expected value | Verification method |
|---|---|---|---|
| 1 | §0 Phase A complete and pinned | 7 probes (A1-A7) + scenario classified explicitly | This SPEC §0 — present |
| 2 | Phase B migration applied via MCP `apply_migration` to live Supabase | 1 migration block emitting 18 INSERTs | MIGRATION.md Applied Log entry |
| 3 | `permissions` table — 3 lens.* keys still exist post-migration on demo | 3 rows | `SELECT count(*) FROM permissions WHERE tenant_id='8d8cfa7e-…' AND id LIKE 'lens.%'` → 3 |
| 4 | `permissions` table — 3 lens.* keys still exist post-migration on prizma | 3 rows | `SELECT count(*) FROM permissions WHERE tenant_id='6ad0781b-…' AND id LIKE 'lens.%'` → 3 |
| 5 | `role_permissions` — 18 rows total post-migration | 18 | `SELECT count(*) FROM role_permissions WHERE permission_id LIKE 'lens.%'` → 18 |
| 6 | `role_permissions` — ceo + manager on demo have all 3 keys | 6 (3 × 2 roles) | `SELECT count(*) FROM role_permissions WHERE permission_id LIKE 'lens.%' AND tenant_id='8d8cfa7e-…' AND role_id IN ('ceo','manager') AND granted=true` → 6 |
| 7 | `role_permissions` — team_lead/viewer/worker on demo have ONLY lens.inventory.view | 3 (1 × 3 roles) | `SELECT count(*) FROM role_permissions WHERE permission_id LIKE 'lens.%' AND tenant_id='8d8cfa7e-…' AND role_id IN ('team_lead','viewer','worker') AND granted=true` → 3 (all `lens.inventory.view`); zero of `lens.designs.manage`/`lens.pricing.manage` for these 3 roles |
| 8 | Same shape on prizma | 6 + 3 | Same queries with `tenant_id='6ad0781b-…'` |
| 9 | UI-level smoke positive — pin-auth + getEffectivePermissions simulation for PIN 12345 (ceo) | Returns 59 keys total (56 baseline + 3 lens.*); all 3 lens.* present | TEST_REPORT.md Case 2 |
| 10 | UI-level smoke negative — pin-auth + getEffectivePermissions simulation for PIN 090001 (worker) | Returns 18 keys total (17 baseline + 1 lens.*); `lens.inventory.view` present; `lens.designs.manage` + `lens.pricing.manage` absent | TEST_REPORT.md Case 3 |
| 11 | All 5 server-side role-correctness sub-cases on demo PASS | 5/5 | TEST_REPORT.md Case 1.a-e |
| 12 | Static HTML access-gate markers intact in all 3 screens | 3/3 hits for `אין הרשאה למסך זה (lens.<key>)` | `grep "אין הרשאה" lens-inventory.html lens-active-designs.html lens-pricing.html` → 3 lines |
| 13 | Iron Rule 14, 15, 18, 21, 23, 31, 32 — no new violations | gate clean (Rule 31 verify --staged) on every commit | EXECUTION_REPORT.md per-commit verification |
| 14 | No Prizma data written beyond 9 role_permissions rows | git diff scope confirms | EXECUTION_REPORT.md final state diff |
| 15 | MIGRATION.md Applied Log present | every `apply_migration` call logged with ISO timestamp + migration_name + brief outcome | MIGRATION.md in SPEC folder |
| 16 | Commit count = 3-6, single-concern, on `develop` | 3-6 commits | `git log --oneline` post-execution |
| 17 | EXECUTION_REPORT.md + FINDINGS.md (or "no findings" stub) + TEST_REPORT.md + ROLLBACK.md present in SPEC folder | 4 files | `ls modules/Module 1 - Inventory Management/docs/specs/M1B_FOUNDATION_PERMISSIONS_HOTFIX/` |
| 18 | REVIEW.md verdict | 🟢 or 🟡 with explicit follow-ups | Reviewer output |
| 19 | FOREMAN_REVIEW.md present with 2 author-skill + 2 executor-skill improvement proposals; logs the **Foundation UI-smoke discipline gap** as skill-improvement proposal **counter 1/3** (verbatim: "Phase 1B-Foundation smoke ran JWT-direct only; promote UI-level smoke to mandatory in opticup-strategic SKILL.md §smoke for any SPEC that ships customer-facing screens.") | Verdict 🟢/🟡 | Foreman output |
| 20 | Hebrew status line emitted to Daniel | `M1B_FOUNDATION_PERMISSIONS_HOTFIX [🟢/🟡/🔴]. דו"חות בתיקיית הספק.` | Final chat output |

---

## §4 — Autonomy envelope (Bounded Autonomy)

**Executor may proceed without asking for:**

- **Level-3 DDL (data) via MCP `apply_migration`** — Phase B migration (18 INSERTs into role_permissions with ON CONFLICT idempotency).
- **Level-2 reads** — all SELECT probes (re-verification of §0 baselines at Step 1 pre-flight + post-migration §3 verification + Phase C smoke).
- **Level-2 writes via Edge Function** — POSTing to `pin-auth` EF to mint JWTs for smoke Cases 2-3. Sessions table receives one row per pin-auth call (smoke artifact — M1A-DEBT-04 lineage).
- **Standard SPEC-folder file creation** — EXECUTION_REPORT.md, FINDINGS.md (or "no findings" stub), TEST_REPORT.md, MIGRATION.md, ROLLBACK.md.
- **`SESSION_CONTEXT.md` update** — one new section at top per project pattern.

**Executor MUST escalate (stop on deviation):**

- Any new file outside SPEC folder + SESSION_CONTEXT.md.
- Any DDL targeting tables other than `role_permissions` (a single-table INSERT migration; if scope creeps, STOP).
- Any UI / HTML / JS edit. This SPEC is pure data; the moment a code file is touched, escalate.
- Any unexpected count from §3 probes (e.g., post-migration count ≠ 18, or pin-auth returns different role_id than expected).
- A pin-auth EF failure (5xx or auth-deny). STOP; investigate; escalate with the response payload.
- Playwright/Puppeteer surfacing in package.json scan unexpectedly. Out-of-scope (architect didn't pre-authorize tooling addition).

---

## §5 — Stop-on-deviation triggers (beyond CLAUDE.md §9 globals)

1. §3 success criterion #5 returns anything ≠ 18 post-migration → STOP.
2. §3 success criterion #9 or #10 produces unexpected lens.* key set (positive smoke missing a key; negative smoke seeing a manage key) → STOP.
3. pin-auth EF returns a JWT but the embedded role_id ≠ expected (`ceo` for PIN 12345; `worker` for PIN 090001) → STOP and probe `employee_roles`.
4. Any Prizma row appears modified beyond the 9 role_permissions INSERTs → STOP (Iron Rule 22 defense-in-depth + Prizma-data-safety).
5. Iron Rule 31 verify --staged emits any error (exit 1) → STOP and investigate.
6. Iron Rule 32 destructive-ops-declared.mjs check fails (it shouldn't — §7 = None and this SPEC's migration is pure INSERT) → STOP.
7. Migration fails (any SQL error, including 23505 unique_violation despite ON CONFLICT — would indicate a different PK definition than expected) → STOP and re-probe.
8. Reviewer flags any 🔴 finding → executor halts; Foreman decides.

---

## §6 — Rollback plan

If a stop-trigger fires mid-Pipeline OR Reviewer flags 🔴, rollback path:

**SQL rollback (applies to both tenants in one statement):**
```sql
DELETE FROM role_permissions
WHERE permission_id IN ('lens.inventory.view', 'lens.designs.manage', 'lens.pricing.manage')
  AND tenant_id IN ('8d8cfa7e-ef58-49af-9702-a862d459cccb', '6ad0781b-37f0-47a9-92e3-be9ed1477e1c');
```

This DELETE is **non-destructive in business terms** — it removes only the new rows this SPEC added; no pre-existing data is affected (zero rows existed for these keys before the migration, per A2 probe). After rollback, the system returns to its pre-SPEC state (the 3 screens remain unreachable for real users — same bug as before). Rollback is "back to the broken state" not "back to a working state" — that's expected because the SPEC's purpose is to ADD the missing assignments.

Captured in ROLLBACK.md inside the SPEC folder.

Sessions table side-effect (smoke artifacts) is NOT rolled back — natural 8h expiry handles cleanup (M1A-DEBT-04 lineage).

---

## Destructive Operations

(SPEC §7 — Iron Rule 32 canonical heading)

**None.**

This SPEC performs pure INSERTs into `role_permissions` with idempotent `ON CONFLICT … DO NOTHING`. No DROP, ALTER, DELETE (outside rollback), TRUNCATE, mass-rename, file delete, `git rm`, `git reset --hard`, `git push --force`, or `main` branch modification. Iron Rule 32 implicit-forbid satisfied across every commit and migration in this SPEC's run.

---

## §8 — Expected final state

Post-execution + close:

**Live DB:**
- `permissions` table: 6 lens.* rows (unchanged — Foundation already shipped).
- `role_permissions` table: +18 new rows (`lens.*` × 5 roles × 2 tenants per matrix; 9 per tenant).
- All other tables: unchanged.
- No new RPCs, no new tables, no schema-level changes.

**Repo:**
- New folder: `modules/Module 1 - Inventory Management/docs/specs/M1B_FOUNDATION_PERMISSIONS_HOTFIX/` with files: SPEC.md (this), EXECUTION_REPORT.md, FINDINGS.md, TEST_REPORT.md, MIGRATION.md, ROLLBACK.md, REVIEW.md, FOREMAN_REVIEW.md.
- Modified file: `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` — new top-section entry summarizing this Pipeline.
- No other files modified (no HTML/JS edits, no CLAUDE.md / MASTER_ROADMAP edits).

**Daniel-visible outcome:** clicking `localhost:3000/lens-inventory.html?t=demo` after PIN auth shows the lens inventory grid (not the "אין הרשאה" message). Same for `lens-active-designs.html` and `lens-pricing.html` for ceo/manager-tier users; worker-tier users still see the access-gate (correctly) on `lens-pricing.html`.

---

## §9 — Verify / verify-integrity gate

Per Iron Rule 31, executor runs `npm run verify:integrity` and `node scripts/verify.mjs --staged` before EVERY `git commit`. Expected: exit 0 on every commit. Iron Rule 32 destructive-ops-declared.mjs runs as part of the same pre-commit chain.

---

## §10 — Commit plan (3-6 commits, single-concern, on `develop`)

| # | Commit message | Concerns | Iron Rule 31 verify | Iron Rule 32 check |
|---|---|---|---|---|
| 1 | `chore(spec): open M1B_FOUNDATION_PERMISSIONS_HOTFIX — SPEC + ROLLBACK + MIGRATION skeleton` | SPEC.md + ROLLBACK.md + MIGRATION.md (skeleton) | exit 0 | §7=None declared |
| 2 | `feat(m1): seed lens role_permissions (5 roles × 3 keys matrix × 2 tenants) — 18 rows` | Phase B migration applied via MCP; MIGRATION.md Applied Log row appended; 18-row INSERT on demo+prizma | exit 0 | §7=None held |
| 3 | `test(m1): UI-level real-user smoke (5+2+1) — closes Foundation discipline gap` | TEST_REPORT.md with 5 server-side correctness sub-cases + 1 positive pin-auth + 1 negative pin-auth + 1 static HTML check; FINDINGS.md | exit 0 | §7=None held |
| 4 | `chore(spec): close — EXECUTION_REPORT + SESSION_CONTEXT` | EXECUTION_REPORT.md + SESSION_CONTEXT.md update; no other doc updates expected | exit 0 | §7=None held |

Reviewer and Foreman each add 1 commit (REVIEW.md and FOREMAN_REVIEW.md) → final 6-commit total max. No more, no less.

---

## §11 — Lessons Already Incorporated

**From frozen-skill state (carried via opticup-strategic + opticup-executor SKILL.md from M1_SKILL_IMPROVEMENT_HARVEST `ca823e3` and subsequent FOREMAN_REVIEWs):**

1. **§0 probe-first discipline (M1A, M1B0, Foundation pattern)** — every Brief assumption (e.g., `is_user_authorized_for` existing) is verified by SQL/grep BEFORE SPEC freezing. §0.B above pins all 7 probes; Brief §2 assumptions for A5 + A3 were both wrong-axis and adapted here.
2. **Inner-call arity audit** — §0.D: N/A this SPEC (no RPCs).
3. **Smoke-touched schema audit** — §0.E: 11 tables audited; no surprise touch points.
4. **Concurrent-Pipeline orthogonality envelope** — §0.F: ownership boundary explicit.
5. **MIGRATION.md Applied Log** — every `apply_migration` call gets a timestamped row in `MIGRATION.md` inside the SPEC folder (E1 pattern from M1A).
6. **Foreman-spot-checks > blind trust on EXECUTION_REPORT** — Reviewer + Foreman MUST run independent SQL probes against live DB after executor close, not just read the report. Locked Decision #4 from Brief.
7. **Cross-Reference Check completed** — §0.H: 0 collisions / 0 new names.
8. **Runtime semantics rehearsal completed** — §0.G: 4 caller-context cases reasoned; ON CONFLICT idempotency confirmed.
9. **Status-column semantics probe** — §0.I: N/A (no status filter).
10. **Both-tenant single migration block** — Phase B INSERTs apply to demo + prizma in one MCP call (Locked Decision #2 from Brief).
11. **TaskCreate discipline (this Pipeline run)** — task list maintained throughout for resumability.

**Specific to this SPEC:**

12. **The Foundation Pipeline's discipline gap** is the meta-lesson: a SPEC that ships customer-facing screens whose access is gated by `hasPermission(key)` MUST run smoke under a real-user JWT, not just a JWT-direct DB query that bypasses the cache-population path. The Foreman_review of THIS SPEC must log this gap as skill-improvement proposal **counter 1/3**, verbatim per §3 Success Criterion #19. Subsequent two reviews continue the counter until the proposal is applied to opticup-strategic SKILL.md §smoke (the auto-apply trigger per SKILL.md §"Self-Improvement Mandate").

---

## §12 — Hand-off note (to opticup-executor)

Executor reads this SPEC, runs Step 0 (repo + branch + integrity gate) + Step 1 pre-flight (re-verify §0 baselines still match live), then executes Phase B (1 migration) + Phase C (smoke per §2 schedule) + Phase D (auto-applies in same migration block) + close (EXECUTION_REPORT + FINDINGS + TEST_REPORT + MIGRATION.md + ROLLBACK.md + SESSION_CONTEXT update). Stop on §5 triggers.

After executor closes, Reviewer runs `opticup-reviewer` SKILL — re-verifies §3 criteria against live DB, spot-checks Prizma role-tier discrimination (cashier-tier vs manager-tier — ensure worker/viewer/team_lead got `lens.inventory.view` but NOT the two `.manage` keys), runs `scripts/audit/advisors-for-objects.mjs` (no new RPCs expected, just hygiene), writes REVIEW.md.

After Reviewer, Foreman (this skill) reads SPEC + EXECUTION_REPORT + FINDINGS + TEST_REPORT + REVIEW, spot-checks 2-3 largest claims, writes FOREMAN_REVIEW.md with required sections including the **Foundation UI-smoke discipline gap** as counter-1/3 author-skill improvement proposal, then emits ONE Hebrew status line.

---

*End of SPEC. Sealed for execution. Iron Rule 32 §7 = None. Scenario B. 18 INSERTs. 1 migration block. 3-6 commits.*
