# FINDINGS — CRM_UX_REDESIGN_AUTOMATION

> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_UX_REDESIGN_AUTOMATION/FINDINGS.md`
> **Written by:** opticup-executor
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — `rule-21-orphans` pre-commit hook is path-blind to IIFE scope

- **Code:** `M4-TOOL-CRMUX-AUTO-01`
- **Severity:** LOW
- **Discovered during:** First attempt to commit 2 (orchestrator rewrite + bonus auto filter).
- **Location:** `.husky/pre-commit` → `node scripts/verify.mjs --staged` → `rule-21-orphans` plugin.
- **Description:** The hook detects duplicate `function NAME` declarations across staged files. It does not differentiate IIFE-scoped helpers from globals. When this SPEC's commit 2 staged both `crm-messaging-rules.js` and `crm-messaging-templates.js` together, the hook reported violations for `function toast` and `function logWrite` — both files have these as IIFE-local helpers, present since B5 phase. They have NEVER actually conflicted at runtime.
- **Reproduction:**
  ```
  git add modules/crm/crm-messaging-rules.js modules/crm/crm-messaging-templates.js
  git commit -m "..."
  # → "function toast defined in 2 files... function logWrite defined in 2 files... 2 violations"
  ```
- **Expected vs Actual:**
  - Expected: hook recognizes IIFE-scoped helpers as non-conflicting.
  - Actual: hook flags them on co-stage, blocking the commit. Resolved by file-prefix rename (`toast` → `_tplToast`, `logWrite` → `_tplLog`) in `crm-messaging-templates.js`.
- **Suggested next action:** TECH_DEBT — small enhancement to the verify script.
- **Rationale for action:** Either (a) enhance `rule-21-orphans` to detect IIFE wrapping (`(function () { 'use strict'; ... })();`) and skip helpers inside; or (b) maintain a per-file allowlist of names that are intentionally duplicated. Either is a 1-hour task. Until done, future SPECs touching multiple existing `crm-messaging-*.js` files in one commit will hit this trap.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — `tier2` board template prefix mapping may need expansion

- **Code:** `M4-DESIGN-CRMUX-AUTO-02`
- **Severity:** INFO
- **Discovered during:** Implementation of `BOARD_TPL_PREFIX` in `crm-rule-editor.js`.
- **Location:** `modules/crm/crm-rule-editor.js:55` (the `BOARD_TPL_PREFIX` constant).
- **Description:** The board-to-template-prefix mapping currently has `tier2: ['lead_intake_']` because demo's only tier2 rule uses `lead_intake_new` as the template. If a future template family emerges with a `tier2_*` prefix specifically for tier-2 lead status changes (e.g. `tier2_promotion_to_active`), the rule editor's templates dropdown would not surface it. The fix is a 1-character change to add the prefix to the array.
- **Reproduction:** N/A — forward-flag.
- **Expected vs Actual:** N/A.
- **Suggested next action:** DISMISS — until a real `tier2_*` template emerges, the current mapping is correct for the demo dataset.
- **Rationale for action:** YAGNI. The current SPEC's scope is "make the editor work for the existing 13 demo rules." It does. Future template additions should update the mapping if needed.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — `BOARDS` (in editor) vs `BOARD_META` (in orchestrator) — duplicate taxonomy

- **Code:** `M4-DEBT-CRMUX-AUTO-03`
- **Severity:** LOW
- **Discovered during:** Implementing the board chip in the rules table (`renderTable` → `boardChip(entity, event)`).
- **Location:** `modules/crm/crm-rule-editor.js:7-12` (BOARDS) and `modules/crm/crm-messaging-rules.js:13-19` (BOARD_META).
- **Description:** Both files declare a board taxonomy: 4 keys, each with `icon, label, color, entity, event`. The editor's `BOARDS` adds full COND/RECIP/STATUS sub-tables; the orchestrator's `BOARD_META` is a slim subset for the pill bar + table chip. Centralizing into a single shared file is the cleanest design but would require a third file (the SPEC explicitly bounds to 2 new files via §8.1 + §8.4 bonus). Could also expose `window.CrmRuleEditor.BOARDS` and have the orchestrator import — and that's actually what I did (`window.CrmRuleEditor = { ..., BOARDS: BOARDS }`), so the orchestrator could in principle reference `CrmRuleEditor.BOARDS` instead of declaring its own.
- **Reproduction:**
  ```
  grep -n "label: 'אירועים'" modules/crm/crm-{rule-editor,messaging-rules}.js
  # → both files match
  ```
- **Expected vs Actual:**
  - Expected: one source of truth for the 4-board taxonomy.
  - Actual: two files declare it independently. Drift risk on future changes.
- **Suggested next action:** TECH_DEBT — refactor in a follow-up to consume `CrmRuleEditor.BOARDS` from the orchestrator.
- **Rationale for action:** The duplication is small and intentional (orchestrator's BOARD_META is a slim subset by design). But if a 5th board is added in the future, the change has to be made in BOTH files or the chip color/icon will drift from the editor. ~10-line refactor; can be batched with the next CRM polish SPEC.
- **Foreman override (filled by Foreman in review):** { }

---

*End of FINDINGS.*
