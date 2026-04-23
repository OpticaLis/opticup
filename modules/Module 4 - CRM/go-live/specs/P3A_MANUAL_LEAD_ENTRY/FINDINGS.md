# FINDINGS — P3A_MANUAL_LEAD_ENTRY

> **Written by:** opticup-executor
> **Executed on:** 2026-04-22

One finding logged during P3a execution. Resolved in-SPEC per Daniel's
authorization; kept here for traceability and for the follow-up cleanup.

---

## Finding M4-BUG-04 — `crm-bootstrap.js` `showCrmTab` override missing `incoming` case

**Severity:** HIGH (silently broke incoming tab's loader path since B6/B7)

**Location:** `modules/crm/crm-bootstrap.js:19-41`

**Description:** `crm-init.js` defines `window.showCrmTab` with loader calls
for all 6 tabs (dashboard / incoming / leads / events / event-day / messaging).
`crm-bootstrap.js` loads LAST (per its own file header "Load LAST") and
**completely reassigns** `window.showCrmTab` at line 19. The bootstrap version
has loader calls for 5 tabs but is missing the `incoming` case:

```js
// crm-bootstrap.js lines 36-40 BEFORE the hotfix:
if (name === 'dashboard' && typeof loadCrmDashboard === 'function') loadCrmDashboard();
// ← missing line for incoming
if (name === 'leads' && typeof loadCrmLeadsTab === 'function') loadCrmLeadsTab();
if (name === 'events' && typeof loadCrmEventsTab === 'function') loadCrmEventsTab();
if (name === 'event-day' && typeof loadCrmEventDay === 'function') loadCrmEventDay();
if (name === 'messaging' && typeof loadCrmMessagingTab === 'function') loadCrmMessagingTab();
```

**Impact before P3a:** The tab SHOWED correctly when the user clicked "לידים נכנסים"
(because the tab-panel `.active` class toggle was still handled by the same
function), so `loadIncomingLeads` was never called → `_allLeads` stayed empty
→ the table rendered "אין לידים נכנסים" unless some OTHER code path had
loaded leads. In practice this bug was latent because:

- On Prizma, the incoming tab was usually hydrated via a different code path
  (the dashboard loader touches `v_crm_leads_with_tags`).
- On demo, the tab is already empty (no leads), so "no leads" looked correct.
- The only interactive elements on the tab (search box + status filter) work
  via passive DOM state — they don't need `wireIncomingEvents` to have run.

**How P3a exposed it:** P3a's "+ הוסף ליד" button is the first element on the
incoming tab that requires an event listener attached by `wireIncomingEvents`.
Without `loadCrmIncomingTab` running, `wireIncomingEvents` never ran, so the
click did nothing. Tests 1-6 were all blocked.

**Reproduction steps (before hotfix):**
1. Load `crm.html?t=demo` fresh (no cache).
2. Click "לידים נכנסים" tab.
3. Open DevTools → Sources → set breakpoint at `loadCrmIncomingTab` top.
4. Observe: breakpoint never hits.

**Fix applied:** Commit `e3c5329` — 1-line addition to `crm-bootstrap.js`
matching the existing pattern for the other 5 tabs:
```js
if (name === 'incoming' && typeof loadCrmIncomingTab === 'function') loadCrmIncomingTab();
```

**Suggested follow-up action (NEW SPEC):**
The root cause is architectural — `crm-bootstrap.js` shouldn't be
REPLACING `window.showCrmTab`; it should be WRAPPING it. Two files each
maintaining a parallel switch statement is fragile (this is the 1st bug of
this class — there could be a 2nd waiting to happen if a new tab is added
and the author updates only one file). A future cleanup SPEC should:

1. Refactor `crm-bootstrap.js` to wrap the original `window.showCrmTab`:
   ```js
   var originalShowCrmTab = window.showCrmTab;
   window.showCrmTab = function (name) {
     if (typeof originalShowCrmTab === 'function') originalShowCrmTab(name);
     // bootstrap-specific additions: header update, lucide init, etc.
     updateHeader(name);
   };
   ```
2. OR consolidate ALL tab-switching logic into `crm-init.js`, removing the
   override from `crm-bootstrap.js` entirely and exposing needed helpers
   (`updateHeader`, `toggleCrmRole`) as standalone functions that `init`
   calls.

Disposition: **FIXED IN-SPEC**. Follow-up architecture cleanup deferred to
a dedicated SPEC (no reopen needed — the immediate bug is closed). The
architectural risk is noted in SESSION_CONTEXT §"P3a follow-ups".

---

## Zero other findings

No additional bugs, tech debt, or Rule violations discovered during P3a
execution. All changes stayed within the §4 Autonomy Envelope.
