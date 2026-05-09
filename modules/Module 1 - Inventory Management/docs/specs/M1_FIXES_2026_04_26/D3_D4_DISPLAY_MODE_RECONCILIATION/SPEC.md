# SPEC — D3 + D4: Display Mode Schema Reconciliation

> **Author:** opticup-strategic (Cowork session)
> **Created:** 2026-04-26
> **Severity:** HIGH — both bugs share one root cause
> **Parent:** `M1_FIXES_2026_04_26/ROADMAP.md` → rows D3 + D4
> **Owning module:** Module 3 — Storefront / Studio
> **Combined SPEC** because investigation shows D3 (read-side wrong field) and D4 (write-side doesn't propagate) collapse to a single schema-duplication problem that must be resolved together.

---

## 1. Goal

Reconcile two parallel field pairs that both exist on the `brands` and
`inventory` tables:

- `brands.display_mode` + `inventory.display_mode_override` (legacy)
- `brands.storefront_mode` + `inventory.storefront_mode_override` (newer)

The Studio "מוצרים" tab writes `storefront_mode_override`. The view
`v_storefront_products` exposes BOTH the old field pair (as columns) AND a
`resolved_mode` computed from the new pair. Different consumers read
different fields. As a result:

- **D3:** the value an admin sees as "מצב תצוגה" in the Studio doesn't
  always match the value the public storefront actually obeys.
- **D4:** changing the override in Studio writes to one field; the
  storefront may read the other; nothing visibly changes.

Both behaviors disappear when the schema collapses to a single canonical
field pair, with all readers and writers aligned.

## 2. Root Cause (verified 2026-04-26 by Foreman)

**Verified in `docs/GLOBAL_SCHEMA.sql:255-295` (definition of `v_storefront_products`):**

- Line 269: `b.display_mode` exposed as a view column.
- Line 270: `i.display_mode_override` exposed as a view column.
- Line 275: `resolved_mode` computed from `i.storefront_mode_override` and `b.storefront_mode` (NOT the display_mode pair).
- Line 293 (WHERE clause): the hidden-product filter uses `i.storefront_mode_override` and `b.storefront_mode` (matches `resolved_mode`).

**Verified in `modules/storefront/storefront-products.js:14-73` (Studio products tab):**

- Line 16: brand SELECT pulls `b.storefront_mode` (newer pair).
- Lines 65-73: `brand_mode` and `resolved_mode` derived from `storefront_mode_override` + `storefront_mode` (newer pair).
- Lines 195-220 (`changeProductMode`): writes to `inventory.storefront_mode_override` (newer pair).

**Existing investigation tooling:** `scripts/investigate-display-mode.mjs` is
already in the repo with executable comments referring to "storefront
TECH_DEBT #3" — meaning this issue has been on the radar before and is
likely already partially documented. Use it.

## 3. Two-Phase Execution

This SPEC has **two phases**. Phase A is read-only investigation. Phase B is
the actual fix, **gated on Foreman approval** of a concrete reconciliation
plan. The executor MUST stop between the phases.

### Phase A — Investigation (read-only, fully autonomous)

1. Run `node scripts/investigate-display-mode.mjs > /tmp/display-mode-report.txt 2>&1` on demo. Capture full output.
2. Run the same script with the Prizma tenant credentials (set the env var the script reads; do NOT modify the script). Capture full output to a separate file.
3. Read the actual `brands` and `inventory` row counts where:
   - `display_mode IS NOT NULL` vs `storefront_mode IS NOT NULL` (brand-level)
   - `display_mode_override IS NOT NULL` vs `storefront_mode_override IS NOT NULL` (product-level)
   - The two columns DISAGREE on the same row (the smoking gun).
4. List ALL JS files that reference `display_mode` or `display_mode_override` (read OR write). Use `grep -rn` with a strict pattern.
5. List ALL JS files that reference `storefront_mode` or `storefront_mode_override`.
6. Determine which fields the Astro **storefront** repo (`opticup-storefront/`) reads from `v_storefront_products`. This is critical — the Astro side decides what shipping to production looks like for D4.
7. **Output:** write findings to `D3_D4_DISPLAY_MODE_RECONCILIATION/INVESTIGATION_REPORT.md` in the SPEC folder. Format: one section per Q1–Q6 above, each with concrete data.

**Phase A end:** STOP. Do NOT touch any source code yet. Commit the investigation report with `chore(spec): D3+D4 investigation findings` and signal Foreman.

### Phase B — Fix (gated on Foreman written approval in FOREMAN_REVIEW_PHASE_A)

Foreman reads the investigation, then writes one of three decisions inside
the SPEC folder as `RECONCILIATION_DECISION.md`:

- **Option 1 — drop legacy:** `display_mode`/`display_mode_override` are unused or stale; drop them at view level + DB level (Level 3 SQL, never autonomous, requires Daniel sign-off). All JS aligns on the newer pair.
- **Option 2 — drop newer:** the legacy pair is what Astro storefront actually reads; rename JS in Studio to write to `display_mode_override` instead.
- **Option 3 — keep both, reconcile via trigger:** add a DB trigger that mirrors writes from one column to the other, until a future migration drops one side.

Phase B implements whichever Option is chosen. SUCCESS CRITERIA for Phase B
will be authored by Foreman in `RECONCILIATION_DECISION.md` based on the
chosen option. The executor does NOT guess.

## 4. Autonomy Envelope

- **Phase A — fully autonomous:** read DB via service role, run the existing
  investigation script, grep the codebase, write the investigation report.
- **Phase B — fully gated:** STOP at end of Phase A. Do NOT begin Phase B
  without `RECONCILIATION_DECISION.md` from Foreman in the SPEC folder.
- **Forbidden in Phase A:** any DDL, any source-code edit, any view edit,
  any data write. Phase A is observation only.
- **Forbidden anytime:** `git add -A`, push to main, RPC/DDL without Daniel
  sign-off (Level 3 SQL).

## 5. Stop-on-Deviation Triggers

- The investigation script fails to authenticate against Prizma → STOP and report.
- The investigation reveals NO disagreement between the field pairs (the bug isn't real) → STOP, report, and the Foreman decides whether to close as no-op.
- Astro storefront repo cannot be inspected from this session (no clone access) → log gap in INVESTIGATION_REPORT, do NOT guess.
- Any source code changes during Phase A → STOP immediately.

## 6. Out-of-Scope

- Phase B implementation in this SPEC's first run. (Phase B opens after Foreman writes RECONCILIATION_DECISION.md.)
- D1, D2 (separate brands-tab UX SPECs).
- D6, D7 (AI Content + Media Library — separate SPECs).
- The other ROADMAP rows (B2-B5, A1-A4).

## 7. Expected Final State (end of Phase A)

```
git log -1 --oneline:
  <hash> chore(spec): D3+D4 investigation findings
git status (clean except pre-existing dirty tree).
Files added:
  D3_D4_DISPLAY_MODE_RECONCILIATION/SPEC.md
  D3_D4_DISPLAY_MODE_RECONCILIATION/INVESTIGATION_REPORT.md
  D3_D4_DISPLAY_MODE_RECONCILIATION/EXECUTION_REPORT_PHASE_A.md
ROADMAP D3 + D4 rows: 🔍 Investigating (Phase A complete, awaiting Foreman decision)
```

## 8. Commit Plan (Phase A only — Phase B will get its own plan)

Single commit:
```
chore(spec): D3+D4 investigation findings (no source changes)

Phase A of M1_FIXES_2026_04_26 D3+D4. Read-only investigation of the
display_mode vs storefront_mode schema duplication. No code or data
changes. Foreman to author RECONCILIATION_DECISION.md before Phase B.
```

Files (explicit names):
- `modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/ROADMAP.md` (D3 + D4 status flip)
- `modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/D3_D4_DISPLAY_MODE_RECONCILIATION/SPEC.md` (already authored, just newly tracked)
- `modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/D3_D4_DISPLAY_MODE_RECONCILIATION/INVESTIGATION_REPORT.md` (newly written by executor)
- `modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/D3_D4_DISPLAY_MODE_RECONCILIATION/EXECUTION_REPORT_PHASE_A.md` (newly written by executor)

## 9. Iron-Rule Self-Audit (Phase A — read-only)

Phase A is read-only. Iron Rules are not in scope for evaluation until Phase
B starts. The relevant rules for the eventual Phase B will be reasserted in
RECONCILIATION_DECISION.md based on the chosen option (Option 1 invokes
Rules 7, 14, 15; Option 2 invokes Rules 5, 21; Option 3 invokes Rules 14,
15 plus trigger discipline).

---

## 10. Lessons Already Incorporated

- **PostgREST/Supabase syntax cited from documented patterns,** per FOREMAN_REVIEW_B1 Proposal #1 — there is no untested syntax recommendation in this SPEC.
- **Threshold guidance grounded in real tenant scale,** per FOREMAN_REVIEW_B1 Proposal #2 — Phase A explicitly probes Prizma + demo separately.
- **Two-commit pattern** per FOREMAN_REVIEW_C1 Proposal #1 — Phase A has its own commit; Phase B will have its own pair.
- **Activation prompt as separate file** per Daniel's preference — see `ACTIVATION_PROMPT.md` sibling.
- **No SPEC syntax invention** — the SPEC fixes the contract (investigate then decide), not the implementation. Mechanics decisions (which exact grep, which fields to count) belong to the executor.
- **Cross-Reference Check completed** 2026-04-26 against `docs/GLOBAL_SCHEMA.sql` (rev `38b7e63`): the `display_mode`/`storefront_mode` duality is the only such confusion identified; no other duplicate field-pairs in the storefront-related tables.

## 11. Activation Prompt

Lives in the sibling file: `ACTIVATION_PROMPT.md` (same folder).

Daniel opens that file, copies the section between
`--- BEGIN PROMPT ---` / `--- END PROMPT ---`, and pastes into Claude Code.
