# Sentinel Mission 11 — Demo-Prizma Config Parity (M4)

**Status:** Mission DEFINED. Implementation script (`docs/guardian/sentinel/mission-11-config-parity.mjs` or similar) is a follow-up SPEC.
**Established by:** `M4_CONFIG_SYNC_INFRASTRUCTURE` (SPEC commit on develop).
**Authority:** CLAUDE.md Iron Rule 33 — M4 config demo-first discipline.
**Cadence:** Daily (existing Sentinel cron).
**Scope:** Read-only. 5 tables. No writes.

---

## 1. Purpose

After Iron Rule 33 lands, every M4 config change is supposed to flow demo-first → tested → promoted to Prizma via `scripts/promote-config-to-prizma.mjs`. Drift is an Iron Rule 33 violation. Sentinel Mission 11 catches drift the next morning before it accumulates.

## 2. Inputs

- Tables: `crm_message_templates`, `crm_automation_rules`, `crm_statuses`, `crm_field_visibility`, `crm_tags`.
- Tenants: Prizma (`6ad0781b-37f0-47a9-92e3-be9ed1477e1c`), demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`).
- Allowlist: `scripts/checks/demo-config-allowlist.json` (rows that are intentionally demo-only).
- Natural-key field per table (see allowlist `_key_format`).

## 3. What the mission does

For each table:

1. SELECT all rows for Prizma.
2. SELECT all rows for demo.
3. Build key-maps (natural key → row).
4. Hash content fields (md5 of normalized JSON, excluding id/tenant_id/created_at/updated_at/last_error).
5. Categorize:
   - **prizma_only**: present in Prizma, missing in demo → ALERT.
   - **demo_only**: present in demo, missing in Prizma → ALERT unless on allowlist.
   - **diverged**: same natural key, body_hash mismatch → ALERT.
   - **matched**: both exist, hash equals → silent.
6. Apply 24h grace window: an alerting condition that first appeared in the past 24h is recorded but NOT alerted. This prevents noise during active SPEC work.

## 4. Outputs

`docs/guardian/GUARDIAN_ALERTS.md` — append a Mission-11 alert block when:

- Any prizma_only row exists older than 24h.
- Any diverged shared-slug row older than 24h.
- Any demo_only row older than 24h AND not on allowlist.

Each alert lists: table, natural key, age, hash-mismatch summary (for diverged class).

If no alerts: emit `Mission 11 — ALL CLEAR (N tables, M rows on each side, P allowlist preserved)` line.

## 5. Severity classification

- **HIGH** — prizma_only rows. Prizma has config that demo doesn't. Means: a change landed on Prizma directly, bypassing demo. Iron Rule 33 violation.
- **MEDIUM** — diverged shared-slug rows. Either Prizma has been edited bypassing demo, OR demo has been edited and not yet promoted.
- **LOW** — demo_only-not-allowlist rows (>24h). Either a stale QA artifact, OR a new demo feature awaiting promotion (operator decides to extend allowlist or promote).
- **ALL CLEAR** — no findings.

## 6. Implementation outline (future SPEC)

```js
// docs/guardian/sentinel/mission-11-config-parity.mjs (to be authored)
// Reads scripts/checks/demo-config-allowlist.json + uses scripts/sync-prizma-config-to-demo.mjs's diff logic as a library.
// Appends to docs/guardian/GUARDIAN_ALERTS.md.
```

The mission will reuse the diff logic from `scripts/sync-prizma-config-to-demo.mjs` (extract `diffTable` to a shared helper at `scripts/lib/m4-config-diff.mjs` when the implementation SPEC lands).

## 7. Acceptance for this mission doc

This doc (no script yet) establishes the protocol. When SPEC `SENTINEL_MISSION_11_IMPL` ships, it must:

1. Add the `.mjs` runner alongside this doc.
2. Add a cron entry in the existing Sentinel scheduler.
3. Update `docs/FILE_STRUCTURE.md` registering the runner.
4. Include integration test: seed a drift case in a temp tenant + assert alert appears.

## 8. Why this matters

`DEMO_PARITY_REPLICATION` (2026-05-11) initially aligned demo with Prizma. By the M4 QA investigation (2026-05-18), drift had accumulated: 7 templates diverged, 6 demo-only, 1 prizma-only. Without a daily watchdog, drift comes back. Iron Rule 33 turns the discipline into infrastructure; Mission 11 makes the infrastructure observable.
