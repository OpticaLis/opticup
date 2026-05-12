# SPEC — DEMO_HEALTH_CHECK_EVENT_LINK_FIX

> **Location:** `modules/Module 4 - CRM/docs/specs/DEMO_HEALTH_CHECK_EVENT_LINK_FIX/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — Full Auto Pipeline session
> **Authored on:** 2026-05-11
> **Module:** 4 — CRM (with cross-module read of M3 / M1.5 shared infra)
> **Phase:** Maintenance / pre-CRM-Migration-#3 hotfix
> **Author signature:** Claude Code chat — Demo Health Check Pipeline 2026-05-11

> **Heading convention:** plain `## N. Title`, no `§` prefix (Iron-Rule-32 hook regex).

---

## 0. Pre-Authoring Reality Check

- Brief read in full on 2026-05-11: `modules/Module 4 - CRM/architecture-brief/DEMO_HEALTH_CHECK_BRIEF.md` v1.
- Demo tenant UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`, slug `demo` — confirmed via SESSION_CONTEXT.md and prior SPECs.
- Module 4 status: CLOSED ADMINISTRATIVELY, in MAINTENANCE. Active concern is `M4_HARDCODED_PRIZMA_REMOVAL` (2026-05-06) which seeded `tenants.business_phone`, `tenants.business_address`, and 5 `ui_config` keys (`whatsapp_phone_e164`, `support_phone_display`, `storefront_url`, `brand_gold/_light/_hover`) for both prizma + demo. If event-link generation already routes through `storefront_url` then demo may have a `NULL`/`''`/wrong value; if it bypasses `storefront_url` and uses a hardcoded literal (or a different field), root cause is upstream of that SPEC.
- Lessons applied from prior `FOREMAN_REVIEW.md` files in this module:
  - FROM `M4_HARDCODED_PRIZMA_REMOVAL/FOREMAN_REVIEW.md` Author Proposal 1 → "filesystem path verification": every path this SPEC cites was `ls`-confirmed before draft finalization (see §11).
  - FROM `M4_TENANT_ISOLATION_HARDENING_PART2/FOREMAN_REVIEW.md` Author Proposal 1 → "PUBLIC-inheritance check": NOT APPLICABLE (no GRANT/REVOKE in this SPEC).
  - FROM `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author Proposal 1 → "Shared Edit Block": NOT APPLICABLE (single-row config edit, not multi-file).
- Diagnostic-first structure: this SPEC defers the destructive-op decision (Path A / B / C) to the post-diagnosis escalation point. §7 declares the **envelope of possible** destructive ops; the Executor narrows to actually-used ones in EXECUTION_REPORT.md §Destructive Operations Actually Performed.

### Baselines

No measure-then-bound numeric criteria in this SPEC. Verification is qualitative (URL string matches expected domain). Baselines table omitted.

---

## 1. Goal

Diagnose why opening an event in the demo tenant produces a "registration opened" notification template whose embedded link points to the `opticalis` (platform) domain instead of demo's tenant domain, then fix it at the correct layer so Daniel can run a full manual test cycle on demo. Confirm no regression on Prizma's tenant via read-only inspection.

---

## 2. Background & Motivation

CRM Migration #3 (visual reskin) is PAUSED (Brief §6 decision 2). Daniel's manual test cycle needs a working demo tenant; the corrupted event-link blocks it. Prior SPEC `M4_HARDCODED_PRIZMA_REMOVAL` (2026-05-06) moved most hardcoded Prizma values into `tenants` / `ui_config`, but the event-link flow may still bypass tenant config OR demo's tenant row may be missing the relevant value. Production (Prizma) is live — read-only check is mandatory to prove no regression.

This SPEC is the FIRST exercise of the **Full Auto Pipeline with planned mid-pipeline escalation** — Diagnosis is autonomous, the Path A/B/C decision is delegated to the Architect via a Cowork round-trip (Brief §9).

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command / source |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean | `git status --short` → empty after every commit phase |
| 2 | DIAGNOSIS.md exists | File present in SPEC folder | `ls "modules/Module 4 - CRM/docs/specs/DEMO_HEALTH_CHECK_EVENT_LINK_FIX/DIAGNOSIS.md"` exit 0 |
| 3 | DIAGNOSIS.md content | Contains 6 required sections — template ID + name, link-generator name + path, domain-source mechanism, demo tenant config snapshot, Prizma tenant config snapshot, root cause + Path A/B/C recommendation | grep for headings `## Template`, `## Link Generator`, `## Domain Source`, `## Demo Tenant Config`, `## Prizma Tenant Config`, `## Root Cause` — all 6 present |
| 4 | Escalation file exists | One file in `modules/Module 4 - CRM/escalations/` named `{ISO_TS}_demo_link_root_cause.md` with the Path A/B/C proposal + Architect recommendation | `ls modules/Module 4 - CRM/escalations/*demo_link_root_cause*` exit 0 |
| 5 | Hebrew escalation line emitted | One Hebrew sentence ending with the escalation filename, printed to chat | Verified by the Pipeline's own session transcript |
| 6 | Architect Path Decision received | After Daniel pastes Architect response, decision recorded in escalation file under heading `## Architect Decision` | grep `## Architect Decision` in escalation file → 1 match |
| 7 | Fix applied at the chosen layer | Path A: 1 row in `tenants` for demo (UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`) updated. Path B: EF/RPC code change committed + deployed. Path C: both. | Per-path verification — see §3a |
| 8 | TEST_REPORT.md — demo URL captured | File contains a section `## Demo URL Produced` with the literal URL string produced by the link generator. Domain part contains `demo.opticalis.co.il` (or whatever DIAGNOSIS.md identifies as demo's correct value) and does NOT contain `prizma-optic.co.il` or any other tenant's domain. | grep the URL string against expected domain |
| 9 | TEST_REPORT.md — Prizma URL captured (read-only) | File contains a section `## Prizma URL Produced (Read-Only)` with the URL string the generator WOULD produce for a hypothetical Prizma event. Domain part contains `prizma-optic.co.il`. NO message sent. | grep the URL string against `prizma-optic.co.il` |
| 10 | No outbound message sent | EXECUTION_REPORT.md §Destructive Operations Actually Performed must explicitly state "No outbound SMS/Email/WhatsApp sent during this SPEC." | grep that exact sentence |
| 11 | Prizma `tenants` row untouched | `SELECT id, updated_at FROM tenants WHERE slug='prizma'` — `updated_at` must equal the pre-SPEC snapshot captured in DIAGNOSIS.md §Prizma Tenant Config | Compare before/after timestamps in TEST_REPORT.md |
| 12 | DECISIONS_LOG entry | One new entry appended to `references/DECISIONS_LOG.md` (or the equivalent Architect log, if path differs — to be verified at close) with: root cause one-liner, path chosen, fix applied | `git diff origin/develop..HEAD -- references/DECISIONS_LOG.md` shows 1 new entry |
| 13 | Integrity Gate (Iron Rule 31) | exit 0 or 2 (no null-byte ERROR) | `npm run verify:integrity; echo $?` → `0` or `2` |
| 14 | Smoke suite | 7/7 PASS | `npm run smoke` → `7/7 PASS` |
| 15 | Working tree clean | No staged or unstaged changes after final commit | `git status --short` → empty |
| 16 | Pushed to origin/develop (NOT main) | HEAD on `origin/develop`; no commits on `main` since pre-SPEC | `git log origin/develop..HEAD` empty after push; `git log origin/main..origin/develop` shows the new commits |
| 17 | EXECUTION_REPORT.md + FINDINGS.md | Both files in SPEC folder | `ls` both files → exit 0 |

### 3a. Path-Specific Verification Details

- **Path A (tenant config UPDATE only):** Criterion 7 becomes — a single SQL `UPDATE tenants SET <field> = '<value>' WHERE id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'` ran exactly once, scoped, returning `1 row updated`. No other row touched.
- **Path B (code change only):** Criterion 7 becomes — git diff shows a code change in the file identified by DIAGNOSIS.md §Link Generator, committed with a `fix(crm):` or `fix(m4):` prefix. If it's an Edge Function, also: deployed to Supabase and verified live via a function-version bump.
- **Path C (both):** Both A and B verifications.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in the repo.
- Run read-only SQL (Level 1) — including SELECTs against `tenants`, `crm_message_templates`, `crm_events`, `crm_event_attendees`, `ui_config`, `pg_proc`, `pg_views`.
- Inspect Edge Function source under `supabase/functions/`.
- Write DIAGNOSIS.md to the SPEC folder.
- Write the escalation file to `modules/Module 4 - CRM/escalations/`.
- Emit the Hebrew escalation line and PAUSE the pipeline.
- After Daniel pastes the Architect Decision back: resume — apply the chosen Path's fix per §4.1.
- Commit and push to `develop`.
- Run `npm run verify:integrity`, `npm run smoke`, `git status`, `git log`.

### What REQUIRES stopping and reporting (in addition to CLAUDE.md §9)

- Any UPDATE on Prizma's `tenants` row (slug `prizma`, or NOT `slug='demo'`) — **STOP, this is a hard line**.
- Any DELETE on any table.
- Any `ALTER TABLE`, `ADD COLUMN`, `DROP COLUMN`, or other DDL.
- Any actual outbound message (the verification must inspect the URL STRING the generator produces — NOT trigger a real send).
- Any merge to `main`. Any `--force` git operation.
- If diagnosis reveals that the link generator lives outside Modules 4 / 3 / 1.5 / shared (e.g., inside a Make scenario only) — STOP + escalate; this SPEC's autonomy doesn't authorize Make scenario edits.

### 4.1 Resume Behavior After Architect Decision

When Daniel pastes the Architect's response into the chat, the response MUST contain a line matching the regex `Path:\s*[ABC]\b` (case-insensitive). The Executor:

1. Parses the chosen path letter.
2. Records it in the escalation file under `## Architect Decision`.
3. If Path A → executes the single-row UPDATE on demo's tenants row per DIAGNOSIS.md §Root Cause's recommended field + value.
4. If Path B → applies the code change at the file identified in DIAGNOSIS.md §Link Generator, commits, and (if EF) deploys.
5. If Path C → both, in order: tenant config first (cheap, reversible), then code change.

If the Architect's response does NOT contain a parseable Path letter → STOP + ask once for clarification + wait again.

---

## 5. Stop-on-Deviation Triggers (additions to CLAUDE.md §9)

- If diagnosis cannot identify the template within 3 distinct SELECT attempts → STOP, document the queries tried, escalate.
- If demo's tenants row OR Prizma's tenants row cannot be SELECTed → STOP (probably RLS / credentials problem, not a config problem).
- If the link generator turns out to be in a Make scenario only (no Supabase / repo code path) → STOP, this SPEC doesn't cover Make.
- If Architect's response is unclear or contradicts the Brief's locked decisions → STOP + ask Daniel for one more round-trip; do NOT proceed on judgment alone.
- If `npm run smoke` regresses (was passing, now failing) AFTER the fix → STOP, the fix introduced a regression — rollback per §6 and re-escalate.
- If after Path B's deploy the Prizma URL changes from `prizma-optic.co.il` to anything else → STOP, regression, rollback the code change immediately.

---

## 6. Rollback Plan

Pre-SPEC commit captured as `START_COMMIT` (the executor will git tag this in Step 0 of execution).

- **Code-only rollback (Path B/C):** `git reset --hard {START_COMMIT}` then `git push --force-with-lease origin develop` — **NOTE:** force-with-lease requires explicit Daniel approval per Iron Rule list and CLAUDE.md §9. If force-with-lease is denied: revert via `git revert {commit-hash}` instead.
- **Tenant-config rollback (Path A/C):** the executor captures the pre-UPDATE value of the affected field(s) in DIAGNOSIS.md §Demo Tenant Config BEFORE applying. To roll back: a second UPDATE restoring the captured value. Single-row, scoped, reversible.
- **EF rollback (Path B/C):** Supabase EF redeploy of the prior version. Version number captured pre-fix.
- **Notify Foreman; SPEC is marked REOPEN, not CLOSED.**

---

## 7. Destructive Operations

The actual destructive op for this SPEC is **path-conditional**. The envelope of possibilities authorized by this SPEC is listed below; the Executor MUST update EXECUTION_REPORT.md §Destructive Operations Actually Performed with the subset actually used.

**Authorized envelope (only these — anything else is a STOP event):**

1. **Path A or C:** ONE single-row UPDATE on `tenants` table, WHERE clause `id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'` (demo UUID) — affecting one or more tenant-config columns identified by DIAGNOSIS.md. Single row, scoped, reversible via captured prior value.
2. **Path B or C:** Code changes in repo files (Edge Function, RPC, client JS) — committed to `develop` only, never to `main`. Edge Function redeploys via Supabase MCP `deploy_edge_function` if applicable.
3. **Path B or C (DB-side code):** ONE `CREATE OR REPLACE FUNCTION` for an existing RPC if the link generation lives in an RPC (idempotent, non-destructive — but listed here for completeness).

**Forbidden (any of these → STOP):**

- ANY UPDATE on Prizma's `tenants` row.
- ANY UPDATE on `tenants` rows other than demo's.
- ANY DELETE on any table.
- Any DDL: `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`, `ADD COLUMN`, `DROP COLUMN`, schema migrations.
- Any `TRUNCATE` or untenanted DELETE.
- Any actual SMS / Email / WhatsApp / outbound message during testing.
- Any merge to `main` branch.
- Any force-push without Daniel's explicit per-event approval.
- Any deletion from CLAUDE.md, SKILL.md, or governance docs.

---

## 8. Out of Scope (explicit)

- CRM Migration #3 (visual reskin) — paused, will resume after this SPEC closes.
- Changes to Prizma's `tenants` row.
- Schema changes (any DDL).
- Building new templates (only fixing the link in existing template).
- Whitelist work — Daniel's whitelist question is moot if demo is fixed and all tests run on demo (Brief §5).
- Multi-tenant URL strategy generalization (TD F1+F2 from QUICK_REGISTER_QR_FLOW — separate future SPEC if needed).
- Any work on M3 (storefront) repo — diagnosis is read-only across all repos; fix is in ERP repo only.

---

## 9. Expected Final State

After the executor finishes, the repo should contain:

### New files

- `modules/Module 4 - CRM/docs/specs/DEMO_HEALTH_CHECK_EVENT_LINK_FIX/DIAGNOSIS.md`
- `modules/Module 4 - CRM/docs/specs/DEMO_HEALTH_CHECK_EVENT_LINK_FIX/TEST_REPORT.md`
- `modules/Module 4 - CRM/docs/specs/DEMO_HEALTH_CHECK_EVENT_LINK_FIX/EXECUTION_REPORT.md`
- `modules/Module 4 - CRM/docs/specs/DEMO_HEALTH_CHECK_EVENT_LINK_FIX/FINDINGS.md`
- `modules/Module 4 - CRM/escalations/{ISO_TS}_demo_link_root_cause.md` (one file; ISO_TS is the diagnosis timestamp; written before the pipeline pauses, updated by the executor with `## Architect Decision` heading after Daniel pastes back)
- (Foreman writes at close): `modules/Module 4 - CRM/docs/specs/DEMO_HEALTH_CHECK_EVENT_LINK_FIX/FOREMAN_REVIEW.md`

### Modified files (path-dependent)

- **Path A or C:** None in repo (DB-only change). Tenant config snapshot of the change captured in DIAGNOSIS.md and TEST_REPORT.md.
- **Path B or C:** One or more of: `supabase/functions/<ef-name>/index.ts`, `supabase/functions/_shared/tenant-config.ts`, an RPC's SQL definition (recorded in DIAGNOSIS.md and committed if applicable), or a client-side JS file in `modules/crm/`.
- `references/DECISIONS_LOG.md` (or `modules/Module 4 - CRM/docs/DECISIONS_LOG.md` if the canonical log is module-local — Executor must locate at run time): one appended entry.

### Deleted files

None.

### DB state

- **Path A or C:** demo's `tenants` row has its `<identified-field>` updated to the correct value. Row count of `tenants` unchanged. Prizma's row unchanged.
- **Path B:** no DB state change. Path B fix-via-code may also change which `tenants` field the generator reads from — that is itself a code change, not a DB change.

### Docs updated

- Module 4 SESSION_CONTEXT.md — one-line entry referencing this SPEC's close.
- DECISIONS_LOG entry per criterion 12.
- No GLOBAL_MAP / GLOBAL_SCHEMA merge unless Path B adds a brand-new function (unlikely — most likely it's an edit to an existing one).

---

## 10. Commit Plan

This SPEC has a 2-stage commit shape because of the planned escalation. Commits are produced by the Executor:

- **Commit 1** (at end of diagnosis, BEFORE escalation): `docs(spec): DEMO_HEALTH_CHECK_EVENT_LINK_FIX — diagnosis + escalation` — adds SPEC.md (this file), DIAGNOSIS.md, and the escalation file.
- **Commit 2** (after Architect decision, fix applied — path-dependent):
  - Path A: `fix(crm): demo tenant config — set <field> for event-link generation`
  - Path B: `fix(crm): event-link generator — <one-line root-cause description>` (could be EF, RPC, or client)
  - Path C: split into 2 commits — first the tenant config (cheap, isolated), then the code change.
- **Commit 3** (verification + closure deliverables): `chore(spec): close DEMO_HEALTH_CHECK_EVENT_LINK_FIX with TEST_REPORT + EXECUTION_REPORT + FINDINGS` — adds TEST_REPORT.md, EXECUTION_REPORT.md, FINDINGS.md, and a one-line SESSION_CONTEXT update + DECISIONS_LOG entry.
- **Commit 4** (written by Foreman after executor closes): `chore(spec): DEMO_HEALTH_CHECK_EVENT_LINK_FIX foreman review` — adds FOREMAN_REVIEW.md.

All commits target `develop`. No merge to `main` by this SPEC.

---

## 11. Dependencies / Preconditions

- Supabase MCP available with `execute_sql` (Level 1 read) — required for diagnosis queries on `tenants`, `crm_message_templates`, `pg_proc`, `pg_views`.
- Supabase MCP `deploy_edge_function` available IF Path B applies and the layer is an EF. If MCP fails (recurring `OPEN-021` 5xx pattern from prior M4 SPECs), Daniel's local CLI is the documented fallback — escalate that explicitly.
- `npm run verify:integrity` and `npm run smoke` available locally.
- Integrity Gate at session start exit 0 — **already verified at SPEC-authoring time** (`All clear — 24 files scanned in 3ms`).
- Branch `develop`, repo `opticalis/opticup` — verified at session start.
- Daniel available for ONE round-trip via Cowork to fetch the Architect's Path decision.

---

## 12. Lessons Already Incorporated

- FROM `M4_HARDCODED_PRIZMA_REMOVAL/FOREMAN_REVIEW.md` Author Proposal 1 → "filesystem-path verification": every file path cited in this SPEC was checked. `supabase/functions/_shared/tenant-config.ts` confirmed by prior SPEC's documentation; runtime path verification is part of diagnosis Step 2 (the Executor MUST `ls` / Glob before assuming where the generator lives). **Applied via the explicit Stop-Trigger in §5 — "if the link generator is in Make-only, STOP".**
- FROM `M4_HARDCODED_PRIZMA_REMOVAL/FOREMAN_REVIEW.md` Author Proposal 2 → "preview vs customer-facing in threat models": NOT APPLICABLE (this SPEC's fix surface is internal config, not customer-facing security boundary).
- FROM `M4_TENANT_ISOLATION_HARDENING_PART2/FOREMAN_REVIEW.md` Author Proposal 1 → "PUBLIC-inheritance check": NOT APPLICABLE (no function permission changes).
- FROM `M4_TENANT_ISOLATION_HARDENING_PART2/FOREMAN_REVIEW.md` Author Proposal 2 → "SQL matrix as sanctioned UI-walk substitute": APPLIED — verification of "Prizma URL still correct" is via SELECTing what the generator WOULD produce, not via Chrome MCP UI walk-through.
- FROM `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal 1 → "no `§` prefix in headings": APPLIED — all headings use `## N. Title` form.
- FROM `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal 2 → "§Destructive Operations declared by Iron Rule 32": APPLIED — see §6.5; envelope listed, with Executor's narrowed actual-ops to be recorded in EXECUTION_REPORT.
- FROM `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author Proposal 1 → "Shared Edit Block for multi-file identical edits": NOT APPLICABLE (this SPEC is at most a 1–2 file edit).
- FROM `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author Proposal 2 → "Baselines pinned in §0": INTENTIONALLY OMITTED — this SPEC's success criteria are qualitative URL-domain matches, not numeric thresholds; no symbol-pinning needed.

### Cross-Reference Check (Step 1.5 sweep, completed 2026-05-11)

This SPEC introduces ZERO new DB objects, ZERO new functions, ZERO new files in `js/shared.js` / `FIELD_MAP`. It edits one DB row OR one existing function. So the sweep is shallow:

- New filenames introduced: 4 SPEC deliverables (DIAGNOSIS.md, TEST_REPORT.md, EXECUTION_REPORT.md, FINDINGS.md, FOREMAN_REVIEW.md) — all scoped inside the SPEC folder, by convention unique.
- New escalation file: `modules/Module 4 - CRM/escalations/{ISO_TS}_demo_link_root_cause.md`. Verified that `modules/Module 4 - CRM/escalations/` is either empty or non-existent today — Executor MUST create the directory if absent (Iron-Rule-21 collision check: 0 hits).
- No new SQL identifiers introduced.
- No new T-constants / FIELD_MAP / ui_config keys (Path A operates on whichever existing key the diagnosis identifies — possibly `storefront_url` or a column like `tenants.custom_domain`).

**Sweep result:** 0 collisions, 0 hits requiring resolution.

---

## 13. Pre-Merge Checklist

Every SPEC must pass these items before the executor closes it. Any item failing → SPEC is REOPEN, not CLOSED.

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2. A null-byte ERROR (exit 1) anywhere in HEAD blocks closure.
- [ ] **Smoke (criterion 14):** `npm run smoke` 7/7 PASS.
- [ ] `git status --short` returns empty (clean tree).
- [ ] HEAD pushed to `origin/develop`. No commits on `main` since pre-SPEC.
- [ ] DIAGNOSIS.md + TEST_REPORT.md + EXECUTION_REPORT.md + FINDINGS.md all written in the SPEC folder.
- [ ] Escalation file present with `## Architect Decision` heading containing the parsed Path letter.
- [ ] DECISIONS_LOG entry written.
- [ ] Module 4 SESSION_CONTEXT.md updated with one-line entry for this SPEC.
- [ ] No outbound message sent during this SPEC (criterion 10).
- [ ] No Prizma `tenants` row write (criterion 11).

---

## 14. Notes for the Executor — Operational

This SPEC has a built-in PAUSE — it is intentional. After writing DIAGNOSIS.md + the escalation file + emitting the Hebrew line, **STOP and wait for Daniel to paste the Architect's response** containing `Path: A` or `Path: B` or `Path: C`. Do not retry, do not continue, do not invent a path. The pause is the design.

When Daniel pastes the response, parse it for the `Path:` line, record it in the escalation file, and resume per §4.1. If the response is missing or unparseable, ask once for clarification and wait again.

The Hebrew escalation line MUST be exactly:
```
🛑 אבחון הושלם — דורש החלטה אסטרטגית של הארכיטקט. קובץ: <escalation-file-path>
```

After the SPEC closes, the Foreman (this skill, returning) writes FOREMAN_REVIEW.md per the post-execution review protocol, including 2 author-skill + 2 executor-skill improvement proposals, and emits the closing Hebrew summary line per the Brief.
