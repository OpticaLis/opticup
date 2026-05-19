# FINDINGS — M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A

> Authored by: opticup-executor (Claude Code Opus 4.7 1M)
> On: 2026-05-18 evening (IDT)

Findings discovered during execution that are NOT in scope for this SPEC but
must be surfaced for Foreman triage (new SPEC / TECH_DEBT entry / dismiss).

---

## F-1 — `display_id` on `lens_variant` + `contact_lens_variant` requires user input or sequence RPC

**Severity:** MEDIUM
**Location:** `lens_variant.display_id` (text NOT NULL no-default no-trigger), `contact_lens_variant.display_id` (same)
**Discovered:** mid-run during Step 1.5 NOT NULL no-default probe + `information_schema.triggers` empty.

**Description:**
Both variant tables have `display_id text NOT NULL` with no DB-side default and no trigger that auto-populates the column. Existing data shows two inconsistent patterns:
- `lens_variant`: mix of `LV-TST001`, `P5G-PZ1`, `000P1G` etc. (3+ shapes — no convention)
- `contact_lens_variant`: `CL-000001` through `CL-000040` (sequential 6-digit suffix)

The Stage 2A variant modal therefore requires the user to enter `display_id` manually. This works but has two problems:
1. **Iron Rule 11 — Sequential numbers MUST use atomic RPC with FOR UPDATE lock.** Manual user entry doesn't enforce uniqueness; collisions are likely with multiple platform admins working concurrently.
2. **Inconsistency between the 2 tables.** Contact lenses follow `CL-NNNNNN`; glasses are wild-west. Future seed imports will struggle.

**Suggested next action:** New SPEC (small, ~30 min) authoring `next_lens_variant_display_id()` + `next_contact_lens_variant_display_id()` atomic RPCs (FOR UPDATE pattern matching `next_box_number` reference impl) + UNIQUE constraint on (`display_id`, tenant_id=null) per Iron Rule 18. Then update Stage 2A's variant modal to call the RPC + render the result as read-only (or hidden). The earlier `next_lens_variant_display_id` referenced in MODULE_MAP.md line 2284 may already exist — verify before re-implementing.

## F-2 — `lens_design.version` not added to FIELD_MAP in `js/shared.js` (Iron Rule 5)

**Severity:** LOW
**Location:** `js/shared.js` FIELD_MAP object; missing entry for `lens_design.version`.
**Discovered:** Iron Rule 5 self-audit at closure.

**Description:**
Iron Rule 5 mandates every new DB field add to FIELD_MAP in `shared.js`. `lens_design.version` is a new column added by Stage 2A's migration. FIELD_MAP entry not added in this SPEC.

**Mitigation reasoning:** The `version` field is platform-internal (rendered in detail-pane title badge, not as a column header or tenant-facing label). The Stage 1 precedent (P-AUTHOR-2 from `M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1/FOREMAN_REVIEW.md`) defers `docs/FILE_STRUCTURE.md` updates to Integration Ceremony (module close). Same disposition reasonable here.

**Suggested next action:** Either (a) add to FIELD_MAP at next housekeeping pass, or (b) defer to M1 Module Close Ceremony alongside the other deferred docs (`docs/GLOBAL_SCHEMA.sql` merge, `docs/FILE_STRUCTURE.md` row additions). Foreman to decide.

## F-3 — `catalog-import.js` button wiring is dead code in Stage 2A

**Severity:** INFO
**Location:** `modules/lens-catalog-admin/catalog-import.js` (125 LOC) + the disabled `#btn-import` button in `lens-catalog-admin-partial.html` line 39.
**Discovered:** Architecture review at Stage 2A wiring.

**Description:**
Stage 2A disables the `#btn-import` header button with `title="זמין בשלב 2ב"`. The orchestrator (`lens-catalog-admin.js`) no longer imports or calls `wireImportFlow` — the import.js file's exports are now unused. This is intentional per SPEC §7 (`Excel parsing logic ... Stage 2B`).

The file remains untouched (SPEC §8 lists it as `Unchanged`). The `<input type="file" id="import-file">` element remains in the partial because removing it would risk breaking a downstream hidden flow that may still read from it. The button-click → `fileInput.click()` wire in `wireImportFlow` (catalog-import.js line 14) is now disconnected; nothing calls `wireImportFlow`.

**Suggested next action:** No action needed during Stage 2A. Stage 2B will resurrect the wiring as part of the Excel import work. If Stage 2B reorganizes the file (likely), this dead-code window closes naturally.

## F-4 — `lens_design.lens_type` does not have a CHECK constraint enforcing the SPEC's option list

**Severity:** INFO
**Location:** `lens_design.lens_type` column (text NOT NULL); no CHECK constraint enumerating valid values.
**Discovered:** Pre-write schema rehearsal in Step 1.5.

**Description:**
The SPEC §0.2 D-FIX-2 enumerates the valid `lens_type` values as `single_vision / progressive / bifocal / office / occupational / soft_contact / hard_contact / accessory_general`. The DB does not enforce this enumeration at the column level — any string is accepted. The new Stage 2A modal renders a `<select>` with the canonical options, which provides client-side enforcement, but a malicious or buggy client could insert any string.

**Suggested next action:** Add a CHECK constraint or convert the column to an `ENUM` type. This is a wider refactor that should be part of a future schema hardening SPEC, not done piecemeal. Logged for tracking only.

---

**End of FINDINGS.md. 4 findings (0 CRITICAL, 0 HIGH, 1 MEDIUM, 1 LOW, 2 INFO).**
