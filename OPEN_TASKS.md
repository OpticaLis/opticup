# Open Tasks — Cross-Role Single Source of Truth

> **Purpose:** ONE place to see "what's open right now" — across Architect, Module Strategists, Overseers, and any other role. When user asks "what are the open tasks?" — this is the answer.
>
> **Maintenance:** Updated at the end of every session that opens or closes a task. Never let this file drift behind reality. If unsure if a task is still open — check git log + DECISIONS_LOG; do not guess.
>
> **Scope:** Only **actionable tasks** that someone needs to do. NOT: ideas, future modules, completed work, observations.

**Last updated:** 2026-05-13/14 overnight (`M4_AUTOMATION_RULES_UPDATED_AT` 🟢 CLOSED — second SPEC of the overnight audit-harvest run. `M4-DEBT-CRM-AUTO-RULES-UPDATED-AT` closed via single migration: new `updated_at` column + trigger + backfill (40 rows: 23 demo + 17 Prizma). Body-hash invariant verified — Prizma columns bit-identical pre/post. Before this: `M4_INVITED_GHOST_ATTENDEE_FIX` 🟢 CLOSED — first SPEC of the M4 overnight audit-harvest run. Three capacity enforcers (view `v_crm_event_stats` + RPC `register_lead_to_event` + storefront helper `checkAndAutoWaitingList`) now exclude `status='invited'` rows from `total_registered`/`spots_remaining`/cap comparison. Matches the UI counter from `ATTENDEE_COUNTER_DISPLAY_FIX`. 4 demo E2E smokes PASS. Zero Prizma writes; baselines 234/3/4/1284 unchanged. Master safety tag `pre-overnight-m4-2026-05-13` at `e2892d4`. Overnight run continues with SPECs #2/#4/#5 — SPEC #3 (waitlist slug cleanup) ESCALATED because Prizma has 1 lead with `status='waitlist'` (audit said 0); see `modules/Module 4 - CRM/escalations/`. Before this SPEC: `BROADCAST_EVENT_LINK_SUPPORT` 🟢 (Event #24 rescue dispatch unblocked).

**Previous session note (2026-05-13 evening):** `BROADCAST_EVENT_LINK_SUPPORT` 🟢 CLOSED via Full-Auto Pipeline — CRM Broadcast Wizard now carries `event_id` end-to-end through `crm_message_queue.event_id` so `send-message` EF substitutes `%registration_url%` per recipient. Event #24 rescue dispatch READY. **Active task before this hotfix: M1 EXPANSION — Lens Inventory schema design (in progress)**. Returning to that after the overnight run + Daniel re-sends Event #24.

**Previous session note (2026-05-12 late session):** **4-MIGRATION BATCH MERGED TO MAIN ✅ — production verified clean.** Next active task at the time: **M1 EXPANSION — Lens Inventory schema design (in progress)**. Daniel + Architect started column-design discussion 2026-05-12. **Active topic: M1 Lens Inventory schema columns.** Architect made one mistake worth recording: proposed AXIS as a column on lens inventory — Daniel corrected: AXIS belongs in the customer prescription (M6), NOT in lens inventory (lens stock is held by SPH/CYL/Index/Coating/etc, AXIS is determined at lab fitting time). Pending decisions for column finalization: (1) confirm Tint/גוון column (Daniel proposed, Architect agreed — values clear/photochromic/tinted+color), (2) confirm ADD column for multifocal lenses, (3) resolve R+L pair vs single-unit storage strategy. After columns are sealed → contacts table → accessories table → M7/M9 unblocked.

**Previous session note (2026-05-12 earlier):** **MIGRATION_4_STOREFRONT_STUDIO CLOSED 🟢** via Full-Auto Pipeline in ONE chat — **FINAL of 4 production-page migrations to Hybrid+Navy. ALL 4 MIGRATIONS NOW COMPLETE ON DEVELOP. BATCH READY FOR DANIEL MAIN-MERGE APPROVAL.** Pre-flight reduced scope from 7 candidate storefront-*.html files to **4 in-scope HTML files** (blog/content/landing-content/studio) — 3 files (glossary/products/settings) were verified scope-clean (only semantic + neutral hex, already token-driven Slate-modern). 13 swap sites total across 4 files: Block A `replace_all` covered 3 sites in blog + 1 in content + 1 in landing-content (byte-identical `background: linear-gradient(135deg, #6366f1, #8b5cf6)` → `background: #1e3a8a`); content additional `.progress-bar-fill` 90deg variant; studio 7 gold-to-Navy sites incl. WCAG-AA contrast fix (color `#1a1a1a` → `#ffffff` on `.btn-create`, `color:#000` → `color:#fff` on toolbar button). **Verification:** all 14 success criteria green (C4 documented Foreman-amend off-by-one — work matches §3 exhaustively); 7 of 7 storefront-*.html pages HTTP 200; smoke 7/7 PASS; integrity exit 0; variables.css byte-identical; 0 JS/CSS files modified; page-scope confined (inventory.html has 0 Navy hits, scope-clean storefront-glossary has 0 Navy hits). Localhost-Tester GREEN on HTTP + payload-content + smoke + page-scope confinement (v1 boundary; iframe-render verification is v2). 4 pre-commit tags `pre-migration-storefront-{blog,content,landing-content,studio}` at `eace1b5`. 5 commits: C1 `5648b39` (blog) + C2 `6a41700` (content) + C3 `08b61c3` (landing-content) + C4 `2cf5cc8` (studio) + C5 retrospective. 4 skill improvements applied: opticup-strategic Author #1 (color-form completeness check in §0 — catch rgba-decimal alongside #hex), Author #2 (pre-categorize swap sites by produced-token-form in §5 success criteria — multi-form count discipline). opticup-executor #1 (extend pre-execution hex audit to include rgba/rgb decimal form), #2 (canonical single-file post-edit verification recipe — 6-line Bash block, stopgap until `verify-reskin-page.mjs` ships). 4 findings opened: F1 (stranded indigo rgba `rgba(99,102,241,.08)` at blog:101 — single-site `MIGRATION_4_STRANDED_RGBA_SWEEP` follow-up SPEC, severity LOW, can land pre or post main-merge), F2 (SPEC C4 off-by-one — Foreman-amended in FOREMAN_REVIEW), F3 (storefront-content.html trailing-newline pre-existing → TECH_DEBT), F4 (informational, dismissed). **Awaiting Daniel:** main-merge approval for the 4-migration batch.)

**Previous session note (2026-05-12 earlier):** **MIGRATION_3_CRM CLOSED 🟢** via Full-Auto Pipeline in ONE chat — third of 4 production-page migrations to Hybrid+Navy. CRM was already on a modern Slate palette, so this was an **accent insertion** (Navy `#1e3a8a` on primary actions, focus rings, view-toggle, sidebar active marker, theme-dot, loading spinner), NOT a full re-skin. Shape differs from Migration #1+#2: CRM relies on inline Tailwind utility classes (`indigo-*`) in `crm.html`. Resolution: swap inline classes to Tailwind arbitrary values (`bg-[#1e3a8a]`, `focus:ring-[#1e3a8a]`). New pattern validated. Tag `pre-migration-crm` at `0dfa6b9`, commit `1176a89`. 3 findings opened (F1 CRM stub cleanup, F2+F3 → TECH_DEBT).

**Previous session note (2026-05-12 earlier):** **PRIZMA_CRM_BUGFIX_BACKPORT CLOSED 🟢** via Full-Auto Pipeline in ONE chat — backport of the 2026-05-11 demo E2E audit data fix to Prizma production. 2 single-row UPDATEs on `crm_automation_rules` (Prizma's `d2585fc4` + `c25feaf7` — the analogs of demo's `a06be5d8` + `ee0a6f24`). 2 findings opened: `M4-DEBT-CRM-AUTO-RULES-UPDATED-AT` (no `updated_at` column on rules table) + `M4-DEBT-EVENT-REG-OPEN-AUDIENCE-AUDIT` (separate rule resolves to 1999 plan_items on `registration_open`). 4 skill improvements harvested (2 author + 2 executor).

**Previous session note (2026-05-12 earlier):** SETTINGS_PERMISSIONS_CONSOLIDATION CLOSED 🟢 via Full-Auto Pipeline in ONE chat — tactical migration that executed the structural change Migration #2 deferred. `employees.html` archived to `_archive/pre-consolidation/`; `settings.html` is now a tabbed container with כללי + הרשאות tabs (hash routing, lazy permissions init, page entry widened to "settings.view OR employees.view"). Iron Rule 21 reuse confirmed: existing `showTab()` + `<nav id="mainNav">` + `data-tab-permission` pattern reused (no new tab activator invented). Single LIVE in-code link updated (index.html:156); new hash-aware `urlWithTenant()` helper. settings.html 212 → 292 lines. **Verification:** 20/20 SPEC criteria GREEN; 0 LIVE refs to employees.html in HTML/JS/SQL outside _archive; `GET /employees.html` → 404; smoke 7/7; integrity exit 0; safety tag `pre-consolidation-settings-permissions`. Localhost-Tester GREEN. 4 skill improvements applied (2 author + 2 executor). Demo's Migration #3 (CRM) is next.

**Previous session note (2026-05-12 earlier):** M13_BRIEF_AMENDMENT CLOSED 🟢 via Full-Auto Pipeline in ONE chat — docs-only amendment. D14 (basic-free tier) added to the sealed M13 Brief: auto-enrolled credits-only membership for non-members receiving M9 compensation or future Referral bonus. Zero accrual, zero family-pool, zero engine pass; M7 Redeem Engine reused. Upgrade to paid tier preserves credit balance. Schema impact: NONE — `loyalty_tier` config row added at M13 seed. 5 files updated: M13_LOYALTY_BRIEF.md (§2 + §11), M13_DECISIONS_FOR_LOG.md, decisions/M13.md, DECISIONS_LOG.md (cross-module #24 + M13 sub #3), OPEN_TASKS.md. Closes 2026-05-10 gap surfaced during M9 D24. M9 build SPEC will call `loyalty_ensure_basic_free_membership` RPC.

**Previous session note (2026-05-11):** DEMO_PARITY_REPLICATION CLOSED 🟢 via Full-Auto Pipeline in ONE chat. Discovery classified 102 tenant_id-bearing base tables (20 Behavioral / 8 Identity / 74 Content / 0 Ambiguous). 28 row mutations to demo (12 INSERT + 16 UPDATE) across 10 of 12 Behavioral tables. Phase 4 verification GREEN across all 13 measurable criteria. Demo's behavior now 1:1 with Prizma; combined with M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT, Daniel can run full manual test cycle on demo. CRM Migration #3 queued; demo test cycle is the prerequisite gate.

---

## 🎯 Active — pick up next session

| # | Task | Owner role | Estimated time | Why now |
|---|---|---|---|---|
| 1 | **🔍 M13 + M9 sketch revision — the 2 outliers** — Batch 3 (M5/M6/M8/M11/M12/M14/M15) closed 2026-05-11 via `M1_5_SKETCH_RESKIN_BATCH_3` — 17 files re-skinned to Hybrid+Navy. Two outliers remain: (a) **M13 Loyalty** uses a Prizma-gold palette with gradients — needs full revision, not just re-skin (gradients + gold contradict SaaS-clean design system); (b) **M9 Lab/KDS** has no sketches at all — sketches-from-scratch with Daniel involvement. Both are separate Batches per Brief §3 of Batch 3. | Architect (Daniel decides) | ~half day | Last sketch work before module builds. M7 already Hybrid+Navy (V7 Variant A). |
| 2 | **🔄 Migration of existing screens to Hybrid design system — ALL 4 CLOSED ON DEVELOP. AWAITING DANIEL MAIN-MERGE APPROVAL.** **Migration #1 (Suppliers Debt) ✅ CLOSED 2026-05-11** tag `pre-migration-suppliers-debt`. **Migration #2 (Settings + Permissions) ✅ CLOSED 2026-05-11** tags `pre-migration-settings` + `pre-migration-employees` (per-page revert). **Settings + Permissions Consolidation ✅ CLOSED 2026-05-12** tag `pre-consolidation-settings-permissions`. **Migration #3 (CRM) ✅ CLOSED 2026-05-12** tag `pre-migration-crm` at `0dfa6b9`, commit `1176a89`. **Migration #4 (Storefront Studio) ✅ CLOSED 2026-05-12** tags `pre-migration-storefront-{blog,content,landing-content,studio}` at `eace1b5`, commits `5648b39` + `6a41700` + `08b61c3` + `2cf5cc8`. Pre-flight reduced scope from 7 → 4 in-scope files; 3 scope-clean files verified byte-identical. 13 swap sites total. F1 follow-up: single-site `MIGRATION_4_STRANDED_RGBA_SWEEP` SPEC (stranded `rgba(99,102,241,.08)` at blog:101) — severity LOW, can land pre or post main-merge. Future cleanup SPECs queued: `M1_5_DEDUPLICATE_SETTINGS_EMPLOYEES_CSS` (dedup settings/employees byte-identical CSS + remove employees.css `<link>` from settings.html), `M1_5_CRM_CSS_STUB_CLEANUP` (crm-screens.css + crm-visual.css are post-B8 stubs). **Next strategic step: Daniel approves merge of 4-migration batch from develop → main.** | Daniel decides main-merge | 0 days (Daniel decision) | Batch is fully tested + verified. Pipeline now battle-tested on 5 SPECs (Migration #1 + #2 + Consolidation + #3 + #4). |
| 3 | **🚀 Build 10 new modules on Hybrid system** — M5, M6, M7, M8, M9 (includes shipments+boxes from absorbed M1.shipments), M11, M12, M13, M14, M15. Each gets a Foreman-authored Brief if needed (or uses existing Brief), then Full Auto Pipeline. Order: M5/M6/M7 foundation first, then M8/M9/M11/M12/M13 in parallel across split repos. Permissions sub-tab arrives with M5+M2 admin layer. M7 uses the locked V7 (Variant A) sketch. | Architect briefs → Full Auto chain | 6-8 weeks | Critical path to LIVE. |
| 4 | **📦 Module Repo Split** — Split `opticalis/opticup` into per-module repos + `opticup-shared` (design tokens + shared.js + components). Enables 3-4 parallel Full Auto pipelines without git conflicts. | Architect + Executor | 1-2 days | After migrations — once Pipeline is proven on monorepo, split makes parallel modules safe. |
| 5 | **M1 expansion — 3 missing inventory tables: lenses (משקפיים), contact-lenses (עדשות-מגע), accessories (אביזרים)** — Sketches first (Daniel involved — no sketches done yet), then Brief, then SPECs through Full Auto. Currently M1 only handles frames. **BLOCKER for M7 build (line items) + M9 build (lab routing for lens jobs).** | Architect (Daniel) → Full Auto | 1 week | Before M7/M9 build starts. Can be parallel to tasks 1-2. |
| ~~6~~ | ~~STATUS_CHANGE_TRIGGERS_FRAMEWORK SPEC (EV-001)~~ ✅ **CLOSED 2026-05-13** via Full-Auto Pipeline in ONE Claude Code chat. 9 commits `b2fb0c0..1d71698`. 25-criteria SPEC, 2 new tables + 1 DB trigger + registry seed + 2 production rule UPDATEs (demo + Prizma silently-broken check-in rules), automation-engine + dispatch-queue EF rebuilt for `consumeStatusChangeEvents` consumer + parallel-by-group multi-channel dispatch, pg_cron schedule for consumer, rule-editor `fires_on` sub-picker UI + browser engine mirror. **Verdict 🟡 CLOSED WITH FOLLOW-UPS.** Smoke 7/7 PASS, Reviewer 🟡 PASS WITH NOTES, Localhost-Tester 🟢 GREEN. **Multi-channel delta: 38ms vs ~1000ms pre-fix (26× improvement).** Prizma collateral md5 unchanged pre/post. 4 follow-ups: F1 (HIGH) redeploy `dispatch-queue --no-verify-jwt` at Daniel's convenience; R1 (MEDIUM) `M4_STATUS_EVENTS_ATOMIC_CLAIM` future SPEC stub; Integration Ceremony deferrals (GLOBAL_MAP + GLOBAL_SCHEMA + MODULE_MAP append at next M4 session); 4 skill improvements queued (2 author + 2 executor) in FOREMAN_REVIEW §7+§8. | — | done | — |

---

## 📋 Backlog — known but not active

### Post-cutover backlog (from 2026-05-03 cutover; non-blocking)

| ID | Task | Severity | Notes |
|---|---|---|---|
| POST-4 | CRM leads pagination — currently bumped from 200→1000, ideally proper pagination UI | LOW | Active need only when leads >1000 |
| POST-5 | Storefront form — Hebrew lock | LOW | Edge case |
| POST-6 | Campaign metrics UI | MEDIUM | Daniel hasn't pushed for this yet |
| REC-005 | 8 MultiSale archive events — needs `event_type` schema first | LOW | Blocked on schema decision |

### Tech debt (pre-LIVE blocker class)

| ID | Task | Severity | Notes |
|---|---|---|---|
| TD-2 | Migrations git drift — 31 MCP-applied Supabase migrations not in git | HIGH (SaaS-blocker pre-tenant-2) | Per `project_migrations_git_drift.md` memory — Daniel directive Apr 28 |
| TD-3 | Multi-tenant URL strategy | MEDIUM | Deferred until tenant 2 onboards |
| WAZE-1 | 16 messages with hardcoded Waze URL — `%waze_url%` infrastructure built but messages not migrated | LOW | Per `project_waze_url_migration_pending.md` — first opportunity post-cutover stability |

### Sentinel HIGH/MEDIUM alerts (last full sweep — check `docs/guardian/GUARDIAN_ALERTS.md` for current)

| ID | Task | Severity | Notes |
|---|---|---|---|
| H-3 | 24 files exceed 350-line Iron Rule 12 limit | HIGH | Refactor candidates module-by-module. **Note (2026-05-09):** receipt-ocr-review.js (402 lines) blocked overnight Item 12's full T.INV migration — 1 of 5 files deferred. |
| M-1 / M-2 / M-10 / M-11 | RLS performance — 118 `auth_rls_initplan` + 67 multiple-permissive | MEDIUM | Bundle into one post-cutover RLS-perf SPEC. Out-of-scope for overnight sweep per design. |
| M-13 | Phone source-of-truth scattered | MEDIUM | Partially addressed by M3_PHONE_TEMPLATING_AND_CLEANUP + L-21 + L-23 cleanup in overnight sweep. Verify current state next sweep. |

**✅ Closed by `OVERNIGHT_HYGIENE_SWEEP_2026_05_09` (2026-05-09):** M-6 (currency hardcodes), M-7 (SESSION_CONTEXT staleness M1.5+M3), M-9 (production console.log), M-12 (DB_TABLES_REFERENCE — partial, see report), L-4 (PRIZMA_PHONE_RE rename), L-7 (HTTP 406 on meta.json), L-10 (short-link domain — already-done), L-18 (GLOBAL_SCHEMA header), L-21 (currency in receipt-form-items), L-22 (5 oldest M3 FOREMAN_REVIEWs caught up), L-23 ('inventory' → T.INV — partial), L-24 (SMS double-suffix — already-done).

### Storefront / overseer queues

- **Site Overseer** has open items in `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` (REC-SITE-XXX) — separate role, separate cadence
- **Campaign Overseer** has open items in `roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md` — separate role

---

## 🔮 Roadmap — Architecture Briefs remaining before LIVE

Per `MASTER_ROADMAP.md` §2.5:

| Module | Status |
|---|---|
| M5 / M6 / M7 / M8 / M11 / M12 / M13 / M14 / M15 | ✅ Brief sealed |
| **M9 (Lab/KDS)** | ✅ Brief sealed 2026-05-10 — last one |

After M9 → Module Strategists write SPECs → Executors build → cutover.

---

## ✅ Completed recently — for context

**2026-05-12 (M13 Brief Amendment):**
- **📘 M13_BRIEF_AMENDMENT ✅ CLOSED 🟢** via Full-Auto Pipeline (single Claude Code chat, docs-only). Was Active task #6. D14 (basic-free tier) added to the sealed M13 Brief: auto-enrolled, no-fee, credits-only membership created on first qualifying event (M9 compensation OR future Referral bonus) for a customer who is not yet a member. Schema impact: NONE — `basic-free` is a `loyalty_tier` config row added at M13 seed time, NOT a code branch. No accrual, no welcome bonus, no family pool, excluded from cron promotion/downgrade engine. M7 Redeem Engine reused for credit redemption. Upgrade to a paid tier (Silver/Gold/Diamond) preserves the credit balance (`loyalty_credit_balance` not zeroed). SaaS-clean: other tenants can disable via `is_active=false` on their config row. **5 files updated:** `modules/Module 13 - Loyalty Club/architecture-brief/M13_LOYALTY_BRIEF.md` (§2 Tiers Prizma + new `Tier basic-free` sub-section + §11 D14 + amendment note), `M13_DECISIONS_FOR_LOG.md` (full D14 entry with rationale + cross-module impact), `decisions/M13.md` (module-level dated entry), `DECISIONS_LOG.md` (cross-module entry #24 + M13 sub-table entry #3), this file (task #6 closed). **Gap origin:** surfaced 2026-05-10 during M9 D24 — M9's compensation flow needed an M13 slot for non-member customers; original 13 M13 decisions all assumed paying members. **M9 build SPEC contract:** must call `loyalty_ensure_basic_free_membership(customer_id, amount, source)` (one-shot idempotent — skips if customer is already a member of any tier) BEFORE inserting `loyalty_credit_transaction`. Closes the M13-M9 contract gap before any build SPECs begin.

**2026-05-11 (latest session — Demo Storefront Forms Phase 1):**
- **🌐 M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT 🟡 CLOSED** via Full-Auto Pipeline (Foreman → Executor → Foreman). Demo storefront now live at `https://opticup-storefront-demo.vercel.app` on a new Vercel project (`prj_8bNP1xOFF7Lg93bt2e6ZEMPsrYU6`) linked to `OpticaLis/opticup-storefront@main`. Same codebase as Prizma's production storefront, different `PUBLIC_DEFAULT_TENANT=demo` env var, same shared Supabase. Demo's `tenants.ui_config.storefront_url` updated; Prizma bit-identical (independent Foreman spot-check confirms). Smoke 7/7 PASS (root + `/event-register/` + `/quick-register/` + short-link round-trip + URL-builder inspection-only for both tenants). 2 planned escalations handled: (1) Vercel access — Daniel pasted `vcp_` CLI token after his MCP-pivot was correctly surfaced as non-viable (Vercel MCP lacks create_project + env-var primitives); (2) `SUPABASE_SERVICE_ROLE_KEY` — Daniel chose Path 2 (he adds manually via Vercel UI + redeploys). 3 findings: canonical URL bake-in (Phase 2 follow-up SPEC), `tenants` no `updated_at` trigger (added to TECH_DEBT), Vercel MCP capability gap (executor skill update). 5 commits, all pushed to develop. **Daniel-actions pending:** add SERVICE_ROLE_KEY in Vercel UI + redeploy, then run his manual test cycle on demo; on green test cycle → CRM Migration #3 unblocked.

**2026-05-11 (Migration #1 + #2 closure earlier session):**
- **🎨 Migration #1 (Suppliers Debt) ✅ CLOSED** via `MIGRATION_1_SUPPLIERS_DEBT` Full-Auto Pipeline. The LIVE production `suppliers-debt.html` re-skinned to Hybrid+Navy with zero functional regression. Page-scope `body { --primary }` override pattern: only this page sees Navy, all other unmigrated pages keep legacy Indigo via `css/styles.css :root`. 6 additive Navy/slate tokens appended to `shared/css/variables.css` (Section 12, zero deletions). 4 purple hex codes swapped, 2 standalone blues nudged to Navy hover, 2 inline-style gray hex codes converted to existing tokens. Smoke 7/7 PASS, integrity gate exit 0, all 55 `<script>` + 3 `<link rel="stylesheet">` tags + 17 DOM ids + 3 onclick handlers preserved verbatim. Pre-commit tag `pre-migration-suppliers-debt` enables per-page rollback. 4 skill improvements applied (2 each to opticup-strategic + opticup-executor): SPEC heading convention (`## N.` not `## §N.`), §0 reality-check promoted to template, inline-hex audit helper, Full-Auto pre-existing-files-leave-alone rule.

**2026-05-11 (later session — V7 closure):**
- **🎨 M7 V7 canonical sketch ✅ LOCKED.** Daniel selected Variant A from the 3-variant redesign exploration. SPEC `M7_CLOSURE_V7_VARIANT_A` (Full-Auto Pipeline, doc-only closure) ran end-to-end in single chat. Variant A extracted as standalone `M7_ORDERS_FULL_MOCKUP_V7.html` (two-pane work surface + sticky tools strip); V6 baseline + 3-variants comparison file + earlier rejected center-column attempt moved to `_archive/m7-sketches-v6-prior/` via `git mv` (3 declared destructive operations, Iron Rule 32 gate passed). DECISIONS_LOG cross-module entry 18 + M7 sub-table entry 10 recorded. Closes Active task #1 (M7 sketch redesign); 9-sketch audit promoted to position 1.

**2026-05-11 (late session):**
- **🤖 FULL_AUTO_PIPELINE ✅ LIVE.** SPEC `M1_5_FULL_AUTO_PIPELINE` closed 🟢. 10 commits. Pipeline now runs entire SPEC end-to-end in ONE Claude Code chat via skill chaining (Foreman → Executor → Reviewer → Localhost-Tester → Foreman-review). Daniel pastes ONE prompt, sees Hebrew status lines between phases, gets ONE Hebrew summary at end. Escalation protocol: when stuck, skill writes `modules/Module N/escalations/{TS}_{TOPIC}.md` + emits one Hebrew line — Daniel opens Cowork chat with Architect, Architect returns decision template, Daniel pastes back into the running Claude Code chat (still alive). Iron Rule 32 (Destructive Ops Gate) enforced — every SPEC.md declares `## Destructive Operations` section; pre-commit `destructive-ops-declared.mjs` blocks SPECs missing it. Mandatory backups before any 5+ file refactor or 100+ line change. 2 test SPECs (docs-only + small code change) ran end-to-end successfully validating pipeline.
- **🎨 Design System Hybrid (Navy) ✅ SEALED.** v1 (staticization) failed; v2 (3 languages) succeeded with Stripe winner; v3 Hybrid merged Stripe structure + Linear sidebar + Navy `#1e3a8a` palette + sans-serif everywhere. 5 mockups live at `architecture-brief/design-system-mockups/hybrid-final/` (Storefront Studio, Permissions, Shipments, Settings, Suppliers Debt). v1/v2 retained as reference. Decisions: Permissions folds into Settings tab; Shipments mockup transfers to M9 as a sketch.

**2026-05-10 (later session):**
- **🛡️ Safety Infrastructure ✅ COMPLETED** (was Active task #1):
  - `opticup-localhost-tester` skill (4th agent in chain) ← `.claude/skills/opticup-localhost-tester/SKILL.md`
  - `scripts/start-local.ps1` (auto-launch ERP + Storefront, idempotent, dual-stack health check)
  - `tests/smoke/baseline.test.mjs` — **7/7 PASS** on demo tenant (PIN/CRM/inventory/storefront/RLS/5xx)
  - `scripts/snapshot.mjs` — git-tag pre-SPEC + rollback (Supabase branch deferred to v2)
  - `docs/AGENT_CHAIN_PROTOCOL.md` (full 5-agent chain documented)
  - CLAUDE.md §11 updated to reflect new layer + `npm run dev` / `npm run smoke` shortcuts
  - 3 bugs caught in first test: Start-Job→Start-Process, IPv4-only TcpClient→Invoke-WebRequest, /contact→/supersale
- SKILL_PENDING merge: P32-P39 promoted from 3 side-cars into opticup-architect SKILL.md (M13 + M9 Module Close Ceremonies finalized)

**2026-05-10:**
- **M13 (Loyalty Club) Architecture Brief sealed** — 5 sketches, 13 locked decisions, 6 entities, 4 engines, contracts with M5/M7/M8/M11/M12/M3 (commits 7cafa9e + 6022da2)
- **GITIGNORE_CLEANUP follow-up CLOSED** — verified: new `decisions/M13.md` showed as `??` in git status (not silently ignored), confirming the dedupe + explicit-ignores fix from overnight sweep works as intended
- OVERNIGHT_HYGIENE_SWEEP_2026_05_09 Module Close Ceremony complete (commit eaf4f72)

**2026-05-09:**
- M11 (Reports) Architecture Brief sealed
- M12 (Communications) Architecture Brief sealed (4 mockups, 15 locked decisions)
- PROJECT_STRUCTURE_CLEANUP SPEC executed (11 commits)
- MODULES_HOME_UNIFICATION SPEC executed (12 commits)
- STRUCTURE_PROTECTIONS SPEC executed (10 commits) — 3 enforcement layers active
- Merged develop → main via PR (~40 commits)
- POST_MERGE_QA: 🟢 GREEN
- **OVERNIGHT_HYGIENE_SWEEP_2026_05_09 — 12 of 16 items CLOSED, 4 documented-skips. ~17 commits across ERP + storefront repos.** Skills audit report, M3 SESSION_CONTEXT 445→95 lines, 5 oldest M3 FOREMAN_REVIEWs caught up, formatMoney refactor, console.log cleanup, T.INV migration (4/5), 'inventory'→T.INV in goods-receipts, IL_PHONE_RE rename, GLOBAL_SCHEMA header fix, scripts/README split, tenant-fallback-map regen (storefront), HTTP 406 fix (storefront). Skipped: Item 3 (CRM tables not in GLOBAL_SCHEMA as DDL + no T-constants), Item 6 (already fixed), Item 9 (already done by M4_CLOSURE), Item 16 (already fixed). Full retrospective in `_archive/spec-history/OVERNIGHT_HYGIENE_SWEEP_2026_05_09/EXECUTION_REPORT.md` after Module Close Ceremony.
- 8 patterns added to opticup-architect SKILL.md (P24-P31)
- DECISIONS_LOG reorganized to hybrid (index + per-module)
- `__LAUNCH_PLAN_DRAFT__/` retired; `roles/` created; `_archive/` consolidated

---

## How to use this file

**At session start (Architect):** read this file first (after MASTER_ROADMAP). The "Active" section tells you what's queued. If user asks "what's open?" — this is the answer.

**At session end:** if any task moved (active → done, or backlog → active, or new task added) — update this file and commit. Use commit message pattern: `docs(open-tasks): <what changed>`.

**For other roles (Campaign Overseer, Site Overseer):** read your own handoff file in `roles/<your-role>/`. This file is project-wide; your handoff is role-specific.

---

*Owned by Architect skill. Cross-references: `MASTER_ROADMAP.md` §2.5 (build sequence), `TECH_DEBT.md` (long-term debt), `docs/guardian/GUARDIAN_ALERTS.md` (Sentinel-detected), per-role handoffs in `roles/`.*
