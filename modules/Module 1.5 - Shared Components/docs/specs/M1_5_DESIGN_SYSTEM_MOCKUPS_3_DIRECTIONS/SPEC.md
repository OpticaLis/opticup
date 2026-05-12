# SPEC — M1_5_DESIGN_SYSTEM_MOCKUPS_3_DIRECTIONS (PARENT / OVERVIEW)

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_MOCKUPS_3_DIRECTIONS/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-10 (parent draft) — split into sub-phases 2026-05-11
> **Module:** 1.5 — Shared Components
> **Phase (in Design System initiative):** 3 of 4 — SPLIT into sub-phases 3a + 3b + 3c
> **Depends on:** `M1_5_DESIGN_SYSTEM_COMPONENT_LIBRARY` (Phase 2) — must be 🟢 CLOSED first (✅ closed 2026-05-11 @ `c4f681c`)
> **Author signature:** opticup-strategic / 2026-05-11 — parent-overview rewrite after Phase-3-volume deviation

---

## ⚠️ This SPEC has been SPLIT — see the 3 sub-SPECs

The original Phase 3 SPEC prescribed 45 deliverables in a single executor run (3 directions × 13 modules + 3 INDEX + 3 `_tokens.css`). Mid-execution it became clear that a single chat would exhaust context before Phase 4. **Daniel directive 2026-05-11:** split Phase 3 into 3 sequential sub-phases, each runnable in its own fresh chat.

| Sub-phase | Slug | Direction | Files | SPEC |
|-----------|------|-----------|-------|------|
| 3a | `M1_5_DESIGN_SYSTEM_MOCKUPS_3A_CONSERVATIVE` | Conservative (production-close) | 15 (13 HTMLs + INDEX + `_tokens.css`) | [sibling folder](../M1_5_DESIGN_SYSTEM_MOCKUPS_3A_CONSERVATIVE/SPEC.md) |
| 3b | `M1_5_DESIGN_SYSTEM_MOCKUPS_3B_MODERN_CLEAN` | Modern-clean (airy SaaS-default) | 15 | [sibling folder](../M1_5_DESIGN_SYSTEM_MOCKUPS_3B_MODERN_CLEAN/SPEC.md) |
| 3c | `M1_5_DESIGN_SYSTEM_MOCKUPS_3C_BOLD_DENSE_PRO_TOOL` | Bold dense-pro-tool (Linear/Bloomberg) | 15 | [sibling folder](../M1_5_DESIGN_SYSTEM_MOCKUPS_3C_BOLD_DENSE_PRO_TOOL/SPEC.md) |

Sub-phases run **sequentially in fresh chats** (Daniel dispatches each). Order = 3a → 3b → 3c, but they are **independent**: 3b doesn't depend on 3a's outcome (each direction is self-contained under its own folder).

Phase 4 (`M1_5_DESIGN_SYSTEM_PHASE_4_CLOSE`) depends on **ALL 3** sub-phases being 🟢 CLOSED before it can run its "ask Daniel which direction wins" step.

---

## 1. Goal (unchanged from original)

Build the comparison tree at `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/` containing **3 design directions × 13 modules × 1 HTML mockup each + 3 INDEX.html navigators + 3 `_tokens.css` direction overrides**. Per-module HTMLs preserve approved layouts verbatim (sketch-preservation rule, brief §2 #5a) — only colors, typography, spacing, radii, shadows, and density change per direction. Daniel opens 3 `INDEX.html` files, compares, and picks ONE direction in Phase 4.

---

## 2. SHARED — Canonical source-of-truth per module (used by ALL 3 sub-SPECs)

| Module slug | Source-of-truth file | Type |
|---|---|---|
| `M1-inventory.html` | `inventory.html` (repo root, production) | Production layout (staticize) |
| `M3-storefront-studio.html` | `storefront-studio.html` (repo root, production) | Production layout (staticize) |
| `M4-crm.html` | `crm.html` (repo root, production) | Production layout (staticize) |
| `M5-customers.html` | `modules/Module 5 - Customers/architecture-brief/M5_CUSTOMERS_LIST_MOCKUPS.html` | Approved mockup (preserve) |
| `M6-prescriptions.html` | `modules/Module 6 - Prescriptions/architecture-brief/M6_PRESCRIPTION_EDITOR_MOCKUP.html` | Approved mockup |
| `M7-orders.html` | `modules/Module 7 - Orders/architecture-brief/M7_ORDERS_FULL_MOCKUP_V6.html` | Approved mockup (canonical V6) |
| `M8-payments.html` | `modules/Module 8 - Payments/architecture-brief/M8_CHECKOUT_MOCKUP_V3.html` | Approved mockup (canonical V3) |
| `M9-lab-kds.html` | `modules/Module 9 - Lab/architecture-brief/M9_DASHBOARD_SKETCHES.html` | Approved sketch |
| `M11-reports.html` | `modules/Module 11 - Reports/architecture-brief/M11_REPORTS_LIST_MOCKUP.html` | Approved mockup |
| `M12-communications.html` | `modules/Module 12 - Communications/architecture-brief/M12_WHATSAPP_INBOX_MOCKUP.html` | Approved mockup |
| `M13-loyalty.html` | `modules/Module 13 - Loyalty Club/architecture-brief/M13_SKETCHES.html` | Approved sketch |
| `M14-appointments.html` | `modules/Module 14 - Appointments/architecture-brief/M14_APPOINTMENTS_MOCKUP.html` | Approved mockup |
| `M15-queue.html` | `modules/Module 15 - Queue/architecture-brief/M15_QUEUE_MOCKUP.html` | Approved mockup |

(Module 9's folder is `Module 9 - Lab`, NOT `Module 9 - Lab KDS` — brief had a minor name drift. Verified 2026-05-10.)

---

## 3. SHARED — Staticization rules

### For production-sourced HTMLs (M1, M3 Storefront Studio, M4)

1. Copy `<head>` + `<body>` structure verbatim.
2. Remove all `<script>` tags (Supabase loader, shared.js, auth-service, header, page-specific scripts).
3. Remove `<link rel="stylesheet">` to auth/login UIs.
4. Replace dynamic data placeholders with realistic-looking inline mock content (representative Hebrew rows: inventory items, customer names, etc.). DO NOT redesign the table — copy structure, fill with mock data.
5. Add the direction's stylesheet chain (see §4 below).
6. Optional: top banner `<div>` "DESIGN MOCKUP — [Direction name] · [Module name]".

### For mockup-sourced HTMLs (M5–M15)

1. Copy the source mockup verbatim into the direction folder under the canonical filename from §2.
2. Remove inline `<style>` blocks that hardcode hex colors — extract into the direction's `_tokens.css` if unique need, OR delete (let shared component CSS handle).
3. Add the direction's stylesheet chain (§4).
4. PRESERVE every element-tag sequence (sketch-preservation rule). PRESERVE class names mapped to shared component CSS.

---

## 4. SHARED — Stylesheet chain per HTML

Every mockup HTML loads (in order):

```html
<link rel="stylesheet" href="../../../../shared/css/variables.css">
<link rel="stylesheet" href="../../../../shared/css/layout.css">
<link rel="stylesheet" href="../../../../shared/css/components.css">
<link rel="stylesheet" href="../../../../shared/css/components-extra.css">
<link rel="stylesheet" href="../../../../shared/css/forms.css">
<link rel="stylesheet" href="../../../../shared/css/modal.css">
<link rel="stylesheet" href="../../../../shared/css/toast.css">
<link rel="stylesheet" href="../../../../shared/css/table.css">
<link rel="stylesheet" href="./_tokens.css">  <!-- direction override — load LAST so it wins cascade -->
```

The 4-deep `../../../../` is from `design-system-mockups/direction-N/file.html` up to repo root, then down into `shared/css/`.

---

## 5. SHARED — INDEX.html template per direction

Each direction's INDEX has: top bar (switch between 3 directions), left nav (13 module links), iframe preview area. See sub-SPEC §8 for the exact template.

Direction-1 (Conservative) INDEX includes a Prizma override sample toggle (`?tenant=prizma` → injects Indigo `--color-*` on `:root` via inline `<script>`). Directions 2 + 3 OMIT this — they showcase the platform-default rendering for SaaS scalability.

---

## 6. SHARED — Direction definitions (locked by Daniel 2026-05-10)

| Direction | Vibe | Body font | Spacing | Radii | Shadows | Density |
|-----------|------|-----------|---------|-------|---------|---------|
| 1 — Conservative | "Just like today, but cleaner." Production-like density. | `--font-size-md: 0.92rem` (current) | `--space-md: 12px` (current) | `--radius-md: 8px` (current) | `--shadow-sm: 0 2px 8px rgba(0,0,0,0.08)` (current) | Regular (~14 rows / 1080 viewport) |
| 2 — Modern-clean | Notion / Linear default / modern fintech. Generous whitespace, soft shadows, rounded. | `--font-size-md: 1.0rem` | `--space-md: 16px`, `--space-lg: 24px`, `--space-xl: 32px`, `--space-2xl: 48px` | `--radius-md: 12px`, `--radius-lg: 16px` | `--shadow-sm: 0 4px 12px rgba(15,23,42,0.04)`, `--shadow-md: 0 8px 24px rgba(15,23,42,0.06)`, `--shadow-lg: 0 24px 64px rgba(15,23,42,0.10)` | Low (~10 rows / 1080) |
| 3 — Bold (dense-pro-tool) | Terminal for power users. Maximum density, small fonts, sharp 1px borders. Linear/Bloomberg. | `--font-size-md: 0.78rem` | `--space-md: 6px`, `--space-lg: 10px`, `--space-xl: 14px`, `--space-2xl: 20px`, `--space-sm: 4px`, `--space-xs: 2px` | `--radius-md: 2px`, `--radius-lg: 4px`, `--radius-sm: 2px` | `--shadow-sm: 0 0 0 1px rgba(15,23,42,0.08)` (border-like), `--shadow-md: 0 1px 2px rgba(15,23,42,0.08), 0 0 0 1px rgba(15,23,42,0.08)`, `--shadow-lg: 0 4px 8px rgba(15,23,42,0.12), 0 0 0 1px rgba(15,23,42,0.12)` | HIGH (~22+ rows / 1080) |

Color tokens stay NEUTRAL across all 3 directions (per Phase 1's platform default — Slate-900 near-black). Directions differentiate via density/typography/surface treatment, not brand color. Per-tenant override (e.g., Prizma's Indigo) cascades on top of any chosen direction.

**Anti-blandness check** (criterion-style, enforced in each sub-SPEC): if at INDEX render-time Direction 3 visually looks like Direction 1 (same row density), the sub-SPEC FAILS. Concrete metric: on a 1080-tall viewport, table-heavy modules must show D1≈14 rows, D2≈10 rows, D3≥22 rows.

---

## 7. Out of scope (across all 3 sub-phases)

- Migrating any production module to the chosen direction's layout. That happens AFTER Phase 4 in separate per-module SPECs.
- Component CSS modification (Phase 2 closed it).
- variables.css token-value modification (Phase 1 + 2 settled it; Phase 4 promotes the winning direction's tokens to variables.css).
- Mobile-first responsive overhaul.
- Dark mode for non-Prizma tenants.
- Storefront repo theming.

---

## 8. Hand-off

After this SPEC's children (3a + 3b + 3c) all close 🟢:
- 3 direction folders sit at `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/`, each independently browsable via its INDEX.html.
- Phase 4 unblocks. Step 2 of Phase 4 SPEC asks Daniel to pick a winner.
- Daniel picks → Phase 4 promotes that direction's non-color tokens to `variables.css`, archives the other 2 directions to `_archive/design-system-rejected-directions/`, closes the initiative.

The combined FOREMAN_REVIEW (Daniel directive 2026-05-10) at end of Phase 4 covers Phases 1 + 2 + 3a + 3b + 3c + 4.

---

## 9. Lessons already incorporated (from Phase 1 + Phase 2 execution)

Each sub-SPEC also lists these directly, but for traceability the parent records:

- **From M1_5-SPEC-DRIFT-01 (Phase 1):** every grep criterion in sub-SPEC §3 must be tested at SPEC-author time against §8 prescribed text. If a literal substring doesn't match, fix one or the other before SPEC seals.
- **From M2-SPEC-DRIFT-01 (Phase 2):** every CSS-name regex in sub-SPEC §3 uses `[a-z0-9-]+` char-class — CSS custom properties may contain digits (`--color-gray-400`, `--font-size-2xl`).
- **From M4_CLOSURE Proposal 2 (cross-cycle):** every sub-SPEC's expected-modified list includes M1.5 CHANGELOG.md + MASTER_ROADMAP.md. Both are MUST-EDIT.
- **From M4_HARDCODED Executor Proposal 2 (cross-cycle):** every sub-SPEC explicitly classifies files as MUST-EDIT / MAY-EDIT / VERIFY-ONLY.
- **From Phase 2 Executor Proposal 2 (just now):** when fixing a SPEC-prescribed change reveals a latent bug, executor MAY extend scope BY ONE adjacent fix per file. Codified in sub-SPEC §4 autonomy envelope.

---

*Original full Phase 3 SPEC content (~440 lines, pre-split) is preserved in git history at commit `ff0a760`. The 3 sub-SPECs collectively cover the same scope.*
