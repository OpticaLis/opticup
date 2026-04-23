# FINDINGS — P5_5_EVENT_TRIGGER_WIRING

> **Location:** `modules/Module 4 - CRM/go-live/specs/P5_5_EVENT_TRIGGER_WIRING/FINDINGS.md`
> **Written by:** opticup-executor
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — SPEC §12.1 TIER2_STATUSES slugs do not match live code

- **Code:** `M4-SPEC-P55-01`
- **Severity:** MEDIUM
- **Discovered during:** Step 5 Test 1 (event status change → bulk dispatch) — only 1 of 3 seeded leads received messages.
- **Location:** `modules/Module 4 - CRM/go-live/specs/P5_5_EVENT_TRIGGER_WIRING/SPEC.md` §12.1 and §13 Step 1 bullet 6.
- **Description:** SPEC §12.1 declares `TIER2_STATUSES` as `waiting_for_event, invited, confirmed_attendance` and provides the same list as a hardcoded fallback for `dispatchEventStatusMessages`. The actual `window.TIER2_STATUSES` — populated by `modules/crm/crm-helpers.js:67` — is `waiting, invited, confirmed, confirmed_verified, not_interested, unsubscribed`. Only `invited` matches between the two sets. Had `window.TIER2_STATUSES` been undefined at runtime (e.g. load-order regression), the dispatch would have matched zero leads.
- **Reproduction:**
  ```
  grep -n TIER2_STATUSES modules/crm/crm-helpers.js
  # → TIER2_STATUSES = ['waiting','invited','confirmed','confirmed_verified','not_interested','unsubscribed']
  ```
- **Expected vs Actual:**
  - Expected: SPEC slugs match live `crm-helpers.js` TIER2_STATUSES.
  - Actual: SPEC has stale slugs from an earlier taxonomy.
- **Suggested next action:** DISMISS (fallback already corrected in fix commit `9b6b338`). No separate SPEC needed; this FINDING is the record.
- **Rationale for action:** The code-side correction landed in the executor's +1 fix commit. The SPEC author (Foreman) should note the miss for future SPEC authoring (Cross-Reference Check §11.5 should read the helper file, not just GLOBAL_MAP) — that's a process improvement, not a re-open.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — `crm_broadcasts.employee_id NOT NULL` silently killed the wizard send button pre-P5.5

- **Code:** `M4-BUG-P55-02`
- **Severity:** HIGH
- **Discovered during:** Step 5 Test 3 (broadcast wizard) first attempt — wizard "שלח ✓" produced no toast, no log rows, no broadcast rows; 400 in console.
- **Location:** `modules/crm/crm-messaging-broadcast.js` `doWizardSend()` lines ~242-248 (pre-P5.5 baseline, B5 era).
- **Description:** `crm_broadcasts.employee_id` column is `NOT NULL`, but the original INSERT (written in B5 and never touched until P5.5) did not supply it. The wizard button had apparently never actually been fired end-to-end since B5 — SESSION_CONTEXT even noted "send button is not yet wired". The P5.5 SPEC §12.4 described the swap in semantics but did not ask the executor to audit the existing INSERT payload. Only browser QA caught the NOT NULL violation.
- **Reproduction:**
  ```sql
  SELECT column_name, is_nullable FROM information_schema.columns
  WHERE table_name = 'crm_broadcasts' AND column_name = 'employee_id';
  -- → NO
  ```
- **Expected vs Actual:**
  - Expected: broadcast INSERT succeeds, rows in `crm_broadcasts`.
  - Actual: INSERT fails silently (caught in `try/catch`, toast message showed generic error), broadcast count stayed 0.
- **Suggested next action:** DISMISS (wired and fixed in the same P5.5 +1 fix commit using `getCurrentEmployee()` from auth-service.js).
- **Rationale for action:** Fixed. The broader lesson (SPECs that swap internals on an already-broken function should include an INSERT payload audit step) is Foreman-improvement material.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — `send-message` Edge Function requires `variables.phone`/`variables.email` even in raw-body mode

- **Code:** `M4-BUG-P55-03`
- **Severity:** HIGH
- **Discovered during:** Step 5 Test 3 (broadcast wizard) second attempt — `crm_broadcasts` INSERT succeeded but every dispatch returned 400 `Missing variables.phone for SMS channel`; broadcast rows ended as `status=partial, total_failed=N`.
- **Location:** `supabase/functions/send-message/index.ts:172-176` checks `recipientPhone`/`recipientEmail` from `variables`, regardless of template vs raw-body mode. P5.5 SPEC §12.4 did not mention this requirement; the SPEC only said "raw mode with `body` + optional `subject`".
- **Description:** The Edge Function enforces recipient-in-variables for both template and raw-body paths — the recipient address must always come via `variables.phone` or `variables.email`. A broadcast caller sending only `{leadId, channel, body, subject}` with empty `variables` is rejected. Event status dispatch and registration confirmation both happened to populate `{name, phone, email}` in variables (for substitution), so they passed — but the broadcast wizard was the first caller to truly test raw-body mode and it sent `variables: {}`.
- **Reproduction:**
  ```
  curl -X POST .../functions/v1/send-message -d '{"tenant_id":"...","lead_id":"...","channel":"sms","body":"test","language":"he"}'
  # → 400 {"ok":false,"error":"Missing variables.phone for SMS channel"}
  ```
- **Expected vs Actual:**
  - Expected: raw body dispatch succeeds when caller supplies `body` + basic fields.
  - Actual: EF requires `variables.phone` (or `.email` for email channel) regardless of mode.
- **Suggested next action:** NEW_SPEC — dual purpose. (a) Document this contract in `modules/crm/crm-messaging-send.js` JSDoc so future callers don't forget. (b) Consider making the EF fetch recipient from DB when caller omits it (removes the burden from every caller, but expands EF scope — debate in a SPEC). Fixed in P5.5 by making the wizard fetch full lead rows before dispatch.
- **Rationale for action:** The bug is resolved for the broadcast wizard, but any new caller (e.g. future terms-approval trigger) will hit the same wall. Documenting + considering EF contract refinement is worth a small SPEC.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — SPEC §10 "Tier 2 leads exist on demo tenant" marked ✅ but demo was empty

- **Code:** `M4-SPEC-P55-04`
- **Severity:** MEDIUM
- **Discovered during:** Step 1 Pre-Flight — `SELECT count(*) FROM crm_leads WHERE status IN ('waiting_for_event','invited','confirmed_attendance')` returned 0.
- **Location:** `SPEC.md` §10 Dependencies / Preconditions table.
- **Description:** SPEC §10 listed both "Tier 2 leads exist on demo tenant" (✅ P1/P2) and "At least 1 event on demo tenant" (✅ P2b) as already-satisfied preconditions. In reality, demo tenant had ZERO CRM data — SESSION_CONTEXT.md line 53 explicitly stated this ("Demo tenant has zero CRM data [...] still blocks fully automated browser testing"). The SPEC author did not cross-reference SESSION_CONTEXT when writing the dependencies table. The executor had to STOP at pre-flight and request guidance; Daniel authorized inline seeding as `(b)` path.
- **Reproduction:**
  ```
  grep -A2 'zero CRM' modules/Module\ 4\ -\ CRM/docs/SESSION_CONTEXT.md
  # → "Demo tenant has zero CRM data (leads/events/attendees) — still blocks..."
  ```
- **Expected vs Actual:**
  - Expected: SPEC §10 precondition statuses reflect real demo tenant state.
  - Actual: SPEC marked ✅ but SESSION_CONTEXT said ⬜.
- **Suggested next action:** DISMISS (lesson is Foreman-improvement: Cross-Reference Check §11.5 should read the module's SESSION_CONTEXT.md Known Gaps section, not just GLOBAL_MAP / GLOBAL_SCHEMA).
- **Rationale for action:** The gap is in SPEC authoring protocol, not in Optic Up code. Addressing in opticup-strategic skill. No code change needed.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 5 — Demo tenant seed phones triggered real SMS to strangers (blast radius incident)

- **Code:** `M4-OPS-P55-05`
- **Severity:** CRITICAL
- **Discovered during:** Step 5 browser QA Test 2 — Daniel interrupted execution after seeing unknown phone numbers in the test data.
- **Location:** `modules/Module 4 - CRM/go-live/specs/P5_5_EVENT_TRIGGER_WIRING/SPEC.md` §13 Step 1 (inline seed SQL fabricated ad-hoc).
- **Description:** Pre-flight seeded 3 leads on demo with fabricated phone suffixes `+972537889878, +972537889879, +972537889880`. Only the first is Daniel's real phone. The `send-message` Edge Function + Make scenario on demo is wired to REAL delivery (Global SMS + Gmail). When dispatch fired, real SMS+email went to two unknown recipients (phones `...9879`, `...9880`). Daniel halted the session, authorized a cleanup DELETE, and established a permanent rule: demo seed data may only use `0537889878` or `0503348349` (Daniel's two phones).
- **Reproduction:**
  ```sql
  SELECT phone FROM crm_leads WHERE source = 'p5_5_seed' AND phone NOT IN ('+972537889878','+972503348349');
  -- Pre-cleanup: 2 rows. Post-cleanup: 0 rows.
  ```
- **Expected vs Actual:**
  - Expected: test phones are known-safe (Daniel's personal lines or explicitly blocked numbers).
  - Actual: executor fabricated adjacent phone numbers, assuming they'd be "close enough to fake" — but demo actually sends.
- **Suggested next action:** NEW_SPEC — two tracks. (a) Document the approved-phone rule in `CLAUDE.md` §9 (Working Rules, Multi-Machine / QA subsection) so every future executor sees it without needing memory recall. (b) Add a pre-send safeguard to demo tenant: either `crm_leads.source='p5_5_seed'` auto-blocks dispatch, or demo's `send-message` env has a whitelist of recipient phones.
- **Rationale for action:** Rule lives in executor memory today (`feedback_test_data_phones.md`) but that does not bind agents operating without that memory. A hard guardrail in CLAUDE.md + infrastructure would prevent repeat incidents.
- **Foreman override (filled by Foreman in review):** { }
