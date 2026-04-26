# SPEC Pattern: Persistent UI elements must anchor OUTSIDE per-tab/per-route cleared regions

## Use when
Adding a UI element that must remain visible across navigation events (e.g.,
notification bell, persistent banner, status indicator).

## The trap
Many CRM/SPA bootstraps use `containerEl.innerHTML = ''` to clear per-tab
content. If your persistent element is anchored INSIDE such a container, it
gets destroyed on every tab switch.

## The discipline

- Before adding a persistent element to an existing layout, search for
  `innerHTML = ''` or equivalent in the bootstrap/router code.
- Identify which container(s) get cleared on navigation events.
- Place the persistent element in a SIBLING container that is NEVER cleared,
  OR wrap the cleared container + persistent element in a parent that
  protects both.
- Add a §5 stop trigger: "persistent UI element disappears on any tab switch".
- Add a §12 QA path: cycle through every tab and verify the element remains
  visible.

## Reference incident

`modules/Module 4 - CRM/docs/specs/M4_ATTENDEE_PAYMENT_UI/QA_FOREMAN_RESULTS.md`
Path 8 — bell destroyed by `crm-bootstrap.js:36`'s `actionsEl.innerHTML = ''`.
Resolved by wrapping bell + actions container in `#crm-header-right` parent
(commit `46e9877`).
