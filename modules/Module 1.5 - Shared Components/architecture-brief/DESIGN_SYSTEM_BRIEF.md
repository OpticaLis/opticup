# Design System — Architecture Brief

**Brief version:** v1
**Date:** 2026-05-10
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Module Strategist (`opticup-strategic` skill) → 5-agent SPEC chain
**Owning module:** Module 1.5 — Shared Components

---

## 1. Purpose

Build a unified, tenant-themable design system for Optic Up's ERP — design tokens (colors, typography, spacing, shadows, radii), component library (buttons, modals, tables, forms, cards), and accessibility standards. The system lives in Module 1.5 so every tenant can override its theme (colors, logo, font) without code changes. This locks the visual contract before the remaining modules (M5–M15) start building UI; otherwise each module ships with ad-hoc styling and we pay the cost of unification later.

**Storefront is OUT of scope.** The public storefront has its own design language and stays as-is. Storefront for future tenants is intentionally simpler/different and does not consume this system.

## 2. Scope — In

What MUST be delivered:

- **Design tokens** (CSS custom properties, scoped per-tenant via Module 1.5 tenant config): primary/secondary/surface/text colors, typography scale (Rubik 4 weights), spacing scale, shadow scale, border-radius scale, motion/easing tokens.
- **Theme defaults — neutral.** The shipped default is a neutral palette (no Prizma gold). Prizma is configured as a tenant-level override, just like any future tenant. SaaS-clean: tenant #2 arrives, gets neutral defaults, customizes — no inherited Prizma residue.
- **3 design directions × all relevant modules** (existing in-production + every module that already has approved sketches), delivered as **HTML files organized in a folder-per-direction structure**:

```
modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/
├── direction-1-conservative/
│   ├── INDEX.html               (tab nav across all modules in this direction)
│   ├── M1-inventory.html
│   ├── M3-storefront-studio.html
│   ├── M4-crm.html
│   ├── M5-customers.html
│   ├── M6-prescriptions.html
│   ├── M7-orders.html
│   ├── M8-payments.html
│   ├── M9-lab-kds.html
│   ├── M11-reports.html
│   ├── M12-communications.html
│   ├── M13-loyalty.html
│   ├── M14-appointments.html
│   └── M15-queue.html
├── direction-2-modern-clean/
│   └── (same files)
└── direction-3-bold/
    └── (same files)
```

  Each direction folder = full set. Daniel switches between directions by opening a different folder's `INDEX.html`. This makes apples-to-apples comparison instant.

- **The 3 directions:**
  1. **Conservative** — close to current Prizma look, minimal disruption, gold-on-dark feel kept as the Prizma override sample.
  2. **Modern-clean** — light, airy, neutral, similar in feel to the current Storefront aesthetic but adapted for ERP density.
  3. **Bold** — substantively different (could be high-contrast, brutalist-grid, dense-pro-tool, or other — Module Strategist's call) so Daniel sees the real range, not 3 variations of the same idea.

- **Sketch-preservation rule (CRITICAL):** for the 10 modules that already have approved sketches (M5/M6/M7/M8/M9/M11/M12/M13/M14/M15), the **layout, screens, components, and information hierarchy stay identical** to what was already approved. Only colors, typography, shadows, radii, and surface treatments change per direction. Re-designing layout = out of scope. The source-of-truth approved sketches live in each module's `architecture-brief/MN_SKETCHES.html` — Module Strategist reads each one and replicates it under the 3 design directions.
- **Component library** — buttons (primary/secondary/danger/ghost), modals (Module 1.5 existing Modal extended), tables (TableBuilder restyled), forms (inputs/selects/checkboxes/PIN), cards, alerts/toasts, navigation (sidebar/topbar), empty states. Each component must work under all 3 directions × any tenant theme override.
- **Tenant theming mechanism** — extend Module 1.5's existing tenant-config plumbing so a tenant row holds: primary/secondary/accent colors, logo URL, font choice (from a curated list). Theme switches by setting CSS custom properties on `<body>` from tenant config — no recompile needed.
- **Accessibility baseline** — WCAG AA color contrast on all combinations, focus-visible on every interactive element, keyboard navigation on every component.

## 3. Scope — Out (anti-creep)

- **Storefront design.** Out of scope per Daniel's directive 2026-05-10. Storefront has its own canon (`PRIZMA_DESIGN_SYSTEM_CANONICAL.md`).
- **Migrating existing modules to the new system.** This brief produces the system + 3-direction proposals. Daniel picks the direction. THEN a separate SPEC migrates each module — phased, not big-bang. Migration SPECs are NOT in this brief's scope.
- **Mobile-first responsive overhaul.** ERP is desktop-primary; the design system supports responsive but doesn't restructure the modules to be mobile-first. Out of scope for now.
- **Dark mode for tenants other than Prizma.** Prizma has dark; other tenants get light by default. Dark mode as a per-tenant capability is deferred.
- **Design tokens for storefront tenants.** Future tenant storefronts will be simpler/different — separate concern.
- **Animation library / Lottie / micro-interactions library.** Motion tokens are in scope; an animation library is not.

## 4. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | Owning module: Module 1.5 (Shared Components) | Architect — Module 1.5 already owns cross-module infra |
| 2 | Default theme = neutral, NOT Prizma gold | Daniel 2026-05-10 (this conversation) |
| 3 | Prizma is configured as tenant-override, like any future tenant | Daniel 2026-05-10 |
| 4 | 3 design directions per module: Conservative / Modern-clean / Bold | Daniel 2026-05-10 |
| 5 | All relevant modules covered: existing (M1 Inventory, M4 CRM, M3 Storefront Studio admin) + every module with approved sketches (M5 Customers, M6 Prescriptions, M7 Orders, M8 Payments, M9 Lab/KDS, M11 Reports, M12 Communications, M13 Loyalty, M14 Appointments, M15 Queue) | Daniel 2026-05-10 |
| 5a | For modules with approved sketches: keep layout identical, change only colors/typography/surface treatment per direction | Daniel 2026-05-10 |
| 5b | Folder structure: `direction-N-name/MX-module.html` — one folder per direction with all modules inside; INDEX.html in each direction for tab nav | Daniel 2026-05-10 |
| 6 | Storefront (public side) is OUT of scope | Daniel 2026-05-10 |
| 7 | Deliverable format: interactive HTML, one file per module, tab nav between 3 directions | Daniel 2026-05-10 (Pattern P35) |
| 8 | Theme override mechanism uses Module 1.5 tenant config + CSS custom properties on `<body>` | Architect — minimum invasive |
| 9 | Hybrid model: platform default + tenant override (Pattern P26) | Inherited from skill canon |

## 5. Dependencies

### Upstream (must exist before this module starts)

- **Module 1.5 tenant-config infrastructure** — already exists, design tokens extend it.
- **Module 1.5 component primitives** (Modal, Toast, TableBuilder, PIN modal) — already exist; design system restyles them.
- **Iron Rule 19** (configurable values = tables, not enums) — applies to theme color presets if we offer any.

### Downstream (waiting on this module)

- **All future modules M5–M15** — will be built on the chosen design direction.
- **Repo Split (OPEN_TASKS #2)** — will package the design tokens + components into the shared package consumed by per-module repos.
- **Per-module migration SPECs** — separate work, will reference the chosen direction.

## 6. Cross-Module Contracts

- **Contract A — Token namespace.** All CSS custom properties use a single namespace prefix (e.g. `--ou-color-primary`, `--ou-radius-md`). Every module CSS reads from these tokens; never hardcodes colors/sizes. The token names are the public contract; the values are tenant-overridable.
- **Contract B — Component API stability.** Existing Module 1.5 component function signatures (Modal.open, Toast.show, TableBuilder, etc.) MUST NOT break. Design system restyles them; the JS surface area stays identical so existing modules don't need code changes for the styling pass.
- **Contract C — Theme application.** Tenant theme is applied by setting CSS custom properties on `document.body` (or `:root`) from `auth-service` boot, after JWT decode + tenant config fetch. No per-component theme prop.
- **Contract D — Accessibility minimum.** Every component must pass WCAG AA contrast and have a `:focus-visible` style. Verifier: `axe-core` baseline run as part of Localhost-Tester smoke.

## 7. Open Questions Specific to This Module

These are NOT for the Architect to answer. Module Strategist resolves with Daniel during SPEC authoring:

- Which font(s) ship with the neutral default? (Rubik is Prizma's; what's the platform-neutral choice?)
- Should "Bold" direction be brutalist, dense-pro-tool, high-contrast, or something else? Module Strategist proposes 3 sub-options for the Bold direction with rationale; Daniel picks one before the HTML build.
- How many tenant-themable values total? Color count — primary + secondary + accent + surface, or richer (10+ tokens)? Trade-off: richer = more flexibility, simpler = easier for tenant onboarding. Recommend: start with 6-8 tenant-overridable tokens, rest are platform-locked.
- Do we offer tenant a "preset bundle" picker (pick from 5 curated palettes) or a free color picker? Recommend: preset bundles day-1, free picker deferred.
- How does the design-system change land on the existing modules — restyle in-place, or the design system is dormant until per-module migration SPECs run? Recommend: dormant. Design tokens + components ship with neutral defaults but no module is migrated in this brief.

## 8. Anti-Patterns (Things to Avoid)

- **Don't relitigate Storefront design.** Out of scope; if temptation arises to "unify storefront too" — STOP, that's a separate decision.
- **Don't migrate any existing module's UI in this brief.** Tempting because the new system is right there. Migration is a separate SPEC per module.
- **Don't hardcode Prizma colors anywhere in the new system.** Prizma is tenant config, not the default. Iron Rule 9 (no hardcoded business values) applies hard.
- **Don't break existing component JS APIs.** Restyle, don't refactor signatures. Existing modules in production must continue working unchanged.
- **Don't ship before accessibility check passes.** WCAG AA is non-negotiable for SaaS.
- **Don't show Daniel 3 variations of the same idea.** The 3 directions must be substantively different; if they all feel the same, redo.
- **Don't sketch a single "ideal" direction.** Daniel asked for 3 to choose from. Do not collapse into one prematurely.
- **Don't redesign approved sketches.** For M5/M6/M7/M8/M9/M11/M12/M13/M14/M15 — the layout is locked. Color/typography/surface treatment is what changes per direction. If you find yourself moving buttons or restructuring screens — STOP, that's a new sketch revision, not a design system pass.
- **Don't put all modules in one HTML file per direction.** One file per (direction, module) so the files stay readable and editable; INDEX.html per direction for navigation.

## 9. Iron Rules in Sharp Focus

- **Rule 9 (no hardcoded business values)** — the default theme has no Prizma. Theme values come from tenant config.
- **Rule 14/15 (tenant_id + RLS)** — if the design system adds any DB tables (e.g. `tenant_themes`, `tenant_color_presets`), they must follow tenant isolation.
- **Rule 19 (configurable = tables, not enums)** — color presets, font choices = tables.
- **Rule 20 (SaaS litmus)** — second tenant arrives, picks theme, zero code changes. If the chosen direction can't pass this, redo.
- **Rule 21 (no orphans/duplicates)** — extend Module 1.5 components, don't create parallel components.
- **Rule 12 (file size 350-line max)** — the design tokens + components stay split; one big "design-system.css" violates the rule.

## 10. Relevant Reference Files

| File | Why |
|---|---|
| `__LAUNCH_PLAN_DRAFT__/campaign-overseer/PRIZMA_DESIGN_SYSTEM_CANONICAL.md` | Prizma's existing visual canon — input for the "Conservative" direction's Prizma override sample |
| `modules/Module 5 - Customers/architecture-brief/M5_SKETCHES.html` | Approved layout to preserve |
| `modules/Module 6 - Prescriptions/architecture-brief/M6_SKETCHES.html` | Approved layout to preserve |
| `modules/Module 7 - Orders/architecture-brief/M7_SKETCHES.html` | Approved layout to preserve |
| `modules/Module 8 - Payments/architecture-brief/M8_SKETCHES.html` | Approved layout to preserve |
| `modules/Module 9 - Lab KDS/architecture-brief/M9_SKETCHES.html` (4 sketch files) | Approved layout to preserve |
| `modules/Module 11 - Reports/architecture-brief/M11_SKETCHES.html` | Approved layout to preserve |
| `modules/Module 12 - Communications/architecture-brief/M12_SKETCHES.html` | Approved layout to preserve |
| `modules/Module 13 - Loyalty Club/architecture-brief/M13_SKETCHES.html` | Approved layout to preserve |
| `modules/Module 14 - Appointments/architecture-brief/M14_SKETCHES.html` | Approved layout to preserve |
| `modules/Module 15 - Queue/architecture-brief/M15_SKETCHES.html` | Approved layout to preserve |
| `modules/Module 1.5 - Shared Components/docs/MODULE_SPEC.md` | Existing component primitives (Modal, Toast, TableBuilder, PIN modal) |
| `modules/Module 1.5 - Shared Components/docs/MODULE_MAP.md` | Code map for Module 1.5 |
| `modules/Module 1.5 - Shared Components/docs/db-schema.sql` | Existing tenant-config tables to extend |
| `docs/GLOBAL_MAP.md` | Function registry — design tokens must integrate with `auth-service` tenant boot |
| `docs/CONVENTIONS.md` | Existing UI patterns to honor |
| `CLAUDE.md` §4–§7 | Iron Rules + Authority Matrix |

## 11. Hand-off Note

Daniel takes this brief to a fresh Claude Code session and runs the 5-agent chain:

1. **Foreman (`opticup-strategic`)** reads this brief + references → writes per-phase SPECs (probably 3–4 phases: tokens infra → component library → 3 HTML mockups for the 3 modules → accessibility pass + tenant theming wiring).
2. **Executor (`opticup-executor`)** implements each SPEC under Bounded Autonomy.
3. **Reviewer (`opticup-reviewer`)** audits each phase for Iron Rule + security compliance.
4. **Localhost-Tester (`opticup-localhost-tester`)** runs smoke + axe-core on the demo tenant.
5. **Foreman** writes FOREMAN_REVIEW.md per phase + 2 skill-improvement proposals each.

Architect stays out unless: cross-module decision arises, scope change, or strategic blocker (e.g. Daniel rejects all 3 directions and we need a fresh axis).

The decision moment for Daniel: after the 3 HTML mockup files exist, Daniel reviews → picks ONE direction → that direction becomes the platform default and the other two are archived. Subsequent per-module migration SPECs reference the chosen direction.

---

*End of brief. Module Strategist owns from here.*
