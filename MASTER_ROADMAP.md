# Optic Up — Master Roadmap

> **Last reconciled:** 2026-05-15 evening — **`STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15` 🟢 CLOSED via Full-Auto Pipeline (single chat, Opus, ~ this session).** Foundational architectural SPEC. Replaced the original `SECURITY_HOTFIX_4` stub (procedural-discipline plan) with a **Pattern A public-data-layer architecture**: 6 mirror tables (`branches_public`, `storefront_config_public`, `media_public`, `brands_public`, `inventory_images_public`, `inventory_public`) + 9 trigger functions (6 main + 3 satellites including AI-content cache + image-paths cache + brands_public.has_sellable_inventory) + 18 RLS policies + 6 anon GRANTs + 8 v_storefront_* views REWRITTEN to source from layer + flipped `security_invoker=on` + 7 REVOKEs (6 private bases + v_crm_lead_first_touch). **F-CRIT-2 advisor 8 → 0 (CLOSED).** v_storefront_products latency 480ms → 44ms via cached AI columns + image_paths array. All 8 view Prizma row counts match BASE exactly (1133/155/45/2/1/1/276/1). STT-11 cross-tenant leak probes 0/0 both directions. Smoke 7/7 PASS. 6 commits `2f2a89c..8fc2080`. Canonical reference: `docs/PUBLIC_DATA_LAYER.md`. Foundation now powers all future public consumers (Standard-tier shared site, M11 Supplier Portal, customer portal, mobile, API) without re-architecture.
>
> **Previously (2026-05-13):** `SECURITY_HOTFIX_2026_05_13` 🟢 CLOSED via Full Auto Pipeline (single chat, Opus, ~3 hours). All 9 LIVE-CUSTOMER-HARM + 11 STAFF-DATA-HARM Supabase Security Advisor findings closed across 7 work areas: §6.1 DROP `_backup_brand_gallery_20260417` (orphan, 465 rows, anon full CRUD); §6.2 REVOKE anon `create_tenant`; §6.3 9 `v_admin_*` views `security_invoker=on` + REVOKE anon SELECT; §6.4 8 mutator RPCs JWT-claim tenant validation + REVOKE FROM PUBLIC,anon (record_purchase, register_lead_to_event, next_box/po/return/internal_doc_number, apply_stock_count_delta, increment_shipment_counters) — bonus `SET search_path='public'` defense-in-depth; §6.5 deploy `submit-lead` Edge Function (Origin-allowlisted, verify_jwt=false); §6.6 storefront cutover (`opticup-storefront` commit `2226854`); §6.7 REVOKE anon `submit_storefront_lead`; §6.8 `tenant-logos` storage policies (legacy-path-compatible — 12 of 13 Prizma logos on legacy `brands/<id>/…` or `tenants/<id>/…` prefixes; backfill descoped per §5.3 no-Prizma-data-writes); §6.9 DROP `audit_log_admin_insert` always-true policy. 5 opticup commits + 1 storefront commit + 0 escalations. Master safety tag `pre-security-hotfix-2026-05-13` @ `7870935`. Summary: `docs/guardian/SECURITY_HOTFIX_2026_05_13_SUMMARY.md`. **READY FOR develop → main MERGE (both repos).** 2 TECH_DEBT entries added (logo path canonicalization, v_storefront cross-tenant hardening for pre-tenant-2).
>
> **Previously (2026-05-13/14 overnight):** M4 overnight audit-harvest Pipeline run in progress. SPEC #1 `M4_INVITED_GHOST_ATTENDEE_FIX` 🟢 + SPEC #2 `M4_AUTOMATION_RULES_UPDATED_AT` 🟢 + SPEC #4 `M4_RAW_SB_WRAPPER_MIGRATION_PHASE_1` 🟢 CLOSED (3 closed of 5 queued; SPEC #3 escalated) (closes `M4-DEBT-CRM-AUTO-RULES-UPDATED-AT`; 40 rule rows backfilled, Prizma body-hash bit-identical pre/post) (three capacity enforcers — view `v_crm_event_stats` + RPC `register_lead_to_event` + storefront helper `checkAndAutoWaitingList` — now exclude `status='invited'`, matching UI counter from `ATTENDEE_COUNTER_DISPLAY_FIX`). Brief `M4_OVERNIGHT_AUDIT_HARVEST_BRIEF.md` overnight queue continues with SPEC #2 (`M4_AUTOMATION_RULES_UPDATED_AT`) + #4 (`M4_RAW_SB_WRAPPER_MIGRATION_PHASE_1`) + optional #5 (`M4_FUNNEL_REPORT_FOUNDATION`). SPEC #3 (waitlist slug cleanup) ESCALATED — audit said 0 leads with `status='waitlist'` on Prizma; live data shows 1.
>
> **Previously (2026-05-04 late night):** Prizma cutover COMPLETE 2026-05-03 (production live). M4 post-cutover closure rolling: QUICK_REGISTER_QR_FLOW + DELETE_EMPTY_EVENT + ACTIVITY_LOG_DEDUP + RESTORE_DELETED_EVENT_UI all ✅ shipped. 60% Overseer rolling REC rate (10 decided). Open M4 tech-debt: TD-2 migrations git drift (SaaS-blocker), TD-3 multi-tenant URL strategy (deferred to tenant 2). Open M4 backlog: POST-1 ✅ closed, POST-7 ✅ closed, POST-4/5/6 + REC-005 (MultiSale archive needs event_type schema first).
>
> This document is the canonical **build sequence**, **decision log**, and
> **known-debt register** for the Optic Up platform.
> For architecture see `docs/GLOBAL_MAP.md`.
> For the data model see `docs/GLOBAL_SCHEMA.sql`.
>
> If a new strategic chat is opened, paste this file and say:
> "You are the Architect for Optic Up. Read this document and continue from Section 7."

---

## 1. Platform Identity

**Optic Up** is a multi-tenant SaaS ERP + storefront platform for Israeli
optical chains. Every tenant gets a branded ERP (internal staff tool) and a
branded storefront (public customer-facing site) sharing a single Supabase
backend with RLS-based tenant isolation.

- **First tenant:** אופטיקה פריזמה (Prizma Optics) — production
- **Test tenant:** אופטיקה דמו (demo, slug `demo`) — all QA runs here
- **Supabase:** `tsxrrxzmdxaenlvocyit.supabase.co` (single shared instance)
- **ERP repo:** `opticalis/opticup` — Vanilla JS, GitHub Pages
- **Storefront repo:** `opticalis/opticup-storefront` — Astro 6 + TypeScript + Tailwind, Vercel
- **Both repos share one DB.** Storefront reads only via Views + RPC (Iron Rules #13, #24).
- For the full dual-repo architecture diagram see `docs/GLOBAL_MAP.md` §2.

---

## 2. Build Order

| # | Module | Name | Status | Repo | Scope summary |
|---|--------|------|--------|------|---------------|
| 1 | Inventory ERP | ✅ Complete | opticup | Full ERP: inventory, purchasing, receipts, supplier debt, returns, shipments, AI-OCR, alerts, stock counts, Access sync. 12 phases (0 → 5.9 + QA). 36 tables. |
| 1.5 | Shared Components | ✅ Complete | opticup | Cross-module infrastructure: shared JS/CSS components (Modal, Toast, TableBuilder, PIN modal), activity_log, auth/permissions refactor, plan helpers, design tokens. 14 tables. |
| 2 | Platform Admin | ✅ Complete (v2.0) | opticup | Super-admin control plane: tenant provisioning, plans/limits/features, audit log, PIN reset, suspend/activate/delete. 4 phases. 5 tables + tenants extension. |
| 3 | Storefront | 🟢 DNS SWITCH EXECUTED (2026-04-18) — propagation pending | opticup-storefront | Public storefront: CMS pages, campaigns, blog, AI content, translations (he/en/ru), media library, lead forms, brand pages, SEO. All phases complete. develop→main merged. DNS switched from DreamVPS to Vercel. 25 tables. |
| 3.1 | Project Reconstruction | ✅ Complete | opticup | Meta-module: foundation doc rewrites, DB audit baseline, roadmap reconciliation. Does not own code — owns documentation accuracy. 3A/3B/3C/3D all complete. |
| 4 | CRM | 🟢 PRODUCTION (Prizma cutover COMPLETE 2026-05-03; post-cutover closure rolling) | opticup | Customer management — replaces Monday.com for leads. 23 tables, 7 views, 8+ RPCs, 46 RLS policies. Phases A–B9 + Go-Live P1–P3c+P4 + P5–P7 closed. Cutover 2026-05-03 successful — 1158 leads + 88 campaigns + 221 attendees migrated; legacy pipeline decommissioned. **Post-cutover features shipped:** QUICK_REGISTER_QR_FLOW (WhatsApp QR walk-in registration), DELETE_EMPTY_EVENT (soft-delete gated on purchase_amount=0), ACTIVITY_LOG_DEDUPLICATION_DELETE_EVENT (1-row audit), RESTORE_DELETED_EVENT_UI (Approach B: attendee_ids in audit details), payment-lifecycle trio. Open: 4 backlog items (POST-4/5/6 LOW, REC-005 MultiSale archive needs event_type schema), 2 tech-debts (TD-2 migrations git drift, TD-3 multi-tenant URL strategy). |
| 5–22 | Future modules | ⬜ Not started | — | Orders, prescriptions, payments, lab/KDS, lenses, branches, WhatsApp, reports, supplier portal, content hub, B2B network, AI support, WooCommerce sync, POS. |
| TBD | Finance Hub | ⬜ Future (post-launch) | opticup | Internal cash-flow + expenses module. NOT in launch scope. Decided 2026-05-08 during M8 design — surfaced because checks-pipeline naturally extends to broader financial tracking. Day-1 scope (when built): expense categorization (configurable per-tenant), monthly/yearly expense tracking, future cash-flow view (consuming check pipeline from M8). Deferred (when built): bank API integrations, email-to-invoice AI matching, export to BizziBox/Hashavshevet/EasyCount/Wizcount. Permissions: accountant + business-owner only — cashiers must NOT see this module. Replaces today's BizziBox usage at Prizma. Owner module-number TBD by future strategic chat. |

**Detailed per-module scope** lives in each module's `README.md` and `MODULE_SPEC.md`
under `opticup/modules/Module N - .../`.

---

## 2.5 Architecture Briefs Status (pre-LIVE planning)

Each module that needs to ship to LIVE day gets an Architecture Brief (cross-module decisions, entity boundaries, contracts, sketches) **before** Module Strategist starts writing SPECs. Briefs live in `modules/Module N - Name/architecture-brief/` (per-module home, established by MODULES_HOME_UNIFICATION SPEC, 2026-05-09).

| Module | Brief Status | Sketches | Decisions Logged |
|--------|--------------|----------|-------------------|
| M5 (Customers) | ✅ v3 | Customer Card + Customers List | `decisions/M5.md` |
| M6 (Prescriptions) | ✅ v2 | Prescription Editor (sidebar+center, glasses↔contacts toggle) | `decisions/M6.md` |
| M7 (Orders) | ✅ v1 | Main mockup + 5 forms + catalog | `decisions/M7.md` |
| M8 (Payments) | ✅ v1 | Checkout + Pipeline + EOD + Provider Config | `decisions/M8.md` |
| **M9 (Lab/KDS)** | ✅ v1 (closed 2026-05-10) | 4 sketch files: KDS + Shipments + Dashboard + Settings | `decisions/M9.md` |
| **M11 (Reports)** | ✅ v1 (closed 2026-05-09) | Reports List + Editor + View | `decisions/M11.md` |
| **M12 (Communications)** | ✅ v1 (closed 2026-05-09) | Inbox + Templates + Customer History + Channel Configs | `decisions/M12.md` |
| **M13 (Loyalty Club)** | ✅ v1 (closed 2026-05-10) | 5 sketches: Customer Tab + Admin Dashboard + Checkout Block + Storefront Enrollment + Tenant Settings | `decisions/M13.md` |
| M14 (Appointments) | ✅ v1 | Calendar + 3 sub-screens | included in cross |
| M15 (Queue) | ✅ v1 | Queue panel embedded in M14 calendar | included in cross |

**Sequence to LIVE:** ✅ All Briefs sealed 2026-05-10. Module Strategists write SPECs → Executors build → cutover. **Blocker:** M1-extension SPEC (3 inventory tables — lenses/contact-lenses/accessories) must be written first before M7/M9.

**Deferred LIVE-plan content:** Master Plan v1 history (cutover plan, risks, decisions Q1-Q8) is preserved in `_archive/launch-plan-versions/MASTER_LIVE_PLAN_v1.md` for historical reference.

---

---

## 3. Current State (May 2026 — post-cutover)

**Prizma is LIVE in production** (cutover executed 2026-05-03). Module 4 (CRM)
operating full pipeline: storefront `/supersale/` form → `lead-intake` EF →
`crm_leads` → automations → SMS/Email via Make-as-pipe. WhatsApp QR walk-in
registration (`/quick-register/`) live. Soft-delete + restore for events
shipped 2026-05-04. Legacy Monday/WordPress pipeline decommissioned.

**M4 closure backlog (post-2026-05-04 marathon):**
- 2 tech-debts: TD-2 migrations git drift (SaaS-blocker pre-tenant-2),
  TD-3 multi-tenant URL strategy (deferred to tenant 2 onboarding).
- 4 LOW/MEDIUM POST items: POST-4 (CRM leads pagination), POST-5
  (storefront form Hebrew lock), POST-6 (campaign metrics UI), REC-005
  (8 MultiSale archive events — needs `event_type` schema first).
- 2 pending FOREMAN_REVIEWs: ACTIVITY_LOG_DEDUPLICATION_DELETE_EVENT,
  RESTORE_DELETED_EVENT_UI.
- **2026-05-13 hotfix CLOSED:** `BROADCAST_EVENT_LINK_SUPPORT` — CRM
  Broadcast Wizard now carries `event_id` end-to-end (step 3 dropdown →
  `crm_message_queue.event_id` → `send-message` EF substitutes
  `%registration_url%` per recipient). Unblocks Event #24 (Fri
  2026-05-15) rescue dispatch to 1,187 Prizma leads.

**🟡 M1 Lens Inventory Phase 1A COMPLETE — 2026-05-14.** Schema half of M1
lens expansion shipped (17 new tables + 9 atomic RPCs + K3 trigger + K5 view +
Platform Catalog Admin screen + lens-catalog-import EF). Unblocks M7 (Orders)
and M9 (Lab/KDS) future builds. Phase 1B (6 customer-facing screens) deferred
to a sibling SPEC after Phase 1A FOREMAN_REVIEW closes. SPEC + EXECUTION_REPORT
in `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/`.

**✅ M1B0_PURCHASE_ORDER_SCHEMA CLOSED — 2026-05-15 (Full Auto Pipeline single chat).**
Phase 1B's schema prerequisite. Shipped the 3 schema objects Phase 1A skipped
(`purchase_order`, `purchase_order_line`, `supplier_debt`) + 5 RPCs (incl.
`next_purchase_order_number` distinct from legacy `next_po_number(uuid,text)` via
Iron Rule 21 divergence) + 2 FK back-pointers (FK clauses on Phase 1A phantom
columns `stock_lot.purchase_order_id` + `purchase_receipt.purchase_order_id`) + K2
extension wiring debt creation at receipt close (D-M1-11). 8 commits
(`0c23a15..af3a2fa`) + Reviewer commit (`5d2c421`). 10 MCP migrations applied.
All 6 functional smoke cases PASS on demo (8 sub-cases). Iron Rule 32 §7=`None.`
held across all 8 commits. Reviewer 🟢 PASS at `5d2c421`. **Phase 1B fully
unblocked — customer-facing screen SPECs can build on verified schema + RPCs.**

**✅ M1_LENS_PHASE_1B_FOUNDATION CLOSED — 2026-05-15 (Full Auto Pipeline single chat).**
Foundation half of Phase 1B. Shipped 3 read-heavy lens screens (`lens-inventory.html`,
`lens-active-designs.html`, `lens-pricing.html` + 13 JS files all ≤163 lines per Iron
Rule 12) + 3 metadata RPCs (`toggle_active_offering`, `upsert_pricing_overlay`,
`bulk_apply_pricing_overlay` — all SECDEF + search_path=public + Block A 3-role-aware
JWT guard + REVOKE anon+PUBLIC) + 3 permission keys × 2 tenants seeded
(`lens.inventory.view` / `lens.designs.manage` / `lens.pricing.manage` on demo + prizma).
10 executor commits (`dfa5e81..543fe21`) + 1 Reviewer commit (`f2f430c`). 5 MCP
migrations applied (4 blocks + 1 v2 fix). All 9 functional smoke cases PASS on demo
(live-browser final-mile deferred to Daniel manual QA per Brief). One mid-pipeline
pivot — Block 2 v1 ON CONFLICT ON CONSTRAINT failed because the partial unique index
isn't a constraint — resolved purely via SPEC §0 D11 pre-authorization (CREATE OR
REPLACE v2 with `ON CONFLICT (cols) WHERE pred` index-inference). Zero escalations,
zero Foreman amendments, zero Prizma data writes. Iron Rule 32 §7=`None.` held across
all 10 commits. Reviewer 🟢 PASS (30/30 criteria + 5 spot-checks). Concurrent-Pipeline
orthogonality envelope held through 3 SECURITY_HOTFIX_3 interleaves. SPEC + lifecycle
files in `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_FOUNDATION/`.
**Next:** Daniel manual QA on demo → sibling SPEC `M1_LENS_PHASE_1B_PROCUREMENT`
(3 write screens: PO form + POs List + Goods Receipt).

**✅ M1A-DEBT-01 RESOLVED — 2026-05-14 (Full Auto Pipeline single chat).** Phase 1A
hotfix `M1A_CURRENCIES_GLOBAL_HOTFIX` converted `public.currencies` from per-tenant
to GLOBAL ISO-4217 reference table per Iron Rule 14 documented exception (same
category as `vat_rates`). DROP COLUMN tenant_id + id + is_default; new PK on `code`;
added `decimal_digits INT NOT NULL DEFAULT 2`; RLS pattern flipped from tenant_isolation
to `read_anywhere` + write/update/delete gated on `is_platform_super_admin()` +
service_bypass; seeded ILS / USD / EUR. Unblocks tenant-2 onboarding. SPEC folder:
`modules/Module 1 - Inventory Management/docs/specs/M1A_CURRENCIES_GLOBAL_HOTFIX/`.
TD-2 (migrations git drift) note: migration applied via Supabase MCP only — not mirrored
in `supabase/migrations/*.sql` to avoid Iron Rule 32 destructive-pattern block; documented
in SPEC §7 + sweep into future TD-2 SPEC.

**🎉 Phase 1 of `roles/site-overseer/FUNNEL_ROADMAP.md` COMPLETE — 2026-05-14.**
All 4 Phase 1 SPECs closed in ONE calendar day via Full-Auto Pipeline:
P1.4 (`M4_REGISTER_LEAD_TO_EVENT_RPC_MAP`) + P1.4-followup
(`M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX`) + P1.1
(`M3_UTM_TRIPLE_LAYER_PERSISTENCE`) + P1.2 (`M4_BROADCAST_ID_PROPAGATION`)
+ P1.3 (`M3_SHORTGY_TO_INTERNAL_REDIRECT`). Click→broadcast→touchpoint
attribution chain now intact end-to-end: every customer-facing short-link
click flows through internal `resolve-link` EF and produces
`short_link_clicks` + `crm_lead_touchpoints` rows with `broadcast_id`
attribution. Layer 5 Gap #1 (counter rot) + Gap #2 (broadcast_id never
propagated) + Layer 7 (short.gy bypass) all closed structurally. Phase 4
E1 + E7 (MTA + Customer Journey Analytics) flipped BLOCK → SUPPORT. New
MVP "🔗 קישורים קצרים" tab live in CRM. **Phase 2 unblocked** —
P2.1 (`M4_FB_CAPI_HYBRID_DEDUPLICATION`, HIGH PRIORITY, 6-8 hrs) is
the natural next SPEC to author; P2.2 + P2.3 can follow.

**Production discipline:** SPEC + Foreman + Executor flow on every change.
PR-only merges to main. Read-only by default for Overseer. See
`feedback_production_discipline_post_cutover.md`.

**Design System initiative (2026-05-10 → in progress):** 4-phase platform-wide
design system on M1.5. Phases 1 + 2 closed 2026-05-11 — variables.css defaults
now tenant-neutral (Slate-900 near-black); Prizma's Indigo migrated to
tenants.ui_config; all component CSS token-only + `:focus-visible` baseline
across 5 files per WCAG 2.4.7; new tokens --color-focus-ring + --shadow-focus.

**Phase 3 v1 ARCHIVED 2026-05-11 (superseded by v2)** — v1 (3a/3b/3c +
CONSOLIDATION) produced 45 HTML files but failed its goal: executor staticized
production HTML with near-empty `_tokens.css` (3a inherited everything; 3b/3c
added 6-7 tokens), resulting in three near-identical directions Daniel could
not meaningfully compare. v1 mockup folders moved (via `git mv`) to
`_archive/design-system-mockups-v1-staticized/direction-{1-conservative,
2-modern-clean,3-bold-dense-pro-tool}/`. v1 SPEC folders remain in place as
historical record.

**Full-Auto Pipeline: ✅ 2026-05-11 (M1.5)** — `M1_5_FULL_AUTO_PIPELINE` closed.
The 5-chat manual SPEC dance is retired; new SPECs run end-to-end inside ONE Claude Code chat via skill chaining (Foreman → Executor → Reviewer → Localhost-Tester → Foreman-review). Iron Rule 32 (Destructive Operations Gate) live, enforced by `scripts/checks/destructive-ops-declared.mjs` in pre-commit + CI. Backups are now automatic (auto-trigger on >5 files OR >100 lines OR any rename), not discretionary. Escalation folders scaffolded in M1.5/M3/M4. Two verification SPECs (`TEST_1_DOCS_ONLY` 🟢, `TEST_2_CODE_CHANGE` 🟢 with smoke 7/7) ran end-to-end in one chat.

**Phase 3 v2 CLOSED 2026-05-11** —
`M1_5_DESIGN_SYSTEM_AUTHENTIC_LANGUAGES` shipped 21 HTML files + 3 `_tokens.css`
under `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/language-{a-linear,b-stripe,c-notion}/`.
Three visually-distinct design languages (Linear/Vercel; Stripe Dashboard;
Notion/Airy) across 5 representative screens each (Storefront Studio,
Permissions, Shipments+Boxes, Settings, Suppliers Debt). All light-background,
RTL Hebrew, authored from scratch (NOT staticized — counter-measure to v1
failure root cause). Each `_tokens.css` redefines ≥ 54 CSS custom properties
covering palette, typography, density, radii, shadows. DOM intentionally
varies per language: A = sidebar+breadcrumb, B = top-bar+hero+gradient,
C = minimalist left rail + emoji glyphs. Phase 4
(`M1_5_DESIGN_SYSTEM_PHASE_4_CLOSE`) unblocks — Daniel picks the winning
language. Closes OPEN_TASKS task #1.

---

### Module 3 (Storefront) — historical DNS switch context (April 2026)

**GO verdict for DNS switch** issued 2026-04-18. A comprehensive 15-mission preflight audit (`DNS_SWITCH_PREFLIGHT_AUDIT`)
found **0 blockers**. All prior issues are resolved:

- **develop→main merge: CLOSED** (0 commits divergent)
- **Canonical domain:** `astro.config.mjs` site = `https://prizma-optic.co.il` ✅
- **SEO:** og:image 100% coverage, hreflang on all pages, sitemap 245 URLs clean, 1,671 redirects from old WP site
- **Languages:** HE/EN/RU all serve correctly (76 published pages, all 200)
- **Performance:** YouTube facade, Partytown removed, static assets cached 1yr
- **Security:** 5/6 headers present, all RLS policies canonical JWT-claim pattern

**Remaining SHOULD FIX (not blocking):** `/sitemap.xml` redirect, HTML edge caching (ISR), 13 DB rows with Hebrew titles in EN/RU, 3 cosmetic `/404` hrefs on brand page.

**DNS switch EXECUTED (2026-04-18):** Daniel registered `prizma-optic.co.il` + `www.prizma-optic.co.il` in Vercel Dashboard, then updated DNS records at DreamVPS cPanel: A record `@` → `216.198.79.1` (Vercel), CNAME `www` → `c727e6a69a4a41da.vercel-dns-017.com.`. MX/TXT/DKIM untouched. Awaiting propagation + Vercel auto-SSL.

**Full preflight report:** `modules/Module 3 - Storefront/docs/specs/DNS_SWITCH_PREFLIGHT_AUDIT/PREFLIGHT_REPORT.md`

Overnight SEO audit complete (SPEC `PRE_MERGE_SEO_OVERNIGHT_QA`) —
**verdict: GREEN**, 41 MISSING URLs (0 high-traffic, ≥10 clicks). 14 findings
total (0 CRITICAL / 3 HIGH / 6 MEDIUM / 3 LOW / 2 INFO) fed into a follow-up
fixes SPEC.

**SEO pre-merge fixes complete** (SPEC `PRE_MERGE_SEO_FIXES`, closed
2026-04-16): all 9 fix tasks landed in 5 storefront commits
(`1739f49`→`fe756a7`) plus ERP retrospective `462bd51` + FOREMAN_REVIEW
`8d306c3`. Sitemap broken entries 58→0, og:image coverage on sampled top-20
pages 27%→100%, all 46 multi-hop redirect chains flattened to ≤1 hop,
`robots.txt` reduced to a single `sitemap-dynamic.xml` directive, `/en/*` and
`/ru/*` catch-alls now return real HTTP 404, `npm run build` green. 6
findings logged in the SPEC's retrospective — 1 closed in-SPEC, 5 deferred
(non-blocking: legacy-URL UX remaps, sitemap plugin cleanup, title/alt
Studio work, SEO safety-net scripts port). FOREMAN verdict 🟡 closed with
follow-ups.

**Homepage Hebrew revisions complete** (SPEC `HOMEPAGE_LUXURY_REVISIONS`, executed 2026-04-16 — awaiting FOREMAN_REVIEW):
Daniel's block-by-block feedback after viewing the deployed luxury homepage applied to the Hebrew row only (Prizma `tenant_id` AND `lang='he'`; EN + RU explicitly deferred to `LANGUAGES_FIX` SPEC and verified untouched). New hero video `lz55pwuy9wc` at 0.80 overlay, hero copy rewritten, **`tier1_spotlight` removed from JSONB array** (renderer + Studio schema RETAINED on disk per Rule 20), Story block retitled `40 שנה של בחירה` and rewritten with Daniel's anchor phrase + existing Prizma store photo from `media_library`, Tier2Grid `data.style="carousel"` (auto-marquee). **BrandStrip carousel auto-rotation** added — was a manual snap-x scroll prior; now CSS-only `@keyframes marquee-x` in `global.css` shared with Tier2Grid (Rule 21 — single source). Final HE `block_count=7` (was 8). Migration 125 embeds full pre-update JSONB as `/* SNAPSHOT */` block per Executor Proposal E1. Storefront commits `2547df6 → 0c1bc42 → 1e4347a` + ERP `8c6e69c` + retrospective. 2 findings: M3-EXEC-DEBT-01 (LOW, missing reference file → TECH_DEBT), M3-REPO-DRIFT-01 (LOW, 5 untracked SPEC artifacts → NEW_SPEC sweep). Vercel-Preview visual QA criteria (§3.F) deferred to Daniel.

**Homepage + Header luxury-boutique redesign complete** (SPEC
`HOMEPAGE_HEADER_LUXURY_REDESIGN`, closed 2026-04-16 via Option D re-scope):
positioning pivot from "lab / Rx / multifocal" to "luxury-boutique curator of
5 Tier-1 brands + 6 Tier-2 brands". 8 new CMS block renderers shipped
(`src/components/blocks/{HeroLuxury,BrandStrip,Tier1Spotlight,StoryTeaser,Tier2Grid,EventsShowcase,OptometryTeaser,VisitUs}Block.astro` — tenant-agnostic, all ≤132 lines). Block types registered in ERP Studio
(`studio-block-schemas.js`). Header restructured to 6 nav items (משקפי ראייה
/ משקפי שמש / מותגים / אופטומטריה / הסיפור שלנו / יצירת קשר) across he/en/ru.
Prizma Homepage `blocks` rewritten (migration 123), About rewritten with
40-year narrative + 3 exhibition videos (SILMO Paris, MIDO Milan, Israel),
new `/optometry/` CMS pages seeded with multifocal content absorbed (migration
124). Old `/multifocal-guide/` 301s to `/optometry/` at the Vercel layer.
Storefront commits `ac7ea8a`→`b94554f` (7 commits) + ERP Studio registry
`1b5d822` + ERP retrospective (this commit). 4 findings logged: 1 SPEC-criterion
fix, 2 tech-debt items (missing `storefront_pages_backups` table, oversized
`studio-block-schemas.js` at 627 lines), 1 housekeeping (archive stale
`/multifocal-guide/` CMS rows). FOREMAN verdict pending review.

Module 3.1 (Project Reconstruction) is **complete** — all phases 3A/3B/3C/3D
done. Foundation docs are accurate and current.

**Module 4 (CRM) is in Go-Live phase** — phases A through B9 complete on `develop`,
now merged to `main`. Go-Live replaces the Monday.com→Make→Supabase pipeline with
internal-first Supabase flows. Architecture pivot from C1–C9 (Make-centric) to
P1–P7 (internal-first) decided 2026-04-21, then refined on 2026-04-22 with
Architecture v3: **Make is a send-only pipe, all messaging logic lives in the
`send-message` Edge Function.** Status as of 2026-04-22:
- **P1 (Internal Lead Intake):** ✅ CLOSED — `lead-intake` Edge Function deployed
- **P2a (Lead Management):** ✅ CLOSED — status change, notes, tier transfer wired
- **P2b (Event Management):** ✅ CLOSED — event creation (auto-numbered), status change (10-state), lead registration (via RPC)
- **P3a (Manual Lead Entry):** ✅ CLOSED — `crm-lead-modals.js` (219 lines), `pending_terms` gate blocks Tier 2 transfer until terms approved
- **P3b (Make Message Dispatcher):** ✅ CLOSED, then **superseded** — 8-module Make scenario with native Supabase access; replaced under Architecture v3.
- **P3c+P4 (Messaging Pipeline + Trigger Wiring):** ✅ CLOSED — `send-message` Edge Function (277 lines) owns template fetch, variable substitution, log write, Make webhook call. Make scenario `9104395` rebuilt to 4 modules (Webhook → Router → Global SMS \| Gmail), zero DB access. `lead-intake` now dispatches SMS+Email on new lead (`lead_intake_new`) and on duplicate (`lead_intake_duplicate`). 14/14 success criteria passed on demo. 3 findings logged (M4-INFRA-01 `SUPABASE_ANON_KEY` now returns publishable-key format; M4-R23-01 hardcoded legacy JWT anon key in lead-intake; M4-DEBT-04 lead-intake at 342 lines).
- **P5 (Message Content):** ⬜ Next — author full SMS/Email/HTML templates for all triggers (event open, attendee confirmation, reminders, CX survey, unsubscribe) in `crm_message_templates`.
- **P6 (Full Demo Test):** ⬜ Planned — end-to-end cycle verification on demo tenant.
- **P7 (Prizma Cutover):** ⬜ Planned — form repoint, Monday decommission, production switchover.

The dual-repo split is stable. Both repos use `develop` for active work.
Merges to `main` happen only after Daniel's manual QA on the demo tenant.

---

## 4. Decisions Log

Chronological list of architectural decisions. Each is a fact — do not reverse
without explicit strategic-chat approval.

| Date | Decision | Rationale |
|------|----------|-----------|
| Mar 2026 | Start with inventory module | Access handles sales; inventory = the pain point |
| Mar 2026 | Build alongside Access, replace gradually | Immediate value, no big-bang migration |
| Mar 2026 | ERP = Vanilla JS, no build step | Speed, simplicity, Claude Code compatibility. No TS/Tailwind/Vite for ERP. |
| Mar 2026 | Storefront = Astro + TypeScript + Tailwind | SEO, performance, modern DX. Separate repo. |
| Mar 2026 | Storefront reads only Views + RPC | Security, separation of concerns (Iron Rule #13 / #24) |
| Mar 2026 | tenant_id on every table from day one | SaaS-ready architecture. No retro-fitting (except 4 legacy tables — see §5) |
| Mar 2026 | Module 1.5 before Module 2 | Shared components + atomic RPC + audit infrastructure must exist before platform admin |
| Mar 2026 | Platform Auth (email+password) ≠ Tenant Auth (PIN) | Different trust models, different Supabase auth flows |
| Mar 2026 | Atomic RPC for all quantity changes | Race condition prevention (Iron Rule #1, formalized as #13 for sequential numbers) |
| Mar 2026 | activity_log central + inventory_logs preserved | Don't break Module 1; unified view in future |
| Mar 2026 | 4-tier workflow hierarchy | Architect → Module Strategic → Secondary Chat → Claude Code |
| Mar 2026 | Zero coupling + contracts between modules | Modules communicate only through declared contract functions |
| Mar 2026 | Supplier portal deferred to Module 17 | Requires external auth from Module 2 |
| Mar 2026 | Shipments as standalone module (5.9) | Serves all send types (framing, return, repair, delivery), not just returns |
| Mar 2026 | Lab module extends shipments table | ALTER TABLE, not new tables. KDS = filtered View. Zero changes to existing code. |
| Apr 2026 | Module 3 dual-repo split | Astro build pipeline must be isolated from ERP's static-site deploy. Split by deployment target, not by tenant. |
| Apr 2026 | Iron Rules 24–30 live in storefront CLAUDE.md | Storefront-specific rules (Views-only, image proxy, RTL-first, mobile-first, etc.) owned by storefront repo's constitution |
| Apr 2026 | Module 3.1 introduced as meta-module | Foundation docs drifted during rapid Modules 1–3 build. Dedicated reconstruction pass before more code work. |
| Apr 2026 | Bounded Autonomy execution model | Claude Code executes approved plans end-to-end, stopping only on deviation from stated success criteria (CLAUDE.md §9) |
| Apr 2026 | Cowork→Claude Code handoff pattern | Cowork (strategic role) gathers evidence + writes SPEC + activation prompt; Claude Code (executor role) commits backlog + executes SPEC end-to-end; Cowork writes Foreman Review after. Proven in P1/P2a/P2b — to be documented in opticup-strategic SKILL.md. |
| Apr 2026 | Module repo split after P7 Go-Live | Monorepo blocks parallel work (only one Claude Code session at a time on `develop`). After P7, split each module into its own repo. `shared.js` → shared package (git submodule or npm). Supabase stays as one project (tables already module-scoped). Enables 3-4 parallel Claude Code sessions + SaaS product packaging per module. |
| 2026-04-26 | Make → Optic Up EF integration pattern: iteration over batched-array | After 3 architectural attempts (V1 CreateJSON, V2 mapper.data + array, V3 iteration pivot), confirmed that Make's array-to-JSON serialization is unreliable in raw HTTP bodies. Canonical pattern: 1 HTTP POST per item, flat-object body in `mapper.data` (never `mapper.body`), simple `{{N.field}}` substitutions only. Documented at `modules/Module 4 - CRM/docs/make-patterns/README.md`. Trade ~10× HTTP ops for predictable behavior + partial-failure isolation. Reference scenario: Make `9126542` (Facebook Campaigns → Optic Up CRM). |
| Apr 2026 | DB audit: hybrid approach (option ג) | optic_readonly Postgres role created for future automation; Phase 3A baseline collected manually via Supabase SQL Editor. Automated run-audit.mjs deferred to Module 3 Phase B preamble. |
| Apr 2026 | Parallel execution of 3A / 3B / 3C | Pre-approved by Daniel. All three sub-phases have disjoint file scopes. Commits interleave on develop — cosmetically ugly, functionally correct. |
| Apr 2026 | Cancelled Claude API for translations | Translation now manual: Studio export → external chat → import. Claude API remains active only for content generation, logo normalization, Module 1 scan tracking. |
| Apr 2026 | Module 3.1 (Project Reconstruction) closed | 5 mandatory artifacts produced (UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT, UNIVERSAL_SECONDARY_CHAT_PROMPT, MODULE_DOCUMENTATION_SCHEMA, DANIEL_QUICK_REFERENCE, MASTER_ROADMAP rewrite). DB audit baseline established. 7 security findings documented (4 anon_all leaks + 3 auth.uid tables) and queued for Module 3 Phase B preamble. Module 3 Phase B now unblocked on first gate (TIER-C-PENDING is the second gate). |
| 2026-05-08 | Finance Hub registered as future module (post-launch) | Surfaced during M8 (Payments) design when discussing the check-pipeline screen. Daniel currently manages cash-flow + expenses in BizziBox. Decision: M8 stays narrow (transactional payments + check pipeline + day-close). A separate Finance Hub module (cash-flow projection, expense tracking, future bank/AI integrations) will be built post-launch. NOT in MASTER_LIVE_PLAN — Optic Up ships to LIVE without this module. Permissions reserved for accountant + business-owner (cashiers blocked). Module number TBD. |
| 2026-05-11 | Demo event-link "bug" resolved as Path A2 (Strategic defer) — provision real demo storefront | Daniel reported demo's event-registration SMS link pointed to "opticalis" domain. Diagnosis (`DEMO_HEALTH_CHECK_EVENT_LINK_FIX`) found `buildRegistrationUrl` correctly reads `tenants.ui_config->>'storefront_url'`; demo's value is `https://demo.opticalis.co.il` set 2026-03-29 by `M4_HARDCODED_PRIZMA_REMOVAL`. No code bug. Demo has no live storefront — the configured value points to a non-functional endpoint. **Decision:** do NOT patch `storefront_url` to another non-functional value. Instead provision a real demo storefront on a separate Vercel project mirroring Prizma's supersale forms, then update `storefront_url` to its live URL. Follow-up SPEC stub: `modules/Module 3 - Storefront/docs/specs/M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/SPEC.md`. CRM Migration #3 remains PAUSED until follow-up ships. |
| 2026-05-11 | Demo storefront live on dedicated Vercel project (`M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT` 🟡 closed) | Full-Auto Pipeline ran end-to-end in ONE chat: Foreman authored full SPEC body (replacing the Path-A2 stub) → Executor provisioned Vercel project `opticup-storefront-demo` linked to `OpticaLis/opticup-storefront@main` → 3 of 4 env vars configured (Daniel adds `SUPABASE_SERVICE_ROLE_KEY` manually per Path 2) → deploy READY in ~30s → demo's `tenants.ui_config.storefront_url` updated to `https://opticup-storefront-demo.vercel.app` (single-row UPDATE, demo UUID literal) → Prizma `tenants` row bit-identical pre and post (regression-zero spot-checked independently by Foreman) → smoke 7/7 PASS (form-flow routes, short-link round-trip, URL-builder inspection-only). 2 planned escalations handled: Vercel access (Daniel provided `vcp_` CLI token), and Daniel's mid-pipeline MCP-pivot (Executor surfaced as non-viable — Vercel MCP lacks create_project + env-var primitives; `deploy_to_vercel` would have mutated Prizma per linked `.vercel/project.json`). 3 findings: M3-FINDINGS-01 (LOW, canonical URL bake-in → Phase 2 SPEC), M3-FINDINGS-02 (INFO, `tenants` no `updated_at` trigger → TECH_DEBT), M3-FINDINGS-03 (INFO, Vercel MCP gap → executor skill update). Unblocks: Daniel's manual test cycle on demo, then CRM Migration #3. |
| 2026-05-11 | Demo behavioral parity to Prizma achieved (`DEMO_PARITY_REPLICATION` 🟢 closed) | Full-Auto Pipeline in ONE chat (Foreman → Executor → Foreman): discovery classified 102 tenant_id-bearing base tables (20 Behavioral / 8 Identity / 74 Content / **0 Ambiguous** — no Phase 1.5 escalation triggered). 10 of 12 Behavioral tables received writes (28 row mutations: 12 INSERTs + 16 UPDATEs, all scoped to demo UUID `8d8cfa7e-…cccb`); 2 tables (`permissions`, `roles`) already bit-identical pre-snapshot. Phase 4 verification GREEN across all gates: 12/12 matched-business-key hashes equal between tenants, 12/12 Prizma row counts + hashes identical pre/post (read-only proof — Prizma was not written to), demo `tenants` row + 5/5 Identity-table hashes bit-identical pre/post (`storefront_url` + WhatsApp + employees + AI config untouched), `information_schema.columns` hash `37fb06d29c5846de0ed5e7f6f2209b78` identical pre/post = zero DDL. 16 demo orphan rows flagged + left in place (no DELETE): 6 QA-cruft automation rules + 4 QA-cruft message templates + 6 `document_types` codes. 6 findings: **2 MEDIUM reverse-drift** (Prizma's `document_types` + `payment_methods` are UNDER-seeded vs demo — backfill candidate for `M4_PRIZMA_BEHAVIORAL_BACKFILL` follow-up), 2 LOW QA-cruft cleanup → TECH_DEBT, 2 INFO methodology (codify two-tier hash pattern in executor SKILL). Closes the demo-parity gap surfaced when Daniel saw new event auto-attaches old registrants on demo. Unblocks: Daniel's full manual test cycle on demo (storefront live + behavior 1:1), then CRM Migration #3. |
| 2026-05-15 | PENDING_ENTRIES_AUTO_RESOLUTION closed (🟢) — pending-entries hand-off lifted from culture to infrastructure | `PENDING_ENTRIES_AUTO_RESOLUTION` Full-Auto Pipeline ran end-to-end in ONE chat across all 5 hats (Foreman → Executor → Reviewer → Localhost-Tester → Foreman closure). 3-layer mechanism per Brief: (1) opticup-executor SKILL.md gained mandatory "Step 4.5 — Pending Entries Sweep" — every SPEC closure inventories `_archive/architect-pending-entries/`, applies each pending file's prescribed change, deletes the consumed file, commits as part of closure; (2) `scripts/checks/architect-pending-applied.mjs` new advisory pre-commit check, exit 2 yellow warning when folder non-empty (auto-loaded by `verify.mjs` — no `verify.mjs` edit needed); (3) Sentinel Mission 10.6 new check with locked thresholds (1 file >48h = MEDIUM; 2+ = HIGH). The 1 existing pending file (`2026-05-15_STOREFRONT_PUBLIC_DATA_LAYER.md`) consumed end-to-end as Layer 1 validation — DECISIONS_LOG.md gained row #32 inserted verbatim above row #28 per placement instructions. opticup-architect SKILL.md gained the "Cowork File-Write Capability Map" sub-section (Brief D5) — prevents future Cowork sessions from attempting bash workarounds for `.claude/skills/`. 6 commits `1a22974..<C6>`. Iron Rule 31 exit 0 at every boundary; Iron Rule 32 hook passed every commit (1 declared destructive op, no `--no-verify`). 2 LOW findings (F-1 content-fidelity for "merged to main" aspirational wording in pending row; F-2 Iron Rule 32 auth-parser STAGED-only gap for future Full-Auto SPECs with tracked deletes — small follow-up SPEC stub `M1_5_DESTRUCTIVE_OPS_AUTH_PARSER_HEAD_SCAN`). 4 STOREFRONT_PUBLIC_DATA_LAYER queued skill improvements NOT applied (SQL/Pattern-A specific, orthogonal to this process-infra SPEC; queue intact). **Strategic state:** the 2026-05-15 failure mode (pending file sitting unconsumed across Cowork sessions, Daniel directive #11 "I want infrastructure, not culture") is now structurally resolved. Mirrors STRUCTURE_PROTECTIONS 3-layer pattern. → Full detail: `modules/Module 1.5 - Shared Components/docs/specs/PENDING_ENTRIES_AUTO_RESOLUTION/FOREMAN_REVIEW.md`. |

---

## 5. Known Debt

Each item has a one-line description and a pointer to its authoritative source.
Items are tracked — not fixed — in this document.

### Security debt

| ID | Description | Source | Tracked for |
|----|-------------|--------|-------------|
| SF-1 | ~~**4 pre-multitenancy tables** (`customers`, `prescriptions`, `sales`, `work_orders`) lack `tenant_id` and have `anon_all_*` RLS policies granting unrestricted public read/write~~ | ✅ **RESOLVED** — Phase B Core 2026-04-12. All 4 tables converted to canonical JWT-claim RLS pattern. | — |
| SF-2 | ~~**supplier_balance_adjustments.service_bypass** is misnamed — grants access to any connection without `app.tenant_id` session var, not just service_role~~ | ✅ **RESOLVED** — Phase B Core 2026-04-12. RLS rewritten to canonical JWT-claim pattern. | — |
| SF-3 | ~~**3 tables use auth.uid() as tenant_id** (`brand_content_log`, `storefront_component_presets`, `storefront_page_tags`) — architecturally broken; user UUID compared against tenant UUID~~ | ✅ **RESOLVED** — Phase B Core 2026-04-12. All 3 tables converted to canonical JWT-claim RLS pattern. | — |

### RLS pattern debt

| ID | Description | Source | Tracked for |
|----|-------------|--------|-------------|
| RLS-1 | ~~**4 tables use legacy session-var pattern** (`media_library`, `supplier_balance_adjustments`, `campaigns`, `campaign_templates`) instead of standard JWT-claim pattern~~ | ✅ **RESOLVED** — Phase B Core 2026-04-12. All 4 tables + 7 additional tables (11 total) converted to canonical JWT-claim pattern in commits landing on `develop`. | — |

### Tooling debt

| ID | Description | Source | Tracked for |
|----|-------------|--------|-------------|
| TOOL-1 | **run-audit.mjs not yet built** — DB audit baseline must be collected manually via SQL Editor. Requires DATABASE_URL in `~/.optic-up/credentials.env`. | Phase 3A Part 1.5 handback + `db-audit/audit-queries.sql` | Module 3 Phase B preamble |
| TOOL-2 | **Iron Rule #13 FOR UPDATE verification** — the 4 `next_*_number` RPCs exist but function bodies not inspected (information_schema limitation). Compliance unconfirmed. | `docs/GLOBAL_SCHEMA.sql` FUNCTIONS section | Separate IR-13 audit task |

### Other debt

| ID | Description | Source | Tracked for |
|----|-------------|--------|-------------|
| MISC-1 | **CSS file-size violations** — `css/employees.css` (397 lines) + historical `archive/` HTML files exceed 350-line limit. Pre-existing from Phase 0A baseline (417 violations, 39 warnings). | `TECH_DEBT.md` #3 (Phase 0A baseline snapshot) | Address when modules are next touched |
| MISC-2 | **GLOBAL_SCHEMA.sql previously declared zero views** — now fixed in Phase 3A Part 2 (commit `3857b8a`). | Phase 1A §4 punch list | ✅ Resolved |
| M1A-DEBT-01 | ~~**`currencies` table was per-tenant + empty** — blocked tenant-2 onboarding and forced supplier_catalog_offering.currency_code to default TEXT 'ILS' instead of FK-validating against currencies(code).~~ | Phase 1A FOREMAN_REVIEW findings M1A-SPEC-02 + M1A-SPEC-05 | ✅ **RESOLVED 2026-05-14** via `M1A_CURRENCIES_GLOBAL_HOTFIX` SPEC. Currencies is now GLOBAL ISO-4217 reference; seeded ILS/USD/EUR; RLS read-anywhere + platform-admin-write. |
| M1A-DEBT-02 | ~~**M1 `docs/db-schema.sql` Phase 1A summary append blocked by pre-existing UNIQUE-without-tenant-id violations + 38 rule-15 false-positives on quoted policy names**~~ | Phase 1A FOREMAN_REVIEW deferred-doc item | ✅ **RESOLVED 2026-05-15** via `M1A_DEBT_SWEEP` SPEC commit `fdf3e2c`. 4 real UNIQUE constraints patched to include tenant_id (document_links, payment_allocations, conversation_participants, message_reactions). Phase 1A 17-table + 9-RPC + K3 trigger + K5 view summary appended. 2 doc-sync fixes: line-767 comment + expense_folders RLS lines. |
| M1A-DEBT-03 | ~~**`T.CURRENCIES` constant + `currencies` FIELD_MAP entries missing in shared.js / shared-field-map.js**~~ | M1A_CURRENCIES_GLOBAL_HOTFIX FOREMAN_REVIEW finding M1A-FINDINGS-05 | ✅ **RESOLVED 2026-05-15** via `M1A_DEBT_SWEEP` SPEC commit `52088ed`. `T.CURRENCIES = 'currencies'` added in js/shared.js Global-reference section; 6-column `currencies:` entry added in js/shared-field-map.js (code/name/symbol/decimal_digits/is_active/created_at). |
| M1_5_VERIFY_HOOKS_REGEX_FIXES | ~~**rule-15-rls.mjs flagged quoted policy names as missing RLS (42+ false positives observed); rule-21-orphans.mjs flagged indented local arrow-fns across files as duplicates**~~ | Phase 1A FOREMAN_REVIEW M1A-INFRA-01 + RECEIPT_FORM_FIXES_FROM_MANAGER SESSION_CONTEXT note | ✅ **RESOLVED 2026-05-15** via `M1A_DEBT_SWEEP` SPEC commit `913fa47`. rule-15 policyRE now accepts `(?:\w+\|"[^"]+")`. rule-21 PATTERNS now anchor at `^` with `/gm` flag (top-level only). Self-tests PASS for both. Full regression `verify.mjs --full` exit 0. |
| RULE18-COMMENT-FALSE-POSITIVE | rule-18-unique-tenant.mjs UNIQUE_RE matches `(NNN)` patterns inside `--` line comments and `/* */` block comments — 2 occurrences now (line 767 of M1 db-schema.sql + line 2045 added 2026-05-15 by M1A_OPERATIONS_RPCS_FIX close commit, both worked around by comment-edit) | M1A_DEBT_SWEEP FINDINGS-03 (2026-05-15) + M1A_OPERATIONS_RPCS_FIX EXECUTION_REPORT (2026-05-15) | OPEN. Proposed fix: strip line + block comments from `content` before applying `UNIQUE_RE` in the hook. Effort ~15 min + self-test. Bundle into a future verify-hooks maintenance Pipeline; recommended before Phase 1B starts touching shared SQL docs. |
| M1A-DEBT-04 | **Demo lens-catalog seed fixtures persist from M1A_OPERATIONS_RPCS_FIX smoke** — 2 demo `tenant_location` rows (Smoke Loc A / Smoke Loc B, short_codes STA/STB) + 1 global lens_brand+design+variant (`LV-TST001`) + 1 demo `supplier_catalog_offering` (100 ILS) + ~4 demo stock_movement + stock_lot + purchase_receipt rows tagged `M1A smoke`. Useful as Phase 1B's first-smoke seed; alternative is a proper `modules/Module 1/scripts/seed-demo-lens-fixtures.sql`. | M1A_OPERATIONS_RPCS_FIX FINDINGS F-3 + F-8 + FOREMAN_REVIEW (2026-05-15) | OPEN — low priority. Phase 1B SPEC §0 must explicitly cite "reuse persistent fixtures" OR "replace with seed script". Either path acceptable; no urgency to clean up demo. |
| M1A_OPERATIONS_RPCS_FIX | ~~**8 SPEC-original operations-layer bugs + 2 pre-existing orchestrator runtime defects discovered by mandatory smoke**~~ | Phase 1A FOREMAN_REVIEW + Strategic-Review + Code-Review reports (2026-05-15) | ✅ **RESOLVED 2026-05-15** via `M1A_OPERATIONS_RPCS_FIX` SPEC, 13 commits `b0d44c1..5deb8fa`. 10 fixes shipped: record_stock_movement double-add + ON CONFLICT inference, REVOKE/GRANT on 10 SECDEF fns, next_lens_variant_display_id JWT guard, v_suppliers_for_m9 anon ACL, K3 queue idempotency UNIQUE + ON CONFLICT DO NOTHING, lens-catalog-import config.toml + fail-closed gate, record_transfer 19-arg fix (Amendment #1), record_adjustment_found 19-arg fix (Amendment #2). All 6 functional smoke cases PASS on demo. Phase 1B unblocked. |
| M1B0_PURCHASE_ORDER_SCHEMA | ~~**3 schema objects + 5 supporting RPCs + 2 FK back-pointers + K2-debt wiring missing — blocked Phase 1B's PO + Active POs List + Goods Receipt screens (D-M1-07/10/11)**~~ | Phase 1A Strategic Review A-02 + C-01 (2026-05-15) | ✅ **RESOLVED 2026-05-15** via `M1B0_PURCHASE_ORDER_SCHEMA` SPEC, 8 commits `0c23a15..af3a2fa` (+ REVIEW commit `5d2c421`). 10 MCP migrations shipped: purchase_order + purchase_order_line + supplier_debt tables (canonical 2-policy RLS), FK clauses on Phase 1A phantom columns stock_lot.purchase_order_id + purchase_receipt.purchase_order_id, 5 RPCs (next_purchase_order_number distinct from legacy next_po_number via Iron Rule 21 divergence, place_purchase_order, mark_po_sent, cancel_purchase_order, m1_create_supplier_debt_from_receipt), K2 extended with subtotal accumulator + IL VAT lookup + debt RPC call (D-M1-11 wiring). All 6 functional smoke cases PASS on demo (8 sub-cases counting Case 4 + Case 5). Reviewer 🟢 PASS; 30/30 success criteria verified live. Phase 1B fully unblocked. |
| M1B0-DEBT-01 | **`js/shared.js` (322 lines) + `js/shared-field-map.js` (313 lines) crossed 300-line soft target after M1B0** — both within hard 350 limit | M1B0 FINDINGS F-4 + REVIEW §4.1 (2026-05-15) | OPEN — low priority. Future cleanup SPEC could extract per-domain FIELD_MAP sub-files. Not blocking Phase 1B. |
| M1B0-DEBT-02 | **Naming asymmetry `purchase_receipt_line.unit_cost_currency` vs `purchase_order_line.currency_code`** — same conceptual field, different column names on adjacent tables | M1B0 REVIEW §4.2 Reviewer observation (2026-05-15) | OPEN — cosmetic. Future cleanup SPEC could normalize. Not blocking Phase 1B. |
| M1A-DEBT-04 (extended) | M1B0 smoke artifacts persist on demo (2 PO rows + 1 receipt + 1 supplier_debt at total_amount=234.82) — extends existing M1A-DEBT-04 entry. M1_LENS_PHASE_1B_FOUNDATION further extended the lineage: 1 `tenant_active_offerings` row (`offering=afbc1b20-..., is_active=false`) + 2 `pricing_overlay` rows (10% inline + 5% bulk, both `status=active`) on demo. Useful as Phase 1B procurement-half seed; no urgency to clean. | M1B0 FINDINGS F-6 + M1_LENS_PHASE_1B_FOUNDATION FINDINGS F-4 (2026-05-15) | OPEN — useful as Phase 1B seed; no urgency to clean. |
| M1_LENS_PHASE_1B_FOUNDATION | ~~**Foundation half of Phase 1B: 3 read screens + 3 metadata RPCs missing — blocked Inventory display + Active Designs toggle + Pricing 3-col + inline + bulk per D-M1-04**~~ | Phase 1A FOREMAN_REVIEW + Brief 2026-05-15 | ✅ **RESOLVED 2026-05-15** via `M1_LENS_PHASE_1B_FOUNDATION` SPEC, 10 commits `dfa5e81..543fe21` (+ REVIEW commit `f2f430c`). 5 MCP migrations + 3 HTML pages + 13 JS files + 6 permission rows. All 9 functional smoke cases PASS on demo. Reviewer 🟢 PASS; 30/30 success criteria verified live. Zero escalations. **Phase 1B foundation half DONE — sibling SPEC `M1_LENS_PHASE_1B_PROCUREMENT` queued after Daniel manual QA.** |
| M1B-FOUNDATION-DEBT-01 | **`pricing_overlay` status transitions (proposed/active/rejected/superseded/expired) are not audit-logged per Iron Rule 2** — UPSERT RPCs (`upsert_pricing_overlay`, `bulk_apply_pricing_overlay`) write the row but no `writeLog()` / `ActivityLog.write` call. | M1_LENS_PHASE_1B_FOUNDATION Reviewer §4 Rule 2 observation + FOREMAN §4 (2026-05-15) | OPEN — low priority. Recommended action: future SPEC adds `pricing_overlay_audit` table OR routes status transitions through a new RPC that calls `writeLog()`. Not blocking Phase 1B procurement. |

---

## 6. Module 3 Phase B — Preamble Checklist

### First preamble actions (SECURITY-CRITICAL — must run before any other Phase B work)

These items came out of Module 3.1 Phase 3A's live DB audit, with
post-execution verification by Daniel on 2026-04-11. Tables involved
are currently empty (modules not yet built), but the underlying
patterns are architecturally broken and will become production data
leaks the moment those modules start writing data.

**The canonical reference pattern** for fixing all of these is in
`opticup/CLAUDE.md` Iron Rule #15 under "Canonical RLS Pattern".
The reference implementation lives in `pending_sales` policies and
should be copied verbatim, not reinvented.

1. **Replace `anon_all_*` policies on confirmed leak tables** (4 tables, all verified):
   - `customers` — verified leak (using `true`, no tenant filter)
   - `prescriptions` — verified leak (using `true`, no tenant filter)
   - `sales` — verified leak (using `true`, no tenant filter) — Phase 3D Manual Action #2
   - `work_orders` — verified leak (using `true`, no tenant filter) — Phase 3D Manual Action #2
   Replace each with the canonical two-policy pattern from CLAUDE.md
   (service_bypass policy on service_role + tenant_isolation policy
   on public with the JWT-claim USING clause).

2. **Fix `auth.uid as tenant_id` policies on 3 tables** (verified by Phase 3D Manual Action #1):
   - `brand_content_log`
   - `storefront_component_presets`
   - `storefront_page_tags`
   These tables use `auth.uid()` in the tenant_id slot, which is
   architecturally wrong: `auth.uid()` is the Supabase Auth user ID,
   not a tenant identifier. Optic Up uses PIN auth via the
   `pin-auth` Edge Function (not Supabase Auth directly), so
   `auth.uid()` returns NULL or wrong values for tenant context.
   Rewrite each policy using the canonical pattern from CLAUDE.md.

3. **Add RLS audit to `scripts/verify.mjs`** — to catch these
   patterns automatically in future modules. The audit should flag:
   (a) any policy that grants ALL operations to `anon` role with
   `using (true)` or no tenant_id filter,
   (b) any policy that uses `auth.uid()` in a tenant comparison.
   This prevents the same bug class from re-entering the project.

### Other preamble items (non-security)

4. **Build `run-audit.mjs`** (Module 3.1 deferred deliverable from
   Phase 3A). Requires `DATABASE_URL` added to
   `~/.optic-up/credentials.env`. The script should connect via
   Session pooler (port 6543, IPv4), execute the 6 audit blocks
   from `db-audit/audit-queries.sql`, and write results to
   `db-audit/01-tables.md` ... `06-sequences.md` in the same
   format as the manual baseline from 2026-04-11. Once built,
   this script becomes the canonical way to refresh the DB audit
   baseline and eliminates the manual SQL Editor workflow.

5. **TIER-C-PENDING cleanup round** — addresses the markers across
   VIEW_CONTRACTS, ARCHITECTURE, SCHEMAS, and TROUBLESHOOTING
   that Phase A deferred. These are NOT Module 3.1's responsibility
   and were intentionally left untouched.

### NOT a finding — explicitly removed from this list

The `service_bypass` name on `supplier_balance_adjustments` was
initially flagged by Phase 3A as a misleading name. Daniel's
verification on 2026-04-11 confirmed this is a **false positive**:
`service_bypass` is the canonical project naming for legitimate
`service_role` bypass policies. `pending_sales` uses the same name
with the canonical pattern. This is not a finding and does not
need a rename. It is the policy name, not a column name.

### Verification status (from Phase 3D Manual Action #2)

`sales` and `work_orders` were initially "suspected" by Phase 3A
based on naming-pattern similarity to `customers`/`prescriptions`.
Phase 3D Manual Action #2 (executed 2026-04-11) ran live SQL
against `pg_policies` and confirmed both tables have:
- `anon_all_sales` policy with `qual = true` (no tenant filter)
- `anon_all_work_orders` policy with `qual = true` (no tenant filter)

A separate row-count check (Phase 3D Step 6.5) confirmed both
tables are empty at the time of verification, so the leak is
not yet active in production data — but the architectural bug
is real and must be fixed before either module starts writing.

---

## 7. Next Step

**Module 3 DNS switch: GO** (preflight audit 2026-04-18, 0 blockers).

**Immediate:** DNS switch execution — Daniel verifies Vercel domain config, then flips DNS records.

**Post-launch polish (Module 3):**
- HTML edge caching (ISR) for faster page loads
- Content-Security-Policy header
- DB title cleanup (13 EN/RU rows with Hebrew titles)
- BrandShowcase scroll behavior fixes
- Homepage revisions queue (Daniel's remaining feedback)
- Contact form lead-capture (Resend integration — deferred by Daniel)

**Module 4 (CRM) Go-Live:** P1/P2a/P2b/P3a/P3b/P3c+P4 closed (messaging pipeline operational under Architecture v3 — Make is a send-only pipe, all logic in `send-message` Edge Function). Next: P5 (message content — author SMS/HTML Email templates), then P6 (full demo test), then P7 (Prizma cutover + Monday decommission).

**Post-P7 planned:** Module repo split — each module gets its own repo for parallel Claude Code sessions (see §4 Decisions Log, Apr 2026).

---

## 8. Document Map

| What you need | Where to find it |
|---------------|-----------------|
| Architecture (dual-repo diagram, contracts, modules) | `opticup/docs/GLOBAL_MAP.md` |
| Data model (84 tables, 24 views, 162 RLS policies, 41 functions) | `opticup/docs/GLOBAL_SCHEMA.sql` |
| Iron Rules 1–23 (all ERP work) | `opticup/CLAUDE.md` §4–§6 |
| Iron Rules 24–30 (storefront work) | `opticup-storefront/CLAUDE.md` §5 |
| DB audit baseline (live DB as of 2026-04-11) | `modules/Module 3.1 - Project Reconstruction/db-audit/01-tables.md` .. `06-sequences.md` |
| Module 3.1 audit reports | `modules/Module 3.1 - Project Reconstruction/docs/audit-reports/` |
| Code conventions (UI patterns, idioms) | `opticup/docs/CONVENTIONS.md` |
| Known issues | `opticup/docs/TROUBLESHOOTING.md` |
| Per-module specs and roadmaps | `opticup/modules/Module N - .../docs/MODULE_SPEC.md` and `ROADMAP.md` |
| Storefront architecture | `opticup-storefront/ARCHITECTURE.md` |
| Storefront view contracts | `opticup-storefro