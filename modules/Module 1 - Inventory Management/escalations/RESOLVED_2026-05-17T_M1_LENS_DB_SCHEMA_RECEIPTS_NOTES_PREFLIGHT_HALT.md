# Escalation — M1_LENS_DB_SCHEMA_RECEIPTS_NOTES halted at pre-flight

**Date:** 2026-05-17
**Author:** opticup-executor (Claude Code, Windows desktop, terminal #2)
**Status:** 🛑 HALT at Step 1.5 DB Pre-Flight — no commits, no schema writes, no lock claimed
**Triggers fired (both explicit in ACTIVATION_PROMPT stop list):**
1. Coordination collision with concurrent SPEC 2 session on branch `develop`
2. §0 pre-flight reveals SCHEMA DIFFERENCE from SPEC text — two tables (`permissions`, `role_permissions`) and one role (`admin`) have shapes incompatible with SPEC §9 migration template

**Reference SPEC:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_DB_SCHEMA_RECEIPTS_NOTES/SPEC.md`
**Reference Brief:** `architecture-brief/M1_LENS_MOCKUP_FIDELITY_FULL_REBUILD_BRIEF.md` §SPEC 3

---

## 1. What I did (read-only only)

1. First Action protocol: confirmed repo `opticalis/opticup`, branch `develop`, clean of in-scope files, integrity gate exit 0.
2. Attempted `pipeline-coordination.mjs claim` — FAILED with collision (see §2 below).
3. Switched to `check-collision` to inspect the blocking lock — confirmed SPEC 2 (`M1_5_SHARED_COMPONENTS_PHASE_0`) holds `branch_owned=develop`, heartbeat 4.4 min old (active per ACTIVE_MIN=5).
4. Read SPEC.md in full, including §0 (Foreman's pre-authoring reality check) and §14 (execution-deferral note).
5. Ran §0 baseline verification SQL against live Supabase via MCP `execute_sql` (read-only, Level 1).
6. Discovered schema mismatch in `permissions` + `role_permissions` + `roles` tables — see §3.
7. Wrote no files, applied no migrations, claimed no lock. Project state unchanged.

## 2. Deviation #1 — Pipeline-coordination collision

The ACTIVATION_PROMPT expected parallel execution of SPEC 2 (terminal #1) and SPEC 3 (terminal #2) on branch `develop`, with non-overlapping `files_owned_globs`. The actual `pipeline-coordination.mjs` (shipped today by `PARALLEL_PIPELINE_COORDINATION` SPEC) enforces **one Pipeline per branch** by design at line 297 of the script, regardless of file overlap. Brief §3.3 of the coordination brief is the source. There is no parallel-branch mode in the tool.

**Effect:** SPEC 3 cannot claim a lock until either:
- (a) SPEC 2 releases its lock (i.e., SPEC 2 finishes or is cancelled), OR
- (b) SPEC 2's heartbeat goes stale (>5 min without a heartbeat bump → eligible for `cleanup-stale`), OR
- (c) SPEC 3 runs on a separate branch (not `develop`), but that contradicts CLAUDE.md §9 rule "all work happens directly on `develop`".

**Note on flag mismatch (minor):** the ACTIVATION_PROMPT's command uses `--pipeline` and `--files-owned`, but the script's flags are `--spec-slug` and `--files-owned-globs`. Adjusted to correct flag names during the live attempt. Worth fixing in the activation prompt template, but not material to this escalation.

## 3. Deviation #2 — Live schema differs from SPEC §9 template

SPEC §9 documents the permission-seed migration template with these assumed columns:

```sql
INSERT INTO permissions (key, description) VALUES (...);
INSERT INTO role_permissions (role_key, permission_key) VALUES (...);
```

Note §9 itself flagged: "column names in permissions / role_permissions may differ from these guesses; executor pre-flight must verify against actual schema before writing the migration file." The verification has now run.

### Actual `permissions` schema (live):

| Column | Type | NOT NULL | Notes |
|---|---|---|---|
| `id` | text | YES | dotted slug, e.g. `'inventory.view'` |
| `module` | text | YES | e.g. `'inventory'` |
| `action` | text | YES | e.g. `'view'` |
| `name_he` | text | YES | required Hebrew display name |
| `description` | text | NO | optional |
| `created_at` | timestamptz | NO | default `now()` |
| `tenant_id` | uuid | YES | **tenant-scoped** — each row exists per tenant |

### Actual `role_permissions` schema (live):

| Column | Type | NOT NULL | Notes |
|---|---|---|---|
| `role_id` | text | YES | not `role_key` |
| `permission_id` | text | YES | not `permission_key` |
| `granted` | boolean | YES | default `true` |
| `tenant_id` | uuid | YES | **tenant-scoped** |

### Actual `roles` (live, both tenants):

`ceo`, `manager`, `team_lead`, `viewer`, `worker`. **There is no `admin` role.**

### Existing seed pattern observed (sample of `permissions`):

```
id=inventory.delete  module=inventory  action=delete  name_he=מחיקת פריט    tenant_id=<prizma>
id=inventory.delete  module=inventory  action=delete  name_he=מחיקת פריט    tenant_id=<demo>
id=inventory.edit    module=inventory  action=edit    name_he=עריכת מלאי   tenant_id=<prizma>
id=inventory.edit    module=inventory  action=edit    name_he=עריכת מלאי   tenant_id=<demo>
...
```

So existing seeds **duplicate every permission row across all tenants** (one per tenant in `permissions`, and again in `role_permissions`).

## 4. Cascading impact on SPEC 3

| §3 Criterion | Impact |
|---|---|
| #9 `Permission keys seeded` | 🔴 BLOCKED — migration template needs full rewrite |
| #10 `Role grants seeded` | 🔴 BLOCKED — `admin` role doesn't exist; need Foreman decision on which existing role(s) get the grants |
| Commit Plan commit #4 (permission seed migration) | 🔴 BLOCKED until template fixed |

The other deltas in §3 (criteria 1–8, 11–20) are independent of the permission seed and would be safe to execute once the coordination collision (Deviation #1) clears. But the SPEC is supposed to land as a single closure, so partial execution defeats the purpose.

## 5. Architectural questions for the Foreman

These are Foreman-level decisions, not executor-level. **I am not making them autonomously.**

**Q1 — Which roles should hold each new key?** SPEC §9 named `admin` + `manager`. Roles actually present: `ceo`, `manager`, `team_lead`, `viewer`, `worker`. Best inference (NOT a decision — for Foreman):
- `inventory.view_cost_price` → `ceo`, `manager` (cost-price is sensitive financial data)
- `lens_pricing.edit` → `ceo`, `manager` (matches SPEC's intent of admin+manager)

**Q2 — Per-tenant seeding scope.** Brief authorizes "only demo, no Prizma writes". But existing permissions are duplicated across both tenants — seeding only demo creates per-tenant key drift: Prizma users would lose access to a future Pricing screen feature because the key doesn't exist for their tenant. Options:
- (a) Seed for BOTH tenants — violates Brief's "no Prizma writes" prohibition but maintains schema parity. Probably what Brief actually intends (the prohibition is presumably about *data* not *schema*).
- (b) Seed only demo — pragmatic but creates known drift to clean up later.
- (c) Add a "permission templates" concept (`permissions_template` global table that auto-replicates to each tenant) — major architectural change, out of scope for SPEC 3.

**Q3 — Permission-key naming.** SPEC §9 strings `inventory.view_cost_price` and `lens_pricing.edit` map cleanly to the actual `module`/`action` split (`module='inventory'`, `action='view_cost_price'`; `module='lens_pricing'`, `action='edit'`). The `id` column becomes the slug. No structural problem with the SPEC's chosen strings — they fit the model.

**Q4 — `name_he` text.** SPEC §9 doesn't provide Hebrew display names. Best inference:
- `inventory.view_cost_price` → `'צפייה במחיר עלות'`
- `lens_pricing.edit` → `'עריכת תמחור עדשות'`

But Foreman should confirm phrasing.

## 6. What I propose (not executing — proposing)

1. **Resolve Deviation #1 first.** Either let SPEC 2 finish and then run SPEC 3 sequentially, or have Foreman confirm SPEC 3 should wait. Parallel execution on `develop` is structurally blocked.
2. **Foreman authors a SPEC.md amendment (§9 patch):** replaces the permission seed template with the correct column-shape, picks Q1/Q2/Q4 answers, and amends Commit Plan #4 accordingly. The amendment is small (one migration body), but it's a SPEC change → Foreman territory, not executor.
3. **Then re-dispatch SPEC 3.** The two `purchase_receipt.has_no_invoice` and `lens_variant_notes` migrations are fully unblocked once §9 is fixed.

## 7. Read-only data I gathered for the Foreman

§0 baselines verified (all consistent with SPEC §0 expectations):
- `lens_variant_notes` table: **does not exist** ✅
- `purchase_receipt.has_no_invoice` column: **does not exist** ✅
- `purchase_receipt` table: **exists** ✅
- `lens_variant` table: **exists** ✅
- `inventory.view_cost_price` permission: 0 rows in either tenant ✅
- `lens_pricing.edit` permission: 0 rows in either tenant ✅

So the SPEC §0 reality-check claims hold; the issue is in §9's migration template + role roster assumptions, not in the §0 baseline.

## 8. Project state at HALT

- Branch: `develop`, no commits made
- `git status --porcelain` — same as session start (only pre-existing GUARDIAN_ALERTS.md modification + 3 untracked ACTIVATION_PROMPT files + SPEC 2 folder; nothing new)
- No `pipeline-coordination` lock held by this session
- No migrations applied
- No files written except this escalation file
- Supabase MCP queries were all read-only `execute_sql` (Level 1)

## 9. Next-step options for Foreman / Daniel

- **Option A — Resolve collision + amend SPEC.** Wait for SPEC 2 to release, Foreman amends §9 of SPEC.md to fix the permission-seed template, then re-dispatch SPEC 3.
- **Option B — Split SPEC 3.** Foreman splits SPEC 3 into 3a (the 2 unblocked deltas: `has_no_invoice` column + `lens_variant_notes` table) and 3b (the permission seeds, after schema-template fix). 3a runs cleanly after SPEC 2; 3b waits on amendment.
- **Option C — Cancel SPEC 2 to unblock SPEC 3.** Pragmatic if SPEC 2 hasn't made meaningful progress and SPEC 3's permission keys aren't urgent.

I have no preference; the call is the Foreman's.

---

*End of escalation. Authored 2026-05-17 by opticup-executor at pre-flight HALT.*
