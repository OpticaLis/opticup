# Optic Up — Master Roadmap

> **Last reconciled:** 2026-04-11 (Module 3.1 Phase 3A Part 2)
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
| 3 | Storefront | 🟡 Phase B remediation | opticup-storefront | Public storefront: CMS pages, campaigns, blog, AI content, translations (he/en/ru), media library, lead forms, brand pages, SEO. Phase A sealed 2026-04-11. 25 tables. |
| 3.1 | Project Reconstruction | 🟡 In execution | opticup | Meta-module: foundation doc rewrites, DB audit baseline, roadmap reconciliation. Does not own code — owns documentation accuracy. Phase 3A in progress; 3B/3C complete. |
| 4 | CRM | ⬜ Not started | opticup (planned) | Customer management — replaces Monday.com for leads. Prerequisite for orders + prescriptions. |
| 5–22 | Future modules | ⬜ Not started | — | Orders, prescriptions, payments, lab/KDS, lenses, branches, WhatsApp, reports, supplier portal, content hub, B2B network, AI support, WooCommerce sync, POS. |

**Detailed per-module scope** lives in each module's `README.md` and `MODULE_SPEC.md`
under `opticup/modules/Module N - .../`.

---

## 3. Current State (April 2026)

Module 3.1 (Project Reconstruction) is the active meta-module. Its Phase 3A is
rewriting the 7 foundation docs that drifted during the rapid build-out of
Modules 1 through 3. Phases 3B (mandatory artifacts) and 3C (Module 1
housekeeping + Module 3 Side-A archive) ran in parallel with 3A — both
complete. Phase 3D (closure ceremony) follows after 3A finishes.

Module 3 (Storefront) is paused at Phase B remediation. Phase A sealed
2026-04-11 with 15 reference files in the storefront repo (CLAUDE.md,
ARCHITECTURE.md, VIEW_CONTRACTS.md, SCHEMAS.md, etc.). Before Phase B code
work resumes, the Phase B preamble checklist (Section 6 below) must be
completed — it addresses security debt and tooling gaps discovered during the
Module 3.1 DB audit.

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

---

## 5. Known Debt

Each item has a one-line description and a pointer to its authoritative source.
Items are tracked — not fixed — in this document.

### Security debt

| ID | Description | Source | Tracked for |
|----|-------------|--------|-------------|
| SF-1 | **4 pre-multitenancy tables** (`customers`, `prescriptions`, `sales`, `work_orders`) lack `tenant_id` and have `anon_all_*` RLS policies granting unrestricted public read/write | `docs/GLOBAL_SCHEMA.sql` SECURITY-FINDING #1 + `db-audit/04-policies.md` | Module 3 Phase B preamble |
| SF-2 | **supplier_balance_adjustments.service_bypass** is misnamed — grants access to any connection without `app.tenant_id` session var, not just service_role | `docs/GLOBAL_SCHEMA.sql` SECURITY-FINDING #2 | Module 3 Phase B preamble |
| SF-3 | **3 tables use auth.uid() as tenant_id** (`brand_content_log`, `storefront_component_presets`, `storefront_page_tags`) — architecturally broken; user UUID compared against tenant UUID | `docs/GLOBAL_SCHEMA.sql` SECURITY-FINDING #3 | Module 3 Phase B preamble |

### RLS pattern debt

| ID | Description | Source | Tracked for |
|----|-------------|--------|-------------|
| RLS-1 | **4 tables use legacy session-var pattern** (`media_library`, `supplier_balance_adjustments`, `campaigns`, `campaign_templates`) instead of standard JWT-claim pattern | `docs/GLOBAL_SCHEMA.sql` CONVENTIONS section + `db-audit/04-policies.md` | Module 3 Phase B preamble |

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

This checklist MUST be completed by the Module 3 strategic chat BEFORE starting
Phase B code work. Each item is a prerequisite, not optional cleanup.

- [ ] **Build `run-audit.mjs` script**
  Requires `DATABASE_URL` added to `~/.optic-up/credentials.env`.
  Connect via Session pooler (port 6543, IPv4).
  Execute the 6 audit blocks from `db-audit/audit-queries.sql`.
  Write results to `db-audit/01-tables.md` ... `06-sequences.md`
  in the same format as the manual baseline from 2026-04-11.
  Once built, this script becomes the canonical way to refresh
  the DB audit baseline and eliminates the manual SQL Editor workflow.

- [ ] **Security debt cleanup: retrofit 4 legacy tables with tenant_id**
  Add `tenant_id UUID NOT NULL REFERENCES tenants(id)` to `customers`,
  `prescriptions`, `sales`, `work_orders`. Replace `anon_all_*` policies
  with standard `tenant_isolation` policies (Pattern 1 — JWT claim).
  See `docs/GLOBAL_SCHEMA.sql` SECURITY-FINDING #1 and
  `db-audit/04-policies.md` for current policy text.

- [ ] **RLS pattern cleanup: migrate 4 session-var tables + fix 3 auth.uid() tables**
  Migrate `media_library`, `supplier_balance_adjustments`, `campaigns`,
  `campaign_templates` from session-var pattern (`current_setting('app.tenant_id')`)
  to JWT-claim pattern (standard).
  Fix the 3 tables using `auth.uid()` as tenant_id
  (`storefront_component_presets`, `brand_content_log`, `storefront_page_tags`)
  — this is a bug, see SECURITY-FINDING #3.

- [ ] **Fix supplier_balance_adjustments.service_bypass policy**
  Currently defined as `(current_setting('app.tenant_id', true) IS NULL)`
  which grants access to anyone without session context instead of only
  `service_role`. Replace with a proper service-role bypass:
  `FOR ALL TO service_role USING (true)`.
  See `docs/GLOBAL_SCHEMA.sql` SECURITY-FINDING #2.

---

## 7. Next Step

Module 3.1 Phase 3A is the immediate active work. After 3A completes, Phase 3D
(closure ceremony) cross-links the rewritten foundation docs, produces the
Module 3.1 closure commit, and tags `v3.1.closure`. After Module 3.1 closes,
the Module 3 strategic chat resumes with the Phase B preamble checklist
(Section 6 above) before resuming Phase B remediation code work.

The long-term sequence after Module 3 Phase B: Module 4 (CRM) → Module 5
(Orders) → Module 6 (Prescriptions) → Module 7 (Payments). This ordering is
driven by data dependencies: orders need customers, prescriptions need
customers + orders, payments need orders.

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

---

*End of MASTER_ROADMAP.md. Prior version (March 2026, Hebrew, 382 lines) backed up
under `modules/Module 3.1 - Project Reconstruction/backups/M3.1-3A_2026-04-11/MASTER_ROADMAP.md`.*
