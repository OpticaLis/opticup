# FINDINGS — EVENT_WAITING_LIST_AUTO_TRANSITION

> Issues surfaced during execution that are NOT in scope of this SPEC.

---

## F1 — Dev-server cache serves stale module IIFE across Hard Refresh — HIGH (dev ergonomics)

**Severity:** HIGH for developer experience; zero production impact.
**Location:** `http://localhost:3000/crm.html` static-server setup.
**Description:** Daniel performed a Hard Refresh (Ctrl+Shift+R) on
localhost before running Task 1 UI QA and still saw
`window.CrmCouponDispatch.checkAndAutoClose === undefined`. A
`fetch('/modules/crm/crm-coupon-dispatch.js')` from DevTools returned
the fresh file (with `checkAndAutoClose` in the last line), yet the
in-memory `window.CrmCouponDispatch` object lacked the new function.
The only way to get the real state loaded was to navigate with
`ignoreCache=true` via the chrome-devtools MCP — equivalent to Chrome's
"Empty Cache and Hard Reload" DevTools menu option.
**Root cause hypothesis:** Chrome's disk cache honours the static
server's ETag/Last-Modified as "not stale" if the file mtime didn't
change enough between HEAD requests (mtime granularity), so the
browser serves the cached blob even on Ctrl+Shift+R. Ctrl+Shift+R
typically sends `Cache-Control: no-cache` with the request, but if
the static server's response headers don't respect that, the disk
cache is used anyway. Different Chrome builds handle this slightly
differently.
**Suggested next action:**
(a) Add `Cache-Control: no-store` (or `must-revalidate`) to the dev
server's default response headers for `.js` files. If the dev server
is `npx http-server`, use `-c-1`. If it's custom, add the header.
(b) OR, during development, use Chrome's DevTools → Network tab →
"Disable cache" checkbox (only active while DevTools is open — but
then every session's QA starts with fresh loads).
(c) Add a one-line note to CLAUDE.md §QA: "If a localhost JS change
doesn't appear in the browser after Hard Refresh, use DevTools
'Empty Cache and Hard Reload' instead."
None of the three are blocking; the `ignoreCache=true` workaround is
100% effective when chrome-devtools MCP is available.

---

## F2 — `crm_events.campaign_id` NOT NULL isn't documented in the create flow — LOW

**Severity:** LOW
**Location:** `crm_events.campaign_id` (schema).
**Description:** Creating an event row directly via SQL requires a
`campaign_id` value. This isn't obvious — the error message on
failure is the generic NOT NULL constraint violation, and the caller
needs to know to SELECT `crm_campaigns` first. UI creation handles
this transparently, but any programmatic event creation (test
setup, migrations, one-off scripts) must explicitly fetch the
campaign.
**Suggested next action:** Either set a default on the column
(referencing a "default" campaign per tenant, maybe the first
supersale campaign), or add a SEED-time trigger that auto-populates.
Not worth a SPEC on its own — flag for the next schema review.

---

## F3 — Multi-statement MCP execute_sql silently rolls back preceding UPDATEs on later error — MEDIUM (executor ergonomics)

**Severity:** MEDIUM
**Location:** `mcp__claude_ai_Supabase__execute_sql` tool contract.
**Description:** When multiple statements are concatenated in one
`execute_sql` call, PostgREST runs them in a single transaction. If
statement N fails, statements 1..N-1 are rolled back. Only the
failing statement's error is returned. Preceding UPDATEs appear to
"have happened" (the RETURNING clause even prints a result row in
the streamed parser) but none of them landed.
**Suggested next action:** (a) Add a protocol note to the executor
skill (see EXECUTION_REPORT §8 Proposal 2). (b) Upstream: consider
asking for an `execute_sql` option `autocommit=true` or per-statement
transactions. Until then, single-statement calls are the safe
pattern for writes.

---

## F4 — Two stacked confirmation modals on first register at capacity — INFO

**Severity:** INFO
**Location:** `modules/crm/crm-event-register.js` register flow +
`modules/crm/crm-confirm-send.js` modal.
**Description:** When registering the last-available attendee on an
event at capacity, the UI shows two confirmation modals simultaneously:
(1) attendee.created → registration_confirmation rule, (2)
event_status_change → waiting_list rule (from
checkAndAutoWaitingList). Both modals are valid but the stacking
can confuse operators — they don't immediately realize the
modal behind the first one needs its own approval.
**Suggested next action:** Either:
(a) Stagger the modals — only show the second after the first is
dismissed (requires a modal-queue in Modal.show).
(b) Merge into one combined confirm-send UI showing both rule plans
in tabs.
(c) Leave as-is and document in operator training.
Safe for MVP. Revisit if operator feedback indicates confusion.

---

## F5 — WAITING_LIST_QA event left on demo tenant as test artifact — INFO

**Severity:** INFO
**Location:** `crm_events` id `e8bcae24-980a-4ded-9243-fc7fa427ef4a`.
**Description:** The test event created during this SPEC run is
still on demo at status=closed. It's useful as a historical
reference for future Foreman reviews of this flow (all 8 messages
dispatched are linked to it) but clutters the demo event list.
**Suggested next action:** Either leave or soft-delete later. No
action required for this SPEC.
