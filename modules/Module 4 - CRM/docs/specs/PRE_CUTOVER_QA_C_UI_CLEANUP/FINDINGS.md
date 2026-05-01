# FINDINGS — PRE_CUTOVER_QA_C_UI_CLEANUP

> Findings logged during execution that are NOT part of this SPEC's scope but
> deserve a follow-up. Format: one entry per finding, with severity, location,
> description, and suggested next action.

---

## F1 — Lead and attendee status colors not editable from UI

**Severity:** LOW (missing feature parity, not a bug)
**Location:** `modules/crm/crm-status-color-settings.js` modal scope.
**Discovered while:** B10 design.

**Description.** The new B10 modal lists ONLY `entity_type='event'` rows (20 of the 68 status rows). Lead statuses (26 rows) and attendee statuses (22 rows) also have a `color` column populated and rendered via `CrmHelpers.statusBadgeHtml`, but the operator can only change them via direct DB access (MCP) today. The SPEC scoped B10 to events because the gear button lives on the events tab; lead/attendee scope was deliberately deferred.

**Suggested next action.** A future small SPEC: extend the modal with three tabs (event / lead / attendee) and reuse the same UPDATE handler scoped by `entity_type`. Estimated 30 minutes — most of the code is already in place.

---

## F2 — `rule-21-orphans` pre-commit hook false positive on co-staged IIFE files

**Severity:** LOW (developer experience, no code impact)
**Location:** `scripts/verify.mjs` rule-21-orphans check.
**Discovered while:** committing B3 — `_esc` defined as IIFE-local helper in both `crm-payment-helpers.js` and `crm-notifications-bell.js`.

**Description.** When two CRM files with same-named IIFE-local helpers are staged together, the verifier treats them as duplicate global symbols. They are NOT duplicates — each is scoped to its own IIFE. The established workaround is to rename one to a file-specific prefix (this commit: `_esc` → `_bellEsc`; historical example from P12: `logActivity` → `_chkLog`). Renaming silently builds up over time.

**Suggested next action.** Either: (a) teach the verifier to recognize IIFE-local symbols (e.g., parse `(function () { ... })()` blocks separately), or (b) document the workaround formally in a `docs/CONVENTIONS.md` section so executors know to apply it without searching git history each time. Already noted in EXECUTION_REPORT §8 proposal #2.

---

## F3 — 30+ historical multisale references intentionally preserved

**Severity:** INFO
**Location:** Across `modules/Module 4 - CRM/docs/specs/`, `campaigns/supersale/`, `outputs/campaign-mockups/`, `__LAUNCH_PLAN_DRAFT__/site-overseer/`.
**Discovered while:** B9 grep sweep.

**Description.** After B9 deleted the live multisale campaign + tag rows, `grep -ri "multisale"` still returns 30+ hits across the repo. By design — those are historical specs, import scripts referencing the old `MULTISALE` constant for column transforms, research mockups, and frozen project-history docs. They describe the state the project HAD when multisale was active; rewriting them would erase historical context. SPEC §3 #11 + §10 explicit on this.

**Suggested next action.** None — preserve as-is. A future agent reading the codebase MUST NOT mistake the residual references for "B9 incomplete". Documented in B9 commit body.

---

## F4 — Live browser visual QA gated on Daniel + Chrome MCP availability

**Severity:** INFO (operationally MEDIUM until verified)
**Location:** SPEC §12 #3-#13 manual smoke checks.
**Discovered while:** session start (Chrome MCP server disconnected mid-session).

**Description.** All three items (B3 date format on 6 surfaces, B9 events screen filter dropdown, B10 modal end-to-end) call for Chrome MCP visual verification. The MCP server disconnected during this session, and even when available these checks need Daniel-driven flows (login, real DB rows, modal interaction). Component-level evidence in static review is conclusive: zero `toLocaleDateString` hits remain (B3); seed file + DB show no multisale rows (B9); the modal file + button + wiring exist with tenant-scoped UPDATE calls (B10).

**Suggested next action.** Daniel's post-EF-deploy QA pass should include the §12 checks. Same pattern as PRE_CUTOVER_QA_A B11 + AUTOMATION_ENGINE_SPLIT + PRE_CUTOVER_QA_B B2 (4th SPEC in a row deferring this same way). No action needed beyond Daniel's existing QA backlog.

---

*End of FINDINGS.md.*
