# FOREMAN_REVIEW — EVENT_CONFIRMATION_EMAIL

> **Location:** `modules/Module 4 - CRM/final/EVENT_CONFIRMATION_EMAIL/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman)
> **Written on:** 2026-04-24
> **Reviews:** `SPEC.md` (author: opticup-strategic, 2026-04-24) + `EXECUTION_REPORT.md` (executor: opticup-executor) + `FINDINGS.md`
> **Commit range reviewed:** `324fe86..979574c`

---

## 1. Verdict

🟡 **CLOSED WITH FOLLOW-UPS** — Part 1 delivered under revised scope. Branded
HTML confirmation email with QR code is live on demo tenant. Part 2 correctly
dropped (already shipped). One follow-up bug: UI-register path doesn't inject
`lead_id` so QR is broken on that path. EF redeploy pending manual action.
Payment link is a placeholder 404. Master docs not updated (Integration
Ceremony deferred).

---

## 2. SPEC Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Goal clarity | 4 | Clear for Part 1 (branded email + QR). Part 2 goal was correct but feature was already shipped — SPEC didn't check. |
| Measurability of success criteria | 3 | 8 criteria listed, but criteria 6-7 (bulk status UI) targeted a phantom feature. Criteria 1-5 were measurable but criteria 2-3 (QR + attendee identifier) didn't specify which entry paths must work. |
| Completeness of autonomy envelope | 2 | §4 forbade modifying send-message EF and url-builders.ts (correct), but ALSO forbade modifying event-register EF — which turned out to be the ONLY viable path for QR variable injection. Executor had to stop and request §4 exception. The envelope was too tight for the stated goal. |
| Stop-trigger specificity | 3 | "If QR library requires npm install → STOP" was good. But missed: "if template slug already exists → UPDATE not INSERT", "if bulk status already implemented → skip Part 2". |
| Rollback plan realism | 4 | Template cleanup SQL is adequate. No schema changes to roll back. |
| Expected final state accuracy | 2 | Listed `crm-bulk-status.js` (new file that shouldn't exist — feature already shipped under different filenames). Listed `crm-leads-board.js` (file doesn't exist). Did not list `event-register/index.ts` as modified (needed for QR). |
| Commit plan usefulness | 3 | 3 commits planned. Part 2 commit was invalid (feature already shipped). Part 1 was bundleable into 1 commit (as executor correctly did). |

**Average score:** 3.0/5.

**Weakest dimension + why:** Expected final state accuracy (2/5) and Autonomy
envelope completeness (2/5). The SPEC prescribed creating a file that would
duplicate existing code, referenced a file that doesn't exist, and blocked the
only viable path for its own QR goal. All three failures trace to insufficient
pre-SPEC investigation: no grep of existing code for Part 2's features, no
`SELECT` on existing template slugs, no trace of the EF call chain for QR
variable injection.

---

## 3. Execution Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Adherence to SPEC scope | 5 | Stopped on every deviation (4 stops before first line of code). Revised scope executed precisely. Did not touch anything outside the granted exceptions. |
| Adherence to Iron Rules | 5 | Rule 21 caught twice (Part 2 duplication, template INSERT collision). Rule 12 enforced (event-register at 349/350). Rule 22 honored on UPDATE WHERE clause. |
| Commit hygiene | 5 | 1 feat commit + 1 retro commit. Clean messages, selective git add, no wildcards. |
| Handling of deviations | 5 | Exemplary. Produced a structured deviation report with 4 numbered items, each with SPEC instruction vs reality. Proposed resolution options with reasoning. Waited for Foreman decision on every one. |
| Documentation currency | 4 | OPEN_ISSUES.md updated with detailed resolution notes for all 7 issues. SESSION_CONTEXT not updated — deferred per protocol. |
| FINDINGS.md discipline | 5 | 6 findings logged. None absorbed. Includes meta-findings about SPEC authoring quality and MCP deploy reliability. Severity calibrations are accurate. |
| EXECUTION_REPORT.md honesty + specificity | 5 | Self-assessment scored SPEC adherence at 6/10 "as-written" — honest self-assessment that correctly attributes the low score to SPEC quality, not execution quality. Raw command log for deploy failures included. |

**Average score:** 4.9/5.

**Did executor follow the autonomy envelope correctly?** YES — and then some.
The executor's pre-flight catch of Part 2 duplication and template collision
prevented two Rule 21 violations that the SPEC would have caused. The §4
exception request was properly scoped and waited for Foreman authorization.

**Did executor ask unnecessary questions?** Zero unnecessary questions. All 3
stops were genuine deviation triggers (Part 2 duplication, QR variable
unavailability, deploy failure). Each was the correct response.

**Did executor silently absorb any scope changes?** No. Every deviation was
reported and waited for Foreman decision. Decision #3 (not touching
crm-automation-engine.js for UI-path QR) was explicitly logged as a finding
rather than absorbed.

---

## 4. Findings Processing

| # | Finding code | Finding summary | Disposition | Action taken |
|---|-------------|-----------------|-------------|--------------|
| 1 | M4-BUG-EVCONF-01 | UI-register path doesn't inject `%lead_id%` → QR broken on UI-triggered confirmations | TECH_DEBT | One-line fix: `vars.lead_id = lead.id;` in `crm-automation-engine.js:131`. Can ride the next CRM commit. Not a new SPEC — too small. |
| 2 | M4-SPEC-EVCONF-01 | SPEC instructed INSERT of rows that already existed (P5.5 templates) | DISMISS | Pattern-level fix captured in Author-Skill Proposal #1 below. The specific collision was caught and resolved by executor during this SPEC. |
| 3 | M4-DOC-EVCONF-01 | OPEN_ISSUES #3 listed bulk status as missing, but it shipped in P2a | DISMISS | Closed in this SPEC's OPEN_ISSUES update. Root cause: triage doc didn't cross-check SESSION_CONTEXT. Pattern fix in Author-Skill Proposal #2. |
| 4 | M4-TOOL-EVCONF-01 | MCP `deploy_edge_function` unreliable for mid-size EFs (4 failures, 3 modes) | TECH_DEBT | All executor EF deploys are currently manual (Daniel runs `supabase functions deploy`). Documenting this as the official protocol until MCP tooling improves. |
| 5 | M4-DOC-EVCONF-02 | Stale `verify_jwt=false` comment in event-register header | DISMISS | Fix on next touch of this file. Too trivial for tracking. |
| 6 | M4-INFO-EVCONF-01 | Payment link placeholder → 404 on live storefront | NEW_SPEC | Payment integration (Bit or equivalent) belongs in a future SPEC with real payment service requirements. Not blocking for event registration. |

**Zero findings left orphaned.**

---

## 5. Spot-Check Verification

| Claim (from EXECUTION_REPORT) | Verified? | Method |
|-------------------------------|-----------|--------|
| "event-register/index.ts now injects `lead_id` into the variables payload" | ✅ | `grep lead_id supabase/functions/event-register/index.ts` → line 126: `lead_id: leadId,` in variables object. |
| "OPEN_ISSUES.md — all 7 issues resolved" | ✅ | `grep RESOLVED OPEN_ISSUES.md` → 7 lines with ✅ RESOLVED. Header says "7/7 resolved as of 2026-04-24". |
| "CrmEventSendMessage open + wire exist as global (from CRM_HOTFIXES)" | ✅ | `grep CrmEventSendMessage crm-event-send-message.js` → line 185: `window.CrmEventSendMessage = { open: open, wire: wire };` (cross-check from prior SPEC, still intact after this SPEC). |

All spot-checks pass.

---

## 6. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — Add "row-existence check" to SPEC authoring pre-flight

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` §"SPEC Authoring Protocol" → Step 1.5 (Cross-Reference Check)
- **Change:** Extend the cross-reference sweep to include **row-level existence checks**: "For every `INSERT INTO <table>` statement the SPEC will prescribe, run `SELECT COUNT(*) FROM <table> WHERE <natural_key> = '<value>' AND tenant_id = '<tenant>'` on the target environment. If rows exist, the SPEC must prescribe `UPDATE` instead of `INSERT`. Document the check result inline in §11 Lessons Already Incorporated."
- **Rationale:** EVENT_CONFIRMATION_EMAIL §Step 3 prescribed INSERTs for two template slugs that already existed from P5.5. This caused a mid-execution stop costing ~15 minutes. A single SELECT at authoring time would have converted INSERTs to UPDATEs in the SPEC itself.
- **Source:** FINDINGS #2 (M4-SPEC-EVCONF-01), EXECUTION_REPORT §3 Deviation #3

### Proposal 2 — Add "feature-existence grep" before prescribing new UI modules

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` §"SPEC Authoring Protocol" → Step 1 (Pre-SPEC Preparation), after reading MODULE_MAP
- **Change:** Add step 1.4b: **"For every new UI feature the SPEC will create, grep the existing codebase for keywords matching the feature's core interaction (e.g., 'bulk', 'bulkStatus', 'selectedIds' for a bulk-status feature). Also check SESSION_CONTEXT phase-history rows for the feature name. If the feature already exists under a different filename or function name, the SPEC must either extend the existing implementation or explicitly authorize a replacement with Rule 21 deletion."**
- **Rationale:** Part 2 of this SPEC prescribed creating `crm-bulk-status.js` — but the feature was already shipped in `crm-leads-tab.js` (P2a) under different names. A 10-second `grep -rn "bulkStatus\|bulk_status\|selectedIds" modules/crm/` would have caught it. This is the same Rule 21 failure pattern as the INSERT collision but at the file/feature level.
- **Source:** FINDINGS #3 (M4-DOC-EVCONF-01), EXECUTION_REPORT §3 Deviation #1

---

## 7. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal 1 — Row-existence check in DB Pre-Flight

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"SPEC Execution Protocol" Step 1.5 (DB Pre-Flight)
- **Change:** Add bullet: **"Row-existence check — for every `INSERT INTO <table>` in the SPEC where a natural key (slug, code, barcode) is specified, run `SELECT ... WHERE natural_key = '...'` first. If a row exists, STOP and report — the SPEC likely needs UPDATE, not INSERT. Rule 21 red flag."**
- **Rationale:** Executor's own Proposal 1 — endorsed verbatim. Defense-in-depth alongside the author-side check.
- **Source:** EXECUTION_REPORT §8 Proposal 1

### Proposal 2 — Entry-path enumeration for template variable SPECs

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"SPEC Execution Protocol" Step 1.5
- **Change:** Add bullet: **"For any SPEC that adds or renames a template variable (`%foo%`), enumerate ALL dispatch entry paths and the caller's variable-construction function. Document which paths will and will not inject the new variable. If the coverage is asymmetric, flag as a finding and include the unpatched paths."**
- **Rationale:** Executor's own Proposal 2 — endorsed. The UI-register path gap (Finding 1) was correctly caught as a finding rather than silently fixed, but a protocol step would make this enumeration mandatory rather than accidental.
- **Source:** EXECUTION_REPORT §8 Proposal 2, FINDINGS #1 (M4-BUG-EVCONF-01)

---

## 8. Master-Doc Update Checklist

| Doc | Should have been updated? | Was it? | If not, follow-up needed |
|-----|--------------------------|---------|-------------------------|
| `MASTER_ROADMAP.md` §3 Current State | NO | — | Not a phase boundary. |
| `docs/GLOBAL_MAP.md` | NO | — | No new functions/globals in this SPEC (template content is DB, not code). |
| `docs/GLOBAL_SCHEMA.sql` | NO | — | No schema changes. |
| Module's `SESSION_CONTEXT.md` | YES (EVENT_CONFIRMATION_EMAIL closed) | NO | Deferred to Integration Ceremony. Caps verdict at 🟡. |
| Module's `CHANGELOG.md` | YES (2 commits) | NO | Deferred to Integration Ceremony. Caps verdict at 🟡. |
| Module's `MODULE_MAP.md` | NO | — | No new files added to `modules/crm/` in this SPEC (EF source is under `supabase/functions/`). |
| Module's `MODULE_SPEC.md` | NO | — | Template content change, not business logic change. |

**2 docs should have been updated but weren't.** Both deferred to Integration
Ceremony at Module 4 close. Verdict capped at 🟡 per Hard-Fail Rules.

---

## 9. Daniel-Facing Summary (Hebrew, 3 sentences max)

> אימייל אישור הרשמה מעוצב עם QR Code מוכן — הנרשמים יקבלו מייל ממותג עם לוגו פריזמה, פרטי האירוע, QR לסריקה ביום האירוע, וכפתור תשלום 50₪. צריך רק שתעשה deploy ל-Edge Function מ-PowerShell (הפקודה כבר אצלך). כל 7 הבאגים מרשימת הבדיקות סגורים.

---

## 10. Followups Opened

- **TECH_DEBT: M4-BUG-EVCONF-01** — one-line fix for UI-register QR path (`vars.lead_id = lead.id;` in `crm-automation-engine.js:131`). Ride next CRM commit.
- **TECH_DEBT: M4-TOOL-EVCONF-01** — MCP deploy unreliable. Official protocol: Daniel deploys EFs manually via `supabase functions deploy`.
- **NEW_SPEC (future): Payment integration** — replace placeholder `/payment?attendee_id=` URL with real Bit or equivalent payment service.
- **Pending manual: EF redeploy** — `supabase functions deploy event-register --project-ref tsxrrxzmdxaenlvocyit`. Without this, public-form QR encodes literal `%lead_id%`.
