# SPEC — P11_BROADCAST_UPGRADE

> **Location:** `modules/Module 4 - CRM/go-live/specs/P11_BROADCAST_UPGRADE/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-23
> **Module:** 4 — CRM
> **Phase:** Go-Live P11
> **Author signature:** Cowork session happy-elegant-edison

---

## 1. Goal

Upgrade the broadcast wizard ("שליחה ידנית") and template variable UX to
make manual message sending professional and self-service. Three tracks:

1. **Variable copy-to-clipboard** — clicking a variable in the template editor
   currently scrolls the page down instead of inserting/copying. Fix: click
   copies `%variable%` to clipboard with visual feedback, user pastes wherever
   they want.

2. **Advanced recipient filtering** — replace the current single-status dropdown
   with a full filtering panel: multi-status checkboxes, board selection
   (incoming/registered/both), event selection (one or more, open events only),
   language, source. Reuse `CrmLeadFilters` patterns from P9.

3. **Recipients preview popup** — "נמצאו X נמענים" becomes clickable. Opens a
   popup/modal listing each matched lead (name, phone, status, event) so the
   user can verify who will receive the message before sending.

---

## 2. Background & Motivation

### Variable Click Bug (Daniel's QA)

Daniel reported: "בכל לחיצה על משתנה כלשהו זה מוריד אותי למטה במסך."

Root cause analysis: In `crm-messaging-templates.js:203-204`, `insertVariable`
calls `body.focus()` and `body.setSelectionRange()` which scrolls the textarea
into view. This is the correct behavior for the TEMPLATE EDITOR (where the
textarea is visible and the user wants to insert at cursor position).

But Daniel's complaint suggests he wants to use variables OUTSIDE the template
editor — perhaps when composing a manual message in the broadcast wizard or
quick-send dialog. Currently neither the broadcast wizard (`crm-messaging-broadcast.js`)
nor the quick-send dialog (`crm-send-dialog.js`) has a variable picker at all.

**Fix:** Add a variable reference panel to both the broadcast wizard (step 3)
and the quick-send dialog. Click = copy to clipboard + toast "הועתק". In the
template editor, keep the current insert-at-cursor behavior (it's correct there).

### Broadcast Wizard Limitations (Daniel's QA)

Current wizard step 1 ("נמענים") has:
- Single status dropdown (`<select>` with one value)
- Single event dropdown
- Language dropdown
- No board selection (always queries all non-deleted leads)
- No way to see WHO matched — just a count

Daniel wants: "לבחור את הבורד הרלוונטי (או מספר בורדים) לדוגמא לידים, רשומים,
לידים שהיו באירוע כלשהו, במספר אירועים, באירוע פתוח וכו, בסטטוס כלשהו...
גם מספר סטטוסים לא מוגבל לאחד."

### Recipients Preview (Daniel's QA)

Daniel: "אמורה להיות אפשרות ללחוץ על 'נמצאו X נמענים' ולראות את מי זה סינן
בצורה מקצועית כמו חלון פופ אפ."

---

## 3. Success Criteria (Measurable)

### Track A — Variable Copy-to-Clipboard

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Template editor variable picker retains insert-at-cursor behavior | Click variable → inserted at textarea cursor position | Browser QA in template editor |
| 2 | Broadcast wizard step 3 has a variable reference panel | "משתנים" button or inline list showing all available variables | Browser QA |
| 3 | Clicking a variable in broadcast wizard copies to clipboard | `navigator.clipboard.writeText('%name%')` + toast "הועתק: %name%" | Browser QA |
| 4 | Quick-send dialog has a variable reference panel | "משתנים" toggle/dropdown below the textarea | Browser QA |
| 5 | Clicking a variable in quick-send copies to clipboard | Same clipboard + toast behavior | Browser QA |
| 6 | No scroll-down on click in any context | Page position unchanged after variable click | Browser QA |

### Track B — Advanced Recipient Filtering

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 7 | Board selection: checkboxes for "לידים נכנסים" and "רשומים" | At least one must be checked. Default: both. | Browser QA |
| 8 | Multi-status checkboxes (not dropdown) | Checkboxes for each status from `CRM_STATUSES.lead`. Multiple selectable. | Browser QA |
| 9 | Event selection: multi-select with checkboxes | Can select 0, 1, or multiple events. Events listed with name + date. | Browser QA |
| 10 | "אירועים פתוחים בלבד" toggle | When on, event list shows only events where `event_date >= today`. | Browser QA |
| 11 | Language filter preserved | Dropdown as today (הכל / עברית / רוסית / אנגלית) | Browser QA |
| 12 | Source filter added | Dropdown: הכל / אתר / ידני / אחר | Browser QA |
| 13 | Recipient count updates live on every filter change | "נמצאו X נמענים" refreshes on each checkbox/dropdown change | Browser QA |
| 14 | `buildLeadIds` respects board selection | Board "incoming" = status in incoming statuses, "registered" = status in registered statuses | Code review |
| 15 | `buildLeadIds` respects multi-status | `.in('status', [...selectedStatuses])` | Code review |
| 16 | `buildLeadIds` respects multi-event | Lead must be attendee of ANY selected event (OR logic) | Code review |
| 17 | `buildLeadIds` filters `unsubscribed_at IS NULL` | Already exists — verify preserved | Code review |
| 18 | Empty filter = all active non-deleted non-unsubscribed leads | Default state sends to everyone | Browser QA |

### Track C — Recipients Preview Popup

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 19 | "נמצאו X נמענים" is a clickable link/button | Cursor pointer, underline or button styling | Browser QA |
| 20 | Click opens modal with lead list | Modal title: "נמענים — X לידים" | Browser QA |
| 21 | List shows: name, phone, status (Hebrew label), source | Table or card layout | Browser QA |
| 22 | List is scrollable for large sets | `max-h-[400px] overflow-y-auto` or similar | Browser QA |
| 23 | Modal has close button | X or "סגור" button | Browser QA |
| 24 | Preview list matches actual recipient count | Same query as `buildLeadIds` but with `select('id, full_name, phone, status, source')` | Code review |

### Track D — Documentation & Quality

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 25 | SESSION_CONTEXT.md updated | P11 CLOSED | `grep 'P11' modules/Module\ 4\ -\ CRM/docs/SESSION_CONTEXT.md` |
| 26 | Go-Live ROADMAP updated | P11 check | `grep 'P11' modules/Module\ 4\ -\ CRM/go-live/ROADMAP.md` |
| 27 | All CRM JS files ≤ 350 lines | Rule 12 | `wc -l modules/crm/*.js` |
| 28 | CRM page loads with 0 new console errors | Pre-existing only | Browser QA |
| 29 | Commits produced | 4–8 | `git log --oneline` from start hash |

---

## 4. Autonomy Envelope

### MAXIMUM AUTONOMY — designed for unattended run.

The executor has pre-authorization for ALL of the following without stopping:

- Read/modify any file under `modules/crm/`
- Read/modify `crm.html` and `css/crm*.css`
- Split files for Rule 12 if any file exceeds 350 lines
- Commit and push to `develop`

### What REQUIRES stopping (ONLY these)

- Modifying any Edge Function (`supabase/functions/`)
- Schema changes (DDL) — ALTER TABLE, CREATE TABLE
- Any file OUTSIDE `modules/crm/`, `crm.html`, `css/crm*.css`, `modules/Module 4 - CRM/`
- Any merge to `main`
- Any test data using phones NOT in `['+972537889878', '+972503348349']`

### DO NOT STOP once past pre-flight.

---

## 5. Stop-on-Deviation Triggers

1. If any file exceeds 350 lines and cannot be split → STOP
2. If `crm.html` fails to load → STOP
3. If the broadcast wizard becomes non-functional (can't reach step 5) → STOP

---

## 6. Rollback Plan

- **Code only:** `git revert` in reverse order.
- **No DB changes.** No EF changes. No data migrations.
- Clean revert path — all changes are client-side JS.

---

## 7. Out of Scope

- Edge Function changes (send-message, unsubscribe, lead-intake)
- Schema changes (no ALTER TABLE)
- Prizma tenant operations (P7)
- Scheduled/timed sending (wizard step 4 remains "שלח עכשיו" only)
- WhatsApp channel integration
- MODULE_MAP / GLOBAL_MAP updates (Integration Ceremony)
- `shared.js` changes
- Adding new template variables (only exposing existing ones in new places)

---

## 8. Expected Final State

### Modified files

- `modules/crm/crm-messaging-broadcast.js` (251L → ~300-340L) — advanced filtering
  in step 1, variable panel in step 3, recipients preview popup.
  **Rule 12 risk:** If this exceeds 350 lines, split the recipient filtering logic
  into `crm-broadcast-filters.js` (new file, pre-authorized).
- `modules/crm/crm-send-dialog.js` (119L → ~150-170L) — add variable reference panel
- `modules/crm/crm-messaging-templates.js` (306L) — minor: ensure variable click
  in the editor doesn't cause unwanted scroll. May need `event.preventDefault()`
  or scroll position restore.
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — P11 CLOSED
- `modules/Module 4 - CRM/go-live/ROADMAP.md` — P11 check

### Potentially new files

- `modules/crm/crm-broadcast-filters.js` — only if `crm-messaging-broadcast.js`
  exceeds 350 lines after changes (Rule 12 split, pre-authorized)

---

## 9. Commit Plan

- **Commit 1:** `feat(crm): add variable copy-to-clipboard in broadcast wizard + quick-send`
  Files: `crm-messaging-broadcast.js`, `crm-send-dialog.js`, possibly `crm-messaging-templates.js`
- **Commit 2:** `feat(crm): upgrade broadcast wizard with advanced recipient filtering`
  Files: `crm-messaging-broadcast.js` (and `crm-broadcast-filters.js` if split needed)
- **Commit 3:** `feat(crm): add recipients preview popup in broadcast wizard`
  Files: `crm-messaging-broadcast.js`
- **Commit 4:** `test(crm): verify broadcast wizard end-to-end`
  (no-op eligible — merge into adjacent if no code changes needed)
- **Commit 5:** `docs(crm): mark P11 CLOSED`
  Files: SESSION_CONTEXT.md, ROADMAP.md
- **Commit 6:** `chore(spec): close P11_BROADCAST_UPGRADE with retrospective`
  Files: EXECUTION_REPORT.md, FINDINGS.md

Budget: 4–8 commits (no-op eligible commits may merge).

---

## 10. Dependencies / Preconditions

| Dependency | Status | Verification |
|-----------|--------|-------------|
| P10 (Pre-Sale Hardening) CLOSED | VERIFIED | FOREMAN_REVIEW.md written |
| `CRM_STATUSES.lead` cache exists | VERIFIED | `ensureCrmStatusCache()` in broadcast wizard |
| `CrmLeadFilters` module available | VERIFIED | `crm-lead-filters.js` (221L) exports `getState`, `applyFilters` |
| `crm_events` table queryable | VERIFIED | `loadEventsOnce()` in broadcast wizard |
| `crm_event_attendees` table queryable | VERIFIED | `buildLeadIds()` already JOINs it |
| `navigator.clipboard.writeText` available | UNVERIFIED | HTTPS required. localhost + GitHub Pages both serve HTTPS. Executor should test and add fallback if needed. |

---

## 11. Lessons Already Incorporated

| Source | Proposal | Applied? |
|--------|----------|----------|
| P10 FR §6 Proposal 1 — root-cause-first SPEC | §2 traces each issue to exact code location + line numbers | APPLIED |
| P10 FR §6 Proposal 2 — prior findings cross-reference | No prior findings in scope for this SPEC | N/A |
| P9 FR §6 Proposal 1 — no-op commit labels | Commit 4 marked "no-op eligible" | APPLIED |
| P8 FR — baseline measurements | File sizes measured and documented (251L, 119L, 306L, 151L, 221L) | APPLIED |

**Cross-Reference Check 2026-04-23:** No new global names introduced that could
collide. `crm-broadcast-filters.js` (potential new file) — grepped, does not
exist yet. No collision risk.

---

## 12. Technical Design

### 12.1 Variable Copy-to-Clipboard

**Broadcast wizard step 3 (`wizardStepBody('template')`):**

Add a collapsible variable reference panel below the body textarea:

```javascript
var varPanel = '<div class="mt-2 border border-slate-200 rounded-lg">' +
  '<button type="button" class="w-full text-start px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" id="wiz-var-toggle">משתנים זמינים ▾</button>' +
  '<div class="hidden p-2 grid grid-cols-2 gap-1" id="wiz-var-list">' +
  VARIABLES.map(function (v) {
    return '<div class="flex items-center justify-between px-2 py-1.5 hover:bg-indigo-50 rounded cursor-pointer" data-copy-var="' + v.key + '">' +
      '<code class="text-xs text-indigo-600">' + v.key + '</code>' +
      '<span class="text-xs text-slate-500">' + v.desc + '</span>' +
    '</div>';
  }).join('') + '</div></div>';
```

Wire click handler:

```javascript
el.addEventListener('click', function () {
  var v = el.getAttribute('data-copy-var');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(v).then(function () {
      toast('success', 'הועתק: ' + v);
    });
  } else {
    // Fallback: select a hidden input
    var tmp = document.createElement('input');
    tmp.value = v; document.body.appendChild(tmp);
    tmp.select(); document.execCommand('copy');
    document.body.removeChild(tmp);
    toast('success', 'הועתק: ' + v);
  }
});
```

**VARIABLES constant:** Import the same list from `crm-messaging-templates.js`.
Since both files are IIFEs, the cleanest approach is to define the VARIABLES
array in a shared location. Options (executor chooses):

- (A) Define `window.CRM_TEMPLATE_VARIABLES = [...]` in `crm-messaging-templates.js`
  and read it in `crm-messaging-broadcast.js` and `crm-send-dialog.js`.
- (B) Duplicate the array (10 items, ~10 lines) in each file.

Option A preferred (Rule 21 — no duplicates).

**Quick-send dialog (`crm-send-dialog.js`):**

Add the same collapsible panel below the textarea. Same copy-to-clipboard
behavior. The dialog is small (119L) so this fits easily.

**Template editor (`crm-messaging-templates.js`):**

Keep insert-at-cursor behavior. If the scroll-down issue persists, add
`scrollTop` preservation:

```javascript
var savedScroll = window.scrollY;
body.focus();
body.setSelectionRange(s + v.length, s + v.length);
window.scrollTo(0, savedScroll);
```

### 12.2 Advanced Recipient Filtering

**Replace step 1 of broadcast wizard.** Current: single `<select>` for status +
single `<select>` for event. New layout:

```
שלב 1 — נמענים

בורד:
  [x] לידים נכנסים    [x] רשומים

סטטוס: (multi-checkbox)
  [x] ממתין לאישור    [x] אישר הגעה    [x] ממתין לאירוע    ...
  (empty = all statuses)

אירוע:
  [ ] אירועים פתוחים בלבד
  [x] #5 סופר-סייל מאי 2026
  [ ] #4 השקת קולקציה
  (empty = all events / no event filter)

שפה:   [הכל ▾]
מקור:  [הכל ▾]

[נמצאו 47 נמענים ← clickable]
```

**Board filtering logic:**

The CRM has two tiers/boards with different statuses:
- **Incoming (Tier 1):** statuses that appear in the "לידים נכנסים" tab
- **Registered (Tier 2):** statuses that appear in the "רשומים" tab

The executor must read `CRM_STATUSES.lead` to determine which statuses belong
to which tier. The status objects likely have a `tier` or `tab` field, or the
split is based on the tab code in `crm-leads-tab.js` / `crm-incoming-tab.js`.

**`buildLeadIds` rewrite:**

```javascript
async function buildLeadIds() {
  var tid = getTenantId();
  var q = sb.from('crm_leads')
    .select('id')
    .eq('is_deleted', false)
    .is('unsubscribed_at', null);
  if (tid) q = q.eq('tenant_id', tid);

  // Board filter: restrict to statuses belonging to selected boards
  var boardStatuses = getBoardStatuses(_wizard.boards); // ['incoming','registered'] or subset
  if (boardStatuses.length) q = q.in('status', boardStatuses);

  // Multi-status override: if specific statuses selected, use those instead
  if (_wizard.statuses && _wizard.statuses.length) {
    q = q.in('status', _wizard.statuses);
  }

  // Language
  if (_wizard.language) q = q.eq('language', _wizard.language);

  // Source
  if (_wizard.source) q = q.eq('source', _wizard.source);

  // Multi-event: lead must be attendee of ANY selected event
  if (_wizard.events && _wizard.events.length) {
    var att = sb.from('crm_event_attendees')
      .select('lead_id')
      .in('event_id', _wizard.events)
      .eq('is_deleted', false);
    if (tid) att = att.eq('tenant_id', tid);
    var r = await att;
    if (r.error) throw new Error(r.error.message);
    var ids = [...new Set((r.data || []).map(function (x) { return x.lead_id; }))];
    if (!ids.length) return [];
    q = q.in('id', ids);
  }

  var res = await q;
  if (res.error) throw new Error(res.error.message);
  return (res.data || []).map(function (r) { return r.id; });
}
```

**Wizard state update:**

```javascript
// Replace single values with arrays
_wizard = {
  step: 0,
  boards: ['incoming', 'registered'],  // was implicit "all"
  statuses: [],                          // was single string
  events: [],                            // was single string
  openEventsOnly: false,                 // NEW
  language: '',
  source: '',                            // NEW
  channel: 'whatsapp',
  templateId: '',
  body: '',
  name: '',
  schedule: 'now',
  recipients: 0
};
```

### 12.3 Recipients Preview Popup

**Replace static count div with clickable element:**

```javascript
'<div id="wiz-count" class="px-4 py-3 bg-indigo-50 text-indigo-800 rounded-lg font-bold text-sm cursor-pointer hover:bg-indigo-100 transition" title="לחץ לצפייה בנמענים">מחשב...</div>'
```

**Click handler on `#wiz-count`:**

```javascript
wizCountEl.addEventListener('click', function () {
  if (!_wizard._matchedLeads || !_wizard._matchedLeads.length) return;
  showRecipientsPreview(_wizard._matchedLeads);
});
```

**`showRecipientsPreview(leads)` — popup modal:**

```javascript
function showRecipientsPreview(leads) {
  var statuses = (window.CRM_STATUSES && CRM_STATUSES.lead) || {};
  var rows = leads.map(function (l) {
    var stLabel = (statuses[l.status] && statuses[l.status].name_he) || l.status || '—';
    return '<tr>' +
      '<td class="px-3 py-2 text-sm">' + escapeHtml(l.full_name || '—') + '</td>' +
      '<td class="px-3 py-2 text-sm text-slate-600" style="direction:ltr;text-align:end">' +
        escapeHtml(CrmHelpers.formatPhone(l.phone) || '—') + '</td>' +
      '<td class="px-3 py-2 text-sm">' + escapeHtml(stLabel) + '</td>' +
      '<td class="px-3 py-2 text-sm text-slate-500">' + escapeHtml(l.source || '—') + '</td>' +
    '</tr>';
  }).join('');

  Modal.show({
    title: 'נמענים — ' + leads.length + ' לידים',
    size: 'lg',
    content:
      '<div class="max-h-[400px] overflow-y-auto border border-slate-200 rounded-lg">' +
        '<table class="w-full text-sm">' +
          '<thead><tr class="bg-slate-50">' +
            '<th class="px-3 py-2 text-start font-semibold">שם</th>' +
            '<th class="px-3 py-2 text-start font-semibold">טלפון</th>' +
            '<th class="px-3 py-2 text-start font-semibold">סטטוס</th>' +
            '<th class="px-3 py-2 text-start font-semibold">מקור</th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>'
  });
}
```

**Data flow:** `refreshRecipientCount` already queries leads. Change it to
fetch `id, full_name, phone, status, source` instead of just `id`, store
the array in `_wizard._matchedLeads`, and use `.length` for the count.

### 12.4 Browser QA Protocol

1. **After Commit 1:** Open template editor → click variable → inserted at
   cursor, no page scroll. Open broadcast wizard step 3 → click variable →
   copied to clipboard + toast. Open quick-send → click variable → copied + toast.
2. **After Commit 2:** Open broadcast wizard step 1 → check both boards →
   select 2 statuses → select 1 event → count updates. Uncheck "רשומים" →
   count drops. Select "אירועים פתוחים בלבד" → old events hidden.
3. **After Commit 3:** Click "נמצאו X נמענים" → modal opens with table →
   scrollable → shows correct leads matching the filters.
4. **Full flow:** Set filters → preview recipients → select channel → select
   template → confirm → send (to approved phones only).
