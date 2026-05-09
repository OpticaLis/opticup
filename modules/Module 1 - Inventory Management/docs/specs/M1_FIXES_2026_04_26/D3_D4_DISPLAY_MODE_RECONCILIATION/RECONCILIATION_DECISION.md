# RECONCILIATION_DECISION — D3 + D4 Display Mode

> **Author:** opticup-strategic (Foreman, Cowork session)
> **Decided:** 2026-04-26
> **Inputs:** `INVESTIGATION_REPORT.md` (Phase A executor findings), `EXECUTION_REPORT_PHASE_A.md`, live verification of view definition in `docs/GLOBAL_SCHEMA.sql:269-295`.
> **Verdict:** 🟢 **Option 2 — drop the newer pair (`storefront_mode` / `storefront_mode_override`).**

---

## 1. The Decision

Phase B reconciles the schema by **standardizing on the LEGACY pair**:

- `brands.display_mode` becomes the single canonical brand-level mode.
- `inventory.display_mode_override` becomes the single canonical product-level override.
- The newer pair (`brands.storefront_mode`, `inventory.storefront_mode_override`) is fully removed: from the view, from the JS reading/writing it, and ultimately from the table columns themselves (DDL).

This is the smallest-blast-radius reconciliation given the data, and aligns
the Studio with the Astro storefront which already consumes the LEGACY pair
end-to-end.

## 2. Why Option 2 (not 1 or 3)

| Dimension | Option 1 (drop legacy) | **Option 2 (drop newer) ✅** | Option 3 (trigger mirror) |
|-----------|-------------------------|------------------------------|----------------------------|
| Real-data location | LEGACY (465 rows) | LEGACY (465 rows) | both |
| Storefront repo refactor | ~10 sites across 6 files | **0** | 0 |
| ERP repo refactor | ~6 sites in studio-brands.js | **~13 sites across 2 files** | 0 |
| Backfill rows needed | ~465 | **~0** | 0 |
| DB DDL needed | yes (drop legacy) | yes (drop newer) | yes (add trigger) |
| View rewrite | yes | **yes (smaller — 2 lines)** | yes (1 line) |
| Cross-repo deploy coordination | required | **not required** | not required |
| Resolves the bug? | yes (after coordinated deploy) | **yes (after JS commit alone)** | yes-ish (data writes propagate) |
| Future cleanup debt | none | **none** | adds DB trigger to maintain |

Option 2 wins on every axis except "ERP refactor count" — and even there the
delta is 13 vs 6, against a much larger storefront refactor count for
Option 1. **The storefront repo touches are the cost driver, and Option 2
has zero of them.**

Option 3 is rejected because it doesn't fix the root cause; it just adds a
DB-level patch that future engineers will need to understand and maintain.
The investigation made the data picture clear enough that we don't need a
stopgap.

## 3. Phase B Plan (broken into substeps)

Phase B implements Option 2. It's split because some substeps need Daniel
sign-off (Level 3 SQL / Iron Rule 29 View Modification Protocol) and some
don't.

### Substep B-1 — Dead-code resolution (autonomous, prerequisite)

Determine which of `modules/storefront/studio-brands.js` and
`modules/storefront/storefront-brands.js` is the live Studio Brands tab and
which is dead code. Per the investigation Q6 finding, they appear to be
duplicates writing to different pairs. Resolve before any rename so we
don't accidentally rename the dead one. Resolution: grep all `.html` files
to see which JS file each Brands tab page actually loads, then mark the
unloaded one as orphan candidate.

**Out of scope for B-1:** deleting the orphan. That's a separate housekeeping
SPEC with its own evidence requirement (Rule 21 "Replace, and DELETE the old
one in same commit").

### Substep B-2 — JS rename (autonomous, after B-1)

Rename all reads and writes of the NEW pair to the LEGACY pair in:
- `modules/storefront/storefront-products.js` (8 sites — Studio Products tab)
- The live Studio Brands file from B-1 (~5 sites)

After rename: Studio Products tab reads `display_mode_override || display_mode || 'store_all'`, writes `display_mode_override`. Studio Brands tab writes `display_mode`. All ERP-side JS aligns on LEGACY.

**This substep alone resolves D3 + D4** because:
- D3 (Studio reads wrong field): after rename, Studio reads the populated LEGACY pair → shows correct value.
- D4 (writes don't propagate): after rename, Studio writes to the same column the storefront reads → propagation works.

### Substep B-3 — View rewrite (Daniel sign-off, Iron Rule 29)

The view `v_storefront_products` currently computes `resolved_mode` from
the NEW pair (which will be empty after B-2). Rewrite the view so:

```sql
-- Currently:
COALESCE(i.storefront_mode_override, b.storefront_mode, 'catalog') AS resolved_mode

-- Becomes:
COALESCE(i.display_mode_override, b.display_mode, 'catalog') AS resolved_mode
```

And the WHERE hidden-filter (line 293 of GLOBAL_SCHEMA.sql) updates
similarly. The view's column list also drops `storefront_mode` (it's not
exposed today anyway) — no breaking change for storefront consumers.

**Why this needs Daniel:** Iron Rule 29 — View Modification Protocol —
CRITICAL. Views are the contract layer for the storefront repo. Daniel
authorizes any view change.

### Substep B-4 — DDL drop columns (Daniel sign-off, Level 3 SQL)

Once B-2 and B-3 are merged and stable on develop for at least one deploy
cycle:

```sql
ALTER TABLE brands DROP COLUMN storefront_mode;
ALTER TABLE inventory DROP COLUMN storefront_mode_override;
```

**Why this needs Daniel:** Level 3 SQL — never autonomous. Drops are
irreversible (without restoring from backup). Daniel approves the timing
and confirms no other consumer is reading the columns.

**Recommended sequencing:** B-1 → B-2 today/this week. B-3 and B-4 deferred
to a separate SPEC after one stable deploy cycle of B-2.

## 4. Out-of-Scope (Phase B will not address)

- **Open Question #1** from INVESTIGATION_REPORT (intent of original
  storefront_mode introduction): no migration record exists; we treat the
  pair as deprecated and move on. Closing.
- **Open Question #2** (does store vs store_all distinction matter?): not
  in scope for D3/D4. The LEGACY pair preserves it; if it's dead semantics,
  a separate SPEC can simplify later.
- **Open Question #3 + #4** (studio-brands.js vs storefront-brands.js
  duplication): partially in scope (B-1 identifies which is live) but not
  resolved (deleting the orphan is a separate SPEC).
- The other ROADMAP rows (D1, D2, D6, D7, A1-A4, B2-B5).

## 5. Success Criteria for Phase B

Substep B-1: produce a one-page note in this folder identifying the live
Brands file and listing where the orphan candidate is referenced (or
unreferenced). Commit: `chore(spec): D3+D4 Phase B-1 dead-code mapping`.

Substep B-2:
- All references to `storefront_mode_override` in `storefront-products.js`
  replaced with `display_mode_override`.
- All references to `storefront_mode` (non-view) in `storefront-products.js`
  replaced with `display_mode`.
- Same in the live Studio Brands file.
- Toggle a product mode in Studio Products tab on demo → public storefront
  reflects the change after browser refresh (no Astro rebuild needed —
  storefront reads the view at request time).
- Pre-commit hooks pass; integrity gate passes.
- Two-commit pattern: `fix(storefront): align Studio JS on display_mode pair (D3+D4 B-2)` + `chore(spec): close D3+D4 Phase B-2 with retrospective`.

Substep B-3 + B-4: separate SPEC, separate criteria, separate Daniel
sign-off.

## 6. Open Questions Closed by This Decision

- "Should we drop legacy or newer?" → drop newer.
- "Should B handle DB cleanup?" → split into B-3/B-4, deferred.
- "Is Option 3 stopgap warranted?" → no.

## 7. Author-Skill Improvement Proposals (opticup-strategic)

Harvested from Phase A round-trip:

### Proposal #1 — Investigation scripts should bundle row-count probes
**Where:** New convention added to `.claude/skills/opticup-strategic/references/SPEC_PATTERN_INVESTIGATION_PHASE.md` (create file).
**Change:** When a SPEC commissions an investigation script, the script should
ship with: (a) column existence (current behavior), (b) per-tenant row counts
of populated columns, (c) per-tenant value distribution, (d) disagreement
counts. Today's script provided only (a); the executor had to invent
(b)-(d) on the fly.
**Why:** Phase A took 15 minutes; ~5 of that was the executor inventing the
SQL probes. A reusable investigation-script template would cut this to
near-zero for the next schema-confusion SPEC.

### Proposal #2 — `/tmp/` paths in SPECs are Linux-centric and break on Windows
**Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §3 Investigation sub-section.
**Change:** Replace any "redirect to `/tmp/...`" instruction with "embed
output verbatim into the report appendix" or "use OS-default temp via
`os.tmpdir()`". The executor on Windows desktop has no meaningful `/tmp/`,
so any such instruction creates an unnecessary deviation.
**Why:** Phase A flagged this as deviation #1. Small but recurring; will
repeat across every Windows-side SPEC unless we change the template.

---

## 8. Master-Doc Updates (after Phase B-2 lands)

- ROADMAP D3 + D4 → ✅ (after B-2 commits).
- A new entry in `docs/CONVENTIONS.md`: "Display mode field — canonical pair is `display_mode` (brand) + `display_mode_override` (product). The `storefront_mode` pair was a stalled migration; do not introduce new code that uses it."
- `docs/GLOBAL_SCHEMA.sql` updated AFTER B-3 (view rewrite) and B-4 (DDL drop).

---

## 9. Verdict

🟢 Phase B is authorized to begin in substep order: **B-1 → B-2 first**
(autonomous), with **B-3 + B-4 in a separate SPEC after Daniel sign-off**.

Activation prompt for Phase B-1 + B-2 lives in this folder as
`ACTIVATION_PROMPT_PHASE_B.md` once authored.
