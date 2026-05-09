# Campaign Overseer Handoff

> **Purpose:** the live state file the Campaign Overseer reads at session start and updates after every meaningful action.
> **Update discipline:** state-as-you-go. Replace, don't append. Cleanup when ≥150 lines.
> **Authority:** lower than `CAMPAIGN_OVERSEER_SKILL.md` (the constitution). If they conflict, skill wins.
> **Last meaningful update:** 2026-05-04 late night extended — **SIX SPECs CLOSED + 10+ commits + 4 PRs merged to main.** Marathon evening session: (1) QUICK_REGISTER_QR_FLOW ✅ Rungs 1-3 + 3 Hotfixes; (2) DELETE_EMPTY_EVENT ✅ REC-009; (3) ACTIVITY_LOG_DEDUPLICATION_DELETE_EVENT ✅ F1 fix; (4) RESTORE_DELETED_EVENT_UI ✅ REC-010 (Approach B after Foreman scope-correction); (5) POST_4_LEADS_PAGINATION_BUMP ✅ (200→1000); (6) PHONE_SEARCH_PARTIAL_FIX ✅ (Daniel-reported regression — 0-prefix partial-format phone search now works). Plus Module 36 cleanup in Make scenario 8464122. 2 FOREMAN_REVIEWs written (QUICK_REGISTER + DELETE_EMPTY_EVENT). Self-Review #1 written + Daniel-approved → L-005 binding rules added (Rule A live-flow check, Rule B REC class-tagging). MASTER_ROADMAP + Module 4 SESSION_CONTEXT both refreshed. Open follow-ups: 4 FOREMAN_REVIEWs still pending (ACTIVITY_LOG_DEDUP, RESTORE_DELETED_EVENT_UI, POST_4_LEADS_PAGINATION_BUMP, PHONE_SEARCH_PARTIAL_FIX); incoming-tab.js partial-phone-search bug (same pattern as PHONE_SEARCH_PARTIAL_FIX, logged as INFO).

**Rung 3 closure note (Make scenario 8464122):** branch `"ברקוד רישום לאירוע - רישום מהיר"` updated successfully via **manual Make UI** (not Make MCP — see FINDINGS.md F3 for tooling constraint). 3 surgical edits applied:
- Module 213 (HTTP) `event_number` body field → `{{trim(replace(replace(ifempty(1.messageData.textMessageData.textMessage; 1.messageData.extendedTextMessageData.text); "רישום מהיר אירוע"; ""); " "; ""))}}` (pattern-free nested replace; the `/g` flag approach failed in Make's regex parser)
- Module 40 (Green-API SendFileByURL) caption → `ברקוד רישום לאירוע {{213.data.event_name}}`
- Module 40 URL → `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={{encodeURL(213.data.url)}}`

Module 36 (Monday legacy) intentionally left dangling for now — separate cleanup pass.

**Smoke test result:** WhatsApp `רישום מהיר אירוע 14` → QR within 10s → scan → `/quick-register/?event=14&tenant=demo` → form submit → lead + attendee created on demo + coupon delivery dispatched. Single tenant-resolution caveat noted (F2): storefront defaults to `tenantSlug='prizma'`; for demo testing the URL needs `&tenant=demo` appended. By design until F1+F2 cleanup SPEC.

---

## 🚦 ACTIVE WORK — SPEC #1 ATOMIC_CONFIRMATION_FLOW (✅ CLOSED 2026-05-04)

**Status:** ✅ **CLOSED.** Both bugs fixed, demo-verified, retro committed, awaiting Foreman review.
**Final state:** `automation-engine` v7 ACTIVE on Supabase (CLI deployed, ezbr_sha256 `80cd8605d74b3f37371a4a5d902155095d10f4d5b60c9354e3624be8949ded79`), zero `[AE-DIAG]` in source.

**Final commit chain (this SPEC):**
- `965c76d` — Part A: 3-button modal contract (server + client). EF v5.
- `3e79db9` — Part B.1: diagnostic logging in source. (4× Management API deploy failures; bypassed via CLI to v6.)
- `d8e8f4c` — partial EXECUTION_REPORT (mid-block escalation point).
- `edbe142` — Part B.2: FINDINGS draft (modal-stack race root cause).
- `c474756` + `201bcf6` — Part B.3: Option A `onAfterConfirm` fix (5 callsites). Client-only.
- `fec8b81` — Part B.4: 17 AE-DIAG lines removed. EF v7 via CLI.
- `02920d4` — retrospective close: final EXECUTION_REPORT replaces partial; FINDINGS cumulative.

**4 findings logged in cumulative FINDINGS.md:**
- F1 `M4-CRM-AUTOMATION-CLIENT-01` (CRITICAL → ✅ FIX LANDED) — modal-stack race; root of Bug 2.
- F2 `M4-TOOL-DIAG-01` (MEDIUM) — Supabase MCP `get_logs(service='edge-function')` returns gateway-only logs, not function stdout. Workaround: Studio Logs UI / CLI.
- F3 `M4-DOC-DIAG-01` (LOW) — schema column drift (`crm_automation_runs.created_at`, `crm_message_log.template_slug`).
- F4 `M4-TOOL-DEPLOY-01` (INFO) — Supabase CLI deploys idempotent on byte-identical content. Explains v6 → v7 (not v8). Future SPECs should NOT pre-commit to specific version numbers.

**Lessons captured (for Overseer + Executor + Foreman skills):**
- **Overseer L-003** (already written) — verify ground truth (git + Supabase + filesystem) before trusting any HANDOFF claim about partial-SPEC state.
- **Executor proposal #1** — standardize partial-EXECUTION_REPORT template for platform-deploy blocks (Supabase / Vercel / GitHub 5xx).
- **Executor proposal #2** — pre-empt Rule-21 orphans co-staging false positives in commit-prep. **2nd consecutive review** surfacing this — per opticup-strategic SKILL's "3 reviews → must apply" rule, next strategic session should edit the SKILL file directly.

**Pending (separate session):** Foreman review by `opticup-strategic` reads `SPEC.md` + `EXECUTION_REPORT.md` + `FINDINGS.md`, writes `FOREMAN_REVIEW.md`. Module-level docs (SESSION_CONTEXT, MODULE_MAP, CHANGELOG) refreshed as part of Integration Ceremony.

---

## 📋 SPEC #2 — ATTENDEE_COUNTER_DISPLAY_FIX (✅ CLOSED — already merged)

**Status:** ✅ **CLOSED 2026-05-04.** All 6 commits on origin/develop. EXECUTION_REPORT + FINDINGS + FOREMAN_REVIEW all present. Counter logic fixed at 4/4 callsites.

---

## 📊 Session Summary 2026-05-04 (M4 cleanup marathon)

**Closed today (8 SPECs merged to main):**
- REC-009 phone search Israeli-format normalization
- REC-010 broadcast 1000-cap fix (paginateQuery helper)
- REC-011 purchase filter + events column + 6 Monday import status repairs
- REC-012 Realtime pilot incoming tab (4-round saga, finally settled on polling — see Realtime tech-debt entry)
- REC-016 Rung 2 (5 browser callsites → automation-engine EF) + attendee-move dropdown fix
- 36 stub-orphan leads soft-deleted (kept גולה וורלמוב — paid 8430 ₪)
- 13 legacy SuperSale Make scenarios disabled (Monday pipeline fully decommissioned)

**In-flight:** _(none — SPEC #1 closed 2026-05-04 evening, foreman-reviewed)_

**Open follow-ups (M4 closure path, after 2026-05-04 audit):**
- Realtime post-cutover investigation (tech debt — REC-014/015 evidence preserved)
- 8 MultiSale archive events import (REC-005 — needs `event_type` schema add first)
- ~~WhatsApp QR registration flow~~ ✅ CLOSED 2026-05-04 evening (`QUICK_REGISTER_QR_FLOW` SPEC + 3 hotfixes shipped, end-to-end smoke test passed on demo)
- Campaign metrics UI (new feature, 0 references in CRM today)
- **NEW: Multi-tenant URL strategy for quick-register EF** (FINDINGS F1+F2 — `STOREFRONT_URL` hardcoded + storefront `tenantSlug` defaults `prizma`. Single-tenant safe; promote to `tenants.config` when tenant 2 onboards.)
- **NEW: Module 36 (Monday legacy) cleanup in scenario 8464122** (FINDINGS F4 — dangling, cosmetic, ~2 min UI work)
- ~~**NEW: Delete-empty-event button**~~ ✅ CLOSED 2026-05-04 evening (REC-009 → DELETE_EMPTY_EVENT SPEC shipped, demo smoke-test passed all 3 cases). UNBLOCKS B6 baseline-at-1 numbering reset whenever Daniel runs the operational cleanup.
- ~~**Module 36 cleanup in scenario 8464122**~~ ✅ CLOSED 2026-05-04 by Daniel via Make UI (separate from this Cowork session — already done before SPEC was authored). The dangling Monday module was removed; flow now: filter → SetVar → HTTP module 213 → router → module 40. The MAKE_8464122_MODULE_36_CLEANUP SPEC document is retained for historical reference but execution is N/A.
- **NEW: Restore-deleted-event UI via activity-logs screen** (REC-010, agreed verbally 2026-05-04 evening, future-SPEC. Inverse of DELETE_EMPTY_EVENT. Not blocking.)
- **Activity-log table name discrepancy** (surfaced during REC-009 smoke test verification — `crm_activity_log` does not exist as a table; SPEC referenced wrong name. Resolved in DELETE_EMPTY_EVENT FINDINGS F3 as INFO. Need next FOREMAN_REVIEW to confirm actual table name + flag for cross-SPEC consistency.)
- **DELETE_EMPTY_EVENT F1 — HIGH double activity-log write** (RPC inserts an activity-log row, but `ActivityLog.write` on the JS side ALSO fires on the soft-delete callback path. Result: 2 activity-log rows per delete instead of 1. Follow-up SPEC needed to dedupe — pick one side as authoritative. RPC is preferable per defense-in-depth.)
- **Awaiting opticup-strategic FOREMAN_REVIEW for DELETE_EMPTY_EVENT** — Foreman should write `modules/Module 4 - CRM/docs/specs/DELETE_EMPTY_EVENT/FOREMAN_REVIEW.md` covering: (1) executor's 2 self-improvement proposals (P1 shared-table check in DB Pre-Flight, P2 double-audit lint at commit), (2) F1 dedup decision, (3) verdict. Defer until next opticup-strategic session.

**By-design (NOT a follow-up, captured here so future Overseer sessions don't re-flag):**
- Email duplication on `crm_leads` is allowed by Daniel directive 2026-05-04 (REC-008). Couples + parents-registering-children share emails; only phone is unique. Do not propose dedup SPECs targeting email field.

---

## 🚦 ACTIVE WORK — Cutover & Migration Roadmap (HISTORICAL — Phases 1-4 ALL CLOSED 2026-05-03)

**Source of truth:** `__LAUNCH_PLAN_DRAFT__/campaign-overseer/CUTOVER_ROADMAP.md` (issued by Supervisor 2026-05-01).
**Working folder:** `__LAUNCH_PLAN_DRAFT__/campaign-overseer/cutover-roadmap/`

**Last update:** 2026-05-02 night (Israel)
**Status:** ✅ Phase 2 COMPLETE — all 7 D-decisions logged in DECISIONS_LOG (REC-001 to REC-007). 4 agree / 3 disagree. Awaiting Daniel "advance to Phase 3" verbal trigger AND completion of pre-Phase-3 gating items (see below).
**Last action by Overseer:** Walked Daniel through D-1..D-7 one at a time, logged each as REC-NNN per SKILL §4. Pattern observed (recorded in DECISIONS_LOG stats note): the 3 disagrees concentrated on "drop historical data" recommendations where Daniel saw live operational/customer-facing value the Overseer underestimated.
**Next action when resumed:** Wait for Daniel "advance to Phase 3" + confirm the pre-Phase-3 gating items are closed (fresh Monday re-export, demo-data wipe on prizma, migration script tested in scratch DB, P5_7 + P5_6 shipped, D-6 schema add + form rewire shipped, Daniel signs off on the MAP).

| Phase | Goal | Status | Folder |
|---|---|---|---|
| 1 — Verify | Full E2E pipeline + campaigns integration fix | ✅ COMPLETE — 13/14 PASS, V13 deferred | `cutover-roadmap/PHASE_1_VERIFY/` |
| 2 — 7 Decisions | D-1 to D-7 from MAP §5 locked | ✅ COMPLETE — REC-001 to REC-007 logged | `cutover-roadmap/PHASE_2_DECISIONS/` |
| 3 — Wipe + Migrate | Migrate full Monday history; 17 verification queries pass | ⬜ NOT STARTED — gating items pending | `cutover-roadmap/PHASE_3_MIGRATION/` |
| 4 — Cutover + Soak | P5_7 deploy + 48h watch + 7d verification + kill Monday | ⬜ NOT STARTED | `cutover-roadmap/PHASE_4_CUTOVER/` |

### Phase 2 outcomes (REC-001 to REC-007 — full detail in DECISIONS_LOG)

| REC | Migration item | Recommended | Daniel | Notes |
|---|---|---|---|---|
| REC-001 | D-1: 51 orphan attendees | (b) stub-create | ✅ agree | 51 stub leads with `legacy_orphan` tag |
| REC-002 | D-2: 8 vision questionnaires | (b) move to client_notes | ❌ disagree → (a) drop | "לא צריך שאלון התאמה" |
| REC-003 | D-3: 179 message markers | (c) hybrid (152 coupon-sent only) | ✅ agree | 152 synthetic message_log rows |
| REC-004 | D-4: 80 Monday Category tags | (a) drop | ✅ agree | UTM-based source identification supersedes |
| REC-005 | D-5: 8 MultiSale events (BLOCKER) | (a) map to SuperSale + tag | ❌ disagree → (d) defer | Post-cutover SPEC: introduce `event_type`, then import |
| REC-006 | D-6: 587 lead-level eye-exam answers | (a) drop | ❌ disagree → (b) keep | Storefront form actively uses this field |
| REC-007 | D-7: 2 corrupted-phone rows | (b) fix-and-import | ✅ agree | Narrow fixup rule: strip leading `972` if 12-digit |

### Pre-Phase-3 gating items (must close BEFORE migration script runs)

1. **NEW (from D-6):** Schema add `crm_leads.eye_exam_default` + wire `lead-intake` EF to populate it on form submit. **Pre-cutover SPEC required.** Owner: Supervisor authors.
2. **From MAP §1:** P5_7 (storefront form rewire) + P5_6 (bot protection) shipped to main.
3. **From MAP §1:** Fresh Monday re-export (current data is 11 days old).
4. **From MAP §1:** Demo data wipe on prizma (currently 11 leads + 2 events from QA — must zero before import).
5. **From MAP §1:** Migration script tested end-to-end on Supabase scratch branch.
6. **From MAP §1:** Daniel sign-off on the MAP.

### Post-cutover backlog (NEW commitments captured this session)

1. **From REC-005:** Post-cutover SPEC — introduce `event_type` field on `crm_events` (distinct from `campaign_id`), backfill defaults, import the 8 MultiSale archive events under a new `multisale_archive` event_type. Timing: 1-2 weeks post 2026-05-03.

**2026-05-02 (post-merge):** PR #41 merged to `origin/main` (commit `456bfea`) — `cd2b2f7` recipient-resolver fix is live in production CRM; V10 (Phase 1 Verify blocker) **UNBLOCKED**. See `modules/Module 4 - CRM/docs/specs/V10_MAIN_BRANCH_RECONCILIATION/`.

### V10 pre-requisites — verified ready before merge

- QA event #7 exists on Prizma — id `e05ad4ba-d2c3-4150-b75f-0bcb23ca485f`, `event_date=2026-05-02`, `status=registration_open`, ready to flip.
- 3 QA attendees seeded correctly:
  - QA-A (0537889878): registered + `coupon_sent=true` → **expected to receive**
  - QA-B (0503348349): cancelled + `coupon_sent=true` → expected NOT to receive (cancelled filter)
  - QA-C (0500000003): registered + `coupon_sent=false` → expected NOT to receive (no-coupon filter)
- Automation rule wired: `recipient_type='attendees_with_active_coupon'`, `template_slug='event_day'`, channels=sms+email, `is_active=true`.
- send-message EF deployed v17 (event-variables.ts `%event_time%` fix live).
- pg_cron job `event_day_status_flip` active (08:30 Israel daily).

**Operating rules:**
- One question at a time to Daniel (Pattern 19), plain Hebrew.
- No phase parallelism, no skipping.
- Daniel verbal "advance" required at every gate.
- Supervisor on call for escalations only.

**Key references:**
- Migration MAP (the source for Phase 2 decisions): `modules/Module 4 - CRM/go-live/MONDAY_MIGRATION_MAP.md`
- P5_7 SPEC (used in Phase 4): `modules/Module 4 - CRM/go-live/specs/P5_7_STOREFRONT_FORM_REWIRE/`
- Original Roadmap (do NOT modify): `CUTOVER_ROADMAP.md`

---

## 🔗 Campaign URL Registry (read first if user asks for "the link")

| Asset | URL (HE) | Status |
|---|---|---|
| **SuperSale main page** | https://prizma-optic.co.il/supersale/ | LIVE (HE only) |
| **SuperSale stock page** (live inventory for upcoming event) | https://prizma-optic.co.il/supersale-stock/ | LIVE (HE only) |
| SuperSale models + prices | https://prizma-optic.co.il/supersale-models-prices/ | LIVE (HE only) |
| SuperSale price catalog (secret) | https://prizma-optic.co.il/supersalepricescatalog/ | LIVE (HE only) |
| SuperSale terms | https://prizma-optic.co.il/supersale-takanon/ | LIVE (HE/EN/RU) |
| Successful registration | https://prizma-optic.co.il/successfulsupersale/ | LIVE (HE only) |

EN+RU versions of campaign pages are soft-deleted in `storefront_pages` — campaign assets are HE-only by design.

---

---

## 1. Active Campaign

**Name:** SuperSale (Prizma)
**Tenant:** אופטיקה פריזמה (slug: `prizma`)
**Status:** Pre-cutover — currently runs through legacy Monday pipeline. Cutover to Optic Up native pipeline scheduled **Sunday 2026-05-03 morning** (M4 P7).
**First overseer activation:** post-cutover. Until then, the overseer can READ legacy artifacts (existing message templates seeded on demo, storefront SuperSale page, lead intake flow) but observed metrics will be partial because automated rules + dispatch only flip to Optic Up on the cutover date.

**Campaign assets in scope:**
- SuperSale main page: https://prizma-optic.co.il/supersale/ (HE only — EN+RU soft-deleted)
- SuperSale stock page (live inventory for upcoming event): https://prizma-optic.co.il/supersale-stock/ (HE only). Verified live 2026-04-30, status 200, title "זמינות מלאי לאירוע הקרוב". Two sections: store_all (price commitment) + catalog (luxury/limited).
- SuperSale models+prices: https://prizma-optic.co.il/supersale-models-prices/ (HE only)
- SuperSale price catalog (secret): https://prizma-optic.co.il/supersalepricescatalog/ (HE only)
- SuperSale terms: https://prizma-optic.co.il/supersale-takanon/ (HE/EN/RU)
- Successful registration: https://prizma-optic.co.il/successfulsupersale/ (HE only)
- Lead-intake form on storefront (calls `lead-intake` Edge Function post-cutover)
- Message templates in `crm_message_templates` filtered by `campaign_slug` (TBD field — verify schema on first read)
- Automation rules in `crm_automation_rules` linked to event status changes
- Short links via `/r/[code]` (resolve-link EF)
- Make scenario `9104395` (send-message pipe) — read-only logs

---

## 2. Current KPIs

(populate on first deep-read session)

| Metric | Window | Current value | Target | Trend |
|---|---|---|---|---|
| Lead-intake submission rate | 7d | _TBD_ | _TBD_ | _TBD_ |
| Lead → event registration conversion | 30d | _TBD_ | _TBD_ | _TBD_ |
| Email open rate (campaign templates) | 30d | _TBD_ | _TBD_ | _TBD_ |
| SMS click-through rate | 30d | _TBD_ | _TBD_ | _TBD_ |
| Event attendance rate (registered → checked-in) | 30d | _TBD_ | _TBD_ | _TBD_ |
| Attendance → purchase rate | 30d | _TBD_ | _TBD_ | _TBD_ |
| Make scenario success rate | 7d | _TBD_ | ≥99% | _TBD_ |
| Unsubscribe rate | 30d | _TBD_ | <2% | _TBD_ |

**On first session, populate this table.** If a metric isn't readable yet (pre-cutover, missing column, etc.), mark `N/A — not measurable yet` with the reason.

---

## 3. Open Recommendations Queue

(awaiting Daniel's verbal decision OR SPEC authoring)

- ✅ `REC-009 — [feature-request] Delete-empty-event button — APPLIED 2026-05-04 evening (DELETE_EMPTY_EVENT SPEC, demo smoke-test all 3 cases passed, MERGED to main)`
- ✅ `REC-010 — [feature-request] Restore-deleted-event UI — APPLIED 2026-05-04 late night (RESTORE_DELETED_EVENT_UI SPEC, Approach B, MERGED to main)`
- ✅ `REC-011 — [feature-request] Leads tab pagination 200→1000 — APPLIED 2026-05-04 late night (POST_4_LEADS_PAGINATION_BUMP, MERGED to main, Daniel verified on prizma)`
- ✅ `REC-012 — [feature-request] Partial-format phone search fix — APPLIED 2026-05-04 late night (PHONE_SEARCH_PARTIAL_FIX SPEC, MERGED to main, all 5 search variants verified by Daniel)`

The full recommendation lives in `DECISIONS_LOG.md`; this section is just a pointer.

---

## 4. 90% Gate Status

**Mode:** RECOMMEND-ONLY (v1).
**Total recommendations submitted:** 12.
**Total decided:** 12 (agree: 8, disagree: 4, partial: 0).
**Total applied:** 4 (REC-009 DELETE_EMPTY_EVENT, REC-010 RESTORE_DELETED_EVENT_UI, REC-011 POST_4_LEADS_PAGINATION_BUMP, REC-012 PHONE_SEARCH_PARTIAL_FIX — all 2026-05-04).
**Rolling 30-rec acceptance rate:** **67%** (8/12). Trending up from 60% as feature-request track adds.
**Status toward graduation:** 12/30 decisions in. **Pattern:** 4 of 4 disagreements were anomaly-detection RECs (REC-002/005/006/008). **REC-009 through REC-012 were all [feature-request] class — 4/4 agree.** Self-Review #1 written + Daniel-approved 2026-05-04. Rules A + B codified in LEARNINGS.md L-005. Going forward, every REC must carry an explicit `[anomaly-detection]` or `[feature-request]` class tag.

---

## 5. Recent Decisions (last 7 days)

- 2026-05-04 — REC-012 — [feature-request] agree — PHONE_SEARCH_PARTIAL_FIX shipped (5-line patch in crm-leads-tab.js — 0-prefix partial phone search)
- 2026-05-04 — REC-011 — [feature-request] agree — POST_4_LEADS_PAGINATION_BUMP shipped (1-line: 200→1000)
- 2026-05-04 — REC-010 — agree — restore-deleted-event UI; Approach B (capture attendee_ids in audit details) chosen over A (add deleted_at column) and C (event-only)
- 2026-05-04 — REC-009 — agree — delete-event button gated on SUM(purchase_amount)=0 (condition "א" only — testing leads who didn't buy don't block)
- 2026-05-04 — REC-008 — disagree — same-email-different-people is by design (couples / parents+kids); only phone is unique
- 2026-05-02 — REC-007 — agree — fix-and-import 2 corrupted-phone leads
- 2026-05-02 — REC-006 — disagree → option (b) — keep lead-level eye-exam answer (storefront form actively writes it)
- 2026-05-02 — REC-005 — disagree → option (d) defer — 8 MultiSale archive events, post-cutover SPEC introduces event_type
- 2026-05-02 — REC-004 — agree — drop Monday "Category" tag on ~80 leads
- 2026-05-02 — REC-003 — agree — hybrid synthesize 152 coupon-sent message-log rows
- 2026-05-02 — REC-002 — disagree → option (a) — drop 8 vision-questionnaires, "לא צריך שאלון התאמה"
- 2026-05-02 — REC-001 — agree — stub-create 51 orphan attendees instead of dropping

Format: `YYYY-MM-DD — REC-NNN — agree/disagree/partial — {brief Daniel reason}`. Keep last 10 inline; older archived in `DECISIONS_LOG.md`.

---

## 6. Pending Issues to Investigate

- **2026-04-30 — supersale-stock lens size addition — ✅ SHIPPED + QA PASSED.** Added "גודל: <number>" line to product cards on /supersale-stock/. Variation 2 (separate line below model, gray, 0.66rem). Pipeline: Cowork edited 3 files → activation prompt → Claude Code on laptop did build + verify + commit + push develop (7e320aa) + merge to main (0f8e38a) → Vercel auto-deploy (dpl_3JWXAyc4cbpkaqYzmVQbWunaB3kb, READY, target=production). VISUAL QA on https://prizma-optic.co.il/supersale-stock/ (Claude in Chrome, desktop 1280px): all cards display "גודל: NN" correctly under model name in muted gray, matches approved design. Verified across multiple brands (Alexander McQueen 51-53, Balenciaga 53-55). Activation prompt saved at __LAUNCH_PLAN_DRAFT__/campaign-overseer/ACTIVATION_PROMPT_supersale_stock_size.md.

**Tech debt logged from this task (need follow-up SPECs by opticup-strategic):**
- T-DEBT-A: src/styles/supersale-stock.css is 409 lines (was 396 pre-existing, +13 from this addition). CSS hard max per CLAUDE.md §5 is 250; verify script enforces 350. Split into supersale-stock-grid.css, -card.css, -mobile.css, -lightbox.css, etc. Pre-existing — not introduced by this task.
- T-DEBT-B: Doc/script drift on file-size threshold. CLAUDE.md §5 says 250 lines hard max for CSS; scripts/verify.mjs enforces 350. Reconcile to one number across both spec and tooling.

When entries arrive, format: `{date observed} — {one-line issue} — investigating`.

---

## 7. What to Read for Current Context

If you (a fresh Overseer session) want to act on the current focus, read these IN ORDER:

1. `CAMPAIGN_OVERSEER_SKILL.md` — your constitution
2. This file — current state
3. `DECISIONS_LOG.md` — full decision history (compute rolling 90% from latest 30 entries)
4. `CLAUDE.md` (in repo root) — project Iron Rules (you are read-only; rules apply to others)
5. `MEMORY.md` (in your auto-memory folder) — accumulated user-specific knowledge

That's the full onboarding. Total ~10 min to be fully oriented if the handoff is current.

---

## 8. Overseer Self-Notes

Things the current Overseer session has noticed and wants to flag to future sessions:

- **Deep-read access is wired but untested.** First session post-cutover should run a smoke-test query against `crm_message_templates` + a `make` execution-list query and confirm both return data before producing any recommendations.
- **The schema field `campaign_slug` may not exist yet** on `crm_message_templates` — verify on first session. If absent, propose a non-schema mechanism (template name prefix? separate table?) as REC-001.
- **Pre-cutover blind spot:** until Sunday 2026-05-03, observed message metrics may reflect Monday legacy pipeline, not Optic Up. Caveat any pre-cutover recommendations accordingly.

---

## 9. Design System Canon — Sealed 2026-04-28

**Context:** Daniel asked for a design system to be extracted from the existing storefront so future landing pages and emails can be built with one consistent look. Cowork session was temporarily released from Campaign Overseer role to work on this with Daniel directly.

**Outcome:** A canonical design specification was sealed and saved to:
- `__LAUNCH_PLAN_DRAFT__/campaign-overseer/PRIZMA_DESIGN_SYSTEM_CANONICAL.md` (the canon — single source of truth)
- `__LAUNCH_PLAN_DRAFT__/campaign-overseer/DESIGN_SYSTEM_EXTRACT.md` (early extraction notes — superseded by the canon, kept for traceability)

**Key decisions sealed:**
- Storefront (`prizma-optic.co.il` main pages) is the visual canon. Campaign pages and emails that diverge are wrong and must migrate.
- Two style modes: Light (white/cream) and Dark (#1a1a1a/black). Same gold + same fonts + same components. Never mixed.
- One gold: `#c9a555` solid + gradient `linear-gradient(135deg, #c9a555 0%, #c9a555 50%, #e8da94 100%)`. Variants `#e8da94` (light, gradient endpoint only) and `#b8943f` (hover).
- One font: Rubik. 4 weights (400/500/700/900). All locales, all surfaces, all emails.
- 4 CTA styles, 1 form style, 3 card styles.
- Heroicons only — no emoji anywhere (including the `👋` in email-welcome.html).
- Three transition timings: 150ms hover / 200ms image / 250ms state.

**Status:** v1.1 sealed AND processed by Claude Design. NOT yet applied to production code. The canon defines the target state; migration to code will happen via SPECs (now 11 items, see §11 of the canon) authored by `opticup-strategic` and executed by `opticup-executor`.

**Strategic review completed:** `DESIGN_SYSTEM_REVIEW.md` (by `opticup-strategic` on 2026-04-28) flagged 8 critical + 10 high issues in v1.0. v1.1 resolved all of them in the same Cowork session. Key v1.1 corrections: Inter retained for EN/RU; **black text on gold CTAs** (WCAG fix); `#000` named-exception for transactional surfaces (mail, event-register, unsubscribe, thank-you); warn (`#b8860b`) + info (`#4a6e8e`) status tokens added; notice-card + steps-list + spinner components defined; **SPEC #4 restructured to include Make.com scenario step** (without it the email migration produces zero customer-facing change); tenant variables defined for wordmark and all hardcoded business values; H1/CTA weight reverted from 900 to 700 to match production.

**Claude Design output downloaded 2026-04-28:** `Prizma Optic Design System/` folder in `__LAUNCH_PLAN_DRAFT__/campaign-overseer/` — contains canon mirror, README, SKILL.md, colors_and_type.css (all CSS tokens), 20 preview HTML files (one per component), 8 brand silhouette SVGs, transparent Prizma logos, and three UI kits (storefront / campaign / email). All on-brand and validated against the canon. Logos verified as PNG with alpha channel (transparent).

**Next operational step:** when the Overseer recommends visual changes, Daniel will open Claude Design separately, paste the proposal as a brief (per SKILL §11.4), and hand off to Claude Code. The Overseer never creates visuals directly.

---

## 10. Active Work — V2 Email Rebuild (started 2026-04-28)

**Decision (Daniel, 2026-04-28):** rebuild ALL 10 SuperSale email templates as v2 (canon-compliant) BEFORE the M4 P7 cutover (2026-05-03), so the new system goes live with clean templates from day one. No hybrid migration — full set ready before flip.

**Rebuild output location:** `C:\Users\User\opticup\campaigns\supersale\MESSAGES_V2\`

**Per-template lifecycle:**
1. Overseer presents the EXISTING email (subject, H1, opening, structure) + recommends content changes with reasoning
2. Daniel approves / corrects / explains the why behind any correction
3. Overseer logs locked copy + Daniel's reasoning in `COPY_DECISIONS_LOG.md`
4. Overseer presents visual migration spec
5. Daniel approves
6. Overseer writes the new file to `MESSAGES_V2/{template-name}.html`
7. Verification: 0 emoji / 0 old gold `#d4af37` / 18+ new gold `#c9a555` / Heroicons inline / tenant variables / Rubik fallback

**Progress (10 Email templates — aligned to Optic Up CRM seed-templates-demo.sql, NOT the legacy Make filenames):**

| # | New CRM slug | Legacy file (reference only) | Status |
|---|---|---|---|
| 1 | `lead_intake_new_email_he` | `email-welcome.html` | ✅ DONE 2026-04-28 — copy + visuals locked, file shipped to MESSAGES_V2/ |
| 2 | `lead_intake_duplicate_email_he` | `email-already-registered.html` | ✅ DONE 2026-04-28 — copy + visuals locked, file shipped to MESSAGES_V2/ |
| 3 | `event_will_open_tomorrow_email_he` | `email-will-open-tomorrow.html` | ✅ DONE 2026-04-28 — copy + visuals locked, file shipped to MESSAGES_V2/ |
| 4 | `event_registration_open_email_he` | `email-registration-open.html` | ✅ DONE 2026-04-28 — copy + visuals locked, file shipped to MESSAGES_V2/ |
| 5 | `event_invite_new_email_he` | `email-invite-new.html` | ✅ DONE 2026-04-28 — copy + visuals locked, file shipped to MESSAGES_V2/ |
| 6 | `event_waiting_list_email_he` | `email-waiting-list.html` | ✅ DONE 2026-04-28 — REVIVED with new purpose. Sent automatically when a lead registers for an event already at capacity. Replaces the standard registration confirmation. |
| 7 | `event_invite_waiting_list_email_he` | `email-invite-waiting-list.html` | ✅ DONE 2026-04-28 — copy + visuals locked, file shipped to MESSAGES_V2/. Tone: system/info notification (NOT marketing). |
| 8 | `event_2_3d_before_email_he` | `email-2-3d-before.html` | ✅ DONE 2026-04-28 — copy + visuals locked, file shipped to MESSAGES_V2/. Auto-trigger: 3 days before event_date at configurable time. |
| 9 | `event_day_email_he` | `email-event-day.html` | ✅ DONE 2026-04-28 — copy + visuals locked, file shipped to MESSAGES_V2/. |
| 10 | `event_closed_email_he` | `email-closed.html` | ❌ NOT migrated 2026-04-28 — Daniel directive: "אני רוצה שימשיכו להירשם לרשימת המתנה. זה לא חכם להשתמש בה." Lead registers over-capacity → gets Template 6 instead. |

**Final V2 inventory: 9 active email templates** (T10 not migrated by design).

**List correction (2026-04-28):** the original list pointed at legacy Make filenames; Daniel flagged that the CRM doesn't have an `already-registered` template. The new list above mirrors the actual 10 Email slugs in `modules/Module 4 - CRM/go-live/seed-templates-demo.sql`. The legacy filename column is kept only as reference for which old file to read when migrating copy. V2 output filenames in `MESSAGES_V2/` use the new slug naming (e.g., `lead_intake_duplicate_email_he.html`).

**Locked global conventions (apply to ALL templates):**
- Campaign customer-facing name: **"אירוע המותגים"** (NEVER "אירוע המכירות", "SuperSale", "קולקציות")
- Tone: warm, family-feel, never pushy. No exclamation marks except genuine excitement. No "MEGA SALE" pressure language.
- Person: gender-neutral plural ("אתם" / "אליכם" / "תקבלו"). Shop is "אנחנו". (Note: this differs from the original convention "singular informal" — Daniel switched to plural neutral during T2 authoring to keep masculine/feminine inclusive.)
- Emoji: zero (canon §6.4) — all visual symbols come from inline Heroicons SVG.
- Dash style: short hyphen `-` only in customer-facing copy. Em-dash `—` and en-dash `–` are forbidden.
- Wordmark: hardcoded text "PRIZMA OPTIC" + "Luxury Eyewear Events" (NOT image, NOT tenant variables).
- **NO tenant variables (`{{tenant.X}}`):** all Prizma values hardcoded inline. Decision 2026-04-28 — SPEC #11 deferred until tenant 2 onboards.
- Variable syntax: `%name%`, `%phone%`, `%email%`, `%event_*%`, `%registration_url%`, `%unsubscribe_url%` — CRM substitution syntax (NOT `{{...}}`, NOT `<...>`).

**Daniel editorial patterns learned (P1–P7):** see `COPY_DECISIONS_LOG.md` § "Daniel's Editorial Style — Patterns Learned". A future Overseer MUST read this before proposing copy.

**System wiring required for V2 to work in production:** see `MESSAGES_V2/NEW_SYSTEM_VARIABLES_REQUIRED.md`. That file is the master pre-cutover checklist (5 variables, 6 automation rules, 2 product features).

**To resume work in a new session:**
1. Read this file (HANDOFF) + `COPY_DECISIONS_LOG.md` + the canon
2. For SMS rebuild (in progress, see §11): same per-template lifecycle, reading from `seed-templates-demo.sql` SMS slug rows
3. For DB migration: write a SPEC that translates `MESSAGES_V2/*.{html,txt}` files into `crm_message_templates` UPDATE statements + configures the 6 automation rules

---

## 11. SMS Rebuild — COMPLETE (2026-04-28)

**Decision (Daniel, 2026-04-28):** rebuild the 9 SMS templates that match the 9 V2 emails (T10 SMS not migrated, same as T10 email). Each SMS must mirror its email counterpart in: campaign name ("אירוע המותגים"), person ("אתם" plural neutral), short hyphen only, message core.

**Status: 9 of 10 SMS templates LOCKED.** All shipped to `MESSAGES_V2/{slug}.txt`. T10 (`event_closed_sms_he`) NOT migrated by design (same Daniel directive as T10 email).

**Source for legacy SMS:** `modules/Module 4 - CRM/go-live/seed-templates-demo.sql` (10 SMS rows embedded in the seed file). No separate legacy SMS folder exists.
**Output location:** `campaigns/supersale/MESSAGES_V2/{slug}.txt` (one .txt per SMS - SMS is plain text, no HTML).

**SMS-specific conventions locked 2026-04-28 (in addition to email conventions):**
- **Functional emoji ALLOWED** in SMS (✔️ ✅ status, 📅 ⏰ 📍 🚗 📧 nav, 💛 signature). Decorative emoji forbidden (🎉 🥳 🔥 🎁 💎 ⭐ 😍 🥰 ❤️). Reason: SMS has no Heroicons substitute; emoji raise CTR; 💛 matches Prizma gold while ❤️ red breaks the palette. See COPY_DECISIONS_LOG.md "SMS emoji exception".
- **Preserve blank-line structure** from legacy SMS (Pattern P8 in COPY_DECISIONS_LOG.md). Each blank line is a soft section break the customer relies on.
- **Always include `להסרה: %unsubscribe_url%`** at the end (some legacy SMS missed this).

| # | New CRM slug | Legacy SMS row in seed file | Status |
|---|---|---|---|
| 1 | `lead_intake_new_sms_he` | line 19 | ✅ DONE 2026-04-28 - shipped to MESSAGES_V2/lead_intake_new_sms_he.txt |
| 2 | `lead_intake_duplicate_sms_he` | line 267 | ✅ DONE 2026-04-28 - shipped to MESSAGES_V2/lead_intake_duplicate_sms_he.txt |
| 3 | `event_will_open_tomorrow_sms_he` | line 445 | ✅ DONE 2026-04-28 - shipped to MESSAGES_V2/event_will_open_tomorrow_sms_he.txt. Uses `%event_max_attendees%`. |
| 4 | `event_registration_open_sms_he` | line 660 | ✅ DONE 2026-04-28 - shipped to MESSAGES_V2/event_registration_open_sms_he.txt. Uses `%event_max_attendees%` + `%event_deposit_amount%`. |
| 5 | `event_invite_new_sms_he` | line 858 | ✅ DONE 2026-04-28 - shipped to MESSAGES_V2/event_invite_new_sms_he.txt. Uses `%event_max_attendees%`. |
| 6 | `event_waiting_list_sms_he` | line 1300 | ✅ DONE 2026-04-28 - REVIVED purpose (over-capacity confirmation). Short legacy preserved per Daniel. Shipped to MESSAGES_V2/event_waiting_list_sms_he.txt. |
| 7 | `event_invite_waiting_list_sms_he` | line 1794 | ✅ DONE 2026-04-28 - system/info tone preserved. Uses `%event_max_attendees%`. Shipped to MESSAGES_V2/event_invite_waiting_list_sms_he.txt. |
| 8 | `event_2_3d_before_sms_he` | line 1448 | ✅ DONE 2026-04-28 - 3 days before, configurable time. Shipped to MESSAGES_V2/event_2_3d_before_sms_he.txt. |
| 9 | `event_day_sms_he` | line 1638 | ✅ DONE 2026-04-28 - shortest V2 SMS, morning-of tone preserved. Shipped to MESSAGES_V2/event_day_sms_he.txt. |
| 10 | `event_closed_sms_he` | line 1085 | ❌ NOT migrated - same Daniel directive as T10 email |

**Final V2 SMS inventory: 9 lifecycle SMS templates + 2 manual-move SMS templates = 11 active SMS** (T10 not migrated by design).

**Update 2026-04-28 (Foreman feedback round):** During Foreman's review of P5_V2_TEMPLATE_REBUILD SPEC, Daniel approved silent-default + opt-in toggle for manual attendee moves. Authored 2 new template pairs (UNPAID + PAID) to fire when staff ticks the toggle in the move dialog:
- `event_attendee_moved_unpaid_email_he` + `event_attendee_moved_unpaid_sms_he` — includes payment CTA via new variable `%payment_url_50%`
- `event_attendee_moved_paid_email_he` + `event_attendee_moved_paid_sms_he` — confirms carry-over of paid booking fee
4 files shipped to MESSAGES_V2/. Brings total V2 inventory from 18 to 22 files. New variable `%payment_url_50%` (and future `_75`, `_100`) requires JSONB column on `tenants.payment_links` — Pattern P12 documented (loud failure on missing value).

**New SMS-channel patterns harvested from this rebuild (full text in COPY_DECISIONS_LOG.md):**
- **P8** — Preserve blank-line structure in SMS (legacy used them as soft section breaks)
- **P9** — Don't use `%name%` in system-wide notifications (only personal/conversational genres)
- **P10** — Hardcoded "50" anywhere is a SaaS bug; use `%event_max_attendees%` (no "כ" prefix — cap is fixed per event). Templates that fire BEFORE a specific event is bound (T1) cannot use it; use generic phrasing.
- **P11** — Don't lengthen short status messages (T6 lesson: preserve legacy brevity unless the slot's purpose changed)

**Variables actually used across V2 SMS (cross-check against NEW_SYSTEM_VARIABLES_REQUIRED.md):**
- `%name%` — T1, T2, T4, T5, T6, T7, T8, T9, moved_unpaid, moved_paid
- `%event_name%` — T4, T5, T6, T7, moved_unpaid, moved_paid
- `%event_date%` — T4, T5, T6, T7, T8, moved_unpaid, moved_paid
- `%event_time%` — T7, T9
- `%event_max_attendees%` — T3, T4, T5, T7  (NEW alias of `crm_events.max_capacity`)
- `%event_deposit_amount%` — T4, moved_unpaid  (NEW alias of `crm_events.booking_fee`)
- `%payment_url_50%` (and future `_75`, `_100`) — moved_unpaid (NEW JSONB on `tenants.payment_links`)
- `%event_day_of_week%` — used in moved_unpaid + moved_paid emails (in event card) + T7 + T8 emails
- `%registration_url%` — T4, T5, T7
- `%unsubscribe_url%` — all 11

**Next operational step:** SPEC for DB migration that translates `MESSAGES_V2/*.{html,txt}` files into `crm_message_templates` UPDATE statements + configures the 6 automation rules. Authored by `opticup-strategic` (Foreman), executed by `opticup-executor`.

**SPEC authored 2026-04-28 by Campaign Overseer:**
- `modules/Module 4 - CRM/go-live/specs/P5_V2_TEMPLATE_REBUILD/SPEC.md` (routes to Foreman for split into 4 Rungs)
- `modules/Module 4 - CRM/go-live/specs/P5_V2_TEMPLATE_REBUILD/ACTIVATION_PROMPT.md` (paste into fresh Claude Code session loaded with opticup-strategic skill)

**4 Rungs proposed for Foreman to split:** Rung 1 schema (`deposit_amount` column + `%event_day_of_week%` variable), Rung 2 templates (18 UPDATEs + render verify), Rung 3 automation (6 rules), Rung 4 product features (cross-event move RPC + admin UI). Rungs 1+2 must land before 2026-05-03 cutover; 3 same window; 4 may defer post-cutover.

**Retro fix shipped before SPEC authoring:** added blank lines between greeting and body in T1 + T2 SMS for spacing consistency with T8 (Daniel directive: "רווחים צריך לעשות בכולם").

**Foreman feedback round (2026-04-28 evening):** Foreman's first SPEC review surfaced 3 Rule-21 collisions and 1 OPEN DECISION resolved this round:
- 2 columns assumed NEW already exist under different names (`max_capacity`, `booking_fee`) — resolved via aliasing in EF, no DDL needed.
- `crm_automation_rules` table is healthy + rich; existing engine extends easily.
- Scheduler infra (`crm_message_queue` + `dispatch-queue` EF + pg_cron) already exists.
- Manual-move notification: silent default + opt-in toggle approved → 2 new template pairs authored (4 files).
SPEC will be updated with 22 templates instead of 18, the new `%payment_url_*%` variable requirement, and the JSONB `tenants.payment_links` column.

**Implication for the Overseer:** when recommendations relate to visual/copy of campaign assets, reference the canon as the target state. Never recommend a visual change that contradicts the canon — it is sealed by Daniel.

---

## 12. P5_V2 Cutover QA Session — COMPLETED 2026-04-29 (merged to main via PR #30)

**Status:** 🟢 **14/14 flows GREEN** end-to-end on Prizma. Merged to main. ERP+Storefront in production.

**SPECs shipped to main this session:**
- **P5_8_INVITED_TO_REGISTERED_TRANSITION** (Fixes A-D bundled):
  - Fix A: register_lead_to_event RPC promotes attendees from `invited` → `registered/waiting_list` (was rejecting all `invited`)
  - Fix B: cascade trigger - when lead soft-deleted, attendees auto-soft-deleted (no more orphans)
  - Fix C: dispatchFreshLead writes `lead.status='invited'` when T5 fires (lands in "רשומים" not "לידים נכנסים")
  - Fix D: event-register EF forwards event_id to send-message so substitution layer resolves event-derived vars
- 6 SMS templates shortened to ≤5 parts (Global SMS vendor 404s on >5-part Hebrew messages):
  T4, T5, T7, T8, event_registration_confirmation, event_attendee_moved_unpaid
- 4 templates fixed for redundant "אירוע המותגים" before %event_name% duplication
- DB+UI delete-lead button + duplicate-check filter `is_deleted=false`
- Phone display format: %phone% renders as Israeli local (0537889878), not E.164 (+972...)

**Bug findings during QA (all fixed inline):**
- Empty-email lead-intake EF accepts (now rejects 400)
- ON CONFLICT spec mismatch on attendee upsert
- queue_send was double-suffixing template slug
- send-message EF didn't inject basic event vars for server-side callers
- Make scenario 9104395 hardened: maxErrors 3→50, DLQ enabled (after Global SMS 404 batch caused silent halt earlier in session)

**State on Prizma at session close:**
- Active leads: a262bc0e ("T5 Canary Post-Shorten", confirmed) + 1 cap-filler soft-deleted
- Attendee ce1e02a9 (V4 Edge volume): registered + paid
- Events: V4 Edge volume (registration_open), F14 src+dst (planning), Edge concurrent A (registration_open), Edge concurrent B (will_open_tomorrow)
- 0 orphan attendees on either tenant
- 1 known issue: lead "QA Filler (T6 cap)" missing email visible in CRM (cap-filler from earlier QA — soft-delete not perfect; cosmetic, not blocking)

**Daniel-directed deferrals (post-cutover backlog):**
- Storefront same-domain spam routing (events@→daniel@ same domain) — research/SPF/DKIM
- registration_method='form' misattribution on dispatch-created attendee rows (data integrity, not blocking)
- Architectural: send-message EF should mark `status='queued_at_make'` not `'sent'` until vendor confirms delivery (Make→Supabase callback) — false-positive in DB
- Backend SMS length guard (reject >5 parts at EF before Make)
- event_registration_confirmation_sms_he hardcoded values (phone, location) → tenant variables when SaaS adds them

---

## 13. Pre-Cutover SPECs Remaining (DECIDED 2026-04-29)

**Cutover target:** Saturday or Sunday 2026-05-02 or 2026-05-03 (Daniel's choice — AFTER the SuperSale event).

**Two SPECs MUST land before cutover (in order):**

### SPEC #1 — P5_7_STOREFRONT_FORM_REWIRE
- **Already authored:** `modules/Module 4 - CRM/go-live/specs/P5_7_STOREFRONT_FORM_REWIRE/SPEC.md`
- **Purpose:** rewire storefront SuperSale form from current `/api/leads/submit` → `cms_leads` legacy path TO the new `lead-intake` Edge Function so customer-form leads enter the V2 pipeline (instead of Monday).
- **Includes part A from P5_5:** strong client-side validation (phone format `05XXXXXXXX`, email regex)
- **Includes part B from P5_5:** phone normalization client-side (any input → +972XXXXXXXXX before POST)
- **DOES NOT include:** the actual switchover. Code lands prepped; switch to NEW EF happens at cutover-day operational event.
- **Order:** First — must land before P5_6 because P5_6 protects the EF that P5_7 connects to.

### SPEC #2 — P5_6_BOT_PROTECTION
- **Already authored:** `modules/Module 4 - CRM/go-live/specs/P5_6_BOT_PROTECTION/SPEC.md` + `ACTIVATION_PROMPT.md`
- **Purpose:** 4-layer bot protection on lead-intake:
  - Layer 1: Honeypot field (free, immediate)
  - Layer 2: Cloudflare Turnstile (free CAPTCHA, low UX friction)
  - Layer 3: IP-based rate limiting (5 leads/hour per IP)
  - Layer 4: Daily SMS budget cap per tenant (default 200)
- **Order:** Second — after P5_7. Layers 1+2 must ship pre-cutover. Layers 3+4 may ship within 7 days post-cutover if timing tight.

### Cutover sequence (all on Daniel's hand)
1. P5_7 ships to develop → main (this week, before SuperSale)
2. P5_6 ships to develop → main (this week, before SuperSale)
3. SuperSale event happens
4. Cutover day (Sat/Sun 2026-05-02 or 03):
   - Manual `/api/leads/submit` switch over to lead-intake EF route
   - Daniel monitors first hour of customer traffic
   - Rollback ready if issues

---

## 14. Resuming In a New Session

When Daniel returns:

1. Read this HANDOFF file (§12, §13).
2. Read `MEMORY.md` for global context.
3. Confirm Daniel's plan: start P5_7 first, then P5_6.
4. P5_7 SPEC + ACTIVATION_PROMPT already authored — Daniel pastes activation prompt into a fresh Claude Code session with opticup-strategic skill loaded.
5. Daniel handles deploys (CLI) and the cutover day operational event himself.

**Session-end deliverables (this session):**
- 14/14 QA flows GREEN ✅
- Merged to main ✅
- 2 SPECs authored awaiting Daniel-triggered execution
- HANDOFF + memory updated for next session

---

## 15. Daniel's Manual QA Backlog — 2026-05-01 (NEW — addressed before P5_7 cutover prep)

> **Status update 2026-05-01 (late evening):** **ALL 12 B-items ✅ closed.** B4/B5/B6/B7/B8/B11/B12 via PRE_CUTOVER_QA_A_DATA_AND_LOGIC. B1/B2 via PRE_CUTOVER_QA_B_FORM_AND_TEMPLATE. B3/B9/B10 via PRE_CUTOVER_QA_C_UI_CLEANUP (5 commits on develop). Pre-cutover hardening backlog from §15 is fully drained. Remaining before cutover: P5_7_STOREFRONT_FORM_REWIRE → P5_6_BOT_PROTECTION → Daniel-driven QA pass once 2 EFs deploy → cutover Sat/Sun 2026-05-02 or 03.
>
> **B8 hot-fix shipped 2026-05-01 (post-PR#36 browser QA catch):** the `%event_day_of_week%` plumbing wired during PRE_CUTOVER_QA_A B8 had an off-by-one bug — `new Date(ymd + 'T00:00:00+03:00').getUTCDay()` returned the previous calendar day. Fixed in `modules/crm/crm-helpers.js` + `supabase/functions/send-message/event-variables.ts` (1-line body each). `send-message` EF redeployed v15→v16. Full retrospective in `modules/Module 4 - CRM/docs/specs/B8_DAY_OF_WEEK_TIMEZONE_FIX/`. No customer messages corrupted (cutover hadn't fired yet).

Surfaced by Daniel during a manual QA pass on the live CRM after the P23–P35 cycle landed. **All 12 items must be triaged and fixed before P5_7 cutover work resumes.** Order below is Daniel's listing order, not priority.

### B1 — Eye-exam options on auto-event-registration form (waiting-leads flow)

The auto-sent event-registration form (T5/T7 path; sent to leads in `status='waiting'` when an event opens for them) has eye-exam options that are out of date. Replace with the new 4-option list:
- "לא, אין צורך בבדיקה"
- "כן, בדיקה רגילה"
- "כן, בדיקת מולטיפוקל"
- "יש לי כבר מרשם עדכני"

After the customer submits, the chosen value must propagate everywhere the previous selection appeared (lead detail card, event-day attendee row, internal logs).

### B2 — Visual redesign of the registration form

The form should look "more beautiful" with a light background. Currently feels system-y/utilitarian. Daniel will provide design direction (or we'll prototype) — out-of-scope for the immediate fix; capture as design SPEC for the dev cycle, not pre-cutover blocker.

### B3 — Date format across the entire CRM → DD/MM/YYYY

Every date display in the CRM admin (registered tab, event detail, lead detail, automation history, message log, drill-down modals) must render as `DD/MM/YYYY`. Audit the codebase for `toLocaleDateString` calls and `formatDate` helper variants; standardize on Hebrew DD/MM/YYYY.

### B4 — Lead status MUST NOT flip when event status → "ייפתח מחר"

Current behavior: when an event status changes to `will_open_tomorrow`, the leads' `lead.status` is being changed (from `waiting` to something else). **Should stay `waiting`.** Only the messages should fire — the lead status stays put.

This is a regression from the recent automation rules wiring. Likely a post-action that needs to be removed or scoped out of the `will_open_tomorrow` rule.

### B5 — "Refund completed" status update path

After the operator marks a refund as completed (the existing "סמן הוחזר" button in the legacy payment panel OR a new path in the cancel-with-refund flow), verify:
- The refund-pending banner counter decrements
- The lead's `payment_status` becomes `refunded`
- Any per-lead red badge from P31's failed-msg UI doesn't persist incorrectly

Investigation needed: where exactly is "mark refunded" surfaced in the post-P23/P24 UI? Likely needs a new operator-facing button next to the cancel/refund flow.

### B6 — Event numbering must restart from 1 + accommodate Monday import

Current `event_number` values are starting high (the auto-numbering has accumulated through QA cycles). Daniel wants:
- New events to start from 1
- When all current Monday events are imported, they'll come in numbered 13–23
- The next auto-event-number after the import must be max(existing) + 1, NOT reset to 1 again

Required actions:
1. Reset the `next_crm_event_number` RPC's sequence/counter for Prizma to start at 1 (or whatever the cleanest baseline is)
2. Decide: do we delete the existing QA events to make room, or do we accept the QA numbers and only ensure post-import numbering is monotonic?
3. The Monday-import SPEC (existing or new) must preserve original event_numbers when migrating existing events.

### B7 — Default Waze URL when not set per-event

When an event is created without an explicit Waze URL, fallback to the canonical Prizma branch:
- `https://waze.com/ul/hsv8s5h2c3`

Implementation: either auto-fill on event create (similar to P23's `coupon_code` auto-default) OR resolve at message-render time in the EF (similar to other tenant-level defaults).

Consistent with P23 pattern: caller-provided URL wins, fallback to tenant config.

### B8 — Day-of-week field on events + auto-substitute in templates

Daniel wants a "day of week" piece of information visible at event creation time and auto-injected into templates. Currently `event_date` shows DD/MM/YYYY — adding the Hebrew day name ("יום ראשון", "יום שני"...) makes messages much warmer.

Investigation: is `%event_day_of_week%` already wired in the EF? (Per HANDOFF §11 line 268, yes — used in moved_unpaid + moved_paid emails + T7 + T8 emails.) If it exists, just need to:
1. Add a UI field (read-only, auto-derived from `event_date`) on the event-create/edit form for operator visibility
2. Add `%event_day_of_week%` to the templates that don't yet use it (T1–T6, T9, etc., wherever a date appears)

### B9 — Remove "Multisale" entirely

Multisale (the older campaign type) is no longer in use. Remove all UI references, templates, automation rules, schema fields specific to multisale.

Investigation needed: catalog every "multisale" reference (DB tables, columns, UI tabs, template slugs, automation rules, files in `/multisale*` paths). Daniel ack'd that nothing currently depends on it being live.

### B10 — Per-event-status colors + admin settings to customize them

Each event status (registration_open, will_open_tomorrow, invite_new, closed, etc.) should display in a different color across the UI. Plus: a settings button (somewhere accessible from the events screen) opens a modal where operators can change the color assigned to each status.

Implementation likely: extend `crm_statuses` table (already has `color` column per V2 design) with operator-edit UI. Daniel may have specific palette preferences — capture during design pass.

### B11 — Verify campaign sync works end-to-end

Multi-system: storefront ↔ CRM ↔ Make ↔ vendors. Daniel wants verification that the entire pipeline holds together post-cutover. This is largely already covered by P30/P32/P34 verification SPECs but Daniel wants a fresh end-to-end pass focused specifically on the campaign flow (form submit → lead → event registration → coupon delivery → attendance).

### B12 — Data migration completeness check before Monday→OpticUp cutover

Before Daniel does the actual cutover (data migration from Monday to the new system), every field that exists on a Monday lead must verifiably arrive in the new `crm_leads` row. Before any go-live click:
- Run a parity report: Monday columns vs `crm_leads` columns + transforms
- Confirm 100% of fields land + no data loss
- Confirm imported `event_number`s preserve original IDs (per B6)

This is **the cutover-day gating step**. Should be a checklist SPEC that runs immediately before flipping the storefront form to lead-intake EF.

---

## 16. Resuming In a New Session (UPDATED 2026-05-01 evening)

**Status:** all 12 B-items from §15 have been triaged + authored as 3 pre-cutover SPECs. Daniel directive 2026-05-01: "אנחנו נעשה הכל לפני שנעשה את המעבר" — every B-item ships before cutover, no deferrals.

### The 3 SPECs (written 2026-05-01)

| SPEC | Slug | Items | Estimated session | Folder |
|---|---|---|---|---|
| A | `PRE_CUTOVER_QA_A_DATA_AND_LOGIC` | B4, B5, B6, B7, B8, B11, B12 | 4-6 hrs | `modules/Module 4 - CRM/docs/specs/PRE_CUTOVER_QA_A_DATA_AND_LOGIC/` |
| B | `PRE_CUTOVER_QA_B_FORM_AND_TEMPLATE` | B1, B2 | 2-3 hrs | `modules/Module 4 - CRM/docs/specs/PRE_CUTOVER_QA_B_FORM_AND_TEMPLATE/` |
| C | `PRE_CUTOVER_QA_C_UI_CLEANUP` | B3, B9, B10 | 3-4 hrs | `modules/Module 4 - CRM/docs/specs/PRE_CUTOVER_QA_C_UI_CLEANUP/` |

Each SPEC folder contains: `SPEC.md` + `ACTIVATION_PROMPT.md`. At execution close, Claude Code adds `EXECUTION_REPORT.md` + `FINDINGS.md`.

### Recon findings that shaped the SPECs

- **B4 root cause found:** `crm-automation-post-actions.js` `promoteWaitingLeadsToInvited()` runs unconditionally after every dispatch. It only skips when `skip_auto_promote` flag is set, which the seed rule for `will_open_tomorrow` doesn't have. The fix is to add the flag to the rule's `action_config` (at seed file + live DB for both tenants). SPEC-A captures this fully.
- **B6 RPC analysis:** `next_crm_event_number` uses `MAX(event_number) + 1` with `FOR UPDATE` lock on the campaign row. To support Monday-import event_number preservation without breaking the existing flow, SPEC-A adds a NEW sibling RPC `next_crm_event_number_for_import` that respects an explicit number when provided. Whether to delete prizma QA events to baseline at 1 is a Daniel-only decision (SPEC-A §5 stop trigger).
- **B8 confirmed wired:** `%event_day_of_week%` IS already injected in `event-variables.ts:89-91` via `hebrewDayOfWeek()` helper. Only UI field + template audit pass needed (no EF code change).
- **B9 scope LOW:** Only ~3 active references (1 seed row in `crm_campaigns` + ~3 doc files). 0 active code coupling — no automation rules, no message templates, no UI tabs reference multisale. Risk of breakage tiny if FK check is clean.
- **B10 schema ready:** `crm_statuses` table already has a `color` column (per `seed-crm-statuses-demo.sql:10`). NO DDL needed for B10 — just UI work + UPDATE.

### Execution recommendation

- **Order: A → B → C** (A is highest cutover-blocking risk; B + C have no overlap with A but visual/audit work is lower stakes)
- A + B + C may execute in PARALLEL if Daniel has confidence (no overlapping files), but serial reduces context-loss risk on Claude Code side.
- After all 3 merge to main: P5_7_STOREFRONT_FORM_REWIRE → P5_6_BOT_PROTECTION → cutover (Sat/Sun 2026-05-02 or 03)
- **Cutover-day gate:** B12 deliverable `MONDAY_TO_OPTIC_UP_PARITY.md` must be Daniel-signed-off. This is the final go/no-go before flipping the storefront form.

### Stop triggers across all 3 SPECs (Daniel-only decisions)

- **SPEC-A B6:** delete QA events to baseline at 1, or keep + monotonic? (recommended path: keep + monotonic to preserve test history — but Daniel's call)
- **SPEC-A B7:** add `default_waze_url` to `tenants.config` JSONB? (recommended: yes)
- **SPEC-B form location:** if form lives in storefront repo not ERP, scope must re-target
- **SPEC-B design tokens:** inline canon values vs. ship tokens to storefront first vs. defer B2
- **SPEC-C B9 FK check:** if multisale FK rows exist, defer or reassign?
- **SPEC-C B10 modal entry point:** gear icon? toolbar? menu?

When Daniel triggers each Claude Code session, he pastes the contents of the matching `ACTIVATION_PROMPT.md` into a fresh Claude Code session loaded with the `opticup-executor` skill.

---

*End of CAMPAIGN_OVERSEER_HANDOFF.md.*
