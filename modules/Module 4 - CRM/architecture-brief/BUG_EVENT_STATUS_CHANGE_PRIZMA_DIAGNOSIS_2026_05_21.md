# BUG — Event status change "→ registration_open" silently fails on Prizma (works on demo)

> **Diagnosed by:** Campaign Lead (read-only investigation via Chrome MCP on live site + DB probes), 2026-05-21.
> **Severity:** HIGH — blocks Daniel from opening a real event on Prizma production.
> **For:** opticup-strategic (Foreman) → opticup-executor pipeline on Desktop Claude Code.
> **NOT yet fixed.** This is a diagnosis hand-off so the fix pipeline starts from an advanced point, not from zero.

## Symptom (observed live, twice)

On `app.opticalis.co.il/crm.html?t=prizma`, event **#25** ("אירוע המותגים - מאי 2026", status `planning`):
1. Open the event modal → click "שנה סטטוס" → the status dropdown opens correctly (all statuses listed).
2. Click "הרשמה פתוחה" → the dropdown closes, **nothing else happens**. Status stays `planning`.
3. **No console error. No network request to the DB. No success toast.** The click handler for the status item appears to not execute its update path (or exits silently).

## The decisive contrast — same code, same live site

On the SAME live site, tenant **demo** (`?t=demo`), event **#30** (also `planning`):
- Same modal, same "שנה סטטוס" → "הרשמה פתוחה" flow.
- Click → **status changes to "הרשמה פתוחה"** + TWO green success toasts: "סטטוס עודכן" and "סטטוס עודכן: הרשמה פתוחה".

So: identical deployed code (single `crm.html` build serves both tenants), identical UI flow. **Demo works, Prizma silently does nothing.** The differentiator is Prizma-specific DATA or CONFIG, not the code version and not the UI.

## What was RULED OUT (read-only probes, all on live DB)

- **Event fields:** Prizma #25 has all required fields populated (date 2026-05-29, 09:00–14:00, address "הרצל 32, אשקלון", max_capacity 50, booking_fee 50, coupon SuperSale25, max_coupons 50, campaign active). Nearly identical to the demo event that worked.
- **Automation rules:** the two `registration_open` rules ("שינוי סטטוס: נפתחה הרשמה" + "אירוע פתח להרשמה - הזמנת רשימת המתנה") exist + are active on BOTH tenants, `last_error` NULL on both, same `template_slug` config.
- **Templates:** `event_registration_open` + `event_invite_waiting_list` present + active on both tenants.
- **"Only one open event" guard:** ruled out — demo has 6 events in `registration_open` simultaneously; Prizma has ZERO open events, so nothing conflicts.
- **EF health:** automation-engine / dispatch-queue / event-register all returning 200 in logs. Not an EF failure.
- **Permissions:** logged in as מנהל ראשי (main manager) on both; demo worked under the same role.

## Background DB error seen in logs (may or may not be related)

Postgres logs show a recurring `column crm_message_log.template_slug does not exist`. Confirmed: `crm_message_log` has `template_id`, NOT `template_slug`. This is a schema-vs-code drift. It did NOT block demo's transition, so it may be a red herring for THIS bug — but worth checking whether the Prizma status-change path hits a code branch that references `template_slug` where demo's path does not (e.g. a Prizma-only template/rule row that routes differently).

## Where the fix pipeline should look

1. The **client-side status-change handler** in the CRM events screen JS (the file behind `crm.html` events module). Because the click produces NO network request on Prizma but DOES on demo, the handler is exiting BEFORE the DB call on Prizma — likely a guard/validation/`if` that reads some Prizma-specific value and silently returns. Add instrumentation, reproduce on Prizma #25, and find the early-return.
2. Compare the exact data the handler reads for Prizma #25 vs demo #30 (the handler may read a related row — campaign, coupon config, message template, branch, tenant config — that differs).
3. Re-check the `crm_message_log.template_slug` drift as a candidate: if the status-change path writes/reads message-log with a slug column on one branch, the drift could throw inside a try/catch that swallows the error → silent no-op.

## Verification required at fix close (Iron Rule 34)

Reproduce the FIX live via Chrome MCP on Prizma event #25: click "שנה סטטוס" → "הרשמה פתוחה" → confirm status changes + success toast + DB row updated. SQL-only verification is NOT sufficient (this bug produced correct-looking DB/rules but a broken UI path).

## Environment note

This diagnosis was done from a Cowork session whose VM git is unhealthy (ghost `.git/index.lock`, null-byte padding observed in storefront working tree). The FIX must run on Desktop Claude Code where git is clean — not from Cowork.
