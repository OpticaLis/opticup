# FINDINGS — M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE / Rung 1

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE/RUNG_1_FINDINGS.md`
> **Written by:** opticup-executor (during Rung 1 execution, append-only)
> **Review disposition:** decided by Foreman in `RUNG_1_FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — `is_deleted` not filtered in get_campaign_performance CTEs

- **Code:** `M4-DEBT-CV2-01`
- **Severity:** MEDIUM
- **Discovered during:** Step 1.5 DB Pre-Flight (column inventory of `crm_leads` and `crm_event_attendees`)
- **Location:** `modules/Module 4 - CRM/migrations/2026_05_02_campaigns_v2_01_schema_and_function.sql` — CTEs `range_leads` and `range_attendees`
- **Description:** Both `crm_leads` and `crm_event_attendees` carry an `is_deleted BOOLEAN NOT NULL` column (Iron Rule 3 — soft delete only). The new `get_campaign_performance` function counts soft-deleted leads (`leads_num`) and soft-deleted attendees (`buyers_num`, `total_revenue`) without filtering `is_deleted = false`. Net effect today: soft-deleted records inflate campaign metrics. The legacy view `v_crm_campaign_performance` (now dropped in Step 3 of the migration) likely behaved the same way, so this is not a regression — but Rung 1 was an opportunity to fix it and we did not, because the SPEC's verbatim SQL did not include the filter.
- **Reproduction:**
  ```sql
  -- Confirm the schema gap:
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='crm_leads' AND column_name='is_deleted';
  -- Then inspect the function definition to confirm no filter:
  SELECT pg_get_functiondef('get_campaign_performance(uuid,date,date)'::regprocedure);
  ```
- **Expected vs Actual:**
  - Expected: campaign metrics exclude soft-deleted records.
  - Actual: campaign metrics include them.
- **Suggested next action:** TECH_DEBT (or fold into Rung 3 polish if Foreman wants the fix shipped before cutover)
- **Rationale for action:** Not a Rung-1 deviation — SPEC SQL was executed verbatim. But it is a latent metric-quality issue worth a one-line CTE-WHERE addition. Easy to fix; risk of behaviour change for any tenant that ever soft-deleted a lead/attendee.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — SPEC §5.4 verification query has a type-mismatch bug

- **Code:** `M4-SPEC-CV2-01`
- **Severity:** LOW
- **Discovered during:** §5.4 EXPLAIN ANALYZE verification
- **Location:** `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE/RUNG_1_ACTIVATION_PROMPT.md` §5.4
- **Description:** The §5.4 query passes `CURRENT_DATE - INTERVAL '30 days'` as the `p_range_start` argument. In Postgres, `date - interval` returns `timestamp without time zone`, not `date`. The function signature requires `DATE`, so the call fails with `42883: function get_campaign_performance(uuid, timestamp without time zone, date) does not exist`. A `::date` cast on the expression resolves it.
- **Reproduction:**
  ```sql
  -- Fails:
  SELECT * FROM get_campaign_performance(
    (SELECT id FROM tenants WHERE slug='prizma'),
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE);
  -- Works:
  SELECT * FROM get_campaign_performance(
    (SELECT id FROM tenants WHERE slug='prizma'),
    (CURRENT_DATE - INTERVAL '30 days')::date,
    CURRENT_DATE);
  ```
- **Expected vs Actual:**
  - Expected: query runs and returns a plan.
  - Actual: query errored on type mismatch; required adding `::date`.
- **Suggested next action:** DISMISS (paper bug; correct in any future SPEC that copies the snippet) — or NEW_SPEC line-edit if SPEC is reused as a template.
- **Rationale for action:** SPEC text is one-shot for this Rung; future SPECs should prefer `(CURRENT_DATE - 30)::date` or `CURRENT_DATE - 30` (`date - integer = date`) to avoid the trap.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — Semantic name reuse: `city`, `start_time` on adjacent tables

- **Code:** `M4-INFO-CV2-01`
- **Severity:** INFO
- **Discovered during:** §2.6 cross-table column-name collision check
- **Location:** new columns `crm_facebook_campaigns.city`, `crm_facebook_campaigns.start_time` vs existing `crm_leads.city`, `customers.city`, `crm_events.start_time`
- **Description:** §2.6 of the prompt asks the executor to flag column-name collisions on OTHER tables. Hits found: `city` (4 places), `start_time` (2 places). All represent semantically related but distinct concepts — campaign-targeted city vs lead/customer city; campaign delivery start vs in-store event start. The Foreman explicitly named these columns in the SPEC's verbatim SQL (Decision 5.7 = Path X3 with `city`/`audience_label` landing zone), so this is pre-authorized rather than an unintended collision.
- **Suggested next action:** DISMISS
- **Rationale for action:** No actual collision; documenting only because the §2.6 check requires reporting. Future joins between campaign-city and lead-city should use explicit table aliases to avoid reader confusion.
- **Foreman override (filled by Foreman in review):** { }

---
