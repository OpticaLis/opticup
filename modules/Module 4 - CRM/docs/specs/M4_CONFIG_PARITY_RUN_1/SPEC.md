# SPEC — M4_CONFIG_PARITY_RUN_1

**Brief:** `modules/Module 4 - CRM/architecture-brief/M4_CONFIG_PARITY_RUN_1_BRIEF.md`
**Authored:** 2026-05-19 (continuation chain, Pipeline lock `M4_CONTINUATION_2026_05_19_continuation-2026-05-19`).
**Mode:** Full-Auto Pipeline. Operator: Daniel-authorized stop-trigger bypass for the +1-update-over-baseline observation (rule "צ'ק אין לאירוע" template_slug differs between demo `check_in_event` ↔ Prizma `check_in_attendee`; bodies identical md5; legacy demo template name only, not a content drift).
**Scope:** Execute SPEC 1's sync infrastructure exactly once. Demo config rows mutate; Prizma read-only.

---

## 1. Goal

Run `scripts/sync-prizma-config-to-demo.mjs --apply --allow-destructive --confirm-destructive=YES-I-READ-THE-DIFF --diff-out=_archive/m4-overnight-2026-05-18/sync-diff.txt`. Bring demo's 5 M4 config tables to byte-identical state with Prizma's, except for the 12 demo-only-allowlisted rows. Capture the diff as audit trail. After apply, verify dry-run reports zero changes.

## 2. Scope

### 2.1 In-scope

- One destructive run of the sync script against demo tenant.
- Commit the captured diff to `_archive/m4-overnight-2026-05-18/sync-diff.txt`.
- Post-apply verification.

### 2.2 Out-of-scope

- Any Prizma writes (script direction is Prizma → demo only).
- Behavioral data (leads, attendees, broadcasts, log).
- `tenants.ui_config` (per Iron Rule 33 / Brief §1).

## 3. Steps

1. Pre-flight: confirm Pipeline lock held, `git status` shows no surprise modifications, smoke pass.
2. Apply: run the script with the 4 flags listed in §1.
3. Verify: re-run `--dry-run`; expect totals 0/0/0/12.
4. Smoke: `npm run smoke` 7/7 PASS.
5. Commit diff: `git add _archive/m4-overnight-2026-05-18/sync-diff.txt && git commit ...`.

## 4. Destructive Operations

1. **DML mass-update + insert on demo tenant** — 1 INSERT + 8 UPDATES across `crm_message_templates` (1+7) and `crm_automation_rules` (0+1). Rollback path: restore from `_archive/m4-overnight-2026-05-18/db-snapshots/*_demo.json` per master prompt §"Rollback procedures (partial) SPEC 2".

This is the ONLY destructive operation in SPEC 2. No deletes (allowlist preserved 12 demo-only rows). Bypass of the 10%-over-baseline rule was authorized by Daniel after manual inspection of the +1 over-baseline row (the "צ'ק אין לאירוע" rule template_slug naming difference).

## 5. Verification Criteria

1. ✅ Apply exits 0, reports `1 inserted, 8 updated, 0 deleted`.
2. ✅ Post-apply `--dry-run` reports `0 inserts, 0 updates, 0 deletes, 12 preserved` (demo is now in parity, allowlist preserves intentional demo-only rows).
3. ✅ `npm run smoke` 7/7 PASS.
4. ✅ Diff captured to `_archive/m4-overnight-2026-05-18/sync-diff.txt` and committed.
5. ✅ Pre-commit gates Iron Rules 21/31/32 clean.

## 6. Rollback

Per master prompt §"Rollback procedures (partial) SPEC 2": restore demo DB rows from snapshots in `_archive/m4-overnight-2026-05-18/db-snapshots/*_demo.json`. The snapshot was captured at 2026-05-19T03:30Z (pre-overnight pre-flight step 7).

Implementation: a custom restore script (not yet authored) would read each snapshot JSON, DELETE FROM `<table>` WHERE tenant_id=demo, then INSERT the snapshot rows. **Not authored as part of SPEC 2** because the rollback is an emergency procedure, not a planned step.
