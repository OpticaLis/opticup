# CRM UX Redesign — Research Report

> **Author:** opticup-strategic
> **Date:** 2026-04-25
> **Scope:** Templates Center + Automation Rules — research only, no production code.
> **Tenant of investigation:** demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`)

---

## 1. Executive Summary

This research has 4 deliverables:

1. **Data-model investigation of `crm_message_templates`** — what's the actual
   shape, and what bug is Daniel seeing?
2. **Inventory of `crm_automation_rules`** — do all 13 active rules fit
   Daniel's proposed 4 trigger categories?
3. **Reality check on "הרשמה מהירה" (quick register) flow** — does it exist?
4. **6 mockups** (3 per screen) + a recommendation.

**Top-line findings:**

- The templates DB is clean. Daniel's reported bug ("in the SMS row I see
  email and whatsapp fields") is a **UI bug in `crm-messaging-templates.js`**:
  the editor renders all 3 channel previews + a channel switcher regardless
  of which row is being edited.
- All 13 active rules on demo fit Daniel's 4 trigger categories exactly. **No
  orphans, no 5th category needed.** The mapping is 1:1 with no remainder.
- **"הרשמה מהירה" / quick_register flow does NOT exist in code.** No
  identifiers, no UI flow, no EF, no DB column. Event-day check-in flow only
  works for already-registered attendees.
- **Recommendation: Templates B (accordion) + Automation C (single form).**
  Lowest risk, fastest to ship, addresses the actual user complaints
  directly. ~22–30 hours combined. Detailed reasoning in §5.

**There is no schema migration required for either screen** if we keep the
current shape (one row per channel + base slug at the engine layer). All
mockups work with the existing schema.

---

## 2. PART 1 — Templates Center

### 2.1 Current data model (verified against demo DB)

Schema of `crm_message_templates`:

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | NOT NULL |
| slug | text | full slug like `event_invite_new_sms_he` (channel + lang baked in) |
| name | text | display name like "הזמנה לחדשים — SMS" |
| channel | text | `sms` / `whatsapp` / `email` |
| language | text | default `he` |
| subject | text | nullable, used only for email |
| body | text | NOT NULL — plain text for SMS, HTML for email |
| is_active | bool | default true |
| created_at | timestamptz | default now() |

**Demo tenant has 26 rows = 13 logical templates × 2 channels (SMS + Email)
× 1 language (he).** Zero WhatsApp rows. The 13 base slugs:

`event_2_3d_before, event_closed, event_coupon_delivery, event_day,
event_invite_new, event_invite_waiting_list, event_registration_confirmation,
event_registration_open, event_waiting_list, event_waiting_list_confirmation,
event_will_open_tomorrow, lead_intake_duplicate, lead_intake_new`

### 2.2 The "logical template" concept

The dispatch engine (`crm-automation-engine.js`) operates on **base slug**
(`event_invite_new`), and the `send-message` Edge Function constructs the
full slug at send time by appending `_{channel}_{lang}`.

**A "logical template" is therefore:** one base slug + name + language, with
**up to 3 channel variants** stored as separate rows.

This concept is real in code but invisible in UI: the templates list shows
each row separately, even though SMS+Email of the same logical template are
just two halves of one thing.

### 2.3 The UI bug — root cause

In `modules/crm/crm-messaging-templates.js:openEditor` (line 153–197), every
template (regardless of which channel its row belongs to) renders:

1. **A channel `<select>` with whatsapp/sms/email options** — line 163–165.
   When you open an SMS row, you can flip the dropdown to "WhatsApp" and
   save, which physically changes the row's channel column. Confusing.
2. **A subject input field** with placeholder "נושא (רק לאימייל)" —
   line 170. Always visible regardless of channel, despite the label saying
   "email only".
3. **A 3-panel preview** — line 242–244 — *always* renders the same body in
   WhatsApp + SMS + Email panels.
4. **Default channel for a brand-new template = `whatsapp`** (line 156),
   despite no WhatsApp dispatch path existing in production.

**This is exactly Daniel's complaint.** The UI presents one row as if it
were a multi-channel template. The DB is clean — the rendering is the bug.

### 2.4 Schema redundancy — small but worth noting

The `slug` column already encodes the channel (`event_invite_new_sms_he`),
and there's a separate `channel` column. They can drift if the UI lets the
user change one without the other. Not actively broken on demo, but a
landmine for the future.

### 2.5 Proposed direction (no migration)

Keep the existing schema. All 3 mockups work as-is — they just render the
UI in a "logical template" mode where 2–3 rows are grouped by base slug.

The alternative — migrate to a single-row-per-template with a channels JSON
column — is **not recommended** in this SPEC scope. It would touch the
engine, send-message EF, and seeded data, for no clear UX gain. Flagged in
§7 as a stop-trigger if anyone proposes it.

### 2.6 Side-issue: WhatsApp visibility

WhatsApp shows up as a channel option throughout the UI but no rows exist
on demo, no dispatch path exists in `send-message` EF, and Daniel's plan
to switch from Green API to Meta WhatsApp API is on hold. **The redesign
should keep the WhatsApp slot in the UI** (so it's available the day Meta
integration ships) but mark it visually as "not active yet" for tenants
without active rows. Mockups B and C handle this naturally with a clear
"channel inactive" state; A handles it via the badge "לא קיים".

---

## 3. PART 2 — Automation Rules

### 3.1 All 13 rules on demo

| # | Name | Entity | Event | Condition | Active |
|---|------|--------|-------|-----------|--------|
| 1 | שינוי סטטוס: ייפתח מחר | event | status_change | will_open_tomorrow | ✓ |
| 2 | שינוי סטטוס: נפתחה הרשמה | event | status_change | registration_open | ✓ |
| 3 | שינוי סטטוס: הזמנה חדשה | event | status_change | invite_new | ✓ |
| 4 | שינוי סטטוס: אירוע נסגר | event | status_change | closed (+ post-action revert) | ✓ |
| 5 | שינוי סטטוס: רשימת המתנה | event | status_change | waiting_list | ✗ disabled |
| 6 | שינוי סטטוס: 2-3 ימים לפני | event | status_change | 2_3d_before | ✓ |
| 7 | שינוי סטטוס: יום אירוע | event | status_change | event_day | ✓ |
| 8 | שינוי סטטוס: הזמנה ממתינים | event | status_change | invite_waiting_list | ✓ |
| 9 | שינוי סטטוס: אירוע הושלם | event | status_change | completed (revert only, no template) | ✓ |
| 10 | הרשמה: אישור הרשמה | attendee | created | status=registered | ✓ |
| 11 | הרשמה: אישור רשימת המתנה | attendee | created | status=waiting_list | ✓ |
| 12 | שינוי סטטוס ליד: ברוך הבא לרשומים | lead | status_change | status=waiting | ✓ |
| 13 | ליד חדש: ברוך הבא | lead | created | always | ✓ |

### 3.2 Mapping to Daniel's 4 categories

| Daniel's category | Maps to (entity, event) | Rule count | Status |
|---|---|---|---|
| **A. שינוי סטטוס אירוע** | event, status_change | 8 (rules 1, 2, 3, 4, 5, 6, 7, 8, 9 — 9 entries, rule 5 disabled) | ✅ all rules fit |
| **B. שינוי סטטוס ליד** | lead, status_change | 1 (rule 12) | ✅ |
| **C. הרשמה למערכת (lead_intake)** | lead, created | 1 (rule 13) | ✅ |
| **D. הרשמה לאירוע + סטטוס** | attendee, created | 2 (rules 10, 11) | ✅ |

**Result: 13/13 rules fit Daniel's 4 categories. Zero orphans.** No 5th
category needed. The proposal Daniel made is structurally complete.

### 3.3 Mapping to 4 boards (Daniel's boards)

| Board | Code source | Maps to category | Rule count |
|---|---|---|---|
| 📥 לידים נכנסים | `crm-incoming-tab.js` (Tier 1) | C — lead_intake | 1 |
| 👥 רשומים | `crm-leads-tab.js` (Tier 2) | B — lead status change | 1 |
| 📅 אירועים | `crm-events-tab.js` | A — event status change | 8 |
| ✅ נרשמים לאירוע | event detail → attendees sub-tab | D — attendee created | 2 |

**1:1 mapping.** Each rule belongs to exactly one board. No overlap. The
"board" concept is therefore the correct primary axis for both the
Automation list filter and the rule editor's first decision.

### 3.4 Quick register flow — does NOT exist

`grep -rn "quick_register|quickRegister|הרשמה מהירה"` returned **0 matches**
across the entire repo (JS, TS, SQL, HTML, MD docs).

The only registration flows that exist today:

1. **Public form** (`/event-register`, EF `event-register/index.ts`):
   tenant + event UUIDs in URL, lead fills name/phone/email, calls
   `register_lead_to_event` RPC, dispatches confirmation SMS+email via
   `send-message` EF.
2. **Manual lead create from CRM** (`createManualLead` in
   `crm-lead-actions.js`): staff creates a lead with `status=pending_terms`,
   `source=manual`. No event registration tied to this — it just adds a
   row to `crm_leads`.
3. **Register existing lead to event** (`crm-event-register.js` — search
   modal): staff picks an existing Tier 2 lead from a list, calls the same
   RPC, dispatches confirmation.
4. **Event-day check-in** (`crm-event-day-checkin.js`): for attendees who
   already registered. Search by name/phone or scan barcode → flip arrived.
   **No "register a brand-new walk-in lead during the event" flow.**

**Implication for the redesign:** Daniel's category D ("הרשמה לאירוע +
סטטוס — כולל הרשמה רגילה + הרשמה מהירה") is currently single-mode (regular
registration only). If Daniel wants a quick-register flow, that's a
separate SPEC. **Not in scope here.** All 4 mockups treat category D as
"regular event registration only" — which matches the current 2 active
rules on demo (`registered` + `waiting_list`).

### 3.5 The friction Daniel described — diagnosed

**"כמעט בלתי אפשרי לבנות אוטומציות לבד"** — the current rule modal in
`crm-messaging-rules.js` has these specific UX problems:

1. **Trigger-type dropdown labels exist** ("שינוי סטטוס אירוע" / "הרשמה
   לאירוע" / "שינוי סטטוס ליד" / "ליד חדש (ידני)") and ARE in Hebrew —
   but they're **abstract**: there's no link to "the board where this rule
   shows up". The "board as primary axis" concept is missing.
2. **`source_equals` condition** (`"מקור שווה ל-"`) appears in the dropdown
   for every trigger — but it's only meaningful for `lead.created`. For
   `event.status_change`, it has no semantics.
3. **`count_threshold` condition** is mathematical (field, operator,
   value) with no UI affordance for "what does this count?". Currently
   used by zero rules on demo.
4. **No summary in human language** — Daniel saves a rule and has to read
   the dropdown values to verify what it does. No sanity check.
5. **`recipient_type` dropdown labels are accurate** but the choice of
   options shown is the same regardless of trigger — even though
   `tier2_excl_registered` makes no sense for `lead.created`.

The redesign mockups address these by (a) leading with board choice, (b)
hiding irrelevant condition types contextual to the board, (c) showing a
human-language summary.

---

## 4. Mockups — at-a-glance comparison

### 4.1 Templates Center

| | A — Lateral Tabs | B — Stacked Accordion | C — Side-by-Side |
|---|---|---|---|
| Logical-template grouping | ✓ sidebar shows 1 card per base slug | ✓ same | ✓ pill bar in header |
| Tabs/sections per channel | 3 tabs, click to switch | 3 sections, expand/collapse, can show all | 3 columns visible at once |
| Single body editor at a time | ✓ | only when others collapsed | 3 active simultaneously |
| Per-channel inactive state | "לא קיים" badge in tab | grayed-out section, checkbox to activate | empty-state column with activate CTA |
| Build hours | **10–14h** | 12–16h | 16–22h |
| Best for | Compact desktop + mobile | "see all channels at once" mental model | wide-screen power users |
| Risk | Low | Low–medium (more state) | Medium (3 active editors) |

### 4.2 Automation Rules

| | A — Wizard | B — Flowchart | C — Single Form |
|---|---|---|---|
| Board as primary axis | step 1 (mandatory) | 4 lanes (visual) | top of form (mandatory) |
| Conditional fields by board | per-step (only relevant fields) | inline in node panel | reveal block by board |
| Hebrew summary sentence | step 4 only | not shown | always-visible block |
| At-a-glance "all rules" view | rules table separate | the screen IS the all-rules view | filter pills in list |
| Complexity for new user | guided, hard to mis-fill | discoverable but visual | familiar form, but board-led |
| Build hours | 16–22h | **28–40h** | **10–14h** |
| Future expandability (chained steps) | low | high (nodes can chain) | low |
| Risk | Medium (state machine) | High (custom layout, performance) | Low |

---

## 5. Recommendation

### Templates → **Mockup B (Stacked Accordion)**

Reasoning:
- **Closest to user mental model.** "I have one template; here are its 3
  channel variants" is exactly what an accordion expresses.
- **Solves the channel-toggle UX cleanly:** the "ערוץ פעיל" checkbox is
  the visual toggle for "this row exists in DB". No confusing channel
  dropdown.
- **Email-friendly:** the long HTML body of email templates can be
  collapsed when not editing — not the case in C (always visible) or A
  (still occupies the whole editor when active tab).
- **Build cost (~12–16h)** is moderate, lower than C, similar to A.
- **Mobile fallback is identical to desktop layout** (already stacked) —
  no responsive special-case.
- A is also viable. C is over-engineered for the use case (Daniel doesn't
  need 3 active editors at once).

### Automation Rules → **Mockup C (Single Form with Conditional Fields)**

Reasoning:
- **Lowest build cost (~10–14h)** of the three. Reuses most of the
  existing modal infrastructure; only the rendering of conditional fields
  changes.
- **Closest to current code → smallest risk.** The engine, conditions,
  recipient resolution all stay the same. We change the shell, not the
  guts.
- **The Hebrew summary block** directly addresses Daniel's complaint
  ("hard to verify what a rule does").
- **Wizard (A) adds clicks** for routine edits ("just change the template
  on this rule" = open wizard, navigate to step 4, save, close — vs.
  open form, click dropdown, save, close).
- **Flowchart (B) is a 28–40h investment** for a UX that's primarily
  "we can see the lanes at a glance." For 13 rules, this is overkill.
  Revisit if the rule count grows to 50+.

### Combined estimate

| Path | Build cost |
|---|---|
| Templates B + Automation C | **22–30h** |
| Templates A + Automation C | 20–28h (slightly cheaper, slightly less polished UX) |
| Templates B + Automation A | 28–38h |
| Templates B + Automation B | 40–56h |

---

## 6. Forward-flag — questions for Daniel before SPEC authoring

These are decisions only Daniel can make. None block the research; all
block the SPEC.

### Q1 — Schema migration: yes or no?

The recommendation keeps the current schema (one row per channel + base
slug). An alternative is migrating to one row per logical template with a
JSON `channels: {sms: {...}, whatsapp: {...}, email: {...}}` column.
Migration unlocks a cleaner data model long-term but costs:
- Engine refactor (`crm-automation-engine.js`)
- send-message EF refactor (3rd MCP deploy → ticket-blocked, see OPEN_ISSUES #20)
- Re-seed templates × 2 tenants
- Backwards-compat for `crm_message_log.run_id` joins via `slug`

**Recommended answer: NO.** Keep the schema. Reconsider only if a 3rd
tenant arrives with template-design needs that the current schema can't
support.

### Q2 — WhatsApp: hide or surface?

The mockups all keep WhatsApp visible (as inactive-by-default). Alternative
is to remove WhatsApp from the UI entirely until Meta API integration ships.

**Question for Daniel:** is WhatsApp realistically arriving in the next
3 months? If yes, keep visible (avoid a 2nd UI redesign). If no, hide.

### Q3 — Quick register flow: build it, or skip it?

Daniel mentioned "הרשמה מהירה" as a possible 4th-category sub-flow. It
**doesn't exist in code today**. Possible interpretations:
- (a) "Walk-in customer at event-day → create lead + register in 1 click"
  → adds a button on event-day check-in. ~6h SPEC.
- (b) "QR-code-based ultra-short registration form" → already exists via
  short-links. No work needed.
- (c) Daniel meant something else.

**Question for Daniel:** what does "הרשמה מהירה" mean concretely? If
nothing, drop the term from the redesign. If (a), spec it separately.

### Q4 — Boards as first-class concept: top-level filter or rule property?

The Mockup recommendation places "board" as the **primary axis**: rule
creation starts with board choice, the rules list filters by board.

The alternative is to keep "board" as a derived/visual label only (chip
on each rule row), and let the trigger-type dropdown stay primary.

**Question for Daniel:** do you want "board" to be the new mental anchor
(user thinks "I want a rule on the events board"), or just a visual aid?

The mockups assume the former. If the latter, the rule editor stays closer
to the current UI with just better labels. Saves ~3–5 hours but loses the
"board-led" navigation Daniel sketched in the brief.

---

## 7. Stop-triggers (per skill protocol)

The brief specified 3 stop-triggers. Status of each:

1. **"If data model implies a big schema migration — stop and ask before
   sketching."** ✓ Verified: the recommendation keeps schema as-is. No
   migration needed. Q1 above flags the migration option for Daniel's
   judgment.
2. **"If quick_register doesn't exist — document and don't guess."** ✓
   Verified: it doesn't exist (§3.4). All mockups treat category D as
   regular event registration only. Q3 above flags the term for Daniel's
   clarification.
3. **"If 4 categories don't cover an existing case — document the gap,
   don't add a 5th."** ✓ Verified: 13/13 rules fit (§3.2). No 5th category
   added. Daniel's framing is structurally complete.

All stop-triggers passed without escalation.

---

## 8. Deliverables (this folder)

```
modules/Module 4 - CRM/final/CRM_UX_REDESIGN_RESEARCH/
├── RESEARCH_REPORT.md                    ← this file
└── mockups/
    ├── templates_a.html                  (Lateral Tabs)
    ├── templates_a.README.md
    ├── templates_b.html                  (Stacked Accordion) ★ recommended
    ├── templates_b.README.md
    ├── templates_c.html                  (Side-by-Side)
    ├── templates_c.README.md
    ├── automation_a.html                 (Wizard)
    ├── automation_a.README.md
    ├── automation_b.html                 (Flowchart)
    ├── automation_b.README.md
    ├── automation_c.html                 (Single Form) ★ recommended
    └── automation_c.README.md
```

Each `.html` file is self-contained (Tailwind CDN, Heebo font, RTL).
Open directly in a browser to inspect the design. Each `.README.md` covers
structure, pros/cons, 4-category coverage, and build-hours estimate.

---

## 9. Next step

This is research, not a SPEC. The next move:

1. **Daniel reviews the 6 mockups.** Picks one per screen (or asks for
   adjustments to any of them, or proposes a 4th hybrid).
2. **Daniel answers Q1–Q4 above.**
3. **opticup-strategic authors the SPEC** for the chosen path —
   `CRM_UX_REDESIGN_TEMPLATES.md` and `CRM_UX_REDESIGN_AUTOMATION.md` (or
   one combined `CRM_UX_REDESIGN.md`), folder-per-SPEC under
   `modules/Module 4 - CRM/docs/specs/`.
4. **opticup-executor implements the SPEC** under Bounded Autonomy.

Recommended sequencing: Templates first (smaller scope, no engine
involvement), Automation second (touches more files but no new tables).
Both can ship before P7 Prizma cutover **iff** the SPECs are tight.

---

*End of report.*
