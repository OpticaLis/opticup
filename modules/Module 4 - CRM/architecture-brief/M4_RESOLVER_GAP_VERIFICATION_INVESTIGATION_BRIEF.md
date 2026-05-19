# M4 Resolver Gap Verification — Investigation Brief

**Status:** Read-only investigation. NO file writes to the repo. NO commits. NO DB writes. NO EF deploys.
**Authored by:** Architect (Cowork, 2026-05-19 morning)
**Pipeline mode:** Investigation-Only (per M4_FULL_QA_INVESTIGATION pattern).
**Trigger:** Campaign Overseer (via sibling Architect session) claimed in his handoff that `%event_day_of_week%` is already wired through `event-variables.ts:89-91` via `hebrewDayOfWeek()` helper. The QA report (2026-05-18) showed all 3 placeholders rejected. One of the two is wrong. We need to know which.

---

## 1. Investigation Questions (in order of importance)

### Q1 — Does the helper `hebrewDayOfWeek()` exist?
Look in the `supabase/functions/automation-engine/` folder. Grep for `hebrewDayOfWeek`. If the function exists, capture: file path, line range, full source.

### Q2 — If it exists, is it called from the variable-pack composer?
Find the entry point that builds the variable map for templates (search terms: `event_day_of_week`, `event_deposit_amount`, `event_max_attendees`, `event_name`, `event_date`, `variable_pack`, `composeBody`, `composeTemplate`, `compose_template`, `resolveVariables`, `buildContext`). Capture the function name, file:line, and the complete list of keys it currently populates for event context.

### Q3 — If the helper exists but isn't called, what's the gap?
Compare the keys populated by the composer (from Q2) against the 3 known-missing keys. The gap is either: (a) helper exists, called for some keys, not for `event_day_of_week` — partial wiring; (b) helper exists, never called from composer — orphan; (c) helper exists but in wrong file (Brief drift).

### Q4 — Are there OTHER `%var_name%` placeholders in active templates that the resolver doesn't know?
For each of the 19 active Prizma templates that use any of the 3 known-broken placeholders, dump the full body and extract ALL `%var_name%` occurrences (regex: `/%[a-z_]+%/g`). De-dup the list. For each unique variable, check whether the composer populates it. Output: full list of (variable → populated YES/NO).

### Q5 — Anything else Campaign Overseer changed in the EF that could affect dispatch?
Read `git log --since="2026-04-15" -- supabase/functions/automation-engine/ supabase/functions/dispatch-queue/ supabase/functions/send-message/`. For each commit by Campaign Overseer (or any commit in the 4-week window), summarize what changed in 1 sentence. Flag anything that looks suspicious.

### Q6 — What does the failed-dispatch path look like end-to-end?
Trace one rejected `crm_message_log` row from a known timestamp (e.g. 2026-05-18 16:07:02) back through:
- which rule fired
- what `trigger_data` it received
- which template it tried to compose
- which variable was missing
- what code path returned `unsubstituted_placeholder`

This is to confirm Finding 1.2 of the QA report is fully understood (not just symptomatically).

---

## 2. Deliverable

A single Markdown file written to:
`outputs/M4_RESOLVER_GAP_VERIFICATION_2026_05_19.md`

Structure:
1. **Executive Summary** in Hebrew, ≤150 words. Lead with the answer to Q1+Q2 (resolver state).
2. **Q1-Q6 detailed findings** — each with file:line references + source quotes.
3. **Implication for SPEC 3 Brief** — does the existing SPEC 3 Brief at `modules/Module 4 - CRM/architecture-brief/M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX_BRIEF.md` need to be amended? If yes, list specific amendments needed (1 paragraph per amendment, NOT a full rewrite).
4. **Full variable inventory** — table of (variable → populated by resolver YES/NO → source if YES).

---

## 3. Hard Constraints

1. NO writes to the repo. Everything to `outputs/`.
2. NO DB writes. SELECT-only via Supabase MCP for any DB query.
3. NO EF deploys. Only `get_edge_function` to READ EF source.
4. NO Pipeline lock claim. Investigation-Only Mode.
5. NO subagents. Single linear investigator.
6. Demo + Prizma read-only.

---

## 4. Estimated Wall-Clock

30-45 minutes. Mostly grep + code reading + 1-2 DB SELECTs.

---

## 5. STOP Triggers

- Any DB write attempt.
- Discovery of a variable that resolves to a customer-data-exposing string (PII leak class).
- Discovery that an unrelated EF was also modified by Campaign Overseer in the window (e.g., something in dispatch-queue or send-message that could affect Prizma production traffic). If yes, STOP + emit Hebrew line BEFORE continuing.

When done, emit one Hebrew line:

> "אימות הושלם. דוח: outputs/M4_RESOLVER_GAP_VERIFICATION_2026_05_19.md. ה-resolver [פתוח/סגור] על %event_day_of_week%. [N] משתנים חסרים נוספים [שם/אין]. המלצה ל-SPEC 3: [תיקון מינימלי/הרחבת היקף]."

