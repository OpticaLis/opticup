# SPEC — CRM_PHASE_B5_MESSAGING_HUB

> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_PHASE_B5_MESSAGING_HUB/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-20
> **Module:** 4 — CRM
> **Phase:** B5
> **Author signature:** Cowork strategic session (beautiful-busy-darwin)

---

## 1. Goal

Build the Messaging Hub screen inside the CRM — a single UI for managing
message templates (create, edit, toggle), automation rules (trigger-based auto
messages), manual broadcast sends to filtered lead groups, and a message log
history. This replaces the scattered Make scenarios (0A, 1B, 5A, 8) with one
centralized management interface.

---

## 2. Background & Motivation

Daniel currently manages messages through 15+ Make scenarios with hardcoded
templates inside module configs. Changing a message, adding a language, or
adjusting timing requires opening Make and editing individual scenario modules.
Mass sends require manually updating Monday.com rows one by one.

Phase A (schema migration) already created the 4 tables needed:
`crm_message_templates`, `crm_automation_rules`, `crm_broadcasts`,
`crm_message_log` — all empty, all with correct JWT-claim RLS. This SPEC is
**UI-only**: no DDL, no new tables, no schema changes.

Phase B3 built the CRM UI shell (3 tabs + hidden Event Day). Phase B4 added
Event Day. This phase adds the 4th visible tab: Messaging Hub (הודעות).

Prior SPECs: `CRM_PHASE_B3_UI_CORE`, `CRM_PHASE_B4_EVENT_DAY`.

---

## 3. Success Criteria (Measurable)

| # | Type | Criterion | Expected value | Verify command |
|---|------|-----------|---------------|----------------|
| 1 | S | Branch state | On `develop`, clean | `git status` → "nothing to commit" |
| 2 | S | Commits produced | 4 commits | `git log origin/develop..HEAD --oneline \| wc -l` → 4 |
| 3 | S | New files count | 3 new JS files | `ls modules/crm/crm-messaging*.js \| wc -l` → 3 |
| 4 | S | New file: crm-messaging-tab.js | exists, ≤300 lines | `wc -l modules/crm/crm-messaging-tab.js` → ≤300 |
| 5 | S | New file: crm-messaging-templates.js | exists, ≤300 lines | `wc -l modules/crm/crm-messaging-templates.js` → ≤300 |
| 6 | S | New file: crm-messaging-broadcast.js | exists, ≤300 lines | `wc -l modules/crm/crm-messaging-broadcast.js` → ≤300 |
| 7 | S | crm.html modified — nav button added | "הודעות" button in `#crmNav` | `grep 'data-tab="messaging"' crm.html` → match |
| 8 | S | crm.html modified — tab section added | `tab-messaging` section exists | `grep 'id="tab-messaging"' crm.html` → match |
| 9 | S | crm.html modified — script tags added | 3 new script tags for messaging JS | `grep 'crm-messaging' crm.html \| wc -l` → 3 |
| 10 | S | crm-init.js modified — routing added | `showCrmTab` handles `messaging` | `grep "messaging.*loadCrmMessagingTab" modules/crm/crm-init.js` → match |
| 11 | S | All JS files pass syntax check | 0 errors | `node --check modules/crm/crm-messaging*.js` → exit 0 |
| 12 | S | No orphan globals | All new `window.*` functions unique | `grep -rn "window\.\(loadCrmMessagingTab\|renderTemplates\|renderBroadcast\|renderMessageLog\)" modules/crm/ \| wc -l` — each name appears exactly once in definition |
| 13 | B | Templates sub-tab loads | Table shows from `crm_message_templates` | Manual: open CRM → הודעות → תבניות sub-tab → table or empty state |
| 14 | B | Create template modal | Form with fields: name, slug, channel, language, subject, body | Manual: click "תבנית חדשה" → modal opens with all fields |
| 15 | B | Edit template | Click existing template → modal pre-filled → save updates row | Manual: click row → edit → save → verify change |
| 16 | B | Toggle template active/inactive | Toggle switch changes `is_active` | Manual: toggle → verify `is_active` flipped in DB |
| 17 | B | Automation rules sub-tab loads | Table shows from `crm_automation_rules` | Manual: click כללי אוטומציה sub-tab → table or empty state |
| 18 | B | Create automation rule modal | Form: name, trigger_entity, trigger_event, action_type, channels, timing | Manual: click "כלל חדש" → modal with fields |
| 19 | B | Broadcast sub-tab loads | Broadcast creation form with filters | Manual: click שליחה ידנית sub-tab → filter UI |
| 20 | B | Broadcast filter preview | Applying filters shows recipient count | Manual: select status filter → "X נמענים" updates |
| 21 | B | Broadcast send creates record | Send creates `crm_broadcasts` row + `crm_message_log` rows | Manual: fill broadcast → send → check DB |
| 22 | B | Message log sub-tab loads | Table shows from `crm_message_log` with filters | Manual: click היסטוריה sub-tab → table or empty state |
| 23 | B | ActivityLog.write on every DB write | At least 1 call per write operation | `grep -c 'ActivityLog.write' modules/crm/crm-messaging*.js` → ≥4 total |
| 24 | B | escapeHtml on all user-visible text | No raw innerHTML with user data | `grep -n 'innerHTML' modules/crm/crm-messaging*.js` → all preceded by escapeHtml or using textContent |
| 25 | S | tenant_id on every write | Every `.insert()` includes `tenant_id: getTenantId()` | `grep -A2 '\.insert\|\.upsert' modules/crm/crm-messaging*.js` → all include tenant_id |

**Type key:** S = Structural (verify by command), B = Behavioral (verify in browser / manual QA)

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in the repo
- Run read-only SQL (Level 1) to inspect table structure
- Create the 3 new JS files listed in §8
- Modify `crm.html`: add nav button, tab section, script tags
- Modify `crm-init.js`: add messaging route to `showCrmTab()`
- Commit and push to `develop`
- Write DB rows to `crm_message_templates`, `crm_automation_rules`,
  `crm_broadcasts`, `crm_message_log` on **Prizma tenant** for testing
  (tables are currently empty — no risk of overwriting real data)
- Use `sb.from()` directly (consistent with all existing CRM code per
  M4-DEBT-02 decision: raw `sb.from()` deferred to post-B6 refactor)

### What REQUIRES stopping and reporting

- Any schema change (DDL) — tables already exist, no DDL needed
- Modifying any file outside CRM module scope (see §7)
- Any change to `shared.js`, `shared-ui.js`, or other shared files
- Creating more than 3 new JS files (scope creep signal)
- Any file exceeding 300 lines (Rule 12 — split first, ask Foreman)
- Any merge to `main`

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If any of the 4 messaging tables does NOT exist → STOP (should not happen —
  verified 2026-04-20, but check anyway)
- If `crm.html` file size or structure has changed significantly from what §8
  describes (nav `#crmNav` with 3 buttons + hidden event-day section) → STOP
  and report the difference
- If `crm-init.js` `showCrmTab` function has been refactored since B4 → STOP
- If any new file would exceed 300 lines → STOP and plan a split

---

## 6. Rollback Plan

- All changes are new files + surgical edits to 2 existing files
- Git rollback: `git reset --hard {START_COMMIT}` removes everything
- No DB rollback needed (tables are empty; any test rows can be deleted with
  `DELETE FROM crm_message_templates WHERE tenant_id = '{prizma_id}';` etc.)
- No DDL to revert

---

## 7. Out of Scope (explicit)

These are related but MUST NOT be touched:

- **Actual message sending** (SMS/WhatsApp/Email integration) — this SPEC
  builds the management UI only. Messages are "saved" and "logged" but not
  actually dispatched to external services. Sending integration is a separate
  future SPEC (B6 or later) that will connect to Make/Edge Functions.
- **Scheduled execution of automation rules** — the rules are stored in the DB
  and displayed in the UI, but no background scheduler runs them yet. That
  requires an Edge Function or Supabase cron — separate SPEC.
- **Template variable resolution** — the UI shows `{{name}}`, `{{event_date}}`
  etc. as literal text in the template editor. Actual variable substitution
  happens at send time (future SPEC).
- **`shared.js` or `shared-ui.js`** — no modifications
- **Event Day files** (`crm-event-day*.js`) — do not touch
- **Other CRM tabs** (dashboard, leads, events) — do not modify behavior
- **Demo tenant seed data** — addressed in future CRM_DEMO_SEED SPEC
- **DB wrapper migration** (`sb.from()` → `DB.*`) — deferred per M4-DEBT-02

---

## 8. Expected Final State

### New files

1. **`modules/crm/crm-messaging-tab.js`** (≤300 lines)
   - Main orchestrator for the messaging tab
   - Sub-tab navigation: תבניות (Templates) | כללי אוטומציה (Automation Rules) | שליחה ידנית (Broadcast) | היסטוריה (Log)
   - `window.loadCrmMessagingTab()` — entry point called from `showCrmTab('messaging')`
   - Loads sub-tabs lazily on first click

2. **`modules/crm/crm-messaging-templates.js`** (≤300 lines)
   - CRUD for `crm_message_templates` table
   - `window.loadMessagingTemplates()` — renders template list table
   - Template list: name, channel (SMS/WhatsApp/Email badge), language, status toggle, edit button
   - Create/Edit modal: fields = name, slug (auto-generated from name), channel (dropdown: sms/whatsapp/email), language (dropdown: he/ru/en), subject (for email only), body (textarea with variable hint chips: `{{name}}`, `{{event_name}}`, `{{event_date}}`, `{{phone}}`, `{{coupon}}`)
   - Toggle `is_active` inline (no modal needed)
   - All writes include `tenant_id: getTenantId()` + `ActivityLog.write()`
   - ALSO renders automation rules list from `crm_automation_rules` table:
     - Rule list: name, trigger description, channels, active toggle
     - Create/Edit rule modal: name, trigger_entity (lead/event/attendee), trigger_event (status_change/created/updated), trigger_condition (JSON builder or raw JSON textarea), action_type (send_message), action_config (template_id, channels, delay)
     - Toggle `is_active` inline

3. **`modules/crm/crm-messaging-broadcast.js`** (≤300 lines)
   - Manual broadcast creation + message log history
   - **Broadcast section:**
     - Filter bar: status (dropdown from `crm_statuses` where `entity_type='lead'`), event (dropdown from `crm_events`), language (he/ru/all), source (text input)
     - Live recipient count: "ההודעה תישלח ל-X אנשים" — queries `crm_leads` with filters, displays count
     - Channel checkboxes: SMS / WhatsApp / Email
     - Message editor: select template OR write custom text (textarea with variable chips)
     - Preview panel: shows message with sample data from first matching lead
     - Send button with confirmation modal: "בטוח? X הודעות ב-Y ערוצים"
     - On send: creates `crm_broadcasts` row (status='sent', stores filter_criteria as JSONB) + creates `crm_message_log` row per recipient (status='pending' — actual sending is future scope)
   - **Message log section:**
     - `window.loadMessagingLog()` — renders log table from `crm_message_log`
     - Columns: date, lead name (join to `crm_leads.full_name`), channel, template name, status badge, content preview
     - Filter by: channel, status, date range
     - Pagination (50 per page, same pattern as crm-leads-tab.js)

### Modified files

1. **`crm.html`** — 3 changes:
   - Add nav button after events button (line ~32):
     ```html
     <button data-tab="messaging" onclick="showCrmTab('messaging')">&#9993; הודעות</button>
     ```
   - Add tab section before the event-day hidden section (line ~80):
     ```html
     <!-- ========== TAB 4: MESSAGING HUB ========== -->
     <section id="tab-messaging" class="tab"></section>
     ```
   - Add 3 script tags after the event-day script tags (before `</body>`):
     ```html
     <script src="modules/crm/crm-messaging-tab.js"></script>
     <script src="modules/crm/crm-messaging-templates.js"></script>
     <script src="modules/crm/crm-messaging-broadcast.js"></script>
     ```

2. **`modules/crm/crm-init.js`** — 1 change:
   - Add routing line in `showCrmTab()` function after the `event-day` line (line ~21):
     ```javascript
     if (name === 'messaging' && typeof loadCrmMessagingTab === 'function') loadCrmMessagingTab();
     ```

### Deleted files

None.

### DB state after execution

- `crm_message_templates`: 0 rows (or test rows if executor seeds for verification — acceptable)
- `crm_automation_rules`: 0 rows (same)
- `crm_broadcasts`: 0 rows (same)
- `crm_message_log`: 0 rows (same)
- **No new tables, columns, views, RPCs, or policies.** All 4 tables already
  exist with correct RLS from Phase A migration.

### Docs updated (MUST include — at end of execution)

- Module 4 `SESSION_CONTEXT.md` — update with B5 status
- Module 4 `CHANGELOG.md` — add B5 section with commits
- Module 4 `MODULE_MAP.md` — add 3 new files + new window globals

---

## 9. Commit Plan

- **Commit 1:** `feat(crm): add messaging hub tab orchestrator and template management`
  - New: `crm-messaging-tab.js`, `crm-messaging-templates.js`
  - Modified: `crm.html` (nav button + section + 2 script tags), `crm-init.js` (routing)

- **Commit 2:** `feat(crm): add broadcast send and message log UI`
  - New: `crm-messaging-broadcast.js`
  - Modified: `crm.html` (1 more script tag)

- **Commit 3:** `docs(crm): update Module 4 docs for B5 Messaging Hub`
  - Modified: `SESSION_CONTEXT.md`, `CHANGELOG.md`, `MODULE_MAP.md`

- **Commit 4:** `chore(spec): close CRM_PHASE_B5_MESSAGING_HUB with retrospective`
  - New: `EXECUTION_REPORT.md`, `FINDINGS.md` (in this SPEC folder)

---

## 10. Technical Patterns

### Sub-tab navigation pattern

The messaging tab uses internal sub-tabs (not `#crmNav` buttons). Render 4
sub-tab buttons inside `#tab-messaging` using a `.crm-sub-nav` container.
Active sub-tab gets `.active` class. Pattern:

```javascript
// Inside crm-messaging-tab.js
function loadCrmMessagingTab() {
  var panel = document.getElementById('tab-messaging');
  if (panel.dataset.loaded) return; // load once
  panel.innerHTML = '<div class="crm-sub-nav">' +
    '<button class="active" onclick="showMessagingSub(\'templates\')">תבניות</button>' +
    '<button onclick="showMessagingSub(\'rules\')">כללי אוטומציה</button>' +
    '<button onclick="showMessagingSub(\'broadcast\')">שליחה ידנית</button>' +
    '<button onclick="showMessagingSub(\'log\')">היסטוריה</button>' +
    '</div>' +
    '<div id="messaging-sub-content" class="card"></div>';
  panel.dataset.loaded = 'true';
  showMessagingSub('templates'); // default sub-tab
}
```

### ActivityLog.write pattern

For every write operation, call ActivityLog.write with the same metadata shape
used in B4 Event Day files. Reference: `crm-event-day-checkin.js:64` for the
exact call pattern:

```javascript
ActivityLog.write({
  action: 'crm.template.create',
  entity_type: 'crm_message_template',
  entity_id: row.id,
  severity: 'info',
  metadata: { template_name: row.name, channel: row.channel }
});
```

### Broadcast recipient count query

```javascript
// Build filter dynamically — same pattern as crm-leads-tab.js
var query = sb.from('crm_leads').select('id', { count: 'exact', head: true })
  .eq('tenant_id', getTenantId());
if (statusFilter) query = query.eq('status_id', statusFilter);
if (langFilter) query = query.eq('language', langFilter);
if (eventFilter) {
  // Join through crm_event_attendees
  var attendeeIds = await sb.from('crm_event_attendees')
    .select('lead_id')
    .eq('tenant_id', getTenantId())
    .eq('event_id', eventFilter);
  var ids = (attendeeIds.data || []).map(function(r) { return r.lead_id; });
  query = query.in('id', ids);
}
var result = await query;
// result.count = number of matching leads
```

### Template variable chips (UI hint only — no substitution)

Display available variables as clickable chips below the body textarea. On
click, insert `{{variable}}` at cursor position. Available variables:
`{{name}}`, `{{phone}}`, `{{phone_local}}`, `{{email}}`, `{{event_name}}`,
`{{event_date}}`, `{{event_time}}`, `{{event_address}}`, `{{coupon}}`,
`{{registration_link}}`, `{{unsubscribe_link}}`, `{{lead_id}}`, `{{source}}`.

These come from `campaigns/supersale/make/scenario-8-event-reminders.md §Variables`.

---

## 11. Lessons Already Incorporated

- **FROM `CRM_PHASE_B3_UI_CORE/FOREMAN_REVIEW.md` Proposal 1** → "Mandatory
  file-inspection before writing SPEC code blocks" → APPLIED: all code blocks
  in §8 and §10 verified against actual `crm.html` (nav `#crmNav`, 3 buttons
  at lines 30-32), actual `crm-init.js` (`showCrmTab` function at lines 10-22,
  routing pattern on lines 18-21). crm.html was truncated at line 103 in
  Cowork mount — known issue (Cowork null-byte truncation). Code blocks based
  on verified content up to truncation point + confirmed B4 additions from
  EXECUTION_REPORT.

- **FROM `CRM_PHASE_B3_UI_CORE/FOREMAN_REVIEW.md` Proposal 2** → "Chrome
  DevTools precondition for UI SPECs" → APPLIED: behavioral criteria (13-22)
  explicitly typed as "B" and deferred to Daniel's manual QA per established
  pattern.

- **FROM `CRM_PHASE_B4_EVENT_DAY/FOREMAN_REVIEW.md` Proposal 1** → "SPEC
  freshness check for pending commits sections" → APPLIED: this SPEC has NO
  pending-commits section. All prior commits are on `develop`.

- **FROM `CRM_PHASE_B4_EVENT_DAY/FOREMAN_REVIEW.md` Proposal 2** → "Include
  ActivityLog.write call reference in UI SPECs with writes" → APPLIED: §10
  includes concrete `ActivityLog.write` reference with file:line
  (`crm-event-day-checkin.js:64`) and exact metadata shape.

- **Cross-Reference Check** completed 2026-04-20 against live Supabase: 4
  target tables exist with correct RLS. 0 collisions for new function/file
  names (`loadCrmMessagingTab`, `loadMessagingTemplates`, `loadMessagingLog`,
  `showMessagingSub`, `crm-messaging-tab.js`, `crm-messaging-templates.js`,
  `crm-messaging-broadcast.js`). Verified via `grep -rn` — 0 hits in
  `modules/crm/` for any of these names.

---

## 12. Dependencies / Preconditions

- B4 Event Day must be committed on `develop` (confirmed: commit range
  `3d4e89f..5709799` landed)
- `crm.html` must be intact on the executor's machine (Cowork mount is
  truncated — the executor runs on Windows desktop where the file is complete)
- 4 DB tables must exist: `crm_message_templates`, `crm_automation_rules`,
  `crm_broadcasts`, `crm_message_log` (verified 2026-04-20 via Supabase MCP)
- No pending uncommitted files from prior phases (executor: run `git status`
  as First Action step 4; if WIP files exist, handle per CLAUDE.md protocol)

---

## 13. CSS Considerations

The messaging tab reuses existing CRM CSS classes (`.crm-filter-bar`,
`.crm-table-wrap`, `.crm-pagination`, `.card`) already defined in `css/crm.css`.

For sub-tab navigation, add a `.crm-sub-nav` style block. **If `css/crm.css`
already has enough room** (currently ~50 lines), add there. If adding would
push it over 100 lines, create a separate section within the same file (do NOT
create a new CSS file for <30 lines of styles).

Suggested sub-nav styles:
```css
/* Messaging sub-tabs */
.crm-sub-nav { display:flex; gap:8px; margin-bottom:16px; }
.crm-sub-nav button {
  padding:8px 16px; border:1px solid var(--border); border-radius:8px;
  background:var(--white); cursor:pointer; font-size:14px;
}
.crm-sub-nav button.active {
  background:var(--primary); color:var(--white); border-color:var(--primary);
}
```

---

## 14. Daniel-Facing Summary (Hebrew)

> מסך הודעות מרכזי ב-CRM — ניהול תבניות הודעה (יצירה, עריכה, הפעלה/כיבוי),
> כללי אוטומציה (מתי לשלוח מה), שליחה ידנית לקבוצות מסוננות, והיסטוריית
> הודעות. הטבלאות כבר קיימות בסופרבייס מ-Phase A — זה בניית ממשק בלבד.
