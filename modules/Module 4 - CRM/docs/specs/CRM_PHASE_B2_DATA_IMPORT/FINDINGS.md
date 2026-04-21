# FINDINGS — CRM_PHASE_B2_DATA_IMPORT

> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_PHASE_B2_DATA_IMPORT/FINDINGS.md`
> **Written by:** opticup-executor (Claude Code / Windows desktop)
> **Written on:** 2026-04-20
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — Events_Record col 0 is NAME, not phone (DATA_DISCOVERY_REPORT mapping wrong)

- **Code:** `M4-DATA-01`
- **Severity:** HIGH
- **Discovered during:** SPEC §8 Step 6 (Attendees import) — initial run produced 0 attendees.
- **Location:** `campaigns/supersale/DATA_DISCOVERY_REPORT.md` §2.4 row 1
- **Description:** The report maps Monday column `טלפון` to col 1 (1-based) and claims col 3 "Phone Number" is "duplicate of col 1, skip". In practice, Monday's Excel export places the **item-name** in col 0 (which happens to be labeled `טלפון` as the column title in Monday), while the actual phone number lives in col 2 (header "Phone Number"). The report's col 1 mapping and the "duplicate, skip" instruction for col 3 are therefore both wrong.
- **Reproduction:**
  ```
  node -e "const X=require('xlsx');const w=X.readFile('campaigns/supersale/exports/Events_Record_Attendees_1776697299.xlsx',{cellDates:true});const r=X.utils.sheet_to_json(w.Sheets[w.SheetNames[0]],{header:1,raw:true,defval:null});console.log('header:',r[2].slice(0,4));console.log('row3:',r[3].slice(0,4))"
  ```
  Header shows `טלפון` at col 0 but data row 3 col 0 is `"אלי ברק"` (a name), while col 2 is `972534275678` (the actual phone).
- **Expected vs Actual:**
  - Expected (per report): col 0 = phone to normalize, col 2 = duplicate skip
  - Actual (in exports): col 0 = item-name (attendee name), col 2 = real phone number
- **Suggested next action:** NEW_SPEC (correct the DATA_DISCOVERY_REPORT and re-check §2.4, §2.8 for the same Monday-export quirk)
- **Rationale for action:** DATA_DISCOVERY_REPORT is the authoritative mapping reference for future SPECs (B3/B4 will add new exports). Leaving a known-wrong mapping in the report will bite the next executor. A small `docs(crm)` correction SPEC is appropriate.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — 42 Events_Record attendees (22%) have phones absent from Tier 2 Master Board

- **Code:** `M4-DATA-02`
- **Severity:** HIGH
- **Discovered during:** SPEC §8 Step 6 execution (attendee import) — rest-import.mjs reported `149 attendees (42 orphan refs skipped)`.
- **Location:** `campaigns/supersale/exports/Events_Record_Attendees_1776697299.xlsx` vs `Tier_2_Master_Board_1776697136.xlsx`
- **Description:** Of 191 de-duplicated `(phone, event_number)` attendee candidates, 42 (22%) have a phone number that does not appear in Tier 2. These are concentrated in early events (13–17, Jan–Feb 2026) — likely attendees from an older lifecycle that were archived to Events Record but never ingested into the current Master Board. The DB's FK constraint on `crm_event_attendees.lead_id` correctly prevents insertion, so the rows are silently dropped during the JOIN-based insert.
- **Reproduction:**
  ```sql
  -- Total attendees (expected 191, got 149)
  SELECT count(*) FROM crm_event_attendees WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
  -- Orphan candidates (42): in Events Record but not in crm_leads
  -- See campaigns/supersale/scripts/import-skipped.json → search by file
  ```
- **Expected vs Actual:**
  - Expected (SPEC §3 criterion 6): 200–215 attendees
  - Actual: 149 inserted, 42 would-be rows lack a lead_id in Tier 2
- **Suggested next action:** NEW_SPEC — a small "Phase B2.1: Attendee-lead backfill" SPEC that either (a) extracts the 42 unique phones from import-skipped.json, creates matching `crm_leads` stub rows with `source='historical_import'`, then reruns the attendee import, OR (b) accepts the 149 number and documents the gap in SESSION_CONTEXT.
- **Rationale for action:** The SPEC §3 range 200–215 wasn't met. This is neither an execution bug nor an SPEC authoring bug — it's a true data-divergence finding between two Monday boards. Foreman should decide backfill vs accept.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — CX surveys = 8 not 11 (3 reference skipped attendees)

- **Code:** `M4-DATA-03`
- **Severity:** MEDIUM
- **Discovered during:** SPEC §3 criterion 10 verification post-import.
- **Location:** `crm_cx_surveys`
- **Description:** Of 11 CX survey rows in `CX_Ambassadors_Events_Management_1776697276.xlsx`, 3 reference attendees whose `(lead_id, event_id)` combination doesn't exist in `crm_event_attendees` because those attendees are among the 42 orphans from M4-DATA-02. CX surveys cannot exist without a parent attendee (`attendee_id` is NOT NULL).
- **Reproduction:**
  ```sql
  SELECT count(*) FROM crm_cx_surveys WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
  -- expected 11, got 8
  ```
- **Expected vs Actual:**
  - Expected (SPEC §3 criterion 10): 11
  - Actual: 8 inserted, 3 skipped because their parent attendee was also skipped (cascade from M4-DATA-02)
- **Suggested next action:** DISMISS if M4-DATA-02 gets NEW_SPEC (the backfill would recover these 3 too); else TECH_DEBT with pointer to M4-DATA-02.
- **Rationale for action:** This finding is fully derived from M4-DATA-02. It has no independent resolution path.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — MCP execute_sql is impractical for >10 INSERT batches in a single SPEC

- **Code:** `M4-SPEC-01`
- **Severity:** MEDIUM
- **Discovered during:** SPEC §8 Step 4 (leads import) — after 5 of 9 batches (~120K tokens burned).
- **Location:** SPEC §12 "INSERT Strategy" paragraph; opticup-executor skill
- **Description:** SPEC §12 mandates: *"Use Supabase MCP execute_sql with batch INSERTs (50–100 rows per call) … Do NOT use the Supabase JS client or REST API."* In practice, each execute_sql call requires the full SQL text to be in the conversation context twice (once from Read, once as the `query` parameter). With 30+ batches needed (leads 9, affiliates 9, notes 7, attendees 2, ad_spend 1, cx 1, audit 1) at ~28KB each, the token cost approaches ~900K — very close to the 1M context limit. The SPEC acknowledges "to avoid hitting request limits" in the narrow sense of the MCP single-call limit but did not anticipate the conversation-level token limit of the executor.
- **Reproduction:** Attempt to execute 30 × 100-row INSERT batches via `mcp__claude_ai_Supabase__execute_sql`. Each Read + execute cycle consumes ~30K tokens. Context exhaustion before task completion.
- **Expected vs Actual:**
  - Expected: smooth execution within SPEC envelope
  - Actual: deviation to PostgREST `/rest/v1/<table>` with service_role JWT was required; see EXECUTION_REPORT.md §3. Same server-side auth, same RLS bypass, same defense-in-depth `tenant_id` on every INSERT — only the transport differs.
- **Suggested next action:** NEW_SPEC (small) — update SPEC_TEMPLATE §12 and opticup-executor skill: for bulk DML of >5MB equivalent or >10 batches, recommend a one-shot Node runner that uses PostgREST or direct pg connection with service_role key, with an explicit checklist item confirming the transport choice. The functional guarantees (service_role, RLS bypass, tenant_id defense-in-depth) are what matter — not the specific MCP tool name.
- **Rationale for action:** Phases B3+ (message template import, Monday column map, Monday item_id backfill) will have similar bulk-import needs. Codifying the rule once prevents three more executor deviations.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 5 — crm_audit_log metadata shows `rows_imported: 191` for attendees, actual DB count is 149

- **Code:** `M4-DATA-04`
- **Severity:** LOW
- **Discovered during:** Post-execution sanity check of `crm_audit_log`.
- **Location:** `crm_audit_log WHERE entity_type='event_attendee' AND action='import'` for tenant Prizma
- **Description:** The audit_log summary row for the attendee import step records the in-memory candidate count (191 from `import-report.json`) rather than the post-FK-filter count (149 actually inserted). Same discrepancy applies to `entity_type='cx_survey'` (audit says 11, DB has 8).
- **Reproduction:**
  ```sql
  SELECT metadata->>'rows_imported', (SELECT count(*) FROM crm_event_attendees WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c')
  FROM crm_audit_log
  WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND entity_type = 'event_attendee' AND action = 'import';
  ```
- **Expected vs Actual:**
  - Expected: metadata.rows_imported == actual DB count after FK filter
  - Actual: metadata.rows_imported is the pre-filter candidate count
- **Suggested next action:** TECH_DEBT — add an `UPDATE crm_audit_log SET metadata = jsonb_set(metadata, '{rows_imported}', '149') WHERE ...` correction, OR change the runner to post-audit only after counting actual DB rows. Fix can be bundled with M4-DATA-02's backfill SPEC.
- **Rationale for action:** Audit log integrity is important for SaaS customers; this is a minor discrepancy that should be cleaned up but doesn't block Phase B3.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 6 — Event 22 has 84 registered in DB vs 87 in Monday board

- **Code:** `M4-INFO-08`
- **Severity:** INFO
- **Discovered during:** SPEC §8 Step 11 Spot-check #1.
- **Location:** `v_crm_event_stats WHERE event_number = 22`
- **Description:** Event 22 (אירוע המותגים מרץ 2026, Mar 27 2026) shows `total_registered = 84` whereas Monday's counter showed 87. The 3-row gap is explained by M4-DATA-02 — 3 of the 42 phone-orphan attendees belong to event 22. Other metrics match or exceed Monday: `total_attended = 33` (Monday: 32), `total_purchased = 31` (Monday: 31), `total_revenue = ₪39,460.00` (Monday: ₪39,460 — **exact match**).
- **Reproduction:**
  ```sql
  SELECT event_number, total_registered, total_attended, total_purchased, total_revenue
  FROM v_crm_event_stats WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND event_number = 22;
  ```
- **Expected vs Actual:** Gap fully explained by M4-DATA-02; no independent issue.
- **Suggested next action:** DISMISS — fully derived from M4-DATA-02 resolution.
- **Rationale for action:** Informational only; revenue matches exactly, which is the most important business metric.
- **Foreman override (filled by Foreman in review):** { }
