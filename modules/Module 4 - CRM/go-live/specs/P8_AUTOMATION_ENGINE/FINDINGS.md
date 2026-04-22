# FINDINGS — P8_AUTOMATION_ENGINE

> **Location:** `modules/Module 4 - CRM/go-live/specs/P8_AUTOMATION_ENGINE/FINDINGS.md`
> **Logged by:** opticup-executor
> **Logged on:** 2026-04-22

Findings discovered during P8 execution that are OUT OF SCOPE for P8 itself
per Rule "one concern per task". All logged here for Foreman disposition.

---

## Finding 1 — `lead-intake` Edge Function dispatches server-side, cannot be rule-driven from client engine

**Code:** M4-DEBT-P8-01
**Severity:** MEDIUM
**Category:** Architecture / tech-debt

**Description:**
P8 converts client-side dispatches (event status change, event registration) to
rule evaluation. But the `lead-intake` Edge Function (`supabase/functions/lead-intake/index.ts`)
still dispatches hardcoded — `lead_intake_new` on new lead, `lead_intake_duplicate`
on 23505/409 duplicate. The client-side `CrmAutomation` engine cannot intercept
this dispatch because it fires server-side before the lead even surfaces to the client.

SPEC §7 acknowledges this as out-of-scope, but the consequence is that if Daniel
disables the "ליד חדש (ידני)" rule via UI, new-lead dispatches from the storefront
form will STILL fire because the EF has its own hardcoded path. This creates
a split-brain mental model for rule management.

**Reproduction:**
1. Seed a rule `{trigger_entity: 'lead', trigger_event: 'created', is_active: false}` on demo
2. POST to `lead-intake` EF with a new phone
3. Observe: `crm_message_log` gets `lead_intake_new_{sms,email}_he` rows — EF fires despite rule being disabled

**Suggested next action:**
Future SPEC — port the rule engine to Deno/TS (or a stored procedure), have
the EF call it before its current hardcoded block. Alternatively, have the EF
skip dispatch entirely and have the client-side engine fire when the new lead
surfaces (acceptable latency: seconds).

**Out-of-scope rationale:** Changing `lead-intake/index.ts` requires a Supabase
Edge Function redeploy. SPEC §7 explicitly excluded this to keep P8 a client-only
change.

---

## Finding 2 — `crm_message_templates` has no `base_slug` column — engine derives it by string manipulation

**Code:** M4-SCHEMA-P8-02
**Severity:** LOW
**Category:** Schema ergonomics

**Description:**
Template slugs are stored fully composed: `event_registration_open_sms_he`,
`event_registration_open_email_he`, etc. There is no `base_slug` column. Two
consequences:

1. **Engine:** No issue — the engine passes BASE slug to `CrmMessaging.sendMessage`,
   which the `send-message` Edge Function composes into the full slug at lookup
   time. The engine doesn't need the base column to exist.
2. **Rules UI:** To show a "pick a template" dropdown grouped by base (so that
   SMS + Email variants collapse to one entry), the UI must strip the `_{channel}_{lang}`
   suffix at render time (`baseSlugsFromTemplates()` helper in `crm-messaging-rules.js`).
   If a template's slug doesn't follow the pattern (e.g., manually inserted without
   suffix), the derivation is undefined.

**Reproduction:**
```sql
-- Templates on demo all follow the pattern:
SELECT slug FROM crm_message_templates LIMIT 3;
-- event_2_3d_before_email_he
-- event_2_3d_before_sms_he
-- event_closed_email_he
```
No template violates the pattern today, so no bug. But future templates
added without the `_{channel}_{lang}` suffix would render incorrectly in the
rules UI dropdown.

**Suggested next action:** Add a `base_slug` GENERATED column to `crm_message_templates`,
or add a CHECK constraint enforcing the naming pattern. Either would eliminate
the string-stripping in JS. Low priority — no bug today.

**Out-of-scope rationale:** DDL change — not authorized by SPEC §4.

---

## Finding 3 — Rules UI has no sort_order control

**Code:** M4-UX-P8-03
**Severity:** LOW
**Category:** UX

**Description:**
`crm_automation_rules.sort_order` determines the order rules evaluate in. The
seed SQL sets it explicitly (10, 20, 30, …, 110) but the UI has no control for
reordering. Currently:
- New rules inherit `sort_order: 0` (the schema default)
- Edit modal has no `sort_order` input
- Table doesn't show a drag-handle or up/down arrows

If two rules match the same trigger, the one with the lower `sort_order` fires
first. Today this doesn't matter because each seeded rule has a unique
`status_equals` condition — no overlaps. But if Daniel creates overlapping
rules from the UI, the evaluation order will be indeterminate.

**Reproduction:** Click "+ כלל חדש" → save → new rule has `sort_order: 0` silently.

**Suggested next action:** Add a `sort_order` number input to the rule edit
modal, OR add up/down arrows in the rules table. Low priority — no overlaps
today.

**Out-of-scope rationale:** Rules UI was already upgraded substantially in P8;
adding `sort_order` was not in SPEC §8 Expected Final State.

---

## Finding 4 — Broadcast wizard passes `channel: 'whatsapp'` through step 2 but send will fail

**Code:** M4-UX-P8-04 (related to pre-existing M4-UX-P6-03)
**Severity:** LOW
**Category:** UX / known-issue continuation

**Description:**
P6 FR Finding #3 already flagged this — broadcast wizard step 2 accepts
`whatsapp` as a channel, but `CrmMessaging.sendMessage` returns
`invalid_channel:whatsapp` at send time. The wizard UI doesn't guard against
this.

P8 didn't touch the wizard step 2 code. The issue persists.

**Suggested next action:** Covered by existing M4-UX-P6-03 in the go-live
ROADMAP Follow-ups section. Separate tiny SPEC.

**Out-of-scope rationale:** SPEC §7 out-of-scope list explicitly defers
M4-UX-P6-03 to "separate tiny SPEC".

---

## Finding 5 — `crm-messaging-rules.js` template dropdown shows deduped base names but picks an arbitrary display name

**Code:** M4-UX-P8-05
**Severity:** INFO
**Category:** Minor UX

**Description:**
`baseSlugsFromTemplates()` in `crm-messaging-rules.js` iterates templates, strips
the suffix, and keeps the FIRST-SEEN name for each base. Since templates arrive
sorted by slug, this means the SMS variant's name wins (e.g., "אירוע נפתח מחר — SMS")
while the Email variant's more descriptive name is dropped. For the rules
dropdown, the base-slug text shown to Daniel is `אירוע נפתח מחר — SMS — event_will_open_tomorrow`
which is slightly misleading — the rule fires on BOTH channels, not just SMS.

**Suggested next action:** In `baseSlugsFromTemplates()`, pick the name that
comes without a channel suffix (e.g., strip " — SMS" / " — Email" from the
display name), or show just the base slug. 2-line tweak.

**Out-of-scope rationale:** Not flagged by any SPEC §3 criterion.

---

*End of FINDINGS.md. 5 findings — 0 CRITICAL, 0 HIGH, 1 MEDIUM, 3 LOW, 1 INFO.*
