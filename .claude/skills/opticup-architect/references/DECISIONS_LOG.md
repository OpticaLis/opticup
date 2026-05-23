# Architect — Decisions Log (Index)

> **Purpose:** Single source of truth for all strategic decisions made with Daniel.
> **Structure:** This file = INDEX (lightweight, loaded on bootstrap). Per-module detail = `decisions/<MODULE>.md`.
> **When to update:** After EVERY meaningful interaction (in-flight, not session-end). Append a 1-line entry here + full detail in the module file.
> **Module Close Ceremony:** When a module's Architecture Brief is sealed, harvest 1-2 lessons from its `decisions/<MODULE>.md` → update `SKILL.md` if pattern recurs.

---

## How to read this index

Each row: `date` · `module` · 1-sentence summary · → link to detail.

Format for full entries (in `decisions/<MODULE>.md`): situation → my recommendation → Daniel's response → reason → lesson.

---

## Cross-Module decisions (workflow, process, communication style)

→ Full detail: [`decisions/CROSS.md`](decisions/CROSS.md)

| # | Date | Topic | One-liner |
|---|---|---|---|
| 1 | 2026-05-06 | Wrote SPEC instead of brief | I conflated Module Strategist's job with mine; Daniel corrected the role boundary. |
| 2 | 2026-05-06 | Verbose audit summary | Bullet-list overload in chat; learned to compress to 3-line P22 format. |
| 3 | 2026-05-06 | STRICT 3-line format (P22) | Replaced P20 with hard-coded chat format rules. |
| 4 | 2026-05-06 | Daniel does not want technical detail in chat | Confirmed: tables/fields/RPC names = file content, NOT chat content. |
| 5 | 2026-05-09 | Project Structure Cleanup SPEC executed (11 commits) | Root Discipline Rule installed in CLAUDE.md §0.5; 4 archive locations consolidated; Module 1 duplicate resolved; per-tenant chat onboarding docs archived. |
| 6 | 2026-05-09 | SPEC's pre-flight caught 5 author bugs | Executor's pre-flight check found 5 SPEC defects (data/+---QA--- omitted, git mv vs mv, MASTER_LIVE_PLAN modification at risk, Pre-SPEC commits needed, JWT in archived files). All resolved inline. **Author was Cowork; executor was Claude Code with full repo state visibility.** |
| 7 | 2026-05-09 | Module Close Ceremony performed for Project Structure Cleanup | Lessons P27 (sketch-the-feature) + P28 (executor pre-flight beats author intent) promoted to SKILL.md. |
| 8 | 2026-05-09 | Daniel question: why are in-design modules in `__LAUNCH_PLAN_DRAFT__/` when built modules are in `modules/`? | Author-blindspot — historical accident I never noticed. Fixed by MODULES_HOME_UNIFICATION SPEC. **Pattern: Daniel asks structural questions from a clean-thinker perspective; my job is to listen, not defend the status quo.** |
| 9 | 2026-05-09 | MODULES_HOME_UNIFICATION SPEC executed (12 commits) | One Home Per Module rule established. `__LAUNCH_PLAN_DRAFT__/` retired entirely. 8 in-design module Briefs moved to `modules/Module N - Name/architecture-brief/`. New `roles/` at repo root for operational personas. 99 files updated for path-reference rewriting. |
| 10 | 2026-05-09 | Module Close Ceremony for MODULES_HOME_UNIFICATION | Lessons P29 (sweep-references pre-flight) + P30 ([retired-YYYY-MM-DD:NAME] marker for closed-SPEC narrative refs) promoted to SKILL.md. F1/F2/F3 also documented for `opticup-executor` SKILL update (separate session). |
| 11 | 2026-05-09 | Daniel directive: "I want infrastructure, not culture. Culture decays." | Triggered STRUCTURE_PROTECTIONS SPEC. Pattern: when documenting a rule, ask "where's the enforcement?" If only a doc, it will erode. |
| 12 | 2026-05-09 | STRUCTURE_PROTECTIONS SPEC executed (10 commits) | 3 protection layers active: pre-commit hook (check-root-discipline) + Sentinel Mission 10 (daily audit) + architect Step 4.5 (bootstrap auto-check). Smoke-tested: a FORBIDDEN_TEST.md was correctly blocked. |
| 13 | 2026-05-09 | Module Close Ceremony for STRUCTURE_PROTECTIONS | Lesson P31 (3-layer enforcement) promoted to SKILL.md. F1 (auto-load vs spawn) + F2 (.gitignore line 34 — 3rd occurrence, MUST FIX next session) documented. |
| 14 | 2026-05-10 | Module Close Ceremony for M13 (Loyalty Club) | Lessons P32 (anti-legacy-pattern) + P33 (settings sketch mandatory with P19) promoted to SKILL.md via SKILL_PENDING_M13_CLOSE.md. |
| 15 | 2026-05-10 | M9 (Lab/KDS) Architecture Brief sealed | 25 decisions, 8 entities, 5 engines, 4 sketches (KDS + Shipments + Dashboard + Settings). M9 framed as "McDonalds System" not "shipping extension"; old shipping module deprecated; major hybrid with M1+M5+M7+M8+M11+M12+M13. **All 10 Briefs sealed** — clear path to SPECs. |
| 16 | 2026-05-10 | Module Close Ceremony for M9 | Lessons P34 (sketches before brief) + P35 (HTML sketch file format) + P36 (computer:// links) + P37 (reframe → reopen locks) + P38 (settings sketch first for config-heavy) + P39 (additive max caps) promoted to SKILL.md via SKILL_PENDING_M9_PATTERNS.md + SKILL_PENDING_M9_CLOSE.md. |
| 18 | 2026-05-11 | M7 V7 sketch selected (Variant A) | Daniel chose two-pane work surface + sticky tools strip over Variants B (accordion) and C (T-layout). Reason: all 9 v6 regions visible simultaneously, no clicks needed to see pricing or print actions. V6 + 2 variants archived. |
| 19 | 2026-05-11 | Sketch Revision Batch 3 closed (M5/M6/M8/M11/M12/M14/M15) | 17 architecture-brief mockup files re-skinned in place to Hybrid+Navy via `M1_5_SKETCH_RESKIN_BATCH_3` SPEC. 13 heavy + 4 light (M12 channel semantics preserved). 17 `pre-reskin-*` git tags + 7 module commits + 1 retro. In-flight script extension handled M12 deviation; 4 skill improvements harvested + applied (2 per skill). Remaining: M13 full revision + M9 from-scratch as separate Batches. |
| 20 | 2026-05-11 | Migration #1 (Suppliers Debt) closed — first LIVE production page on Hybrid+Navy | `MIGRATION_1_SUPPLIERS_DEBT` Full-Auto Pipeline ran end-to-end in ONE chat across 5 skills (Foreman → Executor → Reviewer → Localhost-Tester → Foreman-Review). Zero functional change: smoke 7/7 PASS, all 55 `<script>` + 3 `<link rel="stylesheet">` + 17 DOM ids + 3 onclick handlers preserved. **Validated technique: page-scope `body { --primary }` override** instead of mutating `css/styles.css :root` — Navy stays on this page, all other unmigrated ERP pages keep legacy Indigo via cascade. This is the safe migration vehicle for Migrations #2/#3/#4. 6 additive Navy/slate tokens appended to `shared/css/variables.css` Section 12 (zero deletions, Brief Locked Decision #5 honored). Pre-commit tag `pre-migration-suppliers-debt` enables per-page rollback. Per Daniel's policy: develop-only; ONE batch merge to main after all 4 production migrations land. 4 skill improvements applied: 2 to opticup-strategic (heading convention `## N.` not `## §N.`; §0 reality-check promoted to template), 2 to opticup-executor (inline-hex audit helper; Full-Auto leave-pre-existing-untracked-files-alone). |
| 22 | 2026-05-11 | Demo Whitelist Update — SMS no-op verified, email gap escalated | `DEMO_WHITELIST_UPDATE` Full-Auto Pipeline ran end-to-end in ONE chat. Diagnostic phase confirmed demo's `test_mode_sms_allowlist` already contains exactly Daniel's 3 phones in E.164 (mandated by C-001) — NO SMS UPDATE applied. Email allowlist mechanism does NOT exist (no column, no `ui_config` jsonb key, no `send-message` EF gate) — wrote `ESCALATION.md` with 3 options + Foreman recommendation Option 2 (jsonb in `ui_config`, minimal disruption). Zero DB writes, zero code changes, Prizma row untouched (`updated_at` identical pre/post). Two skill-improvement lessons harvested: (1) opticup-strategic — SPEC §6.5 envelope can narrow vs Brief without rewriting the Brief; (2) opticup-executor — `ESCALATION.md` is a first-class SPEC-folder artifact when Brief authorizes a planned escalation. Demo SMS-side ready for Daniel's manual test cycle; email envelope blocked on Architect's choice of Option 1/2/3. → Full detail: [`decisions/CROSS.md`](decisions/CROSS.md) entry 2026-05-11. |
| 21 | 2026-05-11 | Migration #2 (Settings + Permissions) closed — 2 LIVE production pages on Hybrid+Navy | `MIGRATION_2_SETTINGS_PERMISSIONS` Full-Auto Pipeline ran end-to-end in ONE chat across the same 5 skills. Two pages (`settings.html` 208→212 lines, `employees.html` 87→91 lines) re-skinned via the SAME 4-line page-scope `<style>` block in `<head>` — validated MIGRATION_1's vehicle on a multi-file SPEC. Zero functional change: smoke 7/7 PASS, all 20+24 `<script>` + 10+10 `<link rel="stylesheet">` + DOM tags within ±2% per page, page-scope confined (verified inventory.html does NOT contain the override). **Daniel decision (this session):** Settings + Permissions stay as 2 separate pages; tab-consolidation per Hybrid mockup is structural (routing, links) and gets a separate SPEC after all 4 visual migrations land. **Variables.css UNTOUCHED** — Migration #1 already added the 6 Navy tokens. **Module CSS UNTOUCHED** — discovered F1: `css/settings.css` ≡ `css/employees.css` byte-identical (Rule 21 violation, pre-existing) → future dedup SPEC. Per-page tags `pre-migration-settings` + `pre-migration-employees` enable independent revert. 4 skill improvements applied: 2 to opticup-strategic (Shared Edit Block §3a in SPEC_TEMPLATE for multi-file identical-edit SPECs; Baselines sub-table in §0 with `BASE_*` symbols referenced from §3), 2 to opticup-executor (codified `<style>` block placement rule; planned `verify-reskin-page.mjs` helper reference in SKILL.md, script-build deferred to Migration #3). 3 findings opened (F1 dedup SPEC, F2 header.css fallback drift → TECH_DEBT, F3 skill copy drift → TECH_DEBT). 2 of 4 production migrations now CLOSED on develop; awaiting Migration #3 (CRM) + #4 (Storefront Studio) before batch merge to main. |
| 23 | 2026-05-11 | Demo Email Allowlist Infrastructure closed — email envelope now mirrors SMS contract | `DEMO_EMAIL_ALLOWLIST_INFRA` Full-Auto Pipeline ran end-to-end in ONE chat. **Architect decision applied:** Option 2 from `DEMO_WHITELIST_UPDATE/ESCALATION.md` — `ui_config.test_mode_email_allowlist` (jsonb path) over a new column (Option 1) or separate config table (Option 3). Reason: no schema change, SaaS-litmus-clean (future tenants set the key via existing tenant-config UI), consistent with cookie_consent / brand / whatsapp_phone_e164 already living in `ui_config`. **Implementation:** `phoneAllowed` + `normalizePhone` + new `emailAllowed` + `normalizeEmail` extracted from `send-message/index.ts` (was 331 lines, hit Rule 12 cap with email gate added) into new co-located `send-message/allowlists.ts` (81 lines). SMS body byte-identical (relocation, not logic change). Email gate added after SMS gate, same `crm_message_log` `status='rejected'` pattern, error_message `email_not_allowed: <email>`, fail-CLOSED on lookup error or malformed jsonb. EF redeployed v21→v22. Single-row `jsonb_set` UPDATE on demo only adds the 3 emails (`danylis92@gmail.com`, `daniel@prizma-optic.co.il`, `alkimovich94@gmail.com`); demo `ui_config` keys grew 12→13, all existing keys preserved. **Prizma untouched:** `ui_config ? 'test_mode_email_allowlist'` returns false, `updated_at` identical to pre-snapshot. **Discovery confirmation:** demo's `updated_at` did NOT change post-UPDATE — confirms F3 from `DEMO_WHITELIST_UPDATE` (no `updated_at` trigger on `tenants`); already in TECH_DEBT, no new entry. Demo now ready for the full manual test cycle (both SMS and email envelopes locked to Daniel's inboxes). → Full detail: [`decisions/CROSS.md`](decisions/CROSS.md) entry 2026-05-11 (DEMO_EMAIL_ALLOWLIST_INFRA). |
| 24 | 2026-05-12 | M13 Brief Amendment closed — D14 (basic-free tier) added | `M13_BRIEF_AMENDMENT` Full-Auto Pipeline ran end-to-end in ONE chat. Docs-only amendment to the sealed M13 Brief — no code, no DB, no schema, no sketch changes. 5 files updated: `M13_LOYALTY_BRIEF.md` (§2 Tiers Prizma + new `Tier basic-free` sub-section + §11 D14 row), `M13_DECISIONS_FOR_LOG.md` (full D14 entry), `decisions/M13.md` (module-level entry), this index (entry 24 + M13 sub-table entry 3), `OPEN_TASKS.md` (task #6 closed). **D14:** `basic-free` is an auto-enrolled, no-fee, credits-only membership tier created on first qualifying event for a non-member — either M9 compensation OR future Referral bonus. No accrual, no welcome bonus, no family pool, no engine pass; credit redemption uses the same M7 Redeem Engine. Upgrade to a paid tier preserves the credit balance. Schema impact: NONE — basic-free is a `loyalty_tier` config row added at M13 seed time. SaaS-clean: other tenants disable via `is_active=false`. **Gap origin:** surfaced during M9 D24 (2026-05-10) — M9's compensation flow needed an M13 slot for non-member customers and the original 13 M13 decisions all assumed paying members. **Cross-module impact:** M9 build SPEC must call `loyalty_ensure_basic_free_membership(customer_id, amount, source)` (one-shot idempotent) before inserting `loyalty_credit_transaction`. → Full detail: [`decisions/M13.md`](decisions/M13.md) entry 2026-05-12. |
| 26 | 2026-05-12 | Prizma CRM Bugfix Backport closed — event-invite waitlist fix shipped to develop, awaiting Daniel main-merge | `PRIZMA_CRM_BUGFIX_BACKPORT` Full-Auto Pipeline ran end-to-end in ONE chat. **Data-only backport** of demo's 2026-05-11 E2E audit fix to Prizma production: 2 single-row UPDATEs on `crm_automation_rules` for Prizma tenant only (rules `d2585fc4` + `c25feaf7` — the analogs of demo's `a06be5d8` + `ee0a6f24`). Each rule's `action_config` rewritten: `recipient_type` `cross_event_active_waitlist` → `leads_by_status`, added `recipient_status_filter=['waitlist']`, removed `post_action_attendee_upsert={status:'invited'}` key. **Path A** auto-decided: Prizma's pre-fix shape matched demo's PRE_FIX_RULE_SNAPSHOT byte-for-byte structurally; new md5s are byte-identical to demo's POST_FIX_RULE_STATE md5s. Prizma's 14 non-target rules aggregate md5 (`f10eaae8ed273ee42fa7b393cc289153`) unchanged pre/post. Demo's 2 fixed rules md5s preserved (zero regression). **EF dry-run** on Prizma (`automation-engine` v8 `mode='evaluate'`) for both rule-trigger conditions: 0 outbound (verified: 0 `crm_message_log` rows tied to the 4 dry-run `run_id`s), 0 attendee inserts, 0 queue writes. Pre-write annotated git tag `pre-backport-prizma-event-invite-fix` on `bccbc1a`. **Pre-merge artifacts:** `READY-FOR-MAIN-MERGE.md` (PR title/body/compare URL), `ROLLBACK_SQL.md` (verbatim pre-state SQL one UPDATE per rule), `ARCHITECT_REVIEW_CHECKPOINT.md` (side-by-side Before/After diff + auto-classified 🟢 verdict). Main-merge is Daniel-only via GitHub PR. **2 findings opened:** `M4-DEBT-CRM-AUTO-RULES-UPDATED-AT` (`crm_automation_rules` lacks `updated_at` column — minor audit gap), `M4-DEBT-EVENT-REG-OPEN-AUDIENCE-AUDIT` (separate `event_registration_open` rule resolves to 1999 plan_items on Prizma — outbound-volume question worth a future audit). **4 skill improvements harvested:** opticup-strategic — (1) read EF source FIRST when SPEC requires EF dry-run, pin exact `status` field values from source (e.g. `'completed'` not `'evaluated'`); (2) Cross-Reference Check result should also be re-stated in DIAGNOSIS.md for SPECs authored more than 24h before execution. opticup-executor — (3) EF dry-runs returning large `plan_items` arrays must use per-rule Group-Object summary pattern (this SPEC's first call produced 27MB tool output; second call summarized to 10 lines); (4) two-tier hash pattern codified — per-target-row md5 + aggregate-untouched md5 captured pre/post-write for all subset-update SPECs. → Full detail: [`decisions/CROSS.md`](decisions/CROSS.md) entry 2026-05-12 (PRIZMA_CRM_BUGFIX_BACKPORT). |
| 30 | 2026-05-13 | EV-001 SPEC CLOSED — STATUS_CHANGE_TRIGGERS_FRAMEWORK shipped via Full-Auto Pipeline | `STATUS_CHANGE_TRIGGERS_FRAMEWORK` Full-Auto Pipeline ran end-to-end in ONE Claude Code chat across all 5 hats (Foreman → Executor → Reviewer → Localhost-Tester → Foreman closure). 9 commits `b2fb0c0..1d71698`, 19 files changed, +1,517/-100 lines. **What shipped:** 2 new tables (`crm_status_change_events` queue + `crm_trigger_type_registry` mapping), 1 DB trigger on `crm_event_attendees.status` (NULL-safe `IS DISTINCT FROM` + `SECURITY DEFINER` + `SET search_path` hardened, canonical RLS pattern), registry seed for attendee, 2 production rule UPDATEs migrating demo + Prizma silently-broken check-in rules from `attendee:created` (which never fires for `status='registered'` inserts) to the new `attendee_status_change` trigger type. automation-engine EF rebuilt with `consumeStatusChangeEvents` consumer loop + new trigger types/condition operators (`status_changed_from`, `status_changed_to`). dispatch-queue EF rebuilt with parallel-by-group multi-channel dispatch (SMS+Email rows enqueued same transaction, same `scheduled_for`, drained on same tick). pg_cron schedule installed for consumer. Rule-editor UI: `fires_on` sub-picker on attendees board + browser engine mirror in `crm-automation-engine.js`. **Verification:** 25/25 SPEC criteria, smoke 7/7 PASS, Reviewer 🟡 PASS WITH NOTES, Localhost-Tester 🟢 GREEN. **Multi-channel parallel delta: 38ms vs ~1000ms pre-fix (26× improvement)** — independently spot-checked by Foreman via SQL. Prizma collateral md5 `f6c4fd0f07407e74537e37e1ed6f0527` unchanged pre/post/post-smoke. **In-flight handling:** OPEN-021 deploy-fallback path triggered when Supabase MCP `deploy_edge_function` returned `InternalServerErrorException` — Executor stopped exactly per SPEC criterion 21, wrote `DEPLOY_FALLBACK_NEEDED.md`, paused. Daniel CLI-deployed both EFs from Windows; pipeline resumed cleanly through Phase 3 + Phase 5. Phase 4 (UI + browser mirror) ran in parallel to deploys per Architect decision (saved ~30 min). 4 in-flight decisions (DR1-DR4) all documented in EXECUTION_REPORT §6; Foreman accepted all 4. **Verdict 🟡 CLOSED WITH FOLLOW-UPS.** 4 follow-ups: F1 (HIGH) Daniel redeploys `dispatch-queue --no-verify-jwt` at convenience (workaround migration is benign); R1 (MEDIUM) `M4_STATUS_EVENTS_ATOMIC_CLAIM` future SPEC stub to eliminate consumer's duplicate-dispatch race for `send_message` action_type; Integration Ceremony deferrals (GLOBAL_MAP + GLOBAL_SCHEMA + MODULE_MAP + MASTER_ROADMAP append at next M4 strategic session); 4 skill improvements queued (2 author + 2 executor) in FOREMAN_REVIEW §7+§8 — applied via `chore(skills):` commit at next opticup-strategic session. **Strategic state:** EV-001 closed. Check-in SMS automation now operationally correct on demo + Prizma — next live event-day attendee transition to `attended` will fire the migrated rules. Generic framework operational; future M7/M8/M9 status entities plug in via 1 INSERT into registry + a one-line DB trigger, zero engine code change. → Full detail: `modules/Module 4 - CRM/docs/specs/STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md`. |
| 29 | 2026-05-12 | EV-001 framework decision — DB-trigger + central queue + parallel SMS/Email | Architect-Daniel decided 2026-05-12 evening: (a) status-change triggers framework MUST use DB triggers writing to a central queue (`crm_status_change_events`) that automation-engine consumes — NOT code-level `AutomationClient.evaluate()` calls from each module's call-sites. Reason: closes 3 weaknesses of pure-code-call (forgotten call sites, retry-on-failure, M4 transient unavailability); matches Stripe/Shopify/Salesforce industry pattern; preserves Iron Rule 16 (modules own their triggers, M4 owns the consumer); enables future repo split per Module Repo Split decision. (b) Each module **owns its DB trigger DDL** on its own status-bearing table; M4 owns the consumer + the central queue + the mapping registry. (c) When a template is configured for SMS+Email AND recipient has both phone + email → both queue rows inserted in the same transaction with identical `scheduled_for`. Recipient missing one channel → silent skip on that channel (matches current behavior). (d) This SPEC wires **attendee only**; framework is entity-agnostic but sale/payment/inventory consumers not yet wired (M7/M8/M9 don't exist). **Brief authored:** `modules/Module 4 - CRM/architecture-brief/STATUS_CHANGE_TRIGGERS_FRAMEWORK_BRIEF.md`. **Activation prompt:** `modules/Module 4 - CRM/architecture-brief/STATUS_CHANGE_TRIGGERS_FRAMEWORK_ACTIVATION_PROMPT.md`. Hand-off to M4 Module Strategist (`opticup-strategic`) for SPEC authoring via Full-Auto Pipeline. EV-001 in `roles/campaign-overseer/OPEN_EVENTS_TICKETS.md` marked HANDED-OFF. |
| 35 | 2026-05-19 | **Skill-improvement harvest — 4 patterns codified into opticup-architect + opticup-executor SKILL.md** | After today's 4-SPEC M4 cohort (M4_PIXEL_VALIDATION_GAP_DASHBOARD + M4_FB_CAPI_PURCHASE_EVENTS + M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX + M4_TEMPLATE_VALIDATION_UI_LINT), 4 recurring proposal patterns crossed the 2- or 3-strike threshold and were promoted into the skills via Light Pipeline `SKILL_IMPROVEMENT_HARVEST_2026_05_19`. Pattern A (DB state probe at SPEC author time) → `opticup-architect/SKILL.md` Step 0.7 + `opticup-executor/SKILL.md` Step 1.5.6. Pattern B (line-budget header buffer) → architect Step 0.8. Pattern C (SECURITY DEFINER rehearsal) → executor Step 1.5.7. Pattern D (Activation Prompts contradicting user memory; Daniel re-asked 3× in 7 days for English-only status lines) → architect Step 0.9 with SPECIFIC PROHIBITION on Hebrew-status-line instructions. 4 Executor commits, 3 doc files modified, 0 destructive ops, 0 escalations. |
| 37 | 2026-05-22 | **SuperSale catalog badges + ICONIC tile + event-register Quiet Gold redesign + multi-layer ghost-page hunt; P43-P46 added to SKILL** | Continuation session. (1) Catalog: per-tile badges -> "התחייבות למחיר הזול בישראל* / *למותגים נבחרים | בכפוף לתקנון" (closed Gap 3); bottom whitelist block simplified to positive-only single-row 22 brands; Tile 4 got ICONIC badge + full Premium visual weight; boutique subtitle reworded. Daniel re-corrected Tier 4 a 4th time (uniform price, publishing constraint only -> Pattern C/P40 reinforced). (2) event-register form redesigned to Quiet Gold (Sketch 2, style-only, real submit verified, merged PR #26). (3) **Ghost-page saga -- /supersale-models-prices/ lived in 4 layers:** duplicate DB row + a v_storefront_pages VIEW bug (filtered only status=published, ignored is_deleted -- real infra bug, fixed) + a WordPress-scrape JSON shadow in landing-pages-content.json (fixed PR #27) + CDN cache. **4 deploy/state mishaps -> 4 systemic lessons:** P43 (Cowork unreliable for live state -- 3 false readings in one day: phantom null-bytes, unpushed-commit-shown-as-pushed, cached WebFetch; verify against Vercel/GitHub/Supabase MCP, never Cowork mount). P44 (commit!=push!=deployed -- TWO unpushed-commit incidents; every Brief ends with 'push + verify deployment READY'). P45 (a 'deleted' thing can live in N layers -- enumerate DB row/view WHERE/JSON fallback/dist/CDN; Studio archive only kills the DB row). P46 (skill-file drift -- 3 divergent physical copies; edit canonical opticup/.claude/skills/ copy + flag consolidation SPEC). **Open follow-ups:** systemic ghost-audit SPEC; ERP-side GDPR CRITICAL M4_FB_CAPI_SUPPRESSION_GATE (fb-capi-dispatch sends opt-out contacts to Meta -- found by an unrelated Suppression-List Pipeline run); takanon attorney review still pending; skill-copy consolidation. -> Full detail: campaigns/supersale/CAMPAIGN_DECISIONS_LOG.md (Patterns A-J). |
| 36 | 2026-05-19 | **SuperSale Catalog Refinement Session — full day + Campaign Decisions Log created + P40/P41 added to SKILL** | All-day live-editing session on `/supersalepricescatalog/` after the funnel investigation closed. Shipped 6 catalog refinements via direct Supabase MCP UPDATEs to `storefront_pages` row `2a02a75f-a773-4b33-a9eb-23207f36fed0` (no SQL migration file authored — micro-iteration mode). Final state: 4-tier price grid with Tier 4 ICONIC badge (premium visual weight), Jimmy Choo moved Tier 4 → Tier 2, capacity block redesigned (no "50" number, gold-on-charcoal), per-tile commitment badges to takanon, bottom whitelist disclosure block (22 brands), Boutique Club restructured to 7 Japanese/European luxury brands with new marketing subtitle "הצעות בלעדיות לנרשמי האירוע". **Takanon edit:** Surgical 2-section edit — §5.7.ד blacklist → whitelist (22 brands) + new §5.7.ה (Tier 4 special handling) + date stamp update. ALL other §5 sub-clauses preserved (the Challenge / 14-day guarantee / free-glasses fallback are load-bearing for `/supersale/` page). **3 mistakes Daniel corrected in real-time (now P40):** I repeatedly assumed Tier 4 (Gucci/Dior/etc.) had a "different mechanism" because their prices aren't published. Daniel: "It's a publishing constraint, not a pricing constraint. Same event price as the other tiers — just can't publish it." **Lesson: When user describes a constraint, default to 'cosmetic/publishing restriction' not 'behavioral difference' unless explicitly told otherwise.** **NEW pattern P40 added** (anti-extrapolation rule). **NEW pattern P41 added** (legal docs = surgical edits, not full rewrites — based on Daniel's correction when the legal research subagent's "clean §5.1–§5.8 rewrite" would have silently deleted the Challenge mechanism). **NEW file created:** `campaigns/supersale/CAMPAIGN_DECISIONS_LOG.md` (169 lines) — campaign-specific decisions log with 6 patterns documented (Patterns A-F). **Bootstrap update:** Architect SKILL Step 4.2 now does CONDITIONAL LOAD of `campaigns/supersale/CAMPAIGN_DECISIONS_LOG.md` whenever any SuperSale/campaign keyword appears in user's opening message. Acknowledgment line is extended when this fires. **Open gaps (deferred):** (1) per-tile badge text still doesn't say "למותגים נבחרים" — Gap 3 from V3 still open; (2) attorney review still mandatory before merge to main; (3) the boutique block's new marketing subtitle removed the explicit "אינם כלולים בהתחייבות" disclosure — still legally defensible (disclosure exists in bottom whitelist block + takanon §5.7.ד), but raises the bar on attorney review. → Full detail: `campaigns/supersale/CAMPAIGN_DECISIONS_LOG.md`. |
| 34 | 2026-05-19 | **SuperSale Funnel Investigation Brief written + P39 added to SKILL** | Daniel raised that the last SuperSale event had fewer registrations than expected. First wrong reflex: I gave a direct recommendation (1,050 ₪ tile change, legal-sticker, header polish) before checking ground truth — Daniel corrected per Pattern P25 ("verify existing before recommending"). Second wrong reflex: I asked Daniel a Pipeline-mechanics question ("do you have a quantitative number or should I let the Pipeline fetch it?") — Daniel corrected per a NEW pattern (P39): never ask Daniel for data the Pipeline can fetch itself, no matter how strategic the framing sounds. **Outcome:** wrote `campaigns/supersale/investigation-briefs/SUPERSALE_FUNNEL_INVESTIGATION_2026_05_19_BRIEF.md` (read-only, NO destructive operations, investigation only — 4 live pages + automated messages + last-event conversion data + brand restrictions + takanon coverage + documentation-drift check) + sibling Activation Prompt. Pipeline produces `FINDINGS.md` + `RECOMMENDATIONS.md` for Daniel approval before any change SPEC. **Skill update:** P39 added — "NEVER ask Daniel for data the Pipeline can fetch itself." Self-check before sending any question to Daniel: "Could a sub-agent answer this in 2 minutes?" If yes → write it into the Brief, not the chat. |
| 33 | 2026-05-17 | **2-strike harvest: Step 1.6 + 1.7 added to opticup-strategic SKILL** | 2 consecutive M1 SPECs (`M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION` 2026-05-17 morning + `M1_FOUNDATION_CLOSE_CLEANUP_2026_05_17` 2026-05-17 evening) hit the same author-side defect class — literal paths in SPEC §3/§4/§5 referenced `modules/inventory/` instead of correct `modules/lens-inventory/`. Each one caused an executor retry cycle (Rule-32 hook caught at commit time, ~15 min recovery each). **Promoted from "lesson noted" to "hard rule" via early-promotion at 2-strike** (3-strike rule's normal threshold relaxed because the cost is fixed-per-occurrence and the prevention is 30 seconds). Two new mandatory steps added to opticup-strategic SKILL.md: **Step 1.6 — Pre-Seal Path Verification** (`Test-Path`/`ls` every literal path in SPEC before sealing; explicit allowlist of sections to scan: §3 verification commands, §4 destructive-ops, §7 out-of-scope, §9 commit plan, §11 coordination, §13 lessons; non-overridable per Pattern P31 "infrastructure not culture"); **Step 1.7 — Embedded Pre-Flight Grep for Consumer Counts** (when SPEC §5 asserts "only N consumers", §6 MUST contain the exact grep/Select-String command — 1-strike empirical from M1_FOUNDATION_CLOSE_CLEANUP §5 "only 1 consumer" while actual was 2, executor hand-wrote the grep ad-hoc, halted correctly). Source: `modules/Module 1 - Inventory Management/docs/specs/M1_FOUNDATION_CLOSE_CLEANUP_2026_05_17/FOREMAN_REVIEW.md` §6 A-1 + A-2. Strategic flag: applied BEFORE Groups A/B/C SPEC authoring because Group SPECs reference more sibling-module paths than any prior SPEC. → Patch SPEC folder: `modules/Module 1.5 - Shared Components/docs/specs/OPTICUP_STRATEGIC_PRE_SEAL_PATH_CHECK/`. |
| 32 | 2026-05-15 | STOREFRONT_PUBLIC_DATA_LAYER closed + merged to main — foundational architectural shift | Architect-Daniel decision sealed 2026-05-15 afternoon (Brief authored) and executed via Full-Auto Pipeline same evening (8 commits, merged to main as **5th merge of the day**). **Strategic shift:** retired SECURITY_HOTFIX_4 stub (procedural-discipline plan — extend RLS + GRANT anon on 5 private base tables; every future column on `inventory` etc. would require manual GRANT review = culture, not infrastructure per Pattern P31) and replaced it with **Pattern A mirror-table architecture**: 6 mirror tables (`branches_public`, `storefront_config_public`, `media_public`, `brands_public`, `inventory_images_public`, `inventory_public`) + 9 trigger functions + 18 RLS policies + 6 anon GRANTs + 8 v_storefront_* views rewritten + 7 REVOKEs. Anon SELECT mechanically sealed on 6 private base tables + v_crm_lead_first_touch. **F-CRIT-2 advisor 8 → 0 (clean closure, no allowlist).** v_storefront_products latency 480ms → 44ms (10.8× speedup) — cached AI columns + image_paths array eliminated 3×1133 subquery loops + image-aggregation hotspot. Cross-tenant leak probes STT-11 = 0/0 both directions. Trigger E2E 26/26 PASS (vs 18 minimum). **Daniel directive that drove the shift:** "אני רוצה שזה יהיה בנוי בצורה המקצועית ביותר בלי פלסטרים ויהיה אפשר לשפר את התוכנה תמיד בלי צורך לחזור אחורה ולתקן דברים." When Daniel asked for the "no plasters" build, Architect's first recommendation was column-restricted GRANT (Option A in the dialog) — but after Daniel restated the "no return-to-fix" principle, Architect upgraded to mirror tables (Option C). **Pattern:** when Daniel asks for the architecturally-correct build with no time pressure, default to the SaaS-foundation choice even at 4-6× implementation cost. **Tenant-tier framing (locked this session):** the same layer serves both Standard tier (future shared-domain storefront for tenants without a custom domain) and Premium tier (Prizma today + future paid upgrades on custom domains). Layer is consumer-agnostic — doesn't know whether the caller is a custom-domain premium site, shared-domain standard site, M11 Supplier Portal, mobile app, or API client. RLS by tenant_id provides isolation. Foundation enables Standard-tier build with zero data-architecture work; M11 build inherits the pattern with a sibling `supplier_*_public` projection at M11 build time. **Three in-flight SPEC defects caught + corrected via Bounded Autonomy:** heading collision blocking Iron-Rule-32 hook; latitude/longitude/google_rating precision mismatch breaking CREATE OR REPLACE VIEW; v_storefront_brands row-count drift from EXISTS-filter mismatch (fixed via brands_public.has_sellable_inventory cache + 3rd satellite trigger). The brands_public cached-aggregate-column pattern is a reusable tactic for Standard-tier + M11 — documented as follow-up SPEC `BRAND_VISIBILITY_CASCADE` (queued in OPEN_TASKS task 0c). **8 findings logged → 2 follow-up SPECs queued in OPEN_TASKS:** 0c BRAND_VISIBILITY_CASCADE (MEDIUM, ~2-3h: document cached-aggregate pattern in PUBLIC_DATA_LAYER.md + E2E for brand visibility cascade + optional pg_cron reconciler) + 0d FUNCTION_REVOKES (HIGH if new legacy carry-over found, ~1-2h: defensive sweep on pg_proc for anon EXECUTE on SECDEF). **4 skill improvement proposals queued** (2 author + 2 executor, apply at next strategic touch): P-AUTHOR-1 — view-fan-out probe mandatory whenever Brief declares "N base tables" (this Brief said 5, reality was 8 — caught at SPEC §1.5.2 minutes before seal; lesson: Brief writers even at Architect tier miss satellite dependencies; HOTFIX_2 P-AUTHOR-2 covered it at SECDEF-function level but not at view-dependency-graph level); P-AUTHOR-2 — `## 1.5 Pre-flight findings` as standard section in SPEC_TEMPLATE.md for any SPEC whose Brief mandates a pre-flight (Foreman currently invents the section location each time); P-EXEC-1 — `tests/smoke/<SPEC>_trigger_e2e.sql` as convention + reference template for Pattern A SPECs with triggers (this SPEC required 18+ test cases — 6 tables × 3 ops INSERT/UPDATE/DELETE — without template, Executor hand-writes them and likely misses edge cases like UPDATE-to-invisible); P-EXEC-2 — base-table RLS probe BEFORE flipping `security_invoker=on` enforced as pre-commit gate (new `scripts/checks/security-invoker-cascade.mjs`) — turning the SKILL bullet into infrastructure per Pattern P31 (HOTFIX_2 P-EXEC-1 added probe as bullet; this elevates to gate). **Pipeline session notes (for next-session learning):** Architect session ran on Opus; encountered 3 API Usage Policy refusals during the long-context phase — root cause: long context + heavy SQL-security vocabulary combinatorics (GRANT/REVOKE/DROP/ALTER POLICY + JWT + anon all in one window) triggered false-positive content filters. **Mitigation for future similar SPECs:** spawn Executor on Sonnet (`claude-sonnet-4-20250514`) rather than Opus for SECDEF-heavy + SQL-heavy Pipeline runs; Sonnet has lower false-positive rate on heavy-SQL-security content + faster + cheaper, and Executor work is mechanical not deep-reasoning. **Lesson candidate for next skill harvest:** add "model selection guidance" section to opticup-architect SKILL.md — Opus for Brief authoring + strategy, Sonnet for Executor work on SQL-security-heavy SPECs. Full retrospective: `modules/Module 1.5 - Shared Components/docs/specs/STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15/`. Canonical reference: `docs/PUBLIC_DATA_LAYER.md`. Replaces HOTFIX_4 stub (now retired in `architecture-brief/SECURITY_HOTFIX_4_BRIEF.md` with replacement note pointing to STOREFRONT_PUBLIC_DATA_LAYER_BRIEF.md). **Final security state for the day:** F-CRIT-1 100% closed; F-CRIT-2 17→0 over 3 SPECs (HOTFIX_2 closed 2; HOTFIX_3 closed 7; STOREFRONT_PUBLIC_DATA_LAYER closed 8); F-CRIT-3 42→2 (anon-by-design: `validate_slug` + `verify_campaign_page_password`). → Full detail: `modules/Module 1.5 - Shared Components/docs/specs/STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15/FOREMAN_REVIEW.md`. |
| 28 | 2026-05-12 | Migration #4 (Storefront Studio + 3 sub-pages) closed — **ALL 4 PRODUCTION-PAGE MIGRATIONS COMPLETE ON DEVELOP. BATCH AWAITING DANIEL MAIN-MERGE** | `MIGRATION_4_STOREFRONT_STUDIO` Full-Auto Pipeline ran end-to-end in ONE chat across all 5 hats. **Final** of the 4-migration production batch. **§0 Pre-flight reduced scope from 7 candidate `storefront-*.html` files to 4 in-scope HTML files** (blog/content/landing-content/studio). 3 files (glossary/products/settings) verified scope-clean — already token-driven Slate-modern via `var(--primary)` = `#0f172a` (Daniel decision 2026-05-10), only semantic + neutral hex present. Brief's primary purple-swap map (`#534AB7`, `#26215C`, `#EEEDFE`, `#7F77DD`) was VACUOUS across all 7 files — pre-flight saved the SPEC from shipping with vacuously-true success criteria. **13 swap sites across 4 files:** Block A `replace_all` consumed `background: linear-gradient(135deg, #6366f1, #8b5cf6)` → `background: #1e3a8a` at 3 sites in blog + 1 in content + 1 in landing-content (first cross-file Block A application). content additional `.progress-bar-fill` 90deg variant. studio 7 gold-to-Navy sites incl. WCAG-AA contrast fix (`.btn-create` color `#1a1a1a` → `#ffffff`; toolbar inline `color:#000` → `color:#fff`). Preserved: `.lang-pill` family (`.lang-he`/`.lang-en`/`.lang-ru` — coherent category markers), Google SERP literal brand colors (`#1a0dab`, `#006621`), all semantic hex, all neutral grays. **No CSS files exist** for storefront-* pages (verified pre-flight). `shared/css/variables.css` untouched (Navy tokens added by Migration #1, idempotent). **Verification:** 17/18 SPEC §5 criteria GREEN (C4 Foreman-amended off-by-one for studio Navy literal count — work matches §3 exhaustively; SPEC author counted 7 swap sites without categorizing by produced-token-form); all 7 storefront-*.html pages return HTTP 200; smoke 7/7 PASS on demo; integrity exit 0; page-scope confined (inventory.html has 0 Navy, scope-clean storefront-glossary has 0 Navy). **Localhost-Tester GREEN** on HTTP + payload + smoke + page-scope confinement (v1 boundary; iframe-render verification deferred to v2). 4 pre-commit tags `pre-migration-storefront-{blog,content,landing-content,studio}` all at `eace1b5`. 5 commits: C1 `5648b39` (blog) + C2 `6a41700` (content) + C3 `08b61c3` (landing-content) + C4 `2cf5cc8` (studio) + C5 retrospective. **5 in-flight decisions resolved per Bounded Autonomy:** D1 SPEC C4 off-by-one continue (logged as Finding F2), D2 leave pre-existing dirt alone, D3 do NOT migrate stranded rgba (logged as Finding F1 + Proposals #1), D4 WCAG-AA contrast flip, D5 keep `.lang-pill` family. **4 skill improvements applied:** opticup-strategic Author #1 — color-form completeness check in §0 (catch rgba-decimal alongside #hex); Author #2 — multi-form count discipline in §5 success criteria (per-output-token-form sub-counts). opticup-executor #1 — extend pre-execution hex audit to include rgba/rgb decimal form; #2 — canonical single-file post-edit verification recipe (6-line Bash, stopgap until `verify-reskin-page.mjs` ships). **4 findings opened, all dispositioned:** F1 (LOW) → future SPEC `MIGRATION_4_STRANDED_RGBA_SWEEP` for single-site indigo rgba at blog:101; F2 (INFO) → Foreman-amended in FOREMAN_REVIEW; F3 (INFO) → TECH_DEBT EOF newline; F4 (INFO) → dismissed. **Strategic state:** ALL 4 production migrations (Suppliers Debt, Settings+Permissions, CRM, Storefront Studio) now closed on develop. Pipeline battle-tested on 5 SPECs (#1, #2, Consolidation, #3, #4). Awaiting Daniel: main-merge approval for the batch. → Full detail: [`decisions/CROSS.md`](decisions/CROSS.md) entry 2026-05-12 (MIGRATION_4_STOREFRONT_STUDIO). |
| 27 | 2026-05-12 | Migration #3 (CRM) closed — 3rd of 4 production-page migrations to Hybrid+Navy on develop | `MIGRATION_3_CRM` Full-Auto Pipeline ran end-to-end in ONE chat across all 5 hats (Foreman → Executor → Reviewer → Localhost-Tester → Foreman-Review). **Accent insertion, not full re-skin** — CRM was already on a modern Slate palette (Slate 900 body + Slate-toned dark sidebar) so this SPEC inserts Navy `#1e3a8a` on primary actions, focus rings, view-toggle, sidebar active marker, theme-dot, loading spinner. Slate 900 stays as primary text. Sidebar dark theme preserved. **Shape divergence from Migration #1+#2** (caught at §0 Reality Check): CRM's accent-bearing elements are inline Tailwind utility classes in `crm.html` (`indigo-*`), not CSS rules — the page-scope `<style>` override pattern (Migration #1/#2 vehicle) was the wrong tool. **New pattern validated:** swap inline Tailwind utility classes to arbitrary values (`bg-[#1e3a8a]`, `focus:ring-[#1e3a8a]`) — first-class Tailwind v3 JIT, avoids `!important` specificity wars with `important:true` config, preserves DOM count + line count (`crm.html` unchanged at 419 lines). Files: `crm.html` (8 token sites = 6 indigo-* lines + theme-dot inline style), `css/crm.css` (3 palette token swaps + sidebar Navy box-shadow marker + comment refresh), `css/crm-components.css` (additive `.crm-badge-primary` Navy variant). `crm-screens.css` + `crm-visual.css` untouched (post-B8 stubs — F1 future-SPEC). `shared/css/variables.css` untouched (Navy tokens added by Migration #1, idempotent). **Verification:** 18/18 SPEC §3 criteria GREEN; 75 `<script>` + 12 `<link>` preserved; 0 `indigo-*` remaining (was 6); 0 legacy purple anywhere; smoke 7/7 PASS on demo; integrity exit 0; page-scope confined (inventory.html has 0 Navy hits). **Localhost-Tester GREEN** on HTTP + smoke + page-scope confinement (v1 boundary). 2 commits (C1 `1176a89` migration + C2 retrospective). Pre-commit tag `pre-migration-crm` on `0dfa6b9`. **Two in-flight deviations (both author-skill defects, resolved within chat):** D1 — `## 6.5. Destructive Operations` heading blocked C1 hook for ~20s (Iron-Rule-32 regex accepts only `\d+\.` or plain), fixed by removing prefix; D2 — post-edit grep caught legacy hex inside the new doc comment, removed. **4 skill improvements applied:** opticup-strategic Author #1 — no fractional section numbers in SPEC headings (SPEC_TEMPLATE.md heading swapped + SKILL.md sentence added); Author #2 — pre-existing-untracked-files leave-alone checkbox in §0 (4th SPEC in a row codifies the pattern). opticup-executor #1 — Tailwind utility-class swap pattern (arbitrary values over !important overrides) in SKILL.md "Visual re-skin patterns"; #2 — pre-execution heading-regex check on SPEC headings catches `## N.N.` / `## §N.` defects at SPEC-load time, not commit time. **3 findings opened, all dispositioned:** F1 (LOW) → future SPEC `M1_5_CRM_CSS_STUB_CLEANUP` for the 2 post-B8 stub CSS files; F2+F3 → TECH_DEBT (orphan Tailwind config tokens + RTL-physical sidebar marker). 3 of 4 production migrations now closed on develop; next: Migration #4 (Storefront Studio). → Full detail: [`decisions/CROSS.md`](decisions/CROSS.md) entry 2026-05-12 (MIGRATION_3_CRM). |
| 25 | 2026-05-12 | Settings + Permissions Consolidation closed — tabbed settings.html, employees.html archived | `SETTINGS_PERMISSIONS_CONSOLIDATION` Full-Auto Pipeline ran end-to-end in ONE chat across all 4 hats. Tactical migration that executed the structural change Migration #2 deferred (Daniel decision 2026-05-11). `employees.html` (former standalone permissions page) merged into `settings.html` as the "הרשאות" tab; original `git mv`'d to `_archive/pre-consolidation/employees.html` (100% rename similarity). Single LIVE in-code link updated (`index.html` line 156: `url: 'employees.html'` → `url: 'settings.html#permissions'`). New `urlWithTenant(u)` helper in index.html keeps `?t=...` BEFORE `#fragment` (URL builder hash-aware). `scripts/checks/root-allowlist.json` cleaned. **Iron Rule 21 reuse confirmed at SPEC author time** — existing `showTab()` from `js/shared-ui.js` reused (no `activateTab`/`switchTab` invented), existing `<nav id="mainNav">` + `data-tab-permission` pattern reused (matches inventory.html), existing PermissionUI auto-gating reused. New code added: 25-line page-local `goSettingsTab()` wrapper (hash routing + lazy permissions init) + 5-line `urlWithTenant()`. settings.html 212 → 292 lines (+80 additive). Page entry permission widened to "settings.view OR employees.view"; PermissionUI auto-hides whichever tab the user lacks. **Verification:** 20 of 20 SPEC §3 success criteria GREEN; `grep -r "employees.html" --include='*.html' --include='*.js' --include='*.sql' --exclude-dir=_archive --exclude-dir=.git .` → **0** LIVE references; `GET /employees.html` → 404, `GET /_archive/pre-consolidation/employees.html` → 200; smoke 7/7 PASS; integrity exit 0; pre-commit safety tag `pre-consolidation-settings-permissions` placed BEFORE any edit. **Localhost-Tester GREEN** on 18 HTTP+payload checks (v1 boundary; runtime DOM/JS deferred to v2 Playwright). 4 commits (C1–C4), 6 files in C1–C3 + retro/master-doc updates in C4. **4 skill improvements applied:** opticup-strategic Author #1 — link-vs-comment distinction in sweep-criteria phrasing; Author #2 — pre-existing-untracked-files checkbox in §0 Reality Check (3rd consecutive D1 makes it a pattern). opticup-executor #1 — tombstone-comment pattern (avoid literal dead-path strings in narrative comments); #2 — "SPA tab page" reference snippet (3 pages now use the `<nav id="mainNav">` + `<section class="tab">` + `showTab()` pattern; CRM Migration #3 may need it). 4 findings opened, all dispositioned (F1–F4 dismiss/defer; F3 reaffirms MIGRATION_2 F1, updates `M1_5_DEDUPLICATE_SETTINGS_EMPLOYEES_CSS` future-SPEC scope to include removing `css/employees.css` `<link>` from settings.html). 3 of 4 production migrations + 1 consolidation now closed on develop; **next: CRM Migration #3**. |

---

## M1 — Inventory Expansion (Lens / Contact Lens / Accessories)

→ Full detail: [`decisions/M1.md`](decisions/M1.md)

| # | Date | Topic | One-liner |
|---|---|---|---|
| 1 | 2026-05-12 | Lens Inventory schema sealed | 18 tables, FIFO, 1:1 brand-supplier, 3 adversarial review rounds. |
| 2 | 2026-05-14 | Mockup review — 11 decisions, 3 new screens, 7 schema deltas | Stock/custom flag on supplier_catalog_offering; tiered discount; inline+bulk pricing; manual-send PO; 3 new screens; reconciliation schema; debt at receipt-time. |
| 3 | 2026-05-14 | M1 ↔ M9 overlap investigation — verdict PROCEED-WITH-M1-AS-IS | 0 genuine overlaps, 5 clean hand-offs. 2 FK schema deltas + 5 contract declarations (K1-K5) added to M1 decisions. 1 mockup tweak applied (Goods Receipt v3 — M9 box linkage + status hint correction). Report: `modules/Module 1 - Inventory Management/architecture-brief/M1_M9_OVERLAP_REPORT.md`. |

---

## M5 — Customers

→ Full detail: [`decisions/M5.md`](decisions/M5.md)

| # | Date | Topic | One-liner |
|---|---|---|---|
| 1 | 2026-05-06 | Pivot from M5-only cutover to all-modules-then-bigbang | Strategic redirection — single big-bang vs phased. |
| 2 | 2026-05-06 | `cust_listb` migration scope | Confirmed: don't migrate (campaign leads, not customers). |
| 3 | 2026-05-06 | Migration scope: only customers with ≥1 order | 20,900 → 5,028 customers (76% reduction). |
| 4 | 2026-05-06 | Languages day-1: HE+RU+EN, ES later | Per Q15 launch decision. |
| 5 | 2026-05-06 | Asked field-level questions on data already in audit | Lesson P18 — Brief is structure, audit is fields. |
| 6 | 2026-05-06 | Consent model: 4 independent flags + active-only re-subscription | Predecessor to per-channel consent (M12 evolved this). |
| 7 | 2026-05-06 | MAJOR: Lead↔Customer boundary collapsed | Single entity with `lifecycle_stage` — Pattern P21 born. |
| 8 | 2026-05-06 | M5 households: skeleton entity, optional FK | Pattern P17 — foundation-first. |
| 9 | 2026-05-06 | M5 entity split: customer vs loyalty_member | Two-entity decision (loyalty member is separate concept). |
| 10 | 2026-05-07 | M5 Customer Card screen (5 tabs design) | Eye Care merged glasses+contacts; "Update" tab removed. |
| 11 | 2026-05-07 | M5 Customer Card revision | Queue + tab renames + Prescriptions module separation. |
| 12 | 2026-05-07 | M5 customers-list: 3 sketches → Split Workspace approved | Layout decision. |
| 13 | 2026-05-07 | M5 customers-list: Activity-first columns + tenant-config | Per-tenant column set + dual-mode search. |
| 14 | 2026-05-07 | M5 customers-list: row-click + actions + sort/density | Composite client number. |
| 15 | 2026-05-14 | **Module Close Ceremony — M5 (backlog batch)** | Brief sealed 2026-05-07. 14 decisions reviewed. P21 (lifecycle_stage collapse) + P18 (audit-is-fields-brief-is-structure) originated here. Contributed to 3-strike promotion of **P40** (configurable-per-tenant default). Lesson promoted: composite-identifier display-vs-storage distinction is reusable for any future "smart number" UX (M7 order_number, M13 loyalty_card_number). No 3-strike single-module-only candidate. |

---

## M6 — Prescriptions / Eye Exams

→ Full detail: [`decisions/M6.md`](decisions/M6.md)

| # | Date | Topic | One-liner |
|---|---|---|---|
| 1 | 2026-05-06 | M6 state-machines: explicit, not boolean | Cross-module pattern — state enum > boolean. |
| 2 | 2026-05-06 | M6 prescription_glasses vs prescription_contacts | TWO entities, not one with discriminator. |
| 3 | 2026-05-06 | M6 split: eye_exams (act) vs prescriptions (output) | Separate entities — different lifecycles. |
| 4 | 2026-05-14 | **Module Close Ceremony — M6 (backlog batch)** | Brief sealed 2026-05-06. 3 entity-architecture decisions reviewed. P19 (config-table-not-enum) + P20 (no-tech-detail-in-chat) originated here. Lesson promoted: "two-entity-for-disjoint-fields default" pattern (M6 glasses vs contacts) — applies to any future entity where field overlap < 30%. No 3-strike single-module candidate. |

---

## M7 — Orders

→ Full detail: [`decisions/M7.md`](decisions/M7.md)

| # | Date | Topic | One-liner |
|---|---|---|---|
| 1 | 2026-05-07 | M7 messaging flow + sub-order ID format | Three-table model (orders / sub_orders / sub_order_items). |
| 2 | 2026-05-07 | "Thanks" is order-level, not sub-order-level | Daniel correction. |
| 3 | 2026-05-07 | M7 print forms protocol + Outside Framing | Form #1 of 5. |
| 4 | 2026-05-07 | M7 Form #2: Order Inspection | Internal lab basket form; tear-off receipt removed (cashier territory). |
| 5 | 2026-05-07 | M7 Form #3: Frame Reservation | Reservation = state on sub-order, not new type. Inventory deducts immediately. |
| 6 | 2026-05-07 | M7 Form #4: Task Form | Per sub-order; 3 signers; resolution block at bottom. |
| 7 | 2026-05-07 | M7 Form #5: Repair Form | `is_repair=true` flag; Internal+Outside print modes. |
| 8 | 2026-05-07 | M7 forms consistency pass + 5 fixes | Locked: 4 sub-order types only; 7-day reservation default; manual convert-to-order. |
| 9 | 2026-05-07 | M7 Architecture Brief CLOSED | 17 locked decisions; 3-table model. |
| 10 | 2026-05-11 | M7 V7 sketch selected: Variant A locked as canonical | Daniel chose two-pane + sticky tools strip; V6 + 2 sibling variants archived. |
| 11 | 2026-05-14 | **Module Close Ceremony — M7 (backlog batch)** | Brief sealed 2026-05-07 (17 decisions); V7 sketch locked 2026-05-11. P22 (STRICT 3-line chat format) originated here. Forms catalog + state-dependent button visibility + granularity-tier discipline = 3 reusable patterns. Contributed to 3-strike promotion of **P41** (manual-now-with-auto-twin-hook — M7 was the strongest example with 5 manual forms + future Comms-module auto-twin). |

---

## M8 — Payments

→ Full detail: [`decisions/M8.md`](decisions/M8.md)

| # | Date | Topic | One-liner |
|---|---|---|---|
| 1 | 2026-05-09 | M8 Architecture Brief CLOSED | 9+ locked: עוסק-מורשה, ERP-orchestrating-POS, Provider Adapter Pattern. |
| 2 | 2026-05-14 | **Module Close Ceremony — M8 (backlog batch)** | Brief sealed 2026-05-09 (17 locked: 11 Daniel design + 6 architectural). P23 (research-first via subagent for external integrations) reconfirmed here — 4 subagent dossiers caught critical wrong assumptions (tax status, Linet API, reverse-sync, legal). Provider Adapter Pattern (3-layer: code adapter / DB manifest / tenant config UI) is reusable for ANY future external-integration module (M9 lab APIs, M12 BSP rotation, future printers). Lesson promoted: "tax-status / legal-status assumption check FIRST" pattern — Daniel corrected my עוסק-פטור assumption mid-session. No new 3-strike pattern. |

---

## M11 — Reports

→ Full detail: [`decisions/M11.md`](decisions/M11.md)

| # | Date | Topic | One-liner |
|---|---|---|---|
| 1 | 2026-05-09 | M11 Architecture Brief CLOSED | 22 locked + 5 modularity reinforcements; view-layer not data-owner. |
| 2 | 2026-05-14 | **Module Close Ceremony — M11 (backlog batch)** | Brief sealed 2026-05-09 (22 locked + 5 modularity reinforcements). Contributed to 3-strike promotion of **P40** (configurable-per-tenant default — M11 categories + report-sets + visibility + column-overrides + filter expressions are ALL per-tenant). Pattern reinforced: "layer-not-owner" — M11 reads from other modules' Views, never owns business data; this is the canonical pattern for any future cross-module aggregation module (Finance Hub, Analytics Hub). Lesson promoted: "tenant-modified copy hides default + ↺ restore" UI pattern is reusable for any system-vs-tenant config table. No new 3-strike single-module pattern. |

---

## M12 — Communications

→ Full detail: [`decisions/M12.md`](decisions/M12.md)

| # | Date | Topic | One-liner |
|---|---|---|---|
| 1 | 2026-05-09 | WhatsApp BSP = 360dialog | Best price/feature for Israeli mid-volume multi-tenant. |
| 2 | 2026-05-09 | WhatsApp Coexistence Mode (Daniel correction) | Staff phone app + API in parallel. |
| 3 | 2026-05-09 | Number +972 53-434-7265 connection state audit | State D (WABA exists, never completed); Coexistence + WABA migration path. |
| 4 | 2026-05-09 | Edge Function direct → 360dialog (NOT through Make) | Two-way webhooks need direct DB access. |
| 5 | 2026-05-09 | SMS = GLOBAL SMS stays (Daniel correction) | Default = keep working vendor. |
| 6 | 2026-05-09 | Email = Gmail through Make stays (Daniel correction) | Defer Resend to post-LIVE. |
| 7 | 2026-05-09 | Channel architecture = `channel_configs` table | Per-tenant + per-module routing. |
| 8 | 2026-05-09 | Hybrid channel ownership (Daniel-originated) | Platform-default + tenant-override = SaaS-clean + revenue tier. |
| 9 | 2026-05-09 | WhatsApp Inbox + AI slot (Daniel-originated) | Day-1 build; AI = data fields + UI strip reserved. |
| 10 | 2026-05-09 | Inbox UX research (SmartSend + 6 leaders) | 3-pane RTL convergence. |
| 11 | 2026-05-09 | Tab pollution in customer-card mockup (Daniel correction) | Sketch the feature, not the host screen. |
| 12 | 2026-05-09 | Consent: 3 separate flags + audit log + transactional/marketing split | Legal hard requirement, not optional. |
| 13 | 2026-05-09 | DECISIONS_LOG documentation (Daniel-prompted self-correction) | Log in flight, not session-end. |
| 14 | 2026-05-09 | M12 Architecture Brief CLOSED | 15 locked decisions; 8 entities + 2 reserved for AI. |
| 15 | 2026-05-14 | **Module Close Ceremony — M12 (backlog batch)** | Brief sealed 2026-05-09. Note: a prior partial ceremony 2026-05-09 already promoted P24+P25+P26 from M12-derived patterns. This 2026-05-14 close formalizes the remaining lessons: M12's **fact-vs-rule split is the canonical architecture for cross-module rule engines** (M6 facts → M12 rules; future M9 production-events → M12 routing; future M8 payment-events → M12 confirmations). Contributed to 3-strike promotion of **P41** (manual-now-with-auto-twin-hook — M12 channel configs + templates are manual day-1; AI auto-fill slot reserved). No new 3-strike single-module candidate. |

---

## M13 — Loyalty Club

→ Full detail: [`decisions/M13.md`](decisions/M13.md)

| # | Date | Topic | One-liner |
|---|---|---|---|
| 1 | 2026-05-10 | M13 Architecture Brief sealed | 13 locked decisions, 5 sketches, 6 entities, 4 engines; D13 anti-Access-pattern was textbook. |
| 2 | 2026-05-10 | M13 Brief amendment surfaced (during M9 D24) | Add basic-free membership type — auto-created on first compensation/Referral. Pending Daniel update. |
| 3 | 2026-05-12 | M13 Brief Amendment CLOSED — D14 (basic-free tier) added | Docs-only Full-Auto Pipeline closed in ONE chat. Auto-enrolled, no-fee, credits-only tier with zero accrual, zero family-pool, zero engine pass. Upgrade preserves credit. Schema impact: none. Closes 2026-05-10 surfaced gap; M9 build SPEC will call `loyalty_ensure_basic_free_membership` RPC. |

---

## M9 — Lab/KDS

→ Full detail: [`decisions/M9.md`](decisions/M9.md)

| # | Date | Topic | One-liner |
|---|---|---|---|
| 1 | 2026-05-10 | Sub-agent research (P23) | 78 sources; optical-industry KDS standards; Israeli labs = manual integration only. |
| 2 | 2026-05-10 | Scope reframe: M9 = "McDonalds System" not shipping extension | Old "M9 extends shipments" decision OVERTURNED — major reframe. |
| 3 | 2026-05-10 | M1's old shipments module deprecated; absorbed into M9 | Single source of truth for all shipping/tracking. |
| 4 | 2026-05-10 | Two clocks: processing + pickup (separate metrics) | Processing has 3 thresholds (yellow/red/comp), pickup has 2 (yellow/red, no comp). |
| 5 | 2026-05-10 | Threshold = per-category, not per-flow | Daniel directive — flow is internal. |
| 6 | 2026-05-10 | M1 extension blocker surfaced | 3 inventory tables (lenses/contact-lenses/accessories) needed before M7/M9. |
| 7 | 2026-05-10 | KDS sketch C v2 chosen | Priority-split + sub-row drawer + 3 tabs. |
| 8 | 2026-05-10 | Shipping boxes — many-to-many in/out | Outbound box returns split across multiple inbound boxes. |
| 9 | 2026-05-10 | Incoming box = full entity, 3 types (return/stock/inter-branch) | Mid-discussion change from placeholder to full entity. |
| 10 | 2026-05-10 | Compensation matrix per (category × delay tier) + manager additive cap | Manager max-addition is additive over recommendation, not absolute (Daniel correction). |
| 11 | 2026-05-10 | Loyalty connection — basic-free membership auto-created on first compensation | M13 amendment pending. |
| 12 | 2026-05-10 | Settings sidebar v2 (8 active + 3 external links) | Sidebar pattern for config-heavy modules. |
| 13 | 2026-05-10 | M9 Architecture Brief sealed | 25 decisions, 8 entities, 5 engines, 4 sketch files. **Last Brief before LIVE.** |

---

## M14 — Appointments

→ Full detail: [`decisions/M14.md`](decisions/M14.md)

| # | Date | Topic | One-liner |
|---|---|---|---|
| 1 | 2026-05-07 | M14 Architecture Brief CLOSED | 26 locked decisions, 11 entities, 6 Views, 8 RPCs, 4 approved mockups. Public booking flow + dual-color appointments (type-fill + status-outline) + resource-level notifications. |
| 2 | 2026-05-14 | **Module Close Ceremony — M14 (backlog batch)** | Contributed to 3-strike promotion of **P40** (configurable-per-tenant default — M14 has 4 config tables: appointment_types + appointment_statuses system+tenant + cancellation_reasons + branch_hours_exceptions) and **P41** (manual-now-with-auto-twin — `send_notification` checkbox is manual gate for M12 future engine). Lesson promoted: **resource-level notifications** (each `resources` row has phone+email+`send_notifications` toggle) — resources are not just data containers, they are notification destinations. Generalizes to any future "assigned-to" entity (M9 stations, M7 lab technicians). Lesson promoted: **dual-axis visual encoding** (type-fill + status-outline) for any future entity with two orthogonal classifications. |

---

## M15 — Queue (Walk-in)

→ Full detail: [`decisions/M15.md`](decisions/M15.md)

| # | Date | Topic | One-liner |
|---|---|---|---|
| 1 | 2026-05-07 | M15 Architecture Brief CLOSED | 11 locked decisions; 4 states; UI = embedded panel inside M14 calendar, not separate screen. Pattern 14 (cross-module atomic state sync via RPC) introduced. Domain-neutral. |
| 2 | 2026-05-14 | **Module Close Ceremony — M15 (backlog batch)** | Contributed to 3-strike promotion of **P41** (manual-now-with-auto-twin — queue manual-add only day-1, auto-from-appointments deferred). **Pattern 14 — cross-module atomic state sync via RPC** introduced here as module-internal pattern (M15 ↔ M14 status sync); NOT promoted to a Pn yet — kept as Brief-internal pattern pending a second use case (M7 ↔ M8 lock-on-close documented in Brief §4.4). Re-evaluate promotion at first M7 build SPEC. Lesson promoted: **"embedded panel inside parent-module screen"** as a UX pattern for closely-related secondary modules (M15 inside M14 calendar) — better than separate screens when the two modules share a primary entity (here: appointment ↔ queue_entry). |

---

## 2026-05-17 — Cowork-Foreman push discipline + Closing-the-loop rule (REPO_CLEANUP follow-up)

**Situation:** Cowork-Architect wrote FOREMAN_REVIEW.md to outputs and emitted "🟢 SPEC closed" summary to Daniel before the FOREMAN_REVIEW commit existed in origin. Daniel had to manually identify the missing commit + push step. Root cause: skill Step 9 hand-off rule was ambiguous on "author vs land" — closure was treated as authoring complete, but the Pipeline definition of closed = origin contains the commit.

**My recommendation:** Codify two-phase closure (Phase A = author in Cowork outputs; Phase B = land in origin via Claude Code) into opticup-strategic SKILL.md. Strict format for Step 9 hand-off: Push instruction first (blocking), "🟢 closed" only after Daniel confirms push. Add "no closing summary before FOREMAN_REVIEW commit lands" to NEVER block. New ## Cowork Environment Constraints section with explicit Closing-the-loop discipline.

**Daniel's response:** Approved. Push commit 23ce2ea (54 insertions, 2 deletions) landed the 3 edits.

**Reason for agreement:** Cowork sessions cannot self-verify a push happened (no git writes from FUSE-bound sandbox); without explicit Phase B gate the Pipeline closes "blind" from Cowork's perspective. The cost of one extra Hebrew line ("חכה לאישור push") is trivial vs the cost of orphan artifacts on disk that never reach git history.

**Lesson (for Architect):** Closeout artifacts written from Cowork outputs are not yet "in the system" — they are FUSE-disk-only until Claude Code commits + pushes them. Treat every Pipeline closeout as a TWO-machine handoff, not a single Cowork action.

**Cross-references:**
- Commit: `23ce2ea` (chore(skills): enforce Cowork-Foreman push discipline)
- Activation prompt: `modules/Module 1.5 - Shared Components/docs/specs/COWORK_FOREMAN_PUSH_DISCIPLINE/ACTIVATION_PROMPT.md`
- Root-cause Pipeline: `modules/Module 1.5 - Shared Components/docs/specs/REPO_CLEANUP_2026_05_18/`

---

## 2026-05-17 — Abnormal-state triage gate: dispatch-first over investigate-first (REPO_CLEANUP root-cause)

**Situation:** Cowork-Architect spent ~60 min running multi-file probes inside Cowork VM at session start (2,340 phantom modifications + ghost `.git/index.lock` + FUSE inconsistencies) and authored a 297-line SPEC under Cowork-FUSE evidence. The desktop reality, when finally checked by the executor: 6 modifications, no ghost lock. ~95% of the investigation work was wasted because Cowork's FUSE mount cannot reliably mirror desktop git state at scale when the snapshot is stale.

**My recommendation:** Add Step 0.7 "Abnormal-state triage gate" to opticup-strategic SKILL.md First Action. After Step 0.5 detects no ghost lock, but BEFORE any other reads, count modifications. If > 50 modified-tracked entries (excluding untracked Cowork-authored output), STOP self-investigation immediately. Write a 50-line INVESTIGATION_BRIEF to outputs for Claude Code, then hand off in Hebrew. Do NOT probe a 20-file sample to "verify" the count first — the sample is just as susceptible to FUSE staleness as the bulk classification.

**Daniel's response:** Approved. Push commits 139fd44 + 7269a1a landed Step 0.7 (65 insertions) + the activation prompt provenance.

**Reason for agreement:** Cowork's strength is read + plan + strategic conversation — NOT bulk file-state classification. The right default for any session-start anomaly is dispatch to desktop, not investigate locally. The 5-second `git status | wc -l` triage costs nothing; the 60-minute alternative cost ~95% wasted work today.

**Lesson (for Architect):** Reframe Cowork's role at session start to "triage + dispatch, then strategic." The Architect's job is not to be the investigator-of-last-resort when the VM is showing anomalies — the Architect's job is to recognize the anomaly class, hand it to the right executor, and resume strategic work after the executor reports back. Self-investigation at scale on a FUSE mount = anti-pattern.

**Cross-references:**
- Commit: `139fd44` (chore(skills): add Step 0.7 Abnormal-state triage gate)
- Commit: `7269a1a` (docs(spec): preserve ARCHITECT_DISPATCH_FIRST_DISCIPLINE activation prompt for provenance)
- Activation prompt: `modules/Module 1.5 - Shared Components/docs/specs/ARCHITECT_DISPATCH_FIRST_DISCIPLINE/ACTIVATION_PROMPT.md`
- Root-cause Pipeline: `modules/Module 1.5 - Shared Components/docs/specs/REPO_CLEANUP_2026_05_18/` (Phase 5 governance edits in commit 7c93473)

---

## 2026-05-17 — Supervisor Skill Phase 1 sealed + Parallel Pipeline Coordination sealed

**Situation:** Daniel asked for an autonomous-team layer that resolves Pipeline escalations from DECISIONS_LOG history without his intervention, with reversibility on any change. Same day, a cross-Pipeline collision incident demonstrated the urgency of branch-coordination infrastructure.

**My recommendation:** Build Supervisor skill in 3 phases (Triage + Retry + Auto-Harvest). Start with Phase 1 (Triage only) in Shadow Mode for 3 days before granting Active autonomy. Build Parallel Pipeline Coordination as a separate single SPEC immediately to prevent recurrence of today's collision.

**Daniel's response:** Agreed both. Added 2 requirements to Supervisor learning loop: (a) Shadow Mode = 3 days side-by-side comparison (not just Supervisor logging alone); (b) Reverse-harvest — when Daniel chooses differently, Supervisor generates a proposal to update its own Adapter. Locked decision sources as: canonical files (DECISIONS_LOG + decisions/*.md + CLAUDE.md + MASTER_ROADMAP) at max confidence; auto-memory at confidence-cap 3 (hint source, never deciding).

**Reason for agreement:** Shadow Mode + Reverse-harvest converts the 3 days from "passive observation" into "active calibration data." Confidence cap on auto-memory prevents the Supervisor from acting on Daniel's casual preferences as if they were sealed decisions.

**Lesson (for Architect):** Build "learning loop" into the Brief itself, never as a follow-up phase. The taxonomy (4 mistake classes: A lookup-miss / B wrong-match / C novelty / D miscalibration) was the highest-value design decision — it lets the system distinguish "the Adapter is bad" from "Supervisor is mis-calibrated" from "this is a new decision Daniel needs to make." Routing matters more than logging.

**Cross-references:**
- Brief: `modules/Module 1.5 - Shared Components/architecture-brief/SUPERVISOR_SKILL_BRIEF.md`
- SPEC 1 retrospective: `modules/Module 1.5 - Shared Components/docs/specs/SUPERVISOR_SKILL_PHASE_1/FOREMAN_REVIEW.md`
- Coordination Brief: `modules/Module 1.5 - Shared Components/architecture-brief/PARALLEL_PIPELINE_COORDINATION_BRIEF.md`
- Coordination retrospective: `modules/Module 1.5 - Shared Components/docs/specs/PARALLEL_PIPELINE_COORDINATION/FOREMAN_REVIEW.md`

---

## Pattern Recurrence Tracker (3-strike rule)

When a pattern surfaces in 3 or more independent decisions across modules, formalize it as a `Pattern Pn` in `SKILL.md`. Patterns currently tracked:

| Pattern candidate | Instances seen | Status |
|---|---|---|
| **Don't flow with everything Daniel says** | M7 (Frame Reservation), M8 (settlement mode mid-correction), M12 (channel admin split correction) | ✅ 3 strikes — promoted to **P24** |
| **Verify existing vendor before recommending switch** | M8 (Linet vs Z Credit), M12 (SMS vs Inforu), M12 (Email vs Resend) | ✅ 3 strikes — promoted to **P25** |
| **Hybrid model > pure flexibility OR pure control** | M5 (active marketing consent), M8 (settlement mode tenant-config), M12 (channel ownership) | ✅ 3 strikes — promoted to **P26** |
| **Sketch the feature, not the host screen** | M5 (customer card), M12 (customer history mockup), Project Cleanup | ✅ 3 strikes — promoted to **P27** |
| **Executor pre-flight catches author blindspots** | Project Cleanup SPEC | ✅ 1 strike but transformational — promoted to **P28** |
| **Anti-Legacy-Pattern Check** | M13 D13 (family-credit code-passing), M9 D2 (overturning shipping extension) | ✅ promoted to **P32** |
| **Settings panel mandatory under Pattern P19** | M13 (4 configurable groups), M9 (8 active sidebar tabs) | ✅ promoted to **P33** |
| **Sketches BEFORE Brief** | M9 (4 sketch documents created before Brief; multiple iterations per Daniel feedback) | ✅ promoted to **P34** |
| **HTML sketch file format** | M9 (4 separate HTML files in architecture-brief folder) | ✅ promoted to **P35** |
| **computer:// links for files Daniel must open** | M9 (every sketch delivery used computer:// link) | ✅ promoted to **P36** |
| **Reframe scope → reopen previously-locked decisions** | M9 D2 (M9 reframe overturned year-old shipping-extension decision) | ✅ promoted to **P37** |
| **Settings sketch FIRST when config-heavy** | M9 (operational-first led to late surfacing of M1 ↔ M9 supplier sync question) | ✅ promoted to **P38** |
| **Manager max-addition is additive, not absolute** | M9 D9 (compensation matrix manager cap) | ✅ promoted to **P39** |
| **Configurable-per-tenant DEFAULT for UI layout / type / category / option lists** | M5 (customer-list density/columns/sub-line/row-actions), M11 (categories + report-set + visibility + column-overrides), M14 (statuses + cancellation_reasons + appointment_types + booking config) | ✅ 3 strikes — promoted to **P40** (2026-05-14 backlog batch) |
| **Manual-now-with-auto-twin-hook is the right shape for future-automatable actions** | M7 (5 print forms — manual + state-driven visibility), M12 (channel configs + templates manual, AI slot reserved), M14 (cancellation `send_notification` checkbox), M15 (queue manual-add only day-1) | ✅ 4 strikes — promoted to **P41** (2026-05-14 backlog batch) |
| **Cross-module atomic state sync via RPC (Pattern 14 internal)** | M15 D11 (queue_entry.status ↔ appointment.status); future M7↔M8 documented but not yet implemented | ⏸ Single instance + transformational; kept module-internal as "Pattern 14" pending a second use case (M7↔M8 lock-on-close). Re-evaluate at first M7 build SPEC. |
| **A1 — §0 MANDATORY Inner-call arity audit + Smoke-touched schema audit (opticup-strategic SPEC_TEMPLATE.md)** | M1A_OPERATIONS_RPCS_FIX FOREMAN_REVIEW Author Proposal #1 + #2 (2026-05-15 1st strike, applied optionally), M1B0_PURCHASE_ORDER_SCHEMA FOREMAN_REVIEW §6 Proposal 1 (2026-05-15 2nd strike, validated — caught D1/D2/D3 divergences) | ✅ 2-strikes — promoted to **SPEC_TEMPLATE.md §0** via M1_SKILL_IMPROVEMENT_HARVEST (2026-05-15) |
| **A2 — Concurrent-Pipeline awareness orthogonality envelope (opticup-strategic SPEC_TEMPLATE.md §12)** | M1B0_PURCHASE_ORDER_SCHEMA FOREMAN_REVIEW §6 Proposal 2 (2026-05-15 1st strike; M1B0 had 3 SECURITY_HOTFIX_2 commits interleave, scope-cleanness confirmed post-hoc) | ✅ 1-strike — bundled with A1/E1/E2 promoted to **SPEC_TEMPLATE.md §12** via M1_SKILL_IMPROVEMENT_HARVEST (2026-05-15). Early-promoted at 1-strike because pre-Phase-1B-foundation harvest seals skill state to avoid contaminating the next Pipeline. |
| **E1 — MIGRATION.md Applied Log convention for MCP-only SPECs (opticup-executor SKILL.md Step 2)** | M1A_OPERATIONS_RPCS_FIX FOREMAN_REVIEW Executor Proposal #1 (2026-05-15 1st strike, voluntarily adopted), M1B0_PURCHASE_ORDER_SCHEMA FOREMAN_REVIEW §7 Proposal 1 + EXECUTION_REPORT §9 (2026-05-15 2nd strike, validated working — solved the §10 commit-row-granularity problem for MCP-only commits) | ✅ 2-strikes — promoted to **opticup-executor SKILL.md §"SPEC Execution Protocol" Step 2** via M1_SKILL_IMPROVEMENT_HARVEST (2026-05-15) |
| **E2 — `scripts/audit/advisors-for-objects.mjs` CLI gate for post-DDL advisor verification (opticup-executor SKILL.md §"Verification After Changes")** | M1B0_PURCHASE_ORDER_SCHEMA FOREMAN_REVIEW §7 Proposal 2 + EXECUTION_REPORT §9 Proposal 2 (2026-05-15 1st strike; M1B0 used 100KB+ subagent grep against advisor JSON — heavy but workable) | ✅ 1-strike — bundled with A1/A2/E1 promoted to **scripts/audit/advisors-for-objects.mjs (new file) + opticup-executor SKILL.md §"Verification After Changes"** via M1_SKILL_IMPROVEMENT_HARVEST (2026-05-15). Early-promoted at 1-strike because (a) bundled with the harvest of A1/A2/E1, (b) advisor JSON grows linearly with project size — programmatic gate scales where subagent grep doesn't, (c) live-smoke confirmed M1B0's 8 objects clean (0 HIGH matches / 119 + 491 advisor entries scanned). |

---

## Module Close Ceremony — Mandatory Process

When a module's Architecture Brief is sealed:

1. Read the module's full `decisions/<MODULE>.md` file end-to-end.
2. Identify 1-2 lessons that should be promoted to `SKILL.md` (recurring patterns or major insights).
3. Update `SKILL.md` with the new patterns, dated, with link back to source decisions.
4. Update this index file with module-close summary line.
5. Verify the `Pattern Recurrence Tracker` table above — promote any 3-strike candidates.

**Last Module Close ceremonies performed:**
- **M12 — 2026-05-09** — promoted P24, P25, P26 to SKILL.md.
- **Project Structure Cleanup — 2026-05-09** — promoted P27 + P28 to SKILL.md.
- **MODULES_HOME_UNIFICATION — 2026-05-09** — promoted P29 + P30 to SKILL.md.
- **STRUCTURE_PROTECTIONS — 2026-05-09** — promoted P31 to SKILL.md.
- **M13 — 2026-05-10** — promoted P32 + P33 (pending merge: SKILL_PENDING_M13_CLOSE.md).
- **M9 — 2026-05-10** — promoted P34 + P35 + P36 + P37 + P38 + P39 (pending merge: SKILL_PENDING_M9_PATTERNS.md + SKILL_PENDING_M9_CLOSE.md).
- **M5 / M6 / M7 / M8 / M11 / M12 / M14 / M15 — 2026-05-14 (backlog batch close, OVERNIGHT_BUNDLE_2026_05_14 Tier D)** — 8 backlog Module Close ceremonies executed in one commit. Per-module lessons logged in `references/decisions/M{5,6,7,8,11,12,14,15}.md` Module-Close-Ceremony 2026-05-14 entries (M14 + M15 decisions files newly created). Two 3-strike patterns promoted to SKILL.md: P40 (configurable-per-tenant default for UI layout) + P41 (manual-now-with-auto-twin-hook). Pattern 14 (cross-module atomic state sync) noted but kept module-internal pending a second use case.

**Post-LIVE Action:** ALL Architecture Briefs sealed (M5/M6/M7/M8/M9/M11/M12/M13/M14/M15). Module Strategists begin SPEC authoring with M1-extension as first blocker.

- **SKILL_HARVEST_2026_05_18 — 2026-05-18** — Codified 10 SKILL proposals (5 P-STRAT + 5 P-EXEC) harvested across today's 5-SPEC Path X arc (M1 FK Fix + Group B SPECs 6/7/8 + Resilience Phase 1 + Resilience Phase 2). Format per Daniel's brief: rule / why / how-to-apply / empirical evidence (with SPEC source citation). Appended to `.claude/skills/opticup-strategic/SKILL.md` and `.claude/skills/opticup-executor/SKILL.md` under new section `## Patterns from SKILL_HARVEST_2026_05_18`. **Strategic harvest:** §0 path-resolution mockup-citation rule, §0 global-name probe for shared components, §1.5 `next_*_number` suffix-conformance probe, K-RPC Tier C cleanup must enumerate ALL side-effect tables, 🟡→🟢 verdict-upgrade should be written in the resolving SPEC's session. **Executor harvest:** STATE-COMPLETE polling rule, read-component-API-before-mount-call rule, mutate+restore-adjacent-tool-calls rule, `22P02 + next_*_number` triage tree, soft-delete column inventory + `set_config('request.jwt.claims', ...)` pattern for JWT-gated RPCs from MCP. Total wall clock for the 5-SPEC arc + 2 resilience SPECs + SKILL harvest: ~6 hours single Claude Code session, Path X sequential, 0 escalations to Daniel apart from authorization gates between SPEC groups. See `modules/Module 1.5 - Shared Components/docs/specs/SKILL_HARVEST_2026_05_18/` for SPEC + EXECUTION_REPORT + FINDINGS.

## 2026-05-18 — Working Patterns Harvest (6 Architect-Daniel patterns codified after 8-SPEC autonomous day)

**Situation:** 8 SPECs closed clean today in a single Claude Code session (~6h wall-clock, 24 commits). Daniel observed that the patterns we'd developed (same-session continuity, Path X sequential, when to defer to Daniel, when to push through, compaction recipe) were not documented and risked being lost on future session boundaries.

**My recommendation:** Codify 6 patterns into `opticup-architect` SKILL.md and references for next-session inheritance.

**Daniel's response:** Authorized — "אתה מתעד את דרך העבודה שלנו עכשיו? חשוב שהסשן החדש שנפתח ידע בדיוק איך אנחנו עובדים וזה תמיד ישתפר."

**Patterns codified:**
- **P-WORK-1** — Same-session continuity outperforms session-per-SPEC for sequential Pipelines within same module
- **P-WORK-2** — Path X (sequential on develop) is the default; Path Y (parallel) needs empirical justification at 5+ SPECs
- **P-WORK-3** — The over-checkpoint anti-pattern: when Daniel authorizes a dispatch protocol upstream, no per-SPEC re-authorization needed
- **P-WORK-4** — Daniel-Architect probing ("מה זה אומר?" / "למה?") = structural-flag signal, not clarification request
- **P-WORK-5** — Compaction protocol: how to bootstrap a new session from DECISIONS_LOG + last 3 FOREMAN_REVIEWs without re-discovering workflow
- **P-WORK-6** — Architect-Daniel question discipline: never present options without recommendation (per MEMORY `feedback_always_recommend.md`)

**Reason for codification:** Future Cowork sessions and Claude Code sessions inherit context only through DECISIONS_LOG + SKILL.md + auto-memory. Without these patterns documented, each new session re-derives the workflow at 30-60 min cost. The patterns above were paid-for-empirically across today's 8 SPECs and yesterday's 5 Foundation SPECs.

**Lesson (for Architect):** Process-level patterns deserve the same harvest discipline as code-level patterns. The Foreman ran SKILL_HARVEST_2026_05_18 for technical patterns; this entry is its working-patterns counterpart.

**Cross-references:**
- Full harvest document: `modules/Module 1.5 - Shared Components/architecture-brief/WORKING_PATTERNS_HARVEST_2026_05_18.md`
- Empirical session: 2026-05-18 morning + afternoon (8 SPECs, 24 commits, 5 hours)
- Daniel feedback memory: `feedback_always_recommend.md`, `feedback_always_saas_clean.md`, `feedback_finish_the_sequence.md`

## 2026-05-19 — Skill Improvement Harvest (4 patterns codified after 4-SPEC autonomous day)

**Situation:** 4 M4 SPECs closed on 2026-05-19 (PIXEL_VALIDATION_GAP_DASHBOARD + FB_CAPI_PURCHASE_EVENTS + FB_CAPI_PURCHASE_EVENTS_UUID_FIX + TEMPLATE_VALIDATION_UI_LINT). 4 recurring proposal patterns surfaced in their FOREMAN_REVIEWs — at 2-strike to 4-strike frequency. Per `opticup-strategic/SKILL.md` §"Self-Improvement Mandate", 3-strike+ patterns must be applied before the next session begins other work.

**My recommendation:** Run a Light Pipeline (no Reviewer, no Localhost-Tester — doc-only) to apply all 4 patterns as one atomic bundle, matching the SKILL_HARVEST_2026_05_18 precedent.

**Daniel's response:** Authorized.

**Patterns codified:**
- **Pattern A (DB state probe at SPEC author time)** — 4 occurrences. Added to `opticup-architect/SKILL.md` as Step 0.7 (Live-State Probe — column/status/extension/info-schema probes before sealing any Brief that cites DB-stored values). Defense-in-depth added to `opticup-executor/SKILL.md` as Step 1.5.6 (DB Probe Pre-Flight — 4 probe types repeated at execution time before the first migration commit).
- **Pattern B (line-count budget header buffer)** — 2 occurrences. Added to architect SKILL.md as Step 0.8 (write budgets as "≤ N lines (±5 buffer for header comments)" so Executor doesn't dance with retroactive amendments).
- **Pattern C (SECURITY DEFINER function rehearsal)** — 2 occurrences + the M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX P0 regression root cause. Added to executor SKILL.md as Step 1.5.7 (BEGIN/ROLLBACK rehearsal on demo for any SECURITY DEFINER function before C-commit).
- **Pattern D (Activation Prompts contradicting user memory)** — 4 occurrences in 2026-05-19 cohort + 3 Daniel re-asks across 7 days. Highest-frequency proposal. Added to architect SKILL.md as Step 0.9 (User Memory Compliance Check) WITH the SPECIFIC PROHIBITION: never instruct the executing session to surface Hebrew status lines. The closure instruction must be: "When done, surface a short English status line." User-memory rule `feedback_english_only_responses.md` takes ABSOLUTE PRECEDENCE over any Pipeline-mechanics preference.

**Reason for codification:** Without these 4 codifications, the next Brief authored by opticup-architect (or any Pipeline that derives from one) would repeat the same author-time blind spots. The Executor's own Step 1.5 would catch some of them (Pattern A defense-in-depth), but the recurring cost of Foreman→Executor escalations + P0 hotfix loops + Daniel re-asks justifies fixing the upstream cause.

**Lesson (for Architect):** Cross-skill defense-in-depth pays. Pattern A is codified BOTH in architect (catch at Brief author time) AND in executor (catch at execution pre-flight). The first layer prevents most occurrences; the second layer catches the residue. Pattern D is single-layer (architect only) because it has no execution-side symptom — it's purely an author-side defect.

**Cross-references:**
- Source SPECs: `modules/Module 4 - CRM/docs/specs/M4_PIXEL_VALIDATION_GAP_DASHBOARD/FOREMAN_REVIEW.md`, `M4_FB_CAPI_PURCHASE_EVENTS/FOREMAN_REVIEW.md` (via CLOSURE_NOTE.md), `M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX/FOREMAN_REVIEW.md`, `M4_TEMPLATE_VALIDATION_UI_LINT/FOREMAN_REVIEW.md`.
- Brief: `modules/Module 1.5 - Shared Components/architecture-brief/SKILL_IMPROVEMENT_HARVEST_2026_05_19_BRIEF.md`.
- SPEC: `modules/Module 1.5 - Shared Components/docs/specs/SKILL_IMPROVEMENT_HARVEST_2026_05_19/`.
- Precedent: `SKILL_HARVEST_2026_05_18` (same shape, ran 2026-05-18 — Light Pipeline successful).
- User memory affected: `feedback_english_only_responses.md` (Pattern D source).

---

### 2026-05-20 · M4_NIGHT_RUN W1.2 — Skill harvest (16 proposals + 5 session patterns)

**Situation:** End of 2026-05-20. Three SPECs closed that day each ended with multiple skill-improvement proposals: `M4_SHORT_LINKS_400_FIX` (2 author + 2 executor), `M4_SMS_RATE_LIMIT_HOTFIX_2026_05_20` (2 author), `M4_SHORT_LINKS_DASHBOARD_REDESIGN` (5 author + 5 executor across 3 amendment rounds). Pre-night audit Mission 02 verified all 16 confirmed NOT-yet-applied (Iron Rule 21 satisfied). The night-run brief authorized doc-only Light Pipeline harvest as Wave 1 W1.2.

**My recommendation (as Foreman + Executor in night-run mode):** apply all 16 as one bundle to the targeted anchor sections, condensed for readability:
- `opticup-strategic/SKILL.md` §5.4 gained 6 sub-bullets (§5.4a-f): enum-distribution probe, brief data-drift table, column-existence probe, PostgREST 1000-row cardinality probe, click-vs-action disambiguation, destructive-DML snapshot mandate.
- `opticup-strategic/SKILL.md` §"SPEC Authoring Protocol" intro block gained 2 SPEC-shape patterns: diagnosis-driven SPECs + P0 hotfix Light Pipeline shape.
- `opticup-executor/SKILL.md` §"Step 1.5 DB Pre-Flight" gained §1.5.8 (3 sub-bullets: SELECT-projection / embed-vs-standalone / business-state vs event-log).
- `opticup-executor/SKILL.md` §"Step 4: Verify" gained §4.1 (two-grep verify + intent-comment gap), §4.2 (anchor comments with SPEC slug), §4.3 (narrow-exception accounting in EXECUTION_REPORT).
- `docs/CONVENTIONS.md` gained new section N (PostgREST query patterns) with N.1 URL-size + N.2 1000-row cap.

**Daniel's response:** Pre-approved via the night-run brief (W1.2 is in scope).

**Lessons codified (the 5 session patterns):**
- **Pattern A (cardinality matters):** every PostgREST `.select()` against a public table needs an explicit cardinality estimate at SPEC-author time. Affects 2 strategic rules (§5.4d) + 1 executor rule (§1.5.8b) + 1 conventions section (N.2).
- **Pattern B (state column beats event log):** business-state columns exist on most M4 tables. Use them, not the event/click log, for metrics that name customer behavior. Affects 1 strategic rule (§5.4e) + 1 executor rule (§1.5.8c) + 2 saved memories (`feedback_clicks_are_not_actions`, `feedback_probe_biggest_production_tenant`).
- **Pattern C (column existence at every join boundary):** affects 1 strategic rule (§5.4c) + 1 executor rule (§1.5.8a).
- **Pattern D (Brief drift acknowledgment):** affects 1 strategic rule (§5.4b).
- **Pattern E (anchor comments + narrow-exception accounting at execution time):** affects 2 executor rules (§4.2 + §4.3).

**Pending entry consumption:** `_archive/architect-pending-entries/` was found empty (only `.gitkeep`). No entry to consume.

**Cross-references:**
- Source SPECs: `modules/Module 4 - CRM/docs/specs/M4_SHORT_LINKS_400_FIX/FOREMAN_REVIEW.md`, `M4_SMS_RATE_LIMIT_HOTFIX_2026_05_20/FOREMAN_REVIEW.md`, `M4_SHORT_LINKS_DASHBOARD_REDESIGN/FOREMAN_REVIEW.md`.
- Pre-flight audit: `_archive/pre-night-audit-2026-05-20/MISSION_02.md` (lists all 16 proposals + verified not-yet-applied).
- Brief: `modules/Module 4 - CRM/architecture-brief/M4_NIGHT_RUN_2026_05_20_BRIEF.md` §3 W1.2.

---

*Maintained by `opticup-architect` skill. Bootstrap loads this index file only. Module-detail files loaded on demand when working in that module.*
