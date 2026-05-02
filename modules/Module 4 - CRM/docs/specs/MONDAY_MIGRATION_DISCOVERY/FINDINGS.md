# FINDINGS — MONDAY_MIGRATION_DISCOVERY

> Issues discovered during execution that are NOT part of the SPEC scope.
> Per opticup-executor skill protocol: log here, do NOT fix in this SPEC,
> recommend new SPEC / TECH_DEBT entry / dismiss for each.

---

## F-1 [MEDIUM] `MONDAY_TO_OPTIC_UP_PARITY.md` claims columns on `crm_ad_spend` that don't exist on that table

**Location:** `modules/Module 4 - CRM/go-live/MONDAY_TO_OPTIC_UP_PARITY.md` §5 (Ad Spend), table rows for `ad_campaign_name`, `ad_campaign_id`, `daily_budget`, `status`, `event_type`, `utm_*`.

**Description:** The parity report routes Facebook ADS XLSX columns to
`crm_ad_spend.ad_campaign_name`, `.ad_campaign_id`, `.daily_budget`, `.status`,
`.event_type`. Live schema (verified via `information_schema.columns` on
2026-05-02) shows `crm_ad_spend` has only `id, tenant_id, campaign_id (text),
spend_date, total_spend, created_at, updated_at` — 7 columns total.

The other claimed columns (`name`, `status`, `event_type`, `daily_budget`,
`master`, `interests`, `raw_data`) live in the **separate** `crm_facebook_campaigns`
table (15 columns, last_synced_at, etc.).

The two tables serve different purposes:
- `crm_facebook_campaigns` = campaign metadata (one row per campaign_id, latest snapshot)
- `crm_ad_spend` = daily-spend rollup (one row per (campaign_id, spend_date))

The parity report conflates them.

**Impact:** if the migration script is implemented blindly from the parity
report, it will fail with "column does not exist" errors on every FB ADS
INSERT. The MAP §4.5 routes the columns correctly.

**Recommendation:** **Update parity report** as part of post-cutover cleanup
SPEC. Either:
(a) Delete §5 from parity report and refer to MAP §4.5
(b) Rewrite §5 to split `crm_facebook_campaigns` and `crm_ad_spend` into
    two sub-tables matching real schema.

**Severity:** MEDIUM. Doc-only finding, not a runtime issue today (no migration has run). It would have caused the migration script implementation to bug. Now that the MAP exists, the implementation reads from MAP not parity report — risk neutralized for cutover. But the parity report is still wrong, and any future reader will be confused.

**Suggested next action:** new TECH_DEBT entry (M4-DOC-PARITY-DRIFT). 1 SPEC, 30 minutes, post-cutover.

---

## F-2 [LOW] CX survey rich data fields lost on import

**Location:** `crm_cx_surveys` schema vs `CX_Ambassadors_Events_Management_1776697276.xlsx` columns.

**Description:** The Monday CX board has 16 columns including:
- Col 7 ציון משני (secondary rating) — separate score
- Col 13 Hebrew survey question answer
- Col 14 Russian survey question answer (bilingual)
- Col 15 Sec. SuperSale (workflow flag)

The Optic Up `crm_cx_surveys` schema has only `(rating, comment, google_review_sent, callback_requested, callback_done)`. The secondary rating and bilingual survey-question answers have no target column.

11 historical surveys lose this data on import. Daniel's CX program currently has no UI for these fields anyway — they were Monday-form-only.

**Recommendation:** add `crm_cx_surveys.raw_responses jsonb` column to capture all source fields verbatim, even if currently unused in UI. Future CX SPEC can surface them. Schema change: 1 ALTER TABLE + RLS policy review. Out of scope for cutover.

**Severity:** LOW. 11 rows × low business impact. Survey program is mostly post-event SMS-based, not these stale Monday-form responses.

**Suggested next action:** TECH_DEBT entry M4-CX-RAW-RESPONSES. 1 SPEC, 1 hour, post-cutover.

---

## F-3 [INFO] Tier_2 has columns suggesting per-lead message-channel preferences that aren't migrated

**Location:** `Tier_2_Master_Board` cols 10 (Email Messages), 26 (CX), 29 (Attended?).

**Description:**
- Col 10 `Email Messages` appears to be a workflow flag for "welcome email sent" with per-lead values. Currently DROPPED in MAP (no equivalent OpticUp column).
- Col 26 `CX` appears to be a Monday workflow trigger for "include in CX survey program" — DROPPED.
- Col 29 `Attended?` has values (`1`, `3`, `51`) suggesting it's a count column with broken formula — DROPPED.

These don't have OpticUp equivalents and aren't operational concerns post-cutover (the lead-intake EF + automation engine handles all this natively).

**Recommendation:** dismiss. Documented in MAP §4.1 as DROP rows. No follow-up needed.

**Severity:** INFO. No data loss of consequence — the live workflow that produced these values has been replaced.

**Suggested next action:** dismiss.

---

## F-4 [INFO] Existing import script writes SQL files but doesn't apply them

**Location:** `campaigns/supersale/scripts/import-monday-data.mjs` (739 lines).

**Description:** The existing import script reads XLSX, transforms data, and
writes `_sql/00_*.sql` through `_sql/08_*.sql` files (32 files, per parity-doc
expectations). It does NOT write to the live DB. To actually run a migration,
an operator would need to manually execute each SQL file in order.

This is fine as a sandboxed dry-run pattern. But the migration script the MAP
§9 blueprints — which is the production tool — needs to:
- Connect to Supabase via service role key
- Execute INSERTs in a single transaction
- Run verification queries between phases
- Soft-rollback on failure

So the existing 739-line import script is **a library, not the migration
runner**. The MIGRATION_SCRIPT_IMPLEMENTATION SPEC will need to wrap it.

**Recommendation:** dismiss. This is captured in MAP §9.1: "existing import-monday-data.mjs becomes the import-from-XLSX library it depends on."

**Severity:** INFO. Architectural clarity for the next SPEC.

**Suggested next action:** dismiss.

---

## Summary

| ID | Severity | Domain | Resolution path |
|---|---|---|---|
| F-1 | MEDIUM | Documentation | New TECH_DEBT entry M4-DOC-PARITY-DRIFT |
| F-2 | LOW | Schema | TECH_DEBT entry M4-CX-RAW-RESPONSES |
| F-3 | INFO | Migration scope | Dismissed |
| F-4 | INFO | Architecture | Dismissed |

No HIGH or CRITICAL findings. The discovery surfaced 7 DANIEL_DECISION items
(see MAP §5), but those are *decisions*, not *findings*.

---

*End of FINDINGS.md.*
