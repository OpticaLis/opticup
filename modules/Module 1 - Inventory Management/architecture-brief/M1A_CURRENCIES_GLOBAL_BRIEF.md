# Brief — M1A Hotfix: Currencies Global (M1A-DEBT-01)

**Brief version:** v1
**Date:** 2026-05-14
**Author:** Architect
**Hand-off to:** Module Strategist → Executor (Full Auto Pipeline)

---

## 1. Purpose

Fix `M1A-DEBT-01` — the `currencies` table was shipped in Phase 1A as a per-tenant table but left empty. This blocks tenant-2 onboarding and any FK from lens tables. Convert to a **global reference table** (no `tenant_id`) populated with ISO-4217 reference data shared across all tenants.

This is a small, surgical hotfix between Phase 1A close and Phase 1B start. Not a new module phase — corrective work on Phase 1A.

## 2. Locked Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | `currencies` is a **global** reference table | ISO-4217 is universal data, identical for every tenant in every country. Iron Rule 14 documented exception per M1 sealed schema handoff. |
| 2 | Drop `tenant_id` column from `currencies` | Was added in Phase 1A by mistake (template-applied). Was never used. |
| 3 | RLS pattern: read-anywhere, write-platform-only | Authenticated users in any tenant can SELECT. Only `is_platform_super_admin()` can INSERT/UPDATE/DELETE. |
| 4 | Seed initial 3 rows | `ILS` (Israeli Shekel), `USD` (US Dollar), `EUR` (Euro). Future currencies added via Platform Admin tooling. |
| 5 | Schema additions: standard ISO-4217 fields | `code TEXT PK` (3-letter ISO), `name TEXT NOT NULL` (full name), `symbol TEXT NOT NULL` (₪/$/€), `decimal_digits INT DEFAULT 2`, `is_active BOOLEAN DEFAULT TRUE`. |
| 6 | All existing FKs in M1 Phase 1A schema pointing at `currencies` must be verified clean | Either they already reference `(code)` only, or they need re-pointing. SPEC must list every consumer. |
| 7 | Apply on demo and prizma simultaneously | Phase 1A already shipped to both. Hotfix follows. |

## 3. Scope — In

- DROP `tenant_id` column from `currencies` (must verify zero rows exist first; abort if any rows would be deleted unexpectedly).
- Re-define `currencies` PK on `code` if not already.
- Seed `ILS`, `USD`, `EUR`.
- Re-establish RLS policies per the new pattern (read-anywhere, write-platform-only).
- Verify every M1 Phase 1A table FK to `currencies` still resolves correctly.
- Update `docs/GLOBAL_SCHEMA.sql` + `docs/DB_TABLES_REFERENCE.md` + module's `db-schema.sql` to reflect the corrected shape.
- Update `decisions/M1.md` with D-M1-16 entry documenting this resolution.
- Update `MASTER_ROADMAP.md` post-cutover state to mark M1A-DEBT-01 closed.

## 4. Scope — Out

- No changes to other Phase 1A tables.
- No re-deployment of `lens-catalog-import` Edge Function (unaffected).
- No new mockups or screen changes.
- No merge to main (stays on develop until Phase 1B closes and full batch ships).
- No changes to `vat_rates` (the sibling reference table — it IS per-tenant by Iron Rule 19, country-specific rates differ).

## 5. Dependencies

### Upstream

- Phase 1A schema must be live (verified — commit 285b5d6).
- `is_platform_super_admin()` function from Module 2 (verified live).

### Downstream

- **Phase 1B SPEC** waits on this hotfix landing.
- **Future tenant-2 onboarding** depends on this being correct.

## 6. Cross-Module Contracts

No new contracts. The fix is internal to M1's reference data layer.

## 7. Open Questions

None. Decision locked unambiguously.

## 8. Anti-Patterns

- **Do not re-implement as `currencies` in a separate "shared" schema.** It stays in `public` per CLAUDE.md §7 Authority Matrix and existing schema conventions.
- **Do not add a `tenant_id NULL` "for future use" column.** Iron Rule 14's exception is explicit and documented; obfuscating it with a nullable column is worse than acknowledging it.
- **Do not seed a 4th or 5th currency speculatively.** Three is enough for current and near-future scope. Adding more is a separate decision when needed.

## 9. Iron Rules in Sharp Focus

- **Rule 14** — `currencies` is the documented exception. The SPEC §1 must cite this explicitly so future audits don't flag it.
- **Rule 15** — Two RLS policies: `read_anywhere` (USING `true` to authenticated role) + `write_platform_only` (USING `is_platform_super_admin()`).
- **Rule 21** — Verify no orphan `currencies` row references in code before dropping `tenant_id`. Grep for `tenant_id` + `currencies` together.

## 10. Reference Files

| File | Why |
|---|---|
| `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_PHASE_1_BRIEF.md` | Phase 1A context |
| `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/FOREMAN_REVIEW.md` | Source of M1A-DEBT-01 finding |
| `docs/GLOBAL_SCHEMA.sql` | Schema baseline to patch |
| `.claude/skills/opticup-architect/references/decisions/M1.md` | Where D-M1-16 lands |
| `CLAUDE.md` §4 Rule 14 | The exception is here |

## 11. Hand-off Note

Daniel pastes the sibling Activation Prompt into a fresh Claude Code chat. The Pipeline runs `opticup-strategic` → SPEC author → `opticup-executor` → Reviewer → Localhost-Tester → `opticup-strategic` for FOREMAN_REVIEW — same as a normal SPEC, just smaller scope. The Module Strategist may decide whether this warrants its own folder under `docs/specs/` or whether it lives as a sub-SPEC inside `M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/` as a hotfix retrospective. Either is acceptable.

After this hotfix closes, the Pipeline can resume to Phase 1B (the 6 customer-facing screens) when Daniel says go.

---

*End of Brief.*
