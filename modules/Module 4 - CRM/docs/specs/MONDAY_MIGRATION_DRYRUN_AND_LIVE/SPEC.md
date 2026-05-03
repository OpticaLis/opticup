# SPEC — MONDAY_MIGRATION_DRYRUN_AND_LIVE

> **Author:** Campaign Overseer (Cowork session) acting as SPEC drafter; Foreman review pending.
> **Date:** 2026-05-03 afternoon
> **Status:** DRAFT — ready for executor (Foreman review optional given time pressure).
> **Pre-cutover priority:** CRITICAL — final pre-cutover gate. After this SPEC closes, only F2 (storefront flip) remains.
> **Cutover-blocker?** YES.

---

## 1. Why this SPEC exists

The existing Monday → Optic Up migration script (`campaigns/supersale/scripts/import-monday-data.mjs`, dated 2026-04-21) was authored before Daniel's 7 migration decisions on 2026-05-02 evening (REC-001 through REC-007 in `__LAUNCH_PLAN_DRAFT__/campaign-overseer/DECISIONS_LOG.md`). The script must be updated to reflect those decisions, then verified via dry-run, then run for real on prizma.

Daniel's verbal directive 2026-05-03 afternoon: "ניקוי + מעבר בפרומפט אחד, נראה איך זה עובר ונראה אם זה עובד טוב" — single combined run, treating prizma as a scratch branch (which it effectively is until F2 flips storefront writes to it).

---

## 2. Goal

Apply Daniel's 7 migration decisions to the importer, run a non-destructive dry-run on the 3 fresh Monday exports to validate the parser, then wipe prizma to baseline, then run the live import. Final state: prizma populated with all migratable Monday data per the 7 decisions, ready for the F2 cutover.

---

## 3. The 7 migration decisions to encode (REC-001..007)

Source: `__LAUNCH_PLAN_DRAFT__/campaign-overseer/DECISIONS_LOG.md`. Reproduced inline so the executor doesn't need to fetch:

| REC | Decision | Action in importer |
|---|---|---|
| **D-1** | 51 orphan attendees → STUB-CREATE leads | For every phone in Events_Record that has no Tier_2 master row, auto-INSERT a `crm_leads` row with `source='monday_legacy_orphan'`, name from attendee row, `client_notes='Imported from Monday Events_Record archive — original master record not found'`, tag `legacy_orphan`. Status `waiting`. |
| **D-2** | 8 vision questionnaires → DROP | Skip Tier_2 col 14 (vision questionnaire summary text) entirely. Do not write to `client_notes`. |
| **D-3** | 152 coupon-sent markers → SYNTHESIZE message_log rows | For every Events_Record row with `Send Messages = 'קוד קופון'`: INSERT `crm_message_log` row with `template_slug='coupon_code_he'`, `channel='sms'`, `content='[migrated from Monday — body unavailable]'`, `status='sent'`, `created_at=registered_at`. Also set `crm_event_attendees.coupon_sent=true`, `coupon_sent_at=registered_at`. The other 27 markers (`הרשמה אושרה אוט'`, `יום לפני האירוע`, `אין זמן בדיקה`) are dropped. |
| **D-4** | 80 "Category" tags → DROP | Skip Tier_2 col 16 + Events_Record col 21 entirely. |
| **D-5** | 8 MultiSale events → SKIP entirely at cutover | If `Interests` contains `MultiSale`, skip the event row AND its attendees. Log them to `import-skipped.json` for the post-cutover SPEC that will introduce `event_type` and import them later. |
| **D-6** | 587 lead-level eye-exam answers → KEEP | Map Tier_2 col 11 (Eye Exam yes/no) to `crm_leads.eye_exam_default`. Use the canonical 4-option set values when possible; otherwise pass through verbatim and tag for manual cleanup. |
| **D-7** | 2 corrupted-phone rows → FIX-AND-IMPORT | If a phone is 12-digit and starts with `972`, strip the leading `972` then normalize. If still invalid, skip with logged warning. The 2 specific rows are at Tier_2 indexes 222 and 710. |

---

## 4. Iron Rule check

| Rule | Applies | Notes |
|---|---|---|
| 7 (API abstraction) | YES | All DB writes via service-role client, same pattern as the existing importer |
| 9 (no hardcoded business values) | YES | Tenant ID + paths read from CLI args / env, not literals |
| 14/15 (tenant_id + RLS) | YES | Every INSERT explicitly passes `tenant_id` |
| 21 (no orphans/duplicates) | YES — this rule drives D-1 | Orphan attendees stub-create instead of being dropped |
| 22 (defense-in-depth on writes) | YES | tenant_id on every INSERT, even via service-role |
| 31 (integrity gate) | YES | `verify:integrity` exit 0 before commit |

---

## 5. Proposed shape

### 5.1 Updated importer

`campaigns/supersale/scripts/import-monday-data.mjs` is edited to encode the 7 decisions. Specifically:

- **D-1:** new pre-pass: build a Set of phones in Tier_2; iterate Events_Record; for any phone NOT in the set, queue a `stubLeads[]` array; insert before processing attendees.
- **D-2:** comment-out / remove the Tier_2 col 14 mapping. Confirm via grep that no other code path writes the questionnaire summary.
- **D-3:** new step after attendee inserts: scan Events_Record `Send Messages` column; for rows containing `קוד קופון`, INSERT synthetic `crm_message_log` row + UPDATE `crm_event_attendees.coupon_sent`.
- **D-4:** remove Tier_2 col 16 + Events_Record col 21 from any tag-creating logic.
- **D-5:** in the events-loop, if `Interests` includes `MultiSale`, push to `skipped[]` and `continue`.
- **D-6:** new mapping: Tier_2 col 11 → `crm_leads.eye_exam_default`. If value is `כן` → `'כן, בדיקה רגילה'`; if value is `לא` → `'לא, אין צורך בבדיקה'`; otherwise pass through.
- **D-7:** in `normalizePhone()`, add: if `digits.length === 12 && digits.startsWith('972')`, strip the leading `972` and re-normalize.

The script keeps its existing CLI flags (`--source-dir`, `--tenant-id`, `--dry-run`). Output reports go to `campaigns/supersale/scripts/import-report.json` and `import-skipped.json` (existing names).

### 5.2 Dry-run validation

`campaigns/supersale/scripts/parity-dry-run.mjs` is run against:
- Source: `modules/Module 4 - CRM/go-live/monday-exports-2026-05-03/`
- Files: `Tier_2_Master_Board_1777800752.xlsx`, `Events_Management_1777800770.xlsx`, `Facebook_ADS_1777800801.xlsx`
- Tenant: prizma (`6ad0781b-37f0-47a9-92e3-be9ed1477e1c`)
- Mode: dry-run only — NO writes to DB.

Expected output: parity report showing every Monday column either ✅ mapped, 🟡 mapped-with-loss, or ⛔ ignored. Zero unmapped columns. Counts: ~587 leads + ~51 stub leads (D-1) + ~152 synthesized message_log rows (D-3) + ~80-90 attendees + ~3 active events (events 8 MultiSale skipped per D-5).

**Updated 2026-05-03 (post dry-run):** the count baselines above were derived from a 2026-04-21 Monday snapshot. The fresh 2026-05-03 export reflects 12 days of additional Monday activity. Actual dry-run counts: 1121 master leads, 37 stubs, 156 synth message_log, 221 attendees, 3 events, 8 MultiSale events dropped, 54 MultiSale attendees dropped. Daniel confirmed the growth is real (587 → 1121 reflects 12 days of legitimate Monday activity); 37 vs 51 stubs reflects 14 prior orphans that received Tier_2 master rows in those 12 days. New tolerance bands applied for the live import:

- total_leads (master + stubs): 1158 ±5%
- orphan/stub leads: 37 ±5
- attendees_with_coupon = synth_msg_log: 156 ±2
- total_events = 3 (exact)
- MultiSale events dropped = 8 (exact)

**STOP if:**
- Any column is unmapped (coverage gap).
- Live-import counts deviate from the 2026-05-03 dry-run counts above by more than the listed tolerance.
- Skipped MultiSale event count is not 8.

### 5.3 Wipe prizma

After dry-run passes, ONE atomic SQL block deletes ALL prizma data:

```sql
-- Order matters: child tables before parent tables.
DELETE FROM crm_message_log WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
DELETE FROM crm_automation_runs WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
DELETE FROM crm_message_queue WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
DELETE FROM short_links WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
DELETE FROM crm_event_attendees WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
DELETE FROM crm_lead_notes WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
DELETE FROM crm_lead_tags WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
DELETE FROM crm_events WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
DELETE FROM crm_leads WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
-- Verify zero
SELECT
  (SELECT COUNT(*) FROM crm_leads WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c') AS leads,
  (SELECT COUNT(*) FROM crm_events WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c') AS events,
  (SELECT COUNT(*) FROM crm_event_attendees WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c') AS attendees,
  (SELECT COUNT(*) FROM crm_message_log WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c') AS msg_log;
```
All four counts must be 0. If any is non-zero — STOP and investigate FK constraints.

**Note:** `crm_message_templates`, `crm_automation_rules`, `crm_campaigns`, `crm_facebook_campaigns`, `crm_ad_spend`, and `crm_statuses` are NOT wiped — they are tenant-config that survives the migration.

### 5.4 Live import

After verified-empty prizma:

```bash
node campaigns/supersale/scripts/import-monday-data.mjs \
  --source-dir "modules/Module 4 - CRM/go-live/monday-exports-2026-05-03/" \
  --tenant-id "6ad0781b-37f0-47a9-92e3-be9ed1477e1c" \
  --live
```

Expected duration: 10-15 minutes.

### 5.5 Verification queries

After import completes:

```sql
SELECT
  (SELECT COUNT(*) FROM crm_leads WHERE tenant_id = '6ad0781b-...') AS total_leads,
  (SELECT COUNT(*) FROM crm_leads WHERE tenant_id = '6ad0781b-...' AND source = 'monday_legacy_orphan') AS orphan_leads,
  (SELECT COUNT(*) FROM crm_leads WHERE tenant_id = '6ad0781b-...' AND eye_exam_default IS NOT NULL) AS leads_with_eye_exam,
  (SELECT COUNT(*) FROM crm_event_attendees WHERE tenant_id = '6ad0781b-...') AS total_attendees,
  (SELECT COUNT(*) FROM crm_event_attendees WHERE tenant_id = '6ad0781b-...' AND coupon_sent = true) AS attendees_with_coupon,
  (SELECT COUNT(*) FROM crm_message_log WHERE tenant_id = '6ad0781b-...' AND content LIKE '%migrated from Monday%') AS synth_msg_log,
  (SELECT COUNT(*) FROM crm_events WHERE tenant_id = '6ad0781b-...') AS total_events;
```

Expected (re-baselined 2026-05-03 against the fresh export — see §5.2):
- `total_leads` ≈ 1158 (1121 master + 37 stubs, ±5%)
- `orphan_leads` = 37 (±5)
- `leads_with_eye_exam` — populated for any Tier_2 row with non-empty Eye Exam (D-6); no fixed target
- `total_attendees` = 221 (±5%)
- `attendees_with_coupon` = 156 (±2)
- `synth_msg_log` = 156 (±2)
- `total_events` = 3 (exact)
- `total_facebook_campaigns` = 88 (Δ-4 ad_spend wiring)

If any count is materially off — STOP and report.

---

## 6. Success criteria

1. Importer updated with all 7 decisions, code review passes (each decision has a clear comment block referencing REC-NNN).
2. Dry-run report shows zero unmapped columns; stub/synth/skip counts within tolerance.
3. Prizma fully wiped (4 tables show 0 rows in verification SELECT).
4. Live import runs to completion without errors.
5. Verification queries return counts within tolerance per §5.5.
6. `import-report.json` updated with run timestamp + per-entity counts.
7. `import-skipped.json` updated with the 8 MultiSale event rows + any phone-fixup failures.
8. `verify:integrity` exit 0.
9. EXECUTION_REPORT + FINDINGS written.

---

## 7. Autonomy envelope

- Importer code edits: autonomous.
- Dry-run: autonomous.
- **Wipe prizma:** STOP and ask Daniel for verbal "proceed" before executing the DELETE block. This is the only irreversible step.
- Live import: autonomous after Daniel's verbal "proceed".
- Verification: autonomous.
- Commit + push: autonomous (selective `git add` per the established WIP discipline).

---

## 8. Stop triggers

- Dry-run shows unmapped columns.
- Stub/synth/skip counts outside tolerance bands in dry-run.
- Wipe verification SELECT shows non-zero rows after the DELETE block.
- Live import errors out before completing.
- Final verification counts off by more than the stated tolerances.
- Any FK constraint error during wipe (means wrong table order or undocumented child table).

---

## 9. Rollback

If import fails partway:
1. Re-run wipe (§5.3) — prizma back to empty.
2. Investigate the failure, fix the importer.
3. Re-run dry-run.
4. Re-run import.

The wipe is idempotent. The script can run multiple times.

---

## 10. Out of scope

- Storefront F2 cutover (storefront develop → main merge). That's a separate operation Daniel does manually after this SPEC closes.
- The cutover-day flip of `tenants.test_mode_sms_allowlist` to NULL. Daniel does that manually Sunday morning.
- Importing the 8 MultiSale events. Deferred to a post-cutover SPEC per REC-005.

---

## 11. Pre-flight checks (executor's first step)

1. Confirm 3 Excel files exist in `modules/Module 4 - CRM/go-live/monday-exports-2026-05-03/`.
2. Confirm `campaigns/supersale/scripts/import-monday-data.mjs` exists and is the 27KB version.
3. Confirm `campaigns/supersale/scripts/parity-dry-run.mjs` exists.
4. Confirm prizma current row counts (so we have a before-snapshot for the wipe verification).
5. Confirm `git status` is clean OR only the authorized WIP files (per Daniel's standing "intentional WIP" directive).
6. Confirm storefront `/api/leads/submit` is still routing to the legacy Monday path (i.e., F2 has NOT happened yet) — so no live customer writes can race the wipe.

---

## 12. Foreman handoff

Single Rung. Linear flow:

```
Edit importer (D-1..D-7) → integrity gate
   ↓
Run parity-dry-run.mjs → write parity report
   ↓ STOP if dry-run fails or counts off
   ↓
Ask Daniel "wipe prizma now? Y/N"
   ↓ Wait for verbal proceed
   ↓
Run wipe SQL block → verify zero
   ↓
Run live import → expect 10-15 min
   ↓
Run verification queries → check tolerances
   ↓
Write EXECUTION_REPORT + FINDINGS
   ↓
Commit + push (selective)
```

---

## 13. Lessons from prior SPECs

- M4_LEAD_EYE_EXAM_DEFAULT discovered the data path went through a view, not a direct table. This SPEC's data path is a Node.js script writing to DB via `@supabase/supabase-js` — same pattern as the existing importer. No view layer.
- M4_AUTOMATION_ENGINE_SERVER_SIDE Rung 1 had a deploy regression from manual code transcription (lead-intake v21). Lesson applied: this SPEC explicitly tells the executor to commit only after dry-run + verification pass. No "edit-and-deploy-blind" steps.
- C-001 had a stop-on-uncommitted-WIP that wasted 3 turns. Daniel has already authorized "intentional WIP" for this session. Don't ask again.
- The `git push origin main` GH013 lesson: this SPEC ships ONLY to develop (no main push needed — the importer is a script, not deployed code).

---

## 14. Real-time deltas applied 2026-05-03 (record-only)

Added by opticup-executor on 2026-05-03 after pre-flight surfaced 5 SPEC-vs-reality mismatches. Daniel resolved each verbally; deltas recorded here so the SPEC, EXECUTION_REPORT, and FOREMAN_REVIEW remain consistent.

### Δ-1 — Source bundle expanded to 4 files
SPEC §5.2 listed 3 files; D-1 / D-3 require Events_Record. Daniel re-exported `Events_Record_Attendees_1777803351.xlsx` into the same `monday-exports-2026-05-03/` folder during pre-flight. Final file list:
- `Tier_2_Master_Board_1777800752.xlsx`
- `Events_Management_1777800770.xlsx`
- `Events_Record_Attendees_1777803351.xlsx` ← added
- `Facebook_ADS_1777800801.xlsx`

CX_Ambassadors and Affiliates were intentionally NOT re-exported (their entities are dropped in Δ-4).

### Δ-2 — Importer architecture: keep SQL-emitter, do not rewrite to direct writes
SPEC §5.1/§5.4 implied direct DB writes via CLI flag. Reality: existing importer emits batched SQL files under `_sql/` for execution by Supabase MCP. Daniel directive: keep SQL-emitter architecture (safer — failures recoverable mid-flow). Operational flow:
1. `node import-monday-data.mjs --source-dir ... --tenant-id ...` → emits `_sql/01_events.sql … _sql/NN_*.sql`.
2. Executor runs each SQL file in order via `mcp__claude_ai_Supabase__execute_sql`.
3. After each file: row-count verification before next.

### Δ-3 — CLI flags added (additive, backward-compat)
Both `import-monday-data.mjs` and `parity-dry-run.mjs` gain `--source-dir <path>` and `--tenant-id <uuid>`. No flag = old hardcoded path (`campaigns/supersale/exports/`) for backward compat.

File resolution: when `--source-dir` is provided, the script scans the directory for files matching the prefix patterns (e.g. `Tier_2_Master_Board_*.xlsx`) and uses the first match — so the timestamp suffix in the filename does not need to be hardcoded.

### Δ-4 — Entity scope reduced from 8 to 4
Daniel directive ("כל השאר לא רלוונטי"). Final entities migrated this run:

| Entity | Decision |
|---|---|
| events | KEEP |
| leads | KEEP |
| event_attendees | KEEP |
| ad_spend | KEEP (wired into `crm_facebook_campaigns` + `crm_ad_spend` per M4_CAMPAIGNS_V2) |
| affiliates_enrich | DROP |
| lead_notes | DROP |
| cx_surveys | DROP |
| audit_log | DROP |

The dropped functions are removed from `main()`. Their helpers stay in the source file for now (deletion deferred to a post-cutover cleanup SPEC) — but they are NOT called.

### Δ-5 — Schema fields verified by Overseer (doc drift only)
SPEC §5.5 references `crm_leads.source`, `crm_event_attendees.coupon_sent`, `crm_event_attendees.coupon_sent_at`. All three exist on the live DB (verified via direct query by the Overseer). The `modules/Module 4 - CRM/docs/db-schema.sql` patches do not surface them. No SPEC blocker; logged as M4-DEBT-01 doc-drift backlog finding.

### Δ-6 — D-2 location correction (executor finding)
SPEC §3 D-2 says "Skip Tier_2 col 14 (vision questionnaire summary text) entirely." The vision questionnaire actually lives in **Events_Record col 14 ("Optic Summery")**, not Tier_2 col 14 ("Events Attended"). Either way, the existing importer never wrote either column to `client_notes`, so D-2 is effectively a no-op (already true). Logged in FINDINGS.md as a SPEC text correction.

### Δ-7 — D-7 corrupt-phone rule broader than SPEC text
SPEC §3 D-7 says "If a phone is 12-digit and starts with 972, strip the leading 972 then normalize." Inspection of Tier_2 rows 222 and 710 shows:
- Row 222 phone = `9720528088322` (**13 digits**, leading `972`) — strip leading 3 chars → `0528088322` → existing 10-digit `05*` path → `+972528088322`.
- Row 710 phone = `526411712972` (**12 digits**, **trailing** `972`) — strip trailing 3 chars → `526411712` → existing 9-digit `5*` path → `+972526411712`.

Neither row is "12-digit starts with 972" as the SPEC literal says. Encoded broader rule:
- `length === 13 && startsWith('972')` → strip leading 3 chars, recurse.
- `length === 12 && endsWith('972')` → strip trailing 3 chars, recurse.

The pre-existing `length === 12 && startsWith('972')` rule (valid mobile, no fix needed) is preserved.

---

*End of SPEC.*
