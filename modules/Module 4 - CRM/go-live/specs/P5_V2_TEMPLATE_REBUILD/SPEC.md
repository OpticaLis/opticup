# SPEC — P5_V2_TEMPLATE_REBUILD

> **Module:** Module 4 — CRM
> **Location:** `modules/Module 4 - CRM/go-live/specs/P5_V2_TEMPLATE_REBUILD/`
> **Author:** Cowork (Campaign Overseer session, 2026-04-28)
> **Routed to:** opticup-strategic (Foreman) — for split into executable sub-SPECs and authoring of executor-ready instructions
> **Status:** UPDATED 2026-04-28 evening — Foreman's Question 1 answered + 4 new templates added (event_attendee_moved UNPAID + PAID pairs). Also reflects Foreman's 3 Rule-21 corrections (Decision #2: aliasing instead of DDL).
> **Priority:** Pre-cutover blocker — must land BEFORE M4 P7 cutover (2026-05-03)
> **Origin:** Cowork V2 message rebuild session 2026-04-28 — Daniel directed full rebuild of all SuperSale message templates as canon-compliant V2 before the new pipeline goes live. After 9/10 emails + 9/10 SMS were locked to files in `campaigns/supersale/MESSAGES_V2/`, this SPEC routes the database + automation work into the standard execution pipeline.

---

## 1. Goal

Translate 18 already-locked V2 message template files into operational state in the demo CRM pipeline, AND configure the 6 automation rules that fire them — so when M4 P7 cutover flips on Sunday 2026-05-03, the SuperSale event flow runs end-to-end on Optic Up native infrastructure with canon-compliant copy and zero hardcoded "50" / hardcoded "50 ₪" / un-resolved tenant variables.

The copy work is complete (locked in files). This SPEC is exclusively about: schema changes, DB UPDATEs, automation rule wiring, render verification, end-to-end smoke test on demo.

## 2. Background

### What's already done (IN FILES, AWAITING DB MIGRATION)

**22 V2 template files in `campaigns/supersale/MESSAGES_V2/`** (18 lifecycle + 4 manual-move added 2026-04-28 evening):

| # | Slug | Email file | SMS file |
|---|---|---|---|
| 1 | `lead_intake_new_*_he` | `email-welcome.html` | `lead_intake_new_sms_he.txt` |
| 2 | `lead_intake_duplicate_*_he` | `lead_intake_duplicate_email_he.html` | `lead_intake_duplicate_sms_he.txt` |
| 3 | `event_will_open_tomorrow_*_he` | `event_will_open_tomorrow_email_he.html` | `event_will_open_tomorrow_sms_he.txt` |
| 4 | `event_registration_open_*_he` | `event_registration_open_email_he.html` | `event_registration_open_sms_he.txt` |
| 5 | `event_invite_new_*_he` | `event_invite_new_email_he.html` | `event_invite_new_sms_he.txt` |
| 6 | `event_waiting_list_*_he` (REVIVED purpose) | `event_waiting_list_email_he.html` | `event_waiting_list_sms_he.txt` |
| 7 | `event_invite_waiting_list_*_he` | `event_invite_waiting_list_email_he.html` | `event_invite_waiting_list_sms_he.txt` |
| 8 | `event_2_3d_before_*_he` | `event_2_3d_before_email_he.html` | `event_2_3d_before_sms_he.txt` |
| 9 | `event_day_*_he` | `event_day_email_he.html` | `event_day_sms_he.txt` |
| 10 | `event_closed_*_he` | ❌ NOT migrated | ❌ NOT migrated |
| 11 | `event_attendee_moved_unpaid_*_he` | `event_attendee_moved_unpaid_email_he.html` | `event_attendee_moved_unpaid_sms_he.txt` |
| 12 | `event_attendee_moved_paid_*_he` | `event_attendee_moved_paid_email_he.html` | `event_attendee_moved_paid_sms_he.txt` |

**T10 NOT migrated by design:** Daniel directive 2026-04-28 — "אני רוצה שימשיכו להירשם לרשימת המתנה. זה לא חכם להשתמש בה." Over-capacity registrations get T6 (REVIVED) instead. Both T10 rows remain in seed file but MUST NOT be wired to any automation rule.

### What's NOT done (THIS SPEC)

1. **NO new DB columns on `crm_events`** (Foreman finding 2026-04-28): existing columns are `max_capacity` + `booking_fee` — alias in EF, no DDL.
2. **1 NEW JSONB column** `tenants.payment_links` (added 2026-04-28 evening): format `{"50": "https://prizmaoptic.short.gy/gmapy", "75": "...", ...}`. Required for the 2 new manual-move templates.
3. **22 UPDATE/INSERT statements** to `crm_message_templates` — replacing 18 legacy bodies + INSERT 4 new manual-move rows.
4. **3 NEW substitution variables / aliases in send-message EF:**
   - `%event_day_of_week%` — Hebrew weekday computed from `event_date`
   - `%event_max_attendees%` — alias of `crm_events.max_capacity`
   - `%event_deposit_amount%` — alias of `crm_events.booking_fee`
   - `%payment_url_<fee>%` — dynamic; EF reads `event.booking_fee`, builds variable name (e.g., `payment_url_50`), looks up `tenants.payment_links[fee]`. **MISSING-VALUE: send MUST fail with alert** (Daniel directive: "עדיף לא לשלוח מאשר לשלוח שבור"). No fallback URL.
5. **6 automation rules** in `crm_automation_rules` (existing table; engine extension per Foreman finding):
   - 2.1: new lead → check active event → T5 if exists else T1
   - 2.2: T5 sent → set attendee status to `הוזמן`
   - 2.3: register over-capacity → T6 (instead of standard confirmation)
   - 2.4: parallel event opens → T7 to active waitlist
   - 2.5: 3 days before event → T8 (configurable time, queue-insertion via existing `crm_message_queue`)
   - 2.6: event day morning → T9 (configurable time, queue-insertion via existing `crm_message_queue`)
   - **2.7 (NEW 2026-04-28 evening):** manual move action with toggle ON → fire UNPAID or PAID pair based on attendee payment status for source event. Toggle default OFF (silent move). Implemented in admin UI move dialog + manual-move RPC.
6. **2 product features** (CRM admin UI / RPC):
   - 6.1: cross-event registration move logic in `register_lead_to_event` RPC
   - 6.2: manual attendee move between events (admin UI) — includes the "Send customer notification" toggle that fires rule 2.7
7. **Render verification + end-to-end smoke test** on demo tenant — **22 templates** (was 18).

### What's NOT in scope

- **Migration of T10:** explicitly excluded by Daniel.
- **Tenant-variable plumbing (SPEC #11 of design canon):** all Prizma values are hardcoded inline in V2 files; SPEC #11 is deferred until tenant 2 onboards. Foreman should NOT introduce `{{tenant.X}}` substitution as part of this SPEC.
- **Production deploy:** this SPEC lands on demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`). Production cutover happens at M4 P7 (2026-05-03 morning, separate operational event, not a code SPEC).
- **Storefront / lead-intake form changes:** the form already exists; this SPEC only changes what messages it triggers.
- **Confirmation modal redesign:** P21 SPEC handles that separately.
- **Historical message migration:** legacy messages in `crm_message_logs` stay as-is; new logic only applies forward.

### Source documents (FOREMAN MUST READ before splitting)

1. `campaigns/supersale/MESSAGES_V2/NEW_SYSTEM_VARIABLES_REQUIRED.md` — the master pre-cutover checklist (5 variables, 6 automation rules, 2 product features, validation steps). **Single source of truth for system wiring**.
2. `campaigns/supersale/MESSAGES_V2/*.html` — 9 V2 email files
3. `campaigns/supersale/MESSAGES_V2/*.txt` — 9 V2 SMS files
4. `roles/campaign-overseer/COPY_DECISIONS_LOG.md` — full rationale for every copy decision (P1-P11 patterns + per-template change logs). Foreman should NOT re-litigate copy decisions.
5. `modules/Module 4 - CRM/go-live/seed-templates-demo.sql` — current seeded templates (line numbers in HANDOFF §11 table). UPDATE statements will modify these rows in place.

---

## 3. Hypothesis Ladder

This work has 4 distinct risk tiers that should drive the sub-SPEC split:

### Rung 1 — Schema & variable plumbing (LOWEST RISK, PREREQUISITE)
- Add `crm_events.deposit_amount` column (default 50, numeric)
- Verify `crm_events.max_attendees` column exists; add if missing
- Implement `%event_day_of_week%` substitution in send-message Edge Function
- Verify all §1.1 variables in NEW_SYSTEM_VARIABLES_REQUIRED still resolve

**Why first:** every later rung depends on these existing. If they're not there, UPDATE statements still work but rendering breaks at send-time.

### Rung 2 — Template UPDATE migration (LOW RISK, REVERSIBLE)
- 18 UPDATE statements (9 emails + 9 SMS) to `crm_message_templates` for demo tenant only
- One transaction, idempotent (DELETE + INSERT pattern matching the seed file's existing structure, OR plain UPDATE)
- Verify by smoke-rendering each template against a representative demo event with all variables populated; expect ZERO literal `%X%` in rendered output

**Why second:** templates without working variables render with literal placeholders, which is a visible production bug at 2026-05-03. Sequencing this AFTER Rung 1 prevents that.

### Rung 3 — Automation rule wiring (MEDIUM RISK, BEHAVIOR-CHANGING)
- Configure 6 automation rules in `crm_automation_rules` (or equivalent table)
- Test each rule's trigger fires correctly + correct template is selected + recipient list is correct
- Idempotency check via `crm_message_logs` for scheduled rules (2.5, 2.6)

**Why third:** rules WITHOUT correct templates underneath would send wrong content. Rules sequenced after templates means failures during rule-test surface as "rule fired correct template" — clean signal.

### Rung 4 — Product features (HIGHER RISK, RPC + UI WORK)
- 5.1: `register_lead_to_event` RPC must handle cross-event move (lead on waitlist of event A registers for event B)
- 5.2: admin UI "Move attendee to event…" action with audit trail + deposit transfer logic
- 5.2 has an OPEN DECISION: notification on manual move (auto-email vs. silent). **FOREMAN MUST surface this to Daniel before SPEC authoring.**

**Why last:** these are net-new features that don't block the cutover (cutover delivers automated rules; manual move is a CRM admin UX feature usable post-cutover). If timeline is tight, Rung 4 can ship a week after cutover.

---

## 4. Success Criteria

All measurable, all binary pass/fail. Numbered for traceability.

### Schema (Rung 1)
1. ✅ `crm_events.deposit_amount` column exists. Type: numeric. Default: 50. Nullable: false.
2. ✅ `crm_events.max_attendees` column exists. Type: numeric/integer. Nullable: false. Default: explicit per-event (no project-wide default — each event configures its own).
3. ✅ `%event_day_of_week%` resolves to the correct Hebrew weekday string when send-message Edge Function processes a template containing it. Verified by unit-rendering against a Sunday/Tuesday/Friday event date and asserting the output ("יום ראשון" / "יום שלישי" / "יום שישי").

### Templates (Rung 2)
4. ✅ All 9 V2 email bodies in `crm_message_templates` for demo tenant match the V2 file contents byte-for-byte (CRLF normalization allowed). Verified by `SELECT body FROM crm_message_templates WHERE slug='X'` for each slug, comparing against the V2 file.
5. ✅ All 9 V2 SMS bodies in `crm_message_templates` match the V2 .txt files byte-for-byte (preserve blank lines per Pattern P8).
6. ✅ T10 emails + SMS rows are present in seed (do not delete them) but `is_active = false` OR not referenced by any rule. Verify no automation rule points to T10 slugs.
7. ✅ Render-verify: send each template through the Edge Function render pipeline against a demo event with all variables populated. Output contains ZERO literal `%X%` substrings. Variables that WOULD render to empty strings (e.g., a missing optional field) are explicitly checked — Foreman must list which fields are required vs. optional in the sub-SPEC.

### Automation rules (Rung 3)
8. ✅ Rule 2.1 fires correctly: insert a new test lead during a window when `crm_events` has an `open_for_registration` row → test lead receives T5 (email + SMS), not T1. Insert during a window with NO open events → receives T1.
9. ✅ Rule 2.2 fires correctly: T5 send completion triggers an `UPDATE crm_event_attendees SET status='הוזמן'` for that lead+event.
10. ✅ Rule 2.3 fires correctly: with an event at `max_attendees`, register one more lead → that lead gets T6, NOT the standard registration confirmation. Verify `crm_event_attendees.status='המתנה'`.
11. ✅ Rule 2.4 fires correctly: with at least one lead on `המתנה` for event A, create event B with `status=open_for_registration` → that lead receives T7 referencing event B (not event A). Filter discipline: if a closed/past event has `המתנה` rows, those leads are NOT in the recipient list.
12. ✅ Rule 2.5 fires correctly: configure event with `event_date=today+3d, send_time=10:00`, wait until 10:00, verify confirmed attendees received T8. Idempotency: re-running the scheduler does not re-send.
13. ✅ Rule 2.6 fires correctly: configure event with `event_date=today, send_time=08:00`, wait, verify confirmed attendees received T9. Idempotency same as 2.5.

### Product features (Rung 4)
14. ✅ `register_lead_to_event` RPC handles cross-event move: lead on event A waitlist registers via event B form → lead status on event A becomes `מבוטל-עבר` (or DELETE+audit), lead status on event B becomes `מאושר`. Deposit applied to event B's ledger, not double-charged on A.
15. ✅ Admin UI "Move attendee to event…" action exists, transfers status correctly, transfers deposit correctly, writes audit log entry.
16. ✅ Daniel decision logged on §3.2 of NEW_SYSTEM_VARIABLES_REQUIRED — auto-email or silent on manual move.

### Cutover-readiness validation
17. ✅ End-to-end smoke test on demo: create event → register lead via public form → receives T1 SMS + email → registration opens → leads receive T4 SMS + email → fill capacity → next lead receives T6 SMS + email → 3 days before → T8 → event day → T9. All messages render with ZERO literal `%X%` substrings.

### Repo hygiene
18. ✅ Clean repo at session end (`git status` returns "nothing to commit, working tree clean"). Iron Rule 31 integrity gate passes (`npm run verify:integrity`).
19. ✅ The 18 V2 files in `MESSAGES_V2/` MUST be committed to develop as part of this SPEC if they aren't already.

---

## 5. Foreman Decisions Required (BEFORE authoring sub-SPECs)

The Foreman should resolve these by reading the source documents + briefly consulting Daniel where needed:

1. **Sub-SPEC split shape.** Recommended split:
   - `P5_V2_REBUILD_RUNG1_SCHEMA` — 2 columns + day-of-week variable
   - `P5_V2_REBUILD_RUNG2_TEMPLATES` — 18 UPDATE statements + render verification
   - `P5_V2_REBUILD_RUNG3_AUTOMATION` — 6 automation rules
   - `P5_V2_REBUILD_RUNG4_FEATURES` — 2 product features (or defer to post-cutover SPEC)

   Foreman may collapse Rungs 1+2 if column adds are trivial. Rung 4 may be deferred per timeline.

2. **`crm_automation_rules` table shape.** Foreman must read the existing table schema (or, if it doesn't exist, design it). The 6 rules above describe TRIGGERS + ACTIONS; the storage shape (one row per rule with `trigger_type`, `event_filter_jsonb`, `template_slug`, `recipient_filter_jsonb`, `schedule_jsonb`?) is a Foreman design decision based on what exists. P21_AUTOMATION_OVERHAUL is the most recent SPEC in this area — start there.

3. **Idempotency mechanism for scheduled rules (2.5, 2.6).** `crm_message_logs` exists; Foreman confirms it has the columns needed to track per-template+per-recipient+per-event-instance idempotency. If not — adds the column in Rung 1.

4. **§3.2 manual-move notification decision (auto-email vs. silent).** Surface to Daniel before authoring Rung 4. Recommend: silent by default with optional admin-toggled auto-email per move action — gives the staff member final say, supports cases where the customer is already on the phone.

5. **T10 deactivation strategy.** Two options: (a) `UPDATE crm_message_templates SET is_active=false WHERE slug LIKE 'event_closed_%_he'`; (b) leave them active in the table but verify no automation rule points to them. Recommend (a) — explicit > implicit. Confirm with Daniel.

6. **Rollback plan.** This SPEC modifies 18 template rows on demo. If sub-SPEC fails QA, the seed file `seed-templates-demo.sql` is the recovery — re-run it to restore legacy state. Foreman should explicitly document this in each Rung sub-SPEC.

---

## 6. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `%event_day_of_week%` rendered as literal text in production | Medium | High (visible bug) | Rung 1 + Rung 2 sequencing; render-verify gate (criterion #7) catches this. |
| Automation rule fires for past/closed events (2.4 misfilter) | Medium | High (sends wrong message to wrong audience) | Criterion #11 explicitly tests this filter. |
| Demo + production drift: changes land on demo, prod still has legacy | Low | Medium (cutover is a separate event) | Cutover SPEC handles prod migration; this SPEC is demo-only by design. |
| T10 slugs accidentally referenced by a rule | Low | Medium (sends "event closed" when it shouldn't) | Criterion #6 explicitly tests this. |
| `crm_automation_rules` table doesn't exist or has incompatible shape | Medium | High (blocks Rung 3) | Foreman investigates table state first; if missing/broken, Rung 3 includes the schema work and grows in scope. |
| Render of one of the 9 emails breaks because of an HTML-encoding edge case | Low | Medium | Criterion #4 byte-comparison catches drift; criterion #7 catches render failures. |
| Daniel manually edits templates in CRM admin UI between SPEC authoring and execution | Low | Low | Foreman confirms with Daniel that the V2 files are the source of truth and the admin UI is paused for the duration. |

---

## 7. Why This SPEC Routes to Foreman, Not Executor

This work has 4 distinct risk tiers, 6 Foreman decisions, an open Daniel decision, an unknown table state (`crm_automation_rules`), and a hard deadline (M4 P7 on 2026-05-03 = 5 days from now). The Cowork Campaign Overseer has the message-content + automation-rule context locked, but does NOT have:
- Authority to design schema
- Authority to author multi-Rung executor SPECs
- Time-aware sequencing judgment for the cutover deadline
- Direct access to the `crm_automation_rules` table state

The Foreman has all of these. After Foreman splits this into sub-SPECs and authors them, the executor runs them in order. After each sub-SPEC's `EXECUTION_REPORT.md + FINDINGS.md` lands, Foreman writes `FOREMAN_REVIEW.md` per the standard protocol.

---

## 8. Activation Prompt (separate file)

Per Daniel's preference (memory: `feedback_spec_activation_separate.md`), the activation prompt for the Foreman is in `ACTIVATION_PROMPT.md` in this same folder.

---

## 9. Source Material — Quick Reference

- **V2 files:** `campaigns/supersale/MESSAGES_V2/` (18 files: 9 .html + 9 .txt + NEW_SYSTEM_VARIABLES_REQUIRED.md)
- **Master checklist:** `campaigns/supersale/MESSAGES_V2/NEW_SYSTEM_VARIABLES_REQUIRED.md`
- **Copy rationale:** `roles/campaign-overseer/COPY_DECISIONS_LOG.md`
- **Existing seed:** `modules/Module 4 - CRM/go-live/seed-templates-demo.sql`
- **Most-related prior SPEC:** `modules/Module 4 - CRM/go-live/specs/P21_AUTOMATION_OVERHAUL/SPEC.md`
- **Most-related schema work:** `modules/Module 4 - CRM/docs/specs/M4_ATTENDEE_PAYMENT_SCHEMA/SPEC.md`

---

*Authored by Cowork Campaign Overseer 2026-04-28 after closing 9 V2 emails + 9 V2 SMS. Hands off to opticup-strategic for split + execution authoring.*
