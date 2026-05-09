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

**Category 2 — Live Sources of Truth** (`MASTER_ROADMAP.md`, `TECH_DEBT.md`, `docs/`, `modules/`, `__LAUNCH_PLAN_DRAFT__/`, `_archive/`, `migrations/`, `scripts/`, `shared/`, `js/`, `css/`, `supabase/`, `tests/`, `campaigns/`, `watcher-deploy/`, `opticup-skills.plugin`, `serve.js`).

**Category 3 — Application Entrypoints (HTML at root, GitHub Pages routing):**

```
opticup/
├── index.html                  — home screen: PIN login + module cards
├── admin.html                  — platform admin entry (Module 2)
├── crm.html                    — CRM module entry (Module 4)
├── inventory.html              — inventory management module (full app)
├── suppliers-debt.html         — supplier debt tracking module
├── employees.html              — standalone employee management page
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
└── session-outputs/            — 53 historical session prompts/handoffs from old outputs/
    (PROMPT_*.md, INSTRUCTIONS_*.md, HANDOFF_*.md, NIGHT_HANDOFF.md,
     campaign-mockups/, campaign-screen-screenshots/)
```

**Discipline:** files arrive here only via the Root Discipline Rule (CLAUDE.md §0.5). They are git-tracked but not actively maintained. Recover via `git log --follow <path>` / `git show <hash>:<path>`.

## __LAUNCH_PLAN_DRAFT__/ (Pre-LIVE planning artifacts)

```
__LAUNCH_PLAN_DRAFT__/
├── README.md                   — overview of planning artifacts
├── MASTER_LIVE_PLAN.md         — DEPRECATED (moved to /MASTER_ROADMAP.md, archived in _archive/launch-plan-versions/)
├── access-audit/               — Access permission audit artifacts
├── architecture-briefs/        — module architecture briefs + mockups
│   ├── PROJECT_STRUCTURE_AUDIT_2026-05-09.md
│   ├── PROJECT_STRUCTURE_CLEANUP_SPEC.md
│   ├── PROJECT_STRUCTURE_CLEANUP_ACTIVATION.md
│   ├── _pass3_4_findings.md / _pass8_9_findings.md / _pass10_findings.md   — audit pass details
│   ├── M5 - Customers/         — brief + mockups + handoff
│   ├── M6 - Prescriptions/     — brief + editor mockup
│   ├── M7 - Orders/            — brief + 5 form mockups + variants + feature inventory
│   ├── M8 - Payments/          — brief + checkout/checks/daily-close/provider mockups + research
│   ├── M11 - Reports/          — brief + 3 report mockups + handoff
│   ├── M12 - Communications/   — brief + 4 channel/customer/templates/whatsapp mockups
│   ├── M14 - Appointments/     — brief + appointments mockups
│   └── M15 - Queue/            — brief + queue mockup
├── campaign-overseer/          — Campaign Overseer session artifacts
├── handoffs/                   — cross-module module-to-module handoffs (M12_HANDOFF, M13_HANDOFF, ...)
├── site-overseer/              — Site Overseer session artifacts
└── supervisor-system/          — Supervisor pattern documentation
```

**Note:** the `_archive/` subfolder previously here was consolidated into root `_archive/launch-plan-versions/` per Root Discipline Rule (2026-05-09).

## .claude/ (Claude Code skills + local config)

```
.claude/
├── skills/                     — Optic Up project skills (TRACKED via .gitignore negation)
│   ├── opticup-main-strategic/ — Main Strategic chat skill (orchestrator)
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
├── css/                        — 8 files
│   ├── variables.css           — CSS variables (theme, colors, spacing)
│   ├── components.css          — shared UI components
│   ├── components-extra.css    — extended components
│   ├── layout.css              — layout helpers
│   ├── forms.css               — form styles
│   ├── modal.css               — modal styles
│   ├── table.css               — table styles
│   └── toast.css               — toast notifications
└── js/                         — 9 files
    ├── modal-builder.js        — programmatic modal builder
    ├── modal-wizard.js         — multi-step wizard modals
    ├── toast.js                — toast notification system
    ├── table-builder.js        — programmatic table builder
    ├── supabase-client.js      — tenant-aware Supabase wrapper
    ├── activity-logger.js      — writes to activity_log table
    ├── permission-ui.js        — UI permission gating
    ├── pin-modal.js            — shared PIN prompt
    └── theme-loader.js         — applies CSS variables from tenant ui_config
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
├── goods-receipts/             — 13 files
│   (goods-receipt, receipt-form, receipt-form-items, receipt-form-validate,
│    receipt-actions, receipt-confirm, receipt-confirm-items, receipt-debt,
│    receipt-excel, receipt-ocr, receipt-ocr-review, receipt-po-compare,
│    receipt-guide)
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
└── uninstall-service.js        — uninstall from Windows Services
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
└── generate-brand-content/index.ts  — AI brand page content generation
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
