# SPEC — CRM_UX_REDESIGN_AUTOMATION

> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_UX_REDESIGN_AUTOMATION/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — Cowork session 2026-04-25
> **Authored on:** 2026-04-25
> **Module:** 4 — CRM
> **Phase:** Post-merge UX redesign, screen 2 of 2 (sibling to `CRM_UX_REDESIGN_TEMPLATES` which closed today)
> **Predecessor research:** `modules/Module 4 - CRM/final/CRM_UX_REDESIGN_RESEARCH/RESEARCH_REPORT.md` + `mockups/automation_c.html`
> **Predecessor SPEC (closed):** `CRM_UX_REDESIGN_TEMPLATES` — verdict 🟢 CLOSED, commit `626c72e` (FOREMAN_REVIEW)

**Executor TL;DR (1 sentence):** Rewrite the Automation Rules editor as a board-led single-form (Mockup C) with a board filter pill bar on the rules list and a plain-Hebrew summary block inside the editor — engine and DB schema unchanged, public globals (`renderMessagingRules`, `loadMessagingRules`) preserved.

---

## 1. Goal

Rewrite the rule editor in `modules/crm/crm-messaging-rules.js` so that:

1. **Board is the primary axis.** Creating or editing a rule starts with picking one of 4 colored boards (📥 לידים נכנסים / 👥 רשומים / 📅 אירועים / ✅ נרשמים לאירוע), not with picking a `trigger_type` from a dropdown. The board's color theme propagates through the conditional fields block.
2. **Conditional fields appear only after a board is chosen, and only the fields relevant to that board.** No more "מקור שווה ל-" appearing for an event-status-change rule. No more `count_threshold` sub-form when the board is "לידים נכנסים".
3. **A plain-Hebrew summary block** appears at the bottom of the editor, updating live as the user fills the form. Daniel reads "ברגע שמישהו ישנה סטטוס אירוע ל-X, יישלח SMS+אימייל לכל ה-Tier 2..." and verifies the rule's intent before saving.
4. **The rules list (above the editor) gets a board filter pill bar** with rule counts per board, so Daniel can navigate to "show me only the events board's rules" in one click.
5. **The `auto` filter category in the templates sidebar is wired up** as part of this SPEC's bonus scope (resolves `M4-DEBT-CRMUX-02` from `CRM_UX_REDESIGN_TEMPLATES/FINDINGS.md` Finding 2). The JOIN that powers the templates' `auto` filter is the same JOIN that powers this SPEC's "filter templates dropdown by board" feature, so it co-locates naturally.

The DB schema is **NOT** modified. The engine (`crm-automation-engine.js`) is **NOT** modified. The 4 public globals (`window.renderMessagingRules`, `window.loadMessagingRules`, `window.CrmAutomation`, and indirectly `window._crmMessagingTemplates` consumed via `baseSlugsFromTemplates`) keep their signatures.

---

## 2. Background & Motivation

### 2.1 Daniel's complaint (verbatim, from research)

> "כמעט בלתי אפשרי לבנות אוטומציות לבד"

The current rule modal in `crm-messaging-rules.js` (347 lines, B8 final state) presents a flat list of fields with no contextual narrowing:

- **Trigger dropdown** ("שינוי סטטוס אירוע" / "הרשמה לאירוע" / "שינוי סטטוס ליד" / "ליד חדש (ידני)") — abstract; no link to "the board where this rule shows up".
- **Condition dropdown** (`always` / `status_equals` / `count_threshold` / `source_equals`) — `source_equals` is only meaningful for `lead.created`; `count_threshold` is unused on demo (zero rules). Both appear regardless of trigger.
- **Recipient dropdown** offers the same 5 options regardless of trigger — `tier2_excl_registered` makes no sense for `lead.created`.
- **No human-language summary.** Daniel saves a rule and has to read the dropdown values back to verify what it does.
- **No filter on the rules list.** All 13 rules (across 4 boards) appear in one flat table.

Per `RESEARCH_REPORT.md §3.5`, this combination is the friction Daniel articulated. Mockup C's design directly addresses each of the five sub-issues.

### 2.2 Why now

The CRM merged to `main` on 2026-04-24. `CRM_UX_REDESIGN_TEMPLATES` closed today (2026-04-25, verdict 🟢 CLOSED, commit `626c72e`). The Templates editor is now in shape — automation is the next-most-friction screen. P7 (Prizma cutover) is on the runway; getting the editor friendly BEFORE Prizma starts authoring rules avoids retraining costs.

### 2.3 Decisions locked during research and prior strategic conversation

| # | Decision | Source |
|---|---|---|
| Q1 | **Schema unchanged.** Keep `crm_automation_rules` as-is. No migration. | Daniel approved during `CRM_UX_REDESIGN_TEMPLATES` strategic chat |
| Q2 | **Board = primary axis.** Editor leads with board picker; conditional fields reveal under the chosen board. | Daniel approved during `CRM_UX_REDESIGN_TEMPLATES` strategic chat |
| Q3 | **Mockup C (Single Form)** — not Wizard (A), not Flowchart (B). | Daniel selected after Foreman explained click-cost trade-off |
| Q4 | **No engine changes.** All conditions, recipients, dispatch logic stay in `crm-automation-engine.js`. | Implicit (per research §5 reasoning) |
| Q5 | **`auto` templates sidebar filter** wired up in same SPEC (bundles with the rules dropdown's "filter templates by board" feature). | Foreman decision per `CRM_UX_REDESIGN_TEMPLATES/FOREMAN_REVIEW.md §3` Finding 2 |

### 2.4 Predecessor research artifacts

- `modules/Module 4 - CRM/final/CRM_UX_REDESIGN_RESEARCH/RESEARCH_REPORT.md` — full findings + 4-board mapping (§3.3) + 13-rule inventory (§3.1)
- `mockups/automation_c.html` (182 lines) — visual source of truth
- `mockups/automation_c.README.md` — design reasoning + ~10–14h estimate

The mockup is the visual source of truth for layout/colors/component anatomy. The executor must match it within standard Tailwind tolerance.

### 2.5 Key reuse — board → trigger mapping (CRITICAL, from research §3.3)

This mapping is the heart of the redesign. It is 1:1, exact, and all 13 demo rules fit:

| Board (UI) | `trigger_entity` | `trigger_event` | Color theme | Demo rule count |
|---|---|---|---|---|
| 📥 לידים נכנסים | `lead` | `created` | orange | 1 |
| 👥 רשומים | `lead` | `status_change` | blue | 1 |
| 📅 אירועים | `event` | `status_change` | violet | 8 (1 disabled) |
| ✅ נרשמים לאירוע | `attendee` | `created` | emerald | 2 |

This board derivation has zero exceptions on demo. If a rule with a different `(trigger_entity, trigger_event)` combination is ever encountered, the editor surfaces it as "unknown board" rather than crashing.

---

## 3. Success Criteria (Measurable)

Every criterion has an exact expected value. Executor reports each value in `EXECUTION_REPORT.md §2`.

### 3.1 File & repo state

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean | `git status` → "nothing to commit, working tree clean" |
| 2 | Commits produced | exactly 3 | `git log origin/develop..HEAD --oneline \| wc -l` → 3 |
| 3 | Modified `crm-messaging-rules.js` size | between 150 and 240 lines | `wc -l modules/crm/crm-messaging-rules.js` |
| 4 | New `crm-rule-editor.js` size | between 180 and 280 lines | `wc -l modules/crm/crm-rule-editor.js` |
| 5 | New `crm-rule-editor.js` exists | exit 0 | `test -f modules/crm/crm-rule-editor.js` |
| 6 | `crm.html` script tag added | 1 new `<script src="modules/crm/crm-rule-editor.js" defer></script>`, immediately above `crm-messaging-rules.js` tag | grep `crm.html` |
| 7 | Integrity Gate (Iron Rule 31) | exit 0 (clean) | `npm run verify:integrity; echo $?` → `0` |
| 8 | Pre-commit hooks pass on each commit | all pass without `--no-verify` | `git commit` succeeds |
| 9 | All CRM JS files ≤350 lines (Rule 12) | 0 violations | `find modules/crm -name '*.js' -exec wc -l {} + \| awk '$1>350'` returns no rows |

### 3.2 Behavioral (visible to user)

| # | Criterion | Expected value | Verify by |
|---|-----------|---------------|-----------|
| 10 | Rules list pill bar shows 5 pills | "הכל (13)" + 4 per-board pills with counts | QA path 2 |
| 11 | Editor opens with no board pre-selected for new rule | board pickers all in unselected state, conditional block hidden | QA path 3 |
| 12 | Editor opens with board auto-selected when editing existing rule | selected board matches rule's `(trigger_entity, trigger_event)` | QA path 4 |
| 13 | Conditional block reveals after board pick | 1 click on a board card → block becomes visible with that board's color | QA path 3 |
| 14 | Switching board mid-edit triggers warning | confirm dialog: "שינוי בורד יאפס את התנאים, להמשיך?" | QA path 5 |
| 15 | Templates dropdown filtered by board | only base slugs whose pattern matches board prefix appear (`event_*` for events board, `lead_intake_*` for incoming, etc.) | QA path 6 |
| 16 | Plain-Hebrew summary updates live | every dropdown change → summary text re-renders within 100ms | QA path 7 |
| 17 | Save creates a row with correct `(trigger_entity, trigger_event)` | matches the board-to-trigger mapping in §2.5 | QA path 8 |
| 18 | Bonus: `auto` templates sidebar filter shows non-empty list | clicking "אוטומטי" pill → filtered list of templates referenced by ≥1 active rule | QA path 9 |

### 3.3 Backward-compat (other CRM screens still work)

| # | Criterion | Expected value | Verify by |
|---|-----------|---------------|-----------|
| 19 | `window.renderMessagingRules(host)` still callable | function signature unchanged | grep code + console test |
| 20 | `window.loadMessagingRules()` still callable | function signature unchanged | grep code + console test |
| 21 | All 13 demo rules load and edit identically | open each rule, verify all fields populate correctly, save without changes → DB row unchanged | QA path 10 |
| 22 | Engine (`crm-automation-engine.js`) untouched | `git log --follow modules/crm/crm-automation-engine.js` shows no commit in this SPEC's range | git verify |
| 23 | DB schema untouched | no migration files added; `git diff --name-only origin/develop...HEAD modules/Module\ 4\ -\ CRM/migrations/` returns empty | git verify |

### 3.4 Documentation

| # | Criterion | Expected value | Verify by |
|---|-----------|---------------|-----------|
| 24 | New file in `MODULE_MAP.md` | 1 new entry under "Messaging hub" | grep `MODULE_MAP.md` |
| 25 | `SESSION_CONTEXT.md` updated | new "Phase History" row for this SPEC | grep `SESSION_CONTEXT.md` |
| 26 | `CHANGELOG.md` updated | new section at top | grep `CHANGELOG.md` |
| 27 | EXECUTION_REPORT.md present | exit 0 | `test -f .../CRM_UX_REDESIGN_AUTOMATION/EXECUTION_REPORT.md` |
| 28 | FINDINGS.md present (or absent with reasoning in EXECUTION_REPORT) | either present or `EXECUTION_REPORT §X` says "no findings" | inspect |
| 29 | Push to origin | exit 0, HEAD synced | `git status -uno` → "Your branch is up to date" |

**Verification methodology** (per FOREMAN_REVIEW for predecessor SPEC, Proposal 1):
- Length-based criteria are anchored on SQL when DB is involved; no JS `.length` substitution.
- For row-equivalence ("rule unchanged after open+save"), the SQL must return a deterministic value (e.g. `md5(action_config::text)` or per-column equality).

---

## 4. Autonomy Envelope

### 4.1 What the executor CAN do without asking

- Read any file in the repo (Level 1).
- Run read-only SQL on demo tenant to verify state (Level 1).
- Edit `modules/crm/crm-messaging-rules.js` (within bounds of §8).
- Create `modules/crm/crm-rule-editor.js` (within bounds of §8).
- Edit `modules/crm/crm-messaging-templates.js` ONLY for the `auto` filter wiring per §8.4 (criterion 18). Any other change to templates → STOP.
- Edit `crm.html` to add the new `<script>` tag.
- Edit `modules/Module 4 - CRM/docs/MODULE_MAP.md` and `SESSION_CONTEXT.md` and `CHANGELOG.md`.
- Run `npm run verify:integrity` and let pre-commit hooks run.
- Commit and push to `develop` per the §9 commit plan.
- Create QA test rules on demo via the new editor (Level 2 write — bounded: name prefix `qa_redesign_test_rule_*`, demo tenant only). Soft-disable them at the end of QA. **Never hard-delete them.**
- Decide internal helper-function names, internal class constants, internal state shape — anything not externally visible.
- Apply minor visual deviations from the mockup if they keep the spirit of "board picker → conditional block → summary" (e.g. rounded vs. squared board cards, exact padding). Major deviations (say, switching to 4 vertical lanes) require stopping.

### 4.2 What REQUIRES stopping and reporting

- **Any DDL.** `ALTER TABLE`, `CREATE INDEX`, `CREATE TYPE`, etc. There is no schema change in this SPEC. If the executor concludes one is needed → STOP.
- **Any change to `crm-automation-engine.js`.** The engine is the contract surface for `lead-intake` EF, `event-register` EF, and Module 1's `createManualLead`. Modifying it breaks dispatch. STOP.
- **Any change to `window.renderMessagingRules` / `window.loadMessagingRules` signatures.** They are consumed by `crm.html` directly. Breaking them breaks the Messaging Hub tab. STOP.
- **Any edit to a file outside the §8 list.** Including any other `crm-messaging-*.js` (templates, broadcast, log) BEYOND the bounded `auto` filter wiring in `crm-messaging-templates.js`. The temptation is to "just clean up" — DO NOT.
- **Any change to `crm_automation_rules` table** (rows, not schema) for production tenants. Prizma is off-limits. All QA on `demo` only.
- **Any rule 12 ceiling violation** that can't be resolved by the §8 split. If the redesign genuinely needs a third file → STOP and report; the SPEC must be amended.
- **Any unfamiliar file appearing in `git status`** that wasn't created by you.
- **Pre-commit hook failure** that you cannot diagnose in one read.
- **Integrity gate (Iron Rule 31) failure.** Null-byte ERROR in HEAD blocks closure regardless of other progress.
- **Any of the 13 baseline demo rules fails to round-trip** (open + save without changes → DB row drifts). STOP, do not save the next rule.

### 4.3 SQL autonomy

- **Level 1 (read-only):** unrestricted on demo tenant. Required for §10 baselines and QA verification.
- **Level 2 (writes on demo only, scoped to this SPEC's QA):** allowed.
  - Allowed writes: `INSERT INTO crm_automation_rules (...)` for QA rules with `name LIKE 'qa_redesign_test_rule_%'`. Soft-disable at end via `UPDATE ... SET is_active=false`.
  - Allowed writes via the UI-driven save flow during QA (clicking "שמור" in the rewritten editor). Same constraint: name must start with `qa_redesign_test_rule_`.
- **Level 3 (DDL or production writes):** NEVER. Stop immediately if needed.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

Beyond the global stop triggers, this SPEC adds:

1. **Any of the 13 demo rules fails to load or shows fields populated incorrectly** in the new editor. I.e., open `שינוי סטטוס: נפתחה הרשמה` and verify board=📅 אירועים auto-selected, condition=`status_equals registration_open`, recipient=`tier2_excl_registered`, template=`event_registration_open`, channels=[sms,email]. If any field is wrong → STOP, do not save.
2. **A delete-row attempted via UI flow.** The current code uses soft-disable (`is_active=false`). The new code MUST also use soft-disable. If you find yourself writing `sb.from(...).delete()` → STOP. This is an Iron Rule #3 violation. (Disable button in the new UI = soft-disable, NOT hard-delete.)
3. **Board picker pre-selects a default for a new rule.** A new rule must open with NO board selected and the conditional block hidden. If the editor opens with "events" or any other board pre-selected → STOP, that's the same antipattern as the old `whatsapp` default in templates.
4. **Changing the board mid-edit silently resets the form.** The §3 criterion 14 confirm dialog is mandatory. If the executor implements board-switch as silent reset → STOP and add the dialog.
5. **Plain-Hebrew summary uses string concatenation with raw user input.** All user input (template name, rule name) MUST pass through `escapeHtml()` before insertion into the summary block. If any `${value}` interpolation goes raw → STOP (Iron Rule 8 violation).
6. **Tailwind CDN script accidentally moved or removed from `crm.html`.** This breaks the entire CRM. If `<script src="https://cdn.tailwindcss.com">` is touched → STOP. (Verify with `grep "cdn.tailwindcss.com" crm.html` → 1 match exactly, before and after.)
7. **More than 3 commits, OR fewer than 3 commits.** §9 commit plan is exact.
8. **The `auto` filter wiring in templates touches more than `_filterCategoryAuto()` (or equivalent single function).** The bonus scope is bounded: ONE function in `crm-messaging-templates.js` gets a real implementation. If the executor finds themselves rewriting more, the bonus is out of scope and should be deferred.

---

## 6. Rollback Plan

If execution fails partway through and must be reverted before a clean save:

```
git reset --hard 626c72e   # CRM_UX_REDESIGN_TEMPLATES FOREMAN_REVIEW commit, last known good HEAD
git push --force-with-lease origin develop  # ONLY with Daniel's explicit go-ahead
```

For DB cleanup (only if QA created stale `qa_redesign_test_rule_*` rows):
```sql
UPDATE crm_automation_rules
   SET is_active = false
 WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
   AND name LIKE 'qa_redesign_test_rule_%';
```

(Soft-disable; never hard-delete. Rows can be physically purged later in a maintenance SPEC.)

Force-pushing to `develop` requires Daniel's explicit authorization in the active conversation. Default rollback is a forward-revert commit, not a force push.

---

## 7. Out of Scope (explicit)

These look related but MUST NOT be touched in this SPEC. Each is a known-pending item with its own future SPEC or follow-up.

- `crm-automation-engine.js` — the dispatch engine. Untouched. (criterion 22)
- `crm-messaging-broadcast.js` and `crm-messaging-log.js` — broadcast wizard and message log; consume rules via `loadMessagingRules`/`_rules` cache, don't edit them. Out of scope.
- `crm-send-dialog.js` — quick-send dialog; out of scope.
- The `walk-in / quick-register` flow that was deferred from `CRM_UX_REDESIGN_TEMPLATES` (Q3) — still deferred. Don't add a board for it.
- Multi-language UI for rule editor (en/ru). Hebrew-only.
- Adding new condition types beyond `always`, `status_equals`, `count_threshold`, `source_equals`. The new editor surfaces only the relevant ones per board, but the underlying taxonomy stays.
- Renaming `trigger_entity` / `trigger_event` columns. The DB stays — board is a UI concept derived from the columns.
- Removing the `count_threshold` condition. It's unused on demo, but other tenants may use it. Out of scope.
- Migration of the `auto` filter to a more sophisticated query (the bonus scope is the simple "any active rule's `template_slug` matches this template's base slug" filter — see §8.4).

### Forward-flags (executors of future SPECs should know)

- **Post-Prizma cutover:** if Prizma starts using `count_threshold` for "send to wait list when capacity reaches X", the editor's events-board condition picker should add it. NOT IN THIS SPEC.
- **Future board addition:** if a 5th board emerges (e.g. "📊 דוחות" with rules on report generation), this SPEC's pattern (board → conditional block) extends naturally. The mapping table in §2.5 grows by one row.
- **Plain-Hebrew summary i18n:** when storefront/CRM gains EN/RU UI, the summary template must be parameterized. Today it's Hebrew-hardcoded.

---

## 8. Expected Final State

### 8.1 New file: `modules/crm/crm-rule-editor.js` — target 200–260 lines

Module pattern: IIFE registering `window.CrmRuleEditor`. Owns the editor's render + state + summary, separate from the orchestrator that owns the rules-list + table + load/save.

Public API (consumed only by `crm-messaging-rules.js`):

```javascript
window.CrmRuleEditor = {
  open: function (existingRow, callbacks) { /* opens Modal.form with the editor */ },
  // Internal helpers exposed for testing only:
  _boardOf: function (entity, event) { /* returns 'incoming' | 'tier2' | 'events' | 'attendees' | null */ },
  _summaryFor: function (state) { /* returns Hebrew summary HTML string, escaped */ }
};
```

Where:
- `existingRow` is `null` for new, or the row object from `crm_automation_rules` for edit.
- `callbacks` is `{ onSave: function (data, isNew) { ... }, onCancel: function () { ... } }`.

Editor rendering rules:
- **Top:** rule name input.
- **Below:** 4-card board picker, all unselected by default for new rules; auto-selected for existing rules per §2.5 mapping.
- **Conditional block (hidden until board picked):** colored panel matching board theme. Contains:
  - **Trigger condition select** — only options relevant to the board (e.g. events board has `status_change` + `count_threshold`; incoming-leads board has `always` + `source_equals`).
  - **Sub-conditional fields** — only appear after the trigger condition is picked (e.g. status picker after `status_change`).
  - **Recipient select** — only options relevant to the board (e.g. incoming-leads = `trigger_lead` only).
  - **Tier2 status filter** — only when recipient is `tier2` or `tier2_excl_registered`.
- **Below conditional:** template dropdown (filtered to base slugs matching board prefix), channels checkboxes (3 colored cards).
- **Plain-Hebrew summary block** (emerald, always-visible after board picked) — updates live via input/change listeners.
- **Footer:** "מחק חוק" (red, only in edit mode) / "ביטול" / "שמור".

### 8.2 Modified file: `modules/crm/crm-messaging-rules.js` — current 347 lines, target 150–240 lines

The orchestrator. Owns:
- `loadRules()` and the `_rules` cache — unchanged.
- `window.renderMessagingRules(host)` — modified to render the new pill bar above the table. Pill bar replaces or augments the existing table header.
- `window.loadMessagingRules()` — unchanged signature.
- `renderTable()` — modified to filter `_rules` by the active board pill before rendering rows. Adds a "בורד" column (colored chip per row).
- `openRuleModal(existing)` — modified to delegate to `CrmRuleEditor.open()` instead of building the modal inline. The orchestrator passes save/cancel callbacks.
- `save(id, data, isNew)`, `toggleActive(id, next)` — unchanged.
- `baseSlugsFromTemplates()` — moved to `CrmRuleEditor` (it's only consumed there now). The orchestrator no longer needs it.
- TRIGGER_TYPES, CONDITION_TYPES, RECIPIENT_TYPES, TIER2_FILTER_STATUSES — moved to `CrmRuleEditor` (or kept in orchestrator if still used by `renderTable` for the board chips). Decide internally; document in EXECUTION_REPORT.
- Helper functions (`logWrite`, `toast`, `lookupTriggerTypeKey`, `recipientTypeUsesStatusFilter`) — keep in orchestrator if used by both files; otherwise move.

### 8.3 Modified file: `crm.html` — current 383 lines (after templates SPEC), target 384 lines (+1 script tag)

Add ONE `<script src="modules/crm/crm-rule-editor.js" defer></script>` line. Position: **immediately above** the existing `<script src="modules/crm/crm-messaging-rules.js" defer>` tag (so the editor module loads first). No other change.

### 8.4 Modified file: `modules/crm/crm-messaging-templates.js` — bounded scope

ONE function gets a real implementation: the `auto` filter category. Currently returns false-always (per `CRM_UX_REDESIGN_TEMPLATES/FINDINGS.md` Finding 2). New behavior:

```javascript
// Replace the always-false branch in filterLogical for the 'auto' tab.
// Pseudocode:
function _filterCategoryAuto(logicalTemplate) {
  var rules = (typeof window.loadMessagingRules === 'function' && _automationRulesCache) ? _automationRulesCache : [];
  return rules.some(function (r) {
    return r.is_active && r.action_config && r.action_config.template_slug === logicalTemplate.baseSlug;
  });
}
```

Implementation requires:
- A small cache of loaded rules at module level (loaded lazily on first `auto` filter click).
- The check above.
- File size delta: ~10–20 lines net. Stay under Rule 12 (current size ~325 from predecessor SPEC).

If the executor cannot implement this without exceeding ~340 lines on `crm-messaging-templates.js`, the bonus is dropped (criterion 18 fails) and the executor reports it as a finding. The main scope (rules editor rewrite) is NOT blocked by the bonus.

### 8.5 New files (retrospective)

- `modules/Module 4 - CRM/docs/specs/CRM_UX_REDESIGN_AUTOMATION/EXECUTION_REPORT.md`
- `modules/Module 4 - CRM/docs/specs/CRM_UX_REDESIGN_AUTOMATION/FINDINGS.md` (only if findings exist)

### 8.6 Deleted files

NONE. (Soft-disable only at DB level.)

### 8.7 DB state at SPEC close

- Demo tenant: 13 active rules in `crm_automation_rules` (unchanged from baseline). 0 active rules with `name LIKE 'qa_redesign_test_rule_%'`. 0–N disabled rules with that prefix (soft-disabled QA artifacts; OK to leave).
- Prizma tenant: untouched (no edits, no QA there).

### 8.8 Docs that DO NOT need updating in this SPEC

- `MASTER_ROADMAP.md` — Module 4 status doesn't shift; this is UX polish.
- `docs/GLOBAL_MAP.md` — `CrmRuleEditor` is internal-to-CRM. Not exposed at project level.
- `docs/GLOBAL_SCHEMA.sql` — no schema change.
- `docs/FILE_STRUCTURE.md` — already stale per Sentinel `M4-DOC-08`, deferred.

### 8.9 File-size projection summary

| File | Currently | Projected after | Headroom against Rule 12 (≤350) |
|---|---|---|---|
| `modules/crm/crm-messaging-rules.js` | 347 | 150–240 | 110–200 lines |
| `modules/crm/crm-rule-editor.js` | (new) | 200–260 | 90–150 lines |
| `modules/crm/crm-messaging-templates.js` | 325 | 335–345 | 5–15 lines (TIGHT — see §8.4 fallback) |
| `crm.html` | 383 | 384 | n/a (HTML, exempt) |
| `modules/Module 4 - CRM/docs/MODULE_MAP.md` | n/a | +1 entry | n/a (docs) |
| `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` | n/a | +1 row | n/a (docs) |
| `modules/Module 4 - CRM/docs/CHANGELOG.md` | n/a | +1 section | n/a (docs) |

If `crm-messaging-templates.js` projects above 345 mid-execution, the bonus scope is deferred (criterion 18 fails as a known limitation, executor logs as a finding). Don't silently grow the file past 345.

---

## 9. Commit Plan

Exactly 3 commits. Order matters: editor component first (importable), orchestrator second, retrospective third.

### Commit 1 — `feat(crm): add CrmRuleEditor component for board-led rule editor`

- Files: `modules/crm/crm-rule-editor.js` (new), `crm.html` (script tag).
- Self-contained: the component compiles and registers `window.CrmRuleEditor` but isn't yet consumed. Loading the page does not break anything (the orchestrator still uses the old inline modal at this commit).
- Pre-commit hooks must pass.

### Commit 2 — `feat(crm): rewrite rules editor as board-led single-form (Mockup C)`

- Files: `modules/crm/crm-messaging-rules.js` (modified), and OPTIONALLY `modules/crm/crm-messaging-templates.js` (bonus `auto` filter).
- This is the visible UX change. The orchestrator now uses `CrmRuleEditor.open()`.
- Verify: existing 13 rules load correctly via the new editor; round-trip test passes; `_rules` cache and dispatching code path still work.

### Commit 3 — `chore(spec): close CRM_UX_REDESIGN_AUTOMATION with retrospective`

- Files: `EXECUTION_REPORT.md` (new), `FINDINGS.md` (new if any), `MODULE_MAP.md`, `SESSION_CONTEXT.md`, `CHANGELOG.md` (modified).
- This commit is the executor's retrospective + master-doc updates. NO code changes.

If any commit fails its pre-commit hook, the executor fixes the underlying issue (not bypasses with `--no-verify`) and re-creates a NEW commit (NOT amend).

---

## 10. Test Subjects (Pinned)

All QA runs on demo tenant only. Baselines verified at SPEC authoring time per `RESEARCH_REPORT §3.1`.

### 10.1 Tenant
- **demo** — `tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'`, slug = `demo`.

### 10.2 Pre-flight verification (executor MUST run before commit 1)

```sql
-- Total active rules
SELECT count(*) FROM crm_automation_rules
 WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND is_active=true;
-- Expected: 12 (the 13th, "שינוי סטטוס: רשימת המתנה", is_active=false per OPEN_ISSUES context)
-- If different — STOP and report.

-- Per-board count (used to populate pill bar in QA path 2)
SELECT trigger_entity, trigger_event, count(*)
  FROM crm_automation_rules
 WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND is_active=true
 GROUP BY trigger_entity, trigger_event ORDER BY count DESC;
-- Expected:
--   event/status_change: 8
--   attendee/created:    2
--   lead/status_change:  1
--   lead/created:        1

-- One representative rule per board for round-trip testing
SELECT id, name, trigger_entity, trigger_event, trigger_condition, action_config
  FROM crm_automation_rules
 WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
   AND name IN (
     'ליד חדש: ברוך הבא',
     'שינוי סטטוס ליד: ברוך הבא לרשומים',
     'שינוי סטטוס: נפתחה הרשמה',
     'הרשמה: אישור הרשמה'
   );
-- Expected: 4 rows. Pin their IDs in EXECUTION_REPORT §2 for QA traceability.
```

If any pre-flight result is unexpected — STOP, report, do not start commit 1.

### 10.3 Write-allowed QA subjects (will be created and soft-disabled within this SPEC)

- **Name prefix:** `qa_redesign_test_rule_`
- **Tenant:** demo
- **Examples (created in QA paths):**
  - `qa_redesign_test_rule_events` — board=events, status=registration_open, recipient=tier2
  - `qa_redesign_test_rule_incoming` — board=incoming, condition=always, recipient=trigger_lead
  - `qa_redesign_test_rule_attendees` — board=attendees, condition=status=registered, recipient=trigger_lead
- **Lifecycle:**
  1. Created via UI in QA paths 3, 8.
  2. Round-trip tested.
  3. Soft-disabled at end of QA via `is_active=false`.
- At SPEC close: 0 rows with `name LIKE 'qa_redesign_test_rule_%' AND is_active=true` on demo.

### 10.4 Phones/leads NOT involved

This SPEC does NOT exercise the dispatch pipeline. No `crm_message_log` rows should be created. No SMS or Email actually sent. The 3-layer phone allowlist remains in force; if QA accidentally triggers a send, only Daniel's 2 phones (0537889878 / 0503348349) would be reachable. **Do not trigger any actual dispatch during QA.** Verify message log row count is unchanged at end of QA.

---

## 11. Lessons Already Incorporated

Cross-Reference Check completed 2026-04-25 against `docs/GLOBAL_MAP.md`, `docs/GLOBAL_SCHEMA.sql`, `docs/FILE_STRUCTURE.md`, all `modules/Module 4 - CRM/docs/MODULE_MAP.md`. **Result: 0 collisions.**

- `CrmRuleEditor` global — does not exist in any current code (verified via repo-wide grep; the only matches are in the predecessor `CRM_UX_REDESIGN_TEMPLATES` SPEC and its retrospective files).
- `crm-rule-editor.js` filename — does not exist (`ls modules/crm/` confirms).
- `_filterCategoryAuto` helper name — does not exist (verified). The bonus implementation introduces it as a new internal helper.

Lessons applied from recent FOREMAN_REVIEWs:

1. **FROM `CRM_UX_REDESIGN_TEMPLATES/FOREMAN_REVIEW.md §6 Proposal 1 (verification methodology)** → APPLIED in §3.4: criteria use SQL anchors when DB is involved; no JS `.length` substitution.

2. **FROM `CRM_UX_REDESIGN_TEMPLATES/FOREMAN_REVIEW.md §6 Proposal 2 (Executor TL;DR)** → APPLIED at the top of this SPEC: 1-sentence orientation before §1.

3. **FROM `CRM_UX_REDESIGN_TEMPLATES/FOREMAN_REVIEW.md §3 Finding 2 disposition (defer `auto` filter to next SPEC)** → APPLIED in §8.4: the `auto` filter wiring is the bonus scope of this SPEC, with bounded edits and a clear fallback if the file size budget is exhausted.

4. **FROM `CRM_UX_REDESIGN_TEMPLATES/EXECUTION_REPORT.md §5 (532-line SPEC was overwhelming without TL;DR)** → APPLIED in §8 file-size projections: bonus scope clearly bounded; commits clearly numbered; fallback explicitly defined.

5. **FROM `CRM_UX_REDESIGN_TEMPLATES/SPEC.md §10.2 lesson on UUID pinning** → APPLIED in §10.2 pre-flight: rule names pinned (more stable than IDs across tenant clones), executor pins IDs to EXECUTION_REPORT.

6. **FROM `CRM_UX_REDESIGN_TEMPLATES/EXECUTION_REPORT.md §3 (line-count overrun caught pre-commit)** → APPLIED in §8.9 with a 5-15 line headroom note for the templates file: if mid-execution the bonus pushes that file over 345, defer it.

7. **FROM general lesson — pin board-derivation logic** → APPLIED in §2.5: the 4-board mapping is a single table in this SPEC. Executor copies it verbatim into `_boardOf()`. Any "should there be a 5th board?" question → STOP per §5 trigger #3 spirit.

---

## 12. Foreman QA Protocol (post-execution, chrome-devtools-driven)

**Important:** the Foreman runs this protocol after executor signals completion. As established in `CRM_UX_REDESIGN_TEMPLATES/FOREMAN_REVIEW.md §7`, the Cowork-VM-cannot-reach-localhost limitation means the Foreman delegates §12 execution to `Claude Code on Windows desktop` via a handoff prompt. Claude Code writes `QA_FOREMAN_RESULTS.md`; the Foreman reads it and writes `FOREMAN_REVIEW.md`.

### 12.1 Environment

- URL: `http://localhost:3000/crm.html?t=demo`
- Local dev server must be running on port 3000 — Daniel is responsible for keeping it alive; if down, Foreman pings Daniel before continuing.
- Browser: Chrome (chrome-devtools MCP).
- Console must be clear of unrelated errors before starting; existing tailwind CDN warning + GoTrue duplicate warning are pre-existing baselines and may be ignored.

### 12.2 Path 1 — Smoke load + console clean

1. Navigate to `crm.html?t=demo`. Click "מרכז הודעות" → "כללי אוטומציה".
2. Verify: pill bar renders with 5 pills, table renders 13 rows below it, no console errors.

### 12.3 Path 2 — Pill bar counts

1. Verify each pill's count: "הכל (12)" + "📥 לידים נכנסים (1)" + "👥 רשומים (1)" + "📅 אירועים (8)" + "✅ נרשמים לאירוע (2)".
   - Note: 12, not 13 — the disabled "רשימת המתנה" rule is excluded. Document the count discrepancy if pill bar shows 13 (decide: is "all rules incl. disabled" the right count or "active only"?).
2. Click each per-board pill → table filters to only that board's rows. Click "הכל" → all rows return.

### 12.4 Path 3 — Create new rule (events board)

1. Click "+ חוק חדש".
2. Editor opens. **Verify no board pre-selected; conditional block hidden.** (criterion 11)
3. Click 📅 אירועים card. Conditional block reveals (violet theme).
4. Fill: name=`qa_redesign_test_rule_events`, trigger condition=`status_change`, status=`registration_open`, recipient=`tier2_excl_registered`, template=`event_registration_open`, channels=[sms,email].
5. **Verify summary block** updates as you fill: ends with "ברגע שמישהו ישנה סטטוס אירוע ל-registration_open, יישלח SMS+אימייל מתוך התבנית 'event_registration_open' לכל ה-Tier 2 חוץ מהנרשמים לאותו אירוע." (or equivalent Hebrew per implementation).
6. Click "שמור". Verify SQL row created: id=`<new uuid>`, name matches, `trigger_entity='event'`, `trigger_event='status_change'`, `action_config.template_slug='event_registration_open'`. (criterion 17)
7. Pill bar count for events board increments to 9; "הכל" to 13.

### 12.5 Path 4 — Edit existing rule (auto-board-select)

1. Click the row for `שינוי סטטוס: נפתחה הרשמה` (existing demo rule).
2. **Verify board=📅 אירועים auto-selected** (criterion 12), conditional block visible with all fields populated correctly per the rule's stored data.
3. Click cancel. No DB write. Verify SQL row unchanged.

### 12.6 Path 5 — Switch board mid-edit

1. Open the same `שינוי סטטוס: נפתחה הרשמה` rule.
2. Click 📥 לידים נכנסים card.
3. **Expected:** confirm dialog "שינוי בורד יאפס את התנאים, להמשיך?" (criterion 14).
4. Click cancel → board reverts to events; conditional fields preserved.
5. Reopen, click incoming-leads board, confirm OK → board switches; conditional block now shows incoming-leads fields (orange theme); template/channels reset.
6. Click cancel → no DB write.

### 12.7 Path 6 — Templates dropdown filtering

1. Open the `qa_redesign_test_rule_events` (created in Path 3).
2. Verify the templates dropdown lists only `event_*` base slugs (8 entries: event_2_3d_before, event_closed, event_coupon_delivery, event_day, event_invite_new, event_invite_waiting_list, event_registration_confirmation, event_registration_open, event_waiting_list, event_waiting_list_confirmation, event_will_open_tomorrow). (criterion 15)
3. Switch board to 📥 לידים נכנסים (confirm "yes") → dropdown now lists only `lead_intake_*` (2 entries: lead_intake_duplicate, lead_intake_new).
4. Cancel.

### 12.8 Path 7 — Live summary update

1. Open `qa_redesign_test_rule_events`. Note current summary text.
2. Change recipient from `tier2_excl_registered` to `tier2`.
3. **Verify summary text updates within ~100ms** to reflect the new recipient (criterion 16).
4. Change channels from [sms,email] to [sms only]. Summary updates.
5. Change template selection. Summary updates.
6. Cancel.

### 12.9 Path 8 — Round-trip all 13 rules

For each of the 13 demo rules:
1. Click row → editor opens → verify board auto-selected correctly per §2.5 mapping → verify all fields populate matching the DB row → click cancel.
2. SQL verify row unchanged: `SELECT trigger_entity, trigger_event, trigger_condition, action_config, is_active FROM crm_automation_rules WHERE id='<id>'` returns identical to pre-test snapshot.

If ANY rule fails to round-trip → STOP, write critical finding, SPEC reopens.

### 12.10 Path 9 — `auto` templates filter (bonus)

1. Navigate to "תבניות" tab.
2. Click "אוטומטי" pill.
3. **Verify:** non-empty list (criterion 18). Specifically, expect ~11 of the 13 base slugs to appear (those referenced by an active rule's `template_slug`). Templates with no rule should NOT appear.
4. Click "הכל" → full 13 logical templates return.

If criterion 18 fails AND the executor logged a finding deferring it (per §8.4 fallback), Path 9 is skipped — the failure is documented but not a blocker.

### 12.11 Path 10 — Final cleanup + integrity verification

```sql
-- 1. QA test rules disabled
SELECT count(*) FROM crm_automation_rules
 WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND name LIKE 'qa_redesign_test_rule_%' AND is_active=true;
-- Expected: 0

-- 2. Active rule count back to baseline
SELECT count(*) FROM crm_automation_rules
 WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND is_active=true;
-- Expected: 12 (same as pre-flight in §10.2)

-- 3. No dispatches occurred
SELECT count(*) FROM crm_message_log
 WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
   AND created_at > '<SPEC start time>';
-- Expected: 0
```

```bash
npm run verify:integrity   # exit 0
git status                 # clean (only docs/guardian/* per Daniel directive)
git log origin/develop..HEAD --oneline  # empty (HEAD pushed)
grep "cdn.tailwindcss.com" crm.html | wc -l   # exactly 1
```

If all 10 paths pass, the SPEC verdict is 🟢 CLOSED. If any path fails, Foreman writes the failure into `FOREMAN_REVIEW.md` with `🔴 REOPEN` or `🟡 CLOSED WITH FOLLOW-UPS` per severity.

---

## 13. Pre-Merge Checklist (Executor Closure)

Every item must pass before the executor commits commit 3.

- [ ] All §3 success criteria pass with actual values captured in `EXECUTION_REPORT.md §2`.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0.
- [ ] `git status --short` returns empty (clean tree, ignoring `docs/guardian/*`).
- [ ] HEAD pushed to `origin/develop` (commits 1 & 2; commit 3 pushed at the very end).
- [ ] `EXECUTION_REPORT.md` written with: §1 Summary, §2 Criteria results table (all 29 criteria with actual values), §3 What was done per file, §4 Deviations (or "none"), §5 Decisions made in real time, §6 Iron-rule self-audit, §7 Self-assessment, §8 Improvement proposals (2 for executor skill).
- [ ] `FINDINGS.md` written if any findings (or executor confirms "no findings" in EXECUTION_REPORT).
- [ ] `MODULE_MAP.md`, `SESSION_CONTEXT.md`, `CHANGELOG.md` updated (commit 3).
- [ ] All CRM JS files ≤350 lines (Rule 12).
- [ ] No new orphan globals (Rule 21).
- [ ] `renderMessagingRules`, `loadMessagingRules` still callable with original signatures (criteria 19, 20).
- [ ] `crm-automation-engine.js` untouched (criterion 22).
- [ ] No DB migrations added (criterion 23).
- [ ] `grep "cdn.tailwindcss.com" crm.html | wc -l` = 1.

After commit 3 push, executor signals: `EXECUTOR DONE`. Foreman runs §12 protocol independently and writes `FOREMAN_REVIEW.md`.

---

## 14. Dependencies / Preconditions

- Branch `develop` is current with `origin/develop` (verified by First Action protocol).
- `CRM_UX_REDESIGN_TEMPLATES` is closed (commit `626c72e` on `origin/develop`). ✓ Verified at SPEC authoring time.
- Local dev server reachable at `http://localhost:3000` for QA. If not, Foreman pings Daniel before §12.
- Demo tenant has 12 active rules in `crm_automation_rules` (per §10.2 pre-flight). If different, executor stops and reports — baselines in §10.2 are predicated on this state.
- Demo tenant has 13 logical templates (after `CRM_UX_REDESIGN_TEMPLATES` close). If different, the `auto` filter bonus may need re-baselining.

---

*End of SPEC.*

*This SPEC is ready for execution by opticup-executor. Do not begin until Daniel reviews and approves.*
