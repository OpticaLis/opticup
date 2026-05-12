# PRE_MIGRATION_BEHAVIOR — MIGRATION_3_CRM

**Captured by:** opticup-executor (Full-Auto Pipeline)
**Date:** 2026-05-12
**HEAD at capture:** `0dfa6b9ca971667c349a2e999c151e4b40fc249a` (tag `pre-migration-crm`)

---

## Purpose

Snapshot of CRM (`crm.html` + 4 CRM CSS files) BEFORE the Navy accent migration. Compared against POST-migration state in EXECUTION_REPORT.md §3 to confirm zero functional regression.

---

## 1. File baselines (live grep at capture time)

| Symbol | File | Metric | Value |
|---|---|---|---|
| `BASE_LINES_crm` | `crm.html` | `wc -l` | **419** |
| `BASE_SCRIPTS_crm` | `crm.html` | `grep -c "<script"` | **75** |
| `BASE_LINKS_crm` | `crm.html` | `grep -c '<link rel="stylesheet"'` | **12** |
| `BASE_INDIGO_HITS_crm` | `crm.html` | `grep -c "indigo-"` | **6** |
| `BASE_LINES_crmcss` | `css/crm.css` | `wc -l` | **215** |
| `BASE_LINES_crmcomp` | `css/crm-components.css` | `wc -l` | **8** |
| `BASE_LINES_crmscr` | `css/crm-screens.css` | `wc -l` | **2** |
| `BASE_LINES_crmvis` | `css/crm-visual.css` | `wc -l` | **20** |
| `BASE_NAVY_TOKENS_vars` | `shared/css/variables.css` | `grep -c "accent-navy"` | **4** (idempotent — present) |

## 2. Inline-hex audit (Migration #1 Executor Proposal #1)

### 2.1 `crm.html`

```
$ grep -oE "#[0-9a-fA-F]{3,8}\b" crm.html | sort -u
#0d9488    ← INSIDE HTML COMMENT (line 166, future palette swatch)
#1e1b4b    ← Tailwind config crm.sidebar token (line 28, ORPHAN — not referenced by any class in markup)
#1e293b    ← Tailwind config crm.text token (line 32, ORPHAN — not referenced)
#2563eb    ← INSIDE HTML COMMENT (line 167, future palette swatch)
#4f46e5    ← theme-dot active swatch (line 164, IN SWAP MAP — Block B)
#6366f1    ← Tailwind config crm.accent token (line 29, ORPHAN — not referenced by any class in markup)
#64748b    ← Tailwind config crm.muted token (line 33, ORPHAN — not referenced)
#f8fafc    ← Tailwind config crm.surface token (line 30, ORPHAN — not referenced)
#ffffff    ← Tailwind config crm.card token + style fallback
```

**Stranded hex check:** ZERO stranded hexes inside live markup. The only IN-USE hex inside `<body>` is `#4f46e5` on line 164 (covered by Block B). All other hexes are inside HTML comments (lines 165-168) OR inside the Tailwind config `<script>` block (lines 19-39) — that config is OUT OF SCOPE per SPEC §7. The commented-out hexes are documentation of future palettes; leaving them preserves intent.

### 2.2 4 CRM CSS files

```
$ grep -oE "#[0-9a-fA-F]{3,8}\b" css/crm*.css | sort -u
css/crm.css:#065f46      ← --crm-success-dark (semantic)
css/crm.css:#0f172a      ← --crm-sidebar-dark, --crm-text-primary (Slate 900)
css/crm.css:#10b981      ← --crm-success
css/crm.css:#1e293b      ← --crm-sidebar (dark)
css/crm.css:#1e40af      ← --crm-info-dark (DERIVED Tailwind blue-700; coincidence — this is also the Navy hover value)
css/crm.css:#25D366      ← --crm-whatsapp (semantic brand)
css/crm.css:#334155      ← --crm-sidebar-hover
css/crm.css:#3b82f6      ← --crm-info, --crm-sms
css/crm.css:#4338ca      ← --crm-accent-hover (legacy Indigo, IN SWAP MAP)
css/crm.css:#475569      ← --crm-sidebar-active
css/crm.css:#4f46e5      ← --crm-accent (legacy Indigo, IN SWAP MAP)
css/crm.css:#92400e      ← --crm-warning-dark
css/crm.css:#94a3b8      ← --crm-sidebar-text, --crm-text-muted
css/crm.css:#991b1b      ← --crm-error-dark
css/crm.css:#cbd5e1      ← --crm-border-strong
css/crm.css:#d1fae5      ← --crm-success-light
css/crm.css:#dbeafe      ← --crm-info-light
css/crm.css:#e2e8f0      ← --crm-card-border, --crm-border, --crm-header-border
css/crm.css:#eef2ff      ← --crm-accent-light (legacy Indigo, IN SWAP MAP)
css/crm.css:#ef4444      ← --crm-error
css/crm.css:#f1f5f9      ← --crm-sidebar-text-h
css/crm.css:#f59e0b      ← --crm-warning, --crm-email
css/crm.css:#f8fafc      ← --crm-bg
css/crm.css:#fee2e2      ← --crm-error-light
css/crm.css:#fef3c7      ← --crm-warning-light
css/crm.css:#ffffff      ← --crm-card, --crm-header-bg, --crm-accent-text, --crm-sidebar-text-h
css/crm-components.css:#ffffff   ← .crm-badge default color
```

**No legacy purple/violet hex anywhere in CRM CSS.** Brief Discovery + SPEC §0 Divergence #2 confirmed. Only 3 hexes are migrated by this SPEC: `#4f46e5` → `#1e3a8a`, `#4338ca` → `#1e40af`, `#eef2ff` → `#e6f1fb`. The `--crm-info-dark` and `--crm-info` colors happen to share `#1e40af` and `#3b82f6` (blue family) but are semantic info colors — not migrated.

## 3. Behavior catalog — what CRM does today

### 3.1 Sidebar navigation
- 10 nav items (`.crm-nav-item`) — buttons with `onclick="showCrmTab(...)"`.
- One is `.active` at any time (default: `dashboard` per line 76).
- Active state today: `background: var(--crm-sidebar-active) = #475569` (Slate 600), `font-weight: 600`, color: `#f1f5f9`. **Sidebar background is dark (#1e293b).**
- Click → JS swaps `active` class to clicked button + reveals matching `<section id="tab-{name}">`.
- **Expected after migration:** active item shows an additional Navy left-edge marker (`box-shadow: inset -3px 0 0 #1e3a8a` for RTL — sits on the START edge). Dark background preserved.

### 3.2 Primary action buttons
- "+ הוסף ליד" — L240 — currently `bg-indigo-600 hover:bg-indigo-700`.
- "+ יצירת אירוע" — L286 — currently `bg-indigo-600 hover:bg-indigo-700`.
- **Expected after:** both render with `#1e3a8a` background, `#1e40af` on hover.

### 3.3 Leads-view toggle (L252-256)
- 3 buttons: "טבלה" (selected, `bg-indigo-600 text-white`), "קנבן" + "כרטיסים" (`text-gray-500 hover:text-indigo-600`).
- Click cycles `bg-indigo-600 text-white` to whichever view is active (JS in `crm-leads-views.js`).
- **Expected after:** selected view button renders `bg-[#1e3a8a]`; hover on inactive renders `text-[#1e3a8a]`.

### 3.4 Search inputs (L239, L260)
- Type=search inputs with focus state `focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`.
- **Expected after:** focused input shows 2px ring `#1e3a8a` + border `#1e3a8a`.

### 3.5 Theme-dot swatch (L164)
- One visible dot (Indigo), classed `crm-theme-dot active`, inline `style="background:#4f46e5"`.
- Two hidden dots (teal, ocean) inside HTML comment (lines 165-168).
- Visible dot is decorative — its color is the swatch user sees in sidebar footer indicating "current theme is Indigo".
- **Expected after:** visible dot inline `style="background:#1e3a8a"`. Its `data-theme="indigo"` attribute UNCHANGED (JS data hook).

### 3.6 Loading spinner (`.crm-loading::before`, css/crm.css L198-204)
- 20×20px border with `border-top-color: var(--crm-accent)` (currently `#4f46e5`).
- Animates `crm-spin 0.7s linear infinite`.
- **Expected after:** border-top-color renders `#1e3a8a` (palette swap propagates).

### 3.7 Tabs (8 `<section class="crm-tab">`)
- `display: none` by default; `.crm-tab.active { display: block }`.
- The "active tab indicator" in Brief §2.1 refers to the SIDEBAR active item (already covered §3.1). No separate horizontal tab strip with an underline exists in CRM today. The Brief's "tab underline" expectation maps to the sidebar marker.

### 3.8 Selected table row
- The Brief mentions "selected row background → `--accent-soft`". `crm-leads-tab.js` builds the leads table via `TableBuilder` (shared). Row selection state in CRM currently uses the shared TableBuilder's selection styling (controlled by shared CSS, not crm.css). NOT in scope for this SPEC — the shared TableBuilder accent will be addressed when its consumers all migrate. Verification: no `crm-row-selected` or similar selector exists in any crm*.css.

### 3.9 Console state at baseline
- Loads cleanly on demo tenant with PIN 12345.
- Smoke suite reports 7/7 PASS as of HEAD `0dfa6b9` (Migration #2 close).

## 4. Pre-existing repo state (NOT migrated by this SPEC)

Per Migration #1 Executor Proposal #2 (Full-Auto leave-alone rule):

- `docs/guardian/GUARDIAN_ALERTS.md` is modified (Sentinel run output). NOT touched here.
- 23 untracked architecture-brief MD files (Brief planning docs in `modules/Module 1.5 - Shared Components/architecture-brief/` and `modules/Module 13 - Loyalty Club/architecture-brief/`). NOT touched here.

All `git add` calls in this SPEC use explicit filenames. No `git add -A` / `git add .`.

---

*End of PRE_MIGRATION_BEHAVIOR.*
