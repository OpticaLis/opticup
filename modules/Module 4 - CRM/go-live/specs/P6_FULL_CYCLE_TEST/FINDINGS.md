# FINDINGS — P6_FULL_CYCLE_TEST

> **Location:** `modules/Module 4 - CRM/go-live/specs/P6_FULL_CYCLE_TEST/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — SPEC §10 fallback SQL references nonexistent columns (`name`, `tier`)

- **Code:** `M4-SPECQ-P6-01`
- **Severity:** MEDIUM
- **Discovered during:** §12.1 Step 2 pre-flight baseline verification
- **Location:** `modules/Module 4 - CRM/go-live/specs/P6_FULL_CYCLE_TEST/SPEC.md` §10 "Missing leads" fallback INSERT
- **Description:** The fallback seed SQL in SPEC §10 references `crm_leads.name` (actual column: `full_name`) and `crm_leads.tier` (does not exist in schema). If any precondition check had failed and triggered this fallback, the INSERT would have crashed with "column does not exist". The executor worked around this by not needing the fallback (all preconditions passed), but the SPEC carries a latent failure mode.
- **Reproduction:**
  ```sql
  -- From SPEC §10:
  INSERT INTO crm_leads (tenant_id, name, phone, email, status, source, tier, terms_approved, marketing_consent) ...
  -- Actual schema (from information_schema.columns):
  -- id, tenant_id, full_name, phone, email, city, language, status, source, utm_*, client_notes, terms_approved, terms_approved_at, marketing_consent, unsubscribed_at, verified_phone, monday_item_id, created_at, updated_at, is_deleted
  ```
- **Expected vs Actual:**
  - Expected: SPEC SQL matches schema column names
  - Actual: SPEC uses `name` (should be `full_name`) and `tier` (does not exist; tier is implicit from `status`)
- **Suggested next action:** TECH_DEBT — add a pre-authoring convention to opticup-strategic that requires `information_schema.columns` verification for every SPEC that prescribes INSERT/UPDATE SQL.
- **Rationale for action:** No immediate bug impact on P6 (fallback not triggered), but a recurring risk pattern for future SPECs. The fix is a process change in opticup-strategic, not a code change.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — SPEC §3 criterion 7 HTTP code mismatch (200 expected, 409 actual for duplicate path)

- **Code:** `M4-SPECQ-P6-02`
- **Severity:** LOW
- **Discovered during:** §12.2 Step 5 lead-intake EF curl test
- **Location:** `SPEC.md` §3 row 7
- **Description:** The SPEC says `curl` to lead-intake EF should return `HTTP 200` with `"status":"created"` OR `"status":"duplicate"`. The actual EF behavior (documented in SESSION_CONTEXT P1 phase history: "Race-condition safety implemented (23505 unique_violation caught + converted to 409)") returns HTTP 409 for duplicate with body `{"duplicate":true,"is_new":false,"id":"...","existing_name":"..."}`. The semantics are correct but the HTTP code differs from SPEC text. Stop-trigger #1 ("returns anything other than 200/201 → STOP") would have been literally triggered if applied strictly.
- **Reproduction:**
  ```bash
  curl -X POST 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/lead-intake' \
    -H 'Content-Type: application/json' \
    -d '{"tenant_slug":"demo","name":"P6 Test Lead A","phone":"0537889878","email":"..."}'
  # Returns: HTTP 409 {"duplicate":true,"is_new":false,...}
  # SPEC expects: HTTP 200 {"status":"duplicate",...}
  ```
- **Expected vs Actual:**
  - Expected: HTTP 200 per SPEC text
  - Actual: HTTP 409 per EF implementation
- **Suggested next action:** DISMISS with SPEC-authoring note — add to opticup-strategic's checklist: "When citing expected HTTP codes for an EF, grep the EF source for `return new Response(...,{status:` first."
- **Rationale for action:** The behavior is correct (409 is the right code for duplicate). The SPEC text was imprecise, not the code. No code fix needed.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — Broadcast wizard step 5 summary silently overrides step 2 channel selection

- **Code:** `M4-UX-P6-03`
- **Severity:** LOW
- **Discovered during:** §12.6 Step 18 WhatsApp channel guard test
- **Location:** `modules/crm/crm-messaging-broadcast.js` (step 5 confirmation summary)
- **Description:** In the broadcast wizard, the user selects a channel in step 2 (WhatsApp/SMS/Email). If they later select a template in step 3 (templates are per-channel), the step 5 confirmation summary displays the **template's** channel, not the step 2 selection. For example: step 2 = WhatsApp → step 3 = SMS template "הזמנה לחדשים — SMS" → step 5 shows `ערוץ: SMS`. The UI does not warn the user that their channel selection was silently overridden. A user trying to send WhatsApp but inadvertently picking an SMS template will think they sent WhatsApp when SMS went out instead.
- **Reproduction:**
  1. Open Messaging Hub → Broadcast wizard → step 2 → select WhatsApp radio (default) → click הבא
  2. Step 3 → select any `— SMS` template → click הבא
  3. Step 4 → enter broadcast name → click הבא
  4. Step 5 shows "ערוץ: SMS" — not WhatsApp
- **Expected vs Actual:**
  - Expected: either (a) step 5 should respect step 2 and send WhatsApp (failing at the guard), OR (b) step 3 should filter templates to only show the step 2 channel's variants, OR (c) step 5 should display both "Requested: WhatsApp" and "Effective: SMS (from template)"
  - Actual: silent override, user unaware
- **Suggested next action:** NEW_SPEC (tiny) — filter templates in step 3 to match step 2 channel (option b). Simplest and matches the mental model "I've already chosen my channel."
- **Rationale for action:** Low severity because the WhatsApp guard in `CrmMessaging.sendMessage` catches genuine WhatsApp sends before they reach the EF; but the UX is misleading. Could cause confusion later when WhatsApp templates do exist (post-Meta-API).
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — `crm-messaging-send.js` file size drifted from SPEC author's assumption (39 → 70 lines)

- **Code:** `M4-SPECQ-P6-04`
- **Severity:** INFO
- **Discovered during:** Phase A pre-commit baseline check
- **Location:** `modules/crm/crm-messaging-send.js`
- **Description:** SPEC §3 criterion 6 stated "≤60 lines (was 39, JSDoc adds ~15-20)". Actual file at P6 start was 70 lines — file grew during P5.5 when raw-body mode + channel validation + variable-XOR logic were added. The SPEC author (Cowork session happy-elegant-edison) wrote the precondition against a pre-P5.5 snapshot. The ceiling was amended mid-execution to ≤95 with Daniel authorization; final file is 93 lines.
- **Reproduction:**
  ```bash
  wc -l modules/crm/crm-messaging-send.js  # at SPEC-authoring time: SPEC assumed 39
  # Actual at P6 start: 70
  # After JSDoc add: 93
  ```
- **Expected vs Actual:**
  - Expected: SPEC preconditions match live file state
  - Actual: SPEC preconditions drifted ~30 lines from reality
- **Suggested next action:** DISMISS with process note — this is the same recurring pattern as Finding 1 and Finding 2. The opticup-strategic skill should include a "live-reality check" step before finalizing any SPEC that prescribes quantitative preconditions (line counts, row counts, HTTP codes, column names).
- **Rationale for action:** Already surfaced in Proposal 1 of EXECUTION_REPORT §8. Rolling into the broader "SPEC-authoring precondition verification" theme.
- **Foreman override (filled by Foreman in review):** { }
