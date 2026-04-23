# FINDINGS — P1_INTERNAL_LEAD_INTAKE

> **Location:** `modules/Module 4 - CRM/go-live/specs/P1_INTERNAL_LEAD_INTAKE/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — Local develop has diverged from origin/develop (pre-SPEC state)

- **Code:** `M4-GIT-01`
- **Severity:** MEDIUM
- **Discovered during:** First Action step 3 (`git pull origin develop`)
- **Location:** local `develop` branch, 3 remote commits (`bd9ec9f`, `4375dfc`, `4a41957`) + 3 local P1 commits (`f8783dd`, `b459af9`, this retrospective) are unmerged
- **Description:** When the session started, local `develop` was at `e1e4fe6` (CRM B9 close) while remote was at `4a41957` (C1 close with EXECUTION_REPORT + ROADMAP v1). Meanwhile, Daniel had already locally edited `go-live/ROADMAP.md` to v2 (new Edge-Function-first strategy), staged a batch of CRM JS/HTML edits, and modified the Module 4 docs — all as intentional WIP. Pulling would have overwritten the v2 ROADMAP and the intentional WIP. I proceeded without pulling and added the three P1 commits on top of local `e1e4fe6`, leaving the remote/local divergence for the Foreman to reconcile.
- **Reproduction:**
  ```
  $ git fetch origin develop
  $ git log --oneline e1e4fe6..origin/develop
  4a41957 docs(crm): close C1 lead intake pipeline with execution report and findings
  bd9ec9f docs(crm): add Go-Live roadmap, C1 SPEC, and message template seeds
  4375dfc feat(crm): add Tier 1 incoming leads tab and rename Leads to Registered
  ```
- **Expected vs Actual:**
  - Expected (per SPEC §3 criterion 1 and CLAUDE.md First Action step 3): local `develop` synced with remote before work starts.
  - Actual: local is behind remote by 3 commits, AND local working tree has content that supersedes remote (ROADMAP v2 > ROADMAP v1). Merge-forward or cherry-pick is needed.
- **Suggested next action:** DISMISS (for this SPEC) + NEW_SPEC_or_INLINE_FIX (one-off git maintenance task for Daniel or Foreman).
- **Rationale for action:** The divergence is a one-time state issue caused by strategic pivot C1→P1 crossing machines; not a systemic bug. A single merge or force-with-lease from whichever machine has the authoritative P1-era state resolves it. No code change needed.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — Windows bash + curl `-d` mangles UTF-8 Hebrew in inline JSON payloads

- **Code:** `M4-TEST-01`
- **Severity:** LOW
- **Discovered during:** SPEC §13 Test 4 execution
- **Location:** test harness (SPEC §13), not production code
- **Description:** SPEC §13 Test 4 uses `curl -d '{"...", "eye_exam": "כן", ...}'` in a single-line bash invocation. On the Windows desktop, the shell → curl → HTTP pipeline mangled the Hebrew value `כן` to two U+FFFD replacement characters before it reached the Edge Function. The function stored exactly what it received — replacement chars — which made Criterion 6 (all fields populated) appear to fail. Re-running with `curl --data-binary @tmp-payload.json` on a UTF-8-encoded file produced the expected `בדיקת עיניים: כן`.
- **Reproduction:**
  ```bash
  # Bad on Windows bash (mangles Hebrew):
  curl -X POST <url> -H "Content-Type: application/json" -d '{"eye_exam":"כן", ...}'

  # Good (file-based UTF-8):
  curl -X POST <url> -H "Content-Type: application/json; charset=utf-8" \
       --data-binary @payload.json
  ```
- **Expected vs Actual:**
  - Expected: `client_notes` = `"בדיקת עיניים: כן\ntest from P1 SPEC"`.
  - Actual (inline `-d` on Windows): `client_notes` = `"בדיקת עיניים: ��\ntest from P1 SPEC"` (two replacement chars instead of `כן`).
- **Suggested next action:** TECH_DEBT (update SPEC author guidance) — for future SPECs with Hebrew in test payloads, always specify file-based `--data-binary`.
- **Rationale for action:** A platform quirk on Windows bash; the function itself is UTF-8-clean. Affects test authoring ergonomics only, not production correctness. Worth noting once in the executor skill's Test Protocol guidance so future SPECs avoid the trap.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — Module 4 has no `db-schema.sql` file (recurring alert)

- **Code:** `M4-DOC-SCHEMA-01` (re-surfacing Sentinel alert M7-DOC-02)
- **Severity:** LOW
- **Discovered during:** Pre-Flight Check (SKILL.md §1.5 step 2)
- **Location:** expected at `modules/Module 4 - CRM/docs/db-schema.sql`, does not exist
- **Description:** CLAUDE.md §7 Authority Matrix says "Module's DB tables (source-of-truth for that module)" lives in `modules/Module X/docs/db-schema.sql`. Module 4 never created one (23 tables + 7 views + 8 RPCs all live only in `campaigns/supersale/migrations/001_crm_schema.sql`). My Pre-Flight therefore had to query live DB via Supabase MCP instead of reading a local file — works, but slower and offline-hostile. This is separately flagged by the Sentinel as `M7-DOC-02` (HIGH).
- **Reproduction:**
  ```bash
  $ ls "modules/Module 4 - CRM/docs/"
  CHANGELOG.md  MODULE_MAP.md  SESSION_CONTEXT.md  specs
  # no db-schema.sql
  ```
- **Expected vs Actual:**
  - Expected: A module-local `db-schema.sql` with the 23 tables, 7 views, 8 RPCs' DDL.
  - Actual: Only lives in `campaigns/supersale/migrations/001_crm_schema.sql`, which is campaign-scoped, not module-scoped.
- **Suggested next action:** NEW_SPEC — `M4_DOCS_DB_SCHEMA_INIT` (small SPEC: extract the module's DDL from `001_crm_schema.sql`, place in `modules/Module 4 - CRM/docs/db-schema.sql`, update MODULE_MAP).
- **Rationale for action:** Already a Sentinel alert with a HIGH label; every future Pre-Flight in Module 4 will hit the same gap. Fixing it is a ~30-minute task independent of any feature work.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — `client_notes` cannot cleanly disambiguate "eye_exam" from free-form notes

- **Code:** `M4-SCHEMA-02`
- **Severity:** LOW (information)
- **Discovered during:** implementing the `client_notes` build step (SPEC §12 step 6 sub-bullet)
- **Location:** `crm_leads.client_notes` column usage; `supabase/functions/lead-intake/index.ts:128-132`
- **Description:** The SPEC requires `eye_exam` to be stored inside `client_notes` rather than a dedicated column. I implemented `"בדיקת עיניים: {value}\n{free-form notes}"`. Downstream consumers (CRM UI, reports, analytics) now have to parse Hebrew prose to recover the structured `eye_exam` value. If a future feature needs to filter leads by `eye_exam = 'כן'`, it will require LIKE-matching against a Hebrew substring — brittle and locale-specific.
- **Reproduction:** Try to answer: "how many leads this week said YES to eye exam?" via SQL without any code changes.
  ```sql
  SELECT count(*) FROM crm_leads WHERE client_notes LIKE 'בדיקת עיניים: כן%';  -- brittle
  ```
- **Expected vs Actual:**
  - Expected (SaaS-wise): structured `eye_exam BOOLEAN` or `eye_exam TEXT` column.
  - Actual: unstructured prose inside `client_notes`.
- **Suggested next action:** NEW_SPEC (only if/when analytics need it — this is not a blocker today).
- **Rationale for action:** The SPEC explicitly excluded the schema change (§7 Out of Scope bullet "No `eye_exam` as a dedicated column"), so the design is intentional. Recording the cost here so the Foreman can decide if/when to add the column in a later phase. Low-priority by itself.
- **Foreman override (filled by Foreman in review):** { }

---

## Summary Table

| # | Code | Finding | Severity | Action |
|---|------|---------|----------|--------|
| 1 | M4-GIT-01 | Local develop diverged from origin | MEDIUM | DISMISS + one-off git maintenance |
| 2 | M4-TEST-01 | Windows bash mangles UTF-8 in curl `-d` | LOW | TECH_DEBT (update test authoring guidance) |
| 3 | M4-DOC-SCHEMA-01 | Module 4 has no `db-schema.sql` | LOW | NEW_SPEC (small, ~30 min) |
| 4 | M4-SCHEMA-02 | `eye_exam` buried inside prose `client_notes` | LOW (info) | NEW_SPEC (deferred) |
