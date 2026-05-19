# FINDINGS — M4_PIXEL_VALIDATION_GAP_DASHBOARD

> Executor: claude-sonnet-4-6 | Date: 2026-05-19 | SPEC: M4_PIXEL_VALIDATION_GAP_DASHBOARD

---

## F-1 (INFO) — SPEC author SQL uses `l.name` but `crm_leads` column is `full_name`

- **Severity:** INFO
- **Location:** SPEC §3.5 Q3 SQL + `modules/crm/crm-pixel-gap-tile.js` (corrected at authoring)
- **Description:** SPEC §3.5 Q3 illustrative SQL references `l.name`. The actual `crm_leads` column is `full_name`. Confirmed via `information_schema.columns` probe. Tile was written with correct column names. SPEC SQL was illustrative and not live-validated at author time.
- **Suggested next action:** Foreman note in FOREMAN_REVIEW that SPEC illustrative SQL should be verified against live schema. See EXECUTION_REPORT P-EXEC-1.
- **Disposition:** INFO — corrected inline; no follow-up SPEC needed.

---

## F-2 (INFO) — SPEC F-A1 confirmed: knowledge-map file still missing at execution

- **Severity:** INFO
- **Location:** `roles/site-overseer/knowledge-build/funnel-q3/M4_PIXEL_VALIDATION_GAP_QUERY.md`
- **Description:** File does not exist on disk — confirmed at execution time. SPEC §3.5 is the authoritative query reference; this SPEC was unaffected. File is still cited in the Brief and Activation Prompt.
- **Suggested next action:** Create as a standalone chore commit, or remove citation from Brief + Activation Prompt.
- **Disposition:** INFO — low priority.

---

## F-3 (INFO) — Demo has 2 existing gap rows; Localhost-Tester needs no test insert for populated-state

- **Severity:** INFO
- **Location:** demo tenant `crm_leads` (fb_event_id IS NOT NULL AND fb_pixel_fired_at IS NULL)
- **Description:** Q3 EXPLAIN ANALYZE returned actual rows=2 on demo. The tile will show populated state without a manual test row. Localhost-Tester can skip the test insert for criterion 6b.
- **Disposition:** INFO — helpful for LH-Tester.

---

## F-4 (INFO) — Q1 cold-read 79.5ms; partial index deferred but warrants a scale-milestone trigger

- **Severity:** INFO
- **Location:** `crm_leads` table, sequential scan, Supabase shared instance
- **Description:** Q1 ran 79.5ms cold (95 buffers, 1,356 rows scanned). Below the 100ms gate but higher than ideal. Production scale (5K+ leads in window) may push past threshold. Index deferred per D4 decision (all medians <100ms).
- **Suggested next action:** Add TECH_DEBT or OPEN_TASKS trigger to revisit `idx_crm_leads_capi_gap_partial` when Prizma `crm_leads` 30-day window rows exceed ~5,000 or a second tenant joins.
- **Disposition:** INFO — tracked for scale milestone.
