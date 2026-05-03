# FINDINGS — CRM_LEADS_TAB_PURCHASE_FILTER_AND_EVENTS_COL

> Findings discovered during execution of this SPEC that are NOT inside its scope. One entry per finding. Severity: INFO / LOW / MEDIUM / HIGH / CRITICAL.
> Suggested next-action per entry: new SPEC stub / TECH_DEBT entry / dismiss.

---

## F1 — Foreman line-count estimate for crm-helpers.js was 5 lines tight

- **Severity:** INFO (process / authoring methodology)
- **Location:** `modules/Module 4 - CRM/docs/specs/CRM_LEADS_TAB_PURCHASE_FILTER_AND_EVENTS_COL/SPEC.md` §3 criterion #3
- **Description:** SPEC §3 #3 said `crm-helpers.js` should land at `213 → ≤ 230`. Actual post-edit count is **235** (+22 lines, not the +12 the Foreman estimated). Root cause: Foreman estimated the helper at ~12 lines but the as-written block (5-line JSDoc + multi-line `.select/.eq/.in` chain + `.forEach` body + closing braces) is 22 lines. The hard Iron Rule 12 cap (350) is met with 115 lines of headroom, so this is NOT a Rule 12 violation — but it IS a SPEC criterion miss that the executor had to judge as advisory-vs-binding (SPEC §4 Stop triggers explicitly bind only `crm-leads-tab.js = 349`).
- **Suggested next action:** Apply Proposal SE-Z-2 from EXECUTION_REPORT §11 to `.claude/skills/opticup-executor/SKILL.md` (or the equivalent into opticup-strategic if the Foreman should do the line-count math at authoring time, which is the cleaner ownership). Either way, a 30-second `wc -l` on the new_string blocks during SPEC authoring would have caught this. Dismiss as a one-time miss; the methodology improvement is the actionable item.
- **Discovered during:** Post-edit verification of SPEC §3 criterion #3 against actual file size.

---

## Cross-Reference Check evidence (Iron Rule 21, Step 1.5)

- `grep -rn "function mergeLeadHistory" modules/` BEFORE edit → 0 hits (new helper, no collision).
- `grep -rn "purchase_status" modules/crm/` BEFORE edit → 0 hits (new state field, no collision).
- `grep -rn "data-filter-purchase" modules/crm/` BEFORE edit → 0 hits (new HTML hook, no collision).
- `grep -rn "v_crm_lead_event_history" modules/` → 4 hits in code (2 existing consumers in `crm-leads-detail.js` + `crm-dashboard.js`, plus the new helper). Reusing the existing view per SPEC §11.
- Result: 0 collisions / 1 new helper introduced as the SOLE merge engine for view→row hydration in CRM. Rule 21 satisfied.

---

## Reverse-callsite report (per Auto-Engine SE-2 inherited proposal — only when deletions are in scope)

**N/A** — this SPEC deletes no files, so the reverse-callsite proposal does not apply. Recorded explicitly so future audits can see the proposal was considered, not skipped.
