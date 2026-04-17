# Optic Up — Master Roadmap

> **Last reconciled:** 2026-04-15 (Module 3 Tenant Feature Gating & Cleanup SPEC)
>
> This document is the canonical **build sequence**, **decision log**, and
> **known-debt register** for the Optic Up platform.
> For architecture see `docs/GLOBAL_MAP.md`.
> For the data model see `docs/GLOBAL_SCHEMA.sql`.
>
> If a new strategic chat is opened, paste this file and say:
> "You are the Main Strategic Chat for Optic Up. Read this document and continue from Section 7."

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
| 3 | Storefront | 🟢 Code-complete — awaiting Daniel QA + DNS switch | opticup-storefront | Public storefront: CMS pages, campaigns, blog, AI content, translations (he/en/ru), media library, lead forms, brand pages, SEO. Phase B + Pre-Launch Hardening + Close-Out complete 2026-04-15. 25 tables. |
| 3.1 | Project Reconstruction | ✅ Complete | opticup | Meta-module: foundation doc rewrites, DB audit baseline, roadmap reconciliation. Does not own code — owns documentation accuracy. 3A/3B/3C/3D all complete. |
| 4 | CRM | ⬜ Not started | opticup (planned) | Customer management — replaces Monday.com for leads. Prerequisite for orders + prescriptions. |
| 5–22 | Future modules | ⬜ Not started | — | Orders, prescriptions, payments, lab/KDS, lenses, branches, WhatsApp, reports, supplier portal, content hub, B2B network, AI support, WooCommerce sync, POS. |

**Detailed per-module scope** lives in each module's `README.md` and `MODULE_SPEC.md`
under `opticup/modules/Module N - .../`.

---

## 3. Current State (April 2026)

Module 3 (Storefront) is **code-complete** as of 2026-04-15. The full chain —
Phase B Core (RLS hardening), B6 (session key rename), Pre-Launch Hardening
SPEC (2026-04-14), Close-Out SPEC (2026-04-15), Tenant Feature Gating &
Cleanup SPEC (2026-04-15), and **BLOG_PRE_MERGE_FIXES SPEC** (2026-04-15,
commits `678a82e`→`3e92f7f`) — is committed to `develop`. All tenant-hardcoding
findings resolved, translate-content wrapper regression fixed, WordPress parity
pages inserted, 8 storefront HTML pages gated via plan feature flags, Guardian
alerts up to date. **Blog pre-merge content cleanup complete**: 19 WordPress
images migrated into Studio Media (`media-library` bucket, folder "בלוג") with
dedup, 132 posts rewritten to new image URLs, grammar-article en+ru variants
soft-deleted (he preserved), 58 Hebrew slugs transliterated (19 en → ASCII,
39 ru → Cyrillic). 82 posts with hardcoded Instagram handle `optic_prizma`
deferred to post-merge SPEC `BLOG_INSTAGRAM_TEMPLATIZE` (non-blocker).

The sole remaining gate for DNS switch is **Daniel-run QA** on localhost
(runbook: `modules/Module 3 - Storefront/docs/QA_HANDOFF_2026-04-14.md`).
After QA passes, Daniel merges `develop → main` in both repos, then switches
DNS for `www.prizma-optic.co.il`.

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

**On deck:** Module 4 (CRM) — customer management to replace Monday.com for
leads. Prerequisite for orders + prescriptions modules.

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
| Mar 2026 | 4-tier workflow hierarchy | Main Strategic → Module Strategic → Secondary Chat → Claude Code |
| Mar 2026 | Zero coupling + contracts between modules | Modules communicate only through declared contract functions |
| Mar 2026 | Supplier portal deferred to Module 17 | Requires external auth from Module 2 |
| Mar 2026 | Shipments as standalone module (5.9) | Serves all send types (framing, return, repair, delivery), not just returns |
| Mar 2026 | Lab module extends shipments table | ALTER TABLE, not new tables. KDS = filtered View. Zero changes to existing code. |
| Apr 2026 | Module 3 dual-repo split | Astro build pipeline must be isolated from ERP's static-site deploy. Split by deployment target, not by tenant. |
| Apr 2026 | Iron Rules 24–30 live in storefront CLAUDE.md | Storefront-specific rules (Views-only, image proxy, RTL-first, mobile-first, etc.) owned by storefront repo's constitution |
| Apr 2026 | Module 3.1 introduced as meta-module | Foundation docs drifted during rapid Modules 1–3 build. Dedicated reconstruction pass before more code work. |
| Apr 2026 | Bounded Autonomy execution model | Claude Code executes approved plans end-to-end, stopping only on deviation from stated success criteria (CLAUDE.md §9) |
| Apr 2026 | DB audit: hybrid approach (option ג) | optic_readonly Postgres role created for future automation; Phase 3A baseline collected manually via Supabase SQL Editor. Automated run-audit.mjs deferred to Module 3 Phase B preamble. |
| Apr 2026 | Parallel execution of 3A / 3B / 3C | Pre-approved by Daniel. All three sub-phases have disjoint file scopes. Commits interleave on develop — cosmetically ugly, functionally correct. |
| Apr 2026 | Cancelled Claude API for translations | Translation now manual: Studio export → external chat → import. Claude API remains active only for content generation, logo normalization, Module 1 scan tracking. |
| Apr 2026 | Module 3.1 (Project Reconstruction) closed | 5 mandatory artifacts produced (UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT, UNIVERSAL_SECONDARY_CHAT_PROMPT, MODULE_DOCUMENTATION_SCHEMA, DANIEL_QUICK_REFERENCE, MASTER_ROADMAP rewrite). DB audit baseline established. 7 security findings documented (4 anon_all leaks + 3 auth.uid tables) and queued for Module 3 Phase B preamble. Module 3 Phase B now unblocked on first gate (TIER-C-PENDING is the second gate). |

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

**Module 3.1 is COMPLETE** (closed April 11, 2026 — see §4 Decisions Log).

**Active:** Module 3 Phase B (gated on dual preamble — see §6 above).
- First gate: ✅ Module 3.1 closure (this module)
- Second gate: ⬜ Phase B preamble cleanup (security-critical items + TIER-C-PENDING)

**On deck:** Module 4 (CRM) once Module 3 reaches DNS switch readiness.

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
| Storefront view contracts | `opticup-storefront/VIEW_CONTRACTS.md` |
| Original 28-module project vision (historical) | `opticup/docs/PROJECT_VISION.md` |
| Module Strategic Chat opening prompt | `opticup/UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` |
| Secondary Chat operating instructions | `opticup/UNIVERSAL_SECONDARY_CHAT_PROMPT.md` |
| 