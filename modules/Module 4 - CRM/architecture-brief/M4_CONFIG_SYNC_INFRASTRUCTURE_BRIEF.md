# M4_CONFIG_SYNC_INFRASTRUCTURE — Demo↔Prizma Config Sync as Permanent Discipline

**Status:** Brief — sealed for execution after M1 lens-catalog Pipeline closes.
**Authored by:** Architect (Cowork, 2026-05-18 evening)
**Pipeline mode:** Full-Auto (Foreman → Executor → Reviewer → Localhost-Tester → Foreman close).
**Priority:** P0 in the M4 repair slate — TIER 1 (must land before any other M4 fix).

---

## 1. Strategic Intent

**The problem this Brief closes:** Demo and Prizma config tables have drifted since `DEMO_PARITY_REPLICATION` (2026-05-11). Today: 7 templates DIVERGED, 6 demo-only QA leftovers, 1 prizma-only, 6 extra inactive automation rules in demo, 1 employee active-flag mismatch. The drift means a fix tested on demo does NOT prove the fix works on Prizma — they're running different config rows.

**The intent:** Make demo a **mechanical mirror of Prizma's config layer** (templates / automation_rules / statuses / field_visibility / tags) such that every M4 change follows the discipline:

1. Run `sync-prizma-config-to-demo` to snapshot Prizma's current config onto demo.
2. Make the change in demo (whether config row edit or EF code).
3. Test the change in demo.
4. Run `promote-config-to-prizma` to push the validated config row(s) to Prizma.

This converts a manual "remember to update both" workflow into 2 scripts + 1 rule + 1 audit. **Culture-into-infrastructure** (Pattern P31).

**What this Brief does NOT do:**
- Does NOT change EF code, JS, or HTML.
- Does NOT touch `crm_leads`, `crm_event_attendees`, `crm_broadcasts`, `crm_message_log`, `crm_automation_runs`, `crm_status_change_events`, `crm_capi_dispatch_queue`, or any other behavioral/transactional table.
- Does NOT modify `tenants.ui_config` (demo must keep its own branding — "אופטיקה דמו" name, demo phone, demo logo).

This SPEC ships **infrastructure only**. The first parity run is a separate SPEC (`M4_CONFIG_PARITY_RUN_1`).

---

## 2. Deliverables

### 2.1 Script: `scripts/sync-prizma-config-to-demo.mjs`

A Node.js script that copies the config tables from Prizma to demo. Behavior:

- Connects to Supabase via service-role key from `$HOME/.optic-up/credentials.env` (per existing convention from Phase 0 rails).
- Tables in scope (5):
  - `crm_message_templates`
  - `crm_automation_rules`
  - `crm_statuses`
  - `crm_field_visibility`
  - `crm_tags`
- Per table:
  1. SELECT all rows for Prizma tenant_id.
  2. SELECT all rows for demo tenant_id.
  3. Diff: rows present in Prizma not in demo (by slug/name); rows present in demo not in Prizma; rows with same slug but different content (md5 of body/action_config/etc).
  4. Print diff summary to stdout (Hebrew + English).
  5. Ask for confirmation: `"Type 'YES SYNC' to apply, anything else to abort:"`.
  6. On confirmation: in a transaction:
     - DELETE demo rows not in Prizma (except an allowlist of demo-only rows — see §2.4).
     - UPSERT Prizma rows into demo with `tenant_id` rewritten to demo's UUID.
     - For each row: preserve demo's own `id` if a matching slug/name exists (so existing FKs in demo don't break); otherwise generate a new UUID.
  7. Print summary: `N inserted, M updated, K deleted, P preserved`.
- Flags:
  - `--dry-run` — print diff, do not apply.
  - `--allow-destructive` — required to actually DELETE; without it, only UPSERT.
  - `--table=<name>` — sync a single table only.

### 2.2 Script: `scripts/promote-config-to-prizma.mjs`

The reverse direction — promote validated demo rows to Prizma. Behavior:

- Same connection mechanism.
- Required flag: `--slug=<value>` OR `--rule-name=<value>` OR `--status=<value>` — must target a specific row. NO bulk promotion (intentional — bulk is the anti-pattern this script prevents).
- Behavior:
  1. SELECT the named row from demo.
  2. SELECT the same row (by slug/name) from Prizma.
  3. Print before/after diff.
  4. Ask for confirmation: `"Type 'YES PROMOTE' to apply, anything else to abort:"`.
  5. On confirmation: UPSERT into Prizma with `tenant_id` rewritten to Prizma's UUID.
  6. Print: `1 row promoted, audit row written to platform_audit_log`.
- Writes an audit entry to `platform_audit_log` (or `crm_audit_log` — Foreman picks based on table) recording: actor (Daniel via service role), source row demo_id, target row prizma_id, before-hash, after-hash, ISO timestamp.

### 2.3 Iron Rule 33 — Demo-First Discipline (M4 Config)

Append to `CLAUDE.md` §6 (Hygiene Rules):

> **33. M4 config changes must flow demo-first.** Any change to `crm_message_templates`, `crm_automation_rules`, `crm_statuses`, `crm_field_visibility`, `crm_tags` MUST be applied to demo first, tested on demo, then promoted to Prizma via `scripts/promote-config-to-prizma.mjs`. Direct edits to Prizma's M4 config tables are FORBIDDEN. Bypass requires Daniel's explicit go-ahead in chat. Enforcement: (a) Sentinel Mission 11 (new) — daily audit comparing demo vs Prizma config row counts + sample-hash drift; alerts in `docs/guardian/GUARDIAN_ALERTS.md` if Prizma has rows not in demo. (b) Pre-commit reminder: any SPEC touching M4 config must declare the demo-first sequence in its §3 Steps.

This rule exists because demo is THE testbed for Prizma. Drift between them defeats the purpose of having a testbed.

### 2.4 Demo-only allowlist file

`scripts/checks/demo-config-allowlist.json` — rows that legitimately exist in demo only and must NOT be deleted during sync. Initial contents (based on today's drift):

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
    "<rule names of the 6 inactive demo-only rules — Executor enumerates at runtime>"
  ]
}
```

Foreman fills in the automation rules list during pre-flight. The Allowlist is the audit trail of "we knew about these and chose to keep them."

### 2.5 Sentinel Mission 11 — Demo-Prizma Config Parity

New file: `docs/guardian/sentinel/mission-11-config-parity.md` (per existing Sentinel mission structure).

The mission:
- Runs daily.
- Read-only.
- Queries: for each of 5 tables, `count(*) WHERE tenant_id=prizma` vs `count(*) WHERE tenant_id=demo`; sample md5 of body / action_config / etc.
- Alerts in `docs/guardian/GUARDIAN_ALERTS.md` if:
  - Prizma row exists with slug X but demo row with same slug differs in body_hash.
  - Prizma row exists with slug X and no demo row exists.
- Does NOT alert on demo-only rows that are in the allowlist.

---

## 3. Verification Criteria

After commit, all of these must hold:

1. `scripts/sync-prizma-config-to-demo.mjs` exists, runs `--dry-run` cleanly on demo+Prizma, exits 0.
2. `scripts/promote-config-to-prizma.mjs` exists, requires `--slug` flag, exits non-zero without it.
3. `CLAUDE.md` contains Iron Rule 33 in §6.
4. `scripts/checks/demo-config-allowlist.json` exists with 6 template slugs + Foreman's filled automation rule list.
5. Sentinel mission 11 file exists; smoke-run prints the diff summary to stdout.
6. `verify.mjs --staged` passes.
7. Smoke 7/7 PASS on demo.
8. No row was written to Prizma or demo by this SPEC's execution itself (verify with row-count snapshots pre/post).
9. `docs/FILE_STRUCTURE.md` registers the 3 new files (2 scripts + 1 allowlist + 1 sentinel mission doc = 4).
10. Iron Rule 32 §"Destructive Operations" in this Brief declares `None.` (this SPEC adds scripts that CAN destruct, but does not destruct itself).

---

## 4. Destructive Operations

**None.**

This SPEC creates the scripts but does NOT execute them. First run is in `M4_CONFIG_PARITY_RUN_1`.

---

## 5. Risk Surface

- **Risk 1: scripts have bugs that delete legitimate rows.** Mitigation: `--dry-run` default + explicit `--allow-destructive` flag + allowlist file + pre-execution diff print + interactive confirmation. Foreman writes regression tests in `tests/smoke/sync-script-test.mjs` that simulate Prizma+demo state and verify the diff matches expectations.
- **Risk 2: Iron Rule 33 too restrictive — blocks legitimate emergency direct-Prizma edits.** Mitigation: rule explicitly says "Bypass requires Daniel's explicit go-ahead in chat." It is a discipline rule, not a hook-blocked rule.
- **Risk 3: Sentinel mission 11 produces noise alerts during active SPEC work (when demo legitimately diverges mid-SPEC).** Mitigation: mission has a 24h grace window for diverged rows — alerts only if drift persists >24h.

---

## 6. Out of Scope

- The first actual sync run — that's `M4_CONFIG_PARITY_RUN_1` (separate SPEC).
- Behavioral data sync (leads, attendees, broadcasts, log, etc.).
- `tenants.ui_config` sync (demo keeps its own branding).
- `crm_campaigns` / `crm_campaign_pages` — not in the 5-table scope (campaigns are content, not config).
- Automated periodic sync — explicit decision: this is manual + scripted, not cron-driven.

---

## 7. Pre-flight Checklist for Executor

Before commit 1, verify:
- [ ] `git status` clean on develop.
- [ ] `_archive/pipeline-sessions/` has no lock file other than this SPEC's.
- [ ] `npm run verify:integrity` exit 0.
- [ ] Read `_archive/m4-qa-2026-05-18/M4_FULL_QA_REPORT_2026_05_18.md` Appendix B for the row-count baseline.
- [ ] Read existing `scripts/` patterns (verify.mjs, schema-diff.mjs) to match style.

---

## 8. Estimated wall-clock

3-4 hours. Most of the time is the script logic + regression tests, not the rule/allowlist.

