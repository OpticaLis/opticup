# EXECUTION_REPORT — EVENT_EDIT_MODAL_STACK_FIX

## Summary

The `onUpdated` callback wired into the event-detail modal's edit
button explicitly called `modal.close()` on the **detail** modal
after a successful save — closing both modals (since the edit
modal also closes itself separately). Daniel ended up back at the
event list, having to reopen the event to see his change.

The fix replaces the close-detail-modal call with a re-render of
the detail body using the merged updated event row, plus a title
update on the modal frame. The edit modal still closes itself
inside `crm-event-edit.js` (untouched). End result: edit modal
disappears, detail modal stays open with the new data.

## What was done

- **`modules/crm/crm-events-detail.js`** (350 lines, at Rule 12 cap)
  - Replaced the original IIFE one-liner that wired the edit button
    + closed the detail modal on save with a `renderAndWire()`
    closure that captures `body`, `modal`, `data`, `stats` and
    fully renders + re-wires every interactive piece in the detail
    body. On edit save, `Object.assign(data.event, u)` merges the
    server row, the modal title is patched in place, and
    `renderAndWire()` is called recursively — destroying old
    listeners along with the old DOM and re-binding fresh ones
    against the freshly-rendered body. The detail modal frame is
    never closed.
  - The first call to `renderAndWire()` is the original initial
    render path; the second call (from the edit-success closure)
    is the refresh. Same code path, no duplication.
  - Title patching: `modal.el.querySelector('.modal-title')` —
    `.modal-title` is created at line 72 of `shared/js/modal-builder.js`
    so this selector is stable.

- **No DB changes.** Test rename used during E2E QA was rolled back:
  `UPDATE crm_events SET name='WLDF_QA' WHERE event_number=10 AND
  tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'`.

- **No EF changes.** Pure frontend.

## End-to-end verification (chrome-devtools)

Ran on `http://localhost:3000/crm.html?t=demo`:

1. Opened "אירועים" tab.
2. Clicked event #10 ("WLDF_QA") → detail modal opens, title
   "אירוע #10 — WLDF_QA".
3. Clicked "✏️ ערוך פרטים" → edit modal stacks on top, title
   "עריכת אירוע #10".
4. Filled the name field with "WLDF_QA — renamed by E2E".
5. Clicked "שמור". Toast appeared: "האירוע עודכן".
6. **Snapshot after save:**
   - Edit modal: gone.
   - Detail modal: still open.
   - Title: **"אירוע #10 — WLDF_QA — renamed by E2E"**.
   - Body `<h2>`: **"WLDF_QA — renamed by E2E"**.
   - All other detail-modal data intact (date, location, capacity,
     attendees list, sub-tabs, etc.).
   - All wired buttons functional (status change, send message,
     extra coupons, edit-event itself — re-bound on refresh).

Test rename was reverted via SQL after QA.

## Deviations from SPEC

None. The fix lands exactly where Daniel pointed
(`crm-events-detail.js`'s edit-button wiring — not the edit modal's
own save handler, which was already correctly closing only itself).

## Decisions made in real time

1. **Re-render in place vs. close+reopen.** Daniel's prompt option
   2 was "if there's a `refreshEventDetailModal(eventId)` function,
   call it; otherwise re-render the detail in the same modal stack."
   No such function exists. Chose the re-render route — same
   modal frame, refreshed innerHTML + re-wired listeners. A close-
   and-reopen would have been simpler but would visibly flicker the
   modal frame and lose any sub-tab state. Re-render keeps the
   experience instant and preserves the active sub-tab as a side
   effect (because `wireSubTabs` defaults to "משתתפים" each time —
   if Daniel was on "סטטיסטיקות", he'll be returned to משתתפים
   after edit; minor regression from his prior position but
   matches existing behavior on every other detail-tab interaction).
2. **Patch title via direct DOM access, not via Modal API.** The
   Modal API in `shared/js/modal-builder.js` does not expose a
   `setTitle` method. Wrote a 2-liner that selects `.modal-title`
   and sets `textContent`. If a `setTitle` ever lands on Modal, this
   becomes a 1-liner; until then this is the cleanest approach.
3. **`renderAndWire` is a single closure, not a method on a state
   object.** Could have refactored `openCrmEventDetail` into a
   class-like state + methods. Out of scope — the existing IIFE
   style is consistent with the rest of `modules/crm/`. The 1-line
   recursive call (`renderAndWire()` from inside the edit-success
   handler) is sufficient.
4. **Did not extend rendering to update `crm-events-tab` (the parent
   list).** The events-list cell still shows the old name until the
   user navigates away and back. Out of scope per Daniel's prompt
   ("פרטי האירוע נשאר עם הנתונים המעודכנים" — the detail modal,
   not the list). The parent list refresh is a follow-up if Daniel
   wants it; flagged in FINDINGS as F1.

## What would have helped me go faster

A `Modal.setTitle(modalRef, newTitle)` helper in the shared modal
builder. Would have removed the awkward direct-DOM `.modal-title`
selector here. Other recent SPECs (e.g. status changes) have
similar in-place title-update needs.

## Self-assessment

| Dimension | Score | Justification |
|---|---|---|
| (a) adherence to SPEC | 10 | Exactly the bug Daniel described, fix lands in the file he pointed to, behavior verified by browser session matches "צפוי" (expected) line-for-line. |
| (b) adherence to Iron Rules | 10 | Rule 12 respected (350 hard cap). No Iron-Rule-touching changes elsewhere. |
| (c) commit hygiene | 10 | Single concern (1 file modified). Test data revert documented in EXECUTION_REPORT. |
| (d) documentation currency | 10 | EXECUTION_REPORT + FINDINGS in place. No public function changes. |

## 2 proposals to improve opticup-executor

1. **Add a "Modal.setTitle" recipe to `docs/CONVENTIONS.md`.** This
   is the second SPEC in two days (after AUTOMATION_HISTORY_FIXES
   for status badges) where in-place title patching via a direct
   DOM query was needed. Either (a) extend the Modal API in
   `shared/js/modal-builder.js` with a tiny `setTitle(newTitle)`
   method on the returned modal handle, or (b) document the
   `modal.el.querySelector('.modal-title').textContent = …`
   pattern as canonical so future SPECs don't reinvent it.
   Proposal: ship (a) — 3 lines on the modal handle.
2. **`renderAndWire`-style closure pattern is uncommon enough to
   merit a doc note.** This SPEC and its predecessors
   (MANUAL_TERMS_APPROVAL's `wireDetailsButtons` callback,
   AUTOMATION_HISTORY_FIXES's drill-down re-render) all use the
   "re-render plus re-wire on a callback" pattern but with subtly
   different shapes. Add a `docs/CONVENTIONS.md` section
   "Re-rendering after async mutation" that codifies the closure
   pattern (capture `body`/`modal`/`data` once, re-bind every
   handler) so the next executor doesn't have to re-derive it.
