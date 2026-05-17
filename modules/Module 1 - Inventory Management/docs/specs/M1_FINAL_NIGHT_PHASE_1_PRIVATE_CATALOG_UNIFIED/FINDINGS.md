# FINDINGS — M1 Final Night Phase 1: Private Catalog on Unified Schema

**Reporter:** opticup-executor (Claude Code, Cowork)
**Date:** 2026-05-17 night
**SPEC:** `M1_FINAL_NIGHT_PHASE_1_PRIVATE_CATALOG_UNIFIED/SPEC.md`

Findings are not blockers — they are observations for the Foreman + future SPECs.

---

## F-1 (MEDIUM) — Architect Brief assumed table-existence without DB probe

**Where:** `M1_FINAL_COMPLETION_NIGHT_BRIEF.md` §3.2 assumed 9 catalog tables (brand × design × variant × 3 product types).

**Reality:** Only 5 catalog tables exist. The unified-design model with `product_type` CHECK constraint on `lens_design` was added by predecessor SPEC `M1_CONTACT_LENSES_ACCESSORIES` (commit `a90eb98`, 2026-05-16/17). Brief's assumption pre-dated that work or missed it.

**Cost of finding it:** Pre-flight P-Q1 surface escalation → P-Q2 deep-probe escalation → Architect re-decision (Option 1 → Option A). ~20min round-trip.

**Improvement target:** Either (a) opticup-architect SKILL.md gains a step requiring DB probe of all referenced tables BEFORE Brief seal, or (b) opticup-executor SKILL.md gains a step requiring pre-flight to surface the unified-discriminator pattern (CHECK constraints + data partitioning) before escalating "table missing."

**Memory captured:** `feedback_probe_constraints_not_just_tables.md` (saved this session). The lesson applies to Cowork architect + Claude Code executor symmetrically.

---

## F-2 (MEDIUM) — Brand-level product_type filter missed in component MVP

**Where:** `shared/js/catalog-private-admin.js` `loadBrands()` — fixed in C-6 but instructive.

**Symptom:** Lens tab showed 16 global brands when only 6 are glasses-typed. Variant click would show 0 variants for brands like Acuvue (contact-lens-only).

**Root cause:** MVP design filtered designs + variants by product_type but not brands. Subtle because brands have no `product_type` column themselves — the discriminator lives one level down on the design table.

**Fix:** 2-query pattern in `loadBrands`: first SELECT distinct brand_id from `lens_design` filtered by product_type + owner predicate, then SELECT brands `.in('id', brandIds)`. Verified across 3 product types.

**Improvement target:** When a hierarchy has a discriminator at level N, the UI filter at level N-1 (or above) must propagate the discriminator predicate via a join/sub-select. A unit-style check could enforce this for any future cross-hierarchy filter.

---

## F-3 (LOW) — Permission seed required role name correction

**Where:** SPEC §3.C originally specified role `branch_manager` for the manage grants. Live schema only has roles `{ceo, manager, team_lead, viewer, worker, platform_super_admin}`.

**Fix:** SPEC updated + migration uses `manager` — caught BEFORE applying the migration, so no destructive op. Brief §3.4 wording "CEO / Branch Manager" was the source of the assumption.

**Improvement target:** Briefs should reference role IDs as they exist in the DB, not natural-language names. Or: an architect-side SKILL step that probes `roles` table for canonical IDs before drafting SPEC role-grants.

---

## F-4 (LOW) — `clone_catalog_entry_to_private` initial migration left default PUBLIC EXECUTE grant

**Where:** Migration `m1_phase1_clone_to_private_rpc` (C-2) initially used `REVOKE EXECUTE FROM anon` to lock down the SECURITY DEFINER function.

**Symptom:** Postgres auto-grants EXECUTE to PUBLIC at function creation. PUBLIC EXECUTE means anon (and any role) inherits the grant unless REVOKEd from PUBLIC.

**Fix:** Corrective migration `m1_phase1_clone_to_private_rpc_revoke_public` (C-2 same commit) applied `REVOKE FROM PUBLIC`. Final ACL: authenticated + postgres + service_role.

**Pattern previously seen:** Sentinel SECURITY_HOTFIX_2 batch on 2026-05-15 — "anon EXECUTE revokes on 16 RPCs" — fixed the same class of bug across pre-existing RPCs. Phase 1's RPC nearly replicated the same defect.

**Improvement target:** Add a check in `scripts/checks/` (or opticup-executor SKILL.md) — after `CREATE FUNCTION ... SECURITY DEFINER`, verify the ACL doesn't include PUBLIC. Single-query verification.

---

## F-5 (LOW) — `private-catalog` tab duplicates `catalog-admin` tab semantics

**Where:** Each of the 3 inventory shells now has both `catalog-admin` (existing) and `private-catalog` (new) tabs.

**Symptom:** Slight surface duplication. For lens: `catalog-admin` is platform-admin only (hidden for store CEOs), `private-catalog` is store-CEO only — they're mutually exclusive in practice, no user sees both. For contact-lens + accessory: existing `catalog-admin` placeholder still ships with `<mod>.catalog.admin` perm (CEO+manager have it) AND new `private-catalog` ships with `<mod>.catalog.private.manage|<mod>.catalog.global.view` perm (CEO+manager have it). CEOs see TWO "catalog" tabs — one a placeholder, one functional.

**Decision (executor):** Documented as D-1 in EXECUTION_REPORT. Avoided touching the existing `catalog-admin` placeholders to minimize blast radius. Trade-off: UX confusion until placeholders are reconciled.

**Improvement target:** Phase 2 polish or follow-up SPEC: either (a) delete the contact_lens + accessory `catalog-admin` placeholders since they're redundant, or (b) rename existing `catalog-admin` perm/label/role to distinguish from `private-catalog` semantically.

---

## F-6 (LOW) — `partialUrl: null` handling required ensureLoaded edits across 3 shells

**Where:** `inventory-shell-{lens,contact,accessory}.js` all called `fetchPartial(spec.partialUrl)` unconditionally.

**Fix:** Wrapped in conditional: `var partialP = spec.partialUrl ? fetchPartial(spec.partialUrl) : Promise.resolve(null);`. Then `if (text != null) section.innerHTML = text;`. Applied symmetrically to all 3 shells.

**Improvement target:** Push this null-handling into a shared shell helper (per Iron Rule 21). The 3 inventory shells are 80% duplicate code (DG-5.A explicit parallel-prefix isolation per predecessor SPEC). Future SPEC: factor out shared `lazy-loader.js` in `modules/inventory/` and reduce the 3 shells to thin per-category metadata files.

---

## F-7 (INFO) — `explicitBootstrap: true` flag added only to lens shell

**Where:** `inventory-shell-lens.js` had an `if (spec.moduleScript && spec.bootstrapGlobal)` gate that prevented bootstrap dispatch on first-load for `scripts[]` tabs (the gate was added because lens main.js IIFEs auto-bootstrap themselves). My new shared component does NOT auto-bootstrap (it just registers `window.CatalogPrivateAdmin.init`). Added `explicitBootstrap: true` flag + extended condition: `(spec.moduleScript || spec.explicitBootstrap) && spec.bootstrapGlobal`.

**Note:** Contact + accessory shells already dispatched bootstrap on first-load unconditionally for `scripts[]` tabs (their existing pattern), so no change needed there. The lens shell has subtle quirks because it was the first migrator (per `M1_INVENTORY_UNIFIED_SCREEN` 2026-05-16).

**Improvement target:** When the 3 shells get factored to a shared helper (F-6), the auto-bootstrap rule needs unification — `explicitBootstrap` should be the default for non-module scripts that ARE shared components.

---

## F-8 (INFO) — Stale `claude.exe` zombie processes on Windows

**Where:** Concurrency guard P-Q4 found 11 `claude.exe` processes — 9 from 2026-05-13 (4 days stale), 2 from 2026-05-16 morning (>12h stale).

**Symptom:** Could cause false "concurrent CLI session" alarms in future autonomy runs. Each process is a Windows zombie handle, not an active session.

**Mitigation in this session:** Brief §13 explicitly exempts "Sentinel cron + Watcher service + Desktop spawns" — I treated all stale processes as exempt.

**Improvement target:** Add a Windows-specific cleanup script (`scripts/dev/cleanup-stale-claude-handles.ps1`) OR enhance the concurrency guard to count only processes started in the last 60min as "active."

---

## F-9 (INFO) — Demo PIN session lacked new perms at smoke-test time

**Where:** Smoke-test showed the new `הקטלוג שלי` button hidden by permission-ui.js for the active demo session.

**Cause:** The session was active before C-3 ran. The permission cache on the client side wasn't refreshed. Brief §3.4 implicitly assumed fresh sessions would pick up the new perms.

**Mitigation:** Smoke-test programmatically force-showed the button to verify component rendering. Real users get the perms after their next PIN refresh.

**Improvement target:** Permission seeding migrations could include a `NOTIFY` channel that the front-end listens to + force-refresh permission cache. ~15min follow-up SPEC. Or document the "log out + log back in after permission seed" expectation.

---

*End of FINDINGS. 1 MEDIUM × 2 + LOW × 4 + INFO × 3 = 9 total. None block the morning Foreman review.*
