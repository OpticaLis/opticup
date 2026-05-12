# FINDINGS — DEMO_WHITELIST_UPDATE

> **Date:** 2026-05-11
> **From:** Full-Auto Pipeline execution
> **Nature:** Out-of-scope discoveries that surfaced during the SPEC's read-only diagnostic phase

---

## Finding F1 — Email allowlist mechanism is missing across the dispatch chain (HIGH)

**Surfaced from:** Diagnostic phase Q2 (see DIAGNOSIS.md §3).

**Description:** No `tenants.test_mode_email_allowlist` column. No `ui_config` jsonb key serving the same role. No EF logic in `send-message` v21 gating email recipients. The `send-message` EF dispatches email straight to `writeDispatchAndSend` → Make webhook with whatever address is in `variables.email`.

**Pre-known?** YES — `C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL/SPEC.md §10` deferred this explicitly, calling out the same gap as a separate post-cutover SPEC.

**Disposition:** **ESCALATE.** Written to sibling `ESCALATION.md` with 3 options (column / `ui_config` jsonb / accept-as-debt). Foreman recommendation: Option 2 (jsonb in `ui_config`, minimal disruption). Architect to decide and a follow-up SPEC will implement.

**Recommended next action:** Architect responds in chat OR in the new OPEN_TASKS row. A new SPEC opens — likely titled `M4_TEST_MODE_EMAIL_ALLOWLIST` (slug TBD by next session).

---

## Finding F2 — Brief's literal phone format vs storage format (LOW, informational)

**Surfaced from:** Diagnostic phase Q3 + EF source read.

**Description:** Brief §2 lists phones in Israeli local format (`0537889878`); demo's row stores them in E.164 (`+972537889878`). These are equivalent values — the EF normalizes both at runtime via `normalizePhone()` — but a future Brief author might not realize the distinction and propose a UPDATE to "fix" the format.

**Pre-known?** Locked by C-001 SPEC §5.1 ("must be a JSONB array of E.164 phone strings"). The SPEC mandate is for E.164.

**Disposition:** **DOCUMENT.** This SPEC's DIAGNOSIS.md §4 explicitly explains the format. No further action needed. If future Briefs cite the SMS allowlist, they should reference C-001's E.164 mandate.

**Recommended next action:** None (already covered).

---

## Finding F3 — `tenants` table has no `updated_at` trigger (already-known TECH_DEBT, surfaced again)

**Surfaced from:** Cross-checking `updated_at` semantics for the regression-zero proof in §3 criteria #6 + #7.

**Description:** `tenants.updated_at` is a static column not auto-updated by trigger. It only changes when an explicit `UPDATE` statement sets it (or when an `UPDATE ... SET updated_at = NOW()` is part of the statement). This is the same finding the M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT SPEC noted earlier today.

**Pre-known?** YES — already in `TECH_DEBT.md` per the M3 SPEC's earlier finding.

**Disposition:** **NO-OP.** For THIS SPEC it doesn't matter — we're using `updated_at` as a regression-zero proof (no write happened → value unchanged), which works correctly with or without a trigger. The existing TECH_DEBT entry covers the broader concern.

**Recommended next action:** None (covered by existing tech-debt entry).

---

## Summary

| ID | Severity | Action |
|---|---|---|
| F1 | HIGH | Escalated to Architect via ESCALATION.md + OPEN_TASKS row |
| F2 | LOW (informational) | Documented in DIAGNOSIS.md §4 |
| F3 | LOW (already known) | No action — covered by existing TECH_DEBT |

Zero findings require new SPECs to be auto-filed by the Foreman without Architect input. F1 is the one decision-point and it cleanly waits for Daniel.

---

*End of FINDINGS.*
