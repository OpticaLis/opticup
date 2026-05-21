# SPEC Request — Backfill Demo Static Short-Links (stock + pricing-catalog)

> **Sealed:** 2026-05-21 · **Author:** Campaign Lead · **Audience:** `opticup-architect` (escalation per Iron Rule 35)
> **Type:** SPEC request — NOT a SPEC. The Architect decides scope, writes the SPEC, and routes execution.
> **Risk class:** LOW (demo-only, additive, idempotent INSERTs to `short_links`; no prizma writes)

## 1. One-line ask

Create the 2 missing `template_static` short-link rows on the **demo** tenant — for the stock page and the pricing-catalog page — so that an `event_registration_open` template change referencing the pricing-catalog short link can be tested on demo under Iron Rule 33.

## 2. Why this is escalated to the Architect (not done by the campaign team)

INSERTs into the `short_links` infrastructure table are outside the Campaign Overseer's authority surface (Iron Rule 35 limits the Overseer to templates / rules / broadcasts / schedules / active-flags — NOT short-link infrastructure rows). The campaign team cannot create these rows. Hence: Architect SPEC.

## 3. Background — what's happening and what the Analyst found

Daniel is changing the `event_registration_open` message (SMS already applied by him; email in progress) to swap the **stock** page link for the **pricing-catalog** page link — Prizma static short link `CEiBGCWj` → `https://www.prizma-optic.co.il/supersalepricescatalog/`.

He has chosen to go "by the book": test the change on demo first (Iron Rule 33) before it reaches prizma production.

The Performance Analyst diagnosed the short-links screen (full findings: `roles/campaign-overseer/analyses/2026-05-21_short_links_screen_visibility.md`). Key result: the screen is rendering correctly; the real issue is a **per-tenant content parity gap**. Demo has only 2 `template_static` rows; prizma has 4. The stock + pricing-catalog static links were never created on demo.

**The blocker:** if Daniel's updated template is tested on demo, the resolved `/r/<code>` URL would reference a code that does not exist on demo → 404. So the demo test cannot pass until the demo equivalents exist.

## 4. Current state (DB snapshot, verified read-only 2026-05-21)

`short_links WHERE link_type='template_static'`:

| Target page | Prizma code | Demo code |
|---|---|---|
| `/supersale-takanon/` (תקנון) | `f9Avttrn` | `NCoQWzbd` ✓ |
| `gpw.gamaf.co.il/…` (gamaf) | `KvSzd3Zz` | `dsruWc1z` ✓ |
| `/supersale-stock/` (stock) | `5CBy1Do4` | **— MISSING —** |
| `/supersalepricescatalog/` (pricing) | `CEiBGCWj` | **— MISSING —** |

All rows: `expires_at = 2099-12-31`, `lead_id/event_id/broadcast_id = NULL`.

## 5. No-404 prerequisite — CLEARED

The Analyst flagged a prerequisite: do the demo storefront pages exist, or would demo short links 404? **Resolved by DB evidence:** demo's existing `template_static` rows already point at **`www.prizma-optic.co.il`** (production storefront), e.g. demo's takanon link → `www.prizma-optic.co.il/supersale-takanon/`. Demo does NOT use a separate demo storefront for these static marketing pages — it reuses prizma's live pages. Therefore the backfilled demo links should target the SAME production URLs (`www.prizma-optic.co.il/supersale-stock/` and `…/supersalepricescatalog/`), which already exist and resolve. No 404 risk. (If the Architect prefers to confirm with the Site Overseer before sealing, that is a 2-minute check, not a blocker.)

## 6. Suggested SPEC shape (Architect decides final scope)

- **Scope:** demo tenant only. Two INSERTs into `short_links`:
  - stock → `https://www.prizma-optic.co.il/supersale-stock/`
  - pricing-catalog → `https://www.prizma-optic.co.il/supersalepricescatalog/`
- Each: `link_type='template_static'`, `expires_at='2099-12-31 23:59:59+00'`, `lead_id/event_id/broadcast_id = NULL`, tenant_id = demo, a fresh random `code` (tenant-scoped UNIQUE per Iron Rule 18 — do NOT reuse prizma codes).
- **Idempotent:** guard against re-running (e.g. `WHERE NOT EXISTS` on (tenant_id, link_type, target_url)) so a second run is a no-op.
- **Destructive Operations:** `None.` (additive INSERTs only — Iron Rule 32 declaration).
- **Decision needed in the SPEC:** the screen is read-only with no "+ create static link" affordance (Analyst §4.1 note). The Architect should decide whether to (a) backfill via direct demo-only SQL now AND open a follow-up for a creation UI, or (b) bundle a minimal creation affordance. The campaign team's immediate need is only the 2 demo rows; a creation UI is a nice-to-have, not a blocker.

## 7. Related (optional, lower priority — for the Architect's awareness, not part of the immediate ask)

The Analyst also surfaced two non-blocking improvements the Architect may fold in or defer:
- **Static-card UX clarity** (Analyst §4.2): one line of helper text under "קישורים סטטיים (משותפים)" stating it's not affected by the filter bar. (Iron Rule 34 applies — UI change needs Chrome MCP verification at close.)
- **Parity monitoring** (Analyst §4.3): extend Sentinel Mission 11 (config parity) OR the config-sync script to treat `template_static` rows as IR33-protected config, so demo/prizma static-link drift is caught automatically in future.

The Analyst explicitly REJECTED the two filter-default tweaks the original investigation hypothesized (they'd change the broadcasts table, not the static card — wrong problem). Do not pursue those.

## 8. Definition of done (from the campaign team's perspective)

Demo has `template_static` rows for stock + pricing-catalog pointing at the production storefront URLs, so that Daniel's `event_registration_open` SMS + email change can be sent to a demo test lead (whitelist phones 0537889878 / 0503348349 only) and the `/r/<code>` link resolves (302, not 404). Once that holds, the campaign team can proceed with the IR33 demo-first test → prizma promotion of the template change.

## 9. Handoff

This is a SPEC request, not a SPEC. Daniel opens a fresh chat with `אתה הארכיטקט` (or equivalent) and points the Architect at this file. The Architect writes the SPEC under `modules/Module 4 - CRM/docs/specs/{SLUG}/`, routes execution to the Executor, and verification at close. When demo parity is in place, Daniel re-engages the Campaign Lead to proceed with the message change test.

---

*SPEC request authored by Campaign Lead. The campaign team cannot create short-link infrastructure rows (Iron Rule 35). Architect owns the SPEC.*
