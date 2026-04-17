# File Structure — opticup (ERP)

> **Purpose:** Complete file tree of the `opticup` repo with one-line descriptions.
> **Updated when:** A file is added, removed, renamed, or significantly repurposed.
> **Read when:** You need to find a file, understand what lives where, or verify no duplicate exists (Rule 21).
> **Do NOT read at session start** — open only when needed.

> **Note on storefront files:** Several `storefront-*.html` and `modules/storefront/` files physically live in this repo because they are the **Studio / CMS admin UI** that staff use to manage storefront content. The public-facing site itself lives in the separate `opticup-storefront` repo.

---

## Repo Root

```
opticup/
├── index.html                  — home screen: PIN login + module cards
├── inventory.html              — inventory management module (full app)
├── suppliers-debt.html         — supplier debt tracking module
├── employees.html              — standalone employee management page
├── shipments.html              — shipments & box management module
├── settings.html               — tenant settings (business info, financial config, display prefs)
├── storefront-settings.html    — storefront config: WhatsApp, booking, notifications (Phase 4B)
├── storefront-brands.html      — storefront brand mode manager (Phase 4B)
├── storefront-products.html    — storefront product overrides + bulk select (Phase 4B)
├── storefront-glossary.html    — translation glossary management (Phase 6)
├── storefront-studio.html      — CMS block editor for storefront pages (CMS-2)
└── CLAUDE.md                   — project constitution (navigation hub)
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
├── shared.js                   — Supabase init, constants, caches, utilities (LOAD FIRST)
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

**Load order:** `shared.js` → `shared-ui.js` → `supabase-ops.js` → `data-loading.js` → `auth-service.js`

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
├── goods-receipts/             — 12 files
│   (goods-receipt, receipt-form, receipt-form-items, receipt-actions,
│    receipt-confirm, receipt-confirm-items, receipt-debt, receipt-excel,
│    receipt-ocr, receipt-ocr-review, receipt-po-compare, receipt-guide)
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
