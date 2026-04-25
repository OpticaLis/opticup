# FINDINGS — EVENT_EDIT_MODAL_STACK_FIX

---

## F1 — Events-list cell still shows the old name after edit-modal save — LOW

**Severity:** LOW (UX, parent-list staleness)
**Location:** `modules/crm/crm-events-tab.js` (the events list
under the "אירועים" navigation tab) and the detail-modal's edit
flow in `modules/crm/crm-events-detail.js`.

**Description:** After this SPEC's fix, the detail modal correctly
re-renders with the new event name. But the parent list behind the
modal (the row in the events table that says e.g. "#10 WLDF_QA")
still shows the OLD name until the user closes the modal AND
reloads the events tab (or navigates away and back). This is the
same class of staleness as F4 from POST_WAITING_LIST_FIXES (parent
list not refreshed after detail-modal mutation).

**Suggested fix:** In the edit-success handler in
`crm-events-detail.js`, after `renderAndWire()`, also call
`window.reloadCrmEventsTab` if defined (analogous to how
`crm-leads-detail.js` calls `window.reloadCrmLeadsTab` /
`window.reloadCrmIncomingTab` after a successful mutation). ~2
lines.

**Not urgent:** Daniel's prompt explicitly scoped the fix to "the
event detail modal stays with updated data" — the events-list
parent refresh is out of scope. Worth a tiny follow-up SPEC since
it's a visible inconsistency.

---

## F2 — Active sub-tab is reset to "משתתפים" after edit save — LOW

**Severity:** LOW (UX, minor regression)
**Location:** `modules/crm/crm-events-detail.js:wireSubTabs` —
defaults to the first sub-tab on every render.

**Description:** If Daniel was on the "סטטיסטיקות" sub-tab when
he clicked "✏️ ערוך פרטים", he'll find himself back on
"משתתפים" after save. The fix's `renderAndWire` rebuilds the
body innerHTML which loses the active-sub-tab state.

**Suggested fix:** Capture the active sub-tab key before the
re-render and pass it to `wireSubTabs(body, ev, stats, atts,
{initialTab: prevKey})`. ~5 lines, including a small extension to
`wireSubTabs`'s signature.

**Not urgent:** Edit is a relatively rare operation; Daniel's prompt
didn't mention this. If it becomes annoying, ~5 minutes to fix.

---

## F3 — `Modal.setTitle` helper would simplify three recent SPECs — INFO

**Severity:** INFO (developer ergonomics)
**Location:** `shared/js/modal-builder.js` — no `setTitle` method.

**Description:** This SPEC, AUTOMATION_HISTORY_FIXES (status badge
re-render in drill-down), and POST_WAITING_LIST_FIXES (lead detail
re-render) all needed in-place title patching of a Modal frame.
Each one wrote
`modal.el.querySelector('.modal-title').textContent = newTitle;`
inline. A single shared helper would be cleaner.

**Suggested:** Add `setTitle(newTitle)` to the modal handle returned
by `Modal.show`. 3 lines:

```js
return {
  el: el, close: close,
  setTitle: function (t) {
    var el2 = el.querySelector('.modal-title');
    if (el2) el2.textContent = t;
  }
};
```

Then this SPEC becomes `modal.setTitle('אירוע #' + … + ' — ' + …);`.

**Not urgent:** standalone refactor.
