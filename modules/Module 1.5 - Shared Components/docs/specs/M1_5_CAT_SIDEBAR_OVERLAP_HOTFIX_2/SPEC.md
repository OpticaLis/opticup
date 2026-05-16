# SPEC — M1_5_CAT_SIDEBAR_OVERLAP_HOTFIX_2

> **Foreman:** opticup-strategic (Module Strategist + Foreman hat, Remediation Pipeline, opus-4-7[1m], 2026-05-17 ~19:15 local)
> **Mode:** Minimal hotfix Pipeline (1-line CSS fix). 5-stage chain BUT with **MANDATORY Tier C VFV** per pending entry `2026-05-17_localhost_tester_visual_functional_verification.md`.
> **Trigger:** Daniel observed M1_5_CAT_SIDEBAR_COMPONENT shipped 🟢 but the overlap bug it claimed to fix is STILL present on all 8 sidebar surfaces. Tester VFV (step 1 of this remediation Pipeline) confirmed it — DOM probe showed every nav strip + cross-category section extends past the sidebar's left edge (1665-1680 px) by 30-240 px.
> **Safety tag:** `pre-cat-sidebar-overlap-hotfix-2-2026-05-17` @ `8651a29`
> **Estimated duration:** ~30-45 min (Foreman + Executor + Tester VFV re-run + close)

---

## 0. Pre-Authoring Reality Check

Tester already completed Tier C VFV on all 8 sidebar surfaces during Step 1 of this remediation Pipeline (see chat log Step 1 report; screenshots at `_archive/cat-sidebar-overlap-hotfix-2-2026-05-17/screenshots/01-frames.png` through `08-access-sync.png`).

### Empirical findings (DOM probe at 1920×1080 viewport on demo)

| # | Surface | URL | Active element | Right edge | Sidebar left | Overlap | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | frames | `?cat=frames` | `#mainNav` | 1920 | 1680 | **240 px** | 🔴 |
| 2 | lenses | `?cat=lenses` | `#lensNav` | 1904 | 1680 | **224 px** | 🔴 |
| 3 | contact-lenses | `?cat=contact-lenses` | `#contactNav` | 1905 | 1665 | **240 px** ← Daniel-reported #1 | 🔴 |
| 4 | accessories | `?cat=accessories` | `#accessoryNav` | 1905 | 1665 | **240 px** ← Daniel-reported #2 | 🔴 |
| 5 | suppliers | `?cat=suppliers` | `section#tab-suppliers` | 1710 | 1680 | 30 px | 🔴 |
| 6 | incoming-invoices | `?cat=incoming-invoices` | `section#tab-incoming-invoices` | 1710 | 1680 | 30 px | 🔴 |
| 7 | unified-log | `?cat=unified-log` | `section#tab-unified-log` | 1703 | 1665 | 38 px | 🔴 |
| 8 | access-sync | `?cat=access-sync` | `section#tab-access-sync` | 1710 | 1680 | 30 px | 🔴 |

### Root cause (confirmed by DOM)

**`shared/css/cat-sidebar.css:32`** — current rule:
```css
.cat-sidebar-host {
  display: grid;
  grid-template-columns: 1fr var(--cat-sidebar-width, 240px);
}
```

In RTL document direction (`<html dir="rtl">`):
- Grid column 1 (`1fr`) → resolves to **inline-start side** = **RIGHT edge** in RTL
- Grid column 2 (`240px`) → resolves to **inline-end side** = **LEFT edge** in RTL

The fixed sidebar `#inv-sidebar`:
```css
position: fixed;
inset-inline-start: 0;   /* in RTL: right: 0 → RIGHT edge */
width: 240px;
```

**Mismatch:** the grid reserves the 240 px column on the LEFT (inline-end), but the fixed sidebar OVERLAYS on the RIGHT. The `1fr` main-content column occupies the right side where the sidebar covers it. Every element inside `.main-content` extends to `right: 1920` (viewport edge) and the rightmost ~240 px gets hidden behind the fixed sidebar.

### Why the prior Pipeline (M1_5_CAT_SIDEBAR_COMPONENT) shipped this bug

- Reviewer Stage 3 R-7: verified the grid RULE was IN the CSS file via grep. Did NOT verify the rule produced correct layout in RTL.
- Foreman Stage 5 FA-2: same — checked the served CSS contains `grid-template-columns × 2`. Did NOT check the resulting layout.
- Tester Stage 4: blocked by login-modal limitation; captured 1 homepage screenshot; never saw the actual inventory page.
- **No agent performed Tier C VFV** (the protocol didn't exist yet — pending entry was created in response to Daniel observing the bug post-merge).

This Pipeline applies Tier C VFV from the start. The VFV in Step 1 above is the diagnostic that uncovered the root cause + scoped this SPEC.

### Runtime semantics rehearsed: yes

The fix `grid-template-columns: var(--cat-sidebar-width, 240px) 1fr;` (swapped order) — rehearsal:
- LTR: column 1 (240 px) on left, column 2 (1fr) on right. Sidebar `inset-inline-start: 0` → left edge. Match.
- RTL: column 1 (240 px) on right (inline-start), column 2 (1fr) on left (inline-end). Sidebar `inset-inline-start: 0` → right edge. **Match.**
- Mobile @media (max-width: 800px): `grid-template-columns: 1fr` (single column) — direction-independent. No fix needed in mobile block (it's already 1-column).

---

## 1. Goal

Swap the order of `grid-template-columns` in `shared/css/cat-sidebar.css` so the sidebar column slot matches the side the fixed sidebar actually renders on in RTL. Single-line CSS fix. End state: all 8 sidebar surfaces show NO overlap between active content and the fixed sidebar, verified visually via Tier C VFV.

---

## 2. Scope

**Single CSS file modified:** `shared/css/cat-sidebar.css`

**One CSS rule edit:** `.cat-sidebar-host` `grid-template-columns` column order swap (line ~32). Plus 1 added explanatory comment about the RTL gotcha (so future maintainers know not to "fix" it back to the intuitive `1fr 240px` order).

Mobile `@media (max-width: 800px)` block doesn't need editing — it already uses single-column `1fr` which is direction-independent.

---

## 3. Success Criteria (measurable)

| # | Criterion | Verify |
|---|---|---|
| **S1** | `shared/css/cat-sidebar.css` line ~32: `grid-template-columns` value starts with `var(--cat-sidebar-width, 240px)` (sidebar slot first) | grep `grid-template-columns: var(--cat-sidebar-width` returns ≥ 1 |
| **S2** | `grid-template-columns: 1fr var(--cat-sidebar-width` (the BUGGY pre-Pipeline pattern) returns 0 hits | grep |
| **S3** | Explanatory comment about RTL behavior present near the grid rule | grep for `RTL` in cat-sidebar.css returns ≥ 1 |
| **S4** | Smoke 7/7 PASS pre AND post-Pipeline | `node tests/smoke/baseline.test.mjs` |
| **S5** | Iron Rule 31 integrity gate exit 0 every commit | hook output |
| **S6** | Iron Rule 32 destructive-ops gate accepted every commit | hook output |

### Visual Functional Verification (VFV) Surfaces

Per pending entry File 3 template (2026-05-17). The Tester MUST perform Tier C VFV per opticup-localhost-tester SKILL.md Tier C on the following surfaces. **Pipeline returns 🟢 ONLY if all 8 surfaces return 🟢.**

| # | Surface | URL | Bug-regression check |
|---|---|---|---|
| **S-VFV-1** | frames | `inventory.html?t=demo&cat=frames` | Pre-fix overlap: 240 px (mainNav right=1920 vs sidebar left=1680). **Post-fix MUST be 0 px** — `#mainNav` right edge ≤ sidebar left edge. |
| **S-VFV-2** | lenses | `inventory.html?t=demo&cat=lenses` | Pre-fix overlap: 224 px (lensNav right=1904 vs sidebar left=1680). **Post-fix MUST be 0 px** — `#lensNav` right ≤ sidebar left. |
| **S-VFV-3** | **contact-lenses** | `inventory.html?t=demo&cat=contact-lenses` | Pre-fix overlap: 240 px (contactNav right=1905 vs sidebar left=1665). **THIS IS DANIEL'S REPORTED BUG #1.** Post-fix MUST be 0 px overlap; contactNav fully visible left of sidebar. |
| **S-VFV-4** | **accessories** | `inventory.html?t=demo&cat=accessories` | Pre-fix overlap: 240 px (accessoryNav right=1905 vs sidebar left=1665). **THIS IS DANIEL'S REPORTED BUG #2.** Post-fix MUST be 0 px overlap; accessoryNav fully visible left of sidebar. |
| **S-VFV-5** | suppliers | `inventory.html?t=demo&cat=suppliers` | Pre-fix overlap: 30 px on section. Post-fix MUST be 0 px overlap. |
| **S-VFV-6** | incoming-invoices | `inventory.html?t=demo&cat=incoming-invoices` | Pre-fix overlap: 30 px. Post-fix MUST be 0 px. |
| **S-VFV-7** | unified-log | `inventory.html?t=demo&cat=unified-log` | Pre-fix overlap: 38 px. Post-fix MUST be 0 px. |
| **S-VFV-8** | access-sync | `inventory.html?t=demo&cat=access-sync` | Pre-fix overlap: 30 px. Post-fix MUST be 0 px. |

For each surface: DOM probe captures `sidebarLeftEdge` + `activeElement.right` + `overlapsSidebar` (boolean: rect.right > sidebarLeftEdge). Screenshot captured. Per pending entry's VFV report format. ALL 8 surfaces must return `overlapsSidebar: false` AND verdict 🟢.

**Any single 🔴 → Pipeline returns 🔴, loops back to Executor.** No 🟢 with "VFV blocked" notes — Tester already proved VFV is unblocked (Step 1 ran successfully).

---

## 4. Destructive Operations

Iron Rule 32 — declared:

1. **Edit `shared/css/cat-sidebar.css` line ~32:** swap `grid-template-columns` value from `1fr var(--cat-sidebar-width, 240px)` to `var(--cat-sidebar-width, 240px) 1fr`. Same edit semantics: re-orders the two columns of the existing grid; no new declarations, no removals.
2. **Add 1 explanatory comment** (~5 lines) near the rule explaining the RTL behavior so future maintainers don't "correct" it back to the intuitive-looking-wrong order.
3. **Git tag** `pre-cat-sidebar-overlap-hotfix-2-2026-05-17` at `8651a29` (placed at SPEC seal, before C1).

**EXPLICITLY NOT AUTHORIZED:**
- Any DB / RPC / permission change.
- Any change to other CSS files (inventory-shell.css, lens-tabs.css, etc.).
- Any change to JS files (cat-sidebar.js, inventory-shell.js, etc.).
- Any change to inventory.html structure (the grid wrapper itself is correct; only the column-order RULE needs flipping).
- Any change to `main` branch.
- `--no-verify` commits.
- Touching the mobile `@media (max-width: 800px)` block (already single-column).

**Rule 32 enforcement marker (per §12).**

---

## 5. Stop-on-Deviation Triggers

1. Smoke 7/7 baseline FAILS pre-Pipeline → STOP.
2. The fix is applied but VFV STILL shows overlap on ≥1 surface → escalate to Foreman (this would invalidate the root-cause hypothesis; investigate further).
3. Any cross-module / cross-file edit beyond cat-sidebar.css → STOP (out of scope).
4. Tester reports VFV cannot be performed (Chrome MCP fails, login modal locked) → escalation file + STOP. **NO 🟢 with "VFV blocked" — per pending entry.**

---

## 6. Rollback

Tier 5 only — `git reset --hard pre-cat-sidebar-overlap-hotfix-2-2026-05-17` + `git push --force-with-lease origin develop`. Develop only.

For Tier 1-4: the fix is so small (1 line) that any failure mode rolls back via standard `git revert HEAD`.

---

## 7. Out of Scope

- Restructuring `.cat-sidebar-host` HTML in inventory.html (grid wrapper is correct as-is).
- Migrating from CSS-grid to flex-based protection.
- Moving sidebar from fixed-position to grid-cell positioning (would require restructuring; Brief deferred to future SPEC).
- LTR rendering verification (project is RTL-primary; LTR support is future tenant scope).
- Mobile responsive @media block edits.
- Any UI walks on Prizma (demo only).

---

## 8. Expected Final State

- `shared/css/cat-sidebar.css`: 1 line changed (column order swap) + ~5 lines added (RTL gotcha comment). Net +5 lines.
- All 8 sidebar surfaces visually verified with NO overlap on demo via Tier C VFV.
- Smoke 7/7 PASS pre + post.
- Iron Rule 31 + 32 gates exit 0 every commit.
- 5 SPEC-folder artifacts: SPEC.md (this), EXECUTION_REPORT.md, TEST_REPORT.md, FOREMAN_REVIEW.md (no FINDINGS — likely 0 findings on a 1-line fix).
- Hebrew morning summary at `_archive/cat-sidebar-overlap-hotfix-2-2026-05-17/MORNING_SUMMARY_FOR_DANIEL.md` confirming the bug is verifiably gone.

---

## 9. Autonomy Envelope

Executor MAY decide:
1. Exact wording / placement of the RTL gotcha comment (be specific + future-proof).
2. Whether to add the `--cat-sidebar-width` default value to the post-fix rule (existing pattern uses it; keep it).

Executor MUST NOT:
1. Touch any file other than `shared/css/cat-sidebar.css`.
2. Make any other "improvements" to cat-sidebar.css during the same commit.
3. Skip the §12 Execution Marker (SPEC.md staged with the destructive commit).

Escalate to Foreman ONLY for:
- Smoke pre-Pipeline FAILS.
- The hypothesis fails (overlap still present after the swap).

---

## 10. Commit Plan

**Stage 2 (Executor):**
- C1: `fix(m1.5): swap grid-template-columns order for RTL sidebar alignment (cat-sidebar HOTFIX_2)` — single 1-line CSS edit + comment + SPEC.md §12 Execution Marker.
- C2: `chore(spec): close M1_5_CAT_SIDEBAR_OVERLAP_HOTFIX_2 executor scope — retrospective` — EXECUTION_REPORT.md.

**Stage 3 (skipped — fix is too small for an independent code-review Stage):** Reviewer's structural verification is built into the SPEC §3 criteria; Tester's Tier C VFV in Stage 4 IS the binding correctness check.

**Stage 4 (Localhost-Tester):**
- C3: TEST_REPORT.md with Tier C VFV on all 8 surfaces (per §3 S-VFV-1 through S-VFV-8). MUST include the same 8-row DOM probe + screenshot capture as Step 1's diagnostic, post-fix.

**Stage 5 (Foreman):**
- C4: `chore(spec): close M1_5_CAT_SIDEBAR_OVERLAP_HOTFIX_2 — FOREMAN_REVIEW + master-docs + Hebrew summary`.

Total expected: 4 commits + this SPEC seal = 5 commits.

---

## 11. Lessons Already Incorporated

This Pipeline IS the lesson application from prior failures:

| Source | Lesson | Application in this SPEC |
|---|---|---|
| M1_5_CAT_SIDEBAR_COMPONENT (prior Pipeline, 2026-05-17 morning) | "Structural fix shipped without VFV — Daniel caught bug post-merge" | §0 explicitly cites + §3 S-VFV-1..8 mandates Tier C VFV with bug-regression checks |
| `_archive/architect-pending-entries/2026-05-17_localhost_tester_visual_functional_verification.md` | "Tier C VFV is non-bypassable; Pipeline cannot return 🟢 without it" | §3 explicit VFV surfaces table per File 3 template; §5 Stop-Trigger #4 explicitly forbids 🟢 with "VFV blocked" |
| M1_5_CAT_SIDEBAR_COMPONENT FOREMAN_REVIEW P-AUTHOR-1 (NEW, content-level corollary preservation) | Codify after 3rd firing | Not relevant here (no content migration) |
| M1_INVENTORY_UNIFIED_SCREEN P-AUTHOR-1 corollary-edit (3/3 firings, codified) | Mandatory pre-seal checklist for SPECs touching JS state machines | Not relevant here (CSS-only fix; no JS state machine) |
| Runtime semantics rehearsal pattern (P-AUTHOR-2 from SECURITY_HOTFIX_2) | Rehearse before sealing | §0 "Runtime semantics rehearsed: yes" — LTR + RTL + mobile branches all traced through the new rule |

**This Pipeline closes the loop:** the prior Pipeline's "🟢 with structural fix-in-place" was a Pipeline-process failure. The Tier C VFV protocol (new pending entry) is the fix to the PROCESS. This SPEC is the fix to the actual BUG. Both fixes must ship for the bug to stay fixed.

**Cross-Reference Check completed 2026-05-17 against GLOBAL_SCHEMA + GLOBAL_MAP + DB_TABLES_REFERENCE + FILE_STRUCTURE + module MAP files: 0 collisions. The SPEC adds 0 new names (it only modifies an existing rule + comment).**

---

## 12. Iron Rule 32 Execution Marker

Per executor's P-EXEC-2 pattern (now 3/3 firings, auto-applied): the `destructive-ops-declared.mjs` gate scans staged SPEC.md files in the same commit as destructive ops. Executor MUST stage this SPEC.md with C1.

### 12.1 Execution Marker Log

- _(C1..C4 appended by Executor + Tester + Foreman as commits land)_
- **C1** (2026-05-17T~19:25Z): swapped `grid-template-columns` column order in `shared/css/cat-sidebar.css` from buggy `1fr var(--cat-sidebar-width, 240px)` (RTL-mismatched) to correct `var(--cat-sidebar-width, 240px) 1fr` (sidebar slot first = inline-start = RIGHT in RTL = matches fixed sidebar). Added ~22-line explanatory comment block above the rule warning future maintainers not to swap back. File size 162 → 185 lines (+23: 1-line rule edit + 22 comment lines). 0 NUL bytes. Verifications: S1 (correct order present) = 1; S2 (buggy order absent) = 0; S3 (RTL comment present) = 8. Mobile @media (max-width: 800px) block untouched per §4 explicit restriction. Single file modified per §9 autonomy envelope.

---

## 13. Pipeline Stage Index

| Stage | Skill | Output | Trigger to next |
|---|---|---|---|
| 1 | Tester (already complete) | 8-surface VFV diagnostic + 8 screenshots + root-cause | Foreman authored this SPEC |
| 2 | Executor | C1 (1-line CSS fix) + C2 (EXECUTION_REPORT) | Hand to Tester for VFV re-run |
| 3 | (skipped) | n/a | n/a |
| 4 | Localhost-Tester | C3 TEST_REPORT.md with Tier C VFV on all 8 surfaces post-fix | If all 🟢 → Foreman close; if any 🔴 → loop back to Executor |
| 5 | Foreman | C4 close commit (FOREMAN_REVIEW + master-docs + Hebrew summary) | Pipeline closes |

**Expected wall-clock duration:** ~30-45 min total from SPEC seal to close. This is a hotfix, not a Pipeline.

---

*End of SPEC.md. Sealed by opticup-strategic at 2026-05-17T~19:15Z local. 6 measurable success criteria + 8 VFV surfaces (Tier C mandatory). 1-line CSS fix + comment. Hand off to opticup-executor for Stage 2.*
