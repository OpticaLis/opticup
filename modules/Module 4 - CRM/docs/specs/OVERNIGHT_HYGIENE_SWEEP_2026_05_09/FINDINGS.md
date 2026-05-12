# FINDINGS — OVERNIGHT_HYGIENE_SWEEP_2026_05_09

> **SPEC:** `modules/Module 4 - CRM/docs/specs/OVERNIGHT_HYGIENE_SWEEP_2026_05_09/SPEC.md`
> **Logged by:** opticup-executor
> **Logged on:** 2026-05-09 (overnight run)
> **Convention:** one section per finding; severity, location, description, recommendation, suggested follow-up SPEC name.

---

## F1 — Item 3 SKIPPED: GLOBAL_SCHEMA.sql lacks CRM `CREATE TABLE` statements + `js/shared.js` has no CRM T-constants

- **Severity:** MEDIUM (architectural — blocks any future schema-diff work for M4)
- **Location:** `docs/GLOBAL_SCHEMA.sql` lines 165–199 (CRM section is comments only); `js/shared.js` (no `CRM_*` or `crm_*` T-constants); `modules/crm/*.js` (~30 files use raw `sb.from('crm_leads')` strings — Rule 7 deviation pattern)
- **Description:** Item 3 of SPEC asked to backfill 28 CRM tables + `short_links` to `docs/DB_TABLES_REFERENCE.md` in `T.CONSTANT → table → key columns` format. Investigation found:
  - `docs/GLOBAL_SCHEMA.sql` enumerates the 28 CRM tables in **comments at lines 165–199** but has NO `CREATE TABLE` statements anywhere (only 2 `CREATE OR REPLACE VIEW` statements at lines 326 + 378). The file is mostly documentary, not authoritative DDL.
  - `js/shared.js` has zero CRM T-constants. The M4 module accesses tables via raw strings (`sb.from('crm_leads')`, `sb.from('crm_event_attendees')`, etc.) across 30+ source files.
  - GLOBAL_SCHEMA.sql line 226–229 explicitly acknowledges: "full 28-table reconstruction deferred to a future Sentinel-tracked SPEC".
- **Why this matters:** Without T-constants, the canonical pattern (per CLAUDE.md Rule 7 + opticup-executor SKILL "Use `T.TABLE_NAME` constants, never raw strings") is silently violated across all M4 code. Future schema-diff (when GLOBAL_SCHEMA gets actual DDL) cannot validate against M4 tables either.
- **Recommendation:** Author a `M4_T_CONSTANTS_BACKFILL` SPEC with two phases: (a) add 28 T-constants to `js/shared.js` (atomic, one commit, Rule 21 grep collision check), (b) migrate `modules/crm/*.js` raw strings to T-constants (~30 files, can be split per-file). Phase (a) unblocks Item 3 (and Sentinel M-12).
- **Suggested follow-up SPEC:** `M4_T_CONSTANTS_BACKFILL` (~2-3 hours, M4-internal scope, low-risk: pure constant declarations + str→ident replacements)

## F2 — Item 6 SKIPPED: Sentinel L-24 (SMS double-suffix) already fixed

- **Severity:** INFO (Sentinel data freshness)
- **Location:** Sentinel L-24 → `modules/crm/crm-automation-queue-send.js`
- **Description:** Sentinel L-24 reported 2 failed SMS sends with `template_not_found` due to a double-suffix bug (template name composed with `_sms_he` twice). Investigation:
  - File `crm-automation-queue-send.js:81–84` has an explicit comment: "BASE slug only — send-message EF appends `_${channel}_${language}` when looking up the template. Storing the full slug here would cause double-suffix at dispatch time (event_day → event_day_sms_he, not event_day_sms_he_sms_he)."
  - Code stores `tplBase` (BASE slug only) at line 85.
  - Grep for `_sms_he_sms_he` in actual code: 0 hits (only appears in the explanatory comment above).
  - Template name `event_registration_form_sms_he` referenced in Sentinel finding: 0 callers in code.
- **Why this matters:** L-24 is stale relative to current code. Sentinel's findings get out-of-date when fixes ship in subsequent commits. Without an automatic "verify finding still reproduces" step in the Sentinel run, stale findings accumulate.
- **Recommendation:** Add to Sentinel Mission 5 (Technical Debt) or Mission 1 (Rule Compliance): a "finding freshness" sub-check that re-runs each cited grep + line lookup before publishing the finding to GUARDIAN_ALERTS. If the cited evidence isn't there → mark finding as RESOLVED, remove from active alerts.
- **Suggested follow-up SPEC:** `SENTINEL_STALE_FINDING_AUTOREMOVE` — extend `opticup-sentinel` skill to verify-then-publish.

## F3 — Item 9 SKIPPED: M4 FOREMAN_REVIEWs already exist (M4_CLOSURE_AND_INTEGRATION_CEREMONY did the backfill)

- **Severity:** INFO (memory freshness)
- **Location:** `.claude/skills/...` memory `project_campaign_overseer.md` referenced 4 pending FOREMAN_REVIEWs; M4 SESSION_CONTEXT line 3 records the closure: "`M4_CLOSURE_AND_INTEGRATION_CEREMONY` shipped 8 commits: 4 backfill FOREMAN_REVIEWs (ACTIVITY_LOG_DEDUP, RESTORE_DELETED_EVENT_UI, POST_4, PHONE_SEARCH)..."
- **Description:** Item 9 of SPEC said "4 pending FOREMAN_REVIEWs from M4 marathon: ACTIVITY_LOG_DEDUP, RESTORE_DELETED_EVENT_UI, POST_4 (pagination), PHONE_SEARCH". Investigation: all 4 SPEC folders have `FOREMAN_REVIEW.md` files (1016, 1112, 1270, 1338 words — substantive, not stubs). Item is moot.
- **Why this matters:** The Cowork session that authored OVERNIGHT_HYGIENE_SWEEP_SPEC was working from stale memory (project_campaign_overseer.md was older than the M4_CLOSURE ceremony). Two cross-session memory sources (skill file + SESSION_CONTEXT) drifted apart by ~3 days.
- **Recommendation:** Add to `opticup-strategic` SKILL §"SPEC authoring checklist": when an item references "pending" work by name, verify against the target module's SESSION_CONTEXT (which records ceremonies + recent closures). 1-minute check, prevents this class of stale-premise SPEC item.
- **Suggested follow-up SPEC:** None — SKILL update only.

## F4 — Item 12 partial: `receipt-ocr-review.js` deferred (file-size hard max blocks staging)

- **Severity:** LOW (carry-forward to H-3 backlog)
- **Location:** `modules/goods-receipts/receipt-ocr-review.js` (402 lines; pre-commit `file-size` check blocks at 350 hard max)
- **Description:** Item 12 migrated `'inventory'` → `T.INV` across 5 goods-receipts files. 4 of 5 committed cleanly. The 5th (receipt-ocr-review.js) was already 402 lines pre-existing (one of Sentinel H-3's 24 oversized files). Staging ANY change to this file trips the pre-commit file-size hook (which scans staged files in --staged mode). Reverted my 1-line T.INV change to that file; closed Item 12 partial.
- **Why this matters:** H-3 (24 oversized files) blocks any maintenance touch on those 24 files. Until the files are decomposed, even cosmetic fixes (like T.INV migration) cannot land. This creates a dependency between "file-size cleanup" and "every other quality fix that touches those files".
- **Recommendation:** When the next M3_STUDIO_FILE_SPLIT or per-module decomposition SPEC ships, include receipt-ocr-review.js in scope. After decomposition, complete the residual Item 12 migration (1 file, 1 line — a 5-minute follow-up).
- **Suggested follow-up SPEC:** Fold into the H-3 cleanup SPEC (whichever takes receipt-ocr-review.js first).

## F5 — Item 16 SKIPPED: Sentinel L-10 (hardcoded short-link domain) already fixed

- **Severity:** INFO (Sentinel staleness — same root cause as F2)
- **Location:** Sentinel L-10 → `modules/crm/crm-messaging-templates.js:339-340`
- **Description:** Sentinel L-10 reported hardcoded `prizma-optic.co.il/r/...` as preview placeholder. Current state of `crm-messaging-templates.js:343-344`: uses `[storefront]/r/...` placeholder (tenant-neutral). Comment at line 335 names canonical runtime resolvers (`tenants.business_address`, `tenants.business_phone`, `tenants.ui_config.storefront_url`). 0 hits for `prizma-optic.co.il/r/` in `crm-messaging-templates.js`.
  - The 3 remaining `prizma-optic.co.il/r/` hits in the codebase are in `modules/Module 4 - CRM/final/CRM_UX_REDESIGN_RESEARCH/mockups/templates_a/b/c.html` — static UX research mockups, not active templates. Acceptable as design references.
- **Why this matters:** Same Sentinel staleness pattern as F2. The cumulative weight of stale findings across M-6, M-9, L-7 (also resolved BEFORE this run via the matching M3 work), L-10, L-24 suggests Sentinel hasn't been refreshed in ~1-2 weeks.
- **Recommendation:** Same as F2 — add "verify-then-publish" to Sentinel. Plus: when running `OVERNIGHT_HYGIENE_SWEEP`-class SPECs, the SPEC author should run Sentinel LAST before authoring (within 24h of execution) so the findings are fresh.
- **Suggested follow-up SPEC:** Same as F2 (`SENTINEL_STALE_FINDING_AUTOREMOVE`).

---

## Cross-cutting observations

**Pattern: 4 of 16 items were "Sentinel finding stale".** Items 6, 9, 16 were already-resolved at run time; Item 3 had a different stale premise (GLOBAL_SCHEMA structure assumption). This is 25% of the SPEC items that didn't need execution. Sentinel data freshness is a load-bearing assumption for every "fix Sentinel finding X" SPEC. The recommended fixes (F2 + F5 → SENTINEL_STALE_FINDING_AUTOREMOVE; F3 → opticup-strategic SKILL update) would prevent ~25% of future SPEC items from being SKIPPED-as-stale.

**Pattern: H-3 (24 oversized files) is a transitive blocker.** Item 12 hit it. Future per-file maintenance items will hit it. Decomposition of those 24 files isn't a "nice to have" — it's a meta-blocker for 12+ active code-quality items across M3, M4, M1, shared/.

**Pattern: TECH_DEBT.md #2 not moved to Resolved Debt.** I executed the split this SPEC asked for (Item 13) but did not update TECH_DEBT.md to mark #2 as resolved. Minor gap — folding into recommendation: at SPEC close, executor should grep TECH_DEBT.md for any item referenced in the SPEC and offer to move it to Resolved.

---

## Summary table

| ID | Severity | Topic | Suggested follow-up |
|---|---|---|---|
| F1 | MEDIUM | M4 needs T-constants in shared.js + raw-string migration | `M4_T_CONSTANTS_BACKFILL` |
| F2 | INFO | Sentinel L-24 stale (already fixed) | `SENTINEL_STALE_FINDING_AUTOREMOVE` |
| F3 | INFO | Item 9 premise stale (M4 reviews already done) | opticup-strategic SKILL update only |
| F4 | LOW | Item 12 1-file deferred to H-3 cleanup | Fold into H-3 SPEC |
| F5 | INFO | Sentinel L-10 stale (already fixed) | Same as F2 |

*FINDINGS complete.*
