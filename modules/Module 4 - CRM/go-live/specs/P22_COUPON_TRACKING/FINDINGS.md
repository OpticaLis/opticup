# FINDINGS — P22_COUPON_TRACKING

> **Location:** `modules/Module 4 - CRM/go-live/specs/P22_COUPON_TRACKING/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — SPEC starting-line-count drift (crm-events-detail.js)

- **Code:** `M4-DOC-P22-01`
- **Severity:** LOW
- **Discovered during:** Start of Track A — first `wc -l` after initial edits reported 378 lines when SPEC §6 had budgeted ~280L from a claimed 237L baseline.
- **Location:** `modules/Module 4 - CRM/go-live/specs/P22_COUPON_TRACKING/SPEC.md` §6 + §11 line 228.
- **Description:** SPEC §6 "Files Affected" and §11 "Verification Evidence" both state `crm-events-detail.js` current line count is 237, with a target of ~280L (+40–50). Actual starting line count on develop HEAD is 317 lines (as already recorded in the P18 phase history row of `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md`). The SPEC author verified against stale local knowledge, not disk state. This is the second consecutive SPEC where the same drift pattern appears (P21 Foreman Review endorsed executor-proposal 1 on exactly this issue, coded as M4-DOC-P21-01).
- **Reproduction:**
  ```bash
  wc -l "modules/crm/crm-events-detail.js"
  # 317 — but SPEC claims 237
  grep -c "M4F18\|crm-events-detail.js 255→317" "modules/Module 4 - CRM/docs/SESSION_CONTEXT.md"
  # 1 — SESSION_CONTEXT already recorded the P18 change
  ```
- **Expected vs Actual:**
  - Expected: SPEC §6/§11 cites 317L → end budget ~360L → over hard cap → author would have pre-planned a compression or a split.
  - Actual: SPEC cited 237L → end budget ~290L → looked fine at author time → executor hit 378L on first pass, had to compress twice at cap.
- **Suggested next action:** NEW_SPEC (or SKILL edit, not code-SPEC) — elevate P21's executor-proposal 1 ("disk-vs-SPEC reconciliation step") into a numbered pre-execution step in opticup-executor SKILL.md, and add a mirrored "SPEC authoring must `wc -l`" rule in opticup-strategic SKILL.md.
- **Rationale for action:** The same failure mode recurred in P22 despite P21's endorsement. Without SKILL-level codification the fix remains a recommendation, not a mechanism. Not a code-SPEC — this is process tooling.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — SPEC mischaracterized Track B cell as "yes/no indicator"

- **Code:** `M4-DOC-P22-02`
- **Severity:** LOW
- **Discovered during:** Track B implementation — reading existing `couponCell` in `modules/crm/crm-event-day-manage.js`.
- **Location:** `modules/Module 4 - CRM/go-live/specs/P22_COUPON_TRACKING/SPEC.md` §2 Track B1 (lines 128–136).
- **Description:** SPEC describes the current manage sub-tab "Coupon" column as a "yes/no indicator" and prescribes three display states including `coupon_sent=false → gray "—"`. In reality the cell is a toggle — when `coupon_sent=false` the cell is a functional send button (`data-toggle-coupon` wired to `toggleCoupon` in the same file) that triggers the P18-era coupon ceiling check. Applying the SPEC literally would remove operator capability to send coupons during event day. I deviated to preserve the send button (see EXECUTION_REPORT §3 Deviation #1).
- **Reproduction:**
  ```bash
  sed -n '110,115p' "modules/crm/crm-event-day-manage.js" | head -10
  # Original: returns a <button data-toggle-coupon=...> for coupon_sent=false
  ```
- **Expected vs Actual:**
  - Expected: SPEC would either (a) acknowledge the send action and prescribe that arrival-status replaces only the "sent" state, or (b) explicitly state the send button is being removed by this SPEC and point to a replacement send path.
  - Actual: SPEC treated the cell as a passive indicator, so the "—" case implicitly drops the action.
- **Suggested next action:** DISMISS for this SPEC (deviation documented and sane); reinforce the pre-flight grep of the existing cell implementation when SPECs modify interactive elements. This is a SPEC-authoring observation, not a code bug.
- **Rationale for action:** The deviation restores the intended operator workflow; the SPEC-author process note is the actionable item, already captured in EXECUTION_REPORT §8 Proposal 2 rationale.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — crm-events-detail.js at hard-cap (350 lines, soft target 300)

- **Code:** `M4-DEBT-P22-01`
- **Severity:** MEDIUM
- **Discovered during:** Post-commit verify.mjs output.
- **Location:** `modules/crm/crm-events-detail.js` — 350 lines (hard max 350, soft target 300).
- **Description:** After P22 the file is at exactly the Iron Rule 12 hard cap. Any future SPEC that adds a single line to this file's rendering will fail pre-commit. The file already mixes concerns the author split in P19's sibling file `crm-events-detail-charts.js`: gradient header, capacity bar, coupon funnel, sub-tabs, attendees grouping, register wiring, status change, event-day entry, extra-coupons editor, invite-waiting-list. A logical split candidate exists: extract `renderCouponFunnel` + `renderAttendeesGrouped` to a new `crm-events-detail-attendees.js` (matching the existing `crm-events-detail-charts.js` pattern), which would drop the parent file below the 300 soft target and leave room for future growth.
- **Reproduction:**
  ```bash
  wc -l "modules/crm/crm-events-detail.js"
  # 350
  ```
- **Expected vs Actual:**
  - Expected: files kept with comfortable headroom (~200–280L) per CLAUDE.md §4 Rule 12 guidance.
  - Actual: file at exact cap; next edit blocks.
- **Suggested next action:** NEW_SPEC — small refactor SPEC to extract attendee/coupon rendering to a sibling file (no behavior change, target ~250L in parent + ~100L in new file). Could be bundled with other "touch this file" work if Daniel prefers to defer until the next actual feature lands.
- **Rationale for action:** Not urgent (no broken feature), but the next touch will hit the cap. Preemptive split is cheaper than forced compression under delivery pressure.
- **Foreman override (filled by Foreman in review):** { }

---
