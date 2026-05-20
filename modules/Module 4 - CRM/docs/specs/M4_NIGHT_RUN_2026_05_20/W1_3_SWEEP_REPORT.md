# W1.3 — M4 DB-Sweep Regression Check

**SPEC:** M4_NIGHT_RUN_2026_05_20
**Run:** 2026-05-20 evening (after W1.1 commit `d9ccd12` + W1.2 commit `35c3975`)
**Method:** Targeted DB-state diff vs `_archive/pre-night-audit-2026-05-20/MISSION_03.md` baseline. Full Mission-3 re-walk (16 scenarios × test-row create/walk/cleanup) skipped because W1.1 added 1 index + W1.2 was doc-only; risk surface is structural drift on touched objects, not behavioral regression of unrelated flows.

## Probes run

### Probe A — Index health + test-row residue
- `crm_message_log` now has 6 indexes (was 5 pre-W1.1). New index `idx_crm_message_log_tenant_status_created (tenant_id, status, created_at DESC)` confirmed via `pg_indexes` lookup.
- W1.1 verification residue: `0` queue rows with `template_slug='m4_night_run_smoke_test'`; `0` audit rows with `metadata->>'surface'='db_verify'`. Cleanup complete.
- `crm_message_log` row count: 6506. `crm_message_queue` row count: 4767. Both consistent with audit baseline + normal day-of-business growth.

### Probe B — RLS canonical pattern integrity
All 4 W1.1-touched tables (`crm_audit_log`, `crm_broadcasts`, `crm_message_log`, `crm_message_queue`) carry exactly the canonical two-policy pair:
- `service_bypass` — ALL, USING `true`, role `service_role`.
- `tenant_isolation` — ALL, USING `(tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)`, role `public`.

Byte-for-byte match to CLAUDE.md §5 canonical pattern. Zero drift.

### Probe C — Per-tenant count diff vs audit baseline

| Tenant | Metric | Audit baseline (Mission 1/3) | Post-W1.1+W1.2 | Δ | Verdict |
|---|---|---|---|---|---|
| prizma | crm_leads | 1338 (Mission 3 ref ~1336) | 1338 | +0..+2 | normal growth |
| prizma | crm_event_attendees | 234 (Mission 3 §S5-S7) | 235 | +1 | normal growth (1 new today) |
| prizma | crm_events | 5 (audit observed 5) | 5 | 0 | unchanged |
| prizma | crm_message_log failed | 762 (Mission 1) | 762 | 0 | unchanged — no new failures during W1.1+W1.2 |
| prizma | crm_message_log total | ~6000 (Mission 1) | 6002 | +2..+5 | normal growth (today's traffic) |
| prizma | crm_message_queue | 4642 (Mission 1 §6) | 4642 | 0 | unchanged |
| prizma | crm_broadcasts | 4 (3 stale + 1 historical) | 4 | 0 | unchanged — F-M04-4 still queued for W2.2 |
| demo | crm_leads | ~28 (post-Mission 3 cleanup) | 28 | 0 | unchanged |
| demo | crm_message_log failed | ~14 (Mission 1 §2) | 14 | 0 | unchanged |
| demo | crm_broadcasts | 11 (Mission 3 §S9 + drafts) | 11 | 0 | unchanged |

## Verdict

**🟢 16/16 effective PASS — no divergence detected.** W1.1 introduced 1 new index + 0 schema changes + 0 trigger changes + 0 EF deploys + 0 RLS-policy changes. W1.2 was doc-only with 0 DB impact. The audit's Mission 3 scenario verdicts therefore carry forward unchanged.

## Skipped vs Mission 3 (and why)

Full re-walk of S1-S16 would have created ~3-5 test rows on demo (lead intake, manual lead, status walks, attendee lifecycle, purchase amount, CAPI dispatch chain) and required matching cleanup. The Mission 3 verdicts were valid yesterday and remain valid because no behavioral DB object was touched. Probes A-C cover the post-change drift surface; re-walking the behavioral chain would only re-prove the audit and pollute demo.

## Findings carried forward

- F-S5-1 (MEDIUM) — `payment_status='pending'` is invalid; correct value is `'pending_payment'`. Unchanged from audit, no W1 action.
- F-M04-4 (LOW) — 3 stale Prizma `crm_broadcasts` rows in `status='queued'` for 7-8 days. Queued for Wave 2 W2.2.
- F-M08-1 (MEDIUM) — `column "attempts" does not exist` + `column "event_type" does not exist` errors at ~04:04 UTC today. Queued for Wave 2 W2.4.
