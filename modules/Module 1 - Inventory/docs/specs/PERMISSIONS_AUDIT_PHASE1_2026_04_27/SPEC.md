# SPEC — PERMISSIONS_AUDIT_PHASE1_2026_04_27

> **Location:** `modules/Module 1 - Inventory/docs/specs/PERMISSIONS_AUDIT_PHASE1_2026_04_27/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, Cowork session)
> **Authored on:** 2026-04-27
> **Module:** Cross-cutting (auth-service.js + permissions/employees + every gated UI)
> **Phase:** Audit (Phase 1 of 2 — Phase 2 is fix work, separate SPEC after Daniel's review)
> **Author signature:** Cowork-strategic — 2026-04-27 evening, third hotfix
> **Severity:** HIGH — UI gates broken across multiple modules; Daniel can't trust the permissions matrix

---

## 1. Goal

Produce a comprehensive **read-only diagnostic report** of the entire
permissions system covering:

- Every `data-permission="..."` and `data-tab-permission="..."` attribute in
  the codebase, mapped to whether the permission key actually exists in the
  `permissions` table.
- Every `permissions` row in the DB (currently 281 according to Cowork's
  pre-flight probe), mapped to whether the key is referenced anywhere in code.
- Every `role_permissions` row per tenant — which roles exist per tenant, what
  granted/denied state each has, schema inconsistencies between tenants.
- The `'admin'` bypass behavior: every code path where `employees.role === 'admin'`
  is checked outside of `getEffectivePermissions`, mapped to whether it constitutes
  a bypass that lets Daniel see UI other roles can't.
- The permission-management UI in `modules/permissions/employee-list.js`:
  whether it shows all 281 keys, whether checkboxes save correctly, whether
  there's a tenant_id mismatch on writes.
- Tenant role drift: `אופטיקה פריזמה` has `team_lead` + `worker`, while
  `אופטיקה טסט` and others have `senior` + `employee`. Document the drift.

The report ends with a **proposal section**: concrete recommendations on how
to consolidate the 281 keys to ~80–120 by (a) merging always-co-checked
permissions, (b) deleting dead keys never referenced, (c) renaming keys that
collide semantically. Daniel reviews each proposal individually before any
write SPEC is dispatched.

**THIS SPEC MAKES ZERO WRITES.** It's pure investigation. Phase 2 (fixes) is
a separate SPEC authored after Daniel's review of this report.

---

## 2. Background & Motivation

Daniel reports that "מנהל בדיקה" (manager role, granted ~all permissions in
the UI screen) sees only ~half of what Daniel (admin role) sees. "מחסן"
(team_lead role, granted inventory.reduce explicitly) doesn't see the reduce
button or the bulk actions. The permissions screen doesn't appear to honor
what gets checked.

Cowork's pre-flight probe (this conversation, 2026-04-27) found:

| Layer | Finding |
|---|---|
| `permissions` table | 281 keys defined across 17 modules |
| `role_permissions` for Prizma | `ceo`: 55 / `manager`: 54 / `team_lead`: 45 / `worker`: 16 / `viewer`: 16 (out of 281) |
| `employees` table | Daniel: `role='admin'` + 0 rows in `employee_roles`. Test users: `role='employee'` + 1 row in `employee_roles` |
| `auth-service.js` line 21 | `LEGACY_ROLE_MAP = { admin: 'ceo', manager: 'manager', employee: 'worker' }` — admin maps to ceo |
| `auth-service.js` lines 65–89 | `getEffectivePermissions` queries `role_permissions` filtered by `tenant_id` — correct in principle |
| `auth-service.js` line 286 | `hasPermission(key) → sessionStorage.tenant_permissions[key] === true` — strict equality means `false` and `undefined` both deny |
| Tenant role drift | Prizma has `team_lead` + `worker`; "אופטיקה טסט" has `senior` + `employee`; "אופטיקה דמו" has `team_lead` + `worker` (matches Prizma) |
| `'admin'` employees | 1 row in Prizma (Daniel) — never appears in `employee_roles`, fallback maps to `'ceo'` which has 55 keys |
| Dead keys hypothesis | If 281 keys are defined but Prizma's most powerful role (manager) only has 54 granted, then either (a) the keys don't have rows for inactive perms in `role_permissions` (DB stores only granted=true), OR (b) most of the 281 keys are unused/dead |

**Hypothesis to test in this SPEC:** the most likely root cause is one of:

- **H1**: The permissions UI screen (`modules/permissions/employee-list.js`)
  filters which keys appear, so Daniel can't even see the 200+ unchecked keys
  to grant them.
- **H2**: The screen shows all keys, but the save handler writes to a wrong
  `tenant_id` or fails silently for some keys.
- **H3**: The 'admin' bypass is hardcoded somewhere (not in auth-service.js
  proper), so Daniel sees UI that depends on permissions other roles never get.
- **H4**: The 281 keys are mostly historic — only ~80 are actually referenced
  by `data-permission` attributes in the codebase, the rest are zombie keys.
- **H5**: The view/RLS layer has tenant-id leaks that accidentally show some
  data only to certain roles.

The deliverable answers each hypothesis with evidence.

---

## 3. Success Criteria (Measurable)

**Cross-section consistency check:** §4 forbids any DB writes; §12 QA verification
also makes only read-only calls. ✅ Consistent.

**Identifier verification done at author-time** (per FOREMAN_REVIEW
Improvement Proposal B from prior SPEC):
- `T.EMPLOYEES`, `T.BRANDS` — ✅ verified in `js/shared.js`
- `AT.PERMISSIONS`, `AT.ROLES`, `AT.ROLE_PERMS`, `AT.EMP_ROLES`, `AT.SESSIONS`
  — ✅ verified in `js/auth-service.js:4–10`
- `LEGACY_ROLE_MAP` — ✅ verified in `js/auth-service.js:21`
- `hasPermission`, `requirePermission`, `getEffectivePermissions`,
  `applyUIPermissions` — ✅ verified in `js/auth-service.js`
- `PermissionUI` — ✅ verified in `shared/js/permission-ui.js`
- File `modules/permissions/employee-list.js` — ✅ verified exists

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | ERP repo on `develop`, clean | "nothing to commit" | `git -C C:/Users/User/opticup status` |
| 2 | ERP commit count this SPEC | 2 | one for `DIAGNOSIS_REPORT.md`, one closing SPEC retrospective |
| 3 | DIAGNOSIS_REPORT.md present | ≥500 lines, structured | `wc -l` + `grep -c '^## '` |
| 4 | Inventory of all `data-permission` keys in code | enumerated | report §A1 lists every key found via repo-wide grep |
| 5 | DB inventory of all 281 permission keys | enumerated by module | report §A2 lists every row in `permissions` |
| 6 | Cross-reference matrix | for every code key: present in DB? for every DB key: referenced in code? | report §A3 has 4-quadrant table |
| 7 | Per-tenant role audit | for each of the 5+ tenants, list roles + perm counts + drift from Prizma baseline | report §B |
| 8 | UI screen audit | how many of 281 keys are visible in the permissions screen, how many are hidden | report §C, with screenshot or DOM-count evidence from local dev server |
| 9 | Save-handler trace | what exactly happens when Daniel clicks a checkbox in the screen — written as a step-by-step trace | report §D, with line numbers from `modules/permissions/employee-list.js` |
| 10 | Admin bypass map | every code location where `'admin'` is checked OR where role-based bypass logic exists | report §E |
| 11 | Hypothesis answers | H1, H2, H3, H4, H5 each marked CONFIRMED / RULED OUT / PARTIAL | report §F |
| 12 | Consolidation proposals | 5–15 numbered proposals to reduce the 281 keys, each with: keys involved, rationale, impact, risk | report §G |
| 13 | Phase 2 SPEC outline | what the fix-SPEC should cover, in scope vs out of scope | report §H |
| 14 | Dead-key list | list of permissions in DB never referenced in code | report §I (subset of §A3 quadrant) |
| 15 | EXECUTION_REPORT.md exists | file present | `ls SPEC_FOLDER/EXECUTION_REPORT.md` |
| 16 | FINDINGS.md exists | file present | `ls SPEC_FOLDER/FINDINGS.md` |
| 17 | Zero DB writes | all SQL run was `SELECT` only | grep `EXECUTION_REPORT.md` for any `INSERT\|UPDATE\|DELETE` mention — should only be in "did NOT do" sections |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read every file in the repo.
- Run **read-only** SQL via Supabase MCP (`SELECT` only — never `INSERT/UPDATE/DELETE/CREATE/DROP/ALTER`).
- Run repo-wide grep, find, wc.
- Open `localhost:3000` in a browser via the Chrome MCP to inspect the permissions UI on the running ERP, click around, count DOM elements. Read-only — no form submissions.
- Write the deliverable files (DIAGNOSIS_REPORT.md, EXECUTION_REPORT.md, FINDINGS.md) to the SPEC folder.
- Commit and push to `develop`.

### What REQUIRES stopping and reporting
- ANY write SQL of any kind. This is a read-only audit. If the executor finds itself wanting to `UPDATE role_permissions` to "test" something — STOP. That's Phase 2.
- Any modification to `js/auth-service.js`, `shared/js/permission-ui.js`, `modules/permissions/employee-list.js`, or any HTML file with `data-permission`. NOT THIS SPEC.
- Any modification to `permissions`, `roles`, `role_permissions`, `employee_roles`, `auth_sessions` tables. NOT THIS SPEC.
- Any UI form submission on the running localhost — the executor can navigate and inspect, but cannot click "save" on the permissions screen.
- Any merge to `main`.

---

## 5. Stop-on-Deviation Triggers

- If the executor's repo-wide grep returns more than 600 `data-permission` references — STOP. Repo size sanity check failed.
- If the read-only SQL count of `permissions` rows differs from 281 by more than ±20 — STOP. The DB state may have changed since this SPEC was authored. Re-baseline before continuing.
- If the executor accidentally runs a write SQL — STOP, log to FINDINGS as critical, do not continue without re-confirming intent.
- If `localhost:3000` is not reachable — DOCUMENT in FINDINGS, skip §C UI inspection, complete the rest of the report. Don't block on the optional UI-audit step.

---

## 6. Rollback Plan

This SPEC produces only documentation files. Rollback if needed:

1. `git -C C:/Users/User/opticup reset --hard {START_COMMIT}` — recorded by executor in pre-flight.
2. No DB rollback (no DB writes).
3. Notify Foreman; SPEC marked REOPEN.

---

## 7. Out of Scope (explicit)

- **Any fix work.** This is read-only investigation. If the executor sees a
  one-line fix that would solve everything, the executor still does NOT apply
  it — it goes in the report's §G proposals.
- **Performance work.** Don't profile, benchmark, or optimize anything.
- **Schema changes.** No DDL.
- **Removing the admin bypass.** That's Phase 2.
- **Consolidating permission keys.** Propose only.
- **Phase 2 SPEC itself.** The Phase 2 outline in §H of the report is just an
  outline — the actual Phase 2 SPEC is authored separately by opticup-strategic
  after Daniel reviews this audit.
- **Creating any new permissions in DB.**
- **Granting any permissions to any role.**

---

## 8. Expected Final State

### Pre-flight artifact (mandatory)

`PRE_FLIGHT.json` in SPEC folder:
```json
{
  "captured_at": "ISO timestamp",
  "git_start_commit": "SHA",
  "permissions_table_row_count": <int, expect ~281>,
  "data_permission_attribute_count": <int, from repo grep>,
  "tenants_count": <int>,
  "active_employees_with_admin_role": <int, expect 1+ for Prizma>,
  "localhost_3000_reachable": <bool>
}
```

### Files written (deliverables)

#### `DIAGNOSIS_REPORT.md` (the main deliverable)

Structure (every section required, even if empty with "no findings"):

```
# Permissions Audit — Phase 1 Diagnosis Report
2026-04-27 — Read-only investigation, no writes performed

## Executive Summary
3–5 paragraphs. What is the state of the permissions system today?
What's broken, what's healthy, what should be done first?

## §A — Permission Inventory

### §A1 — Code-side keys (every data-permission attribute)
Table: file, line, attribute value, element type (button/section/tab)

### §A2 — DB-side keys (every row in permissions)
Table: id, module, action, name_he, description

### §A3 — Cross-Reference Matrix (4 quadrants)
Quadrant 1: keys in BOTH code and DB (correctly wired)
Quadrant 2: keys in CODE only (in DB but referenced — fine)
Quadrant 3: keys in DB only, not referenced anywhere in code (DEAD)
Quadrant 4: code references a key NOT in DB (BROKEN — UI hides forever)

For each quadrant: count + list. Q3 and Q4 are the action items.

## §B — Per-Tenant Role Audit
Table per tenant: role_id, role_name, granted_count, top 5 missing keys
Drift summary: which tenants diverge from the canonical 5-role schema

## §C — UI Screen Audit (modules/permissions/employee-list.js)
- How many of 281 keys does the screen render? Compare DOM count to DB count.
- Are there any keys hidden by filter/search defaults?
- Save handler trace: what UPDATE/INSERT does it issue when a checkbox is toggled?
- Tenant_id source: where does the screen get the tenant_id it writes?
- Visual evidence: localhost:3000 screenshot OR DOM element count via Chrome MCP

## §D — Save-Handler Trace
Step-by-step from UI click → SQL write. Line numbers from
modules/permissions/employee-list.js. Identify any silent-failure paths.

## §E — Admin Bypass Map
Every code location where employees.role === 'admin' OR isAdmin OR similar.
For each: what does the bypass do? Is it consistent with getEffectivePermissions?
Categorize: BENIGN (admin === ceo by LEGACY_ROLE_MAP) vs HARMFUL (admin sees UI
that ceo with all 281 perms granted still wouldn't see).

## §F — Hypothesis Answers
H1 (UI filters keys): CONFIRMED / RULED OUT / PARTIAL — evidence
H2 (save handler tenant_id mismatch): same
H3 (admin bypass hardcoded): same
H4 (most 281 keys are dead): same
H5 (view/RLS layer leaks): same

## §G — Consolidation Proposals
5–15 numbered proposals. For each:
- Proposal N — short title
- Keys involved (list)
- Rationale (why merge / delete / rename)
- Impact (what UI behavior changes)
- Risk (low/medium/high)
- Daniel's decision: [PENDING — to be filled by Foreman after review]

## §H — Phase 2 SPEC Outline
What the fix SPEC should cover, in priority order. In scope vs out of scope.
Estimated effort. Decision points that require Daniel before authoring Phase 2.

## §I — Dead Keys (subset of §A3 Q3)
Explicit list — these can be DELETE FROM permissions safely if Phase 2 chooses.

## §J — Open Questions for Daniel
Things the executor couldn't decide and need a strategic call.
```

#### `EXECUTION_REPORT.md`

Same template as prior SPECs. Includes:
- Start/end commit hashes
- §3 criteria measured
- Deviations from SPEC
- 2 executor-improvement proposals
- Iron-Rule self-audit (especially Rule 13 — read-only access boundaries)

#### `FINDINGS.md`

Anything surprising the executor noticed that wasn't in the original hypothesis
list. SPEC-precision issues if any. Tech-debt observations.

#### `PRE_FLIGHT.json` (described above)

### Modified files

- None outside the SPEC folder.

### Deleted files

- None.

### DB state

- Zero changes.

### Docs updated

- `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` — append entry referencing this audit.
- That's it. No GLOBAL_MAP, no GLOBAL_SCHEMA, no MASTER_ROADMAP changes.

---

## 9. Commit Plan

ERP repo (`opticup`, on `develop`):

- **Commit 1** — `docs(audit): add PERMISSIONS_AUDIT_PHASE1 diagnosis report`
  - Touches: SPEC folder (DIAGNOSIS_REPORT.md, PRE_FLIGHT.json) + SESSION_CONTEXT.md
- **Commit 2** — `chore(spec): close PERMISSIONS_AUDIT_PHASE1 with retrospective`
  - Touches: SPEC folder (EXECUTION_REPORT.md, FINDINGS.md)

Storefront repo: zero commits.

---

## 10. Dependencies / Preconditions

- ERP `develop` clean.
- Supabase MCP authenticated.
- Optional: `localhost:3000` running ERP (for §C UI audit). If not reachable,
  skip and document in §C as "UI audit deferred — localhost not reachable".

---

## 11. Lessons Already Incorporated

Harvested from FOREMAN_REVIEWs of: STUDIO_BRANDS_VISIBILITY_REWORK,
STOREFRONT_SYNC_HIERARCHY_FIX, FINAL_CLEANUP, D5_HIDDEN_PRODUCT_RECOVERY.

- **FROM `STUDIO_BRANDS_VISIBILITY_REWORK/FOREMAN_REVIEW.md` Strategic Proposal A (Cross-Section Consistency Check)** → **APPLIED**: §3 explicitly states the cross-section check at the top. §4 forbids writes; §12 only does reads. No contradiction possible.
- **FROM `STUDIO_BRANDS_VISIBILITY_REWORK/FOREMAN_REVIEW.md` Strategic Proposal B (Identifier verification)** → **APPLIED**: §3 lists every codebase identifier I cite + confirmation that I grepped it before authoring. `T.EMPLOYEES`, `AT.PERMISSIONS`, `AT.ROLE_PERMS`, etc. all verified.
- **FROM `STOREFRONT_SYNC_HIERARCHY_FIX/FOREMAN_REVIEW.md` Strategic Proposal A (Live-state baseline probe)** → **APPLIED**: §2 includes the live counts I probed before authoring (281 perms, 5 roles per Prizma, etc.). Threshold in §5 ("281 ± 20") is centered on the actual baseline.
- **FROM `STOREFRONT_SYNC_HIERARCHY_FIX/FOREMAN_REVIEW.md` Strategic Proposal B (Rendered-DOM verify, not source-grep)** → **APPLIED for §C**: the UI audit explicitly uses Chrome MCP DOM inspection on localhost, not curl + grep on source HTML.
- **Prior FINDINGS recurrence note:** the folder-name shorthand "Module 1 - Inventory" vs "Module 1 - Inventory Management" is a known issue. Executor uses real paths. Do not fail criteria on path mismatches.

### Cross-Reference Check

Cross-Reference Check completed 2026-04-27 against GLOBAL_SCHEMA + auth-service.js + permission-ui.js:
- 0 new DB objects (no new tables, columns, RPCs, T-constants).
- 0 new functions in code.
- 0 new files in `modules/` or `js/` or `shared/`.
- ONLY new files: 4 deliverables in this SPEC's folder (DIAGNOSIS_REPORT.md, EXECUTION_REPORT.md, FINDINGS.md, PRE_FLIGHT.json) — all under `modules/Module 1 - Inventory/docs/specs/PERMISSIONS_AUDIT_PHASE1_2026_04_27/`.
- Uses existing identifiers only — `permissions`, `roles`, `role_permissions`, `employee_roles`, `employees`, `auth_sessions`, `tenants` tables; `T.EMPLOYEES`, `AT.*`, `LEGACY_ROLE_MAP`, `hasPermission`, `getEffectivePermissions`, `applyUIPermissions` symbols.

---

## 12. QA Acceptance — End-to-End

After commit 1 lands:

1. `wc -l DIAGNOSIS_REPORT.md` → ≥500 lines.
2. `grep -c '^## §' DIAGNOSIS_REPORT.md` → 10 (sections A–J).
3. `grep -c 'CONFIRMED\|RULED OUT\|PARTIAL' DIAGNOSIS_REPORT.md` → ≥5 (one per H1–H5).
4. §G has at least 5 numbered proposals.
5. §I (dead keys) has at least an empty list with explicit "0 dead keys" if all 281 are live.
6. PRE_FLIGHT.json exists and is valid JSON.
7. No DB writes happened: `grep -ci 'INSERT INTO\|UPDATE.*SET\|DELETE FROM' EXECUTION_REPORT.md FINDINGS.md` should only match in negative contexts ("did NOT", "would have", "must not").

Attach all 7 results to EXECUTION_REPORT.md §QA verbatim.

---

## 13. Notes for the Executor

- This is a high-value diagnostic. Daniel will base the entire Phase 2 fix on
  what this report says. Take time. Don't rush. Better to deliver a 1,000-line
  thorough report than a 300-line skim.
- The most important part is §G (consolidation proposals) and §F (hypothesis
  answers). Those drive Daniel's decisions.
- §H (Phase 2 outline) should be conservative — propose the SMALLEST fix that
  solves the user-reported issue ("manager doesn't see what admin sees")
  first, then optional cleanups. Don't propose a 2-week refactor.
- For §C (UI audit), if localhost isn't reachable, just note it. Don't try to
  spin up the ERP; that's out of scope.
- For §E (admin bypass), be specific about line numbers. Daniel will compare
  this to the LEGACY_ROLE_MAP behavior — bypass that ALSO grants ceo's perms
  via the map is benign; bypass that grants visibility OUTSIDE the perm system
  is the one we're hunting.
- Use Chrome MCP `evaluate_script` for any DOM measurement. Don't curl + grep
  the page source — JS-rendered content won't be there.
