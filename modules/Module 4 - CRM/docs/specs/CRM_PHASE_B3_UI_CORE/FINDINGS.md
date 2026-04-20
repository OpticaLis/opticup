# FINDINGS — CRM_PHASE_B3_UI_CORE

> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_PHASE_B3_UI_CORE/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — `js/shared.js` exceeds 350-line hard max (Rule 12 violation)

- **Code:** `M4-DEBT-01`
- **Severity:** MEDIUM
- **Discovered during:** Commit 2 pre-commit hook execution
- **Location:** `js/shared.js` (408 lines after my change, was 379 before)
- **Description:** The file was already 29 lines over the 350-line hard max
  before this SPEC. The SPEC required adding FIELD_MAP entries to this file
  (Rule 5), which pushed the count to 408. The pre-commit hook reports
  "file exceeds 350-line hard max" but did not block the commit (warn-only).
- **Reproduction:**
  ```
  wc -l js/shared.js  # 408
  git show 5c1d7a7:js/shared.js | wc -l  # 379 (pre-SPEC baseline)
  ```
- **Expected vs Actual:**
  - Expected: ≤ 350 lines
  - Actual: 408 lines (57 over)
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** The correct fix is to split FIELD_MAP into a
  separate file (e.g. `js/field-map.js`) loaded before `js/shared.js`. That
  is out of scope for this UI-only SPEC and would affect every HTML page's
  script-loading order. Any follow-up SPEC that touches `shared.js` or adds
  further FIELD_MAP entries should absorb the split.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — `rule-21-orphans` pre-commit checker flags local IIFE-scoped identifiers

- **Code:** `M4-TOOL-01`
- **Severity:** MEDIUM
- **Discovered during:** Commits 2–5, running `verify.mjs --full`
- **Location:** `scripts/verify.mjs` (rule-21-orphans implementation)
- **Description:** The checker reports "function `name` defined in N files"
  for identifiers like `color`, `name`, `phone`, `search`, `renderDetail`,
  `detailRow`, `wireEvents` — but these are all LOCAL to IIFE module
  wrappers (`(function () { ... })()`). Rule 21 (No Orphans, No Duplicates)
  is about GLOBAL name collisions that risk overriding each other at
  runtime. IIFE-local identifiers cannot collide. The current checker
  produces noise that obscures real violations.
- **Reproduction:**
  ```
  node scripts/verify.mjs --full 2>&1 | grep 'function "color"'
  # flags modules/crm/crm-leads-tab.js line 163 where `color` is a
  # parameter of an anonymous .map() callback inside an IIFE
  ```
- **Expected vs Actual:**
  - Expected: Only flag top-level `function foo()` / `const foo = function`
    declarations attached to window/global.
  - Actual: Flags every `function(param)` including arrow/callback params
    and nested function expressions inside IIFEs.
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** Fixing this improves signal-to-noise for every
  future commit. It's a simple AST walk (only declarations at file top
  level, not inside IIFE or nested scopes). Not blocking — the checker is
  warn-only.
- **Foreman override:** { }

---

### Finding 3 — `SUPABASE_ANON` JWT triggers `rule-23-secrets` (intentional public key)

- **Code:** `M4-TOOL-02`
- **Severity:** INFO
- **Discovered during:** Commit 2 pre-commit hook
- **Location:** `js/shared.js:3`
- **Description:** `SUPABASE_ANON` is the public anon key that the Supabase
  JS client requires in the browser (it's the mechanism that lets RLS
  work). It's intended to be public and is not a secret. The
  rule-23-secrets checker flags any JWT-shaped string, so it fires twice
  on this line (once per JWT-shape match).
- **Reproduction:**
  ```
  git commit ... # shows "[rule-23-secrets] js\shared.js:3 — possible JWT token detected"
  ```
- **Expected vs Actual:**
  - Expected: The checker allow-lists `SUPABASE_ANON` (and possibly other
    known-public keys) by variable name or file+line.
  - Actual: Fires on every commit that touches shared.js.
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** Add an allow-list entry for this specific line
  or for any var named `SUPABASE_ANON` / `SUPABASE_ANON_KEY`. Low priority
  but reduces noise.
- **Foreman override:** { }

---

### Finding 4 — `crm_lead_notes` table lacks `is_deleted` column (inconsistent with sibling tables)

- **Code:** `M4-SCHEMA-01`
- **Severity:** LOW
- **Discovered during:** Pre-flight DB verification (Step 2 of the SPEC)
- **Location:** `crm_lead_notes` table schema
- **Description:** Every other CRM table in Phase A has an `is_deleted
  boolean` column for soft delete (Iron Rule 3): `crm_leads`,
  `crm_events`, `crm_event_attendees`, `crm_tags`,
  `v_crm_leads_with_tags`, `v_crm_event_attendees_full`,
  `v_crm_event_dashboard`. But `crm_lead_notes` does NOT have one. My
  initial pre-flight count query failed with
  `column "is_deleted" does not exist`. The Leads Detail modal accordingly
  does not filter notes by `is_deleted` — once note-editing lands, this
  will either require a schema migration or an explicit decision that
  lead notes are append-only.
- **Reproduction:**
  ```
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'crm_lead_notes' AND column_name = 'is_deleted';
  -- (returns 0 rows)
  ```
- **Expected vs Actual:**
  - Expected: All domain tables follow soft-delete convention (Rule 3).
  - Actual: `crm_lead_notes` is the lone exception.
- **Suggested next action:** NEW_SPEC (or bundle into the first SPEC that
  enables lead-note editing)
- **Rationale for action:** The schema choice may be intentional (notes
  as an append-only audit stream), in which case Rule 3 should be updated
  with the exemption. If it was an oversight, a short migration
  (`ALTER TABLE crm_lead_notes ADD COLUMN is_deleted boolean DEFAULT
  false`) closes the gap.
- **Foreman override:** { }

---

### Finding 5 — Browser smoke test not possible in this execution environment

- **Code:** `M4-QA-01`
- **Severity:** MEDIUM
- **Discovered during:** SPEC §3 criteria 7–12 + 14 verification
- **Location:** N/A (environment)
- **Description:** The Chrome DevTools MCP tool requires Chrome running
  with `--remote-debugging-port=9222`. That is not the case in this
  Claude Code Windows-desktop session. I started a local static HTTP
  server on port 8765 and confirmed all files serve 200, but could not
  open the page in a browser to verify: 893-row leads table paginates
  (criterion 7), events table shows 11 rows (8), dashboard renders stat
  cards + bars (9), detail modals open on row click (10, 11), RTL layout
  is correct (12), and zero console errors (14). These need manual QA by
  Daniel or a later session with Chrome DevTools enabled.
- **Reproduction:**
  ```
  # From Claude Code:
  mcp__chrome-devtools__new_page(url: "http://localhost:8765/crm.html")
  # Returns: "Could not connect to Chrome. Check if Chrome is running."
  ```
- **Expected vs Actual:**
  - Expected: Browser smoke test confirms criteria 7–12, 14 pass.
  - Actual: Only structural criteria (file existence, line counts,
    success-criteria rows 1–6, 13, 15–17) verified. Behavioral criteria
    deferred to manual QA.
- **Suggested next action:** TECH_DEBT (for executor skill) + DISMISS (for
  this SPEC, since the skill improvement is the real fix)
- **Rationale for action:** The opticup-executor SKILL.md should note a
  precondition: for UI-touching SPECs on the Windows desktop, Daniel
  should launch Chrome with `chrome --remote-debugging-port=9222
  --user-data-dir=C:\Users\User\.chrome-optic-up` before dispatching the
  executor. That enables the chrome-devtools MCP. See Proposal 2 in
  EXECUTION_REPORT §8.
- **Foreman override:** { }
