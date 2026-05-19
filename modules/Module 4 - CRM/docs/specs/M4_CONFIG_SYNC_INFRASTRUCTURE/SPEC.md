# SPEC — M4_CONFIG_SYNC_INFRASTRUCTURE

**Brief:** `modules/Module 4 - CRM/architecture-brief/M4_CONFIG_SYNC_INFRASTRUCTURE_BRIEF.md`
**Authored:** 2026-05-19 (overnight chain, Pipeline lock `M4_OVERNIGHT_REPAIR_2026_05_18_overnight-2026-05-19`)
**Mode:** Full-Auto Pipeline. Linear. Foreman → Executor → Reviewer → Localhost-Tester (skipped — no runtime UI per Brief §6) → Foreman close.
**Scope:** Build sync infrastructure ONLY. No row in any DB is mutated by this SPEC's execution.

---

## 1. Goal

Ship two Node scripts (`sync-prizma-config-to-demo.mjs` + `promote-config-to-prizma.mjs`), one allowlist JSON, one Sentinel Mission 11 doc, Iron Rule 33 in CLAUDE.md, and the `docs/FILE_STRUCTURE.md` registration. After this SPEC closes, the M4 config-parity discipline (Iron Rule 33) is enforceable in subsequent SPECs.

## 2. Scope

### 2.1 In-scope (files created or modified)

| Path | Action | Notes |
|------|--------|-------|
| `scripts/sync-prizma-config-to-demo.mjs` | CREATE | Prizma → demo direction. Flags: `--dry-run`, `--allow-destructive`, `--confirm-destructive=YES-I-READ-THE-DIFF` (master prompt overlay for SPEC 2 non-interactive run), `--table=<name>`. |
| `scripts/promote-config-to-prizma.mjs` | CREATE | Demo → Prizma direction. Required flag: `--slug` or `--rule-name` or `--status`. Writes audit row. |
| `scripts/checks/demo-config-allowlist.json` | CREATE | 6 template slugs + Foreman-enumerated automation rule names. |
| `docs/guardian/sentinel/mission-11-config-parity.md` | CREATE | Sentinel mission doc. Mission script itself is out of scope for this SPEC (the doc establishes the protocol; implementation is a separate Sentinel SPEC). |
| `CLAUDE.md` | APPEND | Add Iron Rule 33 in §6. |
| `docs/FILE_STRUCTURE.md` | APPEND | Register the 4 new files. |
| `tests/smoke/sync-script-test.mjs` | CREATE (deferred to FOREMAN_REVIEW if scope tightens) | Regression test simulating drift + asserting diff output. |

### 2.2 Out-of-scope

- Running the sync (that's SPEC 2 = `M4_CONFIG_PARITY_RUN_1`).
- Implementing the actual Sentinel Mission 11 scan script (separate SPEC).
- Behavioral data sync.
- `tenants.ui_config` sync.

## 3. Steps

### Step 1 — Author `scripts/sync-prizma-config-to-demo.mjs`

Structure:

```js
#!/usr/bin/env node
// scripts/sync-prizma-config-to-demo.mjs
// Copies M4 config tables from Prizma → demo. Read CLAUDE.md Iron Rule 33 before editing.
//
// Tables: crm_message_templates, crm_automation_rules, crm_statuses, crm_field_visibility, crm_tags.
// Flags:
//   --dry-run                              Print diff; do not apply.
//   --allow-destructive                    Allow DELETE of demo-only rows not on allowlist.
//   --confirm-destructive=YES-I-READ-THE-DIFF   Non-interactive confirm (for overnight Pipeline).
//   --table=<name>                         Sync a single table.
//   --diff-out=<path>                      Append diff to a file (used by SPEC 2 for audit).
//
// Default: dry-run. Without --allow-destructive, no DELETE is performed (only UPSERT).
// Interactive: if not --confirm-destructive flag, prompts for "Type 'YES SYNC'" on TTY.
//
// Tenants:
//   - Prizma: 6ad0781b-37f0-47a9-92e3-be9ed1477e1c
//   - Demo:   8d8cfa7e-ef58-49af-9702-a862d459cccb
//
// Allowlist: scripts/checks/demo-config-allowlist.json — rows present in demo only and authorized to keep.
```

Logic:
1. Parse args.
2. Read credentials from `$HOME/.optic-up/credentials.env`.
3. Load allowlist JSON.
4. For each table in scope (filtered by `--table` if set):
   - SELECT all Prizma rows via REST + service role.
   - SELECT all demo rows.
   - Build maps by natural key (templates → slug, automation_rules → name, statuses → entity_type+slug, field_visibility → role_id+entity_type+field_key, tags → name).
   - Diff: insert/update/delete categories. Md5 of normalized JSON for content compare.
   - Print diff in Hebrew + English.
   - If `--diff-out` set: append to file.
5. Confirm:
   - `--confirm-destructive=YES-I-READ-THE-DIFF`: skip interactive prompt; treat as YES.
   - Else if TTY: prompt for `YES SYNC`.
   - Else (non-TTY without flag): exit 1 with message "Refusing to apply non-interactively without --confirm-destructive flag."
6. On confirm (and not `--dry-run`): apply changes per row:
   - INSERT new rows with new UUID, tenant_id=demo.
   - UPDATE existing rows by id, copying Prizma's content but preserving demo's id.
   - DELETE demo-only rows that are NOT in allowlist AND `--allow-destructive` is set.
   - Use Supabase REST UPSERT for atomic write per row.
7. Print summary: `N inserted, M updated, K deleted, P preserved (allowlist)`.
8. Exit 0 on success, non-zero on error.

### Step 2 — Author `scripts/promote-config-to-prizma.mjs`

Structure mirrors Step 1 but reversed. Required flags: exactly one of `--slug`, `--rule-name`, `--status`. Output: diff print + interactive confirm `YES PROMOTE` + UPSERT + audit log row insert to `crm_audit_log` (the canonical CRM audit table — no platform_audit_log exists per current schema).

Audit row shape:
```json
{
  "tenant_id": "<prizma>",
  "actor": "promote-config-to-prizma.mjs",
  "action": "config.promote",
  "entity_type": "<table>",
  "entity_id": "<prizma_row_id>",
  "details": { "source_demo_id": "<demo_row_id>", "before_md5": "...", "after_md5": "..." }
}
```

### Step 3 — Author `scripts/checks/demo-config-allowlist.json`

Initial content:
```json
{
  "crm_message_templates": [
    "check_in_event_email_he",
    "check_in_event_sms_he",
    "qa_redesign_test_email_he",
    "qa_redesign_test_sms_he",
    "qa_round1_test_template_email_he",
    "qa_round1_test_template_sms_he"
  ],
  "crm_automation_rules": [
    "QA TEST RULE — qa_redesign_test",
    "qa_redesign_test_rule_events",
    "qa_round1_test_rule_attendees",
    "qa_round1_test_rule_events",
    "qa_round1_test_rule_incoming",
    "qa_round1_test_rule_tier2"
  ],
  "crm_statuses": [],
  "crm_field_visibility": [],
  "crm_tags": []
}
```

The automation rule names are filled from the QA report Appendix F + DB snapshot `_archive/m4-overnight-2026-05-18/db-snapshots/crm_automation_rules_demo.json` (Foreman-enumerated, lines 1-23).

### Step 4 — Author `docs/guardian/sentinel/mission-11-config-parity.md`

Per existing Sentinel mission structure. Mission text:
- Read-only audit comparing demo vs Prizma config row counts + content hashes.
- Alerts in `docs/guardian/GUARDIAN_ALERTS.md` for: prizma-only-rows, body-hash-mismatch on shared slugs (excluding allowlist).
- 24h grace window for diverged rows (per Brief §5 Risk 3).
- Implementation deferred to separate SPEC.

### Step 5 — Append Iron Rule 33 to CLAUDE.md §6

Insert exactly the text from Brief §2.3 between current Rule 32 and the §"Cross-repo: Iron Rules 24–30" subsection.

### Step 6 — Register the 4 new files in docs/FILE_STRUCTURE.md

Append entries under the appropriate sections (scripts, docs/guardian/sentinel).

### Step 7 — Verification

- `npm run verify:integrity` exit 0.
- `node scripts/sync-prizma-config-to-demo.mjs --dry-run` runs cleanly + prints diff + exits 0.
- `node scripts/promote-config-to-prizma.mjs` (no args) exits non-zero with help message.
- `npm run smoke` 7/7 PASS.

### Step 8 — Commit and push

Single commit (or 2 if scoping cleanly separates): `feat(m4): config sync infrastructure (Iron Rule 33 + 2 scripts + allowlist + Sentinel mission 11 doc)`.

## 4. Destructive Operations

**None.**

This SPEC creates scripts that CAN destruct (DELETE rows in demo when called with `--allow-destructive`), but the SPEC itself does NOT execute those scripts. Any actual DB row writes are deferred to SPEC 2 (`M4_CONFIG_PARITY_RUN_1`).

The dry-run executed in Step 7 produces SELECT-only queries against demo + Prizma. SELECT is not destructive.

## 5. Verification Criteria

1. `scripts/sync-prizma-config-to-demo.mjs` exists, runs `--dry-run` cleanly on demo+Prizma, exits 0.
2. `scripts/promote-config-to-prizma.mjs` exists, requires `--slug`/`--rule-name`/`--status`, exits non-zero without it.
3. `CLAUDE.md` contains Iron Rule 33 in §6.
4. `scripts/checks/demo-config-allowlist.json` exists with 6 template slugs + 6 demo-only automation rule names.
5. `docs/guardian/sentinel/mission-11-config-parity.md` exists.
6. `verify.mjs --staged` passes (integrity + destructive-ops gates clean for additive-only commit).
7. `npm run smoke` 7/7 PASS on demo (no behavioral regression).
8. No write to any tenant's DB during this SPEC's execution. Verified via row-count snapshot pre/post (snapshots already captured in `_archive/m4-overnight-2026-05-18/db-snapshots/`).
9. `docs/FILE_STRUCTURE.md` registers the 4 new files.
10. SPEC §"Destructive Operations" declares `None.` (per Iron Rule 32 — additive-only).

## 6. Pre-flight (Executor — to be re-verified before commit 1)

- [ ] `git status` clean on develop.
- [ ] Pipeline lock present: `_archive/pipeline-sessions/2026-05-19T03-30-24-727Z_M4_OVERNIGHT_REPAIR_2026_05_18_overnight-2026-05-19.lock`.
- [ ] `npm run verify:integrity` exit 0.
- [ ] Master safety tag exists: `pre-m4-overnight-2026-05-18`.
- [ ] DB snapshots present in `_archive/m4-overnight-2026-05-18/db-snapshots/` (10 files).
- [ ] EF snapshots present in `_archive/m4-overnight-2026-05-18/ef-snapshots/`.

All 6 items checked during master prompt §"Pre-flight" steps 1-9 (see heartbeat). Re-verify before commit.

## 7. Rollback

Per master prompt §"Rollback procedures (partial)":
> SPEC 1: `git revert <SPEC_1_merge_sha>` — script files removed, Iron Rule 33 reverted.

Because SPEC 1 is additive-only (no DB or EF changes), a single `git revert` is sufficient. No DB rows to restore. No EF to redeploy.

## 8. Foreman skill-harvest proposals (to be authored at close)

Per master prompt §"Final report" → 4 skill-harvest proposals per SPEC (2 from author tier + 2 from executor tier). Foreman fills at close in FOREMAN_REVIEW.md.

---

*SPEC sealed for execution. Executor begins immediately after Foreman's seal.*
