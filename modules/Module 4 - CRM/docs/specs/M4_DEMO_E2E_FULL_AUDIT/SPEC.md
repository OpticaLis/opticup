# SPEC — M4_DEMO_E2E_FULL_AUDIT

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_DEMO_E2E_FULL_AUDIT/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, Full-Auto Pipeline mode)
> **Authored on:** 2026-05-11
> **Module:** 4 — CRM (cross-module: M3 Storefront, M12 Communications)
> **Source Brief:** `modules/Module 4 - CRM/architecture-brief/DEMO_E2E_FULL_AUDIT_BRIEF.md`
> **Author signature:** Full-Auto Pipeline, 2026-05-11 overnight session

---

## 0. Pre-Authoring Reality Check

- Brief read in full on 2026-05-11.
- Codepath verified against live demo DB:
  - Bug §3 root cause located in `crm_automation_rules` rows `a06be5d8` + `ee0a6f24` (both: `recipient_type='cross_event_active_waitlist'` + `post_action_attendee_upsert={status:'invited'}`).
  - Auto-attach mechanism is in `supabase/functions/automation-engine/post-actions.ts:attendeeUpsert` — gated entirely on the presence of `action_config.post_action_attendee_upsert.status`.
  - `crm_leads.status='waitlist'` exists in demo `crm_statuses` (`entity_type='lead'`, `name_he='רשימת המתנה'`).
  - Resolver `leads_by_status` exists in both `modules/crm/crm-automation-recipient-resolvers.js` and `supabase/functions/automation-engine/recipients.ts` and accepts `recipient_status_filter` array — no code change needed.
- Brief §3.1's claim "filter must reference crm_leads.status='רשימת המתנה'" is correct and matches the existing `leads_by_status` resolver branch.
- Brief §3.2's claim "remove auto-attach side-effect" is correct — fix is removing `post_action_attendee_upsert` from action_config on the 2 rules above.
- Lessons applied from prior FOREMAN_REVIEWs in this module:
  - **From `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #1**: Headings use plain `## N.` not `## §N.` (Rule 32 hook regex requires this).
  - **From `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author Proposals #1 + #2**: Pin baselines symbolically; if multi-file identical edits, use §3a Shared Edit Block.
  - **Cross-Reference Check (Rule 21 enforcement at author time):** No new DB objects / functions / files created. Only existing rule rows are UPDATEd. Resolver `leads_by_status` already exists in both browser and EF code paths. 0 collisions / 0 new names introduced.

### Baselines (pinned at SPEC-authoring time, 2026-05-11)

| Symbol | Value | Source |
|---|---|---|
| `RULE_REGOPEN_ID` | `a06be5d8-4dd6-43fa-bb53-b0e3be07a548` | crm_automation_rules row for "אירוע פתח להרשמה - הזמנת רשימת המתנה" |
| `RULE_INVITEWL_ID` | `ee0a6f24-1a3e-43f4-9ea6-fc4c1d081787` | crm_automation_rules row for "שינוי סטטוס: הזמנה ממתינים" |
| `DEMO_TENANT_ID` | `8d8cfa7e-ef58-49af-9702-a862d459cccb` | tenants.slug='demo' |
| `WHITELIST_PHONES` | `0537889878`, `0503348349`, `0507168471` | Brief §2 |
| `WHITELIST_EMAILS` | `danylis92@gmail.com`, `daniel@prizma-optic.co.il`, `alkimovich94@gmail.com` | Brief §2 |
| `LEAD_WAITLIST_SLUG` | `waitlist` | crm_statuses entity_type='lead' name_he='רשימת המתנה' |

---

## 1. Goal

Run an autonomous overnight audit + fix-as-you-go pass on demo tenant. Fix the confirmed Bug §3 (audience filter + auto-attach side-effect on the `event_invite_waiting_list` flow), then exercise Blocks A–G end-to-end against the demo tenant. Produce `AUDIT_REPORT.md` as the morning deliverable Daniel reads.

---

## 2. Background & Motivation

Daniel observed on 2026-05-11 that opening a new test event on demo causes phantom "הוזמן" attendees to appear in the new event before any user clicks the registration link — preempting capacity. Investigation revealed two intertwined bugs in two automation rules. The fix is data-only on these 2 rule rows; no schema change, no EF redeploy.

This SPEC also authorizes a downstream sweep across Lead Lifecycle, Event Lifecycle, Messaging, Storefront, UI, Edge Cases, and Data Integrity scenarios — fix-as-you-go on demo, no Prizma writes, whitelist enforced.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state at end | On `develop`, clean | `git status` → "nothing to commit" |
| 2 | Rule `RULE_REGOPEN_ID` action_config | `recipient_type='leads_by_status'` + `recipient_status_filter=['waitlist']` + NO `post_action_attendee_upsert` key | SQL query in §3.A |
| 3 | Rule `RULE_INVITEWL_ID` action_config | same as #2 | SQL query in §3.A |
| 4 | Other rules unchanged | rule `82aac348` (event_invite_new) STILL has `post_action_attendee_upsert={status:'invited'}` | SQL query in §3.A |
| 5 | Visual Chrome verification | A fresh demo test event with max_attendees=1 transitions to `registration_open` and shows **0 attendees** afterward (no auto-attach), AND a separate test lead with `crm_leads.status='waitlist'` was sent the invite | Chrome screenshots in AUDIT_REPORT.md |
| 6 | Test artifacts cleanup | All Pipeline-created leads/events soft-deleted (is_deleted=true) | SQL count in TEST_ARTIFACTS_LOG.md |
| 7 | Prizma untouched | `SELECT count(*),max(updated_at) FROM crm_leads WHERE tenant_id=prizma_tenant_id` unchanged across run | snapshot diff in AUDIT_REPORT.md |
| 8 | Integrity Gate (Iron Rule 31) | exit 0 or 2 | `npm run verify:integrity; echo $?` |
| 9 | AUDIT_REPORT.md present | exists with sections per Brief §6 | `ls` |
| 10 | COMMITS_LIST.md present | one line per commit | `ls` |
| 11 | TEST_ARTIFACTS_LOG.md present | every lead+event id | `ls` |
| 12 | Standard reports | EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md | `ls` |
| 13 | Working tree pushed | `git status` clean, HEAD == origin/develop | `git status -sb` |

### 3.A Verification SQL

```sql
SELECT id, name,
       action_config->>'recipient_type' AS recipient_type,
       action_config->'recipient_status_filter' AS recipient_status_filter,
       action_config ? 'post_action_attendee_upsert' AS has_upsert_key
FROM crm_automation_rules
WHERE id IN (
  'a06be5d8-4dd6-43fa-bb53-b0e3be07a548',
  'ee0a6f24-1a3e-43f4-9ea6-fc4c1d081787',
  '82aac348-2c92-4479-8821-73a2842cfb07'
);
```

Expected:
- `a06be5d8`: recipient_type=`leads_by_status`, filter=`["waitlist"]`, has_upsert_key=`false`
- `ee0a6f24`: same as above
- `82aac348`: recipient_type=`tier2_excl_registered`, filter=`null`, has_upsert_key=`true` (UNCHANGED — Rule 2.2 legitimate auto-attach)

---

## 4. Autonomy Envelope

### What the Pipeline CAN do without asking
- Read any file, run read-only SQL on demo + Prizma (Level 1)
- UPDATE `crm_automation_rules` action_config on demo for the 2 specific rule ids
- INSERT test leads + events on demo with whitelisted contacts
- UPDATE demo rows for bugs found during Block A-G sweep
- Soft-DELETE (is_deleted=true) on Pipeline-created test artifacts
- Use Chrome MCP for visual verification
- Run any verify scripts; npm scripts; commit + push to develop
- Apply executor-skill improvements from recent FOREMAN_REVIEWs if directly applicable
- Stop at end-of-block to write intermediate progress to AUDIT_REPORT.md, then continue

### What REQUIRES stopping
- ANY write attempt to Prizma scope (`tenant_id != demo`) → STOP + escalate (Brief §10 anti-pattern)
- Schema change (ALTER, ADD/DROP COLUMN, CREATE TABLE) → STOP + log to FINDINGS as needs-Architect
- Merge to main → forbidden, never attempted
- Sending message to non-whitelisted contact → drop + log to FINDINGS
- Pre-commit gate failing 3 times consecutively → STOP
- Iron Rule 31 (null bytes) or Rule 32 (destructive ops) violation → STOP

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If verification SQL §3.A returns unexpected values after fix → STOP, do not proceed to Block A-G sweep, log to FINDINGS.
- If Chrome MCP cannot reach `app.opticalis.co.il` on 3 retries → log as known-issue and continue with SQL-only verification (do NOT block the run).
- If demo's `tenants` row is touched in any UPDATE → STOP, this is identity table, forbidden.
- If a Pipeline-created lead/event accidentally bears `tenant_id` ≠ demo → STOP, catastrophic regression.

---

## 6. Rollback Plan

Pre-run snapshot of the 2 affected rule rows is captured in `M4_DEMO_E2E_FULL_AUDIT/PRE_FIX_RULE_SNAPSHOT.json` (created by Step 1 below). If the fix needs rollback:

```sql
UPDATE crm_automation_rules SET action_config = $PRE_FIX::jsonb
WHERE id = 'a06be5d8-4dd6-43fa-bb53-b0e3be07a548';
UPDATE crm_automation_rules SET action_config = $PRE_FIX::jsonb
WHERE id = 'ee0a6f24-1a3e-43f4-9ea6-fc4c1d081787';
```

No file-level rollback required — all code changes (if any) are localized to fresh commits on develop and can be reverted via `git revert <hash>`.

---

## 7. Destructive Operations

This SPEC authorizes the following destructive operations:

1. **UPDATE 2 specific rows** in `crm_automation_rules` (rule ids `a06be5d8` + `ee0a6f24`) on demo tenant only — rewriting the `action_config` JSONB.
2. **Soft-DELETE (UPDATE is_deleted=true)** on test leads + test events created BY THIS PIPELINE on demo tenant only. Tracked by id in `TEST_ARTIFACTS_LOG.md`.
3. **UPDATE additional demo rows** (status changes on test leads/events, automation rule edits if Block sweep finds more bugs) — all writes scoped to `tenant_id = demo`.

Explicitly NOT authorized (forbidden — STOP if needed):
- Hard `DELETE` anywhere.
- Any write to Prizma tenant scope.
- Schema DDL (`ALTER TABLE`, `DROP COLUMN`, `CREATE TABLE`).
- `git rebase`, `git reset --hard`, `git push --force`, merge to main.
- Sending messages to non-whitelisted phones/emails.
- Disabling test_mode allowlists.
- Modification of governance files (CLAUDE.md, SKILL.md) outside append-only updates.

Rationale: per Brief §8 the Pipeline operates under a tight envelope. The destructive ops here are bounded to demo tenant data writes.

---

## 8. Out of Scope

- Prizma tenant (read-only, hash-verified bit-identical at end).
- Schema changes — any need for one → log to FINDINGS, do not apply.
- Other modules' automation rules unrelated to Bug §3 (only touched if discovered during Block A–G sweep).
- The browser-side `crm-automation-recipient-resolvers.js` code (no changes — `leads_by_status` branch already supports the new config).
- The EF `automation-engine/recipients.ts` code (no changes — `leads_by_status` branch already exists).
- Rule `82aac348` (event_invite_new) — its auto-attach is intentional (Rule 2.2). Out of scope.

---

## 9. Expected Final State

### New files (in SPEC folder)
- `AUDIT_REPORT.md` — primary morning deliverable
- `COMMITS_LIST.md` — one line per commit
- `TEST_ARTIFACTS_LOG.md` — every lead+event id
- `PRE_FIX_RULE_SNAPSHOT.json` — pre-state of 2 rule rows for rollback
- `EXECUTION_REPORT.md` — Pipeline's retrospective
- `FINDINGS.md` — bugs found, 3-bucket classified
- `FOREMAN_REVIEW.md` — Foreman's post-execution review

### Modified files (if Blocks A-G uncover code bugs)
- Path + line range + description per file. None expected for Bug §3 (data-only fix).

### Deleted files
- None.

### DB state on demo
- `crm_automation_rules.a06be5d8`: `recipient_type='leads_by_status'`, `recipient_status_filter=['waitlist']`, no `post_action_attendee_upsert`.
- `crm_automation_rules.ee0a6f24`: same as above.
- `crm_automation_rules.82aac348`: unchanged.
- All Pipeline-created test leads + test events: `is_deleted=true`.
- No other DB writes outside demo tenant scope.

### DB state on Prizma
- Bit-identical to start. Hash-verified.

### Docs updated
- `MASTER_ROADMAP.md` — entry added under "Recent Activity" if applicable.
- Module 4 `CHANGELOG.md` — Pipeline run entry with commit hashes.
- Module 4 `SESSION_CONTEXT.md` — current-status line updated.

---

## 10. Commit Plan

- **Commit 1**: `docs(spec): author M4_DEMO_E2E_FULL_AUDIT SPEC + pre-fix rule snapshot`
- **Commit 2**: `fix(crm): remove auto-attach + redirect audience to crm_leads.status='waitlist' on 2 event-invite-waiting-list rules` — includes SQL applied note in commit body
- **Commit 3**: `docs(spec): Pipeline run mid-progress — Bug §3 fixed, Chrome MCP visual verification captured`
- **Commit 4**: `docs(spec): Pipeline run final — Blocks A-G results + AUDIT_REPORT.md`
- **Commit 5**: `chore(spec): close M4_DEMO_E2E_FULL_AUDIT 🟢 + FOREMAN_REVIEW + module CHANGELOG`

Commit messages: English, present-tense verb, scoped. Pre-commit gates must pass (Iron Rule 31 + 32). Push after each commit (Daniel may wake up early).

---

## 11. Dependencies / Preconditions

- Branch `develop` is on `origin/develop` HEAD at session start (✓ confirmed: `cbbb9e7`).
- Supabase MCP write access to `tsxrrxzmdxaenlvocyit` (demo+Prizma share one DB, isolated by tenant_id).
- Demo allowlists already configured (`test_mode_sms_allowlist`, `test_mode_email_allowlist`) per predecessor SPECs.
- `crm_leads.status` enum includes `'waitlist'` (✓ confirmed in `crm_statuses`).
- Resolver `leads_by_status` exists in both browser + EF code paths (✓ confirmed).
- Chrome MCP available for visual verification.

### Browser readiness pre-flight

Brief §4 Block E6 names Chrome MCP visual verification. Pipeline will attempt to connect to demo CRM via `mcp__chrome-devtools__*` tools. If Chrome MCP returns an error on first 3 retries, log to FINDINGS as `🟡 Chrome verification skipped — SQL verification sufficient for §3 fix` and continue with SQL-only verification of Bug §3.

---

## 12. Lessons Already Incorporated

- FROM `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #1 → Plain `## N.` headings, not `## §N.` → APPLIED throughout (Rule 32 hook compatibility).
- FROM `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author Proposal #2 → Pin baselines symbolically → APPLIED in §0 Baselines.
- FROM `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author Proposal #1 → §3a Shared Edit Block for N>1 identical edits → NOT APPLICABLE (the 2 rule updates are SQL config writes, not file edits; the 2 are byte-equivalent so I declare the JSONB target once below as a Shared SQL Edit Block).
- FROM `M3_REC014_ORPHAN_CLEANUP/FOREMAN_REVIEW.md` → Already-done discovery contingency → NOT APPLICABLE.
- FROM `M3_SITEMAP_BRAND_404_CLEANUP/FOREMAN_REVIEW.md` → Subset relationships note in §7 → NOT APPLICABLE.

### Shared SQL Edit Block — Bug §3 Fix

Both rule `a06be5d8` and rule `ee0a6f24` receive the same JSONB rewrite. Reviewer can verify this block ONCE and check both UPDATEs against it.

**New `action_config` template** (byte-equivalent across both rules apart from `language` field on a06be5d8 which is preserved):

```jsonc
// For a06be5d8 (preserves "language": "he"):
{
  "channels": ["sms", "email"],
  "language": "he",
  "template_slug": "event_invite_waiting_list",
  "recipient_type": "leads_by_status",
  "recipient_status_filter": ["waitlist"]
}

// For ee0a6f24 (no "language" key in pre-state, none in post-state):
{
  "channels": ["sms", "email"],
  "template_slug": "event_invite_waiting_list",
  "recipient_type": "leads_by_status",
  "recipient_status_filter": ["waitlist"]
}
```

Both rules: `post_action_attendee_upsert` key **removed** (not set to null — fully removed).

---

## 13. Pre-Merge Checklist

- [ ] §3 success criteria pass with actual values captured in EXECUTION_REPORT.md.
- [ ] Integrity Gate (`npm run verify:integrity`) returns exit 0 or 2.
- [ ] `git status --short` returns empty.
- [ ] HEAD pushed to `origin/develop`.
- [ ] AUDIT_REPORT.md + COMMITS_LIST.md + TEST_ARTIFACTS_LOG.md + EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md all present in SPEC folder.
- [ ] Pre-fix and post-fix rule action_config JSON captured in PRE_FIX_RULE_SNAPSHOT.json + AUDIT_REPORT.md respectively.
- [ ] Prizma data hash unchanged.
- [ ] All Pipeline-created test artifacts soft-deleted.
- [ ] Module 4 CHANGELOG.md updated.

---

*End of SPEC.*
