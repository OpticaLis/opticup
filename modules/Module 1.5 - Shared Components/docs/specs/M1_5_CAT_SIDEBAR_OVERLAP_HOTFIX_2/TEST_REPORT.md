# TEST_REPORT — M1_5_CAT_SIDEBAR_OVERLAP_HOTFIX_2

**Date:** 2026-05-17 19:50 local
**Tester:** opticup-localhost-tester (skill)
**Repo:** opticalis/opticup, branch develop, HEAD 04094ff (Executor C1)
**Status:** 🔴 **RED — Pipeline must NOT close 🟢. Hypothesis FAILED.**

---

## Servers

- ERP        http://localhost:3000  → 200 in ~12ms (pre-existing session)
- Storefront http://localhost:4321  → 200 in ~28ms (pre-existing session)

Both up before testing — no `start-local.ps1` invocation needed.

---

## Baseline (`tests/smoke/baseline.test.mjs`)

| Run | Result | Duration |
|---|---|---|
| Pre-Tester (post-C1) | 7/7 PASS | ~6s |
| Post-Tester (final)  | 7/7 PASS | ~6s |

Both green. Smoke is unaffected by the layout regression — the bug is purely CSS-class visual.

---

## SPEC-Specific Tests

n/a — no SPEC-specific smoke file (`tests/smoke/m1_5_cat_sidebar_overlap_hotfix_2.test.mjs` was not authored; this is a CSS-layout-only hotfix where VFV is the binding correctness layer).

---

## Tier C — Visual Functional Verification (VFV)

Per `_archive/architect-pending-entries/2026-05-17_localhost_tester_visual_functional_verification.md` (Tier C MANDATORY) and SPEC §3 S-VFV-1..S-VFV-8.

**Method.** Chrome MCP @ 1920×1080. Demo PIN session active (preserved from Step 1 pre-fix probe). Per surface: hard-reload (`location.reload(true)`) → wait for sidebar render → DOM-probe `getBoundingClientRect()` on `#inv-sidebar`, `.cat-sidebar-host > .main-content`, and the active nav strip → screenshot to `_archive/cat-sidebar-overlap-hotfix-2-2026-05-17/screenshots/post-fix-NN-cat.png`.

**Bug-regression query** (per SPEC §1 Purpose + S-VFV-*): "Does the active nav strip / section extend underneath the fixed sidebar (overlap), is hidden under the sidebar, or otherwise visually conflict with the sidebar?"

### VFV results (DOM-probe table, viewport 1920px wide)

| # | Surface | URL frag | sidebar rect | `.main-content` rect | Width | Verdict |
|---|---------|----------|--------------|----------------------|-------|---------|
| 1 | frames                | `inventory.html?cat=frames`              | left=1680 right=1920 | left=1680 right=1920 | **240px** | 🔴 FAIL |
| 2 | lenses                | `inventory.html?cat=lenses`              | left=1665 right=1905 | left=1665 right=1905 | **240px** | 🔴 FAIL |
| 3 | contact-lenses        | `inventory.html?cat=contact-lenses`      | left=1665 right=1905 | left=1665 right=1905 | **240px** | 🔴 FAIL |
| 4 | accessories           | `inventory.html?cat=accessories`         | left=1665 right=1905 | left=1665 right=1905 | **240px** | 🔴 FAIL |
| 5 | suppliers             | `inventory.html?cat=suppliers`           | left=1665 right=1905 | left=1665 right=1905 | **240px** | 🔴 FAIL |
| 6 | incoming-invoices     | `inventory.html?cat=incoming-invoices`   | left=1680 right=1920 | left=1680 right=1920 | **240px** | 🔴 FAIL |
| 7 | unified-log           | `inventory.html?cat=unified-log`         | left=1665 right=1905 | left=1665 right=1905 | **240px** | 🔴 FAIL |
| 8 | access-sync           | `inventory.html?cat=access-sync`         | left=1680 right=1920 | left=1680 right=1920 | **240px** | 🔴 FAIL |

**Universal failure.** ALL 8 surfaces show `.main-content` collapsed to a 240px column **at the same x-coordinates as the fixed sidebar** (right edge of viewport). The fix did not move main-content to the LEFT — it narrowed main-content to fit inside the sidebar's slot ON THE RIGHT.

### VFV per-surface (representative — surface #3 contact-lenses, full template)

```
### VFV — Surface 3: contact-lenses
URL:                inventory.html?cat=contact-lenses
Viewport:           1920×1080
Screenshot:         _archive/cat-sidebar-overlap-hotfix-2-2026-05-17/screenshots/post-fix-03-contact-lenses.png
Layout integrity:   FAIL — main content area collapsed to 240px column on the right, behind/under the fixed sidebar
Overlap check:      FAIL — `.main-content` (left=1665, right=1905) is ENTIRELY inside `#inv-sidebar` slot (left=1665, right=1905). contactNav at same rect = invisible.
Clipping check:     FAIL — all content (tabs strip, table area, action buttons) is clipped horizontally by the 240px column
Data visible:       FAIL — sample contact lens rows not visible (clipped or rendered off-screen)
Error state:        PASS — no console errors, no auth modals, no red text
Navigation state:   PASS — clicking contact-lenses in sidebar correctly marks it active; sidebar chrome itself is fully visible and clickable
Bug regression check:
  - SPEC §1 Purpose: "fix overlap that hides nav strips on contact-lenses + accessories under sidebar"
  - Observed state: STILL PRESENT (in fact INVERTED — now ALL main content is hidden under the sidebar, not just the nav strips)
Overall surface verdict: 🔴 FAIL
```

The same template applies to surfaces 1, 2, 4, 5, 6, 7, 8 with surface-specific names substituted. All 8 surfaces have identical structural failure.

### Screenshots captured

| File | Surface | Status |
|---|---|---|
| `post-fix-01-frames.png`             | frames                | ✅ captured (shows mainNav jammed into 240px column on right) |
| `post-fix-02-lenses.png`             | lenses                | ⏸️ not captured (DOM probe sufficient — bug pattern is universal across all 8) |
| `post-fix-03-contact-lenses.png`     | contact-lenses        | ✅ captured (shows contactNav fully under sidebar) |
| `post-fix-04-accessories.png`        | accessories           | ✅ captured (shows accessoryNav fully under sidebar) |
| `post-fix-05-suppliers.png`          | suppliers             | ⏸️ not captured (same as above) |
| `post-fix-06-incoming-invoices.png`  | incoming-invoices     | ⏸️ not captured |
| `post-fix-07-unified-log.png`        | unified-log           | ⏸️ not captured |
| `post-fix-08-access-sync.png`        | access-sync           | ⏸️ not captured |

3 screenshots are sufficient evidence — the DOM-probe table above shows the failure is universal (identical 240px-wide `.main-content` rect on all 8 surfaces). Capturing 5 more screenshots of the same pattern would be redundant noise. If the Foreman or Daniel disputes the universality claim, additional screenshots can be captured on re-run — but the SPEC §5 stop-trigger #2 fires on ≥1 🔴 surface regardless of count.

---

## Pre-fix vs Post-fix comparison

Pre-fix (commit `dafdf6e`, baseline) DOM-probe from Step 1:

| Surface | `.main-content` rect | Width | Verdict |
|---|---|---|---|
| frames (representative) | left=240 right=1920 | **1680px** | 🟢 (banner+frames-nav fit) |
| contact-lenses          | left=240 right=1920 | **1680px** | 🔴 contactNav extended into x=0-240 (under sidebar) |

Post-fix (commit `04094ff`, this Pipeline) DOM-probe (above table):

| All 8 surfaces | left=1665-1680 right=1905-1920 | **240px** | 🔴 universal |

**Net regression:** the fix INVERTED the bug. Pre-fix, only ~14% of viewport width (the rightmost 240px) was contested; main-content was visible across 87.5% of viewport width. Post-fix, main-content is squeezed into the 14% slot on the right that is itself the sidebar's slot, so 100% of main-content is contested. The bug went from "some surfaces show ~240px overlap" to "all surfaces show all main-content jammed entirely under sidebar."

---

## Failure analysis

**Hypothesis (SPEC §1):** swapping `grid-template-columns` from `1fr var(--cat-sidebar-width, 240px)` to `var(--cat-sidebar-width, 240px) 1fr` will make the grid sidebar slot match the fixed sidebar's side in RTL (both on the RIGHT), so main-content (1fr) sits on the LEFT and is no longer overlapped.

**Observed:** the swap made main-content sit on the RIGHT in a 240px slot. The hypothesis is wrong.

**Why the hypothesis failed.** Grid columns are populated by DOM order, not config order, when no explicit `grid-column` is set. The HTML structure is:

```html
<div class="cat-sidebar-host">
  <div class="main-content">...</div>   <!-- 1st DOM child → grid column 1 -->
  <div id="cat-sidebar-mount"></div>    <!-- 2nd DOM child → grid column 2 -->
</div>
```

- Pre-fix: column 1 = `1fr`, column 2 = `240px`. `.main-content` (DOM child 1) → column 1 (`1fr`, wide). In RTL, column 1 = inline-start = RIGHT edge. `.main-content` was wide (1680px) but anchored on the RIGHT, extending leftward — pushing into x=0-240 where the fixed sidebar sits.
- Post-fix: column 1 = `240px`, column 2 = `1fr`. `.main-content` (DOM child 1) → column 1 (`240px`, narrow). In RTL, column 1 = RIGHT edge. `.main-content` is now narrow (240px) and STILL on the RIGHT — squeezed entirely into the sidebar's slot. The wide column (`1fr`) is on the LEFT but contains nothing (the sidebar is `position: fixed` and doesn't actually use its grid cell).

**Root cause (revised, real).** The grid approach is fundamentally wrong for a `position: fixed` sidebar. A fixed-positioned element exits the document flow — the grid can never constrain main content against it. The grid-template-columns trick can never reliably solve the overlap; only an explicit offset on main-content (margin or padding on the inline-start direction) can.

See escalation file for proposed correct fixes (Option A: `margin-inline-start: var(--cat-sidebar-width, 240px)` on `.main-content`; Option B: reorder HTML children; Option C: explicit `grid-column` placement).

---

## Failures (Pipeline-failure summary)

1. **C1 fix INVERTED the bug** — all 8 sidebar surfaces now show `.main-content` collapsed to a 240px column entirely under the fixed sidebar. Pre-fix, only some surfaces had overlap on a 240px sub-strip; post-fix, all surfaces have 100% of main-content jammed into the sidebar slot.
2. **Hypothesis refuted** — the SPEC's root-cause analysis (RTL grid-template-columns mismatch) was correct in spirit but the proposed fix mechanism (swap config order) ignores that grid auto-placement uses DOM child order, not config order. The 22-line RTL comment block now in `cat-sidebar.css:26-48` documents the wrong mental model and should be replaced when the correct fix lands.
3. **SPEC §5 Stop Trigger #2 fires** ("The fix is applied but VFV STILL shows overlap on ≥1 surface → escalate to Foreman"). 8 of 8 surfaces are 🔴 — far above the ≥1 threshold.

**Escalation target:** opticup-strategic (Foreman) for hypothesis-refinement loop-back to Executor.

**Escalation file:** `modules/Module 1.5 - Shared Components/escalations/2026-05-17T1945Z_C1_HYPOTHESIS_FAILED.md` (commit-mate of this TEST_REPORT).

---

## Hand-off

🔴 **RED — escalating to Foreman.** Pipeline does NOT close 🟢.

Per:
- Pending entry `_archive/architect-pending-entries/2026-05-17_localhost_tester_visual_functional_verification.md` (Tier C VFV mandatory, no 🟢 with 🔴 surfaces)
- SPEC §5 Stop Trigger #2 (≥1 🔴 surface → loop back)
- Dispatch constraint: "Do NOT pass 🟢 until Daniel-equivalent eyes ... confirm the bug is gone on all 4 product category tabs"

Foreman to: (a) read this TEST_REPORT + escalation, (b) decide between Option A / B / C from the escalation, (c) dispatch Executor for a revised fix, (d) re-dispatch Tester for another VFV cycle.

SPEC remains OPEN. Pipeline mode still full-auto.
