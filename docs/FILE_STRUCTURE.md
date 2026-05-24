# File Structure — opticup (ERP)

> **Purpose:** Complete file tree of the `opticup` repo with one-line descriptions.
> **Updated when:** A file is added, removed, renamed, or significantly repurposed.
> **Read when:** You need to find a file, understand what lives where, or verify no duplicate exists (Rule 21).
> **Do NOT read at session start** — open only when needed.

> **Note on storefront files:** Several `storefront-*.html` and `modules/storefront/` files physically live in this repo because they are the **Studio / CMS admin UI** that staff use to manage storefront content. The public-facing site itself lives in the separate `opticup-storefront` repo.

---

## Repo Root

> **Discipline:** every file/directory at root must fall into one of the 3 categories defined in `CLAUDE.md` §0.5 (Root Discipline Rule). Anything outside these categories belongs in `_archive/<subfolder>/`.

**Category 1 — Technical Infrastructure** (`CLAUDE.md`, `README.md`, `package.json`, `package-lock.json`, `.gitignore`, `.mcp.json`, `.nojekyll`, `CNAME`, `favicon.ico`, plus hidden infra dirs `.git/`, `.github/`, `.husky/`, `.vscode/`, `.claude/`, `node_modules/`).

**Category 2 — Live Sources of Truth** (`MASTER_ROADMAP.md`, `TECH_DEBT.md`, `docs/`, `modules/`, `roles/`, `_archive/`, `migrations/`, `scripts/`, `shared/`, `js/`, `css/`, `supabase/`, `tests/`, `campaigns/`, `watcher-deploy/`, `opticup-skills.plugin`, `serve.js`).

**Category 3 — Application Entrypoints (HTML at root, GitHub Pages routing):**

```
opticup/
├── index.html                  — home screen: PIN login + module cards
├── admin.html                  — platform admin entry (Module 2)
├── crm.html                    — CRM module entry (Module 4)
├── customers.html              — M5 customer card (Phase D 2026-05-23 — single-customer 5-tab view; ?customer_id=<uuid>)
├── inventory.html              — inventory management module (full app)
├── suppliers-debt.html         — supplier debt tracking module
├── employees.html              — standalone employee management page
├── lens-catalog-admin.html     — Platform Catalog Admin (Optic Up team only — M1 Lens Phase 1A)
├── lens-inventory.html         — Lens Inventory display (M1 Lens Phase 1B-foundation, store staff)
├── lens-active-designs.html    — Lens designs activation toggle (M1 Lens Phase 1B-foundation, store manager)
├── lens-pricing.html           — Lens catalog & pricing 3-col + inline + bulk (M1 Lens Phase 1B-foundation, store manager)
├── shipments.html              — shipments & box management module
├── settings.html               — tenant settings (business info, financial config, display prefs)
├── error.html                  — generic error page
├── landing.html                — public landing page
├── r.html                      — short-link redirect handler
├── storefront-settings.html    — storefront config: WhatsApp, booking, notifications (Phase 4B)
├── storefront-products.html    — storefront product overrides + bulk select (Phase 4B)
├── storefront-glossary.html    — translation glossary management (Phase 6)
├── storefront-studio.html      — CMS block editor for storefront pages (CMS-2)
├── storefront-blog.html        — storefront blog management (CMS-3)
├── storefront-content.html     — storefront content overrides (CMS-3)
└── storefront-landing-content.html — storefront landing-page content editor (CMS-3)
```

## _archive/ (Single archive vault — added 2026-05-09)

```
_archive/
├── README.md                   — explains structure + add/recover policy
├── root-onboarding/            — 7 legacy onboarding/prompt files superseded by .claude/skills/
│   (DANIEL_QUICK_REFERENCE, STRATEGIC_CHAT_ONBOARDING, MODULE_DOCUMENTATION_SCHEMA,
│    UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT, UNIVERSAL_SECONDARY_CHAT_PROMPT,
│    PHASE_0_PROGRESS, handoff-next-session)
│
├── project-genesis/            — March 2026 era files (consolidated from old archive/, data/, ---QA---/)
│   (CLAUDE10-3, index_V1.1A→V1.7A + index_backup, MASTER_ROADMAP March-era,
│    contacts/customers/frames/lenses/sunglasses/suppliers/test_data JSONs,
│    schema.json, table_fields.json, QA.md + Hebrew QA file)
│
├── launch-plan-versions/       — historical MASTER_LIVE_PLAN versions
│   (MASTER_LIVE_PLAN_v1.md — current truth lives in /MASTER_ROADMAP.md)
│
├── session-outputs/            — 53 historical session prompts/handoffs from old outputs/
│   (PROMPT_*.md, INSTRUCTIONS_*.md, HANDOFF_*.md, NIGHT_HANDOFF.md,
│    campaign-mockups/, campaign-screen-screenshots/)
│
└── pipeline-sessions/          — Parallel Pipeline lock files (added 2026-05-17)
    (*.lock files gitignored; .gitkeep tracked; stale-cleanup-*.log tracked
     for audit; see scripts/pipeline-coordination.mjs + CLAUDE.md §9
     Parallel Pipeline Coordination)
```

**Discipline:** files arrive here only via the Root Discipline Rule (CLAUDE.md §0.5). They are git-tracked but not actively maintained. Recover via `git log --follow <path>` / `git show <hash>:<path>`.

## roles/ (Operational role artifacts — added 2026-05-09)

```
roles/
├── README.md                   — explains structure + how to add a role
├── campaign-overseer/          — Campaign Overseer (active campaigns + decisions log)
│   ├── CAMPAIGN_OVERSEER_HANDOFF.md
│   ├── DECISIONS_LOG.md
│   ├── LEARNINGS.md
│   └── POST_CUTOVER_TECH_DEBT.md
└── site-overseer/              — Marketing/info site Overseer (site map, content drift)
    ├── SITE_OVERSEER_HANDOFF.md
    ├── SITE_OVERSEER_SKILL.md
    ├── DECISIONS_LOG.md
    ├── LEARNINGS.md
    └── SITE_MAP.md
```

**Discipline:** roles are NOT modules. They are operational personas that own surfaces (campaigns, the public site) rather than building modules. Each role has its own handoff + decisions log + learnings, and may have a session-startup skill in `.claude/skills/opticup-<role-name>/`.

## modules/Module N - Name/architecture-brief/ (Architecture Brief — pre-SPEC artifacts)

For modules in design phase (Brief sealed, SPEC authoring not yet started), the cross-module Architecture Brief lives inside the module's own home:

```
modules/Module N - Name/
├── architecture-brief/         — sealed Brief + sketches + handoff (input for Module Strategist)
├── docs/                       — MODULE_SPEC, MODULE_MAP, db-schema, SESSION_CONTEXT, specs/ (created when SPEC authoring begins)
├── ROADMAP.md                  — phase plan (created when SPEC authoring begins)
└── README.md                   — module life-stage status pointer
```

**One Home Per Module rule** (per CLAUDE.md §0.5; established by `MODULES_HOME_UNIFICATION` SPEC, 2026-05-09): every module — at every stage of its life (Brief → SPECs → Code → Production) — lives under `modules/Module N - Name/`. The previous split between "live modules in `modules/`" and "in-design modules in `[retired-2026-05-09:LAUNCH_PLAN_DRAFT]/architecture-briefs/`" is gone.

In-design modules (M5–M15) each have a sealed Brief in their `architecture-brief/` subfolder. See `MASTER_ROADMAP.md` §2.5 for current Brief status per module.

## .claude/ (Claude Code skills + local config)

```
.claude/
├── skills/                     — Optic Up project skills (TRACKED via .gitignore negation)
│   ├── opticup-architect/ — Architect chat skill (orchestrator)
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── DECISIONS_LOG.md             — index of cross-module decisions
│   │       ├── MODULE_BRIEF_TEMPLATE.md
│   │       └── decisions/                   — per-module decision logs (M5, M6, M7, M8, M11, M12, CROSS) (added 2026-05-09)
│   ├── opticup-strategic/      — Module Strategic / Foreman skill
│   ├── opticup-executor/       — Code Executor skill
│   └── (other opticup-* skills)
└── (other .claude/* paths are gitignored — local config, transcripts, settings)
```

## css/

```
css/
├── styles.css                  — all global styles
├── header.css                  — sticky header styles
├── studio.css                  — Studio editor styles (CMS-2/3)
└── studio-seo.css              — SEO panel, search/filter, bulk actions (CMS-9)
```

## js/ (top-level shared scripts)

```
js/
├── shared-field-map.js         — Hebrew↔English FIELD_MAP / ENUM_MAP + heToEn/enToHe + supplier/brand caches (LOAD BEFORE shared.js)
├── shared.js                   — Supabase init, T constants, tenant resolution, UI helpers (LOAD FIRST after field-map)
├── shared-ui.js                — navigation (showTab), info modal, help banner
├── supabase-ops.js             — core DB operations: writeLog, fetchAll, batch ops, softDelete
├── supabase-alerts-ocr.js      — alert creation + OCR template learning (split from supabase-ops.js)
├── data-loading.js             — data loading + enrichment
├── search-select.js            — searchable dropdown component
├── auth-service.js             — PIN login, session management, permissions
├── header.js                   — sticky header logic
├── file-upload.js              — supplier document file upload/preview
├── alerts-badge.js             — bell icon + unread badge + dropdown panel (all pages)
└── pin-modal.js                — reusable PIN prompt modal (shared promptPin())
```

**Load order:** `shared-field-map.js` → `shared.js` → `shared-ui.js` → `supabase-ops.js` → `data-loading.js` → `auth-service.js`

## shared/ (Module 1.5 — Shared Components)

```
shared/
├── css/                        — 16 files
│   ├── variables.css           — base CSS variables (theme, colors, spacing)
│   ├── tokens.css              — mockup palette + source-band + dark + gradient + toggle + wstep tokens (M1_5_SHARED_COMPONENTS_PHASE_0, 2026-05-17)
│   ├── components.css          — shared UI components
│   ├── components-extra.css    — extended components
│   ├── layout.css              — layout helpers
│   ├── forms.css               — form styles
│   ├── modal.css               — modal styles
│   ├── table.css               — table styles (incl. .tb-group-header*, .tb-col-permission-gated, .tb-pagination* added 2026-05-17)
│   ├── toast.css               — toast notifications
│   ├── cat-sidebar.css         — category sidebar (M1_5_CAT_SIDEBAR_COMPONENT)
│   ├── chip-filter.css         — chip-filter row (M1_5_SHARED_COMPONENTS_PHASE_0, 2026-05-17)
│   ├── stat-card.css           — stat-card row (M1_5_SHARED_COMPONENTS_PHASE_0)
│   ├── side-detail.css         — right-pinned side detail panel (M1_5_SHARED_COMPONENTS_PHASE_0)
│   ├── wizard-step-indicator.css — page-level wizard stepper (M1_5_SHARED_COMPONENTS_PHASE_0)
│   ├── quick-receipt.css       — Quick Receipt drawer (M1_5_SHARED_COMPONENTS_PHASE_0)
│   └── lens-details.css        — Lens Details drawer (M1_5_SHARED_COMPONENTS_PHASE_0)
└── js/                         — 23 files
    ├── modal-builder.js        — programmatic modal builder
    ├── modal-wizard.js         — multi-step wizard modals (in-modal flows)
    ├── toast.js                — toast notification system
    ├── table-builder.js        — programmatic table builder (extended 2026-05-17 with pagination, permission-gated cols, group-header rows)
    ├── table-builder-extensions.js — pagination DOM helpers for table-builder.js (M1_5_SHARED_COMPONENTS_PHASE_0, 2026-05-17; load BEFORE table-builder.js)
    ├── supabase-client.js      — tenant-aware Supabase wrapper
    ├── activity-logger.js      — writes to activity_log table
    ├── permission-ui.js        — UI permission gating
    ├── pin-modal.js            — shared PIN prompt
    ├── theme-loader.js         — applies CSS variables from tenant ui_config
    ├── plan-helpers.js         — plan/feature gate helpers
    ├── sort-utils.js           — client-side column sorting
    ├── table-resize.js         — column resize + sticky scrollbar
    ├── catalog-private-admin.js — private catalog admin (M1 Lens Phase 1A)
    ├── cat-sidebar.js          — category sidebar ES Module (M1_5_CAT_SIDEBAR_COMPONENT)
    ├── chip-filter-row.js      — chip-filter row (M1_5_SHARED_COMPONENTS_PHASE_0, 2026-05-17)
    ├── stat-card-row.js        — stat-card row (M1_5_SHARED_COMPONENTS_PHASE_0)
    ├── side-detail-panel.js    — right-pinned side detail panel (M1_5_SHARED_COMPONENTS_PHASE_0)
    ├── wizard-step-indicator.js — page-level wizard stepper, distinct from modal-wizard.js (M1_5_SHARED_COMPONENTS_PHASE_0)
    ├── group-header-row.js     — source-banded <tr> helper for data tables (M1_5_SHARED_COMPONENTS_PHASE_0)
    ├── quick-receipt-drawer.js — Quick Receipt drawer (M1_5_SHARED_COMPONENTS_PHASE_0)
    └── lens-details-drawer.js  — Lens Details 2-tab drawer (M1_5_SHARED_COMPONENTS_PHASE_0)
```

**Rule:** `shared/` is READ-ONLY for feature modules. Changes go through Module 1.5 only.

## docs/

```
docs/
├── GLOBAL_MAP.md               — shared functions, contracts, module registry, DB table ownership
├── GLOBAL_SCHEMA.sql           — full DB schema across all modules
├── FILE_STRUCTURE.md           — this file
├── DB_TABLES_REFERENCE.md      — T constants → table → key columns quick reference
├── CONVENTIONS.md              — code patterns: cascading dropdowns, wizards, PIN flow, etc.
├── TROUBLESHOOTING.md          — known issues + solutions
└── AUTONOMOUS_MODE.md          — autonomous execution protocol (TBD — Phase 0)
```

## modules/ (feature modules — one folder per concern)

```
modules/
├── inventory/                  — 13 files
│   (table, entry, edit, export, reduction, excel-import, access-sales,
│    inventory-return, inventory-returns-tab, inventory-returns-actions,
│    inventory-images, inventory-images-bg, incoming-invoices)
│
├── purchasing/                 — 6 files
│   (purchase-orders, po-form, po-items, po-actions, po-import, po-view)
│
├── goods-receipts/             — 20 files (frames-era; lens flow uses purchase_receipt per Q1 option c)
│   (goods-receipt, receipt-form, receipt-form-items, receipt-form-validate,
│    receipt-actions, receipt-confirm, receipt-confirm-items, receipt-debt,
│    receipt-excel, receipt-ocr, receipt-ocr-flow, receipt-ocr-learn,
│    receipt-ocr-po, receipt-ocr-review, receipt-ocr-supplier,
│    receipt-ocr-confirm-learn, receipt-doc-numbers, receipt-list,
│    receipt-po-compare, receipt-guide)
│
├── lens-catalog-admin/         — 7 files (M1 Lens Phase 1A — Optic Up team only)
│   (lens-catalog-admin (entry+state+callbacks), catalog-auth (gate via
│    is_platform_super_admin RPC), catalog-brands-col, catalog-designs-col,
│    catalog-variants-col (calls next_lens_variant_display_id RPC),
│    catalog-detail-pane (variant + per-tenant offerings + publish),
│    catalog-import (xlsx → JSON → lens-catalog-import EF))
│
├── lens-inventory/             — 5 files (M1 Lens Phase 1B-foundation)
│   (lens-inventory-main (gate + bootstrap), lens-inventory-filters (Stock/Custom
│    + brand→design→variant cascade via fetchAll/sb.from carve-out for catalog),
│    lens-inventory-grid (SPH×CYL render), lens-inventory-lot-pane (right-side
│    lot drill-down), lens-inventory-modals (display-only ➕➖ stub via Modal.*))
│
├── lens-active-designs/        — 3 files (M1 Lens Phase 1B-foundation)
│   (lens-active-designs-main (gate + bootstrap), lens-active-designs-tree
│    (brand selector + offering→variant→design join + tenant_active_offerings
│    overlay), lens-active-designs-toggle (toggle_active_offering RPC handler))
│
├── lens-pricing/               — 5 files (M1 Lens Phase 1B-foundation, D-M1-04)
│   (lens-pricing-main (gate + bootstrap), lens-pricing-filters (Stock/Custom +
│    brand + effective_price RPC batch), lens-pricing-grid (3-col display +
│    select-all + inline discount input), lens-pricing-inline-edit
│    (upsert_pricing_overlay RPC handler), lens-pricing-bulk (bulk modal +
│    bulk_apply_pricing_overlay RPC handler))
│
├── audit/                      — 4 files
│   (audit-log, item-history, entry-history, qty-modal)
│
├── brands/                     — 2 files
│   (brands, suppliers)
│
├── access-sync/                — 4 files
│   (access-sync, sync-details, pending-panel, pending-resolve)
│
├── admin/                      — 2 files
│   (admin, system-log)
│
├── debt/                       — 21 files
│   (debt-dashboard, debt-documents, debt-doc-link, debt-doc-filters,
│    debt-doc-edit, debt-doc-actions, debt-doc-compare, debt-doc-items,
│    debt-doc-new, debt-payments, debt-payment-wizard, debt-payment-alloc,
│    debt-prepaid, debt-prepaid-detail, debt-supplier-detail, debt-supplier-tabs,
│    debt-returns, debt-returns-tab, debt-returns-tab-actions,
│    debt-info-content, debt-info-inject)
│   │
│   └── ai/                     — 9 files
│       (ai-ocr, ai-ocr-review, ai-alerts, ai-weekly-report, ai-config,
│        ai-batch-upload, ai-batch-ocr, ai-historical-import, ai-historical-process)
│
├── permissions/                — 1 file (employee-list)
│
├── shipments/                  — 9 files
│   (shipments-list, shipments-create, shipments-items, shipments-items-table,
│    shipments-lock, shipments-detail, shipments-manifest, shipments-couriers,
│    shipments-settings)
│
├── settings/                   — 1 file (settings-page)
│
├── stock-count/                — 9 files
│   (list, session, camera, scan, filters, unknown, approve, view, report)
│
├── customers/                  — 12 files (M5 customer card Phase D 2026-05-23 + list/create Phase E 2026-05-23)
│   (customer-card (boot + state + tab orchestration + __cardTrace + Phase-E
│    list-mode routing branch),
│    customer-card-header (avatar+name+meta+badges+edit toggle+actions),
│    customer-card-coming-soon (ONE shared showComingSoon + COMING_SOON_LABEL +
│    COMING_SOON_REGISTRY — Iron Rule 21 anchor; +11 Phase-E registry keys),
│    customer-card-tab-details (Tab 1 — col-3/col-2 blocks + medical sub-tabs
│    + queue + bottom flags + per-field debounced auto-save),
│    customer-card-tab-vision (Tab 2 — stub per D-T2; M6 follow-up),
│    customer-card-tab-prescriptions (Tab 3 — v_customer_prescriptions_summary
│    + filters + create_prescription_draft RPC),
│    customer-card-tab-orders (Tab 4 — M7 orders summary; all CTAs → coming-soon),
│    customer-card-tab-docs (Tab 5 — customer-docs bucket upload + list + open),
│    customer-list (Phase E — list boot + fetch v_customer_for_exam +
│    v_customer_full lifecycle/phone merge + tenant_location + render + search
│    debounce + pill filter + row-click → card),
│    customer-list-sidebar (Phase E — Sketch 2 sidebar: 3 groups +
│    tenant_location footer),
│    customer-list-filters (Phase E — normalizePhoneQuery for leading-zero +
│    E.164 suffix match + CUSTOMER_LIST_PILLS registry + applyListSearch/Filter),
│    customer-create (Phase E — modal form + create_customer RPC + dedup-safe
│    UX: created=true → redirect; created=false → existing-customer surface))
│
├── crm/                        — 81 files (Module 4 — CRM lead pipeline + events + messaging)
│   (crm-bootstrap, crm-dashboard, crm-leads-*, crm-event-*, crm-automation-*,
│    crm-confirm-send-v2, crm-broadcast-*, crm-messaging-resend, crm-coupon-dispatch)
│   ├── crm-short-links-tiles/  — short-link management UI
│   │   (broadcasts-table, drilldown, filter-bar, template-static-card)
│   └── public/                 — public-facing CRM pages (lead registration)
│
└── storefront/                 — 20 files (Studio admin UI — manages storefront content)
    (storefront-settings, storefront-brands, storefront-products, storefront-content,
     storefront-translations, storefront-glossary, studio-block-schemas,
     studio-form-renderer, studio-seo, studio-pages, studio-editor, studio-components,
     studio-leads, studio-permissions, studio-templates, studio-ai-prompt, studio-ai-diff,
     studio-product-picker, studio-reviews, studio-brands)
```

## scripts/ (Access Bridge — Node.js Watcher)

```
scripts/
├── sync-watcher.js             — Node.js folder watcher (Windows Service, CSV+XLSX)
├── sync-export.js              — reverse sync: export new inventory to XLS for Access
├── install-service.js          — install as Windows Service
├── uninstall-service.js        — uninstall from Windows Services
├── pipeline-coordination.mjs   — Parallel Pipeline session-lock protocol (added 2026-05-17)
├── test-pipeline-coordination.mjs — regression + E2E tests for pipeline-coordination
├── sync-prizma-config-to-demo.mjs — M4 config sync Prizma → demo (Iron Rule 33; added 2026-05-19 via M4_CONFIG_SYNC_INFRASTRUCTURE)
├── promote-config-to-prizma.mjs   — M4 config promote single row demo → Prizma + audit (Iron Rule 33; added 2026-05-19)
└── checks/
    └── demo-config-allowlist.json — rows legitimately demo-only, preserved during sync (Iron Rule 33; added 2026-05-19)
```

## docs/guardian/sentinel/ (Sentinel mission protocol docs)

```
docs/guardian/sentinel/
└── mission-11-config-parity.md  — M4 demo↔Prizma config drift watchdog protocol (Iron Rule 33; added 2026-05-19). Mission script is a separate follow-up SPEC.
```

## watcher-deploy/

```
watcher-deploy/                 — Standalone deployment package (8 files, no Git needed)
```

## supabase/functions/ (Edge Functions)

```
supabase/functions/
├── ocr-extract/index.ts             — Claude Vision OCR for invoices
├── pin-auth/index.ts                — PIN authentication + JWT issuance
├── remove-background/index.ts       — remove.bg API proxy for product images
├── generate-ai-content/index.ts     — AI product content + auto-translate
├── generate-blog-post/index.ts      — AI blog post generation
├── generate-landing-content/index.ts — AI landing page content
├── translate-content/index.ts       — Hebrew → EN/RU translation (Phase 6)
├── cms-ai-edit/index.ts             — AI prompt editing for CMS blocks (CMS-5)
├── fetch-google-reviews/index.ts    — Google Places reviews fetch (CMS-7)
├── generate-brand-content/index.ts  — AI brand page content generation
└── lens-catalog-import/             — M1 Lens Phase 1A bulk-import EF (3 files)
    ├── index.ts                     — request handler + brand/design/variant/offering loop
    ├── validate.ts                  — types + per-row validation
    └── deno.json                    — npm:@supabase/supabase-js@2.45.0 import
```

## migrations/

```
migrations/
└── *.sql                       — SQL migration files (manually executed in Supabase Dashboard)
```

## modules/Module 1 - Inventory Management/ (documentation folder)

```
modules/Module 1 - Inventory Management/
├── ROADMAP.md                  — phase map with ⬜/✅ status
├── SECONDARY_CHAT_TEMPLATE_FINAL.md
├── MY_CHEATSHEET.md
├── backups/                    — phase backups (M1F{phase}_{date})
└── docs/
    ├── SESSION_CONTEXT.md      — current status, last commits, next steps
    ├── MODULE_MAP.md           — code map: files, functions, globals for this module
    ├── MODULE_SPEC.md          — current state: tables, functions, contracts
    ├── CHANGELOG.md            — commit history per phase
    ├── db-schema.sql           — DB tables owned by this module
    └── PHASE_X_SPEC.md         — per-phase spec (archived after phase completes)
```

Other modules (`Module 1.5 - Shared Components`, `Module 2 - Platform Admin`, `Module 4 - CRM` when it starts, etc.) follow the same pattern.

---

## Maintenance Rules

1. **Add a new file?** → Add it here AND to the module's `MODULE_MAP.md` in the SAME commit.
2. **Rename or move?** → Update this file + any grep-able references in code AND docs. Per Rule 21, do not leave the old path referenced anywhere.
3. **Delete a file?** → Remove from this file + verify no broken imports. Run `grep -rn "old-filename" .` before committing.
4. **Unsure if a similar file exists?** → Search this file first (Ctrl+F). That's Rule 21 in action.

---

*This file is the authoritative file tree for `opticup`. If it contradicts reality, reality wins — update this file immediately.*
