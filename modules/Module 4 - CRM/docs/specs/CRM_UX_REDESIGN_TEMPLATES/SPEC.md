# SPEC — CRM_UX_REDESIGN_TEMPLATES

> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_UX_REDESIGN_TEMPLATES/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-25
> **Module:** 4 — CRM
> **Phase:** Post-merge UX redesign, screen 1 of 2
> **Author signature:** Claude Opus 4.7 [1M] — Strategic chat session 2026-04-25
> **Predecessor research:** `modules/Module 4 - CRM/final/CRM_UX_REDESIGN_RESEARCH/RESEARCH_REPORT.md` + 6 mockups
> **Successor SPEC:** `CRM_UX_REDESIGN_AUTOMATION` (not yet authored — depends on this SPEC closing first)

---

## 1. Goal

Rewrite the CRM Templates Center editor (`modules/crm/crm-messaging-templates.js`) so a single "logical template" — one base slug + name + language — is presented as **one card with three channel accordion sections** (SMS / WhatsApp / Email), instead of one card per row. Each section has a per-channel "active" toggle that controls whether a row exists in `crm_message_templates` for that channel. WhatsApp interactions raise a Hebrew toast informing the user the channel is not yet active in production.

---

## 2. Background & Motivation

### 2.1 The bug Daniel reported

In the current editor, opening any single row (e.g. an SMS row) presents:
- A channel `<select>` letting the user flip the row's channel after the fact
- A subject field labeled "נושא (רק לאימייל)" but always visible
- A 3-panel preview rendering the SAME body in WhatsApp + SMS + Email panels
- Default channel for new templates = `whatsapp`, despite no WhatsApp dispatch path existing

Daniel's verbatim complaint: "in the SMS row I see fields for email and whatsapp." This is a **UI rendering bug**, not data corruption. All 26 demo template rows are clean (verified via SQL during research).

### 2.2 Why the redesign is now

The CRM merged to `main` on 2026-04-24. Scale infra (queue, throttle, automation history) shipped overnight 2026-04-25. The editor is the next-most-friction screen. Daniel cannot author or maintain templates confidently with the current UI.

### 2.3 Decisions locked during research (2026-04-25, this session)

| # | Decision | Source |
|---|---|---|
| Q1 | **Schema unchanged.** Keep one row per (slug, channel, language). No migration. | Daniel approved |
| Q2 | **WhatsApp visible** with click → toast "WhatsApp עדיין לא פעיל". Meta API integration coming in next 3 months. | Daniel approved |
| Q3 | **Walk-in registration is a separate later SPEC.** Out of scope here. | Daniel approved |
| Q4 | **Board = primary axis** in the Automation editor. Not relevant to this SPEC. | Daniel approved |
| Q5 | **Two SPECs.** Templates first (this SPEC), Automation second (separate). | Daniel approved |
| Mockup | **Templates Mockup B (Stacked Accordion).** | Daniel approved |

### 2.4 Predecessor research artifacts

- `modules/Module 4 - CRM/final/CRM_UX_REDESIGN_RESEARCH/RESEARCH_REPORT.md` — full findings + mapping tables
- `mockups/templates_b.html` + `templates_b.README.md` — visual reference
- The mockup is the source of truth for layout/colors/component anatomy. The executor must match it visually within standard Tailwind tolerance.

---

## 3. Success Criteria (Measurable)

Every criterion has an exact expected value. Executor reports each value in `EXECUTION_REPORT.md §2`.

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean | `git status` → "nothing to commit, working tree clean" |
| 2 | Commits produced | exactly 3 commits | `git log origin/develop..HEAD --oneline \| wc -l` → 3 |
| 3 | Modified file `crm-messaging-templates.js` size | between 240 and 340 lines | `wc -l modules/crm/crm-messaging-templates.js` |
| 4 | New file `crm-template-section.js` size | between 120 and 200 lines | `wc -l modules/crm/crm-template-section.js` |
| 5 | New file `crm-template-section.js` exists | exit 0 | `test -f modules/crm/crm-template-section.js` |
| 6 | `crm.html` script tag added | 1 new `<script src="modules/crm/crm-template-section.js"...>` | grep crm.html |
| 7 | Integrity Gate (Iron Rule 31) | exit 0 (clean) | `npm run verify:integrity; echo $?` → `0` |
| 8 | Pre-commit hooks | all pass on each commit | `git commit` succeeds without `--no-verify` |
| 9 | All CRM JS files ≤350 lines (Rule 12) | `find modules/crm -name '*.js' -exec wc -l {} + \| awk '$1>350'` returns no matching files | (see verify command) |
| 10 | Demo tenant template count unchanged after pure refactor (excluding QA test runs) | 26 rows post-cleanup | SQL: `SELECT count(*) FROM crm_message_templates WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'` |
| 11 | Test subject `event_invite_new` SMS body unchanged after pure-load test | body identical to baseline `LENGTH=361` | SQL by id `ec439480-a125-4077-872c-4114f8a4c4e6` |
| 12 | Test subject `event_invite_new` Email body unchanged after pure-load test | body identical to baseline `LENGTH=12957` | SQL by id `275da2b7-3a72-4654-8069-5ba88974f747` |
| 13 | QA template `qa_redesign_test` cleanup | 0 rows on demo at SPEC close | SQL: `SELECT count(*) FROM crm_message_templates WHERE slug LIKE 'qa_redesign_test%' AND tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'` |
| 14 | New file is registered in MODULE_MAP.md | 1 new entry under "Messaging hub" | grep MODULE_MAP.md |
| 15 | SESSION_CONTEXT.md updated | new "Phase History" row for this SPEC | grep SESSION_CONTEXT.md |
| 16 | EXECUTION_REPORT.md present in SPEC folder | exit 0 | `test -f .../CRM_UX_REDESIGN_TEMPLATES/EXECUTION_REPORT.md` |
| 17 | FINDINGS.md present (or absent if zero findings, with reasoning in EXECUTION_REPORT) | either present or `EXECUTION_REPORT §X` says "no findings" | inspect |
| 18 | Push to origin | exit 0, HEAD synced | `git status -uno` → "Your branch is up to date" |

**Backward-compat criteria** (verifies that other CRM screens still work):

| # | Criterion | Expected value |
|---|-----------|---------------|
| 19 | Automation rules editor's template dropdown still populates | `baseSlugsFromTemplates()` in `crm-messaging-rules.js` returns the same set of base slugs as before the refactor | exercise via QA §12 path 5 |
| 20 | `window._crmMessagingTemplates()` still returns the raw rows array | array of objects with `id, slug, channel, language, name, body, ...` — preserved as the public API | grep code + console test |
| 21 | `window.CRM_TEMPLATE_VARIABLES` still exposed for broadcast wizard + send-dialog | array of 10 entries unchanged | grep code |
| 22 | `window.renderMessagingTemplates(host)` still callable as the entry point | function signature unchanged | grep code |
| 23 | `window.loadMessagingTemplates()` still callable | function signature unchanged | grep code |

---

## 4. Autonomy Envelope

### 4.1 What the executor CAN do without asking

- Read any file in the repo (Level 1).
- Run read-only SQL on demo tenant to verify state (Level 1).
- Edit `modules/crm/crm-messaging-templates.js` (within bounds of §8).
- Create `modules/crm/crm-template-section.js` (within bounds of §8).
- Edit `crm.html` to add the new `<script>` tag.
- Edit `modules/Module 4 - CRM/docs/MODULE_MAP.md` and `SESSION_CONTEXT.md` and `CHANGELOG.md`.
- Run `npm run verify:integrity` and let pre-commit hooks run.
- Commit and push to `develop` per the §9 commit plan.
- Create the QA template `qa_redesign_test` on demo tenant via `INSERT` in chrome-devtools-driven UI flow (Level 2 write — but bounded: only this slug, only demo tenant). Soft-delete it (set `is_active=false`) at the end of QA. **Never hard-delete.**
- Decide internal helper-function names, internal class constants, internal state shape — anything not externally visible.
- Apply minor visual deviations from the mockup if they keep the spirit of "stacked accordion with per-channel toggle" (e.g. accordion arrow direction, exact padding). Major deviations (say, switching to lateral tabs) require stopping.

### 4.2 What REQUIRES stopping and reporting

- **Any DDL.** `ALTER TABLE`, `CREATE INDEX`, `CREATE TYPE`, etc. There is no schema change in this SPEC. If the executor concludes one is needed → STOP.
- **Any change to `_crmMessagingTemplates`/`renderMessagingTemplates`/`loadMessagingTemplates`/`CRM_TEMPLATE_VARIABLES` public-API contract.** These are consumed by `crm-messaging-rules.js`, `crm-messaging-broadcast.js`, `crm-send-dialog.js`. Breaking any of them → STOP.
- **Any edit to a file outside the §8 list.** Including any other `crm-messaging-*.js`. The temptation is to "just clean up" the rules editor in the same commit — DO NOT.
- **Any test failure on the existing automation rules dropdown** when QA path 5 runs. If the dropdown comes up empty or malformed, the rules editor consumes the templates list — STOP and root-cause before continuing.
- **Any production tenant write.** Prizma is off-limits in this SPEC. All QA on `demo` only.
- **Any rule 12 ceiling violation** that can't be resolved by splitting into the two files in §8. If the redesign genuinely needs a third file → STOP and report; the SPEC must be amended, not silently expanded.
- **Any unfamiliar file appearing in `git status`** that wasn't created by you.
- **Pre-commit hook failure** that you cannot diagnose in one read.
- **Integrity gate (Iron Rule 31) failure.** Null-byte ERROR in HEAD blocks closure regardless of other progress.

### 4.3 SQL autonomy

- **Level 1 (read-only):** unrestricted on demo tenant.
- **Level 2 (writes on demo only, scoped to this SPEC's QA):** allowed.
  - Allowed writes: `INSERT INTO crm_message_templates (...)` for the QA template `qa_redesign_test_{sms|email|whatsapp}_he`, `UPDATE crm_message_templates SET is_active=false WHERE slug LIKE 'qa_redesign_test%' AND tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'`, and updates to those rows during QA.
  - Allowed writes are also permitted via the UI-driven save flow during QA — i.e. clicking "save" in the rewritten editor and letting `sb.from('crm_message_templates').insert/update` fire. Same constraints (slug prefix `qa_redesign_test_`, demo tenant).
- **Level 3 (DDL or production writes):** NEVER. Stop immediately if needed.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

Beyond the global stop triggers, this SPEC adds:

1. **Any of the 5 reference templates show body/subject corruption after refactor load.** I.e., open `event_invite_new`, `lead_intake_new`, `event_registration_confirmation`, `event_day`, `event_closed` in the new editor — verify SMS body length matches DB length and email body starts with `<!DOCTYPE html>`. If any drifts → STOP, do not save.
2. **A delete-row attempted via UI flow.** The current code uses soft-delete (`is_active=false`). The new code MUST also use soft-delete. If you find yourself writing `sb.from(...).delete()` → STOP. This is an Iron Rule #3 violation.
3. **Default channel for new template = `whatsapp` after refactor.** This is the very bug we're fixing. The new "+ תבנית חדשה" flow must ship with all 3 channel sections present, all 3 unchecked by default OR with SMS only checked. If SMS+WhatsApp+Email all default to `active=true` → STOP, that recreates the symmetric problem.
4. **WhatsApp section is editable when toast says "not active."** WhatsApp section's textarea + subject must be DISABLED when the channel is inactive. If the active toggle flips, the textarea unlocks. If implementation lets users type into a never-saved WhatsApp body → STOP.
5. **Mobile breakpoint produces unreadable layout.** Open the new editor at viewport `390×844` (iPhone 12). All 3 sections should stack readably. If any section overflows horizontally → STOP and add `overflow-hidden` / `min-w-0` etc.
6. **Tailwind CDN script accidentally moved or removed from `crm.html`.** This breaks the entire CRM. If `<script src="https://cdn.tailwindcss.com">` is touched → STOP.
7. **More than 3 commits, OR fewer than 3 commits.** §9 commit plan is exact.

---

## 6. Rollback Plan

If execution fails partway through and must be reverted before a clean save:

```
git reset --hard 8253ed5  # research commit, last known good HEAD before this SPEC
git push --force-with-lease origin develop  # ONLY with Daniel's explicit go-ahead
```

For DB cleanup (only if QA created stale `qa_redesign_test*` rows):
```sql
UPDATE crm_message_templates
   SET is_active = false
 WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
   AND slug LIKE 'qa_redesign_test%';
```

(Soft-delete; never hard-delete. The rows can be physically purged later in a maintenance SPEC if needed.)

Force-pushing to `develop` requires Daniel's explicit authorization in the active conversation. Default rollback is a forward-revert commit, not a force push.

---

## 7. Out of Scope (explicit)

These look related but MUST NOT be touched in this SPEC. Each one is a known-pending item with its own future SPEC or follow-up.

- `modules/crm/crm-messaging-rules.js` — the Automation editor. Belongs to the next SPEC (`CRM_UX_REDESIGN_AUTOMATION`).
- `modules/crm/crm-messaging-broadcast.js` and `crm-messaging-log.js` — broadcast wizard and message log; consume templates list but don't edit them.
- `modules/crm/crm-send-dialog.js` — quick-send dialog; same constraint.
- `modules/Module 4 - CRM/final/OPEN_ISSUES.md` — sync only if this SPEC closes a numbered issue (none expected).
- WhatsApp dispatch path. The toast informs users it isn't ready. Actual dispatch wiring is a future SPEC tied to Meta WhatsApp Cloud API integration (Daniel: ~3 months out).
- The category tabs in the sidebar (`all / auto / manual / drafts`). The current code's `auto` filter returns false-always (broken). DO NOT FIX HERE. Adding the proper "auto" detection requires JOINing against `crm_automation_rules.action_config.template_slug` — that's a useful enrichment but deserves its own scope.
- Multi-language support (en / ru). Currently only `he` rows exist on demo. The redesign keeps the language `<select>` working for `he` only; future SPEC handles language fan-out per template.
- `name` and `subject` per-channel customization. Currently each row stores its own `name` and `subject`. The new editor will treat `name` as logical-template-wide (all 3 channels share one display name) but `subject` as Email-only (matches current data shape). If any existing row has divergent `name` between SMS and Email of the same base slug, the editor surfaces the SMS row's name (alphabetical-first by channel). **Verify-before-save check:** if `name` mismatch is detected at load time, log a warning to console (`crm-templates: name divergence on event_invite_new — using SMS row's name`) but do not block. **Forward-flag for next SPEC:** consider migrating to a `crm_message_template_groups` parent table that owns the shared name. NOT IN THIS SPEC.

### Forward-flags (executors of future SPECs should know)

- **Post-WhatsApp Meta integration:** the toast added in this SPEC must be removed. Search for `whatsapp_not_active_yet` or equivalent constant and delete. Do not leave the toast firing once dispatch is real.
- **Post-Automation redesign:** the new Automation editor will introduce "board" as primary axis. Templates editor's sidebar may want a similar "filter by board" affordance. NOT IN THIS SPEC, but if future redesign of templates is requested, this is the obvious extension.
- **CRM_OPEN_ISSUES_CLEANUP F5 lesson applied:** any per-channel toggle interaction in the new editor that creates a brand-new row must include the `name` column (NOT NULL) — see §8 save algorithm.

---

## 8. Expected Final State

### 8.1 New files

#### `modules/crm/crm-template-section.js` — target 130–180 lines

Module pattern: IIFE registering `window.CrmTemplateSection`. Owns one channel's accordion section: render, wire (events), update preview, char counter.

Public API (consumed only by `crm-messaging-templates.js`):
```javascript
window.CrmTemplateSection = {
  render: function (channel, channelState, opts) { /* returns HTML string */ },
  wire: function (rootEl, channel, channelState, callbacks) { /* attach events */ },
  updatePreview: function (rootEl, channel, body, subject) { /* re-render preview pane */ },
  isInactive: function (channel, channelState) { /* return true if checkbox off */ }
};
```

Where:
- `channel` ∈ `{'sms', 'whatsapp', 'email'}`.
- `channelState` is `{ exists: bool, id: uuid|null, body: string, subject: string|null, original: object|null }`.
- `opts` is `{ open: bool, language: 'he' }` (open = expanded UI).
- `callbacks` is `{ onActiveChange, onBodyChange, onSubjectChange }`.

Section rendering rules:
- **Active** (`exists=true`): colored border (sky/emerald/amber per channel), header with icon + name + active checkbox + char counter (SMS/WhatsApp only) or HTML-size (Email), expanded body editor + mini preview.
- **Inactive** (`exists=false`): gray border, opaque-faded header with active checkbox unchecked, body collapsed (just header). Click-to-expand allowed but textarea remains disabled until checkbox checked.
- **WhatsApp click-handlers when inactive**: ANY click on the body/subject/save-related affordances inside the WhatsApp section → fires `Toast.info('WhatsApp עדיין לא פעיל — מתוכנן לרבעון הקרוב')`. Implement once at the section's root via event delegation.
- **WhatsApp checkbox can still be toggled** to allow Daniel to draft content once the channel becomes active. The toggle does NOT trigger a toast — only attempts to send/save through the disabled flow do.

#### `modules/Module 4 - CRM/docs/specs/CRM_UX_REDESIGN_TEMPLATES/EXECUTION_REPORT.md`
#### `modules/Module 4 - CRM/docs/specs/CRM_UX_REDESIGN_TEMPLATES/FINDINGS.md` (only if findings exist)

### 8.2 Modified files

#### `modules/crm/crm-messaging-templates.js` — current 310 lines, target 240–340 lines

The orchestrator. Owns:
- `loadTemplates()` — unchanged; still SELECTs all rows for tenant.
- `_templates` cache — unchanged.
- `window._crmMessagingTemplates()`, `window.loadMessagingTemplates()`, `window.renderMessagingTemplates()`, `window.CRM_TEMPLATE_VARIABLES` — unchanged signatures (Rule 23 backward compat, criteria 19–23).
- `groupByBaseSlug(rows)` — NEW internal helper. Returns array of logical templates: `[{baseSlug, name, language, channels: {sms, whatsapp, email}}, ...]`.
- `renderSidebar()` — modified to render one card per logical template (not per row). Card displays the active-channel badges (SMS/EMAIL/WA) computed from rows.
- `openEditor(baseSlug)` — modified to render the editor shell + 3 calls to `CrmTemplateSection.render()` (one per channel). Wires save/draft/delete to logical-template scope.
- `saveLogicalTemplate(state)` — NEW. Walks the 3 channels of state. For each, decides INSERT / UPDATE / SOFT-DELETE based on diff vs. originals.
- `deleteLogicalTemplate(state)` — NEW. Soft-deletes ALL rows belonging to the base slug (sets all 3 channels' `is_active=false`).
- All other helpers (`toast`, `logWrite`, `escapeHtml`, channel-label constants, etc.) preserved.

#### `crm.html` — current 382 lines, target 383 lines (+1 script tag)

Add ONE `<script src="modules/crm/crm-template-section.js" defer></script>` line. Position: **immediately above** the existing `<script src="modules/crm/crm-messaging-templates.js" defer>` tag (so the section module loads first). No other change.

#### `modules/Module 4 - CRM/docs/MODULE_MAP.md`

Add ONE entry under the "Messaging hub" section:
```
- `crm-template-section.js` — channel-section component for the templates accordion editor (render/wire/preview per channel). Public API: `window.CrmTemplateSection.{render, wire, updatePreview, isInactive}`. Consumed by `crm-messaging-templates.js`.
```

#### `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md`

Add a row to "Phase History" table:
```
| **CRM_UX_REDESIGN_TEMPLATES** | ✅ CLOSED | Templates Center editor rewrite — accordion-per-channel layout. ... (commit hashes). See `modules/Module 4 - CRM/docs/specs/CRM_UX_REDESIGN_TEMPLATES/`. |
```

Update "Last updated" date to 2026-04-25 (or executor's actual close date).

#### `modules/Module 4 - CRM/docs/CHANGELOG.md`

Append a new section at the top:
```
## CRM_UX_REDESIGN_TEMPLATES — 2026-04-25

- {commit-hash} feat(crm): rewrite templates editor as channel-accordion (Mockup B)
- {commit-hash} feat(crm): add CrmTemplateSection component
- {commit-hash} chore(spec): close CRM_UX_REDESIGN_TEMPLATES retrospective
```

### 8.3 Deleted files

NONE. (Soft-deletion only at DB level, see §6.)

### 8.4 DB state at SPEC close

- Demo tenant: 26 active rows in `crm_message_templates` (unchanged from baseline). 0 active rows with `slug LIKE 'qa_redesign_test%'`. 0–3 inactive rows with that slug pattern (soft-deleted QA artifacts; OK to leave).
- Prizma tenant: 26 active rows (unchanged, no edits). 0 rows with `qa_redesign_test%` (never touched).

### 8.5 Docs that DO NOT need updating in this SPEC

- `MASTER_ROADMAP.md` — Module 4 status doesn't shift; this is a UX polish, not a phase milestone. Leave for the next Integration Ceremony.
- `docs/GLOBAL_MAP.md` — no new functions exposed at the project level. The new `CrmTemplateSection` is an internal-to-CRM helper.
- `docs/GLOBAL_SCHEMA.sql` — no schema change.
- `docs/FILE_STRUCTURE.md` — already stale per Sentinel `M4-DOC-08`, leave for that fix's SPEC.

### 8.6 File-size projection summary

| File | Currently | Projected after | Headroom against Rule 12 (≤350) |
|---|---|---|---|
| `modules/crm/crm-messaging-templates.js` | 310 | 240–340 | 10–110 lines |
| `modules/crm/crm-template-section.js` | (new) | 130–180 | 170–220 lines |
| `crm.html` | 382 | 383 | n/a (HTML, exempt from Rule 12) |
| `modules/Module 4 - CRM/docs/MODULE_MAP.md` | n/a | +1 entry | n/a (docs) |
| `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` | n/a | +1 row | n/a (docs) |
| `modules/Module 4 - CRM/docs/CHANGELOG.md` | n/a | +1 section | n/a (docs) |

If `crm-messaging-templates.js` projects above 340 mid-execution, the executor stops and reports — splitting further is permitted only with Foreman approval. Don't silently grow the file.

---

## 9. Commit Plan

Exactly 3 commits. Order matters: section component first (importable), orchestrator second, retrospective third.

### Commit 1 — `feat(crm): add CrmTemplateSection component for channel-accordion editor`
- Files: `modules/crm/crm-template-section.js` (new), `crm.html` (script tag).
- Self-contained: the component compiles and registers `window.CrmTemplateSection` but isn't yet consumed. Loading the page should not break anything.
- Pre-commit hooks must pass (file-size, Rule 21 orphans, Rule 23 secrets).

### Commit 2 — `feat(crm): rewrite templates editor as channel-accordion (Mockup B)`
- Files: `modules/crm/crm-messaging-templates.js` (modified).
- This is the visible UX change. The editor now consumes `CrmTemplateSection`.
- Verify: `loadMessagingTemplates()` still returns rows, `_crmMessagingTemplates()` still exposes the array, automation rules dropdown still populates.

### Commit 3 — `chore(spec): close CRM_UX_REDESIGN_TEMPLATES with retrospective`
- Files: `modules/Module 4 - CRM/docs/specs/CRM_UX_REDESIGN_TEMPLATES/EXECUTION_REPORT.md` (new), `FINDINGS.md` (new if any), `MODULE_MAP.md`, `SESSION_CONTEXT.md`, `CHANGELOG.md` (modified).
- This commit is the executor's retrospective + master-doc updates. NO code changes here.

If any commit fails its pre-commit hook, the executor fixes the underlying issue (not bypasses with `--no-verify`) and re-creates a NEW commit (NOT amend).

---

## 10. Test Subjects (Pinned)

All QA runs on demo tenant only. UUIDs pinned at SPEC authoring time (verified 2026-04-25 via SQL).

### 10.1 Tenant
- **demo** — `tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'`, slug = `demo`.

### 10.2 Read-only test subjects (exist on demo, must not be modified except via the QA flow described)

| Logical template | SMS row id | Email row id | SMS body length | Email body length | Email subject |
|---|---|---|---|---|---|
| `event_invite_new` | `ec439480-a125-4077-872c-4114f8a4c4e6` | `275da2b7-3a72-4654-8069-5ba88974f747` | 361 | 12,957 | (varies — read at runtime) |
| `event_registration_confirmation` | `d745fab8-0714-4b0b-b72d-3537aa42d7da` | `292f7bc7-e43f-4697-8891-9cedeb8946e0` | 374 | 20,882 | (varies) |
| `event_day` | `27c8d388-516c-4b2d-9d78-2c77a16a1b39` | `87df7222-07d0-45c1-9630-955bcab2c921` | 196 | 7,112 | (varies) |
| `event_closed` | `33e80224-2da9-44a4-98af-27ce9401dc49` | `723be712-c3fb-41cd-8e4c-de1fe4b864d7` | 141 | 10,764 | (varies) |
| `lead_intake_new` | `16e6c060-7bb4-4bf7-a953-f2befbc508f3` | `2d62689f-7fcd-4542-9f2d-dfe1b951b602` | 275 | 17,723 | (varies) |

These 5 templates × 2 channels = 10 row baselines. The "pure-load test" in QA path 1 verifies all 10 round-trip identically through the new editor (load → no edits → no save).

### 10.3 Write-allowed QA subject (will be created and soft-deleted within this SPEC)

- **Slug base:** `qa_redesign_test`
- **Tenant:** demo
- **Display name:** `QA Redesign Test`
- **Lifecycle:**
  1. Created by chrome-devtools-driven UI flow during QA path 4 (create new template).
  2. Edited via QA paths 5–7.
  3. Soft-deleted by setting `is_active=false` at end of QA via chrome-devtools-driven UI delete OR direct SQL.
- At SPEC close: 0 rows with `slug LIKE 'qa_redesign_test%' AND is_active=true` on demo.

### 10.4 Phones/leads NOT involved

This SPEC does not exercise the dispatch pipeline. No `crm_message_log` rows should be created. No SMS or Email actually sent. The 3-layer phone allowlist remains in force; if the QA accidentally triggers a send, only Daniel's 2 phones (0537889878 / 0503348349) would be reachable. **Do not send any test message during this SPEC's QA. Verify the message log row count is unchanged at end of QA.**

---

## 11. Lessons Already Incorporated

Cross-Reference Check completed 2026-04-25 against `docs/GLOBAL_MAP.md`, `docs/GLOBAL_SCHEMA.sql`, `docs/FILE_STRUCTURE.md`, all `modules/Module 4 - CRM/docs/MODULE_MAP.md`. **Result: 0 collisions.** New name `CrmTemplateSection` and file `crm-template-section.js` do not clash with any existing global, file, or table.

Lessons applied from recent FOREMAN_REVIEWs:

1. **FROM `OVERNIGHT_M4_SCALE_AND_UI/FOREMAN_REVIEW.md` §6 (F3) → "design decisions surface AFTER execution = bad"** → APPLIED in §2.3: every Q1–Q5 decision is locked in the SPEC text before authoring. No "(γ) Hybrid" surprises.

2. **FROM `OVERNIGHT_M4_SCALE_AND_UI/FOREMAN_REVIEW.md` §5 (master-doc lag)** → APPLIED in §8: every doc that should/should-not be updated is enumerated. Executor cannot leave master-doc lag.

3. **FROM `CRM_OPEN_ISSUES_CLEANUP_2026-04-25/FOREMAN_REVIEW.md` (F5 forward-flag)** → APPLIED in §7 "Forward-flags": this SPEC explicitly notes the forward-flag for the post-WhatsApp-Meta-integration cleanup.

4. **FROM `AUTOMATION_HISTORY_NOT_TRIGGERED/FOREMAN_REVIEW.md` (clarity of failure modes praised)** → APPLIED in §5 stop triggers: 7 specific stop conditions, each tied to a concrete observable.

5. **FROM `CRM_OPEN_ISSUES_CLEANUP_2026-04-25/FOREMAN_REVIEW.md` (F1 — public-form lead-intake EF still hardcoded)** → NOT APPLICABLE here (no EF changes in this SPEC).

6. **FROM `OVERNIGHT_M4_SCALE_AND_UI/FOREMAN_REVIEW.md` (F2 — MCP deploy_edge_function fails persistently)** → NOT APPLICABLE (no EF deploys in this SPEC).

7. **General lesson — pin test-subject UUIDs at author time** → APPLIED in §10. All 10 baseline rows + 1 QA slug pinned by exact ID.

---

## 12. Foreman QA Protocol (post-execution, chrome-devtools-driven)

**Important:** this is QA performed by the Foreman (this skill, in a future session triggered by the executor's "completed" signal), NOT handed off to Daniel. The Foreman drives chrome-devtools, captures evidence, and commits the QA findings into `EXECUTION_REPORT.md`.

The executor performs an internal QA pass before marking the SPEC complete (their version of this protocol). The Foreman's pass is independent verification.

### 12.1 Environment

- URL: `http://localhost:3000/crm.html?t=demo`
- Local dev server must be running on port 3000 — Daniel is responsible for keeping it alive; if down, Foreman pings Daniel before continuing.
- Browser: Chrome (chrome-devtools MCP).
- Console must be clear of unrelated errors before starting; existing tailwind CDN warning + GoTrue duplicate warning are pre-existing baselines and may be ignored.

### 12.2 Path 1 — Pure-load round-trip (no edits, no saves)

1. Navigate to `crm.html?t=demo`.
2. Click "הודעות" tab (top nav).
3. Click "תבניות" sub-tab.
4. **Verify sidebar shows 13 logical-template cards** (one per base slug). Existing 26-row count means each base has SMS+Email — the sidebar must collapse those to 13 cards. Screenshot.
5. Click `event_invite_new` card.
6. **Verify 3 accordion sections render**: SMS (active, sky border), WhatsApp (inactive, gray), Email (active, amber border).
7. **Open SMS section.** Verify body matches DB row `ec439480-a125-4077-872c-4114f8a4c4e6` body byte-for-byte. Char counter shows 361.
8. **Open Email section.** Verify body matches DB row `275da2b7-3a72-4654-8069-5ba88974f747` body byte-for-byte. HTML preview renders.
9. **Click "ביטול" / close.** No save fired (verify network tab shows no POST/PATCH to `crm_message_templates`).
10. **Re-query DB:** `SELECT id, body, channel FROM crm_message_templates WHERE slug LIKE 'event_invite_new%' AND tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'`. Confirm both rows unchanged (id+body+channel match what you read at step 7–8).

✓ Pass: bodies identical. ✗ Fail: any drift → Foreman writes critical finding, SPEC reopens.

Repeat steps 5–10 for `event_registration_confirmation`, `event_day`, `event_closed`, `lead_intake_new`. 5 templates × 2 rows = 10 baseline checks.

### 12.3 Path 2 — Visual fidelity vs. mockup

1. Open `event_invite_new` editor (as in Path 1 step 5).
2. Open all 3 accordion sections.
3. Open `mockups/templates_b.html` in a second tab.
4. Compare side-by-side:
   - Section header colors: SMS sky / WhatsApp slate-200 (inactive grey) / Email amber.
   - "ערוץ פעיל" checkbox visible in each header.
   - SMS/WhatsApp char counter visible; Email shows HTML byte count.
   - Mini preview at the bottom of each section for body content.
   - Empty state rendering for inactive WhatsApp.
5. Take a screenshot of the live editor + the mockup. Attach both to `EXECUTION_REPORT.md`.

Tolerance: Tailwind utility-class delta is acceptable (e.g., `bg-sky-50` vs `bg-sky-100`). Structural deltas (e.g., 2 sections instead of 3, missing checkbox) are NOT acceptable.

### 12.4 Path 3 — WhatsApp toast behavior

1. Open `event_invite_new` editor.
2. **WhatsApp section is inactive (checkbox unchecked).**
3. Click on the WhatsApp section's header — section expands.
4. Click on the (disabled) textarea inside WhatsApp section.
   - **Expected:** Toast.info "WhatsApp עדיין לא פעיל — מתוכנן לרבעון הקרוב" appears. Toast disappears in ~3 sec.
5. Click "Save" / "שמור הכל" (whatever exists at editor footer).
   - **Expected:** save proceeds for SMS and Email. WhatsApp section is skipped (no row created). No second toast required if checkbox is off.
6. Now check the WhatsApp checkbox. Section becomes "active" visually (border emerald, icon emerald). Textarea unlocks.
7. Type "test" in the WhatsApp body. No toast (the channel was activated; user explicitly opted in).
8. Click "שמור הכל".
   - **Expected:** save proceeds. WhatsApp now exists as a `crm_message_templates` row. Verify with SQL: `SELECT id FROM crm_message_templates WHERE slug='event_invite_new_whatsapp_he' AND tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'`.
9. **Cleanup:** uncheck WhatsApp, save again. Verify the WhatsApp row is now `is_active=false` via SQL.

✓ Pass: toast fires only on disabled-state interactions; activated WhatsApp behaves like a normal channel.

**Note:** This QA path involves a real WRITE to `crm_message_templates` (one INSERT + one soft-delete UPDATE on the `event_invite_new_whatsapp_he` slug). This is allowed within Level 2 autonomy because the slug is bounded and the cleanup step restores baseline. Verify post-cleanup that 26 active rows remain (or 27 active if the WhatsApp row stays — pick: revert to 26).

### 12.5 Path 4 — Create new logical template

1. Click "+ תבנית חדשה" in sidebar.
2. **Editor opens with 3 sections, all unchecked OR only SMS checked** (per §5 stop trigger #3).
3. Enter name "QA Redesign Test", language "עברית".
4. Check SMS. Type body "בדיקה — %name%, אירוע %event_name%". Char counter shows ~38 chars (Hebrew).
5. Check Email. Enter subject "QA Test", type body "<p>שלום %name%</p>".
6. Leave WhatsApp unchecked.
7. Click "שמור הכל".
8. **Expected:** 2 rows created on demo:
   - `qa_redesign_test_sms_he` with body "בדיקה — %name%, אירוע %event_name%"
   - `qa_redesign_test_email_he` with body "<p>שלום %name%</p>", subject "QA Test"
9. Verify with SQL.
10. Sidebar refreshes; new card "QA Redesign Test" appears at the top OR in alphabetical order (per existing sort).

### 12.6 Path 5 — Backward compat with automation rules dropdown

1. Click "כללי אוטומציה" sub-tab.
2. Click "+ כלל חדש".
3. **Verify the "תבנית הודעה" dropdown** lists logical templates by base slug. Expected: 14 entries (13 baseline + new `qa_redesign_test` from Path 4).
4. Pick `qa_redesign_test`. Pick trigger "ליד חדש (ידני)", condition "תמיד", recipient "הליד שהפעיל את החוק", channels SMS+Email.
5. Save the rule.
6. **Expected:** rule saves. NO error on the rules editor (which would indicate broken `_crmMessagingTemplates`).
7. **Cleanup:** click toggle to disable the rule (or delete it via SQL).

✓ Pass: criteria 19–23 (backward compat) verified end-to-end.

### 12.7 Path 6 — Edit existing channel within a logical template

1. Open `lead_intake_new` editor (Path 1 step 5 pattern).
2. Open SMS section. Change body — append " 🌟" to end. Char counter increments by 2 (emoji).
3. Click "שמור הכל".
4. **Expected:** UPDATE on `lead_intake_new_sms_he` row. NO new INSERT. NO change to `lead_intake_new_email_he` row.
5. Verify with SQL.
6. **Cleanup:** revert the body to baseline (remove the 🌟 you appended), save again.
7. **Verify body length back to 275** (baseline from §10.2).

✓ Pass: surgical update; no collateral.

### 12.8 Path 7 — Mobile breakpoint

1. Open chrome-devtools, set viewport to 390×844 (iPhone 12).
2. Reload `crm.html?t=demo`.
3. Navigate to תבניות tab. Open `event_invite_new`.
4. **Verify all 3 sections stack vertically, each readable.** Body editor and preview don't overflow horizontally. Buttons accessible.
5. Screenshot.

### 12.9 Path 8 — Final cleanup verification

1. Run SQL: `SELECT count(*) FROM crm_message_templates WHERE slug LIKE 'qa_redesign_test%' AND is_active=true AND tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'`. Expected: 0.
2. Run SQL: `SELECT count(*) FROM crm_message_templates WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND is_active=true`. Expected: 26.
3. Run SQL: `SELECT count(*) FROM crm_message_log WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND created_at > '<SPEC start time>'`. Expected: 0 (no dispatches occurred).
4. Run `npm run verify:integrity`. Expected: exit 0.
5. Run `git status`. Expected: clean.
6. Run `git log origin/develop..HEAD --oneline`. Expected: empty (HEAD pushed).

If all 8 paths pass, the SPEC verdict is 🟢 CLOSED. If any path fails, Foreman writes the failure into `FOREMAN_REVIEW.md` with `🔴 REOPEN` or `🟡 CLOSED WITH FOLLOW-UPS` per severity.

---

## 13. Pre-Merge Checklist (Executor Closure)

Every item must pass before the executor commits commit 3 ("close retrospective").

- [ ] All §3 success criteria pass with actual values captured in `EXECUTION_REPORT.md §2`.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0. Null-byte ERROR (exit 1) blocks closure absolutely.
- [ ] `git status --short` returns empty (clean tree).
- [ ] HEAD pushed to `origin/develop` (commits 1 & 2; commit 3 pushed at the very end of retrospective).
- [ ] `EXECUTION_REPORT.md` written with: §1 Summary, §2 Criteria results table (all 23 criteria with actual values), §3 What was done per file, §4 Deviations (or "none"), §5 Decisions made in real time, §6 Cleanup verification.
- [ ] `FINDINGS.md` written if any findings (or executor confirms "no findings" in `EXECUTION_REPORT §X`).
- [ ] `MODULE_MAP.md`, `SESSION_CONTEXT.md`, `CHANGELOG.md` updated (commit 3).
- [ ] All CRM JS files ≤350 lines (Rule 12).
- [ ] No new orphan globals (Rule 21) — verified by pre-commit hook.
- [ ] `_crmMessagingTemplates`, `loadMessagingTemplates`, `renderMessagingTemplates`, `CRM_TEMPLATE_VARIABLES` still callable with original signatures (criteria 19–23).

After the executor commits commit 3 and pushes, the executor signals completion to the Foreman. The Foreman then runs §12 protocol independently and writes `FOREMAN_REVIEW.md`.

---

## 14. Dependencies / Preconditions

- Branch `develop` is current with `origin/develop` (verified by First Action protocol).
- Local dev server reachable at `http://localhost:3000` for QA. If not, executor pings Daniel.
- Demo tenant has 26 active templates (verified by SQL at start). If less or more, executor stops and reports — the baselines in §10 are predicated on this state.
- Predecessor SPEC `CRM_UX_REDESIGN_RESEARCH` is closed (commit `8253ed5` on `origin/develop`). ✓

---

*End of SPEC.*

*This SPEC is ready for execution by opticup-executor. Do not begin until Daniel reviews and approves.*
