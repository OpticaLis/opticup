# Project LEARNINGS — Optic Up

This file accumulates project-wide LOCKED rules harvested from post-mortem
reviews. Every `opticup-strategic`, `opticup-executor`, Site Overseer, and
Campaign Overseer skill MUST read this file at session start. Rules below are
binding constraints on future code, SPECs, and audits — they cannot be
overridden without an explicit RFC SPEC that supersedes them.

## L-PROJECT-001 — No realistic-looking demo values in source code

**Status:** LOCKED (2026-05-06)
**Source incident:** SPEC `M4_HARDCODED_DEMO_PHONE_CLEANUP`. A decorative
comment in `crm-helpers.js` containing the invented phone number
`050-717-5675` was promoted by a later SPEC to a real DB value
(`tenants.business_phone` for prizma) and rendered on the public storefront
as Prizma's official contact number, despite never being a real value.

**Rule:**
1. **Decorative examples in code** (comments, sample/preview data, JSDoc
   examples, mock fixtures, README snippets) MUST use placeholder forms
   that cannot pass for production values:
   - Phone: `0XX-XXX-XXXX`, `+9725XXXXXXXX`, or explicitly fake like
     `555-0100..555-0199` (US "fake number" reservation block).
   - Email: `user@example.com`, `placeholder@example.test`, never a
     `@prizma-optic.co.il` or other real-looking domain.
   - Address: `[רחוב] [מספר], [עיר]` or `1 Example Street, Sample City`.
   - Names: `John Doe` / `דנה כהן` are acceptable as obviously-generic
     names; real-sounding combinations are not.
   - Coupon/IDs: `SAMPLE-XXXX`, `PLACEHOLDER`, never a string that looks
     like it might be a live promo code.

2. **SPEC authors and audit/cleanup SPECs** MUST verify the provenance
   of any value they intend to promote from code to DB / config /
   external system. If the value's origin cannot be traced to a
   user-supplied or operationally-confirmed source within the repo,
   **STOP and ask the user** before promoting it. The forensic check is:
   `git log -p -S "<value>" -- <file>` to find the introducing commit
   and read its message + diff for provenance.

3. **Cleanup / "remove hardcoded values" SPECs** that move literals from
   code to a config table MUST treat each literal as untrusted by default
   and require explicit user confirmation per literal, OR include a
   verification step that confirms the value against a live system
   (production DB, customer record, business owner direct statement).

**Forbidden patterns** (will fail review on sight):
- `// example: 050-XXX-YYYY` where XXX/YYYY are concrete digits.
- Sample data files containing what look like real customer names + real
  phones + real emails together. Use clearly-fake combinations.
- "Just use 0509999999" — looks more real than placeholder, treat as
  forbidden.

**How a reviewer enforces this:** `grep -rn "050-\|052-\|053-\|054-\|058-" --include='*.js' --include='*.ts' --include='*.astro' --include='*.md'` on any cleanup SPEC's diff. Every hit must be either (a) inside a verified-real config row (per criterion #2 above), or (b) a placeholder pattern per criterion #1.

---

## L-PROJECT-002 — JSONB column writes require type-preservation, not text substitution

**Status:** LOCKED (2026-05-08)
**Source incident:** SPEC `M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL`. The earlier `M3_PHONE_TEMPLATING_AND_CLEANUP` migration (2026-05-07) modified content inside `storefront_pages.blocks` (a `jsonb` array column) by string-level `.replace()` on the JSON text and saved the result. Postgres accepted the write because `jsonb` columns accept any valid JSON value — including a top-level string. 16 customer-facing pages on the production storefront then rendered empty bodies because the Astro renderer expected an array, called `Array.isArray()`, got `false`, and short-circuited. Pages were broken for ~24 hours before discovery. (16, not the 12 originally suspected — 3 `/accessibility/` rows had been broken via a separate manual session 2026-05-01, and SPEC §1 arithmetic miscounted §2's enumerated list of 16 as "15".)

**Rule:**
When a SPEC modifies content inside a `jsonb` column whose schema requires `array` or `object`:
1. **Parse the value to its native runtime type (Array / Object) BEFORE making changes.** Use the Postgres driver's native deserialization, NOT string slicing on the column's text representation.
2. **Mutate the parsed value** using runtime methods (Array.map, Object.assign, etc.).
3. **UPDATE with the mutated native value.** The Postgres driver re-serializes correctly. Do not stringify the value yourself before passing it.
4. **NEVER** do `column::text` then `.replace()` then write the resulting string back as the column value. Postgres will accept it but every consumer that expects an array/object will silently fail.

**Defense (now in place at DB layer):**
- `storefront_pages.blocks` and `storefront_pages.previous_blocks` carry `CHECK (col IS NULL OR jsonb_typeof(col) = 'array')` constraints (added by M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL). Future writes of the wrong type fail at INSERT/UPDATE time with `SQLSTATE 23514`. The bug surfaces in test/dev/CI, not in production rendering.

**Generalization beyond `storefront_pages`:** every `jsonb` column whose application code assumes a specific runtime shape (array, object) SHOULD have a CHECK constraint enforcing `jsonb_typeof()`. Pre-flight a new such column with: "If a string was written here by accident, would the reader code crash gracefully or produce silent garbage?" If silent garbage — add the constraint.

**Forbidden patterns** (fail review on sight):
- `UPDATE T SET jsonb_col = REPLACE(jsonb_col::text, ...)` — produces a top-level string.
- `const newVal = JSON.stringify(arr.map(...)); UPDATE T SET jsonb_col = newVal` — driver-dependent; some Postgres drivers wrap this in a string. Pass the JS array directly.
- Migration scripts that read `pg_typeof(column)` instead of `jsonb_typeof(column)` for type assertion — `pg_typeof` always returns `jsonb`, useless for shape validation.

**How a reviewer enforces this:** Before approving any SPEC that writes to a `jsonb` column whose schema requires array/object, check the SPEC's example query for: (a) does it mutate via runtime parse-then-modify, or (b) does it do text replace? If (b), reject. Additionally, pre-flight `SELECT jsonb_typeof(target_col), COUNT(*) FROM target GROUP BY 1` against the production DB to confirm no rows are already broken before the SPEC runs.
