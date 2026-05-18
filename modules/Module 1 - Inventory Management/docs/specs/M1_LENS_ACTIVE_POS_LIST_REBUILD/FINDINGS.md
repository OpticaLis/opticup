---
spec_id: M1_LENS_ACTIVE_POS_LIST_REBUILD
authored: 2026-05-18 IDT
total_findings: 2
status: 🟢 closed — 1 LOW (executor self-resolved in-run) + 1 INFO (registry file growth)
---

# FINDINGS — M1_LENS_ACTIVE_POS_LIST_REBUILD

## F-1 — LOW (RESOLVED IN-RUN) — ChipFilter global name + API surface mismatch

**Surface area:** `modules/lens-pos-list/lens-pos-list-filters.js:mount()` initial draft.

**What happened:** First wiring used `window.ChipFilterRow.init(host, { activeId: 'all', onChipClick: ... })`. The shared component exposes `window.ChipFilter.init(host, { activeIds: ['all'], onSelect: (activeIds) => ... })`. The `Row` suffix is the FILENAME convention (chip-filter-row.js) but the JS global is `ChipFilter`. The callback name + arity also differ: `onSelect(activeIds: Array)` not `onChipClick(id: String)`.

**Status:** RESOLVED IN-RUN. Discovered during Tier C when the chip-filters mount remained empty. Inspected `shared/js/chip-filter-row.js` API contract block, corrected three places (global name, activeIds wrapping, onSelect callback). Same refactor commit shipped the fix — no separate hotfix commit.

**Why this matters as a finding (not just a typo):** The naming convention drift between filename (`chip-filter-row.js`) and global (`window.ChipFilter`) is a SKILL-level discoverability issue, not a one-off. Future SPECs consuming new Phase 0 shared components should add an explicit "API surface read" step before writing the mount call. Proposed mitigation in P-EXEC-2 below.

## F-2 — INFO — Registry file (inventory-shell-lens.js) hit 350 hard cap on +2 manifest entries

**Surface area:** `modules/inventory/inventory-shell-lens.js`.

**What happened:** Adding 2 lines to the lens tab manifest (stats + detail entries for pos-list) pushed the file from 350 to 352, hitting the Iron Rule 12 hard cap. Fix: trimmed 9 lines of header comment to 6, recovering 9 lines so 2 could be re-added. Net post-edit: 344 (warning above 300 soft, under 350 hard).

**Status:** ABSORBED for this SPEC. File still grows linearly with each new lens tab module loaded. Group B SPEC 8 will add 0 entries to this manifest (GR file count stays at 8) so no further trim is needed in Group B. Group C SPECs 9 + 10 will add ~6-8 more files combined — this file will need a structural decomposition before Group C lands.

**Recommended follow-up:** TECH_DEBT entry — `M1-DEBT-XX-INVENTORY-SHELL-LENS-DECOMPOSE` (~2h): split the per-tab metadata block into 8 small `tabs/{tab-name}.json` files (or one consolidated `tabs.json` data file) loaded at runtime by the shell. Keeps the orchestrator code minimal and removes the file-size cliff for future module additions. Not blocking; flag at Group B 100% close.

---

## Lessons re-confirmed (not new findings)

1. **Derived predicates beat enum extensions.** "Overdue" as `status === 'overdue'` would have required schema migration + status enum extension + write-time logic + UI mapping. As a runtime predicate it's a 7-line function, no DDL, no policy change, no migration risk. This is the canonical pattern for any "computed status" that depends on time / aggregates / other fields.
2. **One source of truth for header + body.** Stats compute from `window.LensPOsList.pos`; the table filters the same array. There's no separate count query that could drift out of sync. The refresh button reloads once and both surfaces update from the same response.
3. **SideDetailPanel + StatCardRow + ChipFilter compose cleanly.** Three independent shared components, three independent mount hosts in the partial, three independent state machines (statusFilter / sourceFilter / detailHandle). No prop-drilling between them — they all read from `window.LensPOsList.pos` and call back into the central renderer.

## Proposals for opticup-strategic (Foreman) skill

**P-AUTHOR-1 (NEW)** — SPEC §0 path-verification should include a "global name probe" for each shared component used. Currently §0 verifies the FILE exists (e.g., `shared/js/chip-filter-row.js` ✅). It should ALSO verify the GLOBAL NAME by inspecting the file's `window.X = ...` line. Example pre-flight grep:

```
grep -oE 'window\.[A-Za-z]+\s*=' shared/js/chip-filter-row.js
# Returns: "window.ChipFilter =" → SPEC §0 should record "global: window.ChipFilter, NOT ChipFilterRow"
```

~30 seconds per shared component used; would have caught F-1 at SPEC-author time. Apply to SPEC 8 (Goods Receipt) which consumes `GroupHeaderRow` + `TableBuilder` extensions.

## Proposals for opticup-executor skill

**P-EXEC-2 (NEW)** — "Read shared component API contract block BEFORE writing the mount call." Currently the SKILL has section "Code Patterns — Visual re-skin" and "Layout patterns" but not "Consuming shared components." Add a sub-section:

```
### Shared component consumption pattern
Before writing `MyComponent.init(host, config)`:
1. `head -30 shared/js/<component>.js` — read the API contract block at top of file
2. Confirm: (a) global name (often differs from filename), (b) config keys (active vs activeIds, onSelect vs onChipClick), (c) return-value handle shape
3. Then write the mount call
Time cost: ~30 seconds per component. Prevents the F-1 class of "wired but silent" defects.
```

Source: F-1 above. Defect discovered at Tier C; ~3 minutes lost to debug before realizing the global name was wrong. Codifying the read-API-first pattern eliminates this class.

**P-EXEC-3 (NEW, follow-up to SPEC 6 P-EXEC-1)** — "When Tier C tests modify DB state for verification (e.g., backdate-then-restore for overdue), restore BEFORE other in-app navigation, then take regression screenshots from a clean state." Today's run got this right (restored before the Group A check) but the SKILL doesn't explicitly call out the ordering. Add a 2-line note under Tier C best practices: "DB state changes for smoke testing are reversible — always pair a `mutate` with its `restore` in adjacent tool calls, before any unrelated navigation."

---

**END FINDINGS**

_1 LOW (RESOLVED IN-RUN), 1 INFO, 0 MEDIUM, 0 HIGH, 0 CRITICAL. 3 SKILL proposals harvested (1 author, 2 executor). 2 deviations (both Foreman-approved equivalent-coverage swaps)._
