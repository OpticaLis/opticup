# M4_CONFIG_PARITY_RUN_1 — First Sync Run: Prizma → Demo

**Status:** Brief — sealed for execution after `M4_CONFIG_SYNC_INFRASTRUCTURE` closes.
**Authored by:** Architect (Cowork, 2026-05-18 evening)
**Pipeline mode:** Full-Auto.
**Priority:** P0.5 — runs right after the infrastructure SPEC.

---

## 1. Strategic Intent

Use the newly-built `scripts/sync-prizma-config-to-demo.mjs` to bring demo into byte-mirror state with Prizma's current M4 config. After this SPEC closes, demo's `crm_message_templates`, `crm_automation_rules`, `crm_statuses`, `crm_field_visibility`, `crm_tags` will be a 1:1 mirror of Prizma (except allowlist demo-only rows).

This SPEC is intentionally separated from the infrastructure SPEC because **the first real sync is destructive** (DELETE diverged rows, UPSERT prizma rows). It deserves its own commit, its own audit, its own rollback plan.

---

## 2. Deliverables

### 2.1 Pre-run snapshot

Run a SELECT-only snapshot of demo's current M4 config (md5 hashes per row) and save to `_archive/m4-config-snapshots/pre-sync-run-1_2026-05-18.json`. This is the rollback evidence.

### 2.2 Execute the sync

Run `node scripts/sync-prizma-config-to-demo.mjs --allow-destructive`. Interactive confirmation required. Print the diff summary BEFORE confirmation. Foreman approves; Executor confirms.

### 2.3 Post-run verification

After sync:
- Re-run the parity check query from the QA report (`SELECT slug, channel, md5(body) FROM crm_message_templates` for both tenants, FULL OUTER JOIN). Expected: 0 DIVERGED rows; 0 PRIZMA_ONLY rows; only allowlist DEMO_ONLY rows.
- Same for `crm_automation_rules`, `crm_statuses`, `crm_field_visibility`, `crm_tags`.
- `crm_event_attendees` row count on demo unchanged (sync must not cascade-delete via FKs).
- `crm_leads` row count on demo unchanged.

### 2.4 Post-run snapshot

Same as pre-run, save to `_archive/m4-config-snapshots/post-sync-run-1_2026-05-18.json`.

### 2.5 Audit row

One row in `crm_audit_log` or `platform_audit_log` (Foreman picks) recording: actor, timestamp, "M4_CONFIG_PARITY_RUN_1 executed", pre-hash + post-hash for each of 5 tables.

---

## 3. Verification Criteria

1. Sync script ran successfully; exit 0.
2. Demo's config tables match Prizma byte-for-byte (FULL OUTER JOIN returns only allowlist DEMO_ONLY rows).
3. Demo's transactional tables (leads, attendees, broadcasts, log) row counts UNCHANGED.
4. Prizma's all tables UNCHANGED (no writes to Prizma in this SPEC — sync is one-way).
5. Pre + post snapshots saved.
6. Audit row written.
7. Smoke 7/7 PASS on demo.
8. Iron Rule 32 §"Destructive Operations" declares: `DELETE from crm_message_templates, crm_automation_rules WHERE tenant_id=demo AND slug NOT IN (Prizma slugs ∪ allowlist).` Pre-authorized via this Brief.

---

## 4. Destructive Operations

Declared and pre-authorized:
1. DELETE rows from demo's `crm_message_templates` where slug not in (Prizma slugs ∪ allowlist).
2. DELETE rows from demo's `crm_automation_rules` where name not in (Prizma names ∪ allowlist).
3. UPSERT (technically not destructive but updates existing demo rows): every Prizma row overwrites the demo row of the same slug/name.

These are scoped to demo tenant_id ONLY. The sync script enforces this via tenant_id parameter; the Executor must verify by reading the script's tenant_id binding before execution.

---

## 5. Risk Surface

- **Risk 1: script bug deletes more than intended.** Mitigation: pre-run snapshot enables manual restore via INSERTs from JSON. Foreman writes the restore SQL as part of pre-flight.
- **Risk 2: FK from another table to a deleted row breaks.** Mitigation: pre-flight queries each FK pointing to `crm_message_templates.id` / `crm_automation_rules.id` and verifies demo rows being deleted are not referenced by demo transactional rows. If they are — STOP and escalate.
- **Risk 3: sync corrupts an in-flight automation run.** Mitigation: run during a quiet window (no active automation runs in last 5 min); pre-flight check.

---

## 6. Out of Scope

- Pushing demo's existing config back to Prizma (this is Prizma → demo, one-way).
- Behavioral data sync.

---

## 7. Pre-flight Checklist

- [ ] `M4_CONFIG_SYNC_INFRASTRUCTURE` closed cleanly on develop.
- [ ] No active automation runs in last 5 minutes (`SELECT count(*) FROM crm_automation_runs WHERE started_at > now() - interval '5 min' AND completed_at IS NULL`).
- [ ] FK check passes per Risk 2.
- [ ] Pipeline lock claimed.
- [ ] Smoke 7/7 PASS pre.

---

## 8. Estimated wall-clock

45-60 minutes. Most of the time is review of the diff before approving destructive flag.

