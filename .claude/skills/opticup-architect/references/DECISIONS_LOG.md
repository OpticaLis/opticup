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
| 25 | 2026-05-12 | Settings + Permissions Consolidation closed — tabbed settings.html, employees.html archived | `SETTINGS_PERMISSIONS_CONSOLIDATION` Full-Auto Pipeline ran end-to-end in ONE chat across all 4 hats. Tactical migration that executed the structural change Migration #2 deferred (Daniel decision 2026-05-11). `employees.html` (former standalone permissions page) merged into `settings.html` as the "הרשאות" tab; original `git mv`'d to `_archive/pre-consolidation/employees.html` (100% rename similarity). Single LIVE in-code link updated (`index.html` line 156: `url: 'employees.html'` → `url: 'settings.html#permissions'`). New `urlWithTenant(u)` helper in index.html keeps `?t=...` BEFORE `#fragment` (URL builder hash-aware). `scripts/checks/root-allowlist.json` cleaned. **Iron Rule 21 reuse confirmed at SPEC author time** — existing `showTab()` from `js/shared-ui.js` reused (no `activateTab`/`switchTab` invented), existing `<nav id="mainNav">` + `data-tab-permission` pattern reused (matches inventory.html), existing PermissionUI auto-gating reused. New code added: 25-line page-local `goSettingsTab()` wrapper (hash routing + lazy permissions init) + 5-line `urlWithTenant()`. settings.html 212 → 292 lines (+80 additive). Page entry permission widened to "settings.view OR employees.view"; PermissionUI auto-hides whichever tab the user lacks. **Verification:** 20 of 20 SPEC §3 success criteria GREEN; `grep -r "employees.html" --include='*.html' --include='*.js' --include='*.sql' --exclude-dir=_archive --exclude-dir=.git .` → **0** LIVE references; `GET /employees.html` → 404, `GET /_archive/pre-consolidation/employees.html` → 200; smoke 7/7 PASS; integrity exit 0; pre-commit safety tag `pre-consolidation-settings-permissions` placed BEFORE any edit. **Localhost-Tester GREEN** on 18 HTTP+payload checks (v1 boundary; runtime DOM/JS deferred to v2 Playwright). 4 commits (C1–C4), 6 files in C1–C3 + retro/master-doc updates in C4. **4 skill improvements applied:** opticup-strategic Author #1 — link-vs-comment distinction in sweep-criteria phrasing; Author #2 — pre-existing-untracked-files checkbox in §0 Reality Check (3rd consecutive D1 makes it a pattern). opticup-executor #1 — tombstone-comment pattern (avoid literal dead-path strings in narrative comments); #2 — "SPA tab page" reference snippet (3 pages now use the `<nav id="mainNav">` + `<section class="tab">` + `showTab()` pattern; CRM Migration #3 may need it). 4 findings opened, all dispositioned (F1–F4 dismiss/defer; F3 reaffirms MIGRATION_2 F1, updates `M1_5_DEDUPLICATE_SETTINGS_EMPLOYEES_CSS` future-SPEC scope to include removing `css/employees.css` `<link>` from settings.html). 3 of 4 production migrations + 1 consolidation now closed on develop; **next: CRM Migration #3**. |

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

---

## M6 — Prescriptions / Eye Exams

→ Full detail: [`decisions/M6.md`](decisions/M6.md)

| # | Date | Topic | One-liner |
|---|---|---|---|
| 1 | 2026-05-06 | M6 state-machines: explicit, not boolean | Cross-module pattern — state enum > boolean. |
| 2 | 2026-05-06 | M6 prescription_glasses vs prescription_contacts | TWO entities, not one with discriminator. |
| 3 | 2026-05-06 | M6 split: eye_exams (act) vs prescriptions (output) | Separate entities — different lifecycles. |

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

---

## M8 — Payments

→ Full detail: [`decisions/M8.md`](decisions/M8.md)

| # | Date | Topic | One-liner |
|---|---|---|---|
| 1 | 2026-05-09 | M8 Architecture Brief CLOSED | 9+ locked: עוסק-מורשה, ERP-orchestrating-POS, Provider Adapter Pattern. |

---

## M11 — Reports

→ Full detail: [`decisions/M11.md`](decisions/M11.md)

| # | Date | Topic | One-liner |
|---|---|---|---|
| 1 | 2026-05-09 | M11 Architecture Brief CLOSED | 22 locked + 5 modularity reinforcements; view-layer not data-owner. |

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

**Post-LIVE Action:** ALL Architecture Briefs sealed (M5/M6/M7/M8/M9/M11/M12/M13/M14/M15). Module Strategists begin SPEC authoring with M1-extension as first blocker.

---

*Maintained by `opticup-architect` skill. Bootstrap loads this index file only. Module-detail files loaded on demand when working in that module.*
